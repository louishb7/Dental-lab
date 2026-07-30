import { PrismaClient } from '@prisma/client';

import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';

describe('database health integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to PostgreSQL and executes SELECT 1', async () => {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;

    expect(rows).toEqual([{ ok: 1 }]);
  });
});
