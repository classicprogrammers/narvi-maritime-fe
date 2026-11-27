import {
  applyComputedFromRecord,
  applyDueDateInput,
  applyRoeInput,
  buildCreatePayload,
  buildUpdatePayload,
  computeInvoicePreview,
  emptyInvoiceForm,
  fillFromShippingOrder,
  getWritableInvoiceSignature,
  INVOICE_BULK_FIELDS_UI,
  normalizeInvoiceBulkValues,
  recordToForm,
  validateInvoiceForm,
} from "./ledgerInvoiceUtils";

const baseForm = (over = {}) => ({
  ...emptyInvoiceForm(),
  sale_order_id: 7,
  invoice_number: "INV-1",
  currency_amount: "100",
  issued_by_id: "3",
  ...over,
});

describe("computeInvoicePreview", () => {
  test("USD amount is amount x ROE (USD per 1 unit)", () => {
    const out = computeInvoicePreview({ currency_amount: "100", roe: "0.25", client_amount_paid: "" });
    expect(out.usd_amount).toBe(25);
    expect(out.invoice_balance).toBe(25);
    expect(out.payment_status).toBe("open");
  });

  test("paid in full", () => {
    const out = computeInvoicePreview({ currency_amount: "100", roe: "0.25", client_amount_paid: "25" });
    expect(out.payment_status).toBe("paid");
  });

  test("blank without a usable ROE", () => {
    expect(computeInvoicePreview({ currency_amount: "100", roe: "" }).usd_amount).toBe("");
    expect(computeInvoicePreview({ currency_amount: "100", roe: "0" }).usd_amount).toBe("");
  });
});

describe("emptyInvoiceForm / validate", () => {
  test("defaults biz category to Shipspares and ROE to automatic", () => {
    const form = emptyInvoiceForm();
    expect(form.biz_category).toBe("Shipspares");
    expect(form.biz_category_label).toBe("Shipspares");
    expect(form.roe_manual).toBe(false);
    expect(form.date_due_manual).toBe(false);
  });

  test("ROE is no longer required", () => {
    expect(validateInvoiceForm(baseForm())).toBeNull();
    expect(validateInvoiceForm(baseForm({ roe: "0", roe_manual: true }))).toBeNull();
  });

  test("still requires SO, invoice number and amount", () => {
    expect(validateInvoiceForm(baseForm({ sale_order_id: "" }))).toMatch(/SO Number/);
    expect(validateInvoiceForm(baseForm({ invoice_number: " " }))).toMatch(/Invoice Number/);
    expect(validateInvoiceForm(baseForm({ currency_amount: "" }))).toMatch(/Currency Amount/);
  });
});

describe("recordToForm", () => {
  test("maps auto ROE, due date and new read-only fields", () => {
    const form = recordToForm({
      id: 1,
      roe: 0.25,
      roe_manual: false,
      roe_date: "2026-10-28 00:00:00",
      date_due: "2026-11-30",
      date_due_manual: false,
      client_id: [5, "Acme"],
      client_case_invoice_ref: "CASE-9",
      so_done_status: "pending_pod",
      so_done_status_label: "Pending POD",
      destination_type_label: "Port",
      destination_name: "Singapore",
      destination_country: "Singapore",
    });
    expect(form.roe).toBe("0.25");
    expect(form.roe_manual).toBe(false);
    expect(form.roe_date).toBe("2026-10-28");
    expect(form.date_due).toBe("2026-11-30");
    expect(form.date_due_manual).toBe(false);
    expect(form.client_id).toBe(5);
    expect(form.client_case_invoice_ref).toBe("CASE-9");
    expect(form.so_done_status_label).toBe("Pending POD");
    expect(form.destination_name).toBe("Singapore");
    expect(form.biz_category).toBe("Shipspares");
  });

  test("manual flag with zero ROE is treated as automatic", () => {
    const form = recordToForm({ id: 1, roe: 0, roe_manual: true });
    expect(form.roe).toBe("");
    expect(form.roe_manual).toBe(false);
  });

  test("manual values keep their flag; false values are empty", () => {
    const form = recordToForm({
      id: 1,
      roe: 0.3,
      roe_manual: true,
      date_due: "2026-12-01",
      date_due_manual: true,
      client_case_invoice_ref: false,
    });
    expect(form.roe_manual).toBe(true);
    expect(form.date_due_manual).toBe(true);
    expect(form.client_case_invoice_ref).toBe("");
  });
});

