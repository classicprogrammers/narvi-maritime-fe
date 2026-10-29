export const BULK_MAX_IDS = 500;

export const BULK_FORBIDDEN_KEYS = ["sale_order_id", "so_number", "invoices", "invoice_number"];

// type: select | agent | currency | number | date | text | textarea
// auto: field can be set back to automatic (number -> null, date -> false)
export const COST_BULK_FIELDS = [
  {
    key: "biz_category",
    label: "Biz Category",
    type: "select",
    options: [
      { value: "Shipspares", label: "Shipspares" },
      { value: "bunker", label: "Bunker" },
    ],
  },
  { key: "agent_id", label: "Agent", type: "agent" },
  { key: "currency_id", label: "Currency", type: "currency" },
  { key: "roe_invoice_date", label: "ROE on Invoice Date", type: "number", auto: true },
  { key: "gst_input_tax", label: "GST Input Tax %", type: "number" },
  { key: "date_agent_invoice", label: "Agent Invoice Date", type: "date" },
  { key: "date_due_agent", label: "Due Date", type: "date", auto: true },
  { key: "date_agent_paid", label: "Agent Paid Date", type: "date" },
];

export const INVOICE_BULK_FIELDS = [
  { key: "currency_id", label: "Currency", type: "currency" },
  { key: "roe", label: "ROE", type: "number", auto: true },
  { key: "date_sales_invoice", label: "Sales Invoice Date", type: "date" },
  { key: "date_due", label: "Due Date", type: "date", auto: true },
  { key: "date_paid", label: "Paid Date", type: "date" },
  { key: "gst_output_tax", label: "GST Output Tax %", type: "number" },
  { key: "invoice_soa", label: "Invoice SOA", type: "text" },
  { key: "customer_billing_remarks", label: "Customer Billing Remarks", type: "textarea" },
  { key: "payment_remark", label: "Payment Remark", type: "textarea" },
  { key: "so_remark", label: "SO Remark", type: "textarea" },
];

const FIELD_LOOKUP = [...COST_BULK_FIELDS, ...INVOICE_BULK_FIELDS].reduce((acc, f) => {
  acc[f.key] = f;
  return acc;
}, {});

const isEmpty = (v) => v == null || v === "" || v === false;

const coerceId = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v != null ? n : v;
};

// Value to send for one enabled field. Automatic or empty -> clear value for its type.
const valueForField = (field, raw) => {
  const type = field?.type;
  const wantsAuto = raw && typeof raw === "object" && raw.auto === true;
  const value = raw && typeof raw === "object" ? raw.value : raw;
  if (type === "number") {
    if (wantsAuto || isEmpty(value)) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return field?.auto && n === 0 ? null : n;
  }
  if (type === "agent" || type === "currency") {
    return isEmpty(value) ? null : coerceId(value);
  }
  if (type === "date") {
    return wantsAuto || isEmpty(value) ? false : String(value);
  }
  // select, text, textarea (and unknown keys)
  return isEmpty(value) ? false : value;
};

// enabledValues: { [key]: value | { value } | { auto: true } } for ticked fields only
export const buildBulkUpdatePayload = (ids, enabledValues, fields) => {
  const lookup = fields
    ? fields.reduce((acc, f) => ({ ...acc, [f.key]: f }), {})
    : FIELD_LOOKUP;
  const values = {};
  Object.keys(enabledValues || {}).forEach((key) => {
    if (BULK_FORBIDDEN_KEYS.includes(key)) return;
    values[key] = valueForField(lookup[key], enabledValues[key]);
  });
  return { ids: (ids || []).map(coerceId), values };
};

// Returns an error message or null
export const validateBulkSelection = (ids) => {
  const count = (ids || []).length;
  if (count === 0) return "Select at least one record.";
  if (count > BULK_MAX_IDS) {
    return `Bulk edit supports up to ${BULK_MAX_IDS} records. Clear some rows.`;
  }
  return null;
};
