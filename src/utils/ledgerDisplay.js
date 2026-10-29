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
