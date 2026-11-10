// Pure helpers for components/forms/SearchableSelect (the one searchable select used app-wide).

export const isBlank = (value) => value == null || value === "" || value === false;

/** Keep options whose label contains the query. Empty query keeps everything. */
export function filterOptionsByQuery(options, query, getLabel) {
  const list = Array.isArray(options) ? options : [];
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return list;
  return list.filter((option) => String(getLabel(option) ?? "").toLowerCase().includes(q));
}

/** Highlight index that is always valid for a list of `count` items (-1 when the list is empty). */
export function clampIndex(index, count) {
  if (!count || count < 1) return -1;
  if (!Number.isInteger(index) || index < 0) return 0;
  return Math.min(index, count - 1);
}

/** Next index for arrow keys, wrapping around. */
export function stepIndex(current, delta, count) {
  if (!count || count < 1) return -1;
  const from = clampIndex(current, count);
  return (from + delta + count) % count;
}

/** Index of the option matching `value` (string compare so "5" matches 5), or 0 when none. */
export function findSelectedIndex(options, value, valueKey) {
  if (isBlank(value)) return 0;
  const idx = (options || []).findIndex((option) => String(option?.[valueKey]) === String(value));
  return idx >= 0 ? idx : 0;
}

/** Input `size` (characters) when the field should fit its content. */
export function computeAutoSize({ text, placeholder, padding = 2, min = 12, max = 60 }) {
  const desired = Math.max(String(text ?? "").length, String(placeholder ?? "").length) + Number(padding || 0);
  const lo = Number(min || 0);
  const hi = Number(max || 0);
  return hi > 0 ? Math.min(hi, Math.max(lo, desired)) : Math.max(lo, desired);
}

/**
 * Which state the dropdown body is in. Empty results must show "no options" and
 * never fall back to the unfiltered list.
 */
export function getListState({ isLoading, count }) {
  if (isLoading) return "loading";
  return count > 0 ? "options" : "empty";
}

/**
 * Guards async option loading: only the response of the latest request may be applied.
 *   const guard = createLatestGuard();
 *   const token = guard.next();
 *   const data = await api(...);
 *   if (!guard.isLatest(token)) return;
 */
export function createLatestGuard() {
  let current = 0;
  return {
    next: () => ++current,
    isLatest: (token) => token === current,
    invalidate: () => {
      current += 1;
    },
  };
}

// Fields currently showing typed search text that matches no selected option.
// Forms call hasUnmatchedSearchText() before saving: that text is not a value (the API needs an id).
const unmatchedFields = new Set();

export function setUnmatchedSearchField(fieldId, isUnmatched) {
  if (isUnmatched) unmatchedFields.add(fieldId);
  else unmatchedFields.delete(fieldId);
}

export function hasUnmatchedSearchText() {
  return unmatchedFields.size > 0;
}
