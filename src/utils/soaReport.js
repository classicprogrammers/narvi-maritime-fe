import { formatDateDMY } from "utils/dateFormat";

// Statement of Account (SOA): outstanding sales invoices of one currency, up to a chosen date.
// Built from the Invoice DB rows; no SOA endpoint is involved.

export const SOA_COLUMNS = [
  { key: "client", label: "Client", type: "text" },
  { key: "currency", label: "Currency", type: "text" },
  { key: "dateInvoice", label: "Date Invoice", type: "date" },
  { key: "invoiceNumber", label: "Invoice Number", type: "text" },
  { key: "billingRef", label: "Customer Billing Ref.", type: "text" },
  { key: "vesselName", label: "Vessel Name", type: "text" },
  { key: "dateDue", label: "Date Due Customer", type: "date" },
  { key: "amount", label: "Invoice Amount", type: "number" },
  { key: "balance", label: "Account Balance", type: "number" },
];

// Static company block printed on every SOA (from the client's SOA sample).
export const SOA_BANK_DETAILS = {
  title: "Banking Details",
  lines: ["DBS Bank Ltd", "ASIA Central MBFC Tower 3", "12 Marina Boulevard", "018982 Singapore"],
  extra: ["GST Reg. No. 202008258Z", "Account number : 0339059927(USD)", "SWIFT Code/BIG : DBSSSGSG"],
};

const clean = (value) => (value == null || value === false ? "" : String(value).trim());

const nameOf = (value) => {
  if (value == null || value === false || value === "") return "";
  if (Array.isArray(value)) return clean(value[1]);
  if (typeof value === "object") return clean(value.name || value.display_name || value.label);
  return clean(value);
};

const toNumber = (value) => {
  if (value == null || value === false || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Money is summed in cents so that 0.1 + 0.2 style float drift never reaches the grand total.
const round2 = (value) => Math.round(value * 100) / 100;

export const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value));

const isCancelled = (row) => row?.is_cancelled === true || clean(row?.state) === "cancelled";

// An invoice marked Paid is never outstanding, even if its balance field was not zeroed.
const isPaid = (row) => clean(row?.payment_status).toLowerCase() === "paid";

export const invoiceCurrency = (row) => clean(row?.currency_code) || nameOf(row?.currency_id);

/** Sorted, unique currency codes found in the invoice rows. */
export function listSoaCurrencies(rows = []) {
  const set = new Set();
  rows.forEach((row) => {
    const code = invoiceCurrency(row);
    if (code) set.add(code);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/**
 * Rows of one SOA: the currency's invoices dated on or before `asOfDate` (YYYY-MM-DD) that still carry a balance.
 * Cancelled and fully paid invoices are left out. Sorted by client, then invoice date, then invoice number.
 */
export function buildSoaRows(invoices = [], { currency, asOfDate } = {}) {
  const wanted = clean(currency);
  return invoices
    .filter((row) => {
      if (isCancelled(row) || isPaid(row)) return false;
      if (wanted && invoiceCurrency(row) !== wanted) return false;
      const invoiceDate = clean(row.date_sales_invoice).slice(0, 10);
      if (isIsoDate(asOfDate) && invoiceDate && invoiceDate > asOfDate) return false;
      return round2(toNumber(row.invoice_balance)) > 0;
    })
    .map((row) => ({
      id: row.id,
      client: clean(row.client) || nameOf(row.client_id),
      currency: invoiceCurrency(row),
      dateInvoice: clean(row.date_sales_invoice).slice(0, 10),
      invoiceNumber: clean(row.invoice_number),
      billingRef: clean(row.client_case_invoice_ref),
      vesselName: clean(row.vessel_name) || nameOf(row.vessel_id),
      dateDue: clean(row.date_due).slice(0, 10),
      amount: round2(toNumber(row.currency_amount)),
      balance: round2(toNumber(row.invoice_balance)),
    }))
    .sort(
      (a, b) =>
        a.client.localeCompare(b.client) ||
        a.dateInvoice.localeCompare(b.dateInvoice) ||
        a.invoiceNumber.localeCompare(b.invoiceNumber)
    );
}

export function soaGrandTotal(rows = []) {
  return {
    amount: round2(rows.reduce((sum, row) => sum + row.amount, 0)),
    balance: round2(rows.reduce((sum, row) => sum + row.balance, 0)),
  };
}

export const formatSoaMoney = (value) =>
  Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cellText = (row, column) => {
  const value = row[column.key];
  if (column.type === "number") return formatSoaMoney(value);
  if (column.type === "date") return value ? formatDateDMY(value) : "-";
  return value || "-";
};

/** Printable table (PDF and Excel share it): header labels, body rows and the grand total row. */
export function buildSoaTable(rows = []) {
  const total = soaGrandTotal(rows);
  const head = SOA_COLUMNS.map((column) => column.label);
  const body = rows.map((row) => SOA_COLUMNS.map((column) => cellText(row, column)));
  const totalRow = SOA_COLUMNS.map((column) => {
    if (column.key === "client") return "Grand Total";
    if (column.key === "amount") return formatSoaMoney(total.amount);
    if (column.key === "balance") return formatSoaMoney(total.balance);
    return "";
  });
  return { head, body, totalRow, total };
}

export function soaFilenameBase({ currency, asOfDate, clientName } = {}) {
  const safe = (text) => clean(text).replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return ["SOA", safe(clientName), safe(currency), isIsoDate(asOfDate) ? asOfDate : ""].filter(Boolean).join("-");
}
