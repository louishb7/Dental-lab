export type NodeEnvironment = 'development' | 'test' | 'production';

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  DATABASE_URL: string;
}

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

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  return {
    NODE_ENV: parseNodeEnvironment(readString(config, 'NODE_ENV')),
    PORT: parsePort(readString(config, 'PORT')),
    DATABASE_URL: parseDatabaseUrl(readString(config, 'DATABASE_URL')),
  };
}
