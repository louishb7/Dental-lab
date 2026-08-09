import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../config/app.config';

@Injectable()
export class LoginRateLimitService implements OnModuleDestroy {
  private readonly attemptsByClientId = new Map<string, number[]>();
  private nowMs: () => number = Date.now;
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor(private readonly config: ConfigService<EnvironmentVariables>) {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupTimer);
  }

  cleanup(): void {
    const now = this.nowMs() / 1000;
    const windowSeconds = this.config.get<number>('LOGIN_RATE_LIMIT_WINDOW_SECONDS') ?? 900;
    const cutoff = now - windowSeconds;
    
    for (const [clientId, attempts] of this.attemptsByClientId.entries()) {
      const currentAttempts = attempts.filter((attempt) => attempt >= cutoff);
      if (currentAttempts.length === 0) {
        this.attemptsByClientId.delete(clientId);
      } else {
        this.attemptsByClientId.set(clientId, currentAttempts);
      }
    }
  }

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

    if (!this.attemptsByClientId.has(clientId) && this.attemptsByClientId.size >= 1000) {
      const firstKey = this.attemptsByClientId.keys().next().value;
      if (firstKey !== undefined) {
        this.attemptsByClientId.delete(firstKey);
      }
    }

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
