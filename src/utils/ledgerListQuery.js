export const DEFAULT_LEDGER_SORT = { sortBy: "so_number", sortOrder: "desc" };

export const COST_SORT_KEYS = [
  "so_number",
  "agent",
  "client",
  "vessel_name",
  "destination",
  "currency_code",
  "currency_amount",
  "roe_invoice_date",
  "usd_cost",
  "invoices",
  "date_agent_invoice",
  "date_due_agent",
  "date_agent_paid",
  "biz_category",
  "so_done_status",
  "so_create_date",
];

export const INVOICE_SORT_KEYS = [
  "so_number",
  "client",
  "vessel_name",
  "destination",
  "invoice_number",
  "currency_code",
  "currency_amount",
  "roe",
  "usd_amount",
  "date_sales_invoice",
  "date_due",
  "date_paid",
  "client_amount_paid",
  "invoice_balance",
  "payment_status",
  "biz_category",
  "so_done_status",
  "so_create_date",
];

export const COST_DATE_FILTER_FIELDS = [
  { key: "date_agent_invoice", label: "Agent invoice" },
  { key: "date_due_agent", label: "Due" },
  { key: "date_agent_paid", label: "Paid" },
];

export const INVOICE_DATE_FILTER_FIELDS = [
  { key: "date_sales_invoice", label: "Sales invoice" },
  { key: "date_due", label: "Due" },
  { key: "date_paid", label: "Paid" },
];

export const isSortableKey = (kind, key) =>
  (kind === "invoice" ? INVOICE_SORT_KEYS : COST_SORT_KEYS).includes(key);

// Cycle: inactive -> asc -> desc -> asc
export const nextSortState = (current, key) => {
  if (current?.sortBy === key) {
    return { sortBy: key, sortOrder: current.sortOrder === "asc" ? "desc" : "asc" };
  }
  return { sortBy: key, sortOrder: "asc" };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidIsoDate = (value) => {
  if (!ISO_DATE.test(String(value || ""))) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

// ranges: { <field>_from, <field>_to }. Returns only non-empty valid params for the listed fields.
export const buildDateRangeParams = (ranges, fields) => {
  const params = {};
  (fields || []).forEach(({ key }) => {
    ["from", "to"].forEach((side) => {
      const name = `${key}_${side}`;
      const value = String(ranges?.[name] ?? "").trim();
      if (value && isValidIsoDate(value)) params[name] = value;
    });
  });
  return params;
};

// Returns { <fieldKey>: message } for invalid pairs; empty object when valid
export const validateDateRanges = (ranges, fields) => {
  const errors = {};
  (fields || []).forEach(({ key, label }) => {
    const from = String(ranges?.[`${key}_from`] ?? "").trim();
    const to = String(ranges?.[`${key}_to`] ?? "").trim();
    if (from && !isValidIsoDate(from)) {
      errors[key] = `${label}: From date is not a valid date`;
    } else if (to && !isValidIsoDate(to)) {
      errors[key] = `${label}: To date is not a valid date`;
    } else if (from && to && from > to) {
      errors[key] = "From date must be on or before To date";
    }
  });
  return errors;
};

// Number of fields with at least one side set
export const countActiveDateRanges = (ranges, fields) =>
  (fields || []).filter(
    ({ key }) => ranges?.[`${key}_from`] || ranges?.[`${key}_to`]
  ).length;

// Drop invalid persisted dates
export const sanitizeDateRanges = (ranges, fields) => buildDateRangeParams(ranges, fields);
