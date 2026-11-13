import { buildTypeSections, isIfApplyRow, sortBySortOrder, uniqueCurrencies } from "./clientTariffSections";

const rate = (id, sort_order, charge_category) => ({ id, sort_order, charge_category, name: `Rate ${id}` });
const toBody = (rows) => rows.map((row) => [row.name]);
const head = ["Rate Name"];

describe("clientTariffSections", () => {
  test("If Apply and DOB If Apply are conditional charges", () => {
    expect(isIfApplyRow({ charge_category: "if_apply" })).toBe(true);
    expect(isIfApplyRow({ charge_category: "dob_if_apply" })).toBe(true);
    expect(isIfApplyRow({ charge_category: "standard" })).toBe(false);
    expect(isIfApplyRow({ charge_category: "dob_standard" })).toBe(false);
    expect(isIfApplyRow({})).toBe(false);
    expect(isIfApplyRow(undefined)).toBe(false);
  });

  test("sorts by Sort Order, missing last, stable for equal values", () => {
    const rows = [rate(1, 5, "standard"), rate(2, undefined, "standard"), rate(3, 1, "standard"), rate(4, 5, "standard")];
    expect(sortBySortOrder(rows).map((row) => row.id)).toEqual([3, 1, 4, 2]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  test("Standard charges first, then If Apply, each in Sort Order", () => {
    const rows = [
      rate(1, 3, "if_apply"),
      rate(2, 2, "standard"),
      rate(3, 1, "dob_if_apply"),
      rate(4, 1, "dob_standard"),
    ];
    const sections = buildTypeSections({ rows, head, toBody });
    expect(sections.map((section) => section.title)).toEqual(["Standard charges", "If Apply charges"]);
    expect(sections[0].body).toEqual([["Rate 4"], ["Rate 2"]]);
    expect(sections[1].body).toEqual([["Rate 3"], ["Rate 1"]]);
    expect(sections[0].head).toBe(head);
  });

  test("a part without rates is left out", () => {
    const only = buildTypeSections({ rows: [rate(1, 1, "standard")], head, toBody });
    expect(only.map((section) => section.title)).toEqual(["Standard charges"]);
    expect(buildTypeSections({ rows: [], head, toBody })).toEqual([]);
  });

  test("lists the different currencies once, from either currency field", () => {
    expect(uniqueCurrencies([{ currency: "SGD" }, { currency: "SGD" }])).toEqual(["SGD"]);
    expect(uniqueCurrencies([{ currency: "SGD" }, { currency_id: { name: "USD" } }, { currency: "" }])).toEqual([
      "SGD",
      "USD",
    ]);
    expect(uniqueCurrencies([{}, { currency: false }])).toEqual([]);
    expect(uniqueCurrencies([])).toEqual([]);
  });
});
