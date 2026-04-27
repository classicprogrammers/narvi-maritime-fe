import api from "./axios";
import { buildCommonStockJobFilters } from "./commonFilterBuilder";

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
  const response = await api.get("/api/job/active", {
    params: buildCommonStockJobFilters(params, "active"),
  });
  const data = response.data || response;
  return normalizeJobResponse(data);
};

export const getCompletedJobs = async (params = {}) => {
  const response = await api.get("/api/job/completed", {
    params: buildCommonStockJobFilters(params, "completed"),
  });
  const data = response.data || response;
  return normalizeJobResponse(data);
};

const clientJobsApi = {
  getActiveJobs,
  getCompletedJobs,
};

export default clientJobsApi;

