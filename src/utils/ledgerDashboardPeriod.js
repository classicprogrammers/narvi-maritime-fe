// Financial-year (FY) and period helpers for the Master Ledger dashboards.
// The FY starts on 01 March. All dates are built from local parts, never with toISOString (it shifts the day).

export const FY_START_MONTH = 3;
export const MAX_MONTH_RANGE = 36;
export const FIRST_DASHBOARD_FY = 2024;
export const RANGE_TOO_LONG_MESSAGE = "Choose Quarter or Total for ranges over 36 months";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const pad = (n, size = 2) => String(n).padStart(size, "0");

// Date | "YYYY-MM-DD" | { year, month (1-12), day } -> { year, month, day } or null
const toParts = (value) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return null;
    const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    const check = new Date(parts.year, parts.month - 1, parts.day);
    const valid =
      check.getFullYear() === parts.year && check.getMonth() + 1 === parts.month && check.getDate() === parts.day;
    return valid ? parts : null;
  }
  if (value && typeof value === "object") {
    const year = Number(value.year);
    const month = Number(value.month);
    const day = Number(value.day);
    if ([year, month, day].some((n) => !Number.isInteger(n))) return null;
    return { year, month, day };
  }
  return null;
};

const monthKeyOf = (year, month) => `${pad(year, 4)}-${pad(month)}`;

// Date | { year, month, day } -> "YYYY-MM-DD" from local parts ("" when invalid)
export const toIsoDate = (dateParts) => {
  const p = toParts(dateParts);
  return p ? `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}` : "";
};

const formatDmy = (iso) => {
  const p = toParts(iso);
  return p ? `${pad(p.day)}/${pad(p.month)}/${pad(p.year, 4)}` : "";
};

// FY start year of a date: 2025-02-28 -> 2024, 2025-03-01 -> 2025
export const fyStartYearOf = (date) => {
  const p = toParts(date);
  if (!p) return null;
  return p.month >= FY_START_MONTH ? p.year : p.year - 1;
};

// 2024 -> "2024/25"
export const fyLabel = (startYear) => `${startYear}/${pad((Number(startYear) + 1) % 100)}`;

// 2024 -> { date_from: "2024-03-01", date_to: "2025-02-28" } (29 in leap years)
export const fyRange = (startYear) => {
  const endYear = Number(startYear) + 1;
  const lastDay = new Date(endYear, FY_START_MONTH - 1, 0).getDate();
  return {
    date_from: toIsoDate({ year: startYear, month: FY_START_MONTH, day: 1 }),
    date_to: toIsoDate({ year: endYear, month: FY_START_MONTH - 1, day: lastDay }),
  };
};

// FY start years from firstStartYear up to the current FY (2024, today 2026-11-25 -> [2024, 2025, 2026])
// lastStartYear (optional, e.g. backend available_fy.last) replaces the current FY as the upper end.
export const fyOptions = (firstStartYear, today = new Date(), lastStartYear = null) => {
  const current = fyStartYearOf(today);
  const options = [];
  if (current == null) return options;
  const last = Number.isInteger(Number(lastStartYear)) && lastStartYear !== null ? Number(lastStartYear) : current;
  for (let year = Number(firstStartYear); year <= last; year += 1) options.push(year);
  return options;
};

// Range the FY choices (period select, region checkboxes) and resolvePeriod share.
// available: backend { first, last } or null -> { firstFy, lastFy }. Without it: FIRST_DASHBOARD_FY..current FY.
// The current FY is never cut off by a backend range that ends earlier.
export const fyBounds = (available, today = new Date()) => {
  const current = fyStartYearOf(today);
  const first = available?.first == null ? NaN : Number(available.first);
  const last = available?.last == null ? NaN : Number(available.last);
  return {
    firstFy: Number.isInteger(first) ? first : FIRST_DASHBOARD_FY,
    lastFy: Number.isInteger(last) && last > current ? last : current,
  };
};

// 2026 -> ["2026-03", ..., "2027-02"]
export const fyMonthKeys = (startYear) =>
  Array.from({ length: 12 }, (_, i) => {
    const month = ((FY_START_MONTH - 1 + i) % 12) + 1;
    const year = Number(startYear) + (month < FY_START_MONTH ? 1 : 0);
    return monthKeyOf(year, month);
  });

