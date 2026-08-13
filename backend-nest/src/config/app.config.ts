export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
  SECRET_KEY: string;
  CORS_ORIGINS: string[];
<<<<<<< HEAD
  CORS_ORIGIN_REGEX: string | null;
  TRUSTED_HOSTS: string[];
  APP_TRUST_PROXY: string | number | boolean;
  APP_TIME_ZONE: string;
=======
>>>>>>> 3853a78 (refactor: streamline backend architecture and production deployment)
}

export const DEFAULT_LOCAL_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

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

function parseCorsOrigins(value: string | undefined, nodeEnvironment: NodeEnvironment): string[] {
  if (nodeEnvironment === 'production' && value === undefined) {
    throw new Error('CORS_ORIGINS must be explicitly defined in production.');
  }

  const rawOrigins =
    value === undefined ? DEFAULT_LOCAL_CORS_ORIGINS : value.split(',').map((item) => item.trim());
  const origins = rawOrigins.filter((item) => item.length > 0).map(validateCorsOrigin);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one value.');
  }

<<<<<<< HEAD
  return parsed;
}

function parseAccessTokenExpireMinutes(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    throw new Error('ACCESS_TOKEN_EXPIRE_MINUTES is required.');
  }
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      'ACCESS_TOKEN_EXPIRE_MINUTES must be a positive integer.',
    );
  }

  return parsed;
}

function parseTrustProxy(value: string | undefined): string | number | boolean {
  if (value === undefined) return 1;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  const num = Number(value);
  if (!Number.isNaN(num)) return num;
  return value;
}

function parseBcryptRounds(value: string | undefined, nodeEnvironment: NodeEnvironment): number {
  const minRounds = nodeEnvironment === 'test' ? 4 : 12;
  return parseIntegerInRange(value, 'BCRYPT_ROUNDS', 12, minRounds, 16);
}

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const DEFAULT_TRUSTED_HOSTS = ['localhost', '127.0.0.1', 'testserver'];
const DEV_CORS_ORIGIN_REGEX = String.raw`^http://(localhost|127\.0\.0\.1):[0-9]+$`;

function parseCsv(value: string | undefined, defaultValues: string[], key: string): string[] {
  const rawValues =
    value === undefined ? defaultValues : value.split(',').map((item) => item.trim());
  const values = rawValues.filter((item) => item.length > 0);
  if (values.length === 0) {
    throw new Error(`${key} must contain at least one value.`);
  }

  return values;
=======
  if (nodeEnvironment === 'production') {
    if (origins.some((origin) => origin.startsWith('http://'))) {
      throw new Error('Production CORS_ORIGINS must use https origins.');
    }
    if (origins.some(isLocalCorsOrigin)) {
      throw new Error('Production CORS_ORIGINS must not contain local origins.');
    }
  }

  return origins;
>>>>>>> 3853a78 (refactor: streamline backend architecture and production deployment)
}

function validateCorsOrigin(origin: string): string {
  if (origin === '*') {
    throw new Error('CORS_ORIGINS cannot contain wildcard origins.');
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch (error) {
    throw new Error(`Invalid CORS origin: ${origin}`, { cause: error });
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.host.length === 0 ||
    (parsed.pathname !== '' && parsed.pathname !== '/') ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }

  return parsed.origin;
}

function isLocalCorsOrigin(origin: string): boolean {
  const parsed = new URL(origin);
  return (
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '0.0.0.0'
  );
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const nodeEnvironment = parseNodeEnvironment(readString(config, 'NODE_ENV'));

  return {
    NODE_ENV: nodeEnvironment,
    PORT: parsePort(readString(config, 'PORT')),
    DATABASE_URL: parseDatabaseUrl(readString(config, 'DATABASE_URL')),
    SECRET_KEY: parseSecretKey(readString(config, 'SECRET_KEY')),
<<<<<<< HEAD
    ALGORITHM: parseAlgorithm(readString(config, 'ALGORITHM')),
    ACCESS_TOKEN_EXPIRE_MINUTES: parseAccessTokenExpireMinutes(
      readString(config, 'ACCESS_TOKEN_EXPIRE_MINUTES'),
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
    CORS_ORIGINS: corsOrigins,
    CORS_ORIGIN_REGEX: corsOriginRegex,
    TRUSTED_HOSTS: trustedHosts,
    APP_TRUST_PROXY: parseTrustProxy(readString(config, 'APP_TRUST_PROXY')),
    APP_TIME_ZONE: readString(config, 'APP_TIME_ZONE') || 'America/Recife',
=======
    CORS_ORIGINS: parseCorsOrigins(readString(config, 'CORS_ORIGINS'), nodeEnvironment),
>>>>>>> 3853a78 (refactor: streamline backend architecture and production deployment)
  };
}
