import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../config/app.config';

@Injectable()
export class LoginRateLimitService {
  private readonly attemptsByClientId = new Map<string, number[]>();
  private nowMs: () => number = Date.now;

  constructor(private readonly config: ConfigService<EnvironmentVariables>) {}

  setClockForTesting(nowMs: () => number): void {
    this.nowMs = nowMs;
  }

  registerLoginAttempt(clientId: string): number | null {
    const now = this.nowMs() / 1000;
    const windowSeconds = this.config.getOrThrow<number>('LOGIN_RATE_LIMIT_WINDOW_SECONDS');
    const maxAttempts = this.config.getOrThrow<number>('LOGIN_RATE_LIMIT_ATTEMPTS');
    const cutoff = now - windowSeconds;
    const attempts = this.attemptsByClientId.get(clientId) ?? [];
    const currentAttempts = attempts.filter((attempt) => attempt >= cutoff);

    if (currentAttempts.length >= maxAttempts) {
      const oldestAttempt = currentAttempts[0];
      if (oldestAttempt === undefined) {
        return 1;
      }

      return Math.max(1, Math.ceil(windowSeconds - (now - oldestAttempt)));
    }

    currentAttempts.push(now);
    this.attemptsByClientId.set(clientId, currentAttempts);
    return null;
  }

  resetLoginAttempts(clientId?: string): void {
    if (clientId === undefined) {
      this.attemptsByClientId.clear();
      return;
    }

    this.attemptsByClientId.delete(clientId);
  }
}