describe("payloads", () => {
  test("create omits automatic ROE and due date", () => {
    const payload = buildCreatePayload(baseForm({ roe: "0.25", date_due: "2026-11-30" }));
    expect(payload).not.toHaveProperty("roe");
    expect(payload).not.toHaveProperty("date_due");
  });

  test("create sends manual ROE and due date", () => {
    const payload = buildCreatePayload(
      baseForm({ roe: "0.3", roe_manual: true, date_due: "2026-12-01", date_due_manual: true })
    );
    expect(payload.roe).toBe(0.3);
    expect(payload.date_due).toBe("2026-12-01");
  });

  test("create skips a typed zero ROE", () => {
    expect(buildCreatePayload(baseForm({ roe: "0", roe_manual: true }))).not.toHaveProperty("roe");
  });

  test("update: clearing a manual ROE / due date goes back to automatic", () => {
    const original = baseForm({ roe: "0.3", roe_manual: true, date_due: "2026-12-01", date_due_manual: true });
    const form = { ...original, ...applyRoeInput(""), ...applyDueDateInput("") };
    const payload = buildUpdatePayload(form, original, 9);
    expect(payload.roe).toBeNull();
    expect(payload.date_due).toBe(false);
  });

  test("update: automatic values never produce a change", () => {
    const original = baseForm({ roe: "0.25", date_due: "2026-11-30" });
    const form = { ...original, roe: "0.26", date_due: "2026-12-05" };
    expect(buildUpdatePayload(form, original, 9)).toEqual({ id: 9 });
  });

  test("update: typing a value over an automatic one sends it", () => {
    const original = baseForm({ roe: "0.25" });
    const form = { ...original, ...applyRoeInput("0.25"), ...applyDueDateInput("2026-12-05") };
    const payload = buildUpdatePayload(form, original, 9);
    expect(payload.roe).toBe(0.25);
    expect(payload.date_due).toBe("2026-12-05");
  });

  test("signature ignores automatic values but tracks the manual flag", () => {
    const a = baseForm({ roe: "0.25" });
    const b = baseForm({ roe: "0.99" });
    expect(getWritableInvoiceSignature(a)).toBe(getWritableInvoiceSignature(b));
    expect(getWritableInvoiceSignature({ ...a, roe_manual: true })).not.toBe(getWritableInvoiceSignature(a));
  });
});

