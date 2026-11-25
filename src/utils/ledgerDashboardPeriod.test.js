import {
  bucketKeys,
  bucketLabel,
  fyBounds,
  fyLabel,
  fyMonthKeys,
  fyOptions,
  fyRange,
  fyStartYearOf,
  isFutureMonth,
  monthKeysBetween,
  resolvePeriod,
  toIsoDate,
  validatePeriod,
} from "./ledgerDashboardPeriod";

const TODAY = new Date(2026, 10, 25); // 2026-11-25 local

describe("ledgerDashboardPeriod", () => {
  test("fyStartYearOf respects the 01 March boundary and leap day", () => {
    expect(fyStartYearOf("2025-02-28")).toBe(2024);
    expect(fyStartYearOf("2025-03-01")).toBe(2025);
    expect(fyStartYearOf("2024-02-29")).toBe(2023);
    expect(fyStartYearOf(new Date(2026, 10, 25))).toBe(2026);
    expect(fyStartYearOf("nope")).toBeNull();
  });

  test("fyLabel and fyRange handle leap years", () => {
    expect(fyLabel(2024)).toBe("2024/25");
    expect(fyLabel(2099)).toBe("2099/00");
    expect(fyRange(2023).date_to).toBe("2024-02-29");
    expect(fyRange(2024)).toEqual({ date_from: "2024-03-01", date_to: "2025-02-28" });
    expect(fyRange(2027).date_to).toBe("2028-02-29");
  });

  test("fyOptions runs from the first FY up to the current FY", () => {
    expect(fyOptions(2024, TODAY)).toEqual([2024, 2025, 2026]);
    expect(fyOptions(2023, TODAY, 2025)).toEqual([2023, 2024, 2025]);
    expect(fyOptions(2024, new Date(2027, 1, 28))).toEqual([2024, 2025, 2026]);
    expect(fyOptions(2024, new Date(2027, 2, 1))).toEqual([2024, 2025, 2026, 2027]);
  });

  test("resolvePeriod handles each preset", () => {
    expect(resolvePeriod({ period: { preset: "current" } }, TODAY)).toEqual({
      date_from: "2026-03-01",
      date_to: "2027-02-28",
      label: "01/03/2026 - 28/02/2027 (FY 2026/27)",
    });
    expect(resolvePeriod({ period: { preset: "previous" } }, TODAY)).toMatchObject({
      date_from: "2025-03-01",
      date_to: "2026-02-28",
    });
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2024 } }, TODAY)).toMatchObject({
      date_from: "2024-03-01",
      date_to: "2025-02-28",
      label: "01/03/2024 - 28/02/2025 (FY 2024/25)",
    });
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2010 } }, TODAY).date_from).toBe("2026-03-01");
    expect(resolvePeriod({ period: { preset: "custom", from: "2026-01-05", to: "2026-02-10" } }, TODAY)).toEqual({
      date_from: "2026-01-05",
      date_to: "2026-02-10",
      label: "05/01/2026 - 10/02/2026",
    });
    expect(resolvePeriod({ period: { preset: "custom", from: "", to: "" } }, TODAY).date_from).toBe("");
    expect(resolvePeriod({}, TODAY).date_from).toBe("2026-03-01");
  });

  test("fyBounds uses available_fy but never cuts off the current FY", () => {
    expect(fyBounds(null, TODAY)).toEqual({ firstFy: 2024, lastFy: 2026 });
    expect(fyBounds({ first: 2023, last: 2025 }, TODAY)).toEqual({ firstFy: 2023, lastFy: 2026 });
    expect(fyBounds({ first: 2023, last: 2027 }, TODAY)).toEqual({ firstFy: 2023, lastFy: 2027 });
    expect(fyBounds({ first: null, last: null }, TODAY)).toEqual({ firstFy: 2024, lastFy: 2026 });
  });

  test("resolvePeriod accepts an FY inside the given range and falls back outside it", () => {
    const range = { firstFy: 2023, lastFy: 2027 };
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2023 } }, TODAY, range)).toEqual({
      date_from: "2023-03-01",
      date_to: "2024-02-29",
      label: "01/03/2023 - 29/02/2024 (FY 2023/24)",
    });
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2027 } }, TODAY, range).date_from).toBe("2027-03-01");
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2022 } }, TODAY, range).date_from).toBe("2026-03-01");
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2028 } }, TODAY, range).date_from).toBe("2026-03-01");
    expect(resolvePeriod({ period: { preset: "fy", fyStartYear: 2023 } }, TODAY).date_from).toBe("2026-03-01");
  });

  test("validatePeriod checks custom ranges only", () => {
    expect(validatePeriod({ period: { preset: "current" }, interval: "month" })).toEqual({});
    expect(validatePeriod({ period: { preset: "custom", from: "", to: "" } })).toEqual({
      from: "From date is required",
      to: "To date is required",
    });
    expect(validatePeriod({ period: { preset: "custom", from: "2026-01-01", to: "" } }).to).toBeTruthy();
    expect(validatePeriod({ period: { preset: "custom", from: "2026-02-01", to: "2026-01-01" } }).range).toMatch(
      /must not be after/
    );
    const long = { preset: "custom", from: "2024-03-01", to: "2027-03-01" }; // 37 months
    expect(validatePeriod({ period: long, interval: "month" }).range).toBe(
      "Choose Quarter or Total for ranges over 36 months"
    );
    expect(validatePeriod({ period: long, interval: "quarter" })).toEqual({});
    expect(validatePeriod({ period: long, interval: "total" })).toEqual({});
    expect(validatePeriod({ period: { ...long, to: "2027-02-28" }, interval: "month" })).toEqual({}); // 36 months
  });

  test("fyMonthKeys lists Mar..Feb", () => {
    const keys = fyMonthKeys(2026);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe("2026-03");
    expect(keys[9]).toBe("2026-12");
    expect(keys[10]).toBe("2027-01");
    expect(keys[11]).toBe("2027-02");
  });

  test("monthKeysBetween is inclusive and crosses years", () => {
    expect(monthKeysBetween("2026-11-15", "2027-01-02")).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(monthKeysBetween("2026-03-01", "2026-03-31")).toEqual(["2026-03"]);
    expect(monthKeysBetween("2026-03-01", "bad")).toEqual([]);
  });

  test("bucketKeys for month, quarter and total", () => {
    expect(bucketKeys("2026-03-01", "2027-02-28", "month")).toEqual(fyMonthKeys(2026));
    expect(bucketKeys("2026-03-01", "2027-02-28", "quarter")).toEqual([
      "2026-Q1",
      "2026-Q2",
      "2026-Q3",
      "2026-Q4",
    ]);
    expect(bucketKeys("2026-01-10", "2026-04-02", "quarter")).toEqual(["2025-Q4", "2026-Q1"]);
    expect(bucketKeys("2026-03-01", "2027-02-28", "total")).toEqual(["total"]);
  });

  test("bucketLabel formats month, quarter and total", () => {
    expect(bucketLabel("2026-03", "month")).toBe("Mar 2026");
    expect(bucketLabel("2027-02", "month")).toBe("Feb 2027");
    expect(bucketLabel("2026-Q1", "quarter")).toBe("Q1 2026/27");
    expect(bucketLabel("2025-Q4", "quarter")).toBe("Q4 2025/26");
    expect(bucketLabel("total", "total")).toBe("Total");
  });

  test("isFutureMonth compares with the month of today", () => {
    expect(isFutureMonth("2026-12", TODAY)).toBe(true);
    expect(isFutureMonth("2026-11", TODAY)).toBe(false);
    expect(isFutureMonth("2026-03", TODAY)).toBe(false);
    expect(isFutureMonth("2027-01", TODAY)).toBe(true);
  });

  test("toIsoDate uses local parts without a time zone shift", () => {
    expect(toIsoDate(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026-01-01");
    expect(toIsoDate(new Date(2026, 11, 31, 23, 59, 59))).toBe("2026-12-31");
    expect(toIsoDate({ year: 2024, month: 2, day: 29 })).toBe("2024-02-29");
    expect(toIsoDate("garbage")).toBe("");
  });
});
