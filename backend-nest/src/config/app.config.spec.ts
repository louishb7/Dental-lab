import { validateEnvironment } from './app.config';
import { assertSafeTestDatabaseUrl } from './test-database';

const VALID_ENV = {
  NODE_ENV: 'test',
  PORT: '3001',
  DATABASE_URL: 'postgresql://cadista:cadista_dev_password@localhost:5433/cadista_nest_test',
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
      ACCESS_TOKEN_EXPIRE_MINUTES: 60,
      BCRYPT_ROUNDS: 12,
      LOGIN_MAX_ATTEMPTS: 5,
      LOGIN_LOCKOUT_MINUTES: 15,
      LOGIN_RATE_LIMIT_ATTEMPTS: 10,
      LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
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

  it('rejects a development database for destructive test commands', () => {
    process.env.NODE_ENV = 'test';

    expect(() =>
      assertSafeTestDatabaseUrl(
        'postgresql://cadista:cadista_dev_password@localhost:5433/cadista_nest',
      ),
    ).toThrow('Refusing to run destructive tests outside a database ending in _test.');
  });
});
