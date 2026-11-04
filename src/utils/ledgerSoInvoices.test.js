import { filterSoInvoices, summarizeSoInvoices } from "./ledgerSoInvoices";

describe("ledgerSoInvoices", () => {
  test("filterSoInvoices keeps active invoices of the SO only", () => {
    const records = [
      { id: 1, sale_order_id: [5, "SO 5"] },
      { id: 2, sale_order_id: 5 },
      { id: 3, sale_order_id: [6, "SO 6"] },
      { id: 4, sale_order_id: [5, "SO 5"], is_cancelled: true },
      { id: 5, sale_order_id: false },
    ];
    expect(filterSoInvoices(records, 5).map((r) => r.id)).toEqual([1, 2]);
    expect(filterSoInvoices(null, 5)).toEqual([]);
  });

  test("summarizeSoInvoices totals USD amount and balance", () => {
    expect(
      summarizeSoInvoices([
        { usd_amount: 100.5, invoice_balance_usd: 40 },
        { usd_amount: "200", invoice_balance_usd: false },
      ])
    ).toEqual({ count: 2, usdAmount: 300.5, balanceUsd: 40 });
    expect(summarizeSoInvoices([])).toEqual({ count: 0, usdAmount: 0, balanceUsd: 0 });
  });
});
