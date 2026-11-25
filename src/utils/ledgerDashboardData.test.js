import {
  buildMoneyBarOptions,
  buildRegionLineOptions,
  fillBuckets,
  formatMarginPct,
  formatUndatedNote,
  hasMatchingBucket,
  marginPct,
  pivotByBucket,
  sortRows,
  topNWithOther,
} from "./ledgerDashboardData";

const TODAY = new Date(2026, 10, 25);

describe("ledgerDashboardData", () => {
  test("fillBuckets zero-fills, drops unknown keys and nulls the future when asked", () => {
    const keys = ["2026-10", "2026-11", "2026-12"];
    const rows = [
      { key: "2026-11", sale_usd: "5.5" },
      { key: "1999-01", sale_usd: 99 },
    ];
    expect(fillBuckets(keys, rows, "sale_usd")).toEqual([0, 5.5, 0]);
    expect(fillBuckets(keys, rows, "sale_usd", { futureAsNull: true, today: TODAY })).toEqual([0, 5.5, null]);
    expect(fillBuckets(keys, null, "sale_usd")).toEqual([0, 0, 0]);
  });

  test("fillBuckets with a row that only has a total bucket gives zeros; hasMatchingBucket detects it", () => {
    const keys = ["2025-Q1", "2025-Q2"];
    const noVesselBuckets = [{ key: "total", sale_usd: 50 }];
    expect(fillBuckets(keys, noVesselBuckets, "sale_usd")).toEqual([0, 0]);
    expect(hasMatchingBucket(keys, noVesselBuckets)).toBe(false);
    expect(hasMatchingBucket(keys, [{ key: "2025-Q2" }])).toBe(true);
    expect(hasMatchingBucket(keys, [])).toBe(false);
    expect(hasMatchingBucket(["total"], noVesselBuckets)).toBe(true);
  });

  test("marginPct returns a ratio,null for zero or invalid sale", () => {
    expect(marginPct(25, 200)).toBe(0.125);
    expect(marginPct(-50, 200)).toBe(-0.25);
    expect(marginPct(10, 0)).toBeNull();
    expect(marginPct(10, null)).toBeNull();
    expect(marginPct("x", 10)).toBeNull();
  });

  test("formatMarginPct", () => {
    expect(formatMarginPct(null)).toBe("—");
    expect(formatMarginPct(undefined)).toBe("—");
    expect(formatMarginPct(0.1234)).toBe("12.3%");
    expect(formatMarginPct(-0.25)).toBe("-25.0%");
    expect(formatMarginPct(0)).toBe("0.0%");
  });

  test("topNWithOther sums the rest into one other row", () => {
    const rows = [
      { name: "A", sale_usd: 10, by_bucket: [{ key: "2026-03", sale_usd: 10 }] },
      { name: "B", sale_usd: 50, by_bucket: [{ key: "2026-03", sale_usd: 50 }] },
      { name: "C", sale_usd: 30, by_bucket: [{ key: "2026-03", sale_usd: 20 }, { key: "2026-04", sale_usd: 10 }] },
      { name: "D", sale_usd: 5, by_bucket: [{ key: "2026-04", sale_usd: 5 }] },
    ];
    const result = topNWithOther(rows, 2, "sale_usd", "Other vessels");
    expect(result.map((r) => r.name || r.label)).toEqual(["B", "C", "Other vessels"]);
    expect(result[2]).toMatchObject({ isOther: true, sale_usd: 15 });
    expect(result[2].by_bucket).toEqual([
      { key: "2026-03", sale_usd: 10 },
      { key: "2026-04", sale_usd: 5 },
    ]);
    expect(rows[0].name).toBe("A");
  });

  test("topNWithOther adds no other row when rows <= n", () => {
    const rows = [{ name: "A", sale_usd: 1 }, { name: "B", sale_usd: 2 }];
    expect(topNWithOther(rows, 2, "sale_usd", "Other").map((r) => r.name)).toEqual(["B", "A"]);
    expect(topNWithOther(rows, 5, "sale_usd", "Other")).toHaveLength(2);
  });

  test("pivotByBucket gives one value per key", () => {
    const rows = [
      {
        name: "A",
        by_bucket: [
          { key: "2026-03", sale_usd: 100, profit_usd: 20, margin: 0.2 },
          { key: "2026-05", sale_usd: 50, profit_usd: -5 },
        ],
      },
    ];
    const keys = ["2026-03", "2026-04", "2026-05"];
    expect(pivotByBucket(rows, keys, "sale_usd")[0].values).toEqual([100, 0, 50]);
    expect(pivotByBucket(rows, keys, "profit_usd")[0].values).toEqual([20, 0, -5]);
    expect(pivotByBucket(rows, keys, "margin")[0].values).toEqual([0.2, null, -0.1]);
    expect(pivotByBucket(rows, keys, "sale_usd")[0].name).toBe("A");
  });

  test("sortRows sorts numbers and puts nulls last in both orders", () => {
    const rows = [{ id: 1, v: 5 }, { id: 2, v: null }, { id: 3, v: 20 }, { id: 4, v: -1 }];
    expect(sortRows(rows, "v", "desc").map((r) => r.id)).toEqual([3, 1, 4, 2]);
    expect(sortRows(rows, "v", "asc").map((r) => r.id)).toEqual([4, 1, 3, 2]);
    expect(sortRows([{ n: "b" }, { n: "a" }], "n", "asc").map((r) => r.n)).toEqual(["a", "b"]);
    expect(rows[0].id).toBe(1);
  });

  test("buildMoneyBarOptions allows negatives and formats money", () => {
    const options = buildMoneyBarOptions(["Mar 2026"], { colors: ["#1", "#2"], labelColor: "#3", gridColor: "#4" });
    expect(options.colors).toEqual(["#1", "#2"]);
    expect(options.xaxis.categories).toEqual(["Mar 2026"]);
    expect(options.yaxis.min).toBeUndefined();
    expect(options.grid.borderColor).toBe("#4");
    expect(options.tooltip.y.formatter(-1234.5)).toMatch(/1.?234[.,]50/);
    expect(buildMoneyBarOptions([], { stacked: true }).chart.stacked).toBe(true);
  });

  test("buildRegionLineOptions has Mar..Feb axis, one series per FY and keeps nulls", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, null, null, null, null];
    const { options, series } = buildRegionLineOptions(
      [{ fy: 2026, values }, { fy: 2025, label: "Custom", values: [1] }],
      { colors: ["#a"], labelColor: "#b", gridColor: "#c" }
    );
    expect(options.xaxis.categories).toEqual(["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]);
    expect(series).toHaveLength(2);
    expect(series[0].name).toBe("2026/27");
    expect(series[0].data).toEqual(values);
    expect(series[1].name).toBe("Custom");
    expect(series[1].data).toHaveLength(12);
    expect(series[1].data[11]).toBeNull();
    expect(options.colors).toEqual(["#a"]);
  });
});

describe("formatUndatedNote", () => {
  test("is empty without a count", () => {
    expect(formatUndatedNote(null)).toBe("");
    expect(formatUndatedNote({ count: 0, sale_usd: 5 })).toBe("");
  });
  test("names the count and any USD amounts", () => {
    expect(formatUndatedNote({ count: 1 })).toBe("1 record without a date is not included");
    expect(formatUndatedNote({ count: 3, sale_usd: 1200.5, cost_usd: 10 })).toBe(
      "3 records without a date are not included (Sale $1,200.50, Cost $10.00)"
    );
  });
  test("handles the { sale, cost } shape", () => {
    expect(formatUndatedNote({ sale: { count: 2, usd: 1200.5 }, cost: { count: 1, usd: 10 } })).toBe(
      "2 sales records ($1,200.50) and 1 cost record ($10.00) without a date are not included"
    );
    expect(formatUndatedNote({ sale: { count: 0, usd: 0 }, cost: { count: 1, usd: 10 } })).toBe(
      "1 cost record ($10.00) without a date is not included"
    );
    expect(formatUndatedNote({ sale: { count: 0, usd: 0 }, cost: {} })).toBe("");
    expect(formatUndatedNote({ sale: null, cost: { count: 0 } })).toBe("");
  });
});
