import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { configureApp } from '../../src/app.configure';
import { AppModule } from '../../src/app.module';
import { assertSafeTestDatabaseUrl } from '../../src/config/test-database';

describe('security e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    assertSafeTestDatabaseUrl(process.env.DATABASE_URL);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('adds security headers and reflects approved local CORS origins', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200)
      .expect((response) => {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['referrer-policy']).toBe('no-referrer');
        expect(response.headers['cache-control']).toBe('no-store');
        expect(response.headers['pragma']).toBe('no-cache');
        expect(response.headers['expires']).toBe('0');
        expect(response.headers['permissions-policy']).toBe(
          'camera=(), microphone=(), geolocation=()',
        );
        expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
        expect(response.headers['cross-origin-resource-policy']).toBe('same-site');
        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      });
  });

  it('allows the development Vite fallback port for CORS preflight', async () => {
    await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', 'http://localhost:5174')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(200)
      .expect((response) => {
        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174');
        expect(response.headers['access-control-allow-methods']).toBe(
          'GET,POST,PUT,DELETE,OPTIONS',
        );
        expect(response.headers['access-control-allow-headers']).toBe(
          'Authorization,Content-Type,Accept,Origin',
        );
      });
  });

  it('does not reflect unapproved origins', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://evil.example')
      .expect(200)
      .expect((response) => {
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      });
  });

  it('rejects untrusted hosts', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .set('Host', 'evil.example')
      .expect(400)
      .expect((response) => {
        expect(response.text).toBe('Invalid host header');
      });
  });

  it('does not expose generated API docs routes', async () => {
    await request(app.getHttpServer()).get('/docs').expect(404);
    await request(app.getHttpServer()).get('/openapi.json').expect(404);
  });
});
