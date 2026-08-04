import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
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

describe('case e2e', () => {
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

  async function createDoctor(token: string, name = 'Dr. Caso'): Promise<number> {
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

  it('requires bearer auth for case routes', async () => {
    await request(app.getHttpServer()).get('/cases/').expect(401);
    await request(app.getHttpServer())
      .post('/cases/')
      .send({ doctor_id: 1, patient_ref: 'Paciente' })
      .expect(401);
  });

  it('creates, lists, gets, updates and soft deletes cases with legacy response shape', async () => {
    const user = await registerUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(user.access_token);

    const created = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorId,
        patient_ref: 'Paciente A',
        priority: 'urgent',
        status: 'delivered',
        total_value: '1.234,56',
        notes: 'Primeiro caso',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      id: 1,
      doctor_id: doctorId,
      patient_ref: 'Paciente A',
      pricing_mode: 'fixed',
      priority: 'urgent',
      status: 'pending',
      total_value: '1234.56',
      notes: 'Primeiro caso',
      delivered_at: null,
      deleted_at: null,
      status_revert_reason: null,
      items_count: 0,
      items: [],
    });

    await request(app.getHttpServer())
      .get('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ id: 1, patient_ref: 'Paciente A' });
      });

    await request(app.getHttpServer())
      .put('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ patient_ref: 'Paciente Atualizado', total_value: '2.000,00' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          patient_ref: 'Paciente Atualizado',
          total_value: '2000',
        });
      });

    await request(app.getHttpServer())
      .delete('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.deleted_at).toEqual(expect.any(String));
      });

    await request(app.getHttpServer())
      .get('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });
  });

  it('rejects invalid pricing and doctor ownership with legacy status codes', async () => {
    const firstUser = await registerUser('first@cadisk.local', 'first1');
    const secondUser = await registerUser('second@cadisk.local', 'second1');
    const firstDoctorId = await createDoctor(firstUser.access_token, 'Dr. Primeiro');

    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .send({
        doctor_id: firstDoctorId,
        patient_ref: 'Paciente Inválido',
        pricing_mode: 'services',
        total_value: '300,00',
      })
      .expect(404)
      .expect({ detail: 'Casos por serviços não usam valor combinado.' });

    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({
        doctor_id: firstDoctorId,
        patient_ref: 'Paciente Cruzado',
      })
      .expect(404)
      .expect({ detail: 'Doutor não encontrado' });
  });

  it('isolates cases between users and treats foreign resources as missing', async () => {
    const firstUser = await registerUser('first@cadisk.local', 'first1');
    const secondUser = await registerUser('second@cadisk.local', 'second1');
    const firstDoctorId = await createDoctor(firstUser.access_token, 'Dr. Primeiro');
    const secondDoctorId = await createDoctor(secondUser.access_token, 'Dr. Segundo');

    const firstCase = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .send({ doctor_id: firstDoctorId, patient_ref: 'Paciente Primeiro' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({ doctor_id: secondDoctorId, patient_ref: 'Paciente Segundo' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/cases/')
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(
          response.body.map((foundCase: { patient_ref: string }) => foundCase.patient_ref),
        ).toEqual(['Paciente Segundo']);
      });

    await request(app.getHttpServer())
      .get(`/cases/${firstCase.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .put(`/cases/${firstCase.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({ patient_ref: 'Tentativa' })
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .delete(`/cases/${firstCase.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });
  });

  it('preserves linear status flow and ignores status_revert_reason', async () => {
    const user = await registerUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(user.access_token);

    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ doctor_id: doctorId, patient_ref: 'Paciente Status' })
      .expect(201);

    await request(app.getHttpServer())
      .put('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'delivered', patient_ref: 'Tentativa' })
      .expect(409)
      .expect({ detail: 'Fluxo de status inválido. Use pending -> completed -> delivered.' });

    await request(app.getHttpServer())
      .get('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('pending');
        expect(response.body.patient_ref).toBe('Paciente Status');
      });

    await request(app.getHttpServer())
      .put('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'completed' })
      .expect(200);

    const delivered = await request(app.getHttpServer())
      .put('/cases/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'delivered', status_revert_reason: 'Voltar' })
      .expect(200);

    expect(delivered.body.status).toBe('delivered');
    expect(delivered.body.delivered_at).toEqual(expect.any(String));
    expect(delivered.body.status_revert_reason).toBeNull();
  });

  it('marks fixed-price cases as completed without resending total_value', async () => {
    const user = await registerUser('fixed-status@cadisk.local', 'fixed1');
    const doctorId = await createDoctor(user.access_token);

    const created = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorId,
        patient_ref: 'Paciente Fixo Status',
        pricing_mode: 'fixed',
        total_value: '450,00',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      pricing_mode: 'fixed',
      status: 'pending',
      total_value: '450',
    });

    await request(app.getHttpServer())
      .put(`/cases/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'completed' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          pricing_mode: 'fixed',
          status: 'completed',
          total_value: '450',
        });
      });
  });

  it('returns items and recalculated service totals from case_items', async () => {
    const user = await registerUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(user.access_token);
    const created = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorId,
        patient_ref: 'Paciente Soma',
        pricing_mode: 'services',
      })
      .expect(201);

    await prisma.caseItem.create({
      data: {
        caseId: created.body.id as number,
        quantity: 2,
        serviceType: 'coroa',
        tooth: '11',
        unitValue: new Prisma.Decimal('120.00'),
      },
    });

    await request(app.getHttpServer())
      .put(`/cases/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ notes: 'Recalcular' })
      .expect(200)
      .expect((response) => {
        expect(response.body.total_value).toBe('240');
        expect(response.body.items_count).toBe(1);
        expect(response.body.items[0]).toMatchObject({
          tooth: '11',
          service_type: 'coroa',
          unit_value: '120',
        });
      });
  });

  it('bulk-delivers selected cases with dedupe and rolls back on missing ids', async () => {
    const user = await registerUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(user.access_token);

    const pending = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ doctor_id: doctorId, patient_ref: 'Paciente Pendente' })
      .expect(201);
    const completed = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ doctor_id: doctorId, patient_ref: 'Paciente Completo' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/cases/${completed.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'completed' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/cases/bulk-deliver')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        case_ids: [pending.body.id, pending.body.id, completed.body.id],
        doctor_id: doctorId,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.map((foundCase: { id: number }) => foundCase.id)).toEqual([
          pending.body.id,
          completed.body.id,
        ]);
        expect(
          response.body.every((foundCase: { status: string }) => foundCase.status === 'delivered'),
        ).toBe(true);
      });

    const rollbackCandidate = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ doctor_id: doctorId, patient_ref: 'Paciente Rollback' })
      .expect(201);
    await request(app.getHttpServer())
      .put(`/cases/${rollbackCandidate.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ status: 'completed' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/cases/bulk-deliver')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ case_ids: [rollbackCandidate.body.id, 99999] })
      .expect(409)
      .expect({ detail: 'Alguns pedidos selecionados não foram encontrados.' });

    await request(app.getHttpServer())
      .get(`/cases/${rollbackCandidate.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('completed');
        expect(response.body.delivered_at).toBeNull();
      });
  });
});
