import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { PasswordResetService } from '../../src/auth/password-reset.service';
import { EmailService, type EmailMessage } from '../../src/email/email.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserService } from '../../src/user/user.service';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';

describe('password recovery PostgreSQL integration', () => {
  let prisma: PrismaService;
  let users: UserService;
  let resets: PasswordResetService;
  let close: () => Promise<void>;
  let userId: number;
  const send = jest.fn<Promise<void>, [EmailMessage]>();
  const email = 'recovery@example.com';
  const hash = (token: string) => createHash('sha256').update(token).digest('hex');
  const latestToken = () => {
    const text = send.mock.calls.at(-1)?.[0].text ?? '';
    const match = /https:\/\/app.example.com\/reset-password#token=([a-f0-9]{64})/.exec(text);
    if (!match?.[1]) throw new Error('Reset fragment link missing');
    return match[1];
  };

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue({ send })
      .compile();
    module.get(ConfigService).set('FRONTEND_URL', 'https://app.example.com');
    prisma = module.get(PrismaService);
    users = module.get(UserService);
    resets = module.get(PasswordResetService);
    await prisma.$connect();
    close = () => module.close();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    send.mockReset().mockResolvedValue(undefined);
    userId = (await users.createUser({ email, username: 'recover1', password: 'abcde1' })).id;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await close();
  });

  async function seed(minutesAgo: number[], owner = userId) {
    for (const minutes of minutesAgo) {
      await prisma.passwordReset.create({
        data: {
          userId: owner,
          tokenHash: hash(randomBytes(32).toString('hex')),
          createdAt: new Date(Date.now() - minutes * 60_000),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
    }
  }

  it('persists only a SHA-256 hash and a thirty-minute expiration', async () => {
    await resets.request(' RECOVERY@EXAMPLE.COM ');
    const token = latestToken();
    const row = await prisma.passwordReset.findFirstOrThrow();
    expect(row.tokenHash).toBe(hash(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(30 * 60_000);
    expect(row.usedAt).toBeNull();
    expect(send.mock.calls[0]?.[0].text).not.toContain('?token=');
  });
  it('does not generate or send for an unknown address', async () => {
    await resets.request('missing@example.com');
    expect(await prisma.passwordReset.count()).toBe(0);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    ['two minutes', [1]],
    ['three per hour', [3, 10, 20]],
    ['five per day', [70, 90, 120, 180, 240]],
  ] as const)('suppresses %s without generating a token or sending', async (_label, minutes) => {
    await seed([...minutes]);
    await resets.request(email);
    expect(await prisma.passwordReset.count()).toBe(minutes.length);
    expect(send).not.toHaveBeenCalled();
  });
  it('allows a new request outside the cooldown and invalidates the previous link', async () => {
    await resets.request(email);
    const first = latestToken();
    await prisma.passwordReset.updateMany({ data: { createdAt: new Date(Date.now() - 121_000) } });
    await resets.request(email);
    const second = latestToken();
    expect(second).not.toBe(first);
    await expect(resets.reset(first, 'newpass1')).rejects.toMatchObject({
      response: { detail: 'Link inválido ou expirado. Solicite novas instruções.' },
    });
    await resets.reset(second, 'newpass1');
    expect(await prisma.passwordReset.count()).toBe(2);
  });
  it('changes the password, consumes the token and increments the auth version', async () => {
    await resets.request(email);
    const token = latestToken();
    await resets.reset(token, 'newpass1');
    expect(await users.authenticateUser(email, 'abcde1')).toBeNull();
    expect((await users.authenticateUser(email, 'newpass1'))?.authVersion).toBe(1);
    expect((await prisma.passwordReset.findFirstOrThrow()).usedAt).not.toBeNull();
    await expect(resets.reset(token, 'againpass1')).rejects.toMatchObject({
      response: { detail: 'Link inválido ou expirado. Solicite novas instruções.' },
    });
  });
  it('clears a login lock only after a valid reset', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + 60_000), failedLoginAttempts: 3 },
    });
    await resets.request(email);
    await resets.reset(latestToken(), 'newpass1');
    expect((await users.authenticateUser(email, 'newpass1'))?.lockedUntil).toBeNull();
  });
  it('rejects malformed, unknown, expired tokens and invalid passwords without consuming', async () => {
    await expect(resets.reset('bad', 'abcde1')).rejects.toMatchObject({
      response: { detail: 'Link inválido ou expirado. Solicite novas instruções.' },
    });
    await expect(resets.reset('f'.repeat(64), 'abcde1')).rejects.toMatchObject({
      response: { detail: 'Link inválido ou expirado. Solicite novas instruções.' },
    });
    await resets.request(email);
    const token = latestToken();
    await expect(resets.reset(token, 'abcd!1')).rejects.toMatchObject({
      response: { detail: 'Senha deve conter 5 ou mais letras' },
    });
    expect((await prisma.passwordReset.findFirstOrThrow()).usedAt).toBeNull();
    await prisma.passwordReset.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    await expect(resets.reset(token, 'abcde1')).rejects.toMatchObject({
      response: { detail: 'Link inválido ou expirado. Solicite novas instruções.' },
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).authVersion).toBe(0);
  });
  it('permits only one effective concurrent use of the same token', async () => {
    await resets.request(email);
    const token = latestToken();
    const outcomes = await Promise.allSettled([
      resets.reset(token, 'firstpass1'),
      resets.reset(token, 'secondpass2'),
    ]);
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).authVersion).toBe(1);
  });
  it('serializes different pending tokens of the same user', async () => {
    const tokens = [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')];
    for (const token of tokens)
      await prisma.passwordReset.create({
        data: { userId, tokenHash: hash(token), expiresAt: new Date(Date.now() + 60_000) },
      });
    const outcomes = await Promise.allSettled(
      tokens.map((token) => resets.reset(token, 'newpass1')),
    );
    expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.passwordReset.count({ where: { usedAt: null } })).toBe(0);
  });
  it('rolls back all state when the password update fails', async () => {
    await resets.request(email);
    const token = latestToken();
    // Force a real PostgreSQL constraint failure inside the transaction.
    const hashMock = jest.spyOn(users, 'hashPassword').mockResolvedValue('x'.repeat(256));
    await expect(resets.reset(token, 'newpass1')).rejects.toThrow();
    hashMock.mockRestore();
    expect((await prisma.passwordReset.findFirstOrThrow()).usedAt).toBeNull();
    expect((await users.authenticateUser(email, 'abcde1'))?.authVersion).toBe(0);
    await resets.reset(token, 'newpass1');
  });
  it('rolls back the password if consuming the token fails', async () => {
    await resets.request(email);
    await prisma.$executeRawUnsafe(
      'ALTER TABLE password_resets ADD CONSTRAINT test_no_consumption CHECK (used_at IS NULL)',
    );
    try {
      await expect(resets.reset(latestToken(), 'newpass1')).rejects.toThrow();
      expect((await users.authenticateUser(email, 'abcde1'))?.authVersion).toBe(0);
      expect((await prisma.passwordReset.findFirstOrThrow()).usedAt).toBeNull();
    } finally {
      await prisma.$executeRawUnsafe(
        'ALTER TABLE password_resets DROP CONSTRAINT test_no_consumption',
      );
    }
  });
  it('does not exceed the per-account limit under concurrent requests', async () => {
    await Promise.all(Array.from({ length: 6 }, () => resets.request(email)));
    expect(await prisma.passwordReset.count()).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not exceed fifty per day under concurrent requests across users', async () => {
    await seed(Array.from({ length: 49 }, () => 120));
    const targets = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        users.createUser({
          email: `other${i}@example.com`,
          username: `other${i}`,
          password: 'abcde1',
        }),
      ),
    );
    const log = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await Promise.all(targets.map((user) => resets.request(user.email)));
    expect(await prisma.passwordReset.count()).toBe(50);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('Password recovery global limit reached');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/@|token=/);
  });
  it('ignores records older than twenty-four hours', async () => {
    await seed(Array.from({ length: 50 }, () => 1441));
    await resets.request(email);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('retains quota and invalidates the token on provider failure, with sanitized logs', async () => {
    const log = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    send.mockRejectedValue(new Error('private token and recovery@example.com'));
    await resets.request(email);
    expect((await prisma.passwordReset.findFirstOrThrow()).usedAt).not.toBeNull();
    await resets.request(email);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith('Password recovery email delivery failed');
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/@|private|token=/);
  });
});