describe("issued by", () => {
  test("recordToForm handles number, false, pair and missing", () => {
    expect(recordToForm({ issued_by_id: 5, issued_by: "Ann" })).toMatchObject({ issued_by_id: "5", issued_by: "Ann" });
    expect(recordToForm({ issued_by_id: [6, "Bob"] })).toMatchObject({ issued_by_id: "6", issued_by: "Bob" });
    expect(recordToForm({ issued_by_id: false, issued_by: false })).toMatchObject({ issued_by_id: "", issued_by: "" });
    expect(recordToForm({}).issued_by_id).toBe("");
    expect(emptyInvoiceForm().issued_by_id).toBe("");
  });

  test("create always sends a numeric issued_by_id", () => {
    expect(buildCreatePayload(baseForm({ issued_by_id: "12" })).issued_by_id).toBe(12);
  });

  test("update sends issued_by_id only when changed and set", () => {
    const original = baseForm({ issued_by_id: "3" });
    expect(buildUpdatePayload({ ...original }, original, 9)).toEqual({ id: 9 });
    expect(buildUpdatePayload({ ...original, issued_by_id: "4" }, original, 9)).toEqual({ id: 9, issued_by_id: 4 });
    const old = baseForm({ issued_by_id: "" });
    expect(buildUpdatePayload({ ...old, issued_by_id: "8" }, old, 9).issued_by_id).toBe(8);
  });

  test("update never sends issued_by_id as null, false or empty", () => {
    const original = baseForm({ issued_by_id: "3" });
    ["", null, false, undefined].forEach((empty) => {
      const payload = buildUpdatePayload({ ...original, issued_by_id: empty }, original, 9);
      expect(payload).not.toHaveProperty("issued_by_id");
    });
    const old = baseForm({ issued_by_id: "" });
    expect(buildUpdatePayload({ ...old, invoice_number: "X" }, old, 9)).not.toHaveProperty("issued_by_id");
  });

  test("signature tracks issued_by_id and treats false like empty", () => {
    const a = baseForm({ issued_by_id: "3" });
    expect(getWritableInvoiceSignature(a)).not.toBe(getWritableInvoiceSignature({ ...a, issued_by_id: "4" }));
    expect(getWritableInvoiceSignature({ ...a, issued_by_id: false })).toBe(
      getWritableInvoiceSignature({ ...a, issued_by_id: "" })
    );
  });

  test("validate: required on create", () => {
    expect(validateInvoiceForm(baseForm({ issued_by_id: "" }))).toBe("Issued By is required.");
    expect(validateInvoiceForm(baseForm({ issued_by_id: "" }), null)).toBe("Issued By is required.");
    expect(validateInvoiceForm(baseForm())).toBeNull();
  });

  test("validate: old record without issuer saves without one", () => {
    const original = baseForm({ issued_by_id: "" });
    expect(validateInvoiceForm(baseForm({ issued_by_id: "" }), original)).toBeNull();
  });

  test("validate: an existing issuer cannot be cleared", () => {
    const original = baseForm({ issued_by_id: "3" });
    expect(validateInvoiceForm(baseForm({ issued_by_id: "" }), original)).toBe("Issued By cannot be cleared.");
    expect(validateInvoiceForm(baseForm({ issued_by_id: "4" }), original)).toBeNull();
  });

  test("validate: other errors come first", () => {
    expect(validateInvoiceForm(baseForm({ issued_by_id: "", sale_order_id: "" }))).toMatch(/SO Number/);
  });

  test("applyComputedFromRecord keeps the form issuer id and name when the record id differs", () => {
    const out = applyComputedFromRecord(baseForm({ issued_by_id: "9", issued_by: "Zed" }), {
      id: 1,
      issued_by_id: 3,
      issued_by: "Ann",
    });
    expect(out.issued_by_id).toBe("9");
    expect(out.issued_by).toBe("Zed");
  });

  test("applyComputedFromRecord refreshes the issuer name when the ids match", () => {
    const out = applyComputedFromRecord(baseForm({ issued_by_id: "3", issued_by: "" }), {
      id: 1,
      issued_by_id: 3,
      issued_by: "Ann",
    });
    expect(out.issued_by_id).toBe("3");
    expect(out.issued_by).toBe("Ann");
  });
});

describe("input helpers", () => {
  test("applyRoeInput", () => {
    expect(applyRoeInput("")).toEqual({ roe: "", roe_manual: false });
    expect(applyRoeInput("0.27")).toEqual({ roe: "0.27", roe_manual: true });
    expect(applyRoeInput("0")).toEqual({ roe: "0", roe_manual: true });
  });

  test("applyDueDateInput", () => {
    expect(applyDueDateInput("")).toEqual({ date_due: "", date_due_manual: false });
    expect(applyDueDateInput("2026-12-01")).toEqual({ date_due: "2026-12-01", date_due_manual: true });
  });
});

