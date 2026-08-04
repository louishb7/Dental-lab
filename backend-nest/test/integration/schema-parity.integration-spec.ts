import { PrismaClient } from '@prisma/client';

import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';

describe('schema parity integration', () => {
  let prisma: PrismaClient;
  let schemaName: string;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
    schemaName = new URL(databaseUrl).searchParams.get('schema') || 'public';
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "case_history_events", "case_items", "cases", "doctors", "users" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the legacy domain tables and persistent case history table', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ${schemaName}
        AND table_name IN ('users', 'doctors', 'cases', 'case_items', 'case_history_events')
      ORDER BY table_name
    `;

    expect(rows.map((row) => row.table_name)).toEqual([
      'case_history_events',
      'case_items',
      'cases',
      'doctors',
      'users',
    ]);
  });

  it('creates custom constraints and indexes required for parity', async () => {
    const constraints = await prisma.$queryRaw<Array<{ conname: string }>>`
      SELECT conname
      FROM pg_constraint
      JOIN pg_namespace ON pg_namespace.oid = pg_constraint.connamespace
      WHERE pg_namespace.nspname = ${schemaName}
        AND conname IN (
        'uq_users_email',
        'uq_users_username',
        'fk_doctors_user_id_users',
        'cases_doctor_id_fkey',
        'case_items_case_id_fkey',
        'case_history_events_case_id_fkey',
        'case_history_events_user_id_fkey',
        'ck_case_history_events_event_type_valid',
        'ck_case_history_events_from_status_valid',
        'ck_case_history_events_to_status_valid',
        'ck_cases_priority_valid',
        'ck_cases_status_valid',
        'ck_cases_total_value_non_negative',
        'ck_cases_pricing_mode_valid',
        'ck_case_items_unit_value_non_negative',
        'ck_case_items_quantity_positive'
      )
      ORDER BY conname
    `;
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = ${schemaName}
        AND indexname IN (
          'uq_users_email_lower',
          'uq_users_username_lower',
          'ix_doctors_user_id',
          'ix_doctors_name',
          'ix_doctors_deleted_at',
          'ix_cases_doctor_id',
          'ix_cases_patient_ref',
          'ix_cases_priority',
          'ix_cases_status',
          'ix_cases_deleted_at',
          'ix_case_items_case_id',
          'ix_case_history_events_case_id_created_at',
          'ix_case_history_events_user_id'
        )
      ORDER BY indexname
    `;

    expect(constraints.map((row) => row.conname)).toEqual([
      'case_history_events_case_id_fkey',
      'case_history_events_user_id_fkey',
      'case_items_case_id_fkey',
      'cases_doctor_id_fkey',
      'ck_case_history_events_event_type_valid',
      'ck_case_history_events_from_status_valid',
      'ck_case_history_events_to_status_valid',
      'ck_case_items_quantity_positive',
      'ck_case_items_unit_value_non_negative',
      'ck_cases_pricing_mode_valid',
      'ck_cases_priority_valid',
      'ck_cases_status_valid',
      'ck_cases_total_value_non_negative',
      'fk_doctors_user_id_users',
      'uq_users_email',
      'uq_users_username',
    ]);
    expect(indexes.map((row) => row.indexname)).toEqual([
      'ix_case_history_events_case_id_created_at',
      'ix_case_history_events_user_id',
      'ix_case_items_case_id',
      'ix_cases_deleted_at',
      'ix_cases_doctor_id',
      'ix_cases_patient_ref',
      'ix_cases_priority',
      'ix_cases_status',
      'ix_doctors_deleted_at',
      'ix_doctors_name',
      'ix_doctors_user_id',
      'uq_users_email_lower',
      'uq_users_username_lower',
    ]);
  });

  it('enforces case-insensitive user identity and domain checks', async () => {
    await prisma.$executeRaw`
      INSERT INTO "users" ("email", "username", "password_hash")
      VALUES ('Admin@Cadisk.Local', 'AdminUser', 'hash')
    `;
    await prisma.$executeRaw`
      INSERT INTO "doctors" ("user_id", "name")
      VALUES (1, 'Dr. Schema')
    `;
    await prisma.$executeRaw`
      INSERT INTO "cases" ("doctor_id", "patient_ref")
      VALUES (1, 'Paciente Schema')
    `;

    await expect(prisma.$executeRaw`
      INSERT INTO "users" ("email", "username", "password_hash")
      VALUES ('admin@cadisk.local', 'OtherUser', 'hash')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "users" ("email", "username", "password_hash")
      VALUES ('other@cadisk.local', 'adminuser', 'hash')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "cases" ("doctor_id", "patient_ref", "priority")
      VALUES (1, 'Prioridade invalida', 'high')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "cases" ("doctor_id", "patient_ref", "status")
      VALUES (1, 'Status invalido', 'archived')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "cases" ("doctor_id", "patient_ref", "pricing_mode")
      VALUES (1, 'Cobranca invalida', 'hourly')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "cases" ("doctor_id", "patient_ref", "total_value")
      VALUES (1, 'Valor invalido', -1)
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "case_items" ("case_id", "tooth", "service_type", "quantity")
      VALUES (1, '11', 'coroa', 0)
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "case_items" ("case_id", "tooth", "service_type", "unit_value")
      VALUES (1, '11', 'coroa', -1)
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "case_history_events" ("case_id", "user_id", "event_type", "to_status")
      VALUES (1, 1, 'note_changed', 'pending')
    `).rejects.toThrow();
    await expect(prisma.$executeRaw`
      INSERT INTO "case_history_events" ("case_id", "user_id", "event_type", "to_status")
      VALUES (1, 1, 'case_created', 'archived')
    `).rejects.toThrow();
  });

  it('enforces foreign key delete actions', async () => {
    await prisma.$executeRaw`
      INSERT INTO "users" ("email", "username", "password_hash")
      VALUES ('owner@cadisk.local', 'OwnerUser', 'hash')
    `;
    await prisma.$executeRaw`
      INSERT INTO "doctors" ("user_id", "name")
      VALUES (1, 'Dr. Owner')
    `;
    await prisma.$executeRaw`
      INSERT INTO "cases" ("doctor_id", "patient_ref")
      VALUES (1, 'Paciente Restrict')
    `;
    await prisma.$executeRaw`
      INSERT INTO "case_items" ("case_id", "tooth", "service_type")
      VALUES (1, '11', 'coroa')
    `;
    await prisma.$executeRaw`
      INSERT INTO "case_history_events" ("case_id", "user_id", "event_type", "to_status")
      VALUES (1, 1, 'case_created', 'pending')
    `;

    await expect(prisma.$executeRaw`
      DELETE FROM "doctors" WHERE "id" = 1
    `).rejects.toThrow();

    await expect(prisma.$executeRaw`DELETE FROM "cases" WHERE "id" = 1`).rejects.toThrow();

    await prisma.$executeRaw`DELETE FROM "case_history_events" WHERE "case_id" = 1`;
    await prisma.$executeRaw`DELETE FROM "cases" WHERE "id" = 1`;
    await prisma.$executeRaw`DELETE FROM "users" WHERE "id" = 1`;

    const counts = await prisma.$queryRaw<
      Array<{ users: bigint; doctors: bigint; cases: bigint; case_items: bigint }>
    >`
      SELECT
        (SELECT count(*) FROM "users") AS users,
        (SELECT count(*) FROM "doctors") AS doctors,
        (SELECT count(*) FROM "cases") AS cases,
        (SELECT count(*) FROM "case_items") AS case_items
    `;

    expect(counts).toEqual([
      {
        users: 0n,
        doctors: 0n,
        cases: 0n,
        case_items: 0n,
      },
    ]);
  });
});
