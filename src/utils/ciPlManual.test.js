import {
  CIPL_FORM_TYPE,
  isManualCiplForm,
  ciplFormTypeLabel,
  parseCiplVessel,
  parseManualLinesFromApi,
  manualLineValue,
  formatManualValue,
  manualLinesTotals,
  readManualTotals,
  validateManualLine,
  buildManualAddStockLines,
  buildManualFreeTextLine,
  buildManualLineEdit,
  buildManualLineDelete,
  buildManualResetLines,
  buildManualPackedPayload,
  buildManualHeaderFields,
  manualHeaderSnapshot,
  buildManualPdfRows,
} from "./ciPlManual";

const row = (over = {}) => ({
  key: "l-1",
  id: 1,
  stockListId: null,
  stockItemId: "",
  isStockLine: false,
  description: "Rope",
  hsCode: "",
  quantity: "2",
  unitPrice: "5",
  box: "",
  weight: "",
  valueUsd: "",
  ...over,
});

describe("form type", () => {
  it("detects manual forms", () => {
    expect(CIPL_FORM_TYPE.MANUAL).toBe("manual");
    expect(isManualCiplForm({ form_type: "manual" })).toBe(true);
    expect(isManualCiplForm({ form_type: "simple" })).toBe(false);
    expect(isManualCiplForm(null)).toBe(false);
    expect(ciplFormTypeLabel({ form_type: "manual" })).toBe("Manual");
    expect(ciplFormTypeLabel({})).toBe("Simple");
  });
});

describe("parseCiplVessel", () => {
  it("reads object, null, false and numeric ids", () => {
    expect(parseCiplVessel({ vessel_id: { id: 4, name: "MV A" } })).toEqual({ id: 4, name: "MV A" });
    expect(parseCiplVessel({ vessel_id: null })).toEqual({ id: null, name: "" });
    expect(parseCiplVessel({ vessel_id: false })).toEqual({ id: null, name: "" });
    expect(parseCiplVessel({ vessel_id: 7, vessel_name: "X" })).toEqual({ id: 7, name: "X" });
    expect(parseCiplVessel(undefined)).toEqual({ id: null, name: "" });
  });
});

describe("parseManualLinesFromApi", () => {
  it("maps stock and free-text lines, false -> empty", () => {
    const rows = parseManualLinesFromApi([
      {
        id: 10,
        stock_list_id: 55,
        stock_item_id: "SI-1",
        description: "Valve",
        hs_code: "8481",
        quantity: "3.00",
        unit_price: "2.50",
        box: false,
        weight: "1.5",
        value_in_usd: "7.50",
      },
      { id: 11, description: "Free", hs_code: false, quantity: false, unit_price: false },
      { description: false, entries: [{ description: "From entry" }] },
    ]);
    expect(rows[0]).toMatchObject({
      key: "l-10",
      id: 10,
      stockListId: 55,
      stockItemId: "SI-1",
      isStockLine: true,
      description: "Valve",
      hsCode: "8481",
      quantity: "3.00",
      unitPrice: "2.50",
      box: "",
      weight: "1.5",
      valueUsd: "7.50",
    });
    expect(rows[1]).toMatchObject({ isStockLine: false, hsCode: "", quantity: "", stockListId: null });
    expect(rows[2]).toMatchObject({ id: null, description: "From entry" });
  });

  it("handles non-arrays and junk", () => {
    expect(parseManualLinesFromApi(false)).toEqual([]);
    expect(parseManualLinesFromApi([null, 3])).toEqual([]);
  });
});

