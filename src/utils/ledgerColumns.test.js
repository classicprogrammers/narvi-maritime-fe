import {
  COST_COLUMNS,
  INVOICE_COLUMNS,
  COST_TABLE_ENTRY_COLUMNS,
  INVOICE_TABLE_ENTRY_COLUMNS,
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
