import {
  applySavedRecord,
  buildRowUpdate,
  isRowDirty,
  markOtherAgentWarning,
  otherAgentCheckNeeded,
  patchEditRow,
  pickRecordsByIds,
  recordToEditRow,
  rowsToSave,
  saveSummary,
  shouldPreviewAuto,
} from "./ledgerEditRows";
import { isLedgerCancelled } from "./ledgerDisplay";
import * as cost from "views/admin/ledger/cost/ledgerCostUtils";
import * as invoice from "views/admin/ledger/invoice/ledgerInvoiceUtils";

const costAdapter = {
  recordToForm: cost.recordToForm,
  buildUpdatePayload: cost.buildUpdatePayload,
  getSignature: cost.getWritableCostSignature,
  applyComputedFromRecord: cost.applyComputedFromRecord,
  validate: cost.validateCostForm,
  isCancelled: isLedgerCancelled,
};

const invoiceAdapter = {
  recordToForm: invoice.recordToForm,
  buildUpdatePayload: invoice.buildUpdatePayload,
  getSignature: invoice.getWritableInvoiceSignature,
  applyComputedFromRecord: invoice.applyComputedFromRecord,
  validate: invoice.validateInvoiceForm,
  isCancelled: isLedgerCancelled,
};

const costRecord = (extra = {}) => ({
  id: 7,
  sale_order_id: [3, "SO-3"],
  agent_id: [4, "Agent"],
  currency_id: [1, "USD"],
  currency_amount: 100,
  invoice_number: "INV-1",
  internal_remarks: "",
  usd_cost: 100,
  ...extra,
});

const invoiceRecord = (extra = {}) => ({
  id: 9,
  sale_order_id: [3, "SO-3"],
  invoice_number: "S-1",
  currency_amount: 50,
  internal_remarks: "",
  ...extra,
});

describe.each([
  ["cost", costAdapter, costRecord, "internal_remarks"],
  ["invoice", invoiceAdapter, invoiceRecord, "internal_remarks"],
])("edit rows (%s adapter)", (_name, adapter, makeRecord, field) => {
  it("builds a clean row from a record", () => {
    const row = recordToEditRow(adapter, makeRecord());
    expect(row.key).toBe(String(row.id));
    expect(row.status).toBe("no_changes");
    expect(row.values).toEqual(row.baseline);
    expect(row.values).not.toBe(row.baseline);
    expect(isRowDirty(adapter, row)).toBe(false);
  });

  it("marks a cancelled record as cancelled and locked", () => {
    const row = recordToEditRow(adapter, makeRecord({ is_cancelled: true }));
    expect(row.status).toBe("cancelled");
    expect(patchEditRow(adapter, row, { [field]: "x" })).toBe(row);
    expect(rowsToSave(adapter, [row])).toEqual([]);
  });

  it("patch sets edited, clears the message, and reverts to no_changes", () => {
    let row = recordToEditRow(adapter, makeRecord());
    row = { ...row, status: "error", message: "boom" };
    row = patchEditRow(adapter, row, { [field]: "note" });
    expect(row.status).toBe("edited");
    expect(row.message).toBe("");
    expect(isRowDirty(adapter, row)).toBe(true);
    row = patchEditRow(adapter, row, { [field]: "" });
    expect(row.status).toBe("no_changes");
  });

  it("rowsToSave keeps dirty unlocked rows only", () => {
    const clean = recordToEditRow(adapter, makeRecord({ id: 1 }));
    const dirty = patchEditRow(adapter, recordToEditRow(adapter, makeRecord({ id: 2 })), {
      [field]: "a",
    });
    const saving = { ...dirty, key: "3", status: "saving" };
    const loadError = { ...dirty, key: "4", status: "load_error" };
    expect(rowsToSave(adapter, [clean, dirty, saving, loadError])).toEqual([dirty]);
  });

  it("buildRowUpdate returns a diff payload, or skip when only the id", () => {
    const row = recordToEditRow(adapter, makeRecord());
    expect(buildRowUpdate(adapter, row)).toEqual({ skip: true });
    const edited = patchEditRow(adapter, row, { [field]: "note" });
    expect(buildRowUpdate(adapter, edited)).toEqual({
      payload: { id: row.id, [field]: "note" },
    });
  });

  it("applySavedRecord resets baseline to the refetched record", () => {
    const row = patchEditRow(adapter, recordToEditRow(adapter, makeRecord()), {
      [field]: "note",
    });
    const saved = applySavedRecord(adapter, row, makeRecord({ [field]: "note" }));
    expect(saved.status).toBe("saved");
    expect(saved.baseline).toEqual(saved.values);
    expect(isRowDirty(adapter, saved)).toBe(false);
    expect(saved.record[field]).toBe("note");
  });

  it("applySavedRecord reports a record cancelled meanwhile", () => {
    const row = recordToEditRow(adapter, makeRecord());
    expect(applySavedRecord(adapter, row, makeRecord({ state: "cancelled" })).status).toBe(
      "cancelled"
    );
  });

  it("validate is reachable through the adapter", () => {
    const row = recordToEditRow(adapter, makeRecord());
    expect(adapter.validate(row.values, row.baseline)).toBeNull();
    const broken = patchEditRow(adapter, row, { sale_order_id: "" });
    expect(adapter.validate(broken.values, broken.baseline)).toMatch(/required/);
  });
});

