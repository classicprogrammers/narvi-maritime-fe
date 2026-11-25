// Default / reset helpers for the Master Ledger dashboard filters (period, interval, client, region FYs).
// The current tab is not a filter and is always kept.

const sameYears = (a, b) => {
  const left = (Array.isArray(a) ? a : []).map(Number).sort((x, y) => x - y);
  const right = (Array.isArray(b) ? b : []).map(Number).sort((x, y) => x - y);
  return left.length === right.length && left.every((year, i) => year === right[i]);
};

// Presets other than fy / custom ignore leftover fyStartYear / from / to values.
const samePeriod = (a = {}, b = {}) => {
  if (a.preset !== b.preset) return false;
  if (a.preset === "fy") return Number(a.fyStartYear) === Number(b.fyStartYear);
  if (a.preset === "custom") return (a.from || "") === (b.from || "") && (a.to || "") === (b.to || "");
  return true;
};

// Keeps the period FY and the region FYs inside the choices the UI offers (same list as the select and checkboxes).
// An "fy" preset outside them becomes "current"; region FYs outside them are dropped, and if that drops every
// selected year, all choices are selected. An empty selection the user made stays empty.
export const clampFilters = (state, fyChoices) => {
  const choices = Array.isArray(fyChoices) ? fyChoices : [];
  const period = state?.period || {};
  const clampedPeriod =
    period.preset === "fy" && !choices.includes(Number(period.fyStartYear))
      ? { ...period, preset: "current", fyStartYear: "" }
      : period;
  const selected = (Array.isArray(state?.regionFys) ? state.regionFys : []).map(Number);
  const kept = selected.filter((y) => choices.includes(y));
  return { ...state, period: clampedPeriod, regionFys: kept.length || !selected.length ? kept : [...choices] };
};

export const isDefaultFilters = (state, defaults) =>
  samePeriod(state?.period, defaults.period) &&
  state?.interval === defaults.interval &&
  String(state?.clientId || "") === String(defaults.clientId || "") &&
  sameYears(state?.regionFys, defaults.regionFys);

export const resetFilters = (state, defaults) => ({
  ...defaults,
  period: { ...defaults.period },
  regionFys: [...defaults.regionFys],
  tab: state.tab,
});
