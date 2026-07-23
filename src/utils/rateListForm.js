export const RATE_FORM_FIELDS = [
  "rate_type",
  "client_id",
  "currency_id",
  "location_text",
  "agent_id",
  "rate_name",
  "rate_text",
  "rate_float",
  "rate_calculation",
  "fixed_sales_rate",
  "valid_until",
  "last_update",
  "sort_order",
  "import_group",
  "incl_in_tariff",
  "active",
  "remarks",
];

export function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

export function mapRateItemToFormRow(item) {
  const agentId = item.agent_id?.id ?? item.agent_id ?? "";
  return {
    id: item.id,
    rate_id: item.rate_id || "",
    rate_type: item.rate_type || "general",
    client_id: item.client_id?.id ?? item.client_id ?? "",
    location_text: item.location_text || item.location || "",
    agent_id: agentId === false ? "" : agentId,
    currency_id: item.currency_id?.id ?? item.currency_id ?? "",
    rate_name: item.rate_name || "",
    rate_text: item.rate_text || "",
    rate_float: item.rate_float === false || item.rate_float == null ? "" : String(item.rate_float),
    rate_calculation: item.rate_calculation || "",
    fixed_sales_rate:
      item.fixed_sales_rate === false || item.fixed_sales_rate == null
        ? ""
        : String(item.fixed_sales_rate),
    valid_until: item.valid_until || "",
    remarks: item.remarks || "",
    sort_order: item.sort_order ?? "",
    incl_in_tariff: Boolean(item.incl_in_tariff),
    import_group: item.import_group || "",
    last_update: item.last_update || "",
    active: item.active !== false,
  };
}

export function normalizeRateLineForApi(formRow) {
  const rateType = formRow.rate_type || "general";
  return {
    id: formRow.id,
    rate_type: rateType,
    client_id: rateType === "client_specific" ? Number(formRow.client_id) : null,
    currency_id: formRow.currency_id ? Number(formRow.currency_id) : null,
    agent_id: formRow.agent_id ? Number(formRow.agent_id) : null,
    location_text: emptyToNull(formRow.location_text),
    rate_name: formRow.rate_name || "",
    rate_text: emptyToNull(formRow.rate_text),
    rate_float: emptyToNull(formRow.rate_float),
    rate_calculation: emptyToNull(formRow.rate_calculation),
    fixed_sales_rate: emptyToNull(formRow.fixed_sales_rate),
    valid_until: emptyToNull(formRow.valid_until),
    last_update: emptyToNull(formRow.last_update),
    sort_order:
      formRow.sort_order === "" || formRow.sort_order == null ? null : Number(formRow.sort_order),
    import_group: emptyToNull(formRow.import_group),
    incl_in_tariff: Boolean(formRow.incl_in_tariff),
    active: Boolean(formRow.active),
    remarks: emptyToNull(formRow.remarks),
  };
}

export function buildRateUpdateLine(formRow, originalRow) {
  if (!formRow?.id) return null;

  const next = normalizeRateLineForApi(formRow);
  const prev = normalizeRateLineForApi(originalRow);
  const line = { id: formRow.id };
  let hasChanges = false;

  RATE_FORM_FIELDS.forEach((field) => {
    const nextVal = next[field];
    const prevVal = prev[field];
    const same =
      nextVal === prevVal ||
      (nextVal == null && prevVal == null) ||
      String(nextVal ?? "") === String(prevVal ?? "");
    if (!same) {
      line[field] = nextVal;
      hasChanges = true;
    }
  });

  return hasChanges ? line : null;
}

export function validateRateFormRow(formRow) {
  if (!formRow.rate_type) return "Rate type is required.";
  if (formRow.rate_type === "client_specific" && !formRow.client_id) {
    return "Client is required for client specific rates.";
  }
  if (!formRow.currency_id) return "Currency is required.";
  if (!formRow.rate_name?.trim()) return "Rate name is required.";
  return "";
}