// Inclusive month keys between two ISO dates ("2026-03-15", "2026-05-02" -> 2026-03, 2026-04, 2026-05)
export const monthKeysBetween = (from, to) => {
  const a = toParts(from);
  const b = toParts(to);
  if (!a || !b) return [];
  const keys = [];
  let year = a.year;
  let month = a.month;
  while (year < b.year || (year === b.year && month <= b.month)) {
    keys.push(monthKeyOf(year, month));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
};

// "2026-03" -> "2026-Q1" (FY quarters: Mar-May, Jun-Aug, Sep-Nov, Dec-Feb)
const quarterKeyOfMonth = (monthKey) => {
  const [y, m] = monthKey.split("-").map(Number);
  const fyStart = m >= FY_START_MONTH ? y : y - 1;
  const monthsIntoFy = (m - FY_START_MONTH + 12) % 12;
  return `${fyStart}-Q${Math.floor(monthsIntoFy / 3) + 1}`;
};

// Bucket keys the backend is expected to return: YYYY-MM, YYYY-Qn (YYYY = FY start year) or "total"
export const bucketKeys = (from, to, interval = "month") => {
  if (interval === "total") return ["total"];
  const months = monthKeysBetween(from, to);
  if (interval === "quarter") return [...new Set(months.map(quarterKeyOfMonth))];
  return months;
};

// "2026-03" -> "Mar 2026", "2026-Q1" -> "Q1 2026/27", "total" -> "Total"
export const bucketLabel = (key, interval = "month") => {
  const text = String(key ?? "");
  if (interval === "total" || text === "total") return "Total";
  const quarter = /^(\d{4})-Q([1-4])$/.exec(text);
  if (quarter) return `Q${quarter[2]} ${fyLabel(Number(quarter[1]))}`;
  const month = /^(\d{4})-(\d{2})$/.exec(text);
  if (month && MONTH_NAMES[Number(month[2]) - 1]) return `${MONTH_NAMES[Number(month[2]) - 1]} ${month[1]}`;
  return text;
};

// True when the month key is after the month of today
export const isFutureMonth = (key, today = new Date()) => {
  const p = toParts(today);
  if (!p) return false;
  return String(key) > monthKeyOf(p.year, p.month);
};

// state: { period: { preset: "current"|"previous"|"fy"|"custom", fyStartYear, from, to } } -> { date_from, date_to, label }
// An "fy" preset outside { firstFy, lastFy } (the range the FY select offers, see fyBounds) falls back to the current FY.
export const resolvePeriod = (state, today = new Date(), { firstFy, lastFy } = {}) => {
  const period = state?.period || {};
  const current = fyStartYearOf(today);
  const bounds = fyBounds({ first: firstFy, last: lastFy }, today);
  let startYear = current;
  if (period.preset === "previous") startYear = current - 1;
  if (period.preset === "fy") {
    const chosen = Number(period.fyStartYear);
    const inRange = Number.isInteger(chosen) && chosen >= bounds.firstFy && chosen <= bounds.lastFy;
    startYear = inRange ? chosen : current;
  }
  if (period.preset === "custom") {
    const from = toParts(period.from) ? toIsoDate(period.from) : "";
    const to = toParts(period.to) ? toIsoDate(period.to) : "";
    const range = from && to ? `${formatDmy(from)} - ${formatDmy(to)}` : "";
    return { date_from: from, date_to: to, label: range };
  }
  const { date_from, date_to } = fyRange(startYear);
  return {
    date_from,
    date_to,
    label: `${formatDmy(date_from)} - ${formatDmy(date_to)} (FY ${fyLabel(startYear)})`,
  };
};

// state: { period, interval } -> { from?, to?, range? } error messages ({} when valid). Only custom ranges can be invalid.
export const validatePeriod = (state) => {
  const period = state?.period || {};
  const errors = {};
  if (period.preset !== "custom") return errors;
  const from = toParts(period.from);
  const to = toParts(period.to);
  if (!from) errors.from = "From date is required";
  if (!to) errors.to = "To date is required";
  if (!from || !to) return errors;
  if (toIsoDate(from) > toIsoDate(to)) {
    errors.range = "From date must not be after To date";
    return errors;
  }
  const interval = state?.interval || "month";
  if (interval === "month" && monthKeysBetween(from, to).length > MAX_MONTH_RANGE) {
    errors.range = RANGE_TOO_LONG_MESSAGE;
  }
  return errors;
};
