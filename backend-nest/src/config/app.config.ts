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
  CORS_ORIGINS: string[];
  CORS_ORIGIN_REGEX: string | null;
  TRUSTED_HOSTS: string[];
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

function parseAccessTokenExpireMinutes(value: string | undefined): number {
  const parsed = Number(value || '0');

  if (!Number.isInteger(parsed) || (parsed !== 0 && (parsed < 5 || parsed > 1440))) {
    throw new Error(
      'ACCESS_TOKEN_EXPIRE_MINUTES must be 0 for persistent sessions or an integer between 5 and 1440.',
    );
  }

  return parsed;
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
    (parsed.pathname !== '' && parsed.pathname !== '/')
  ) {
    throw new Error(`Invalid CORS origin: ${origin}`);
  }

  return origin;
}

function validateTrustedHost(host: string): string {
  if (host === '*' || host.includes('*')) {
    throw new Error('TRUSTED_HOSTS cannot contain wildcards.');
  }

  if (host.includes('://') || host.includes('/') || host.includes('?') || host.includes('#')) {
    throw new Error(`Invalid trusted host: ${host}`);
  }

  return host;
}

function isLocalCorsOrigin(origin: string): boolean {
  const parsed = new URL(origin);
  return (
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '0.0.0.0'
  );
}

function isLocalTrustedHost(host: string): boolean {
  const hostname = host.split(':', 1)[0];
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === 'testserver'
  );
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const nodeEnvironment = parseNodeEnvironment(readString(config, 'NODE_ENV'));
  const corsOriginsRaw = readString(config, 'CORS_ORIGINS');
  const trustedHostsRaw = readString(config, 'TRUSTED_HOSTS');
  const corsOrigins = parseCsv(corsOriginsRaw, DEFAULT_CORS_ORIGINS, 'CORS_ORIGINS').map(
    validateCorsOrigin,
  );
  const trustedHosts = parseCsv(trustedHostsRaw, DEFAULT_TRUSTED_HOSTS, 'TRUSTED_HOSTS').map(
    validateTrustedHost,
  );
  const corsOriginRegex =
    readString(config, 'CORS_ORIGIN_REGEX') ??
    (nodeEnvironment === 'production' ? null : DEV_CORS_ORIGIN_REGEX);

  if (nodeEnvironment === 'production') {
    if (corsOriginsRaw === undefined) {
      throw new Error('CORS_ORIGINS must be explicitly defined in production.');
    }
    if (trustedHostsRaw === undefined) {
      throw new Error('TRUSTED_HOSTS must be explicitly defined in production.');
    }
    if (corsOriginRegex) {
      throw new Error('CORS_ORIGIN_REGEX must not be used in production.');
    }
    if (corsOrigins.some((origin) => origin.startsWith('http://'))) {
      throw new Error('Production CORS_ORIGINS must use https origins.');
    }
    if (corsOrigins.some(isLocalCorsOrigin)) {
      throw new Error('Production CORS_ORIGINS must not contain local origins.');
    }
    if (trustedHosts.some(isLocalTrustedHost)) {
      throw new Error('Production TRUSTED_HOSTS must not contain local/test hosts.');
    }
  }

  return {
    NODE_ENV: nodeEnvironment,
    PORT: parsePort(readString(config, 'PORT')),
    DATABASE_URL: parseDatabaseUrl(readString(config, 'DATABASE_URL')),
    SECRET_KEY: parseSecretKey(readString(config, 'SECRET_KEY')),
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
  };
}
