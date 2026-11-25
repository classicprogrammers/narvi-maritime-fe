import { formatDateDMY } from "./dateFormat";

/** Age rule for tariff "last updated" dates. Backend values are "YYYY-MM-DD" or boolean false (unknown). */

export const TARIFF_RATE_MAX_AGE_MONTHS = 12; // the ONLY place the threshold lives
export const RATE_AGE = { OK: "ok", OLD: "old", UNKNOWN: "unknown" };
export const UNKNOWN_LAST_UPDATE_TEXT = "—"; // em dash
export const STALE_TARIFF_WARNING = "Rates in this tariff seem to be old, please check";
export const OLD_RATE_HINT = `Last updated more than ${TARIFF_RATE_MAX_AGE_MONTHS} months ago`; // badge tooltip

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}.*)?$/;

const pad = (n) => String(n).padStart(2, "0");

/** Strict parse of a backend date value. Returns a local-midnight Date, or null when unknown. */
export function parseLastUpdate(value) {
  if (typeof value !== "string") return null;
  const match = value.trim().match(DATE_PATTERN);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Date() rolls 2025-02-30 over to March and maps years 0-99 to 19xx, so check the parts survived.
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : null;
}

/** "ok" | "old" | "unknown". `today` defaults to new Date(); only its calendar date is used. */
export function getRateAgeStatus(lastUpdate, today = new Date()) {
  const date = parseLastUpdate(lastUpdate);
  if (!date) return RATE_AGE.UNKNOWN;
  if (!(today instanceof Date) || Number.isNaN(today.getTime())) return RATE_AGE.UNKNOWN;
  // Cutoff = today minus N months, clamped to the last day of the target month (Feb 29 -> Feb 28).
  const cutoffMonth = new Date(today.getFullYear(), today.getMonth() - TARIFF_RATE_MAX_AGE_MONTHS, 1);
  const lastDay = new Date(cutoffMonth.getFullYear(), cutoffMonth.getMonth() + 1, 0).getDate();
  const cutoff = new Date(cutoffMonth.getFullYear(), cutoffMonth.getMonth(), Math.min(today.getDate(), lastDay));
  return date < cutoff ? RATE_AGE.OLD : RATE_AGE.OK;
}

/** True only when getRateAgeStatus(...) === "old". Used for the per-row badge AND for meta.oldestLastUpdate. */
export function isRateOld(lastUpdate, today = new Date()) {
  return getRateAgeStatus(lastUpdate, today) === RATE_AGE.OLD;
}

/** Cell text: "DD/MM/YYYY" (via formatDateDMY) or "—" when unknown. */
export function formatLastUpdate(lastUpdate) {
  const date = parseLastUpdate(lastUpdate);
  if (!date) return UNKNOWN_LAST_UPDATE_TEXT;
  return formatDateDMY(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
}
