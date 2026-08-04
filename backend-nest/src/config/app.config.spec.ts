import { validateEnvironment } from './app.config';
import { assertSafeTestDatabaseUrl } from './test-database';

const VALID_ENV = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL:
    'postgresql://cadista_user:cadista777@localhost:5432/cadista_db?schema=cadista_nest_test',
  SECRET_KEY: 'test-secret-key-for-cadista-nest-auth',
};

describe('validateEnvironment', () => {
  it('normalizes valid required environment variables', () => {
    expect(validateEnvironment(VALID_ENV)).toEqual({
      NODE_ENV: 'test',
      PORT: 3001,
      DATABASE_URL: VALID_ENV.DATABASE_URL,
      SECRET_KEY: VALID_ENV.SECRET_KEY,
      ALGORITHM: 'HS256',
      ACCESS_TOKEN_EXPIRE_MINUTES: 0,
      BCRYPT_ROUNDS: 12,
      LOGIN_MAX_ATTEMPTS: 5,
      LOGIN_LOCKOUT_MINUTES: 15,
      LOGIN_RATE_LIMIT_ATTEMPTS: 10,
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
      CORS_ORIGINS: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
      CORS_ORIGIN_REGEX: String.raw`^http://(localhost|127\.0\.0\.1):[0-9]+$`,
      TRUSTED_HOSTS: ['localhost', '127.0.0.1', 'testserver'],
    });
  });

  it('fails early when DATABASE_URL is missing', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, DATABASE_URL: '' })).toThrow(
      'DATABASE_URL must be defined',
    );
  });

  it('fails early when DATABASE_URL is not PostgreSQL', () => {
    expect(() =>
      validateEnvironment({ ...VALID_ENV, DATABASE_URL: 'mysql://localhost/cadista' }),
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

  it('allows lower bcrypt rounds only in test', () => {
    expect(validateEnvironment({ ...VALID_ENV, BCRYPT_ROUNDS: '4' }).BCRYPT_ROUNDS).toBe(4);

    expect(() =>
      validateEnvironment({ ...VALID_ENV, NODE_ENV: 'development', BCRYPT_ROUNDS: '4' }),
    ).toThrow('BCRYPT_ROUNDS must be an integer between 12 and 16.');
  });

  it('accepts explicit positive access token expiration within the supported range', () => {
    expect(validateEnvironment({ ...VALID_ENV, ACCESS_TOKEN_EXPIRE_MINUTES: '1440' }))
      .toMatchObject({
        ACCESS_TOKEN_EXPIRE_MINUTES: 1440,
      });
  });

  it('rejects unsupported access token expiration values', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, ACCESS_TOKEN_EXPIRE_MINUTES: '1' }))
      .toThrow('ACCESS_TOKEN_EXPIRE_MINUTES must be 0 for persistent sessions');
    expect(() => validateEnvironment({ ...VALID_ENV, ACCESS_TOKEN_EXPIRE_MINUTES: '1441' }))
      .toThrow('ACCESS_TOKEN_EXPIRE_MINUTES must be 0 for persistent sessions');
  });

  it('enables dynamic local CORS ports outside production', () => {
    expect(validateEnvironment(VALID_ENV).CORS_ORIGIN_REGEX).toBe(
      String.raw`^http://(localhost|127\.0\.0\.1):[0-9]+$`,
    );
    expect(
      validateEnvironment({
        ...VALID_ENV,
        NODE_ENV: 'development',
        BCRYPT_ROUNDS: '12',
      }).CORS_ORIGIN_REGEX,
    ).toBe(String.raw`^http://(localhost|127\.0\.0\.1):[0-9]+$`);
  });

  it('rejects wildcard CORS origins and trusted hosts', () => {
    expect(() => validateEnvironment({ ...VALID_ENV, CORS_ORIGINS: '*' })).toThrow(
      'CORS_ORIGINS cannot contain wildcard origins.',
    );
    expect(() => validateEnvironment({ ...VALID_ENV, TRUSTED_HOSTS: '*.example.com' })).toThrow(
      'TRUSTED_HOSTS cannot contain wildcards.',
    );
  });

  it('requires explicit secure production CORS origins and trusted hosts', () => {
    const productionEnv = {
      ...VALID_ENV,
      NODE_ENV: 'production',
      BCRYPT_ROUNDS: '12',
      CORS_ORIGINS: 'https://app.example.com',
      TRUSTED_HOSTS: 'api.example.com',
    };

    expect(validateEnvironment(productionEnv)).toMatchObject({
      NODE_ENV: 'production',
      CORS_ORIGINS: ['https://app.example.com'],
      CORS_ORIGIN_REGEX: null,
      TRUSTED_HOSTS: ['api.example.com'],
    });
    expect(() =>
      validateEnvironment({
        NODE_ENV: productionEnv.NODE_ENV,
        PORT: productionEnv.PORT,
        DATABASE_URL: productionEnv.DATABASE_URL,
        SECRET_KEY: productionEnv.SECRET_KEY,
        BCRYPT_ROUNDS: productionEnv.BCRYPT_ROUNDS,
        TRUSTED_HOSTS: productionEnv.TRUSTED_HOSTS,
      }),
    ).toThrow('CORS_ORIGINS must be explicitly defined in production.');
    expect(() =>
      validateEnvironment({
        NODE_ENV: productionEnv.NODE_ENV,
        PORT: productionEnv.PORT,
        DATABASE_URL: productionEnv.DATABASE_URL,
        SECRET_KEY: productionEnv.SECRET_KEY,
        BCRYPT_ROUNDS: productionEnv.BCRYPT_ROUNDS,
        CORS_ORIGINS: productionEnv.CORS_ORIGINS,
      }),
    ).toThrow('TRUSTED_HOSTS must be explicitly defined in production.');
    expect(() =>
      validateEnvironment({ ...productionEnv, CORS_ORIGINS: 'http://localhost:5173' }),
    ).toThrow('Production CORS_ORIGINS must use https origins.');
    expect(() => validateEnvironment({ ...productionEnv, TRUSTED_HOSTS: 'localhost' })).toThrow(
      'Production TRUSTED_HOSTS must not contain local/test hosts.',
    );
    expect(() =>
      validateEnvironment({ ...productionEnv, CORS_ORIGIN_REGEX: String.raw`^https://.*$` }),
    ).toThrow('CORS_ORIGIN_REGEX must not be used in production.');
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
      'postgresql://cadista:cadista_dev_password@localhost:5432/cadista_db?schema=cadista_nest_test';

    expect(assertSafeTestDatabaseUrl(schemaScopedUrl)).toBe(schemaScopedUrl);
  });

  it('rejects a development database for destructive test commands', () => {
    process.env.NODE_ENV = 'test';

    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://cadista_user:cadista777@localhost:5432/cadista_db?schema=cadista_nest',
      ),
    ).toThrow('Refusing to run destructive tests outside a database or schema ending in _test.');
  });
});
