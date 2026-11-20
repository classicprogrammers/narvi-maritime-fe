/**
 * App-wide date display: always DD/MM/YYYY (never locale / month-name formats).
 * Backend/API values stay YYYY-MM-DD; use these helpers for display only.
 */

const pad = (n) => String(n).padStart(2, "0");

const isEmpty = (value) => value == null || value === false || String(value).trim() === "";

const DMY_PREFIX = /^\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const toDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** "2026-06-15" | "2026-06-15 10:00:00" | ISO | Date -> "15/06/2026". Empty -> "". Unparseable -> raw text. */
export const formatDateDMY = (value) => {
  if (isEmpty(value)) return "";
  if (value instanceof Date) {
    const d = toDate(value);
    return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "";
  }
  const text = String(value).trim();
  const iso = text.match(ISO_DATE);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${pad(dmy[1])}/${pad(dmy[2])}/${dmy[3]}`;
  if (DMY_PREFIX.test(text)) return text; // already day-first; never let Date() read it as month-first
  const d = toDate(text);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : text;
};

/** Same as formatDateDMY plus 24h time: "15/06/2026 14:05:09". Date-only input gives the date only. */
export const formatDateTimeDMYFull = (value) => {
  if (isEmpty(value)) return "";
  const text = value instanceof Date ? "" : String(value).trim();
  if (ISO_DATE.test(text)) return formatDateDMY(text);
  if (DMY_PREFIX.test(text)) return text;
  const d = toDate(value instanceof Date ? value : text);
  if (!d) return text;
  return `${formatDateDMY(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Live typing mask for a DD/MM/YYYY field: keeps digits only, inserts the slashes and refuses a digit
 * that cannot be part of a valid day (01-31) or month (01-12). Stops at the first refused digit.
 */
export const maskDmyTyping = (raw) => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  let kept = "";
  for (const ch of digits) {
    const n = kept.length;
    const d = Number(ch);
    let ok = true;
    if (n === 0) ok = d <= 3;
    else if (n === 1) {
      const day = Number(kept[0] + ch);
      ok = day >= 1 && day <= 31;
    } else if (n === 2) ok = d <= 1;
    else if (n === 3) {
      const month = Number(kept[2] + ch);
      ok = month >= 1 && month <= 12;
    } else if (n >= 8) ok = false;
    if (!ok) break;
    kept += ch;
  }
  if (kept.length > 4) return `${kept.slice(0, 2)}/${kept.slice(2, 4)}/${kept.slice(4)}`;
  if (kept.length > 2) return `${kept.slice(0, 2)}/${kept.slice(2)}`;
  return kept;
};

/** "15/06/2026" -> "2026-06-15" when it is a real calendar date (year >= 1900), else null. */
export const dmyToIsoStrict = (text) => {
  const m = String(text ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const d = new Date(year, month - 1, day);
  const real = d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  return real && year >= 1900 ? `${yyyy}-${mm}-${dd}` : null;
};
