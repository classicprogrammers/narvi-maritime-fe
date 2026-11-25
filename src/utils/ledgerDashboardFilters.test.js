import { clampFilters, isDefaultFilters, resetFilters } from "./ledgerDashboardFilters";

const defaults = {
  tab: "cash",
  period: { preset: "current", fyStartYear: "", from: "", to: "" },
  interval: "month",
  clientId: "",
  clientLabel: "",
  regionFys: [2024, 2025, 2026],
};

describe("ledgerDashboardFilters", () => {
  test("defaults are default, ignoring tab, label and FY order", () => {
    expect(isDefaultFilters({ ...defaults, tab: "turnover", regionFys: [2026, 2024, 2025] }, defaults)).toBe(true);
    expect(isDefaultFilters({ ...defaults, period: { preset: "current", fyStartYear: 2025, from: "x", to: "" } }, defaults)).toBe(true);
  });

  test("any changed filter is not default", () => {
    expect(isDefaultFilters({ ...defaults, interval: "total" }, defaults)).toBe(false);
    expect(isDefaultFilters({ ...defaults, clientId: "7" }, defaults)).toBe(false);
    expect(isDefaultFilters({ ...defaults, regionFys: [2025] }, defaults)).toBe(false);
    expect(isDefaultFilters({ ...defaults, period: { ...defaults.period, preset: "previous" } }, defaults)).toBe(false);
    expect(isDefaultFilters({ ...defaults, period: { preset: "fy", fyStartYear: 2025, from: "", to: "" } }, defaults)).toBe(false);
    expect(isDefaultFilters({ ...defaults, period: { preset: "custom", from: "2025-03-01", to: "" } }, defaults)).toBe(false);
  });

  test("clampFilters keeps the period FY and region FYs inside the offered choices", () => {
    const choices = [2023, 2024, 2025, 2026];
    const fy2023 = { ...defaults, period: { preset: "fy", fyStartYear: 2023, from: "", to: "" } };
    expect(clampFilters(fy2023, choices).period.preset).toBe("fy");
    expect(clampFilters(fy2023, [2024, 2025, 2026]).period).toEqual({ preset: "current", fyStartYear: "", from: "", to: "" });
    expect(clampFilters({ ...defaults, regionFys: [2022, 2024, 2030] }, choices).regionFys).toEqual([2024]);
    expect(clampFilters({ ...defaults, regionFys: [2030] }, choices).regionFys).toEqual(choices);
    expect(clampFilters({ ...defaults, regionFys: [] }, choices).regionFys).toEqual([]);
  });

  test("resetFilters restores defaults but keeps the tab", () => {
    const next = resetFilters(
      { ...defaults, tab: "regions", interval: "total", clientId: "7", clientLabel: "Acme", regionFys: [2025] },
      defaults,
    );
    expect(next).toEqual({ ...defaults, tab: "regions" });
    expect(next.period).not.toBe(defaults.period);
  });
});
