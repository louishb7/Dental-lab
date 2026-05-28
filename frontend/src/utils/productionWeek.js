import { getLocalDateKey } from "./formatters.js";

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
});

const DAY_MONTH_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

/**
 * Normalizes a value into a local date with time stripped.
 *
 * @param {Date|string|null|undefined} value Raw date value.
 * @returns {Date|null} Local date at 00:00 or null for invalid input.
 */
export function toDateOnly(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Returns the Monday of the week for a given date.
 *
 * @param {Date|string|null|undefined} value Base date.
 * @returns {Date} Monday for the week in local time.
 */
export function getStartOfWeek(value) {
  const date = toDateOnly(value) || new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(date, diff);
}

/**
 * Adds a number of days to a local date.
 *
 * @param {Date|string|null|undefined} value Base date.
 * @param {number} amount Number of days to add.
 * @returns {Date} Shifted date in local time.
 */
export function addDays(value, amount) {
  const date = toDateOnly(value) || new Date();
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount);
  return shifted;
}

/**
 * Compares two dates using only the local calendar day.
 *
 * @param {Date|string|null|undefined} first First date.
 * @param {Date|string|null|undefined} second Second date.
 * @returns {boolean} True when both values represent the same local day.
 */
export function isSameDate(first, second) {
  const firstDate = toDateOnly(first);
  const secondDate = toDateOnly(second);
  if (!firstDate || !secondDate) return false;

  return getLocalDateKey(firstDate) === getLocalDateKey(secondDate);
}

/**
 * Indicates whether a date is today in local time.
 *
 * @param {Date|string|null|undefined} value Date to compare.
 * @returns {boolean} True when value is today.
 */
export function isToday(value) {
  return isSameDate(value, new Date());
}

/**
 * Indicates whether a date is tomorrow in local time.
 *
 * @param {Date|string|null|undefined} value Date to compare.
 * @returns {boolean} True when value is tomorrow.
 */
export function isTomorrow(value) {
  return isSameDate(value, addDays(new Date(), 1));
}

/**
 * Formats the current week range in dd/mm.
 *
 * @param {Date|string|null|undefined} weekStart Monday of the week.
 * @returns {string} Human-friendly range label.
 */
export function formatWeekRange(weekStart) {
  const start = getStartOfWeek(weekStart);
  const end = addDays(start, 6);
  return `${DAY_MONTH_FORMATTER.format(start)} a ${DAY_MONTH_FORMATTER.format(end)}`;
}

/**
 * Creates the seven dates used by the weekly board.
 *
 * @param {Date|string|null|undefined} weekStart Monday of the week.
 * @returns {Date[]} Seven local dates from Monday to Sunday.
 */
export function getWeekDays(weekStart) {
  const start = getStartOfWeek(weekStart);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/**
 * Checks whether a case should be considered overdue.
 *
 * @param {{deadline?: string|null, status?: string|null}} caseItem Case payload.
 * @returns {boolean} True when deadline is before today and case is not delivered.
 */
export function isOverdue(caseItem) {
  if (!caseItem?.deadline || caseItem?.status === "delivered") return false;

  const deadline = toDateOnly(caseItem.deadline);
  const today = toDateOnly(new Date());
  if (!deadline || !today) return false;

  return deadline.getTime() < today.getTime();
}

/**
 * Groups cases by local deadline day.
 *
 * @param {Array<object>} cases Cases returned by the API.
 * @returns {Map<string, object[]>} Cases keyed by yyyy-mm-dd.
 */
export function groupCasesByDate(cases) {
  return cases.reduce((map, caseItem) => {
    const key = getLocalDateKey(caseItem?.deadline);
    if (!key) return map;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(caseItem);
    return map;
  }, new Map());
}

/**
 * Formats the day label used in the weekly cards.
 *
 * @param {Date|string|null|undefined} value Day to format.
 * @returns {string} Short weekday label like SEG or TER.
 */
export function formatWeekdayLabel(value) {
  const date = toDateOnly(value) || new Date();
  return WEEKDAY_FORMATTER
    .format(date)
    .replace(".", "")
    .slice(0, 3)
    .toUpperCase();
}

/**
 * Formats a local date in dd/mm.
 *
 * @param {Date|string|null|undefined} value Day to format.
 * @returns {string} Short local date.
 */
export function formatDayMonth(value) {
  const date = toDateOnly(value) || new Date();
  return DAY_MONTH_FORMATTER.format(date);
}
