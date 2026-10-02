import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../../src/app.configure';
import { AppModule } from '../../src/app.module';
import { PasswordResetService, RECOVERY_MESSAGE } from '../../src/auth/password-reset.service';
import { RecoveryRateLimitService } from '../../src/auth/recovery-rate-limit.service';
import { LoginRateLimitService } from '../../src/auth/login-rate-limit.service';
import { EmailService, type EmailMessage } from '../../src/email/email.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserService } from '../../src/user/user.service';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';

describe('password recovery HTTP', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let resets: PasswordResetService;
  let accessToken: string;
  let refreshToken: string;
  let userId: number;
  const send = jest.fn<Promise<void>, [EmailMessage]>();
  const email = 'reset@example.com';
  const latestToken = () =>
    /#token=([a-f0-9]{64})/.exec(send.mock.calls.at(-1)?.[0].text ?? '')?.[1] ?? '';

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue({ send })
      .compile();
    module.get(ConfigService).set('FRONTEND_URL', 'https://app.example.com');
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    resets = app.get(PasswordResetService);
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    send.mockReset().mockResolvedValue(undefined);
    app.get(LoginRateLimitService).resetLoginAttempts();
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, username: 'reset1', password: 'abcde1' })
      .expect(201);
    accessToken = response.body.access_token as string;
    refreshToken = response.body.refresh_token as string;
    userId = (await prisma.user.findFirstOrThrow()).id;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app.close();
  });

  it('returns identical status, body and headers for existing, missing and suppressed accounts', async () => {
    // Exercise the controller's real generic response without sharing limiter state across tests.
    jest.spyOn(app.get(RecoveryRateLimitService), 'allow').mockReturnValue(true);
    const existing = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      // Mock email delivery is immediate; a fixed 5.5-second floor must not return.
      .timeout({ deadline: 2000 })
      .expect(200);
    const suppressed = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .timeout({ deadline: 2000 })
      .expect(200);
    const missing = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .timeout({ deadline: 2000 })
      .expect(200);
    for (const response of [existing, suppressed, missing]) {
      expect(response.body).toEqual({ detail: RECOVERY_MESSAGE });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['referrer-policy']).toBe('no-referrer');
    }
    expect(send).toHaveBeenCalledTimes(1);
    expect(await prisma.passwordReset.count()).toBe(1);
  });
  it('keeps the public response when the IP/email layer suppresses a request', async () => {
    jest.spyOn(app.get(RecoveryRateLimitService), 'allow').mockReturnValue(false);
    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .timeout({ deadline: 2000 })
      .expect(200, { detail: RECOVERY_MESSAGE });
    expect(send).not.toHaveBeenCalled();
    expect(await prisma.passwordReset.count()).toBe(0);
  });
  it('revokes existing and pre-version JWTs, then accepts a new JWT', async () => {
    const legacy = app.get(JwtService).sign({ sub: 'reset1' });
    for (const token of [accessToken, legacy])
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    await resets.request(email);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: latestToken(), password: 'newpass1' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(401);
    expect(await prisma.persistentSession.count({ where: { userId, revokedAt: null } })).toBe(0);
    for (const token of [accessToken, legacy])
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: email, password: 'abcde1' })
      .expect(401);
    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: email, password: 'newpass1' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loggedIn.body.access_token}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: latestToken(), password: 'newpass1' })
      .expect(400);
  });
  it('validates token and password at the HTTP boundary', async () => {
    await resets.request(email);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'invalid', password: 'abcde1' })
      .expect(422);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'f'.repeat(64), password: 'abcde1' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: latestToken(), password: 'abcd!1' })
      .expect(422);
    expect((await prisma.passwordReset.findFirstOrThrow()).usedAt).toBeNull();
  });
  it('rejects short usernames on submission with a clear field error', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'other@example.com', username: 'abc', password: 'abcde1' })
      .expect(422);
    expect(response.body.detail).toContainEqual({
      loc: ['body', 'username'],
      msg: 'Value error, Nome de usuário deve ter pelo menos 5 caracteres',
    });
  });
  it('authenticates legacy passwords without applying creation policy', async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await app.get(UserService).hashPassword('x') },
    });
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: email, password: 'x' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: email, password: '' })
      .expect(422);
  });
  it('rate limits the reset endpoint before hashing', async () => {
    for (let i = 0; i < 10; i++)
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'f'.repeat(64), password: 'abcde1' })
        .expect(400);
    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'f'.repeat(64), password: 'abcde1' })
      .expect(429);
  });
});
