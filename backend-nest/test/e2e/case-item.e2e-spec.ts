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

describe('case item e2e', () => {
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

  async function createDoctor(token: string, name = 'Dr. Item'): Promise<number> {
    const response = await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${token}`)
      .send({ name })
      .expect(201);

    return response.body.id as number;
  }

  async function createCase(
    token: string,
    doctorId: number,
    pricingMode: 'fixed' | 'services' = 'services',
  ): Promise<number> {
    const response = await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        doctor_id: doctorId,
        patient_ref: 'Paciente Item',
        pricing_mode: pricingMode,
        total_value: pricingMode === 'fixed' ? '500,00' : undefined,
      })
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

  it('requires bearer auth for item routes', async () => {
    await request(app.getHttpServer()).get('/cases/1/items/').expect(401);
    await request(app.getHttpServer())
      .post('/cases/1/items/')
      .send({ tooth: '11', service_type: 'coroa', unit_value: '100,00' })
      .expect(401);
  });

  it('creates, lists, gets, updates and deletes items with legacy response shape', async () => {
    const user = await registerUser('item@cadisk.local', 'item01');
    const doctorId = await createDoctor(user.access_token);
    const caseId = await createCase(user.access_token, doctorId);

    const created = await request(app.getHttpServer())
      .post(`/cases/${caseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        tooth: ' 11 ',
        service_type: 'coroa',
        quantity: 2,
        unit_value: '150,00',
        material: 'zircônia',
        color: 'A1',
        notes: 'teste',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      id: 1,
      case_id: caseId,
      tooth: '11',
      service_type: 'coroa',
      quantity: 2,
      unit_value: '150',
      material: 'zircônia',
      color: 'A1',
      notes: 'teste',
    });

    await request(app.getHttpServer())
      .get(`/cases/${caseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ id: created.body.id, tooth: '11' });
      });

    await request(app.getHttpServer())
      .get(`/cases/${caseId}/items/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.service_type).toBe('coroa');
      });

    await request(app.getHttpServer())
      .put(`/cases/${caseId}/items/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '12', quantity: 3, unit_value: '175,00', notes: 'ajustado' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          tooth: '12',
          quantity: 3,
          unit_value: '175',
          notes: 'ajustado',
        });
      });

    await request(app.getHttpServer())
      .delete(`/cases/${caseId}/items/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/cases/${caseId}/items/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(404)
      .expect({ detail: 'Item do caso não encontrado' });
  });

  it('validates tooth, quantity and unit value like the legacy DTOs', async () => {
    const user = await registerUser('validation@cadisk.local', 'valid1');
    const doctorId = await createDoctor(user.access_token);
    const caseId = await createCase(user.access_token, doctorId);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '10', service_type: 'coroa', unit_value: '100,00' })
      .expect(422)
      .expect((response) => {
        expect(JSON.stringify(response.body.detail)).toContain('Número do dente inválido');
      });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '11', service_type: 'coroa', quantity: 0, unit_value: '100,00' })
      .expect(422)
      .expect((response) => {
        expect(JSON.stringify(response.body.detail)).toContain(
          'Quantidade deve ser maior ou igual a 1',
        );
      });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '11', service_type: 'coroa', unit_value: 'abc' })
      .expect(422)
      .expect((response) => {
        expect(JSON.stringify(response.body.detail)).toContain('Valor unitário inválido');
      });
  });

  it('recalculates service case totals and keeps fixed case totals unchanged', async () => {
    const user = await registerUser('billing@cadisk.local', 'bill01');
    const doctorId = await createDoctor(user.access_token);
    const serviceCaseId = await createCase(user.access_token, doctorId, 'services');

    const first = await request(app.getHttpServer())
      .post(`/cases/${serviceCaseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '11', service_type: 'coroa', quantity: 2, unit_value: '100,00' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${serviceCaseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '21', service_type: 'faceta', quantity: 1, unit_value: '50,00' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/cases/${serviceCaseId}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.total_value).toBe('250');
        expect(response.body.items_count).toBe(2);
      });

    await request(app.getHttpServer())
      .put(`/cases/${serviceCaseId}/items/${first.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ quantity: 3, unit_value: '120,00' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/cases/${serviceCaseId}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.total_value).toBe('410');
      });

    const fixedCaseId = await createCase(user.access_token, doctorId, 'fixed');
    await request(app.getHttpServer())
      .post(`/cases/${fixedCaseId}/items/`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ tooth: '31', service_type: 'ajuste', unit_value: null })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/cases/${fixedCaseId}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.total_value).toBe('500');
      });
  });

  it('isolates item routes between users and treats foreign resources as missing', async () => {
    const firstUser = await registerUser('first@cadisk.local', 'first1');
    const secondUser = await registerUser('second@cadisk.local', 'second1');
    const firstDoctorId = await createDoctor(firstUser.access_token, 'Dr. Primeiro');
    const secondDoctorId = await createDoctor(secondUser.access_token, 'Dr. Segundo');
    const firstCaseId = await createCase(firstUser.access_token, firstDoctorId);
    await createCase(secondUser.access_token, secondDoctorId);

    const item = await request(app.getHttpServer())
      .post(`/cases/${firstCaseId}/items/`)
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .send({ tooth: '11', service_type: 'coroa', unit_value: '100,00' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/cases/${firstCaseId}/items/`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .get(`/cases/${firstCaseId}/items/${item.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Item do caso não encontrado' });

    await request(app.getHttpServer())
      .put(`/cases/${firstCaseId}/items/${item.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({ notes: 'Tentativa' })
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });

    await request(app.getHttpServer())
      .delete(`/cases/${firstCaseId}/items/${item.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Caso não encontrado' });
  });
});
