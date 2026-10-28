import {
  parseCiplLineCurrencyFromApi,
  ciplLineNeedsConversion,
  parseCiplRoe,
  computeCiplConvertedValue,
  recalcCiplLineConvertedValues,
  buildCiplStockLinePayloadItem,
  parseCiplStockLineEntriesFromApi,
  mergeCiplStockLineFromApi,
} from "./ciPlStockLineEntries";

describe("parseCiplLineCurrencyFromApi", () => {
  it("reads currency, roe and flags", () => {
    expect(
      parseCiplLineCurrencyFromApi({
        source_currency_id: { id: 3, name: "EUR", symbol: "€" },
        needs_conversion: true,
        roe: 1.087,
        roe_date: "2026-10-27",
        roe_manual: true,
      })
    ).toEqual({
      sourceCurrencyId: "3",
      sourceCurrencyName: "EUR",
      needsConversion: true,
      roe: "1.087",
      roeDate: "2026-10-27",
      roeManual: true,
      sourceCurrencyDirty: false,
      roeDirty: false,
    });
  });
  it("treats missing values and roe false as empty", () => {
    const parsed = parseCiplLineCurrencyFromApi({ source_currency_id: null, roe: false });
    expect(parsed.sourceCurrencyId).toBe("");
    expect(parsed.roe).toBe("");
    expect(parsed.needsConversion).toBe(false);
  });
});

describe("ciplLineNeedsConversion", () => {
  it("is false without an item currency", () => {
    expect(ciplLineNeedsConversion("", "1", true)).toBe(false);
  });
  it("compares item and form currency", () => {
    expect(ciplLineNeedsConversion("2", "1")).toBe(true);
    expect(ciplLineNeedsConversion(1, "1")).toBe(false);
  });
  it("falls back to the server flag when the form currency is empty", () => {
    expect(ciplLineNeedsConversion("2", "", true)).toBe(true);
    expect(ciplLineNeedsConversion("2", "", false)).toBe(false);
  });
});

describe("parseCiplRoe / computeCiplConvertedValue", () => {
  it("accepts only positive numbers", () => {
    expect(parseCiplRoe("1.5")).toBe(1.5);
    expect(parseCiplRoe("0")).toBeNull();
    expect(parseCiplRoe("abc")).toBeNull();
    expect(parseCiplRoe("")).toBeNull();
  });
  it("multiplies amount by roe with 2 decimals", () => {
    expect(computeCiplConvertedValue("120", "1.087")).toBe("130.44");
    expect(computeCiplConvertedValue("", "1.087")).toBe("");
    expect(computeCiplConvertedValue("120", "")).toBe("");
  });
  it("recalculates entry values only for converted lines", () => {
    const item = {
      needsConversion: true,
      roe: "2",
      entries: [{ sourceValue: "10", valueUsd: "" }, { sourceValue: "", valueUsd: "5" }],
    };
    expect(recalcCiplLineConvertedValues(item).entries.map((e) => e.valueUsd)).toEqual(["20.00", ""]);
    const plain = { needsConversion: false, entries: [{ valueUsd: "5" }] };
    expect(recalcCiplLineConvertedValues(plain)).toBe(plain);
  });
});

describe("buildCiplStockLinePayloadItem currency fields", () => {
  const entry = (overrides) => ({
    id: null,
    localKey: "k",
    description: "Pump",
    valueUsd: "130.44",
    sourceValue: "120",
    quantity: "",
    perUnit: "",
    deleted: false,
    ...overrides,
  });

  it("is unchanged for lines without conversion or edits", () => {
    const payload = buildCiplStockLinePayloadItem(
      { lineId: 55, entries: [entry()], roe: "1.087", sourceCurrencyId: "3" },
      false
    );
    expect(payload).toEqual({
      id: 55,
      warehouse_new: null,
      dg_un: null,
      lwh: null,
      description: "Pump",
      value_in_usd: "130.44",
    });
  });

  it("sends source_value in entries for converted lines", () => {
    const payload = buildCiplStockLinePayloadItem(
      { lineId: 55, needsConversion: true, entries: [entry({ id: 9 })] },
      false
    );
    expect(payload.entries).toEqual([{ id: 9, description: "Pump", source_value: "120" }]);
    expect(payload).not.toHaveProperty("value_in_usd");
    expect(payload).not.toHaveProperty("roe");
  });

  it("sends source_currency_id and roe only when edited", () => {
    const payload = buildCiplStockLinePayloadItem(
      {
        lineId: 55,
        needsConversion: true,
        sourceCurrencyId: "3",
        sourceCurrencyDirty: true,
        roe: "1.087",
        roeDirty: true,
        entries: [entry({ id: 9 })],
      },
      false
    );
    expect(payload.source_currency_id).toBe(3);
    expect(payload.roe).toBe(1.087);
  });

  it("sends roe null to go back to the automatic rate and skips invalid input", () => {
    const base = { lineId: 55, roeDirty: true, entries: [entry({ id: 9 })] };
    expect(buildCiplStockLinePayloadItem({ ...base, roe: "" }, false).roe).toBeNull();
    expect(buildCiplStockLinePayloadItem({ ...base, roe: "abc" }, false)).not.toHaveProperty("roe");
  });
});

describe("merge and parse from API", () => {
  it("parses entries[].source_value", () => {
    const entries = parseCiplStockLineEntriesFromApi(
      { entries: [{ id: 9, description: "Pump", source_value: "120.00", value_in_usd: "130.44" }] },
      false
    );
    expect(entries[0].sourceValue).toBe("120.00");
    expect(entries[0].valueUsd).toBe("130.44");
  });
  it("takes currency fields from the server and clears edit flags", () => {
    const merged = mergeCiplStockLineFromApi(
      { lineId: 55, roe: "9", roeDirty: true, sourceCurrencyDirty: true, entries: [] },
      { id: 55, roe: 1.087, roe_manual: true, needs_conversion: true, source_currency_id: { id: 3, name: "EUR" }, entries: [] },
      false
    );
    expect(merged.roe).toBe("1.087");
    expect(merged.roeManual).toBe(true);
    expect(merged.roeDirty).toBe(false);
    expect(merged.sourceCurrencyDirty).toBe(false);
  });
});
