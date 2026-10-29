import {
  applyManualInput,
  diffAutoDate,
  diffAutoNumber,
  readAutoField,
  writableAutoValue,
} from "utils/ledgerAutoFields";

export const BIZ_CATEGORY_OPTIONS = [
  { value: "Shipspares", label: "Shipspares" },
  { value: "bunker", label: "Bunker" },
];

export const normalizeBizCategory = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw === "false") return "";
  const normalized = raw.toLowerCase();
  if (/shipsnare|shipspare|ship.?snare/.test(normalized)) return "Shipspares";
  const match = BIZ_CATEGORY_OPTIONS.find(
    (option) => option.value.toLowerCase() === normalized || option.label.toLowerCase() === normalized
  );
  return match ? match.value : raw;
};

export const bizCategoryDisplay = (value, apiLabel) => {
  const canonical = normalizeBizCategory(value || apiLabel);
  const match = BIZ_CATEGORY_OPTIONS.find((option) => option.value === canonical);
  if (match) return match.label;
  return apiLabel || value || "-";
};

export const emptyCostForm = () => ({
  sale_order_id: "",
  agent_id: "",
  currency_id: "",
  currency_amount: "",
  roe_invoice_date: "",
  roe_manual: false,
  roe_date: "",
  gst_input_tax: "",
  invoices: "",
  date_agent_invoice: "",
  date_due_agent: "",
  date_due_manual: false,
  date_agent_paid: "",
  invoice_link: "",
  biz_category: "Shipspares",
  so_number: "",
  client: "",
  vessel_name: "",
  destination: "",
  destination_type: "",
  destination_type_label: "",
  destination_name: "",
  destination_country: "",
  so_create_date: "",
  so_status: "",
  so_status_label: "",
  so_done_status: "",
  so_done_status_label: "",
  client_case_invoice_ref: "",
  agent_detail: null,
  currency_code: "",
  usd_cost: "",
  gst_in_amount: "",
});

export const getMany2oneId = (value) => {
  if (value == null || value === false || value === "") return null;
  if (Array.isArray(value)) {
    const id = value[0];
    if (id == null || id === false || id === "") return null;
    return id;
  }
  if (typeof value === "object") {
    const id = value.id ?? value.value;
    if (id == null || id === false || id === "") return null;
    return id;
  }
  return value;
};

export const getMany2oneName = (value) => {
  if (value == null || value === false || value === "") return "";
  if (Array.isArray(value)) {
    const name = value[1];
    if (name == null || name === false || name === "") return "";
    return String(name);
  }
  if (typeof value === "object") {
    return value.name || value.label || value.display_name || "";
  }
  return String(value);
};

export const toDateOnly = (value) => {
  if (value == null || value === false || value === "") return "";
  const text = String(value).trim();
  if (!text) return "";
  return text.split(" ")[0].slice(0, 10);
};

export const toNumericOrEmpty = (value) => {
  if (value == null || value === false || value === "") return "";
  return String(value);
};

