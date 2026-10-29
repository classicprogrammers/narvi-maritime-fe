import api from "./axios";

const unwrapError = (data, fallback) => {
  if (data?.result?.status === "error") {
    throw new Error(data.result.message || fallback);
  }
  if (data?.status === "error") {
    throw new Error(data.message || fallback);
  }
};

export const getLedgerCosts = async (params = {}) => {
  const requestParams = {};
  const page = params.page != null && params.page >= 1 ? params.page : 1;
  const pageSize =
    params.page_size === "all"
      ? "all"
      : params.page_size != null && params.page_size > 0
        ? params.page_size
        : 50;

  if (params.id != null && params.id !== "") {
    requestParams.id = params.id;
  } else {
    requestParams.page = page;
    requestParams.page_size = pageSize;
  }

  const optionalKeys = [
    "sale_order_id",
    "so_number",
    "agent_id",
    "client_id",
    "vessel_id",
    "biz_category",
    "destination",
    "search",
    "sort_by",
    "sort_order",
    "so_done_status",
    "client_case_invoice_ref",
    "date_agent_invoice_from",
    "date_agent_invoice_to",
    "date_due_agent_from",
    "date_due_agent_to",
    "date_agent_paid_from",
    "date_agent_paid_to",
  ];
  optionalKeys.forEach((key) => {
    const value = params[key];
    if (value != null && String(value).trim() !== "") {
      requestParams[key] = typeof value === "string" ? value.trim() : value;
    }
  });

  const response = await api.get("/api/ledger/cost", { params: requestParams });
  const data = response.data || response;
  unwrapError(data, "Failed to fetch ledger costs");

  if (requestParams.id != null) {
    const record = data?.data && !Array.isArray(data.data) ? data.data : null;
    return {
      status: data.status || "success",
      data: record,
      record,
    };
  }

  const list = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.result?.data)
      ? data.result.data
      : [];

  return {
    status: data.status || "success",
    data: list,
    count: data.count ?? list.length,
    total_count: data.total_count ?? list.length,
    page: data.page ?? page,
    page_size: data.page_size ?? pageSize,
    total_pages: data.total_pages ?? 1,
    has_next: data.has_next ?? false,
    has_previous: data.has_previous ?? false,
    sort_by: data.sort_by ?? null,
    sort_order: data.sort_order ?? null,
  };
};

export const getLedgerCostById = async (id) => {
  const result = await getLedgerCosts({ id });
  if (!result.record) {
    throw new Error("Ledger cost record not found");
  }
  return result.record;
};

export const createLedgerCost = async (payload) => {
  const response = await api.post("/api/ledger/cost/create", payload);
  const data = response.data || response;
  unwrapError(data, "Failed to create ledger cost");
  return data;
};

export const updateLedgerCost = async (payload) => {
  const response = await api.post("/api/ledger/cost/update", payload);
  const data = response.data || response;
  unwrapError(data, "Failed to update ledger cost");
  return data;
};

export const deleteLedgerCost = async (id) => {
  const response = await api.post("/api/ledger/cost/delete", { id });
  const data = response.data || response;
  unwrapError(data, "Failed to delete ledger cost");
  return data;
};

export const bulkUpdateLedgerCosts = async ({ ids, values }) => {
  const response = await api.post("/api/ledger/cost/bulk-update", { ids, values });
  const data = response.data || response;
  unwrapError(data, "Failed to update selected records");
  const payload = data?.result && data.result.updated_count != null ? data.result : data;
  return {
    updated_count: payload.updated_count ?? 0,
    ids: payload.ids ?? ids,
    updated_fields: payload.updated_fields ?? [],
  };
};

export const checkLedgerCostInvoices = async ({ agent_id, invoices, exclude_id }) => {
  const body = { agent_id, invoices };
  if (exclude_id != null && exclude_id !== "") body.exclude_id = exclude_id;
  const response = await api.post("/api/ledger/cost/check-invoice", body);
  const data = response.data || response;
  unwrapError(data, "Failed to check invoice numbers");
  const payload = data?.result && data.result.has_duplicates != null ? data.result : data;
  const duplicates = Array.isArray(payload.duplicates) ? payload.duplicates : [];
  return { has_duplicates: Boolean(payload.has_duplicates) || duplicates.length > 0, duplicates };
};

export default {
  getLedgerCosts,
  getLedgerCostById,
  createLedgerCost,
  updateLedgerCost,
  deleteLedgerCost,
  bulkUpdateLedgerCosts,
  checkLedgerCostInvoices,
};
