import { LOGIN_RATE_LIMIT_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_SECONDS } from './security.constants';
import { LoginRateLimitService } from './login-rate-limit.service';

describe('LoginRateLimitService', () => {
  it('blocks only after the sliding window limit is reached', () => {
    let now = 1_000_000;
    const service = new LoginRateLimitService();
    service.setClockForTesting(() => now);

    for (let index = 0; index < LOGIN_RATE_LIMIT_ATTEMPTS; index += 1) {
      expect(service.registerLoginAttempt('127.0.0.1')).toBeNull();
      now += 1_000;
    }

    expect(service.registerLoginAttempt('127.0.0.1')).toBe(
      LOGIN_RATE_LIMIT_WINDOW_SECONDS - LOGIN_RATE_LIMIT_ATTEMPTS,
    );
  });

  it('expires old attempts and tracks clients independently', () => {
    let now = 1_000_000;
    const service = new LoginRateLimitService();
    service.setClockForTesting(() => now);

    for (let index = 0; index < LOGIN_RATE_LIMIT_ATTEMPTS; index += 1) {
      expect(service.registerLoginAttempt('client-a')).toBeNull();
    }
    expect(service.registerLoginAttempt('client-b')).toBeNull();

    now += (LOGIN_RATE_LIMIT_WINDOW_SECONDS + 1) * 1_000;

    expect(service.registerLoginAttempt('client-a')).toBeNull();
    expect(service.registerLoginAttempt('client-b')).toBeNull();
  });

  it('can reset one client or all clients', () => {
    const service = new LoginRateLimitService();
    service.setClockForTesting(() => 1_000_000);

    for (let index = 0; index < LOGIN_RATE_LIMIT_ATTEMPTS; index += 1) {
      expect(service.registerLoginAttempt('client-a')).toBeNull();
    }
    expect(service.registerLoginAttempt('client-a')).toBe(LOGIN_RATE_LIMIT_WINDOW_SECONDS);

    service.resetLoginAttempts('client-a');
    expect(service.registerLoginAttempt('client-a')).toBeNull();

    for (let index = 0; index < LOGIN_RATE_LIMIT_ATTEMPTS; index += 1) {
      expect(service.registerLoginAttempt('client-b')).toBeNull();
    }
    service.resetLoginAttempts();
    expect(service.registerLoginAttempt('client-b')).toBeNull();
  });
});
