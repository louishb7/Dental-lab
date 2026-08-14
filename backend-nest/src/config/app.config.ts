export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
  SECRET_KEY: string;
  CORS_ORIGINS: string[];
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

  if (nodeEnvironment === 'production') {
    if (origins.some((origin) => origin.startsWith('http://'))) {
      throw new Error('Production CORS_ORIGINS must use https origins.');
    }
    if (origins.some(isLocalCorsOrigin)) {
      throw new Error('Production CORS_ORIGINS must not contain local origins.');
    }
  }

  return origins;
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
    CORS_ORIGINS: parseCorsOrigins(readString(config, 'CORS_ORIGINS'), nodeEnvironment),
  };
}
