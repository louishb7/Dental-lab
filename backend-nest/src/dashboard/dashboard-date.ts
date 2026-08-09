import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfMonth, addMonths, startOfDay } from 'date-fns';

export interface MonthWindow {
  monthStart: Date;
  nextMonth: Date;
}

export function getAppDayStart(now: Date, timeZone: string): Date {
  const zonedNow = toZonedTime(now, timeZone);
  const startDay = startOfDay(zonedNow);
  return fromZonedTime(startDay, timeZone);
}

export function getAppMonthWindow(now: Date, timeZone: string): MonthWindow {
  const zonedNow = toZonedTime(now, timeZone);
  const monthStartZoned = startOfMonth(zonedNow);
  const nextMonthZoned = startOfMonth(addMonths(zonedNow, 1));

  return {
    monthStart: fromZonedTime(monthStartZoned, timeZone),
    nextMonth: fromZonedTime(nextMonthZoned, timeZone),
  };
}
