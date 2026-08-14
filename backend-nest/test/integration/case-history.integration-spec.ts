import { ConfigModule } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../../src/auth/auth.module';
import { CaseHistoryModule } from '../../src/case-history/case-history.module';
import { CaseHistoryService } from '../../src/case-history/case-history.service';
import { CaseModule } from '../../src/case/case.module';
import { CaseService } from '../../src/case/case.service';
import { validateEnvironment } from '../../src/config/app.config';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { DashboardModule } from '../../src/dashboard/dashboard.module';
import { DashboardService } from '../../src/dashboard/dashboard.service';
import { DoctorModule } from '../../src/doctor/doctor.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserModule } from '../../src/user/user.module';

describe('CaseHistory integration', () => {
  let cases: CaseService;
  let history: CaseHistoryService;
  let dashboard: DashboardService;
  let prisma: PrismaService;
  const bulkDeleteIneligibleMessage =
    'Um ou mais casos não foram encontrados ou não podem ser excluídos.';

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

  async function createDoctor(userId: number, name = 'Dr. Histórico'): Promise<number> {
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
        CaseHistoryModule,
        DashboardModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    cases = moduleRef.get(CaseService);
    history = moduleRef.get(CaseHistoryService);
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

  it('returns an empty paginated list when the user has no historical cases', async () => {
    const userId = await createUser('empty-history@cadisk.local', 'empty1');

    await expect(history.listCases({ page: 1, limit: 10 }, userId)).resolves.toEqual({
      items: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        total_pages: 1,
        has_next_page: false,
      },
    });
  });

  it('records creation, status advances, bulk delivery and preserves events after soft delete', async () => {
    const userId = await createUser('history@cadisk.local', 'hist01');
    const doctorId = await createDoctor(userId);

    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Histórico',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    await expect(
      prisma.caseHistoryEvent.findMany({ where: { caseId: created.id } }),
    ).resolves.toMatchObject([
      {
        eventType: 'case_created',
        fromStatus: null,
        toStatus: 'pending',
        userId,
      },
    ]);

    await cases.updateCase(created.id, { status: 'completed' }, userId);
    await cases.updateCase(created.id, { status: 'delivered' }, userId);

    const linearEvents = await prisma.caseHistoryEvent.findMany({
      where: { caseId: created.id },
      orderBy: { id: 'asc' },
    });
    expect(linearEvents.map((event) => event.eventType)).toEqual([
      'case_created',
      'status_advanced',
      'status_advanced',
    ]);
    expect(linearEvents[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'completed' });
    expect(linearEvents[2]).toMatchObject({ fromStatus: 'completed', toStatus: 'delivered' });

    const bulkCandidate = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Entrega em massa',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );
    await cases.updateCase(bulkCandidate.id, { status: 'completed' }, userId);
    await cases.bulkDeliverCases({ case_ids: [bulkCandidate.id] }, userId);

    await expect(
      prisma.caseHistoryEvent.findFirst({
        where: {
          caseId: bulkCandidate.id,
          eventType: 'status_advanced',
          fromStatus: 'completed',
          toStatus: 'delivered',
        },
      }),
    ).resolves.toMatchObject({ userId });

    await cases.deleteCase(created.id, userId);
    const detail = await history.getCaseDetail(created.id, userId);
    expect(detail).toMatchObject({
      id: created.id,
      deleted_at: expect.any(Date),
      patient_ref: 'Paciente Histórico',
    });
    await expect(prisma.caseHistoryEvent.count({ where: { caseId: created.id } })).resolves.toBe(3);
  });

  it('reverts only to the immediate previous status and keeps finance based on current delivery state', async () => {
    const userId = await createUser('revert@cadisk.local', 'rev001');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Retorno',
        pricing_mode: 'fixed',
        priority: 'normal',
        status: 'pending',
        total_value: '500,00',
      },
      userId,
    );

    await cases.updateCase(created.id, { status: 'completed' }, userId);
    const delivered = await cases.updateCase(created.id, { status: 'delivered' }, userId);
    expect(delivered?.delivered_at).toBeInstanceOf(Date);

    const revertedToCompleted = await cases.revertCaseStatus(
      created.id,
      '  Dentista   solicitou ajuste  ',
      userId,
    );
    expect(revertedToCompleted).toMatchObject({
      status: 'completed',
      delivered_at: null,
      status_revert_reason: 'Dentista solicitou ajuste',
    });
    expect(revertedToCompleted?.total_value?.toString()).toBe('500');

    const emptyFinance = await dashboard.getDashboardSummary(userId, new Date());
    expect(emptyFinance.delivered_count_month).toBe(0);
    expect(emptyFinance.delivered_total_month.toString()).toBe('0');

    await expect(cases.updateCase(created.id, { status: 'pending' }, userId)).rejects.toThrow(
      'Fluxo de status inválido',
    );

    const revertedToPending = await cases.revertCaseStatus(
      created.id,
      'Ajuste voltou para produção',
      userId,
    );
    expect(revertedToPending?.status).toBe('pending');

    await expect(cases.revertCaseStatus(created.id, 'Novo retorno', userId)).rejects.toThrow(
      'Caso pendente não possui status anterior',
    );
    await expect(cases.revertCaseStatus(created.id, '    ', userId)).rejects.toThrow(
      'Informe o motivo do retorno de status',
    );

    await cases.updateCase(created.id, { status: 'completed' }, userId);
    const deliveredAgain = await cases.updateCase(created.id, { status: 'delivered' }, userId);
    expect(deliveredAgain?.delivered_at).toBeInstanceOf(Date);

    const finance = await dashboard.getDashboardSummary(userId, new Date());
    expect(finance.delivered_count_month).toBe(1);
    expect(finance.delivered_total_month.toString()).toBe('500');

    const events = await history.listCaseEvents(created.id, { page: 1, limit: 20 }, userId);
    expect(events?.items.map((event) => event.event_type).reverse()).toEqual([
      'case_created',
      'status_advanced',
      'status_advanced',
      'status_reverted',
      'status_reverted',
      'status_advanced',
      'status_advanced',
    ]);
    expect(events?.items.some((event) => event.reason === 'Dentista solicitou ajuste')).toBe(true);
  });

  it('keeps case and history writes atomic when event creation fails', async () => {
    const userId = await createUser('atomic@cadisk.local', 'atom01');
    const doctorId = await createDoctor(userId);
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Atômico',
        priority: 'normal',
        status: 'pending',
      },
      userId,
    );

    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_status_history_event()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'Falha no evento';
      END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER fail_status_history_event_trigger
      BEFORE INSERT ON case_history_events
      FOR EACH ROW
      WHEN (NEW.event_type = 'status_advanced')
      EXECUTE FUNCTION fail_status_history_event();
    `);

    try {
      await expect(cases.updateCase(created.id, { status: 'completed' }, userId)).rejects.toThrow(
        'Falha no evento',
      );
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS fail_status_history_event_trigger ON case_history_events',
      );
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_status_history_event()');
    }

    await expect(cases.getCaseById(created.id, userId)).resolves.toMatchObject({
      status: 'pending',
    });
    await expect(prisma.caseHistoryEvent.count({ where: { caseId: created.id } })).resolves.toBe(1);
  });

  it('paginates and filters history cases without leaking another user data', async () => {
    const firstUserId = await createUser('first-history@cadisk.local', 'fhist1');
    const secondUserId = await createUser('second-history@cadisk.local', 'shist1');
    const firstDoctorId = await createDoctor(firstUserId, 'Dr. Filtro');
    const secondDoctorId = await createDoctor(secondUserId, 'Dr. Outro');

    const oldDelivered = await prisma.dentalCase.create({
      data: {
        doctorId: firstDoctorId,
        patientRef: 'Paciente Antigo Localizável',
        status: 'delivered',
        totalValue: new Prisma.Decimal('100.00'),
        deliveredAt: new Date('2026-01-15T12:00:00.000Z'),
        createdAt: new Date('2025-12-01T12:00:00.000Z'),
      },
    });
    const reverted = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Paciente Com Retorno',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    await cases.updateCase(reverted.id, { status: 'completed' }, firstUserId);
    await cases.revertCaseStatus(reverted.id, 'Ajuste', firstUserId);
    await cases.createCase(
      {
        doctor_id: secondDoctorId,
        patient_ref: 'Paciente Invisível',
        priority: 'normal',
        status: 'pending',
      },
      secondUserId,
    );

    await prisma.caseHistoryEvent.create({
      data: {
        caseId: oldDelivered.id,
        userId: firstUserId,
        eventType: 'case_created',
        fromStatus: null,
        toStatus: 'pending',
        createdAt: oldDelivered.createdAt,
      },
    });
    await prisma.caseHistoryEvent.create({
      data: {
        caseId: oldDelivered.id,
        userId: firstUserId,
        eventType: 'status_advanced',
        fromStatus: null,
        toStatus: 'delivered',
        createdAt: oldDelivered.deliveredAt ?? new Date('2026-01-15T12:00:00.000Z'),
      },
    });

    const firstPage = await history.listCases({ page: 1, limit: 1 }, firstUserId);
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      total_pages: 2,
      has_next_page: true,
    });

    await expect(
      history.listCases({ page: 1, limit: 25, q: 'Antigo' }, firstUserId),
    ).resolves.toMatchObject({
      items: [{ id: oldDelivered.id, patient_ref: 'Paciente Antigo Localizável' }],
    });
    await expect(
      history.listCases(
        {
          page: 1,
          limit: 25,
          delivered_from: new Date('2026-01-01T00:00:00.000Z'),
          delivered_to: new Date('2026-01-31T23:59:59.999Z'),
          doctor_id: firstDoctorId,
          status: 'delivered',
        },
        firstUserId,
      ),
    ).resolves.toMatchObject({
      items: [{ id: oldDelivered.id }],
    });
    await expect(
      history.listCases({ page: 1, limit: 25, has_reverted: 'true' }, firstUserId),
    ).resolves.toMatchObject({
      items: [{ id: reverted.id, has_reverted: true }],
    });
    await expect(history.getCaseDetail(oldDelivered.id, secondUserId)).resolves.toBeNull();
    await expect(
      history.listCaseEvents(oldDelivered.id, { page: 1, limit: 20 }, secondUserId),
    ).resolves.toBeNull();
    await expect(
      cases.revertCaseStatus(oldDelivered.id, 'Tentativa', secondUserId),
    ).resolves.toBeNull();
  });

  it('permanently deletes owned history records without deleting another user data', async () => {
    const firstUserId = await createUser('delete-history@cadisk.local', 'dhist1');
    const secondUserId = await createUser('delete-other-history@cadisk.local', 'dothr1');
    const firstDoctorId = await createDoctor(firstUserId, 'Dr. Apagar');
    const secondDoctorId = await createDoctor(secondUserId, 'Dr. Preservar');

    const firstCase = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Apagar individual',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    const secondCase = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Apagar em lote',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    const foreignCase = await cases.createCase(
      {
        doctor_id: secondDoctorId,
        patient_ref: 'Nao apagar',
        priority: 'normal',
        status: 'pending',
      },
      secondUserId,
    );

    await cases.deleteCase(firstCase.id, firstUserId);
    await cases.deleteCase(secondCase.id, firstUserId);

    await expect(history.permanentlyDeleteCase(firstCase.id, firstUserId)).resolves.toEqual({
      deleted_count: 1,
    });
    await expect(prisma.dentalCase.findUnique({ where: { id: firstCase.id } })).resolves.toBeNull();
    await expect(prisma.caseHistoryEvent.count({ where: { caseId: firstCase.id } })).resolves.toBe(
      0,
    );

    await expect(history.permanentlyDeleteCase(foreignCase.id, firstUserId)).resolves.toBeNull();

    await expect(
      history.permanentlyDeleteCases([secondCase.id, secondCase.id], firstUserId),
    ).resolves.toEqual({ deleted_count: 1 });
    await expect(
      prisma.dentalCase.findUnique({ where: { id: secondCase.id } }),
    ).resolves.toBeNull();

    const activeCase = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Ativo nao deve apagar',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    const validWithActive = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Valido com ativo',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    await cases.deleteCase(validWithActive.id, firstUserId);

    await expect(
      history.permanentlyDeleteCases([validWithActive.id, activeCase.id], firstUserId),
    ).rejects.toThrow(bulkDeleteIneligibleMessage);
    await expect(
      prisma.dentalCase.findUnique({ where: { id: validWithActive.id } }),
    ).resolves.toMatchObject({ id: validWithActive.id });
    await expect(
      prisma.dentalCase.findUnique({ where: { id: activeCase.id } }),
    ).resolves.toMatchObject({ id: activeCase.id });

    const validWithMissing = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Valido com inexistente',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    await cases.deleteCase(validWithMissing.id, firstUserId);

    await expect(
      history.permanentlyDeleteCases([validWithMissing.id, 99999], firstUserId),
    ).rejects.toThrow(bulkDeleteIneligibleMessage);
    await expect(
      prisma.dentalCase.findUnique({ where: { id: validWithMissing.id } }),
    ).resolves.toMatchObject({ id: validWithMissing.id });

    const validWithForeign = await cases.createCase(
      {
        doctor_id: firstDoctorId,
        patient_ref: 'Valido com estrangeiro',
        priority: 'normal',
        status: 'pending',
      },
      firstUserId,
    );
    await cases.deleteCase(validWithForeign.id, firstUserId);
    await cases.deleteCase(foreignCase.id, secondUserId);

    await expect(
      history.permanentlyDeleteCases([validWithForeign.id, foreignCase.id], firstUserId),
    ).rejects.toThrow(bulkDeleteIneligibleMessage);
    await expect(
      prisma.dentalCase.findUnique({ where: { id: validWithForeign.id } }),
    ).resolves.toMatchObject({ id: validWithForeign.id });
    await expect(
      prisma.dentalCase.findUnique({ where: { id: foreignCase.id } }),
    ).resolves.toMatchObject({
      id: foreignCase.id,
    });
  });
});
