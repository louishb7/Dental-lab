import { RecoveryRateLimitService } from './recovery-rate-limit.service';

describe('recovery request limits', () => {
  afterEach(() => jest.restoreAllMocks());

  it('allows five requests per IP across distinct emails', () => {
    const limits = new RecoveryRateLimitService();
    for (let i = 0; i < 5; i++) expect(limits.allow('ip', `${i}@example.com`)).toBe(true);
    expect(limits.allow('ip', 'six@example.com')).toBe(false);
  });
  it('allows three requests per normalized email across distinct IPs', () => {
    const limits = new RecoveryRateLimitService();
    for (let i = 0; i < 3; i++) expect(limits.allow(`ip${i}`, ' USER@example.com ')).toBe(true);
    expect(limits.allow('other', 'user@example.com')).toBe(false);
  });
  it('releases expired windows after fifteen minutes', () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const limits = new RecoveryRateLimitService();
    for (let i = 0; i < 3; i++) limits.allow('ip', 'user@example.com');
    expect(limits.allow('ip', 'user@example.com')).toBe(false);
    clock.mockReturnValue(1_000_000 + 15 * 60_000);
    expect(limits.allow('ip', 'user@example.com')).toBe(true);
  });
});
