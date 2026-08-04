import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../../src/app.configure';
import { AppModule } from '../../src/app.module';
import { LoginRateLimitService } from '../../src/auth/login-rate-limit.service';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { PrismaService } from '../../src/prisma/prisma.service';

const STRONG_PASSWORD = 'StrongPass123!';

interface RegisteredUser {
  access_token: string;
  email: string;
  token_type: 'bearer';
  username: string;
}

describe('case history e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let loginRateLimit: LoginRateLimitService;

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE case_history_events, case_items, cases, doctors, users RESTART IDENTITY CASCADE',
    );
    loginRateLimit.resetLoginAttempts();
  }

  async function registerUser(email: string, username: string): Promise<RegisteredUser> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: STRONG_PASSWORD,
        username,
      })
      .expect(201);

    return response.body as RegisteredUser;
  }

  async function createDoctor(token: string, name = 'Dr. Histórico'): Promise<number> {
    const response = await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);

    return response.body.id as number;
  }

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    loginRateLimit = app.get(LoginRateLimitService);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await app.close();
  });

  it('lists history cases, opens timeline and reverts status through authenticated endpoints', async () => {
    const user = await registerUser('history@cadisk.local', 'hist01');
    const doctorId = await createDoctor(user.access_token);

    const created = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorId,
        patient_ref: 'Paciente Histórico HTTP',
        pricing_mode: 'services',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/cases/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'completed' })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/cases/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'delivered' })
      .expect(200);

    await request(app.getHttpServer())
      .get('/case-history?page=1&limit=10&q=Histórico')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: 1,
          has_next_page: false,
        });
        expect(response.body.items[0]).toMatchObject({
          id: created.body.id,
          patient_ref: 'Paciente Histórico HTTP',
          doctor_name: 'Dr. Histórico',
          status: 'delivered',
          has_reverted: false,
        });
      });

    await request(app.getHttpServer())
      .get(`/case-history/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: created.body.id,
          patient_ref: 'Paciente Histórico HTTP',
          items_count: 0,
        });
      });

    await request(app.getHttpServer())
      .get(`/cases/${created.body.id}/history?page=1&limit=2`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(2);
        expect(response.body.pagination).toMatchObject({
          total: 3,
          total_pages: 2,
          has_next_page: true,
        });
      });

    await request(app.getHttpServer())
      .post(`/cases/${created.body.id}/revert-status`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ reason: '  Dentista pediu ajuste  ' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'completed',
          delivered_at: null,
          status_revert_reason: 'Dentista pediu ajuste',
        });
      });

    await request(app.getHttpServer())
      .get('/case-history?has_reverted=true')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].has_reverted).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/cases/${created.body.id}/revert-status`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ reason: '     ' })
      .expect(409)
      .expect({ detail: 'Informe o motivo do retorno de status.' });
  });

  it('does not leak history or status reversion across users', async () => {
    const firstUser = await registerUser('first-history@cadisk.local', 'fhist1');
    const secondUser = await registerUser('second-history@cadisk.local', 'shist1');
    const firstDoctorId = await createDoctor(firstUser.access_token, 'Dr. Primeiro');

    const created = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .send({ doctor_id: firstDoctorId, patient_ref: 'Paciente Privado' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/case-history/${created.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .get(`/cases/${created.body.id}/history`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .post(`/cases/${created.body.id}/revert-status`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({ reason: 'Tentativa' })
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });
  });

  it('permanently deletes individual and selected history records through authenticated endpoints', async () => {
    const user = await registerUser('delete-history@cadisk.local', 'dhist1');
    const otherUser = await registerUser('delete-other-history@cadisk.local', 'dothr1');
    const doctorId = await createDoctor(user.access_token, 'Dr. Apagar');
    const otherDoctorId = await createDoctor(otherUser.access_token, 'Dr. Outro');

    const firstCase = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ doctor_id: doctorId, patient_ref: 'Apagar HTTP 1' })
      .expect(201);
    const secondCase = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ doctor_id: doctorId, patient_ref: 'Apagar HTTP 2' })
      .expect(201);
    const foreignCase = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${otherUser.access_token}`)
      .send({ doctor_id: otherDoctorId, patient_ref: 'Privado HTTP' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/case-history/${firstCase.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect({ deleted_count: 1 });

    await expect(prisma.dentalCase.findUnique({ where: { id: firstCase.body.id } })).resolves.toBeNull();
    await expect(prisma.caseHistoryEvent.count({ where: { caseId: firstCase.body.id } })).resolves.toBe(0);

    await request(app.getHttpServer())
      .delete(`/case-history/${foreignCase.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .delete('/case-history')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ case_ids: [secondCase.body.id, foreignCase.body.id] })
      .expect(200)
      .expect({ deleted_count: 1 });

    await expect(prisma.dentalCase.findUnique({ where: { id: secondCase.body.id } })).resolves.toBeNull();
    await expect(prisma.dentalCase.findUnique({ where: { id: foreignCase.body.id } })).resolves.toMatchObject({
      id: foreignCase.body.id,
    });
  });
});
