import { getAppDayStart, getAppMonthWindow } from './dashboard-date';

describe('dashboard date rules', () => {
  it('calculates the app day start without using the server local timezone', () => {
    const now = new Date('2026-07-30T23:30:00-03:00'); // 2026-07-31T02:30:00.000Z

    // For America/Recife (UTC-3), it's July 30th 23:30.
    // Start of day in America/Recife is July 30th 00:00, which is July 30th 03:00:00 UTC.
    expect(getAppDayStart(now, 'America/Recife').toISOString()).toBe('2026-07-30T03:00:00.000Z');
  });

  it('calculates the app month window including December rollover', () => {
    const julyWindow = getAppMonthWindow(new Date('2026-07-30T12:00:00.000Z'), 'America/Recife');
    expect(julyWindow.monthStart.toISOString()).toBe('2026-07-01T03:00:00.000Z');
    expect(julyWindow.nextMonth.toISOString()).toBe('2026-08-01T03:00:00.000Z');

    const decemberWindow = getAppMonthWindow(
      new Date('2026-12-31T23:59:59.000Z'),
      'America/Recife',
    );
    expect(decemberWindow.monthStart.toISOString()).toBe('2026-12-01T03:00:00.000Z');
    expect(decemberWindow.nextMonth.toISOString()).toBe('2027-01-01T03:00:00.000Z');
  });
});
