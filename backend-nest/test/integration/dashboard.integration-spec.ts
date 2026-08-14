import { ConfigModule } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../../src/auth/auth.module';
import { CaseItemModule } from '../../src/case-item/case-item.module';
import { CaseModule } from '../../src/case/case.module';
import { validateEnvironment } from '../../src/config/app.config';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { DashboardModule } from '../../src/dashboard/dashboard.module';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { DoctorModule } from '../../src/doctor/doctor.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserModule } from '../../src/user/user.module';

describe('DashboardService integration', () => {
  let dashboard: DashboardService;
  let prisma: PrismaService;

  const now = new Date('2026-07-30T12:00:00.000Z');

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE case_history_events, case_items, cases, doctors, users RESTART IDENTITY CASCADE',
    );
  }

  async function createUser(email: string, username: string): Promise<number> {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: 'not-used',
      },
    });
    return user.id;
  }

  async function createDoctor(userId: number, name: string): Promise<number> {
    const doctor = await prisma.doctor.create({
      data: {
        name,
        userId,
      },
    });
    return doctor.id;
  }

  async function createCase(input: {
    doctorId: number;
    patientRef: string;
    deadline?: Date | null;
    priority?: 'normal' | 'urgent';
    status?: 'pending' | 'completed' | 'delivered';
    totalValue?: Prisma.Decimal | null;
    deliveredTotalValue?: Prisma.Decimal | null;
    deliveredAt?: Date | null;
    deletedAt?: Date | null;
  }): Promise<number> {
    const created = await prisma.dentalCase.create({
      data: {
        doctorId: input.doctorId,
        patientRef: input.patientRef,
        deadline: input.deadline ?? null,
        priority: input.priority ?? 'normal',
        status: input.status ?? 'pending',
        totalValue: input.totalValue ?? null,
        deliveredTotalValue: input.deliveredTotalValue ?? null,
        deliveredAt: input.deliveredAt ?? null,
        deletedAt: input.deletedAt ?? null,
      },
    });
    return created.id;
  }

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: validateEnvironment,
        }),
        PrismaModule,
        UserModule,
        AuthModule,
        DoctorModule,
        CaseModule,
        CaseItemModule,
        DashboardModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    dashboard = moduleRef.get(DashboardService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('returns status counts and dashboard lists matching the legacy summary shape', async () => {
    const userId = await createUser('dashboard@cadisk.local', 'dash01');
    const doctorA = await createDoctor(userId, 'Dr. Dashboard A');
    const doctorB = await createDoctor(userId, 'Dr. Dashboard B');

    await createCase({
      doctorId: doctorA,
      patientRef: 'Paciente atrasado',
      deadline: new Date('2026-07-28T12:00:00.000Z'),
    });
    await createCase({
      doctorId: doctorA,
      patientRef: 'Paciente hoje',
      deadline: new Date('2026-07-30T03:00:00.000Z'),
    });
    await createCase({
      doctorId: doctorA,
      patientRef: 'Paciente urgente',
      deadline: new Date('2026-08-03T12:00:00.000Z'),
      priority: 'urgent',
    });
    await createCase({
      doctorId: doctorB,
      patientRef: 'Paciente pronto',
      deadline: new Date('2026-08-02T12:00:00.000Z'),
      status: 'completed',
    });
    const deliveredCaseId = await createCase({
      doctorId: doctorB,
      patientRef: 'Paciente entregue',
      status: 'delivered',
      totalValue: new Prisma.Decimal('250.00'),
      deliveredTotalValue: new Prisma.Decimal('250.00'),
      deliveredAt: new Date('2026-07-20T10:00:00.000Z'),
    });
    await prisma.caseItem.createMany({
      data: [
        { caseId: deliveredCaseId, tooth: '11', serviceType: 'Coroa', quantity: 1 },
        { caseId: deliveredCaseId, tooth: '12', serviceType: 'Coroa', quantity: 1 },
      ],
    });

    const summary = await dashboard.getDashboardSummary(userId, now);

    expect(summary.generated_at).toBe(now);
    expect(summary.status_counts).toEqual({
      pending: 3,
      completed: 1,
      delivered: 1,
    });
    expect(summary.overdue_cases.map((foundCase) => foundCase.patient_ref)).toEqual([
      'Paciente atrasado',
    ]);
    expect(summary.urgent_open_cases).toHaveLength(1);
    expect(summary.urgent_open_cases[0]).toMatchObject({
      doctor_name: 'Dr. Dashboard A',
      patient_ref: 'Paciente urgente',
    });
    expect(summary.delivered_cases_month.map((foundCase) => foundCase.patient_ref)).toEqual([
      'Paciente entregue',
    ]);
    expect(summary.delivered_cases_month[0]?.items_count).toBe(2);
    expect(summary.delivered_total_month.toString()).toBe('250');
    expect(summary.delivered_count_month).toBe(1);
    expect(summary.revenue_trend).toHaveLength(6);
    expect(summary.revenue_trend[5]).toMatchObject({
      month: '2026-07',
      delivered_count: 1,
    });
    expect(summary.revenue_trend[5]?.total_value.toString()).toBe('250');
  });

  it('keeps aggregations scoped to the authenticated user and excludes soft-deleted cases', async () => {
    const firstUserId = await createUser('first@cadisk.local', 'first1');
    const secondUserId = await createUser('second@cadisk.local', 'second1');
    const firstDoctor = await createDoctor(firstUserId, 'Dr. Primeiro');
    const secondDoctor = await createDoctor(secondUserId, 'Dr. Segundo');

    await createCase({
      doctorId: firstDoctor,
      patientRef: 'Primeiro pendente',
    });
    await createCase({
      doctorId: firstDoctor,
      patientRef: 'Primeiro deletado',
      deletedAt: new Date('2026-07-29T10:00:00.000Z'),
    });
    await createCase({
      doctorId: secondDoctor,
      patientRef: 'Segundo pendente',
    });

    const firstSummary = await dashboard.getDashboardSummary(firstUserId, now);
    const secondSummary = await dashboard.getDashboardSummary(secondUserId, now);

    expect(firstSummary.status_counts).toEqual({
      pending: 1,
      completed: 0,
      delivered: 0,
    });
    expect(secondSummary.status_counts).toEqual({
      pending: 1,
      completed: 0,
      delivered: 0,
    });
  });

  it('preserves app timezone deadline and month boundaries', async () => {
    const userId = await createUser('dates@cadisk.local', 'dates1');
    const doctorId = await createDoctor(userId, 'Dr. Datas');

    await createCase({
      doctorId,
      patientRef: 'Vence ontem local',
      deadline: new Date('2026-07-30T02:59:59.000Z'),
    });
    await createCase({
      doctorId,
      patientRef: 'Vence hoje local',
      deadline: new Date('2026-07-30T03:00:00.000Z'),
    });
    await createCase({
      doctorId,
      patientRef: 'Entregue começo do mês',
      status: 'delivered',
      deliveredAt: new Date('2026-07-01T03:00:00.000Z'),
      totalValue: new Prisma.Decimal('100.00'),
      deliveredTotalValue: new Prisma.Decimal('100.00'),
    });
    await createCase({
      doctorId,
      patientRef: 'Entregue fim do mês',
      status: 'delivered',
      deliveredAt: new Date('2026-08-01T02:59:59.999Z'),
      totalValue: new Prisma.Decimal('200.00'),
      deliveredTotalValue: new Prisma.Decimal('200.00'),
    });
    await createCase({
      doctorId,
      patientRef: 'Entregue próximo mês',
      status: 'delivered',
      deliveredAt: new Date('2026-08-01T03:00:00.000Z'),
      totalValue: new Prisma.Decimal('300.00'),
      deliveredTotalValue: new Prisma.Decimal('300.00'),
    });

    const summary = await dashboard.getDashboardSummary(userId, now);

    expect(summary.overdue_cases.map((foundCase) => foundCase.patient_ref)).toEqual([
      'Vence ontem local',
    ]);
    expect(summary.delivered_cases_month.map((foundCase) => foundCase.patient_ref)).toEqual([
      'Entregue fim do mês',
      'Entregue começo do mês',
    ]);
    expect(summary.delivered_total_month.toString()).toBe('300');
    expect(summary.delivered_count_month).toBe(2);
    expect(summary.revenue_trend[5]?.month).toBe('2026-07');
    expect(summary.revenue_trend[5]?.total_value.toString()).toBe('300');
  });

  it('orders urgent open cases by deadline asc with nulls last and id desc', async () => {
    const userId = await createUser('urgent@cadisk.local', 'urgent1');
    const doctorId = await createDoctor(userId, 'Dr. Urgente');

    await createCase({
      doctorId,
      patientRef: 'Sem prazo antigo',
      priority: 'urgent',
      deadline: null,
    });
    await createCase({
      doctorId,
      patientRef: 'Prazo depois',
      priority: 'urgent',
      deadline: new Date('2026-08-10T10:00:00.000Z'),
    });
    await createCase({
      doctorId,
      patientRef: 'Prazo antes',
      priority: 'urgent',
      deadline: new Date('2026-08-01T10:00:00.000Z'),
    });
    await createCase({
      doctorId,
      patientRef: 'Sem prazo novo',
      priority: 'urgent',
      deadline: null,
    });
    await createCase({
      doctorId,
      patientRef: 'Urgente entregue',
      priority: 'urgent',
      status: 'delivered',
      deliveredAt: new Date('2026-07-20T10:00:00.000Z'),
      totalValue: new Prisma.Decimal('50.00'),
    });

    const summary = await dashboard.getDashboardSummary(userId, now);

    expect(summary.urgent_open_cases.map((foundCase) => foundCase.patient_ref)).toEqual([
      'Prazo antes',
      'Prazo depois',
      'Sem prazo novo',
      'Sem prazo antigo',
    ]);
  });
});
