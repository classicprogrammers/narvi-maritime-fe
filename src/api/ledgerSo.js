import api from "./axios";

const unwrapError = (data, fallback) => {
  if (data?.result?.status === "error") {
    throw new Error(data.result.message || fallback);
  }
  if (data?.status === "error") {
    throw new Error(data.message || fallback);
  }
};

export const getLedgerSos = async (params = {}) => {
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
    "client_id",
    "vessel_id",
    "destination",
    "biz_category",
    "search",
  ];
  optionalKeys.forEach((key) => {
    const value = params[key];
    if (value != null && String(value).trim() !== "") {
      requestParams[key] = typeof value === "string" ? value.trim() : value;
    }
  });

  const response = await api.get("/api/ledger/so", { params: requestParams });
  const data = response.data || response;
  unwrapError(data, "Failed to fetch SO ledger records");

  if (requestParams.id != null) {
    const raw = data?.data ?? data?.result?.data ?? data?.record ?? null;
    const record = Array.isArray(raw)
      ? raw[0] || null
      : raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : null;
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
  };
};

export const getLedgerSoById = async (id) => {
  const result = await getLedgerSos({ id });
  if (!result.record) {
    throw new Error("SO ledger record not found");
  }
  return result.record;
};

export const createLedgerSo = async (payload) => {
  const response = await api.post("/api/ledger/so/create", payload);
  const data = response.data || response;
  unwrapError(data, "Failed to create SO ledger record");
  return data;
};

export const updateLedgerSo = async (payload) => {
  const response = await api.post("/api/ledger/so/update", payload);
  const data = response.data || response;
  unwrapError(data, "Failed to update SO ledger record");
  return data;
};

export const deleteLedgerSo = async (id) => {
  const response = await api.post("/api/ledger/so/delete", { id });
  const data = response.data || response;
  unwrapError(data, "Failed to delete SO ledger record");
  return data;
};

export default {
  getLedgerSos,
  getLedgerSoById,
  createLedgerSo,
  updateLedgerSo,
  deleteLedgerSo,
};
