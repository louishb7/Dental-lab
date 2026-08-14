import { ConfigModule } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../../src/auth/auth.module';
import { CaseModule } from '../../src/case/case.module';
import { CaseService } from '../../src/case/case.service';
import { validateEnvironment } from '../../src/config/app.config';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { DoctorModule } from '../../src/doctor/doctor.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserModule } from '../../src/user/user.module';

describe('CaseService integration', () => {
  let cases: CaseService;
  let prisma: PrismaService;

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

  async function createDoctor(userId: number, name = 'Dr. Caso'): Promise<number> {
    const doctor = await prisma.doctor.create({
      data: {
        name,
        userId,
      },
    });
    return doctor.id;
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
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    cases = moduleRef.get(CaseService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('creates fixed cases with money normalization and pending status', async () => {
    const userId = await createUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(userId);

    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente A',
        priority: 'urgent',
        total_value: '1.234,56',
        notes: 'Primeiro caso',
        status: 'delivered',
      },
      userId,
    );

    expect(created.status).toBe('pending');
    expect(created.pricing_mode).toBe('fixed');
    expect(created.total_value?.toString()).toBe('1234.56');
    expect(created.delivered_at).toBeNull();
    expect(created.items_count).toBe(0);
  });

  it('rejects invalid pricing payloads with legacy messages', async () => {
    const userId = await createUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(userId);

    await expect(
      cases.createCase(
        {
          doctor_id: doctorId,
          patient_ref: 'Paciente Inválido',
          pricing_mode: 'services',
          priority: 'normal',
          total_value: '300,00',
          status: 'pending',
        },
        userId,
      ),
    ).rejects.toThrow('Casos por serviços não usam valor combinado.');

    await expect(
      cases.createCase(
        {
          doctor_id: doctorId,
          patient_ref: 'Paciente Fixo',
          pricing_mode: 'fixed',
          priority: 'normal',
          status: 'pending',
        },
        userId,
      ),
    ).rejects.toThrow('Informe o valor fixo para este caso.');
  });

  it('requires active doctors within ownership for create and move', async () => {
    const firstUserId = await createUser('first@cadisk.local', 'first1');
    const secondUserId = await createUser('second@cadisk.local', 'second1');
    const firstDoctorId = await createDoctor(firstUserId, 'Dr. Primeiro');
    const secondDoctorId = await createDoctor(secondUserId, 'Dr. Segundo');

    const created = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Paciente Primeiro',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );

    await expect(
      cases.createCase(
        {
          doctor_id: firstDoctorId,
          patient_ref: 'Paciente Cruzado',
          priority: 'normal',
          status: 'pending',
        },
        secondUserId,
      ),
    ).rejects.toThrow('Doutor não encontrado');

    await expect(
      cases.updateCase(created.id, { doctor_id: secondDoctorId }, firstUserId),
    ).rejects.toThrow('Doutor não encontrado');

    await prisma.doctor.update({
      where: { id: firstDoctorId },
      data: { deletedAt: new Date() },
    });

    await expect(
      cases.createCase(
        {
          doctor_id: firstDoctorId,
          patient_ref: 'Paciente Inativo',
          priority: 'normal',
          status: 'pending',
        },
        firstUserId,
      ),
    ).rejects.toThrow('Doutor não encontrado');
  });

  it('keeps case ownership isolated across users', async () => {
    const firstUserId = await createUser('first@cadisk.local', 'first1');
    const secondUserId = await createUser('second@cadisk.local', 'second1');
    const firstDoctorId = await createDoctor(firstUserId, 'Dr. Primeiro');
    const secondDoctorId = await createDoctor(secondUserId, 'Dr. Segundo');

    const firstCase = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Paciente Primeiro',
        priority: 'normal',
        pricing_mode: 'services',
        status: 'pending',
      },
      firstUserId,
    );
    const secondCase = await cases.createCase(
      {
        doctor_id: secondDoctorId,
        patient_ref: 'Paciente Segundo',
        priority: 'normal',
        pricing_mode: 'services',
        status: 'pending',
      },
      secondUserId,
    );

    await expect(cases.getCaseById(firstCase.id, secondUserId)).resolves.toBeNull();
    await expect(
      cases.updateCase(firstCase.id, { patient_ref: 'Tentativa' }, secondUserId),
    ).resolves.toBeNull();
    await expect(cases.deleteCase(firstCase.id, secondUserId)).rejects.toThrow(
      'Caso não encontrado',
    );
    await expect(cases.getAllCases({ skip: 0, limit: 100 }, secondUserId)).resolves.toMatchObject([
      { id: secondCase.id, patient_ref: 'Paciente Segundo' },
    ]);
  });

  it('preserves linear status flow and existing delivered_at', async () => {
    const userId = await createUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Status',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    await expect(cases.updateCase(created.id, { status: 'delivered' }, userId)).rejects.toThrow(
      'Fluxo de status inválido',
    );
    await expect(cases.getCaseById(created.id, userId)).resolves.toMatchObject({
      status: 'pending',
      patient_ref: 'Paciente Status',
    });

    const completed = await cases.updateCase(created.id, { status: 'completed' }, userId);
    expect(completed?.status).toBe('completed');

    const delivered = await cases.updateCase(created.id, { status: 'delivered' }, userId);
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.delivered_at).toBeInstanceOf(Date);
    const deliveredAt = delivered?.delivered_at;

    await expect(cases.updateCase(created.id, { status: 'completed' }, userId)).rejects.toThrow(
      'Não é possível alterar um caso já entregue.',
    );
    await expect(
      cases.updateCase(created.id, { status: 'delivered' }, userId),
    ).resolves.toMatchObject({
      delivered_at: deliveredAt,
      status: 'delivered',
    });
  });

  it('updates only status for fixed cases without requiring total_value again', async () => {
    const userId = await createUser('fixed-status@cadisk.local', 'fixed1');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Fixo Status',
        pricing_mode: 'fixed',
        priority: 'normal',
        status: 'pending',
        total_value: '450,00',
      },
      userId,
    );

    const beforeUpdate = await prisma.dentalCase.findUnique({
      where: { id: created.id },
      select: { pricingMode: true, status: true, totalValue: true },
    });
    expect(beforeUpdate).toMatchObject({
      pricingMode: 'fixed',
      status: 'pending',
    });
    expect(beforeUpdate?.totalValue?.toString()).toBe('450');

    const updated = await cases.updateCase(created.id, { status: 'completed' }, userId);

    expect(updated).toMatchObject({
      pricing_mode: 'fixed',
      status: 'completed',
    });
    expect(updated?.total_value?.toString()).toBe('450');
    await expect(
      prisma.caseHistoryEvent.findFirst({
        where: {
          caseId: created.id,
          eventType: 'status_advanced',
          fromStatus: 'pending',
          toStatus: 'completed',
        },
      }),
    ).resolves.toMatchObject({ userId });
  });

  it('updates only status for service-priced cases and preserves calculated total', async () => {
    const userId = await createUser('service-status@cadisk.local', 'servs1');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Serviços Status',
        pricing_mode: 'services',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    await prisma.caseItem.create({
      data: {
        caseId: created.id,
        quantity: 2,
        serviceType: 'coroa',
        tooth: '11',
        unitValue: new Prisma.Decimal('100.00'),
      },
    });
    await cases.updateCase(created.id, { notes: 'Recalcular total' }, userId);

    const beforeStatusUpdate = await prisma.dentalCase.findUnique({
      where: { id: created.id },
      select: { pricingMode: true, status: true, totalValue: true },
    });
    expect(beforeStatusUpdate?.totalValue?.toString()).toBe('200');

    const updated = await cases.updateCase(created.id, { status: 'completed' }, userId);

    expect(updated).toMatchObject({
      pricing_mode: 'services',
      status: 'completed',
    });
    expect(updated?.total_value?.toString()).toBe('200');
    await expect(
      prisma.caseHistoryEvent.findFirst({
        where: {
          caseId: created.id,
          eventType: 'status_advanced',
          fromStatus: 'pending',
          toStatus: 'completed',
        },
      }),
    ).resolves.toMatchObject({ userId });
  });

  it('still rejects genuinely invalid financial updates', async () => {
    const userId = await createUser('invalid-finance@cadisk.local', 'invf01');
    const doctorId = await createDoctor(userId);
    const fixed = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Fixo Inválido',
        pricing_mode: 'fixed',
        priority: 'normal',
        status: 'pending',
        total_value: '300,00',
      },
      userId,
    );
    const service = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Serviços Inválido',
        pricing_mode: 'services',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    await expect(cases.updateCase(fixed.id, { total_value: null }, userId)).rejects.toThrow(
      'Informe o valor fixo para este caso.',
    );
    await expect(cases.updateCase(service.id, { total_value: '100,00' }, userId)).rejects.toThrow(
      'Casos por serviços não usam valor combinado.',
    );
  });

  it('recalculates service totals from existing items and returns items_count', async () => {
    const userId = await createUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Soma',
        pricing_mode: 'services',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    await prisma.caseItem.createMany({
      data: [
        {
          caseId: created.id,
          quantity: 2,
          serviceType: 'coroa',
          tooth: '11',
          unitValue: new Prisma.Decimal('120.00'),
        },
        {
          caseId: created.id,
          quantity: 1,
          serviceType: 'faceta',
          tooth: '21',
          unitValue: new Prisma.Decimal('80.00'),
        },
      ],
    });

    const refreshed = await cases.updateCase(created.id, { notes: 'Recalcular' }, userId);
    expect(refreshed?.total_value?.toString()).toBe('320');
    expect(refreshed?.items_count).toBe(2);
    expect(refreshed?.items).toHaveLength(2);
  });

  it('soft deletes cases and excludes them from reads', async () => {
    const userId = await createUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Delete',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    const deleted = await cases.deleteCase(created.id, userId);
    expect(deleted.deleted_at).toBeInstanceOf(Date);
    await expect(cases.getCaseById(created.id, userId)).resolves.toBeNull();
  });

  it('bulk delivers with ids, dedupe, default completed filter and rollback on missing ids', async () => {
    const userId = await createUser('case@cadisk.local', 'case01');
    const doctorId = await createDoctor(userId);
    const pending = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Pendente',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );
    const completed = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Completo',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );
    await cases.updateCase(completed.id, { status: 'completed' }, userId);

    await expect(
      cases.bulkDeliverCases({ case_ids: [pending.id], doctor_id: doctorId }, userId),
    ).rejects.toThrow('Fluxo de status inválido');

    await cases.updateCase(pending.id, { status: 'completed' }, userId);

    const delivered = await cases.bulkDeliverCases(
      { case_ids: [pending.id, pending.id, completed.id], doctor_id: doctorId },
      userId,
    );
    expect(delivered.map((foundCase) => foundCase.id)).toEqual([pending.id, completed.id]);
    expect(delivered.every((foundCase) => foundCase.status === 'delivered')).toBe(true);
    expect(new Set(delivered.map((foundCase) => foundCase.delivered_at?.getTime())).size).toBe(1);

    const otherCompleted = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Default',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );
    await cases.updateCase(otherCompleted.id, { status: 'completed' }, userId);

    await expect(cases.bulkDeliverCases({ case_ids: [] }, userId)).resolves.toMatchObject([
      { id: otherCompleted.id, status: 'delivered' },
    ]);

    const rollbackCandidate = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Rollback',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );
    await cases.updateCase(rollbackCandidate.id, { status: 'completed' }, userId);
    await expect(
      cases.bulkDeliverCases({ case_ids: [rollbackCandidate.id, 99999] }, userId),
    ).rejects.toThrow('Alguns pedidos selecionados não foram encontrados.');
    await expect(cases.getCaseById(rollbackCandidate.id, userId)).resolves.toMatchObject({
      status: 'completed',
      delivered_at: null,
    });
  });
});
