import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { AuthModule } from '../../src/auth/auth.module';
import { CaseItemCaseNotFoundError } from '../../src/case-item/case-item.errors';
import { CaseItemModule } from '../../src/case-item/case-item.module';
import { CaseItemService } from '../../src/case-item/case-item.service';
import { CaseModule } from '../../src/case/case.module';
import { CaseService } from '../../src/case/case.service';
import { validateEnvironment } from '../../src/config/app.config';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { DoctorModule } from '../../src/doctor/doctor.module';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserModule } from '../../src/user/user.module';

describe('CaseItemService integration', () => {
  let cases: CaseService;
  let caseItems: CaseItemService;
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

  async function createDoctor(userId: number, name = 'Dr. Item'): Promise<number> {
    const doctor = await prisma.doctor.create({
      data: {
        name,
        userId,
      },
    });
    return doctor.id;
  }

  async function createCase(
    userId: number,
    doctorId: number,
    pricingMode: 'fixed' | 'services' = 'services',
  ): Promise<number> {
    const created = await cases.createCase(
      {
        doctor_id: doctorId,
        patient_ref: 'Paciente Item',
        pricing_mode: pricingMode,
        priority: 'normal',
        status: 'pending',
        total_value: pricingMode === 'fixed' ? '500,00' : undefined,
      },
      userId,
    );
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
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    cases = moduleRef.get(CaseService);
    caseItems = moduleRef.get(CaseItemService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('creates, lists, gets, updates and deletes items with legacy fields', async () => {
    const userId = await createUser('item@cadista.local', 'item01');
    const doctorId = await createDoctor(userId);
    const caseId = await createCase(userId, doctorId);

    const item = await caseItems.createCaseItem(
      caseId,
      {
        tooth: ' 11 ',
        service_type: 'coroa',
        quantity: 2,
        unit_value: '150,00',
        material: 'zircônia',
        color: 'A1',
        notes: 'teste',
      },
      userId,
    );

    expect(item).toMatchObject({
      id: 1,
      case_id: caseId,
      tooth: '11',
      service_type: 'coroa',
      quantity: 2,
      material: 'zircônia',
      color: 'A1',
      notes: 'teste',
    });
    expect(item.unit_value?.toString()).toBe('150');

    await expect(caseItems.listCaseItems(caseId, userId)).resolves.toMatchObject([
      { id: item.id, tooth: '11' },
    ]);
    await expect(caseItems.getCaseItemById(caseId, item.id, userId)).resolves.toMatchObject({
      id: item.id,
      tooth: '11',
    });

    const updated = await caseItems.updateCaseItem(
      caseId,
      item.id,
      {
        tooth: '12',
        quantity: 3,
        unit_value: '175,00',
        notes: 'ajustado',
      },
      userId,
    );

    expect(updated).toMatchObject({
      id: item.id,
      tooth: '12',
      quantity: 3,
      notes: 'ajustado',
    });
    expect(updated?.unit_value?.toString()).toBe('175');

    await expect(caseItems.deleteCaseItem(caseId, item.id, userId)).resolves.toBe(true);
    await expect(caseItems.getCaseItemById(caseId, item.id, userId)).resolves.toBeNull();
  });

  it('requires unit values for service cases and keeps fixed case total unchanged', async () => {
    const userId = await createUser('billing@cadista.local', 'bill01');
    const doctorId = await createDoctor(userId);
    const serviceCaseId = await createCase(userId, doctorId, 'services');

    await expect(
      caseItems.createCaseItem(
        serviceCaseId,
        {
          tooth: '11',
          service_type: 'coroa',
          unit_value: null,
        },
        userId,
      ),
    ).rejects.toThrow('Informe o valor unitário do serviço para este caso.');

    const fixedCaseId = await createCase(userId, doctorId, 'fixed');
    const item = await caseItems.createCaseItem(
      fixedCaseId,
      {
        tooth: '21',
        service_type: 'faceta',
        unit_value: null,
      },
      userId,
    );

    const fixedCase = await cases.getCaseById(fixedCaseId, userId);
    expect(item.unit_value).toBeNull();
    expect(fixedCase?.total_value?.toString()).toBe('500');
  });

  it('recalculates service case totals on create, update and delete', async () => {
    const userId = await createUser('recalc@cadista.local', 'recalc1');
    const doctorId = await createDoctor(userId);
    const caseId = await createCase(userId, doctorId, 'services');

    const first = await caseItems.createCaseItem(
      caseId,
      {
        tooth: '11',
        service_type: 'coroa',
        quantity: 2,
        unit_value: '100,00',
      },
      userId,
    );
    await caseItems.createCaseItem(
      caseId,
      {
        tooth: '21',
        service_type: 'faceta',
        quantity: 1,
        unit_value: '50,00',
      },
      userId,
    );

    await expect(cases.getCaseById(caseId, userId)).resolves.toMatchObject({
      total_value: expect.objectContaining({ s: 1 }),
    });
    expect((await cases.getCaseById(caseId, userId))?.total_value?.toString()).toBe('250');

    await caseItems.updateCaseItem(caseId, first.id, { quantity: 3, unit_value: '120,00' }, userId);
    expect((await cases.getCaseById(caseId, userId))?.total_value?.toString()).toBe('410');

    await caseItems.deleteCaseItem(caseId, first.id, userId);
    expect((await cases.getCaseById(caseId, userId))?.total_value?.toString()).toBe('50');

    const remaining = await caseItems.listCaseItems(caseId, userId);
    expect(remaining[0]).toBeDefined();
    await caseItems.deleteCaseItem(caseId, remaining[0]!.id, userId);
    expect((await cases.getCaseById(caseId, userId))?.total_value).toBeNull();
  });

  it('blocks deleted and foreign cases as missing resources', async () => {
    const firstUserId = await createUser('first@cadista.local', 'first1');
    const secondUserId = await createUser('second@cadista.local', 'second1');
    const firstDoctorId = await createDoctor(firstUserId, 'Dr. Primeiro');
    const secondDoctorId = await createDoctor(secondUserId, 'Dr. Segundo');
    const firstCaseId = await createCase(firstUserId, firstDoctorId, 'services');
    const secondCaseId = await createCase(secondUserId, secondDoctorId, 'services');

    const firstItem = await caseItems.createCaseItem(
      firstCaseId,
      {
        tooth: '11',
        service_type: 'coroa',
        unit_value: '100,00',
      },
      firstUserId,
    );

    await expect(caseItems.listCaseItems(firstCaseId, secondUserId)).rejects.toBeInstanceOf(
      CaseItemCaseNotFoundError,
    );
    await expect(
      caseItems.updateCaseItem(firstCaseId, firstItem.id, { notes: 'Tentativa' }, secondUserId),
    ).rejects.toBeInstanceOf(CaseItemCaseNotFoundError);
    await expect(
      caseItems.deleteCaseItem(firstCaseId, firstItem.id, secondUserId),
    ).rejects.toBeInstanceOf(CaseItemCaseNotFoundError);
    await expect(caseItems.getCaseItemById(firstCaseId, firstItem.id, secondUserId)).resolves.toBe(
      null,
    );

    await cases.deleteCase(secondCaseId, secondUserId);
    await expect(
      caseItems.createCaseItem(
        secondCaseId,
        {
          tooth: '21',
          service_type: 'faceta',
          unit_value: '90,00',
        },
        secondUserId,
      ),
    ).rejects.toBeInstanceOf(CaseItemCaseNotFoundError);
  });
});
