import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../../src/app.configure';
import { AppModule } from '../../src/app.module';
import { LoginRateLimitService } from '../../src/auth/login-rate-limit.service';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { PrismaService } from '../../src/prisma/prisma.service';

const STRONG_PASSWORD = 'StrongPass123!';
const SPECIAL_PASSWORD = 'Ab!1cd';

describe('auth e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let loginRateLimit: LoginRateLimitService;

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE case_items, cases, doctors, users RESTART IDENTITY CASCADE',
    );
    loginRateLimit.resetLoginAttempts();
  }

  async function registerUser(
    email = 'admin@cadista.local',
    username = 'admin1',
  ): Promise<{ access_token: string; email: string; token_type: 'bearer'; username: string }> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: STRONG_PASSWORD,
        username,
      })
      .expect(201);

    return response.body as {
      access_token: string;
      email: string;
      token_type: 'bearer';
      username: string;
    };
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

  it('registers, logs in and returns the current user', async () => {
    const registerPayload = await registerUser('Admin@Cadista.Local', 'admin1');

    expect(registerPayload.token_type).toBe('bearer');
    expect(registerPayload.username).toBe('admin1');
    expect(registerPayload.email).toBe('admin@cadista.local');
    expect(registerPayload.access_token).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registerPayload.access_token}`)
      .expect(200)
      .expect({
        id: 1,
        username: 'admin1',
        email: 'admin@cadista.local',
      });

    const loginByUsername = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'ADMIN1', password: STRONG_PASSWORD })
      .expect(200);
    expect(loginByUsername.body.username).toBe('admin1');

    const loginByEmailAlias = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ADMIN@CADISTA.LOCAL', password: STRONG_PASSWORD })
      .expect(200);
    expect(loginByEmailAlias.body.email).toBe('admin@cadista.local');
  });

  it('allows multiple users and rejects duplicate identities', async () => {
    await registerUser();

    const secondResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'operator@cadista.local',
        password: STRONG_PASSWORD,
        username: 'operator1',
      })
      .expect(201);
    expect(secondResponse.body.username).toBe('operator1');

    const duplicateEmail = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'ADMIN@cadista.local',
        password: STRONG_PASSWORD,
        username: 'another1',
      })
      .expect(409);
    expect(duplicateEmail.body).toEqual({ detail: 'Já existe um usuário com este email' });

    const duplicateUsername = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'another@cadista.local',
        password: STRONG_PASSWORD,
        username: 'ADMIN1',
      })
      .expect(409);
    expect(duplicateUsername.body).toEqual({
      detail: 'Já existe um usuário com este nome de usuário',
    });
  });

  it('keeps legacy registration validation messages', async () => {
    const missingPassword = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'missing@cadista.local',
        username: 'missing1',
      })
      .expect(422);
    expect(missingPassword.body.detail[0]).toEqual({
      loc: ['body', 'password'],
      msg: 'Field required',
    });

    const weakPassword = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'weak@cadista.local',
        password: 'weakpass',
        username: 'weak1',
      })
      .expect(422);
    expect(weakPassword.body.detail[0].msg).toBe(
      'Value error, Senha deve conter ao menos um número',
    );

    const digitsOnly = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'digits@cadista.local',
        password: STRONG_PASSWORD,
        username: '12345',
      })
      .expect(422);
    expect(digitsOnly.body.detail[0].msg).toBe(
      'Value error, Nome de usuário não pode ser composto apenas por números',
    );

    const specialChars = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'special@cadista.local',
        password: STRONG_PASSWORD,
        username: 'user@1',
      })
      .expect(422);
    expect(specialChars.body.detail[0].msg).toBe(
      'Value error, Nome de usuário pode conter apenas letras e números',
    );
  });

  it('accepts passwords with special characters', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'symbols@cadista.local',
        password: SPECIAL_PASSWORD,
        username: 'symbols1',
      })
      .expect(201);
  });

  it('rejects invalid credentials with bearer challenge', async () => {
    await registerUser();

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'admin1', password: 'wrong-password' })
      .expect(401);

    expect(response.headers['www-authenticate']).toBe('Bearer');
    expect(response.body).toEqual({ detail: 'Credenciais inválidas' });
  });

  it('locks after repeated failures and allows login after the lock expires', async () => {
    await registerUser();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'admin1', password: 'wrong-password' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'admin1', password: 'wrong-password' })
      .expect(401);
    const lockedResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'admin1', password: 'wrong-password' })
      .expect(423);

    expect(Number(lockedResponse.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(lockedResponse.headers['www-authenticate']).toBe('Bearer');
    expect(lockedResponse.body).toEqual({
      detail: 'Conta temporariamente bloqueada. Tente novamente mais tarde.',
    });

    await prisma.user.update({
      where: { username: 'admin1' },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() - 1_000),
      },
    });
    loginRateLimit.resetLoginAttempts();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'admin1', password: STRONG_PASSWORD })
      .expect(200);
  });

  it('rate limits login by sliding window before authentication', async () => {
    for (let index = 0; index < 3; index += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: `missing${index}`, password: 'wrong-password' })
        .expect(401);
    }

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: 'missing4', password: 'wrong-password' })
      .expect(429);

    expect(Number(response.headers['retry-after'])).toBeGreaterThanOrEqual(1);
    expect(response.body).toEqual({
      detail: 'Muitas tentativas. Tente novamente mais tarde.',
    });
  });

  it('rejects missing or invalid tokens on /auth/me', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .expect(401)
      .expect((response) => {
        expect(response.headers['www-authenticate']).toBe('Bearer');
      });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401)
      .expect((response) => {
        expect(response.headers['www-authenticate']).toBe('Bearer');
      });
  });
});
