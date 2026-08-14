import { DEFAULT_LOCAL_CORS_ORIGINS, validateEnvironment } from './app.config';
import { assertSafeTestDatabaseUrl } from './test-database';

const VALID_ENV = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL:
    'postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest_test?schema=public',
  SECRET_KEY: 'test-secret-key-for-cadisk-nest-auth',
};

describe('validateEnvironment', () => {
  it('normalizes the minimal required environment variables', () => {
    expect(validateEnvironment(VALID_ENV)).toEqual({
      NODE_ENV: 'test',
      PORT: 3001,
      DATABASE_URL: VALID_ENV.DATABASE_URL,
      SECRET_KEY: VALID_ENV.SECRET_KEY,
      CORS_ORIGINS: DEFAULT_LOCAL_CORS_ORIGINS,
    });
  });

  it('accepts a minimal production environment', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        DATABASE_URL: VALID_ENV.DATABASE_URL,
        SECRET_KEY: VALID_ENV.SECRET_KEY,
        CORS_ORIGINS: 'https://example.vercel.app',
      }),
    ).toEqual({
      NODE_ENV: 'production',
      PORT: 3001,
      DATABASE_URL: VALID_ENV.DATABASE_URL,
      SECRET_KEY: VALID_ENV.SECRET_KEY,
      CORS_ORIGINS: ['https://example.vercel.app'],
    });
  });

  it('normalizes CORS origins to protocol, host and port only', () => {
    expect(
      validateEnvironment({
        ...VALID_ENV,
        CORS_ORIGINS: 'https://cadisk.vercel.app/,http://localhost:5173/',
      }).CORS_ORIGINS,
    ).toEqual(['https://cadisk.vercel.app', 'http://localhost:5173']);
  });

  it('fails early when DATABASE_URL is missing', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, DATABASE_URL: '' })).toThrow(
      'DATABASE_URL must be defined',
    );
  });

  it('fails early when DATABASE_URL is not PostgreSQL', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENV, DATABASE_URL: 'mysql://localhost/cadisk' }),
    ).toThrow('DATABASE_URL must use the postgresql:// or postgres:// protocol.');
  });

  it('fails early when PORT is invalid', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, PORT: 'abc' })).toThrow(
      'PORT must be an integer between 1 and 65535.',
    );
  });

  it('fails early when SECRET_KEY is missing', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, SECRET_KEY: '' })).toThrow(
      'SECRET_KEY must be defined',
    );
  });

  it('fails early when SECRET_KEY is too short', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, SECRET_KEY: 'short' })).toThrow(
      'SECRET_KEY must be at least 32 characters long.',
    );
  });

  it('rejects wildcard CORS origins', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, CORS_ORIGINS: '*' })).toThrow(
      'CORS_ORIGINS cannot contain wildcard origins.',
    );
  });

  it('rejects CORS origins with paths, query strings or fragments', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENV, CORS_ORIGINS: 'https://example.com/api' }),
    ).toThrow('Invalid CORS origin: https://example.com/api');
    expect(() =>
      validateEnvironment({ ...VALID_ENV, CORS_ORIGINS: 'https://example.com?from=vercel' }),
    ).toThrow('Invalid CORS origin: https://example.com?from=vercel');
    expect(() =>
      validateEnvironment({ ...VALID_ENV, CORS_ORIGINS: 'https://example.com#app' }),
    ).toThrow('Invalid CORS origin: https://example.com#app');
  });

  it('requires explicit secure production CORS origins', () => {
    const productionEnv = {
      ...VALID_ENV,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://app.example.com',
    };

    expect(validateEnvironment(productionEnv).CORS_ORIGINS).toEqual(['https://app.example.com']);
    expect(() =>
      validateEnvironment({
        NODE_ENV: productionEnv.NODE_ENV,
        PORT: productionEnv.PORT,
        DATABASE_URL: productionEnv.DATABASE_URL,
        SECRET_KEY: productionEnv.SECRET_KEY,
      }),
    ).toThrow('CORS_ORIGINS must be explicitly defined in production.');
    expect(() =>
      validateEnvironment({ ...productionEnv, CORS_ORIGINS: 'http://localhost:5173' }),
    ).toThrow('Production CORS_ORIGINS must use https origins.');
    expect(() =>
      validateEnvironment({ ...productionEnv, CORS_ORIGINS: 'https://localhost:5173' }),
    ).toThrow('Production CORS_ORIGINS must not contain local origins.');
  });
});

describe('assertSafeTestDatabaseUrl', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('accepts a PostgreSQL database ending in _test when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';

    expect(assertSafeTestDatabaseUrl(VALID_ENV.DATABASE_URL)).toBe(VALID_ENV.DATABASE_URL);
  });

  it('accepts a PostgreSQL schema ending in _test when NODE_ENV is test', () => {
    process.env.NODE_ENV = 'test';

    const schemaScopedUrl =
      'postgresql://cadisk:cadisk_dev_password@localhost:5432/cadisk_db?schema=cadisk_nest_test';

    expect(assertSafeTestDatabaseUrl(schemaScopedUrl)).toBe(schemaScopedUrl);
  });

  it('rejects a development database for destructive test commands', () => {
    process.env.NODE_ENV = 'test';

    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://cadisk_dev:cadisk_dev_password@localhost:5433/cadisk_nest?schema=public',
      ),
    ).toThrow('Refusing to run destructive tests outside a database or schema ending in _test.');
  });
});
