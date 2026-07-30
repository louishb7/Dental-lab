import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';

describe('health e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns application health', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      service: 'cadista-nest',
    });
  });

  it('returns database health', async () => {
    await request(app.getHttpServer()).get('/health/database').expect(200).expect({
      status: 'ok',
      database: 'ok',
    });
  });
});
