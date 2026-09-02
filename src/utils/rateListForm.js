export const DEFAULT_RATE_FORM_ROW = {
  rate_type: "general",
  client_id: "",
  location_text: "",
  agent_id: "",
  currency_id: "",
  rate_name: "",
  rate_text: "",
  rate_float: "",
  rate_calculation: "",
  fixed_sales_rate: "",
  valid_until: "",
  remarks: "",
  sort_order: "",
  incl_in_tariff: false,
  import_group: "",
  last_update: "",
  active: true,
  rate_id: "",
};

/** API field names used in create/update payloads (form uses location_text internally). */
export const RATE_API_FIELDS = [
  "rate_type",
  "client_id",
  "currency_id",
  "location",
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

/** @deprecated Use RATE_API_FIELDS — kept for any external imports */
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

/** Normalize API/form dates to YYYY-MM-DD for `<Input type="date" />`. */
export function toDateInputValue(value) {
  if (value == null || String(value).trim() === "") return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dmy = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return text;
}

function valuesEqual(nextVal, prevVal) {
  if (nextVal === prevVal) return true;
  if (nextVal == null && prevVal == null) return true;
  if (
    typeof nextVal === "object" &&
    typeof prevVal === "object" &&
    nextVal?.id != null &&
    prevVal?.id != null
  ) {
    return String(nextVal.id) === String(prevVal.id);
  }
  return String(nextVal ?? "") === String(prevVal ?? "");
}

function normalizeRelationId(value, { asObject = false } = {}) {
  if (value === "" || value == null) return null;
  const id = Number(value);
  if (Number.isNaN(id)) return null;
  return asObject ? { id } : id;
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
    valid_until: toDateInputValue(item.valid_until),
    remarks: item.remarks || "",
    sort_order: item.sort_order ?? "",
    incl_in_tariff: Boolean(item.incl_in_tariff),
    import_group: item.import_group || "",
    last_update: toDateInputValue(item.last_update),
    active: item.active !== false,
  };
}

/**
 * Build API-shaped payload from a form row.
 * Uses `location` (not location_text) per backend contract.
 */
export function buildRateApiPayload(formRow, { forCreate = false } = {}) {
  const rateType = formRow.rate_type || "general";
  const payload = {};

  if (!forCreate && formRow.id) {
    payload.id = formRow.id;
  }

  payload.rate_type = rateType;

  if (rateType === "client_specific" && formRow.client_id) {
    payload.client_id = Number(formRow.client_id);
  } else if (!forCreate && rateType === "general") {
    payload.client_id = null;
  }

  const location = emptyToNull(formRow.location_text);
  if (location != null) {
    payload.location = location;
  }

  if (formRow.agent_id) {
    const agentId = normalizeRelationId(formRow.agent_id, {
      asObject: rateType === "client_specific",
    });
    if (agentId != null) {
      payload.agent_id = agentId;
    }
  } else if (!forCreate) {
    payload.agent_id = null;
  }

  if (formRow.currency_id) {
    payload.currency_id = Number(formRow.currency_id);
  }

  payload.rate_name = formRow.rate_name || "";

  const optionalScalars = {
    rate_text: emptyToNull(formRow.rate_text),
    rate_float: emptyToNull(formRow.rate_float),
    rate_calculation: emptyToNull(formRow.rate_calculation),
    fixed_sales_rate: emptyToNull(formRow.fixed_sales_rate),
    valid_until: emptyToNull(formRow.valid_until),
    last_update: emptyToNull(formRow.last_update),
    import_group: emptyToNull(formRow.import_group),
    remarks: emptyToNull(formRow.remarks),
  };

  Object.entries(optionalScalars).forEach(([key, value]) => {
    if (value != null || !forCreate) {
      payload[key] = value;
    }
  });

  const sortOrder =
    formRow.sort_order === "" || formRow.sort_order == null ? null : Number(formRow.sort_order);
  if (sortOrder != null || !forCreate) {
    payload.sort_order = sortOrder;
  }

  payload.incl_in_tariff = Boolean(formRow.incl_in_tariff);
  payload.active = formRow.active !== false;

  if (forCreate) {
    delete payload.id;
    if (rateType !== "client_specific") {
      delete payload.client_id;
    }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });
  }

  return payload;
}

export function buildRateCreatePayload(formRow) {
  return buildRateApiPayload(formRow, { forCreate: true });
}

/** @deprecated Use buildRateApiPayload / buildRateCreatePayload */
export function normalizeRateLineForApi(formRow) {
  return buildRateApiPayload(formRow);
}

export function buildRateUpdateLine(formRow, originalRow) {
  if (!formRow?.id) return null;

  const next = buildRateApiPayload(formRow);
  const prev = buildRateApiPayload(originalRow || {});
  delete next.id;
  delete prev.id;

  const line = { id: formRow.id };
  let hasChanges = false;

  RATE_API_FIELDS.forEach((field) => {
    const nextVal = next[field];
    const prevVal = prev[field];
    if (!valuesEqual(nextVal, prevVal)) {
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