export const toNumberOrNull = (value) => {
  if (value == null || value === false || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toIdOrNull = (value) => {
  const id = getMany2oneId(value);
  if (id == null) return null;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : id;
};

export const isShippingStatusOrder = (order) => {
  const status = String(order?.so_status ?? "")
    .trim()
    .toLowerCase();
  const label = String(order?.so_status_label ?? "")
    .trim()
    .toLowerCase();
  if (!status && !label) return true;
  return (
    status === "shipping" ||
    label === "shipping order" ||
    label.includes("shipping")
  );
};

export const formatSoLabel = (order) => {
  if (!order) return "";
  const num = order.so_id ?? order.so_number ?? order.name;
  if (num == null || num === false || num === "") {
    return order.id != null ? `SO-${order.id}` : "";
  }
  const str = String(num).trim();
  if (/^s?o[- ]?/i.test(str) || /^s\d/i.test(str)) return str;
  return `SO-${str}`;
};

export const formatCostNumber = (value, digits = 2) => {
  if (value == null || value === false || value === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
};

export const formatCostDate = (value) => {
  const date = toDateOnly(value);
  return date || "-";
};

export const isProbablyUrl = (value) =>
  /^https?:\/\//i.test(String(value || "").trim());

export const agentDisplayName = (agent) =>
  agent?.name ||
  agent?.agent_code ||
  agent?.agentsdb_id ||
  (agent?.id != null ? `Agent ${agent.id}` : "");

const textOrEmpty = (value) =>
  value && value !== false ? String(value) : "";

// SO-derived read-only fields from a shipping order picked in the SO select (null clears them)
export const fillCostFromShippingOrder = (order) => {
  const o = order || {};
  return {
    so_number: order
      ? o.so_id != null && o.so_id !== false
        ? String(o.so_id)
        : String(o.so_number || "").replace(/^SO[- ]?/i, "")
      : "",
    client: order
      ? getMany2oneName(o.client_id || o.partner_id) || o.client || o.client_name || ""
      : "",
    vessel_name: order
      ? getMany2oneName(o.vessel_id) || o.vessel_name || o.vessel || ""
      : "",
    destination: order
      ? o.destination || o.destination_name || getMany2oneName(o.destination_id) || ""
      : "",
    destination_type: textOrEmpty(o.destination_type),
    destination_type_label: textOrEmpty(o.destination_type_label),
    destination_name: textOrEmpty(o.destination_name),
    destination_country: textOrEmpty(o.destination_country),
    so_create_date: toDateOnly(
      o.so_create_date || o.create_date || o.date_created || o.date_order
    ),
    so_status: textOrEmpty(o.so_status),
    so_status_label: textOrEmpty(o.so_status_label),
    so_done_status: textOrEmpty(o.so_done_status),
    so_done_status_label: textOrEmpty(o.so_done_status_label),
    client_case_invoice_ref: textOrEmpty(o.client_case_invoice_ref),
  };
};

export const recordToForm = (record) => {
  if (!record) return emptyCostForm();
  const roe = readAutoField(record, "roe_invoice_date", "roe_manual");
  const dueDate = toDateOnly(record.date_due_agent);
  const dueManual = Boolean(record.date_due_manual) && Boolean(dueDate);
  return {
    sale_order_id: getMany2oneId(record.sale_order_id) ?? "",
    agent_id: getMany2oneId(record.agent_id) ?? "",
    currency_id: getMany2oneId(record.currency_id) ?? "",
    currency_amount: toNumericOrEmpty(record.currency_amount),
    roe_invoice_date: roe.value,
    roe_manual: roe.manual,
    roe_date: toDateOnly(record.roe_date),
    gst_input_tax: toNumericOrEmpty(record.gst_input_tax),
    invoices:
      record.invoices && record.invoices !== false
        ? String(record.invoices)
        : "",
    date_agent_invoice: toDateOnly(record.date_agent_invoice),
    date_due_agent: dueDate,
    date_due_manual: dueManual,
    date_agent_paid: toDateOnly(record.date_agent_paid),
    invoice_link:
      record.invoice_link && record.invoice_link !== false
        ? String(record.invoice_link)
        : "",
    biz_category: normalizeBizCategory(record.biz_category),
    so_number:
      record.so_number && record.so_number !== false
        ? String(record.so_number)
        : "",
    client: record.client || getMany2oneName(record.client_id) || "",
    vessel_name: record.vessel_name || getMany2oneName(record.vessel_id) || "",
    destination:
      record.destination && record.destination !== false
        ? String(record.destination)
        : "",
    destination_type: textOrEmpty(record.destination_type),
    destination_type_label: textOrEmpty(record.destination_type_label),
    destination_name: textOrEmpty(record.destination_name),
    destination_country: textOrEmpty(record.destination_country),
    so_create_date: toDateOnly(record.so_create_date),
    so_done_status: textOrEmpty(record.so_done_status),
    so_done_status_label: textOrEmpty(record.so_done_status_label),
    client_case_invoice_ref: textOrEmpty(record.client_case_invoice_ref),
    agent_detail:
      record.agent_detail && typeof record.agent_detail === "object"
        ? record.agent_detail
        : null,
    so_status:
      record.so_status && record.so_status !== false
        ? String(record.so_status)
        : "",
    so_status_label:
      record.so_status_label && record.so_status_label !== false
        ? String(record.so_status_label)
        : "",
    currency_code:
      record.currency_code || getMany2oneName(record.currency_id) || "",
    usd_cost: toNumericOrEmpty(record.usd_cost),
    gst_in_amount: toNumericOrEmpty(record.gst_in_amount),
  };
};

const sameValue = (a, b) => {
  const normalize = (val) => {
    if (val == null || val === false || val === "") return "";
    return String(val).trim();
  };
  return normalize(a) === normalize(b);
};

const sameNumber = (a, b) => {
  const na = toNumberOrNull(a);
  const nb = toNumberOrNull(b);
  if (na == null && nb == null) return true;
  return na === nb;
};

const sameId = (a, b) => {
  const ia = toIdOrNull(a);
  const ib = toIdOrNull(b);
  if (ia == null && ib == null) return true;
  return String(ia) === String(ib);
};

export const buildCreatePayload = (form) => {
  const payload = {
    sale_order_id: toIdOrNull(form.sale_order_id),
    agent_id: toIdOrNull(form.agent_id),
    currency_amount: toNumberOrNull(form.currency_amount),
  };
  // Automatic ROE / due date are never sent: the server fills them
  const roe = toNumberOrNull(writableAutoValue(form, "roe_invoice_date", "roe_manual"));
  if (roe != null) payload.roe_invoice_date = roe;
  const currencyId = toIdOrNull(form.currency_id);
  if (currencyId != null) payload.currency_id = currencyId;
  const gst = toNumberOrNull(form.gst_input_tax);
  if (gst != null) payload.gst_input_tax = gst;
  if (form.invoices) payload.invoices = form.invoices;
  if (form.date_agent_invoice)
    payload.date_agent_invoice = form.date_agent_invoice;
  const due = writableAutoValue(form, "date_due_agent", "date_due_manual");
  if (due) payload.date_due_agent = due;
  if (form.date_agent_paid) payload.date_agent_paid = form.date_agent_paid;
  if (form.invoice_link) payload.invoice_link = form.invoice_link.trim();
  if (form.biz_category) payload.biz_category = normalizeBizCategory(form.biz_category);
  return payload;
};

export const buildUpdatePayload = (form, originalForm, recordId) => {
  const payload = { id: recordId };
  if (!sameId(form.sale_order_id, originalForm.sale_order_id)) {
    payload.sale_order_id = toIdOrNull(form.sale_order_id);
  }
  if (!sameId(form.agent_id, originalForm.agent_id)) {
    payload.agent_id = toIdOrNull(form.agent_id);
  }
  if (!sameId(form.currency_id, originalForm.currency_id)) {
    payload.currency_id = toIdOrNull(form.currency_id);
  }
  if (!sameNumber(form.currency_amount, originalForm.currency_amount)) {
    payload.currency_amount = toNumberOrNull(form.currency_amount);
  }
  const roeDiff = diffAutoNumber(form, originalForm, "roe_invoice_date", "roe_manual");
  if (roeDiff !== undefined) payload.roe_invoice_date = roeDiff;
  if (!sameNumber(form.gst_input_tax, originalForm.gst_input_tax)) {
    payload.gst_input_tax = toNumberOrNull(form.gst_input_tax);
  }
  if (!sameValue(form.invoices, originalForm.invoices)) {
    payload.invoices = form.invoices || false;
  }
  if (!sameValue(form.date_agent_invoice, originalForm.date_agent_invoice)) {
    payload.date_agent_invoice = form.date_agent_invoice || false;
  }
  const dueDiff = diffAutoDate(form, originalForm, "date_due_agent", "date_due_manual");
  if (dueDiff !== undefined) payload.date_due_agent = dueDiff;
  if (!sameValue(form.date_agent_paid, originalForm.date_agent_paid)) {
    payload.date_agent_paid = form.date_agent_paid || false;
  }
  if (!sameValue(form.invoice_link, originalForm.invoice_link)) {
    payload.invoice_link = form.invoice_link.trim() || false;
  }
  if (!sameValue(normalizeBizCategory(form.biz_category), normalizeBizCategory(originalForm.biz_category))) {
    payload.biz_category = normalizeBizCategory(form.biz_category) || false;
  }
  return payload;
};

export const validateCostForm = (form) => {
  if (toIdOrNull(form.sale_order_id) == null) {
    return "SO Number is required.";
  }
  if (toIdOrNull(form.agent_id) == null) {
    return "Agent is required.";
  }
  if (toNumberOrNull(form.currency_amount) == null) {
    return "Currency Amount is required.";
  }
  return null;
};

export const getWritableCostFields = (form) => ({
  sale_order_id: toIdOrNull(form?.sale_order_id) ?? "",
  agent_id: toIdOrNull(form?.agent_id) ?? "",
  currency_id: toIdOrNull(form?.currency_id) ?? "",
  currency_amount: toNumberOrNull(form?.currency_amount) ?? "",
  roe_invoice_date:
    toNumberOrNull(writableAutoValue(form, "roe_invoice_date", "roe_manual")) ?? "",
  roe_manual: Boolean(form?.roe_manual),
  gst_input_tax: toNumberOrNull(form?.gst_input_tax) ?? "",
  invoices: String(form?.invoices || "").trim(),
  date_agent_invoice: form?.date_agent_invoice || "",
  date_due_agent: writableAutoValue(form, "date_due_agent", "date_due_manual") || "",
  date_due_manual: Boolean(form?.date_due_manual),
  date_agent_paid: form?.date_agent_paid || "",
  invoice_link: String(form?.invoice_link || "").trim(),
  biz_category: normalizeBizCategory(form?.biz_category),
});

export const getWritableCostSignature = (form) =>
  JSON.stringify(getWritableCostFields(form));

export const applyComputedFromRecord = (form, record) => {
  if (!record) return form;
  const fromApi = recordToForm(record);
  // A value the user typed (manual) wins over what the server echoes back
  const roe = form.roe_manual
    ? {}
    : { roe_invoice_date: fromApi.roe_invoice_date, roe_manual: fromApi.roe_manual };
  const due = form.date_due_manual
    ? {}
    : { date_due_agent: fromApi.date_due_agent, date_due_manual: fromApi.date_due_manual };
  return {
    ...form,
    ...roe,
    ...due,
    roe_date: fromApi.roe_date,
    so_number: fromApi.so_number,
    client: fromApi.client,
    vessel_name: fromApi.vessel_name,
    destination: fromApi.destination,
    destination_type: fromApi.destination_type,
    destination_type_label: fromApi.destination_type_label,
    destination_name: fromApi.destination_name,
    destination_country: fromApi.destination_country,
    so_create_date: fromApi.so_create_date,
    so_status: fromApi.so_status,
    so_status_label: fromApi.so_status_label,
    so_done_status: fromApi.so_done_status,
    so_done_status_label: fromApi.so_done_status_label,
    client_case_invoice_ref: fromApi.client_case_invoice_ref,
    agent_detail: fromApi.agent_detail,
    currency_code: fromApi.currency_code,
    usd_cost: fromApi.usd_cost,
    gst_in_amount: fromApi.gst_in_amount,
  };
};

// Typed ROE / due text -> form patch (empty or 0 returns the field to automatic)
export const roeInputPatch = (text) => {
  const { value, manual } = applyManualInput(text);
  return { roe_invoice_date: value, roe_manual: manual, usd_cost: "" };
};

export const dueInputPatch = (text) => {
  const value = String(text ?? "").trim();
  return { date_due_agent: value, date_due_manual: Boolean(value) };
};

export const extractLedgerCostRecord = (response) => {
  if (response == null) return null;
  const candidates = [
    response.data,
    response.result?.data,
    response.record,
    response.result,
    response,
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate) &&
      candidate.id != null
    ) {
      return candidate;
    }
  }
  return null;
};

export const extractApiMessage = (error, fallback) =>
  error?.response?.data?.result?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;
