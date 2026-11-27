import {
  COST_COLUMNS,
  INVOICE_COLUMNS,
  COST_TABLE_ENTRY_COLUMNS,
  INVOICE_TABLE_ENTRY_COLUMNS,
  COST_TABLE_EDIT_COLUMNS,
  INVOICE_TABLE_EDIT_COLUMNS,
  mergeServerColumns,
} from "./ledgerColumns";
import { COST_SORT_KEYS, INVOICE_SORT_KEYS } from "./ledgerListQuery";
import { emptyCostForm } from "views/admin/ledger/cost/ledgerCostUtils";
import { emptyInvoiceForm } from "views/admin/ledger/invoice/ledgerInvoiceUtils";

const coveredKeys = (columns) =>
  new Set(columns.flatMap((c) => [c.key, ...(c.covers || [])]));

describe("edit table columns", () => {
  const editable = (cols) => cols.filter((c) => !c.derived).map((c) => c.key);
  const entryEditable = (cols, readOnly) => cols.filter((c) => !c.derived && !readOnly.includes(c.key)).map((c) => c.key);

  test("cost editable keys are the entry columns minus SO Number and Invoice Number", () => {
    expect(editable(COST_TABLE_EDIT_COLUMNS)).toEqual(entryEditable(COST_TABLE_ENTRY_COLUMNS, ["sale_order_id", "invoices"]));
  });

  test("invoice editable keys are the entry columns minus SO Number and Invoice Number plus Issued By", () => {
    expect(editable(INVOICE_TABLE_EDIT_COLUMNS)).toEqual([
      "issued_by_id",
      ...entryEditable(INVOICE_TABLE_ENTRY_COLUMNS, ["sale_order_id", "invoice_number"]),
    ]);
  });

  test("Issued By follows Invoice Number in the list and the edit table", () => {
    const listKeys = INVOICE_COLUMNS.map((c) => c.key);
    expect(listKeys[listKeys.indexOf("invoice_number") + 1]).toBe("issued_by");
    const editKeys = INVOICE_TABLE_EDIT_COLUMNS.map((c) => c.key);
    expect(editKeys[editKeys.indexOf("invoice_number") + 1]).toBe("issued_by_id");
    expect(INVOICE_TABLE_EDIT_COLUMNS.find((c) => c.key === "issued_by_id")).toMatchObject({ type: "issuer" });
  });

  test("read-only columns are marked derived", () => {
    const derived = (cols) => cols.filter((c) => c.derived).map((c) => c.key);
    expect(derived(COST_TABLE_EDIT_COLUMNS)).toEqual(
      expect.arrayContaining(["sale_order_id", "invoices", "so_done_status", "client_case_invoice_ref", "client", "vessel_name", "usd_cost", "invoice_file"])
    );
    expect(derived(INVOICE_TABLE_EDIT_COLUMNS)).toEqual(
      expect.arrayContaining(["sale_order_id", "invoice_number", "so_done_status", "client_case_invoice_ref", "client", "vessel_name", "usd_amount", "invoice_balance", "payment_status"])
    );
    expect(COST_TABLE_EDIT_COLUMNS.find((c) => c.key === "sale_order_id")).toMatchObject({ type: "so" });
    expect(COST_TABLE_EDIT_COLUMNS.find((c) => c.key === "invoice_file")).toMatchObject({ type: "file" });
  });

  test("file column follows Invoice Number and keys are unique", () => {
    const keys = COST_TABLE_EDIT_COLUMNS.map((c) => c.key);
    expect(keys[keys.indexOf("invoices") + 1]).toBe("invoice_file");
    [COST_TABLE_EDIT_COLUMNS, INVOICE_TABLE_EDIT_COLUMNS].forEach((cols) => {
      const k = cols.map((c) => c.key);
      expect(new Set(k).size).toBe(k.length);
    });
  });
});

describe("ledgerColumns", () => {
  test("every sortKey is in the backend whitelist", () => {
    const costKeys = COST_COLUMNS.map((c) => c.sortKey).filter(Boolean);
    const invoiceKeys = INVOICE_COLUMNS.map((c) => c.sortKey).filter(Boolean);
    expect(costKeys.filter((k) => !COST_SORT_KEYS.includes(k))).toEqual([]);
    expect(invoiceKeys.filter((k) => !INVOICE_SORT_KEYS.includes(k))).toEqual([]);
  });

  test("cost list has a column for every form field", () => {
    const covered = coveredKeys(COST_COLUMNS);
    Object.keys(emptyCostForm()).forEach((key) => expect(covered.has(key)).toBe(true));
  });

  test("invoice list has a column for every form field", () => {
    const covered = coveredKeys(INVOICE_COLUMNS);
    Object.keys(emptyInvoiceForm()).forEach((key) => expect(covered.has(key)).toBe(true));
  });

  test("mergeServerColumns follows the server order and labels", () => {
    const merged = mergeServerColumns(
      [
        { key: "so_number", label: "SO" },
        { key: "agent_label", label: "Agent ID" },
        { key: "mystery", label: "Mystery" },
        { key: "agent_label", label: "dup" },
      ],
      COST_COLUMNS
    );
    expect(merged.map((c) => c.key)).toEqual(["so_number", "agent_label", "mystery"]);
    expect(merged[1]).toMatchObject({ label: "Agent ID", sortKey: "agent" });
    expect(merged[2]).toMatchObject({ type: "text", label: "Mystery" });
  });

  test("mergeServerColumns falls back to the local list", () => {
    expect(mergeServerColumns(undefined, COST_COLUMNS)).toBe(COST_COLUMNS);
    expect(mergeServerColumns([], COST_COLUMNS)).toBe(COST_COLUMNS);
  });

  test("column keys are unique", () => {
    [COST_COLUMNS, INVOICE_COLUMNS, COST_TABLE_ENTRY_COLUMNS, INVOICE_TABLE_ENTRY_COLUMNS].forEach((cols) => {
      const keys = cols.map((c) => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  test("entry columns map to form fields", () => {
    const costKeys = Object.keys(emptyCostForm());
    COST_TABLE_ENTRY_COLUMNS.filter((c) => !c.derived).forEach((c) => expect(costKeys).toContain(c.key));
    const invKeys = Object.keys(emptyInvoiceForm());
    INVOICE_TABLE_ENTRY_COLUMNS.filter((c) => !c.derived).forEach((c) => expect(invKeys).toContain(c.key));
  });
});