describe("math", () => {
  it("manualLineValue", () => {
    expect(manualLineValue(row())).toBe(10);
    expect(manualLineValue(row({ quantity: "1.5", unitPrice: "0.1" }))).toBe(0.15);
    expect(manualLineValue(row({ quantity: "" }))).toBeNull();
    expect(manualLineValue(row({ unitPrice: "1,5" }))).toBeNull();
    expect(manualLineValue(row({ unitPrice: "abc" }))).toBeNull();
    expect(manualLineValue(null)).toBeNull();
  });

  it("formatManualValue", () => {
    expect(formatManualValue("125")).toBe("125.00");
    expect(formatManualValue(3.456)).toBe("3.46");
    expect(formatManualValue(false)).toBe("-");
    expect(formatManualValue("")).toBe("-");
    expect(formatManualValue("x")).toBe("-");
    expect(formatManualValue(0)).toBe("0.00");
  });

  it("manualLinesTotals treats bad numbers as 0", () => {
    const t = manualLinesTotals([
      row({ box: "2", weight: "1.5" }),
      row({ quantity: "", unitPrice: "", box: "x", weight: "", valueUsd: "4.00" }),
    ]);
    expect(t).toEqual({ box: 2, weight: 1.5, quantity: 2, value: 14 });
    expect(manualLinesTotals(null)).toEqual({ box: 0, weight: 0, quantity: 0, value: 0 });
  });

  it("readManualTotals reads backend values, false -> 0", () => {
    expect(
      readManualTotals({
        total_box: "3.00",
        total_weight: false,
        total_value_in_usd: "125.00",
        packed_as: { boxes: "2", kg: false },
      })
    ).toEqual({ box: 3, weight: 0, value: 125, packedBoxes: 2, packedKg: 0 });
    expect(readManualTotals({ totals: { total_box: "4", total_weight: "5.5" }, packed_as: false })).toEqual({
      box: 4,
      weight: 5.5,
      value: 0,
      packedBoxes: 0,
      packedKg: 0,
    });
    expect(readManualTotals(null).value).toBe(0);
  });
});

describe("validateManualLine", () => {
  it("requires description for free-text lines", () => {
    expect(validateManualLine(row({ description: "  " }))).toMatch(/Description/);
    expect(validateManualLine(row())).toBeNull();
    expect(validateManualLine(row({ isStockLine: true, description: "" }))).toBeNull();
  });
  it("validates numbers", () => {
    expect(validateManualLine(row({ quantity: "-1" }))).toMatch(/Quantity/);
    expect(validateManualLine(row({ unitPrice: "1,5" }))).toMatch(/Unit price/);
    expect(validateManualLine(row({ box: "a" }))).toMatch(/Box/);
    expect(validateManualLine(row({ weight: "-2" }))).toMatch(/Weight/);
    expect(validateManualLine(row({ quantity: "", unitPrice: "" }))).toBeNull();
    expect(validateManualLine(null)).toBeTruthy();
  });
});

