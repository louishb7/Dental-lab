import type { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

describe('dashboard e2e', () => {
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

  async function createDoctor(token: string, name: string): Promise<number> {
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

  it('requires bearer auth for dashboard overview', async () => {
    await request(app.getHttpServer()).get('/dashboard/overview').expect(401);
  });

  it('returns the legacy dashboard summary shape for the authenticated user', async () => {
    const user = await registerUser('dashboard@cadista.local', 'dash01');
    const doctorA = await createDoctor(user.access_token, 'Dr. Dashboard A');
    const doctorB = await createDoctor(user.access_token, 'Dr. Dashboard B');
    const now = new Date();
    const overdueDeadline = new Date(now);
    overdueDeadline.setUTCDate(overdueDeadline.getUTCDate() - 2);
    const todayDeadline = new Date(now);
    const futureDeadline = new Date(now);
    futureDeadline.setUTCDate(futureDeadline.getUTCDate() + 4);

    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorA,
        patient_ref: 'Paciente atrasado',
        deadline: overdueDeadline.toISOString(),
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorA,
        patient_ref: 'Paciente hoje',
        deadline: todayDeadline.toISOString(),
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        doctor_id: doctorA,
        patient_ref: 'Paciente urgente',
        deadline: futureDeadline.toISOString(),
        priority: 'urgent',
      })
      .expect(201);
    await prisma.dentalCase.createMany({
      data: [
        {
          doctorId: doctorB,
          patientRef: 'Paciente pronto',
          deadline: futureDeadline,
          status: 'completed',
        },
        {
          doctorId: doctorB,
          patientRef: 'Paciente entregue',
          status: 'delivered',
          totalValue: new Prisma.Decimal('250.00'),
          deliveredAt: now,
        },
      ],
    });
    const deliveredCase = await prisma.dentalCase.findFirstOrThrow({
      where: {
        doctorId: doctorB,
        patientRef: 'Paciente entregue',
      },
    });
    await prisma.caseItem.create({
      data: {
        caseId: deliveredCase.id,
        tooth: '11',
        serviceType: 'Coroa',
        quantity: 1,
      },
    });

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          status_counts: {
            pending: 3,
            completed: 1,
            delivered: 1,
          },
          delivered_total_month: '250',
          delivered_count_month: 1,
        });
        expect(response.body.generated_at).toEqual(expect.any(String));
        expect(
          response.body.overdue_cases.map(
            (foundCase: { patient_ref: string }) => foundCase.patient_ref,
          ),
        ).toEqual(['Paciente atrasado']);
        expect(response.body.urgent_open_cases).toHaveLength(1);
        expect(response.body.urgent_open_cases[0]).toMatchObject({
          doctor_name: 'Dr. Dashboard A',
          patient_ref: 'Paciente urgente',
        });
        expect(
          response.body.delivered_cases_month.map(
            (foundCase: { patient_ref: string }) => foundCase.patient_ref,
          ),
        ).toEqual(['Paciente entregue']);
        expect(response.body.delivered_cases_month[0]).toMatchObject({
          items_count: 1,
        });
        expect(response.body.revenue_trend).toHaveLength(6);
        expect(response.body.revenue_trend[5]).toMatchObject({
          delivered_count: 1,
          total_value: '250',
        });
      });
  });

  it('isolates dashboard aggregations between users', async () => {
    const firstUser = await registerUser('first@cadista.local', 'first1');
    const secondUser = await registerUser('second@cadista.local', 'second1');
    const firstDoctor = await createDoctor(firstUser.access_token, 'Dr. Primeiro');
    const secondDoctor = await createDoctor(secondUser.access_token, 'Dr. Segundo');

    await request(app.getHttpServer())
      .post('/cases/')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .send({
        doctor_id: firstDoctor,
        patient_ref: 'Primeiro',
      })
      .expect(201);
    await prisma.dentalCase.create({
      data: {
        doctorId: secondDoctor,
        patientRef: 'Segundo',
        status: 'delivered',
        totalValue: new Prisma.Decimal('100.00'),
        deliveredAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status_counts).toEqual({
          pending: 1,
          completed: 0,
          delivered: 0,
        });
        expect(response.body.delivered_total_month).toBe('0');
        expect(response.body.delivered_cases_month).toEqual([]);
      });

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status_counts).toEqual({
          pending: 0,
          completed: 0,
          delivered: 1,
        });
        expect(response.body.delivered_total_month).toBe('100');
        expect(response.body.delivered_cases_month).toHaveLength(1);
      });
  });

  it('excludes delivered cases outside the current UTC month from monthly finance', async () => {
    const user = await registerUser('month@cadista.local', 'month1');
    const doctorId = await createDoctor(user.access_token, 'Dr. Mês');
    const now = new Date();
    const currentMonthDeliveredAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
    const previousMonthDeliveredAt = new Date(currentMonthDeliveredAt);
    previousMonthDeliveredAt.setUTCMonth(previousMonthDeliveredAt.getUTCMonth() - 1);

    await prisma.dentalCase.createMany({
      data: [
        {
          doctorId,
          patientRef: 'Mês atual',
          status: 'delivered',
          totalValue: new Prisma.Decimal('100.00'),
          deliveredAt: currentMonthDeliveredAt,
        },
        {
          doctorId,
          patientRef: 'Mês anterior',
          status: 'delivered',
          totalValue: new Prisma.Decimal('200.00'),
          deliveredAt: previousMonthDeliveredAt,
        },
      ],
    });

    await request(app.getHttpServer())
      .get('/dashboard/overview')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.delivered_total_month).toBe('100');
        expect(
          response.body.delivered_cases_month.map(
            (foundCase: { patient_ref: string }) => foundCase.patient_ref,
          ),
        ).toEqual(['Mês atual']);
      });
  });
});
