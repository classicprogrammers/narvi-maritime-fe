import api from "./axios";

const toCsvOrSingle = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join(",");
  if (value == null || value === "") return undefined;
  return String(value);
};

const buildJobQueryParams = (params = {}) => {
  const requestParams = {};
  const assign = (key, value) => {
    if (value != null && String(value).trim() !== "") {
      requestParams[key] = String(value).trim();
    }
  };

  assign("search", params.search);
  assign("status", params.status);
  assign("stock_status", params.stock_status);
  assign("date_from", params.date_from);
  assign("date_to", params.date_to);
  assign("min_weight", params.min_weight);
  assign("max_weight", params.max_weight);
  assign("min_value", params.min_value);
  assign("max_value", params.max_value);
  assign("min_days", params.min_days);
  assign("max_days", params.max_days);
  assign("origin", params.origin);
  assign("so_number", params.so_number);
  assign("stock_item_id", params.stock_item_id);
  assign("remarks", params.remarks);

  const vesselIds = toCsvOrSingle(params.vessel_ids ?? params.vessel_id);
  const supplierIds = toCsvOrSingle(params.supplier_ids ?? params.supplier_id);
  const poIds = toCsvOrSingle(params.po_ids ?? params.po_id);
  if (vesselIds) requestParams.vessel_ids = vesselIds;
  if (supplierIds) requestParams.supplier_ids = supplierIds;
  if (poIds) requestParams.po_ids = poIds;

  return requestParams;
};

const normalizeJobResponse = (data) => {
  if (data.status === "error") {
    throw new Error(data.message || "Failed to fetch jobs");
  }
  return {
    status: data.status || "success",
    endpoint: data.endpoint || "",
    count: data.count ?? 0,
    client: data.client || null,
    applied_status_filter: Array.isArray(data.applied_status_filter) ? data.applied_status_filter : [],
    applied_filters: data.applied_filters || {},
    stock_list: Array.isArray(data.stock_list) ? data.stock_list : [],
  };
};

export const getActiveJobs = async (params = {}) => {
  const response = await api.get("/api/job/active", { params: buildJobQueryParams(params) });
  const data = response.data || response;
  return normalizeJobResponse(data);
};

export const getCompletedJobs = async (params = {}) => {
  const response = await api.get("/api/job/completed", { params: buildJobQueryParams(params) });
  const data = response.data || response;
  return normalizeJobResponse(data);
};

const clientJobsApi = {
  getActiveJobs,
  getCompletedJobs,
};

export default clientJobsApi;

