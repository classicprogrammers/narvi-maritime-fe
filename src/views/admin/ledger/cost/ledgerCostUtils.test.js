import {
  applyComputedFromRecord,
  buildCreatePayload,
  buildUpdatePayload,
  dueInputPatch,
  emptyCostForm,
  fillCostFromShippingOrder,
  getWritableCostSignature,
  recordToForm,
  roeInputPatch,
  validateCostForm,
} from "./ledgerCostUtils";

const base = () => ({
  ...emptyCostForm(),
  sale_order_id: 5,
  agent_id: 7,
  currency_amount: "100",
});

describe("ledgerCostUtils auto fields", () => {
  test("new form defaults to Shipspares", () => {
    expect(emptyCostForm().biz_category).toBe("Shipspares");
  });

  test("ROE is not required", () => {
    expect(validateCostForm(base())).toBeNull();
  });

  test("create omits automatic ROE and due date, sends manual ones", () => {
    const auto = buildCreatePayload({ ...base(), roe_invoice_date: "1.5", date_due_agent: "2026-11-01" });
    expect(auto).not.toHaveProperty("roe_invoice_date");
    expect(auto).not.toHaveProperty("date_due_agent");
    const manual = buildCreatePayload({
      ...base(),
      ...roeInputPatch("1.5"),
      ...dueInputPatch("2026-11-01"),
    });
    expect(manual.roe_invoice_date).toBe(1.5);
    expect(manual.date_due_agent).toBe("2026-11-01");
  });

  test("update sends null / false when manual values are cleared to automatic", () => {
    const original = { ...base(), ...roeInputPatch("2"), ...dueInputPatch("2026-11-01") };
    const form = { ...original, ...roeInputPatch(""), ...dueInputPatch("") };
    const payload = buildUpdatePayload(form, original, 9);
    expect(payload.roe_invoice_date).toBeNull();
    expect(payload.date_due_agent).toBe(false);
  });

  test("update ignores an automatic value shown from the server", () => {
    const original = { ...base(), roe_invoice_date: "1.2" };
    const form = { ...original, roe_invoice_date: "1.3" };
    expect(buildUpdatePayload(form, original, 9)).toEqual({ id: 9 });
  });

  test("typing 0 returns ROE to automatic", () => {
    expect(roeInputPatch("0").roe_manual).toBe(false);
  });

  test("automatic values are not part of the writable signature", () => {
    const a = getWritableCostSignature({ ...base(), roe_invoice_date: "1" });
    const b = getWritableCostSignature({ ...base(), roe_invoice_date: "2" });
    expect(a).toBe(b);
  });

  test("recordToForm maps new fields and treats ROE 0 as automatic", () => {
    const form = recordToForm({
      id: 1,
      roe_invoice_date: 0,
      roe_manual: true,
      date_due_agent: "2026-11-01",
      date_due_manual: true,
      so_done_status: "done",
      so_done_status_label: "Done",
      client_case_invoice_ref: "CC-1",
      destination_type_label: "Port",
      destination_name: "Dubai",
      destination_country: "UAE",
    });
    expect(form.roe_manual).toBe(false);
    expect(form.date_due_manual).toBe(true);
    expect(form.so_done_status_label).toBe("Done");
    expect(form.client_case_invoice_ref).toBe("CC-1");
    expect(form.destination_country).toBe("UAE");
  });

  test("applyComputedFromRecord keeps a typed manual ROE and takes server auto values", () => {
    const typed = { ...base(), ...roeInputPatch("3") };
    expect(applyComputedFromRecord(typed, { id: 1, roe_invoice_date: 9, roe_manual: false }).roe_invoice_date).toBe("3");
    const auto = applyComputedFromRecord(base(), { id: 1, roe_invoice_date: 9, roe_manual: false, roe_date: "2026-10-28" });
    expect(auto.roe_invoice_date).toBe("9");
    expect(auto.roe_manual).toBe(false);
    expect(auto.roe_date).toBe("2026-10-28");
  });

  test("fillCostFromShippingOrder fills and clears SO-derived fields", () => {
    const filled = fillCostFromShippingOrder({ so_id: "123", client_case_invoice_ref: "R1", so_done_status: "active" });
    expect(filled.so_number).toBe("123");
    expect(filled.client_case_invoice_ref).toBe("R1");
    expect(fillCostFromShippingOrder(null).client_case_invoice_ref).toBe("");
  });
});
