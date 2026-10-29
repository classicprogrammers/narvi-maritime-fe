import {
  BULK_MAX_IDS,
  COST_BULK_FIELDS,
  INVOICE_BULK_FIELDS,
  BULK_FORBIDDEN_KEYS,
  buildBulkUpdatePayload,
  validateBulkSelection,
} from "./ledgerBulkEdit";

describe("ledgerBulkEdit", () => {
  test("lists never offer forbidden keys", () => {
    [...COST_BULK_FIELDS, ...INVOICE_BULK_FIELDS].forEach((f) =>
      expect(BULK_FORBIDDEN_KEYS).not.toContain(f.key)
    );
  });

  test("only enabled fields are sent, forbidden stripped, ids coerced", () => {
    const payload = buildBulkUpdatePayload(["1", 2], {
      biz_category: "bunker",
      so_number: "S1",
      invoices: "X",
      sale_order_id: 4,
      invoice_number: "I",
    });
    expect(payload).toEqual({ ids: [1, 2], values: { biz_category: "bunker" } });
  });

  test("automatic and empty values become clear values per type", () => {
    const { values } = buildBulkUpdatePayload([1], {
      roe_invoice_date: { auto: true },
      date_due_agent: { auto: true },
      date_agent_paid: "",
      gst_input_tax: "",
      agent_id: "",
      biz_category: "",
    });
    expect(values).toEqual({
      roe_invoice_date: null,
      date_due_agent: false,
      date_agent_paid: false,
      gst_input_tax: null,
      agent_id: null,
      biz_category: false,
    });
  });

  test("typed values are sent as numbers, ids and dates", () => {
    const { values } = buildBulkUpdatePayload([1], {
      roe_invoice_date: "1.25",
      agent_id: "12",
      date_due_agent: "2026-11-01",
    });
    expect(values).toEqual({ roe_invoice_date: 1.25, agent_id: 12, date_due_agent: "2026-11-01" });
  });

  test("validateBulkSelection", () => {
    expect(validateBulkSelection([])).toMatch(/at least one/);
    expect(validateBulkSelection(Array.from({ length: BULK_MAX_IDS }, (_, i) => i))).toBeNull();
    expect(validateBulkSelection(Array.from({ length: BULK_MAX_IDS + 1 }, (_, i) => i))).toMatch(/500/);
  });
});
