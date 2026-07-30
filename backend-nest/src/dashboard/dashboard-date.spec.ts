import { getUtcDayStart, getUtcMonthWindow } from './dashboard-date';

describe('dashboard date rules', () => {
  it('calculates the UTC day start without using the server local timezone', () => {
    const now = new Date('2026-07-30T23:30:00-03:00');

    expect(getUtcDayStart(now).toISOString()).toBe('2026-07-31T00:00:00.000Z');
  });

  it('calculates the UTC month window including December rollover', () => {
    const julyWindow = getUtcMonthWindow(new Date('2026-07-30T12:00:00.000Z'));
    expect(julyWindow.monthStart.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(julyWindow.nextMonth.toISOString()).toBe('2026-08-01T00:00:00.000Z');

    const decemberWindow = getUtcMonthWindow(new Date('2026-12-31T23:59:59.000Z'));
    expect(decemberWindow.monthStart.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(decemberWindow.nextMonth.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
