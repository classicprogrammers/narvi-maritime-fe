import {
  bizCategoryDisplay,
  formatCostDate,
  formatCostNumber,
  formatSoLabel,
  getMany2oneId,
  getMany2oneName,
  isShippingStatusOrder,
  normalizeBizCategory,
  toDateOnly,
  toIdOrNull,
  toNumberOrNull,
  toNumericOrEmpty,
} from "../cost/ledgerCostUtils";
import {
  applyManualInput,
  diffAutoDate,
  diffAutoNumber,
  readAutoField,
  writableAutoValue,
} from "utils/ledgerAutoFields";
import { INVOICE_BULK_FIELDS } from "utils/ledgerBulkEdit";

export {
  bizCategoryDisplay,
  formatCostDate,
  formatCostNumber,
  formatSoLabel,
  getMany2oneId,
  getMany2oneName,
  isShippingStatusOrder,
  normalizeBizCategory,
};

export const GST_OUTPUT_OPTIONS = [
  { value: "true", label: "TRUE" },
  { value: "gst_out", label: "GST OUT" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "paid", label: "Paid" },
];

export const DEFAULT_INVOICE_BIZ_CATEGORY = "Shipspares";

export const emptyInvoiceForm = () => ({
  sale_order_id: "",
  invoice_number: "",
  date_sales_invoice: "",
  currency_id: "",
  currency_amount: "",
  roe: "",
  roe_manual: false,
  roe_date: "",
  date_due: "",
  date_due_manual: false,
  date_paid: "",
  client_amount_paid: "",
  bank_change_usd: "",
  gst_output_tax: "",
  gst_out_amount: "",
  invoice_soa: false,
  customer_billing_remarks: "",
  payment_remark: "",
  so_remark: "",
  so_number: "",
  so_create_date: "",
  so_status: "",
  so_status_label: "",
  so_done_status: "",
  so_done_status_label: "",
  client_id: "",
  client: "",
  vessel_name: "",
  destination: "",
  destination_type: "",
  destination_type_label: "",
  destination_name: "",
  destination_country: "",
  client_case_invoice_ref: "",
  biz_category: DEFAULT_INVOICE_BIZ_CATEGORY,
  biz_category_label: DEFAULT_INVOICE_BIZ_CATEGORY,
  currency_code: "",
  usd_amount: "",
  invoice_balance: "",
  invoice_balance_usd: "",
  payment_status: "",
  payment_status_label: "",
});

export const gstOutputDisplay = (value, apiLabel) => {
  const raw = String(value || "").trim().toLowerCase();
  const match = GST_OUTPUT_OPTIONS.find((option) => option.value.toLowerCase() === raw);
  if (match) return match.label;
  return apiLabel || value || "-";
};

export const paymentStatusDisplay = (value, apiLabel) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "paid") return "Paid";
  if (raw === "open") return "Open";
  return apiLabel || value || "-";
};

const cleanText = (value) =>
  value == null || value === false || value === "" ? "" : String(value);

export const fillFromShippingOrder = (order) => {
  if (!order) {
    return {
      so_number: "",
      so_create_date: "",
      so_status: "",
      so_status_label: "",
      so_done_status: "",
      so_done_status_label: "",
      client_id: "",
      client: "",
      vessel_name: "",
      destination: "",
      destination_type: "",
      destination_type_label: "",
      destination_name: "",
      destination_country: "",
      client_case_invoice_ref: "",
      biz_category: DEFAULT_INVOICE_BIZ_CATEGORY,
      biz_category_label: DEFAULT_INVOICE_BIZ_CATEGORY,
    };
  }
  const soStatus = order.so_status || "";
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
    so_done_status: cleanText(order.so_done_status),
    so_done_status_label: cleanText(order.so_done_status_label),
    client_id: getMany2oneId(order.client_id || order.partner_id) ?? "",
    client:
      getMany2oneName(order.client_id || order.partner_id) ||
      order.client ||
      order.client_name ||
      "",
    vessel_name:
      getMany2oneName(order.vessel_id) || order.vessel_name || order.vessel || "",
    destination:
      order.destination ||
      order.destination_name ||
      getMany2oneName(order.destination_id) ||
      "",
    destination_type: cleanText(order.destination_type),
    destination_type_label: cleanText(order.destination_type_label),
    destination_name: cleanText(order.destination_name),
    destination_country: cleanText(order.destination_country),
    client_case_invoice_ref: cleanText(order.client_case_invoice_ref),
    biz_category: normalizeBizCategory(order.biz_category) || DEFAULT_INVOICE_BIZ_CATEGORY,
    biz_category_label: order.biz_category
      ? bizCategoryDisplay(order.biz_category, order.biz_category_label)
      : DEFAULT_INVOICE_BIZ_CATEGORY,
  };
};

