export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
  SECRET_KEY: string;
  ALGORITHM: JwtAlgorithm;
  ACCESS_TOKEN_EXPIRE_MINUTES: number;
  BCRYPT_ROUNDS: number;
  LOGIN_MAX_ATTEMPTS: number;
  LOGIN_LOCKOUT_MINUTES: number;
  LOGIN_RATE_LIMIT_ATTEMPTS: number;
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: number;
}

export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512';

function readString(config: Record<string, unknown>, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function parseNodeEnvironment(value: string | undefined): NodeEnvironment {
  const normalized = value || 'development';
  if (normalized === 'development' || normalized === 'test' || normalized === 'production') {
    return normalized;
  }

  throw new Error('NODE_ENV must be one of: development, test, production.');
}

function parsePort(value: string | undefined): number {
  const rawPort = value || '3001';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
}

function parseDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error('DATABASE_URL must be defined in the environment or .env file.');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (error) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.', {
      cause: error,
    });
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('DATABASE_URL must use the postgresql:// or postgres:// protocol.');
  }

  if (!parsed.hostname || parsed.pathname === '/' || !parsed.pathname) {
    throw new Error('DATABASE_URL must include host and database name.');
  }

  return value;
}

function parseSecretKey(value: string | undefined): string {
  if (!value) {
    throw new Error('SECRET_KEY must be defined in the environment or .env file.');
  }

  if (value.length < 32) {
    throw new Error('SECRET_KEY must be at least 32 characters long.');
  }

  return value;
}

function parseAlgorithm(value: string | undefined): JwtAlgorithm {
  const algorithm = value || 'HS256';
  if (algorithm === 'HS256' || algorithm === 'HS384' || algorithm === 'HS512') {
    return algorithm;
  }

  throw new Error('ALGORITHM must be one of: HS256, HS384, HS512.');
}

function parseIntegerInRange(
  value: string | undefined,
  key: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value || String(defaultValue));

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}.`);
  }

  return parsed;
}

function parseBcryptRounds(value: string | undefined, nodeEnvironment: NodeEnvironment): number {
  const minRounds = nodeEnvironment === 'test' ? 4 : 12;
  return parseIntegerInRange(value, 'BCRYPT_ROUNDS', 12, minRounds, 16);
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const nodeEnvironment = parseNodeEnvironment(readString(config, 'NODE_ENV'));

  return {
    NODE_ENV: nodeEnvironment,
    PORT: parsePort(readString(config, 'PORT')),
    DATABASE_URL: parseDatabaseUrl(readString(config, 'DATABASE_URL')),
    SECRET_KEY: parseSecretKey(readString(config, 'SECRET_KEY')),
    ALGORITHM: parseAlgorithm(readString(config, 'ALGORITHM')),
    ACCESS_TOKEN_EXPIRE_MINUTES: parseIntegerInRange(
      readString(config, 'ACCESS_TOKEN_EXPIRE_MINUTES'),
      'ACCESS_TOKEN_EXPIRE_MINUTES',
      60,
      5,
      1440,
    ),
    BCRYPT_ROUNDS: parseBcryptRounds(readString(config, 'BCRYPT_ROUNDS'), nodeEnvironment),
    LOGIN_MAX_ATTEMPTS: parseIntegerInRange(
      readString(config, 'LOGIN_MAX_ATTEMPTS'),
      'LOGIN_MAX_ATTEMPTS',
      5,
      3,
      1_000,
    ),
    LOGIN_LOCKOUT_MINUTES: parseIntegerInRange(
      readString(config, 'LOGIN_LOCKOUT_MINUTES'),
      'LOGIN_LOCKOUT_MINUTES',
      15,
      1,
      1440,
    ),
    LOGIN_RATE_LIMIT_ATTEMPTS: parseIntegerInRange(
      readString(config, 'LOGIN_RATE_LIMIT_ATTEMPTS'),
      'LOGIN_RATE_LIMIT_ATTEMPTS',
      10,
      1,
      1_000,
    ),
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: parseIntegerInRange(
      readString(config, 'LOGIN_RATE_LIMIT_WINDOW_SECONDS'),
      'LOGIN_RATE_LIMIT_WINDOW_SECONDS',
      60,
      10,
      86_400,
    ),
  };
}