describe("payload builders", () => {
  it("buildManualAddStockLines dedupes and skips existing", () => {
    const rows = [row({ stockListId: 5, isStockLine: true })];
    expect(buildManualAddStockLines([5, 6, "6", 7, null, "x", false], rows)).toEqual([
      { stock_list_id: 6 },
      { stock_list_id: 7 },
    ]);
    expect(buildManualAddStockLines(null, null)).toEqual([]);
  });

  it("buildManualFreeTextLine sends numbers as numbers, empty as null", () => {
    expect(buildManualFreeTextLine(row({ description: " Rope ", box: "2", hsCode: " 1234 " }))).toEqual({
      description: "Rope",
      hs_code: "1234",
      quantity: 2,
      unit_price: 5,
      box: 2,
      weight: null,
    });
    expect(buildManualFreeTextLine(row({ quantity: "", unitPrice: "bad", hsCode: "" }))).toMatchObject({
      hs_code: null,
      quantity: null,
      unit_price: null,
    });
  });

  it("buildManualLineEdit returns only changed keys", () => {
    const base = row();
    expect(buildManualLineEdit(base, base)).toBeNull();
    expect(buildManualLineEdit(row({ quantity: "2.0" }), base)).toBeNull();
    expect(buildManualLineEdit(row({ quantity: "3", hsCode: "11" }), base)).toEqual({
      id: 1,
      quantity: 3,
      hs_code: "11",
    });
    expect(buildManualLineEdit(row({ quantity: "" }), base)).toEqual({ id: 1, quantity: null });
    expect(buildManualLineEdit(row({ unitPrice: "1,5" }), base)).toBeNull();
    expect(buildManualLineEdit(row({ id: null, quantity: "9" }), base)).toBeNull();
  });

  it("buildManualLineEdit never sends stock_list_id and limits value to stock lines", () => {
    const stockBase = row({ isStockLine: true, stockListId: 9, stockItemId: "SI" });
    const edit = buildManualLineEdit({ ...stockBase, description: "New", valueUsd: "8" }, stockBase);
    expect(edit).toEqual({ id: 1, description: "New", value_in_usd: 8 });
    expect(edit).not.toHaveProperty("stock_list_id");
    const free = buildManualLineEdit(row({ valueUsd: "8" }), row());
    expect(free).toBeNull();
  });

  it("delete and reset", () => {
    expect(buildManualLineDelete(row())).toEqual({ id: 1, delete: true });
    expect(buildManualLineDelete(row({ id: null }))).toBeNull();
    expect(buildManualResetLines([row(), row({ id: null }), row({ id: 3 })])).toEqual([
      { id: 1, delete: true },
      { id: 3, delete: true },
    ]);
    expect(buildManualResetLines(undefined)).toEqual([]);
  });

  it("buildManualPackedPayload", () => {
    expect(buildManualPackedPayload(4, { boxes: "2", kg: "3.5" })).toEqual({
      id: 4,
      total_packed_quantity: 2,
      total_packed_weight: 3.5,
      packed_as: { boxes: 2, kg: 3.5 },
    });
    expect(buildManualPackedPayload(4, { boxes: false, kg: "x" }).packed_as).toEqual({ boxes: 0, kg: 0 });
  });
});

describe("header", () => {
  it("buildManualHeaderFields sends only the vessel id", () => {
    expect(buildManualHeaderFields({ jobNo: " J-1 ", vesselId: { id: 3, name: "A" } })).toEqual({
      job_no: "J-1",
      vessel_id: 3,
    });
    expect(buildManualHeaderFields({ jobNo: false, vesselId: null })).toEqual({ job_no: "", vessel_id: null });
    expect(buildManualHeaderFields({ job_no: "X", vessel_id: "5" })).toEqual({ job_no: "X", vessel_id: 5 });
    expect(buildManualHeaderFields(undefined)).toEqual({ job_no: "", vessel_id: null });
  });

  it("manualHeaderSnapshot reads back from the API form", () => {
    expect(manualHeaderSnapshot({ job_no: "J", vessel_id: { id: 2, name: "B" } })).toEqual({
      job_no: "J",
      vessel_id: 2,
    });
    expect(manualHeaderSnapshot({ job_no: false, vessel_id: false })).toEqual({ job_no: "", vessel_id: null });
  });
});

describe("buildManualPdfRows", () => {
  it("builds head, body and total row", () => {
    const rows = [
      row({ isStockLine: true, stockItemId: "SI-1", description: "Valve", box: "1", weight: "2" }),
      row({ id: 2, quantity: "", unitPrice: "", valueUsd: "" }),
    ];
    const pdf = buildManualPdfRows(rows, { box: 1, weight: 2, value: 10 }, { value: "VALUE IN USD" });
    expect(pdf.head[0]).toHaveLength(7);
    expect(pdf.head[0][6]).toBe("VALUE IN USD");
    expect(pdf.body[0]).toEqual(["SI-1 - Valve", "", "2", "5", "1", "2", "10.00"]);
    expect(pdf.body[1][6]).toBe("-");
    expect(pdf.total).toEqual(["TOTAL", "", "2", "", "1", "2", "10.00"]);
  });

  it("falls back to local sums without backend totals", () => {
    const pdf = buildManualPdfRows([row({ box: "2" })], null);
    expect(pdf.total).toEqual(["TOTAL", "", "2", "", "2", "0", "10.00"]);
    expect(buildManualPdfRows(null, {}).body).toEqual([]);
  });
});