describe("cost specifics", () => {
  it("keeps a manual ROE typed by the user after save", () => {
    const row = recordToEditRow(costAdapter, costRecord());
    const edited = patchEditRow(costAdapter, row, cost.roeInputPatch("2.5"));
    const { payload } = buildRowUpdate(costAdapter, edited);
    expect(payload.roe_invoice_date).toBe(2.5);
    const saved = applySavedRecord(costAdapter, edited, costRecord({ roe_invoice_date: 9 }));
    expect(saved.values.roe_invoice_date).toBe("2.5");
    expect(saved.values.roe_manual).toBe(true);
  });
});

describe("saveSummary", () => {
  const rows = [
    { key: "1", status: "saved" },
    { key: "2", status: "saved" },
    { key: "3", status: "error" },
    { key: "4", status: "duplicate" },
    { key: "5", status: "no_changes" },
  ];
  it("counts saved and attention rows", () => {
    expect(saveSummary(rows)).toEqual({
      saved: 2,
      attention: 2,
      text: "2 saved, 2 need attention",
    });
  });
  it("can scope to the rows of one save run", () => {
    expect(saveSummary(rows, ["1", "3"]).text).toBe("1 saved, 1 need attention");
  });
});

describe("shouldPreviewAuto", () => {
  it("never previews manual values", () => {
    expect(shouldPreviewAuto({ manual: true, value: "", inputsChanged: true })).toBe(false);
  });
  it("keeps a stored automatic value unless its inputs changed", () => {
    expect(shouldPreviewAuto({ manual: false, value: "1.2", inputsChanged: false })).toBe(false);
    expect(shouldPreviewAuto({ manual: false, value: "1.2", inputsChanged: true })).toBe(true);
  });
  it("previews when empty", () => {
    expect(shouldPreviewAuto({ manual: false, value: "", inputsChanged: false })).toBe(true);
    expect(shouldPreviewAuto({ manual: false, value: null, inputsChanged: false })).toBe(true);
  });
});

describe("other-agent check (AC13)", () => {
  const base = () => recordToEditRow(costAdapter, costRecord());

  it("is not needed while the invoice numbers match the baseline", () => {
    expect(otherAgentCheckNeeded(base())).toBe(false);
  });

  it("is needed when the numbers changed, and not again once accepted", () => {
    let row = patchEditRow(costAdapter, base(), { invoices: "INV-2" });
    expect(otherAgentCheckNeeded(row)).toBe(true);
    row = markOtherAgentWarning(row, "Used by Agent B");
    expect(row.status).toBe("check_invoice");
    expect(row.message).toBe("Used by Agent B");
    expect(otherAgentCheckNeeded(row)).toBe(false);
    // other cell edits keep the acceptance
    row = patchEditRow(costAdapter, row, { internal_remarks: "x" });
    expect(otherAgentCheckNeeded(row)).toBe(false);
  });

  it("re-checks when the numbers change after acceptance", () => {
    let row = markOtherAgentWarning(
      patchEditRow(costAdapter, base(), { invoices: "INV-2" }),
      "warn"
    );
    row = patchEditRow(costAdapter, row, { invoices: "INV-3" });
    expect(otherAgentCheckNeeded(row)).toBe(true);
  });

  it("is not needed when the numbers are cleared", () => {
    const row = patchEditRow(costAdapter, base(), { invoices: "  " });
    expect(otherAgentCheckNeeded(row)).toBe(false);
  });
});

describe("pickRecordsByIds", () => {
  test("keeps the requested order and returns null for missing ids", () => {
    const records = [{ id: 3 }, { id: 1 }];
    expect(pickRecordsByIds([1, 2, 3], records)).toEqual([{ id: 1 }, null, { id: 3 }]);
    expect(pickRecordsByIds([1], undefined)).toEqual([null]);
  });
});