export const computeInvoicePreview = (form) => {
  const amount = toNumberOrNull(form.currency_amount);
  const roe = toNumberOrNull(form.roe);
  const paid = toNumberOrNull(form.client_amount_paid);
  if (amount == null || roe == null || roe === 0) {
    return {
      usd_amount: "",
      invoice_balance: "",
      invoice_balance_usd: "",
      payment_status: "",
      payment_status_label: "",
    };
  }
  // Invoice ROE = USD per 1 unit of currency
  const usdAmount = amount * roe;
  const invoiceBalance = usdAmount - (paid == null ? 0 : paid);
  const invoiceBalanceUsd = invoiceBalance * roe;
  const isPaid = Math.round(invoiceBalance * 100) / 100 === 0;
  return {
    usd_amount: usdAmount,
    invoice_balance: invoiceBalance,
    invoice_balance_usd: invoiceBalanceUsd,
    payment_status: isPaid ? "paid" : "open",
    payment_status_label: isPaid ? "Paid" : "Open",
  };
};

export const recordToForm = (record) => {
  if (!record) return emptyInvoiceForm();
  const roeField = readAutoField(record, "roe", "roe_manual");
  const dueField = readAutoField(
    { date_due: toDateOnly(record.date_due), date_due_manual: record.date_due_manual },
    "date_due",
    "date_due_manual"
  );
  return {
    sale_order_id: getMany2oneId(record.sale_order_id) ?? "",
    invoice_number: record.invoice_number && record.invoice_number !== false ? String(record.invoice_number) : "",
    date_sales_invoice: toDateOnly(record.date_sales_invoice),
    currency_id: getMany2oneId(record.currency_id) ?? "",
    currency_amount: toNumericOrEmpty(record.currency_amount),
    roe: roeField.value,
    roe_manual: roeField.manual,
    roe_date: toDateOnly(record.roe_date),
    date_due: dueField.value,
    date_due_manual: dueField.manual,
    date_paid: toDateOnly(record.date_paid),
    client_amount_paid: toNumericOrEmpty(record.client_amount_paid),
    bank_change_usd: toNumericOrEmpty(record.bank_change_usd),
    gst_output_tax:
      record.gst_output_tax && record.gst_output_tax !== false ? String(record.gst_output_tax) : "",
    gst_out_amount: toNumericOrEmpty(record.gst_out_amount),
    invoice_soa: record.invoice_soa === true || record.invoice_soa === "true",
    customer_billing_remarks:
      record.customer_billing_remarks && record.customer_billing_remarks !== false
        ? String(record.customer_billing_remarks)
        : "",
    payment_remark:
      record.payment_remark && record.payment_remark !== false ? String(record.payment_remark) : "",
    so_remark: record.so_remark && record.so_remark !== false ? String(record.so_remark) : "",
    so_number: record.so_number && record.so_number !== false ? String(record.so_number) : "",
    so_create_date: toDateOnly(record.so_create_date),
    so_status: record.so_status && record.so_status !== false ? String(record.so_status) : "",
    so_status_label:
      record.so_status_label && record.so_status_label !== false ? String(record.so_status_label) : "",
    so_done_status: cleanText(record.so_done_status),
    so_done_status_label: cleanText(record.so_done_status_label),
    client_id: getMany2oneId(record.client_id) ?? "",
    client: record.client || getMany2oneName(record.client_id) || "",
    vessel_name: record.vessel_name || getMany2oneName(record.vessel_id) || "",
    destination: record.destination && record.destination !== false ? String(record.destination) : "",
    destination_type: cleanText(record.destination_type),
    destination_type_label: cleanText(record.destination_type_label),
    destination_name: cleanText(record.destination_name),
    destination_country: cleanText(record.destination_country),
    client_case_invoice_ref: cleanText(record.client_case_invoice_ref),
    biz_category: normalizeBizCategory(record.biz_category) || DEFAULT_INVOICE_BIZ_CATEGORY,
    biz_category_label: record.biz_category
      ? bizCategoryDisplay(record.biz_category, record.biz_category_label)
      : DEFAULT_INVOICE_BIZ_CATEGORY,
    currency_code: record.currency_code || getMany2oneName(record.currency_id) || "",
    usd_amount: toNumericOrEmpty(record.usd_amount),
    invoice_balance: toNumericOrEmpty(record.invoice_balance),
    invoice_balance_usd: toNumericOrEmpty(record.invoice_balance_usd),
    payment_status:
      record.payment_status && record.payment_status !== false ? String(record.payment_status) : "",
    payment_status_label:
      record.payment_status_label && record.payment_status_label !== false
        ? String(record.payment_status_label)
        : "",
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

const sameBool = (a, b) => Boolean(a) === Boolean(b);

export const buildCreatePayload = (form) => {
  const payload = {
    sale_order_id: toIdOrNull(form.sale_order_id),
    invoice_number: String(form.invoice_number || "").trim(),
    currency_amount: toNumberOrNull(form.currency_amount),
  };
  // Automatic ROE / due date are left out so the server fills them
  const roe = toNumberOrNull(writableAutoValue(form, "roe", "roe_manual"));
  if (roe != null && roe !== 0) payload.roe = roe;
  const currencyId = toIdOrNull(form.currency_id);
  if (currencyId != null) payload.currency_id = currencyId;
  if (form.date_sales_invoice) payload.date_sales_invoice = form.date_sales_invoice;
  const dueDate = writableAutoValue(form, "date_due", "date_due_manual");
  if (dueDate) payload.date_due = dueDate;
  if (form.date_paid) payload.date_paid = form.date_paid;
  const paid = toNumberOrNull(form.client_amount_paid);
  if (paid != null) payload.client_amount_paid = paid;
  const bank = toNumberOrNull(form.bank_change_usd);
  if (bank != null) payload.bank_change_usd = bank;
  if (form.gst_output_tax) payload.gst_output_tax = form.gst_output_tax;
  const gstOut = toNumberOrNull(form.gst_out_amount);
  if (gstOut != null) payload.gst_out_amount = gstOut;
  payload.invoice_soa = Boolean(form.invoice_soa);
  if (form.customer_billing_remarks) payload.customer_billing_remarks = form.customer_billing_remarks;
  if (form.payment_remark) payload.payment_remark = form.payment_remark;
  if (form.so_remark) payload.so_remark = form.so_remark;
  return payload;
};

export const buildUpdatePayload = (form, originalForm, recordId) => {
  const payload = { id: recordId };
  if (!sameId(form.sale_order_id, originalForm.sale_order_id)) {
    payload.sale_order_id = toIdOrNull(form.sale_order_id);
  }
  if (!sameValue(form.invoice_number, originalForm.invoice_number)) {
    payload.invoice_number = String(form.invoice_number || "").trim() || false;
  }
  if (!sameValue(form.date_sales_invoice, originalForm.date_sales_invoice)) {
    payload.date_sales_invoice = form.date_sales_invoice || false;
  }
  if (!sameId(form.currency_id, originalForm.currency_id)) {
    payload.currency_id = toIdOrNull(form.currency_id);
  }
  if (!sameNumber(form.currency_amount, originalForm.currency_amount)) {
    payload.currency_amount = toNumberOrNull(form.currency_amount);
  }
  const roeChange = diffAutoNumber(form, originalForm, "roe", "roe_manual");
  if (roeChange !== undefined) payload.roe = roeChange;
  const dueChange = diffAutoDate(form, originalForm, "date_due", "date_due_manual");
  if (dueChange !== undefined) payload.date_due = dueChange;
  if (!sameValue(form.date_paid, originalForm.date_paid)) {
    payload.date_paid = form.date_paid || false;
  }
  if (!sameNumber(form.client_amount_paid, originalForm.client_amount_paid)) {
    payload.client_amount_paid = toNumberOrNull(form.client_amount_paid);
  }
  if (!sameNumber(form.bank_change_usd, originalForm.bank_change_usd)) {
    payload.bank_change_usd = toNumberOrNull(form.bank_change_usd);
  }
  if (!sameValue(form.gst_output_tax, originalForm.gst_output_tax)) {
    payload.gst_output_tax = form.gst_output_tax || false;
  }
  if (!sameNumber(form.gst_out_amount, originalForm.gst_out_amount)) {
    payload.gst_out_amount = toNumberOrNull(form.gst_out_amount);
  }
  if (!sameBool(form.invoice_soa, originalForm.invoice_soa)) {
    payload.invoice_soa = Boolean(form.invoice_soa);
  }
  if (!sameValue(form.customer_billing_remarks, originalForm.customer_billing_remarks)) {
    payload.customer_billing_remarks = form.customer_billing_remarks || false;
  }
  if (!sameValue(form.payment_remark, originalForm.payment_remark)) {
    payload.payment_remark = form.payment_remark || false;
  }
  if (!sameValue(form.so_remark, originalForm.so_remark)) {
    payload.so_remark = form.so_remark || false;
  }
  return payload;
};

export const validateInvoiceForm = (form) => {
  if (toIdOrNull(form.sale_order_id) == null) {
    return "SO Number is required.";
  }
  if (!String(form.invoice_number || "").trim()) {
    return "Invoice Number is required.";
  }
  if (toNumberOrNull(form.currency_amount) == null) {
    return "Currency Amount is required.";
  }
  return null;
};

export const getWritableInvoiceFields = (form) => ({
  sale_order_id: toIdOrNull(form?.sale_order_id) ?? "",
  invoice_number: String(form?.invoice_number || "").trim(),
  date_sales_invoice: form?.date_sales_invoice || "",
  currency_id: toIdOrNull(form?.currency_id) ?? "",
  currency_amount: toNumberOrNull(form?.currency_amount) ?? "",
  roe: toNumberOrNull(writableAutoValue(form, "roe", "roe_manual")) ?? "",
  roe_manual: Boolean(form?.roe_manual),
  date_due: writableAutoValue(form, "date_due", "date_due_manual") || "",
  date_due_manual: Boolean(form?.date_due_manual),
  date_paid: form?.date_paid || "",
  client_amount_paid: toNumberOrNull(form?.client_amount_paid) ?? "",
  bank_change_usd: toNumberOrNull(form?.bank_change_usd) ?? "",
  gst_output_tax: form?.gst_output_tax || "",
  gst_out_amount: toNumberOrNull(form?.gst_out_amount) ?? "",
  invoice_soa: Boolean(form?.invoice_soa),
  customer_billing_remarks: String(form?.customer_billing_remarks || "").trim(),
  payment_remark: String(form?.payment_remark || "").trim(),
  so_remark: String(form?.so_remark || "").trim(),
});

export const getWritableInvoiceSignature = (form) => JSON.stringify(getWritableInvoiceFields(form));

export const applyComputedFromRecord = (form, record) => {
  if (!record) return form;
  const fromApi = recordToForm(record);
  return {
    ...form,
    so_number: fromApi.so_number,
    so_create_date: fromApi.so_create_date,
    so_status: fromApi.so_status,
    so_status_label: fromApi.so_status_label,
    so_done_status: fromApi.so_done_status,
    so_done_status_label: fromApi.so_done_status_label,
    client_id: fromApi.client_id,
    client: fromApi.client,
    vessel_name: fromApi.vessel_name,
    destination: fromApi.destination,
    destination_type: fromApi.destination_type,
    destination_type_label: fromApi.destination_type_label,
    destination_name: fromApi.destination_name,
    destination_country: fromApi.destination_country,
    client_case_invoice_ref: fromApi.client_case_invoice_ref,
    // A manual value typed in the form wins over the server auto value
    roe: form.roe_manual ? form.roe : fromApi.roe,
    roe_manual: form.roe_manual ? true : fromApi.roe_manual,
    roe_date: fromApi.roe_date,
    date_due: form.date_due_manual ? form.date_due : fromApi.date_due,
    date_due_manual: form.date_due_manual ? true : fromApi.date_due_manual,
    biz_category: fromApi.biz_category,
    biz_category_label: fromApi.biz_category_label,
    currency_code: fromApi.currency_code,
    usd_amount: fromApi.usd_amount,
    invoice_balance: fromApi.invoice_balance,
    invoice_balance_usd: fromApi.invoice_balance_usd,
    payment_status: fromApi.payment_status,
    payment_status_label: fromApi.payment_status_label,
  };
};

export const extractLedgerInvoiceRecord = (response) => {
  if (response == null) return null;
  const candidates = [response.data, response.result?.data, response.record, response.result, response];
  for (const candidate of candidates) {
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

// Typing into ROE: empty returns to automatic, any text is manual.
// (A typed 0 stays manual here so values like 0.27 can be entered; 0 is treated as automatic on save.)
export const applyRoeInput = (text) => {
  if (String(text ?? "") === "") return { roe: "", roe_manual: false };
  return { roe: String(text), roe_manual: true };
};

export const applyDueDateInput = (text) => {
  const { value, manual } = applyManualInput(text);
  return { date_due: value, date_due_manual: manual };
};

export const SOA_BULK_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

// Bulk edit fields as the Invoices DB needs them (GST output and SOA are choices, not free text)
export const INVOICE_BULK_FIELDS_UI = INVOICE_BULK_FIELDS.map((field) => {
  if (field.key === "gst_output_tax") return { ...field, type: "select", options: GST_OUTPUT_OPTIONS };
  if (field.key === "invoice_soa") return { ...field, type: "select", options: SOA_BULK_OPTIONS };
  return field;
});

// invoice_soa is boolean on the backend; the select yields "true" / "false" (empty / false clears it)
export const normalizeInvoiceBulkValues = (values) => {
  if (!values || !("invoice_soa" in values)) return values;
  return { ...values, invoice_soa: values.invoice_soa === true || values.invoice_soa === "true" };
};
