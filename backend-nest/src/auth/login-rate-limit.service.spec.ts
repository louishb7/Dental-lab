import type { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../config/app.config';
import { LoginRateLimitService } from './login-rate-limit.service';

function buildConfig(): ConfigService<EnvironmentVariables> {
  const values: Pick<
    EnvironmentVariables,
    'LOGIN_RATE_LIMIT_ATTEMPTS' | 'LOGIN_RATE_LIMIT_WINDOW_SECONDS'
  > = {
    LOGIN_RATE_LIMIT_ATTEMPTS: 3,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: 60,
  };

  return {
    getOrThrow: <T>(key: keyof typeof values): T => values[key] as T,
  } as ConfigService<EnvironmentVariables>;
}

describe('LoginRateLimitService', () => {
  it('blocks only after the sliding window limit is reached', () => {
    let now = 1_000_000;
    const service = new LoginRateLimitService(buildConfig());
    service.setClockForTesting(() => now);

    expect(service.registerLoginAttempt('127.0.0.1')).toBeNull();
    now += 1_000;
    expect(service.registerLoginAttempt('127.0.0.1')).toBeNull();
    now += 1_000;
    expect(service.registerLoginAttempt('127.0.0.1')).toBeNull();

    now += 1_000;
    expect(service.registerLoginAttempt('127.0.0.1')).toBe(57);
  });

  it('expires old attempts and tracks clients independently', () => {
    let now = 1_000_000;
    const service = new LoginRateLimitService(buildConfig());
    service.setClockForTesting(() => now);

    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-b')).toBeNull();

    now += 61_000;

    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-b')).toBeNull();
  });

  it('can reset one client or all clients', () => {
    const service = new LoginRateLimitService(buildConfig());
    service.setClockForTesting(() => 1_000_000);

    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-a')).toBe(60);

    service.resetLoginAttempts('client-a');
    expect(service.registerLoginAttempt('client-a')).toBeNull();

    expect(service.registerLoginAttempt('client-b')).toBeNull();
    expect(service.registerLoginAttempt('client-b')).toBeNull();
    expect(service.registerLoginAttempt('client-b')).toBeNull();
    service.resetLoginAttempts();
    expect(service.registerLoginAttempt('client-b')).toBeNull();
  });
});
