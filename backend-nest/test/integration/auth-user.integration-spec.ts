import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { validateEnvironment } from '../../src/config/app.config';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AccountLockedError } from '../../src/user/account-locked.error';
import { UserModule } from '../../src/user/user.module';
import { UserService } from '../../src/user/user.service';

describe('UserService integration', () => {
  let prisma: PrismaService;
  let users: UserService;

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE case_history_events, case_items, cases, doctors, users RESTART IDENTITY CASCADE',
    );
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
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    users = moduleRef.get(UserService);
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
    await prisma.$disconnect();
  });

  it('creates users with legacy normalization and hashed passwords', async () => {
    const user = await users.createUser({
      email: ' Admin@Cadista.Local ',
      username: ' admin1 ',
      password: 'StrongPass123!',
    });

    expect(user.email).toBe('admin@cadista.local');
    expect(user.username).toBe('admin1');
    expect(user.passwordHash).not.toBe('StrongPass123!');
    expect(user.failedLoginAttempts).toBe(0);
  });

  it('rejects duplicate email and username case-insensitively', async () => {
    await users.createUser({
      email: 'admin@cadista.local',
      username: 'admin1',
      password: 'StrongPass123!',
    });

    await expect(
      users.createUser({
        email: 'ADMIN@cadista.local',
        username: 'other1',
        password: 'StrongPass123!',
      }),
    ).rejects.toThrow('Já existe um usuário com este email');

    await expect(
      users.createUser({
        email: 'other@cadista.local',
        username: 'ADMIN1',
        password: 'StrongPass123!',
      }),
    ).rejects.toThrow('Já existe um usuário com este nome de usuário');
  });

  it('authenticates by username or email and updates login timestamps', async () => {
    await users.createUser({
      email: 'admin@cadista.local',
      username: 'admin1',
      password: 'StrongPass123!',
    });

    const byUsername = await users.authenticateUser('ADMIN1', 'StrongPass123!');
    expect(byUsername?.username).toBe('admin1');
    expect(byUsername?.lastLoginAt).toBeInstanceOf(Date);

    const byEmail = await users.authenticateUser('ADMIN@CADISTA.LOCAL', 'StrongPass123!');
    expect(byEmail?.email).toBe('admin@cadista.local');
  });

  it('locks an account after repeated failed logins and clears expired locks on success', async () => {
    const user = await users.createUser({
      email: 'admin@cadista.local',
      username: 'admin1',
      password: 'StrongPass123!',
    });

    await expect(users.authenticateUser('admin1', 'wrong-password')).resolves.toBeNull();
    await expect(users.authenticateUser('admin1', 'wrong-password')).resolves.toBeNull();
    await expect(users.authenticateUser('admin1', 'wrong-password')).rejects.toBeInstanceOf(
      AccountLockedError,
    );

    const locked = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(locked.failedLoginAttempts).toBe(0);
    expect(locked.lockedUntil).toBeInstanceOf(Date);
    expect(locked.lastFailedLoginAt).toBeInstanceOf(Date);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() - 1_000),
      },
    });

    const recovered = await users.authenticateUser('admin1', 'StrongPass123!');
    expect(recovered?.lockedUntil).toBeNull();
    expect(recovered?.failedLoginAttempts).toBe(0);
    expect(recovered?.lastFailedLoginAt).toBeNull();
    expect(recovered?.lastLoginAt).toBeInstanceOf(Date);
  });
});
