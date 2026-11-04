export const SO_DONE_STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "blue" },
  { value: "done", label: "Done", color: "green" },
  { value: "pending_pod", label: "Pending POD", color: "orange" },
  { value: "ready_for_invoice", label: "Ready for Invoice", color: "purple" },
  { value: "archive", label: "Archive", color: "gray" },
  { value: "cancelled", label: "Cancelled", color: "red" },
];

const clean = (v) => (v == null || v === false || v === "" ? "" : String(v).trim());

// so_done_status_label, then the label mapped from so_done_status, then "-"
export const soDoneStatusLabel = (record) => {
  const label = clean(record?.so_done_status_label);
  if (label) return label;
  const value = clean(record?.so_done_status);
  const match = SO_DONE_STATUS_OPTIONS.find((o) => o.value === value);
  return match ? match.label : value || "-";
};

export const soDoneStatusColor = (value) =>
  SO_DONE_STATUS_OPTIONS.find((o) => o.value === clean(value))?.color || "gray";

export const destinationParts = (record) => ({
  type: clean(record?.destination_type_label) || clean(record?.destination_type),
  name: clean(record?.destination_name),
  country: clean(record?.destination_country),
});

// Plain string for the select (filtering and selected label): the agent name
export const agentOptionLabel = (opt) =>
  clean(opt?.name) || (opt?.id != null ? `Agent ${opt.id}` : "");

// Smaller second line: "agent_code · company"
export const agentOptionSecondary = (opt) => {
  const label = agentOptionLabel(opt);
  const parts = [];
  [clean(opt?.agent_code), clean(opt?.company)].forEach((p) => {
    if (p && p !== label && !parts.includes(p)) parts.push(p);
  });
  return parts.join(" · ");
};

const relationName = (v) => {
  if (Array.isArray(v)) return clean(v[1]);
  if (v && typeof v === "object") return clean(v.name || v.label || v.display_name);
  return clean(v);
};

const viewNumber = (v) => {
  const text = clean(v);
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : text;
};

const viewDate = (v) => clean(v).split(" ")[0].slice(0, 10);

// Read-only text for one list column of a Cost / Invoice record ("" when empty)
export const ledgerViewValue = (column, record) => {
  const row = record || {};
  const key = column.key;
  switch (column.type) {
    case "date":
      return viewDate(row[key]);
    case "number":
      return viewNumber(row[key]);
    case "roe": {
      const roe = viewNumber(row[key]);
      return roe ? `${roe} (${row.roe_manual ? "manual" : "auto"})` : "";
    }
    case "due": {
      const due = viewDate(row[key]);
      return due ? `${due} (${row.date_due_manual ? "manual" : "auto"})` : "";
    }
    case "bool":
      return row[key] === true || row[key] === "true" ? "Yes" : "No";
    case "badge":
      if (key === "so_done_status") {
        const label = soDoneStatusLabel(row);
        return label === "-" ? "" : label;
      }
      return clean(row[`${key}_label`]) || clean(row[key]);
    default:
  }
  switch (key) {
    case "so_number":
      return relationName(row.sale_order_id) || clean(row.so_number);
    case "agent":
      return clean(row.agent) || relationName(row.agent_detail) || relationName(row.agent_id);
    case "client":
      return clean(row.client) || relationName(row.client_id);
    case "vessel_name":
      return clean(row.vessel_name) || relationName(row.vessel_id);
    case "biz_category":
      return clean(row.biz_category_label) || clean(row.biz_category);
    default:
      return clean(row[key]);
  }
};

// Cancelled Cost / Invoice records are read-only and stay out of bulk edit
export const isLedgerCancelled = (record) =>
  record?.is_cancelled === true || clean(record?.state) === "cancelled";

// "Cancelled by NAME on DATE" for the view dialog ("" when not cancelled)
export const ledgerCancelledText = (record) => {
  if (!isLedgerCancelled(record)) return "";
  const parts = ["Cancelled"];
  const by = relationName(record.cancelled_by);
  const on = viewDate(record.cancelled_on);
  if (by) parts.push(`by ${by}`);
  if (on) parts.push(`on ${on}`);
  return parts.join(" ");
};
