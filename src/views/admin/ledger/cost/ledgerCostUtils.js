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
  gst_input_tax: "",
  invoices: "",
  date_agent_invoice: "",
  date_due_agent: "",
  date_agent_paid: "",
  invoice_link: "",
  biz_category: "",
  so_number: "",
  client: "",
  vessel_name: "",
  destination: "",
  so_create_date: "",
  so_status: "",
  so_status_label: "",
  currency_code: "",
  usd_cost: "",
  gst_in_amount: "",
});

export const getMany2oneId = (value) => {
  if (value == null || value === false || value === "") return null;
  if (typeof value === "object") {
    const id = value.id ?? value.value;
    if (id == null || id === false || id === "") return null;
    return id;
  }
  return value;
};

export const getMany2oneName = (value) => {
  if (value == null || value === false || value === "") return "";
  if (typeof value === "object") {
    return value.name || value.label || "";
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

export const recordToForm = (record) => {
  if (!record) return emptyCostForm();
  return {
    sale_order_id: getMany2oneId(record.sale_order_id) ?? "",
    agent_id: getMany2oneId(record.agent_id) ?? "",
    currency_id: getMany2oneId(record.currency_id) ?? "",
    currency_amount: toNumericOrEmpty(record.currency_amount),
    roe_invoice_date: toNumericOrEmpty(record.roe_invoice_date),
    gst_input_tax: toNumericOrEmpty(record.gst_input_tax),
    invoices:
      record.invoices && record.invoices !== false
        ? String(record.invoices)
        : "",
    date_agent_invoice: toDateOnly(record.date_agent_invoice),
    date_due_agent: toDateOnly(record.date_due_agent),
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
    so_create_date: toDateOnly(record.so_create_date),
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
    roe_invoice_date: toNumberOrNull(form.roe_invoice_date),
  };
  const currencyId = toIdOrNull(form.currency_id);
  if (currencyId != null) payload.currency_id = currencyId;
  const gst = toNumberOrNull(form.gst_input_tax);
  if (gst != null) payload.gst_input_tax = gst;
  if (form.invoices) payload.invoices = form.invoices;
  if (form.date_agent_invoice)
    payload.date_agent_invoice = form.date_agent_invoice;
  if (form.date_due_agent) payload.date_due_agent = form.date_due_agent;
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
  if (!sameNumber(form.roe_invoice_date, originalForm.roe_invoice_date)) {
    payload.roe_invoice_date = toNumberOrNull(form.roe_invoice_date);
  }
  if (!sameNumber(form.gst_input_tax, originalForm.gst_input_tax)) {
    payload.gst_input_tax = toNumberOrNull(form.gst_input_tax);
  }
  if (!sameValue(form.invoices, originalForm.invoices)) {
    payload.invoices = form.invoices || false;
  }
  if (!sameValue(form.date_agent_invoice, originalForm.date_agent_invoice)) {
    payload.date_agent_invoice = form.date_agent_invoice || false;
  }
  if (!sameValue(form.date_due_agent, originalForm.date_due_agent)) {
    payload.date_due_agent = form.date_due_agent || false;
  }
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
  if (toNumberOrNull(form.roe_invoice_date) == null) {
    return "Rate of Exchange on Invoice Date is required.";
  }
  if (Number(form.roe_invoice_date) === 0) {
    return "Rate of Exchange on Invoice Date cannot be zero.";
  }
  return null;
};

export const getWritableCostFields = (form) => ({
  sale_order_id: toIdOrNull(form?.sale_order_id) ?? "",
  agent_id: toIdOrNull(form?.agent_id) ?? "",
  currency_id: toIdOrNull(form?.currency_id) ?? "",
  currency_amount: toNumberOrNull(form?.currency_amount) ?? "",
  roe_invoice_date: toNumberOrNull(form?.roe_invoice_date) ?? "",
  gst_input_tax: toNumberOrNull(form?.gst_input_tax) ?? "",
  invoices: String(form?.invoices || "").trim(),
  date_agent_invoice: form?.date_agent_invoice || "",
  date_due_agent: form?.date_due_agent || "",
  date_agent_paid: form?.date_agent_paid || "",
  invoice_link: String(form?.invoice_link || "").trim(),
  biz_category: normalizeBizCategory(form?.biz_category),
});

export const getWritableCostSignature = (form) =>
  JSON.stringify(getWritableCostFields(form));

export const applyComputedFromRecord = (form, record) => {
  if (!record) return form;
  const fromApi = recordToForm(record);
  return {
    ...form,
    so_number: fromApi.so_number,
    client: fromApi.client,
    vessel_name: fromApi.vessel_name,
    destination: fromApi.destination,
    so_create_date: fromApi.so_create_date,
    so_status: fromApi.so_status,
    so_status_label: fromApi.so_status_label,
    currency_code: fromApi.currency_code,
    usd_cost: fromApi.usd_cost,
    gst_in_amount: fromApi.gst_in_amount,
  };
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
