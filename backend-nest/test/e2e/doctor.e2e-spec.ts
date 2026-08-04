import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../../src/app.configure';
import { AppModule } from '../../src/app.module';
import { LoginRateLimitService } from '../../src/auth/login-rate-limit.service';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';
import { PrismaService } from '../../src/prisma/prisma.service';

const STRONG_PASSWORD = 'StrongPass123!';

interface RegisteredUser {
  access_token: string;
  email: string;
  token_type: 'bearer';
  username: string;
}

describe('doctor e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let loginRateLimit: LoginRateLimitService;

  async function resetDatabase(): Promise<void> {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE case_history_events, case_items, cases, doctors, users RESTART IDENTITY CASCADE',
    );
    loginRateLimit.resetLoginAttempts();
  }

  async function registerUser(email: string, username: string): Promise<RegisteredUser> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: STRONG_PASSWORD,
        username,
      })
      .expect(201);

    return response.body as RegisteredUser;
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

  it('requires bearer auth for doctor routes', async () => {
    await request(app.getHttpServer()).get('/doctors/').expect(401);
    await request(app.getHttpServer())
      .post('/doctors/')
      .send({ name: 'Dr. Sem Token' })
      .expect(401);
  });

  it('creates, lists, gets, updates and soft deletes doctors', async () => {
    const user = await registerUser('admin@cadista.local', 'admin1');

    const created = await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        clinic_name: 'Clínica Central',
        name: 'Dr. João',
        notes: 'Contato principal',
        phone: '11999990000',
      })
      .expect(201);

    expect(created.body).toMatchObject({
      id: 1,
      name: 'Dr. João',
      clinic_name: 'Clínica Central',
      phone: '(11)99999-0000',
      notes: 'Contato principal',
      deleted_at: null,
      cases_count: 0,
    });
    expect(created.body.created_at).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .get('/doctors/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ id: 1, name: 'Dr. João' });
      });

    await request(app.getHttpServer())
      .get('/doctors/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({ id: 1, cases_count: 0 });
      });

    await request(app.getHttpServer())
      .put('/doctors/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        notes: 'Atualizado',
        phone: '(11)98888-0000',
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          id: 1,
          phone: '(11)98888-0000',
          notes: 'Atualizado',
        });
      });

    await request(app.getHttpServer())
      .delete('/doctors/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(204)
      .expect('');

    await request(app.getHttpServer())
      .get('/doctors/1')
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(404)
      .expect({ detail: 'Doutor não encontrado' });
  });

  it('normalizes blank phone and rejects invalid phone with legacy detail', async () => {
    const user = await registerUser('admin@cadista.local', 'admin1');

    await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        name: 'Dr. Sem Telefone',
        phone: '',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body.phone).toBeNull();
      });

    const invalid = await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({
        name: 'Dr. Inválido',
        phone: '123456789',
      })
      .expect(422);

    expect(invalid.body.detail[0].msg).toBe(
      'Value error, Telefone deve estar em branco ou seguir o padrão (xx)xxxx-xxxx / (xx)xxxxx-xxxx',
    );
  });

  it('isolates doctors between users and treats foreign resources as not found', async () => {
    const firstUser = await registerUser('first@cadista.local', 'first1');
    const secondUser = await registerUser('second@cadista.local', 'second1');

    const firstDoctor = await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .send({ name: 'Dr. Primeiro' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({ name: 'Dr. Segundo' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/doctors/')
      .set('Authorization', `Bearer ${firstUser.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.map((doctor: { name: string }) => doctor.name)).toEqual([
          'Dr. Primeiro',
        ]);
      });

    await request(app.getHttpServer())
      .get(`/doctors/${firstDoctor.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Doutor não encontrado' });

    await request(app.getHttpServer())
      .put(`/doctors/${firstDoctor.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .send({ name: 'Tentativa' })
      .expect(404)
      .expect({ detail: 'Doutor não encontrado' });

    await request(app.getHttpServer())
      .delete(`/doctors/${firstDoctor.body.id}`)
      .set('Authorization', `Bearer ${secondUser.access_token}`)
      .expect(404)
      .expect({ detail: 'Doutor não encontrado' });
  });

  it('returns cases_count for active cases and blocks delete with pending/completed cases', async () => {
    const user = await registerUser('admin@cadista.local', 'admin1');
    const created = await request(app.getHttpServer())
      .post('/doctors/')
      .set('Authorization', `Bearer ${user.access_token}`)
      .send({ name: 'Dr. Bloqueado' })
      .expect(201);

    await prisma.dentalCase.create({
      data: {
        doctorId: created.body.id as number,
        patientRef: 'Paciente ativo',
        status: 'pending',
      },
    });
    await prisma.dentalCase.create({
      data: {
        deletedAt: new Date(),
        doctorId: created.body.id as number,
        patientRef: 'Paciente removido',
        status: 'completed',
      },
    });

    await request(app.getHttpServer())
      .get(`/doctors/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.cases_count).toBe(1);
      });

    await request(app.getHttpServer())
      .delete(`/doctors/${created.body.id}`)
      .set('Authorization', `Bearer ${user.access_token}`)
      .expect(409)
      .expect({
        detail:
          'Não é possível excluir este doutor porque existem casos pendentes ou em andamento.',
      });
  });
});
