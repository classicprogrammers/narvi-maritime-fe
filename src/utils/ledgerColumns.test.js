import {
  COST_COLUMNS,
  INVOICE_COLUMNS,
  COST_TABLE_ENTRY_COLUMNS,
  INVOICE_TABLE_ENTRY_COLUMNS,
  mergeServerColumns,
} from "./ledgerColumns";
import { COST_SORT_KEYS, INVOICE_SORT_KEYS } from "./ledgerListQuery";
import { emptyCostForm } from "views/admin/ledger/cost/ledgerCostUtils";
import { emptyInvoiceForm } from "views/admin/ledger/invoice/ledgerInvoiceUtils";

const coveredKeys = (columns) =>
  new Set(columns.flatMap((c) => [c.key, ...(c.covers || [])]));

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
