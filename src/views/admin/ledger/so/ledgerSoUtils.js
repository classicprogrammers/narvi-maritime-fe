import {
  formatCostDate,
  formatCostNumber,
  formatSoLabel,
  getMany2oneId,
  getMany2oneName,
  isShippingStatusOrder,
  toDateOnly,
  toIdOrNull,
  toNumberOrNull,
  toNumericOrEmpty,
} from "../cost/ledgerCostUtils";

export {
  formatCostDate,
  formatCostNumber,
  formatSoLabel,
  getMany2oneId,
  getMany2oneName,
  isShippingStatusOrder,
};

export const SO_LEDGER_BIZ_CATEGORY_OPTIONS = [
  { value: "shipspares", label: "Shipspares" },
  { value: "bunker", label: "Bunker" },
];

export const readApiText = (value) => {
  if (value == null || value === false || value === "") return "";
  if (Array.isArray(value)) {
    const named = value.find((item) => typeof item === "string" && item.trim() && item.toLowerCase() !== "false");
    if (named) return named.trim();
    return readApiText(value[1] ?? value[0]);
  }
  if (typeof value === "object") {
    return String(value.name || value.label || value.display_name || "").trim();
  }
  const text = String(value).trim();
  return !text || text.toLowerCase() === "false" ? "" : text;
};

export const soLedgerBizCategoryDisplay = (value, apiLabel) => {
  const label = readApiText(apiLabel);
  if (label) {
    const labelMatch = SO_LEDGER_BIZ_CATEGORY_OPTIONS.find(
      (option) => option.value === label.toLowerCase() || option.label.toLowerCase() === label.toLowerCase()
    );
    return labelMatch ? labelMatch.label : label;
  }
  const raw = readApiText(value).toLowerCase();
  if (!raw) return "";
  const match = SO_LEDGER_BIZ_CATEGORY_OPTIONS.find(
    (option) => option.value === raw || option.label.toLowerCase() === raw
  );
  if (match) return match.label;
  if (raw.includes("shipspare") || raw.includes("shipsnare")) return "Shipspares";
  return readApiText(value);
};

export const displaySoNumber = (row) => {
  const name = getMany2oneName(row?.sale_order_id) || readApiText(row?.sale_order_name);
  if (name) return name;
  const num = readApiText(row?.so_number);
  if (!num) return "";
  if (/^s?o[- ]?/i.test(num) || /^s\d/i.test(num)) return num;
  return `SO-${num}`;
};

export const emptySoLedgerForm = () => ({
  sale_order_id: "",
  sale_order_name: "",
  so_number: "",
  so_create_date: "",
  so_status: "",
  so_status_label: "",
  pic: "",
  client: "",
  vessel_name: "",
  destination: "",
  eta_date: "",
  eta: "",
  so_remark: "",
  biz_category: "",
  biz_category_label: "",
  actual_sale: "",
  actual_cost: "",
  actual_profit: "",
  actual_profit_percentage: "",
  invoice_balance: "",
});

export const formatProfitPercent = (value) => {
  if (value == null || value === false || value === "") return "—";
  const raw = typeof value === "string" ? value.replace(/%/g, "").trim() : value;
  const n = Number(raw);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
};