describe("fillFromShippingOrder", () => {
  test("maps client id, case ref, status and destination parts", () => {
    const out = fillFromShippingOrder({
      id: 3,
      so_id: 120,
      client_id: [8, "Client A"],
      client_case_invoice_ref: "REF-1",
      so_done_status: "done",
      so_done_status_label: "Done",
      destination: "Dubai, UAE",
      destination_type_label: "Port",
      destination_name: "Dubai",
      destination_country: "UAE",
    });
    expect(out.client_id).toBe(8);
    expect(out.client).toBe("Client A");
    expect(out.client_case_invoice_ref).toBe("REF-1");
    expect(out.so_done_status_label).toBe("Done");
    expect(out.destination_country).toBe("UAE");
    expect(out.biz_category).toBe("Shipspares");
  });

  test("clearing the SO clears derived fields but keeps the Shipspares default", () => {
    const out = fillFromShippingOrder(null);
    expect(out.client_id).toBe("");
    expect(out.client_case_invoice_ref).toBe("");
    expect(out.destination_name).toBe("");
    expect(out.biz_category).toBe("Shipspares");
  });
});

describe("applyComputedFromRecord", () => {
  const record = {
    id: 1,
    roe: 0.25,
    roe_manual: false,
    roe_date: "2026-10-28",
    date_due: "2026-11-30",
    date_due_manual: false,
    client_case_invoice_ref: "REF-2",
    so_done_status_label: "Active",
  };

  test("carries server auto values and read-only fields", () => {
    const out = applyComputedFromRecord(baseForm(), record);
    expect(out.roe).toBe("0.25");
    expect(out.roe_manual).toBe(false);
    expect(out.roe_date).toBe("2026-10-28");
    expect(out.date_due).toBe("2026-11-30");
    expect(out.client_case_invoice_ref).toBe("REF-2");
    expect(out.so_done_status_label).toBe("Active");
  });

  test("a manual value in the form wins over the server auto value", () => {
    const out = applyComputedFromRecord(
      baseForm({ roe: "0.4", roe_manual: true, date_due: "2027-01-01", date_due_manual: true }),
      record
    );
    expect(out.roe).toBe("0.4");
    expect(out.roe_manual).toBe(true);
    expect(out.date_due).toBe("2027-01-01");
    expect(out.date_due_manual).toBe(true);
  });
});

describe("bulk edit fields", () => {
  test("GST output and SOA are choices", () => {
    const gst = INVOICE_BULK_FIELDS_UI.find((f) => f.key === "gst_output_tax");
    const soa = INVOICE_BULK_FIELDS_UI.find((f) => f.key === "invoice_soa");
    expect(gst.type).toBe("select");
    expect(soa.type).toBe("select");
  });

  test("invoice_soa becomes a boolean", () => {
    expect(normalizeInvoiceBulkValues({ invoice_soa: "true" }).invoice_soa).toBe(true);
    expect(normalizeInvoiceBulkValues({ invoice_soa: "false" }).invoice_soa).toBe(false);
    expect(normalizeInvoiceBulkValues({ invoice_soa: false }).invoice_soa).toBe(false);
    expect(normalizeInvoiceBulkValues({ so_remark: "x" })).toEqual({ so_remark: "x" });
  });
});

describe("formatInvoiceNumberDuplicateMessage", () => {
  test("formats SO, user and DD/MM/YYYY date", () => {
    const { formatInvoiceNumberDuplicateMessage } = require("./ledgerInvoiceUtils");
    expect(
      formatInvoiceNumberDuplicateMessage({
        invoice: "654",
        so_number: "4364",
        booked_by: "admin",
        booked_on: "2026-09-09",
      })
    ).toBe("Invoice number 654 was already booked on SO-4364 by admin on 09/09/2026");
    expect(formatInvoiceNumberDuplicateMessage({ invoice: "7", so_number: "SO-12" })).toBe(
      "Invoice number 7 was already booked on SO-12"
    );
  });
});
