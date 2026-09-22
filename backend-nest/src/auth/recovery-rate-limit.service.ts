import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class RecoveryRateLimitService {
  private readonly attempts = new Map<string, number[]>();

  allow(ip: string, email?: string): boolean {
    const now = Date.now();
    const cutoff = now - 15 * 60_000;
    for (const [key, values] of this.attempts) {
      const active = values.filter((time) => time > cutoff);
      if (active.length) this.attempts.set(key, active);
      else this.attempts.delete(key);
    }
    const limits: Array<[string, number]> = [[`ip:${ip}`, 5]];
    if (email !== undefined) {
      const hash = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
      limits.push([`email:${hash}`, 3]);
    }
    // Fail closed at capacity instead of evicting active limits under an attack.
    if (this.attempts.size + limits.filter(([key]) => !this.attempts.has(key)).length > 10_000)
      return false;
    let allowed = true;
    for (const [key, limit] of limits) {
      const values = this.attempts.get(key) ?? [];
      if (values.length >= limit) allowed = false;
      else values.push(now);
      this.attempts.set(key, values);
    }
    return allowed;
  }
}
