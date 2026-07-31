export function assertSafeTestDatabaseUrl(databaseUrl: string | undefined): string {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Integration and e2e tests must run with NODE_ENV=test.');
  }

  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be defined for integration and e2e tests.');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch (error) {
    throw new Error('Test DATABASE_URL must be a valid PostgreSQL URL.', {
      cause: error,
    });
  }

  const databaseName = parsed.pathname.replace(/^\/+/, '');
  const schemaName = parsed.searchParams.get('schema') || '';
  if (!databaseName.endsWith('_test') && !schemaName.endsWith('_test')) {
    throw new Error(
      'Refusing to run destructive tests outside a database or schema ending in _test.',
    );
  }

  return databaseUrl;
}
