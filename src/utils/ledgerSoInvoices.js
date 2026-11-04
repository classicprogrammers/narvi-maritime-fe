import { isLedgerCancelled } from "./ledgerDisplay";

const soIdOf = (record) => {
  const v = record?.sale_order_id;
  const id = Array.isArray(v) ? v[0] : v && typeof v === "object" ? v.id : v;
  return id == null || id === false ? "" : String(id);
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Active invoices that belong to the given Shipping Order
export const filterSoInvoices = (records, soId) =>
  (Array.isArray(records) ? records : []).filter(
    (r) => !isLedgerCancelled(r) && soIdOf(r) === String(soId)
  );

// Totals shown under the Shipping Order's invoice list (USD)
export const summarizeSoInvoices = (records) =>
  (records || []).reduce(
    (sum, r) => ({
      count: sum.count + 1,
      usdAmount: sum.usdAmount + num(r.usd_amount),
      balanceUsd: sum.balanceUsd + num(r.invoice_balance_usd),
    }),
    { count: 0, usdAmount: 0, balanceUsd: 0 }
  );