export const prettySoDate = (value) => {
  const raw = formatCostDate(value);
  if (!raw || raw === "-") return "";
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const displayOrDash = (value) => readApiText(value) || "—";

export const etaDisplay = (etaDate, etaText) => {
  const date = toDateOnly(etaDate);
  const extra = readApiText(etaText);
  if (date && extra && extra !== date) return `${date} ${extra}`;
  return extra || date || "";
};

export const fillFromShippingOrder = (order) => {
  if (!order) {
    return {
      so_number: "",
      so_create_date: "",
      so_status: "",
      so_status_label: "",
      pic: "",
      client: "",
      vessel_name: "",
      destination: "",
      eta_date: "",
      eta: "",
      so_remark: "",
    };
  }
  const soStatus = order.so_status || "";
  const picVal = order.pic_new || order.pic_id || order.pic;
  return {
    so_number:
      order.so_id != null && order.so_id !== false
        ? String(order.so_id)
        : String(order.so_number || "").replace(/^SO[- ]?/i, ""),
    so_create_date: toDateOnly(
      order.so_create_date || order.create_date || order.date_created || order.date_order
    ),
    so_status: soStatus,
    so_status_label:
      order.so_status_label ||
      (String(soStatus).toLowerCase() === "shipping" ? "Shipping Order" : soStatus),
    pic:
      getMany2oneName(picVal) ||
      order.pic_name ||
      (typeof order.pic === "string" ? order.pic : "") ||
      "",
    client:
      getMany2oneName(order.client_id || order.partner_id) ||
      order.client ||
      order.client_name ||
      "",
    vessel_name: getMany2oneName(order.vessel_id) || order.vessel_name || order.vessel || "",
    destination:
      order.destination ||
      order.destination_name ||
      getMany2oneName(order.destination_id) ||
      "",
    eta_date: toDateOnly(order.eta_date),
    eta: order.eta && order.eta !== false ? String(order.eta) : "",
    so_remark:
      (order.so_remark && order.so_remark !== false ? String(order.so_remark) : "") ||
      (order.client_remark && order.client_remark !== false ? String(order.client_remark) : "") ||
      "",
  };
};

export const computeFinancialPreview = ({ invoices = [], costs = [] }) => {
  const sumField = (rows, key) =>
    (Array.isArray(rows) ? rows : []).reduce((total, row) => {
      const n = toNumberOrNull(row?.[key]);
      return total + (n == null ? 0 : n);
    }, 0);

  const actualSale = sumField(invoices, "usd_amount");
  const actualCost = sumField(costs, "usd_cost");
  const invoiceBalance = sumField(invoices, "invoice_balance_usd");
  const actualProfit = actualSale - actualCost;
  const actualProfitPercentage = actualSale === 0 ? 0 : (actualProfit / actualSale) * 100;

  return {
    actual_sale: actualSale,
    actual_cost: actualCost,
    actual_profit: actualProfit,
    actual_profit_percentage: actualProfitPercentage,
    invoice_balance: invoiceBalance,
  };
};

export const recordToForm = (record) => {
  if (!record) return emptySoLedgerForm();
  const saleOrderName = getMany2oneName(record.sale_order_id);
  const soNumber = readApiText(record.so_number);
  return {
    sale_order_id: getMany2oneId(record.sale_order_id) ?? "",
    sale_order_name: saleOrderName,
    so_number: soNumber || saleOrderName,
    so_create_date: toDateOnly(record.so_create_date),
    so_status: readApiText(record.so_status),
    so_status_label: readApiText(record.so_status_label),
    pic: readApiText(record.pic) || getMany2oneName(record.pic_new_id) || getMany2oneName(record.pic_id),
    client: readApiText(record.client) || getMany2oneName(record.client_id),
    vessel_name: readApiText(record.vessel_name) || getMany2oneName(record.vessel_id),
    destination: readApiText(record.destination) || getMany2oneName(record.destination_id),
    eta_date: toDateOnly(record.eta_date),
    eta: readApiText(record.eta),
    so_remark: readApiText(record.so_remark),
    biz_category: readApiText(record.biz_category),
    biz_category_label: soLedgerBizCategoryDisplay(record.biz_category, record.biz_category_label),
    actual_sale: toNumericOrEmpty(record.actual_sale),
    actual_cost: toNumericOrEmpty(record.actual_cost),
    actual_profit: toNumericOrEmpty(record.actual_profit),
    actual_profit_percentage: toNumericOrEmpty(record.actual_profit_percentage),
    invoice_balance: toNumericOrEmpty(record.invoice_balance),
  };
};

export const buildCreatePayload = (form) => ({
  sale_order_id: toIdOrNull(form.sale_order_id),
});

export const buildUpdatePayload = (form, originalForm, recordId) => {
  const payload = { id: recordId };
  const nextId = toIdOrNull(form.sale_order_id);
  const prevId = toIdOrNull(originalForm.sale_order_id);
  if (String(nextId ?? "") !== String(prevId ?? "")) {
    payload.sale_order_id = nextId;
  }
  return payload;
};

export const validateSoLedgerForm = (form) => {
  if (toIdOrNull(form.sale_order_id) == null) {
    return "SO Number is required.";
  }
  return null;
};

export const getWritableSoLedgerSignature = (form) =>
  JSON.stringify({ sale_order_id: toIdOrNull(form?.sale_order_id) ?? "" });

export const applyComputedFromRecord = (form, record) => {
  if (!record) return form;
  const fromApi = recordToForm(record);
  return {
    ...form,
    sale_order_id: fromApi.sale_order_id || form.sale_order_id,
    sale_order_name: fromApi.sale_order_name,
    so_number: fromApi.so_number,
    so_create_date: fromApi.so_create_date,
    so_status: fromApi.so_status,
    so_status_label: fromApi.so_status_label,
    pic: fromApi.pic,
    client: fromApi.client,
    vessel_name: fromApi.vessel_name,
    destination: fromApi.destination,
    eta_date: fromApi.eta_date,
    eta: fromApi.eta,
    so_remark: fromApi.so_remark,
    biz_category: fromApi.biz_category,
    biz_category_label: fromApi.biz_category_label,
    actual_sale: fromApi.actual_sale,
    actual_cost: fromApi.actual_cost,
    actual_profit: fromApi.actual_profit,
    actual_profit_percentage: fromApi.actual_profit_percentage,
    invoice_balance: fromApi.invoice_balance,
  };
};

export const extractSaleOrderId = (row) => getMany2oneId(row?.sale_order_id);

export const extractLedgerSoRecord = (response) => {
  if (response == null) return null;
  const candidates = [response.data, response.result?.data, response.record, response.result, response];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate[0]?.id != null) return candidate[0];
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate) && candidate.id != null) {
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
