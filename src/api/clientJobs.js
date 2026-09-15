import api from "./axios";
import { buildCommonStockJobFilters } from "./commonFilterBuilder";

const normalizeJobResponse = (data, requestParams = {}) => {
  if (data.status === "error") {
    throw new Error(data.message || "Failed to fetch jobs");
  }
  const fullList = Array.isArray(data.stock_list) ? data.stock_list : [];
  const fetchAll =
    requestParams.fetch_all === true ||
    requestParams.fetch_all === "true" ||
    requestParams.page_size === "all";
  const page = Number(data.page ?? requestParams.page) || 1;
  const pageSize = Number(data.page_size ?? requestParams.page_size) || fullList.length || 50;
  const totalCount = Number(data.total_count ?? data.count ?? fullList.length) || 0;
  const totalPages =
    Number(data.total_pages) ||
    Math.max(1, Math.ceil((totalCount || fullList.length) / (Number(pageSize) || 50)));
  const list =
    !fetchAll && fullList.length > pageSize
      ? fullList.slice((page - 1) * pageSize, page * pageSize)
      : fullList;

  return {
    status: data.status || "success",
    endpoint: data.endpoint || "",
    count: data.count ?? list.length,
    total_count: totalCount || list.length,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    has_next: Boolean(data.has_next ?? page < totalPages),
    has_previous: Boolean(data.has_previous ?? page > 1),
    client: data.client || null,
    applied_status_filter: Array.isArray(data.applied_status_filter)
      ? data.applied_status_filter
      : [],
    applied_filters: data.applied_filters || {},
    stock_list: list,
    fetch_all: fetchAll,
  };
};

const buildJobRequestParams = (params, endpointType) => {
  const requestParams = buildCommonStockJobFilters(params, endpointType);
  const fetchAll =
    params.fetch_all === true || params.fetch_all === "true" || params.page_size === "all";
  if (fetchAll) {
    requestParams.fetch_all = true;
  } else {
    const page = params.page != null && Number(params.page) >= 1 ? Number(params.page) : 1;
    const pageSize =
      params.page_size != null && Number(params.page_size) > 0 ? Number(params.page_size) : 50;
    requestParams.page = page;
    requestParams.page_size = pageSize;
  }
  return requestParams;
};

export const getActiveJobs = async (params = {}) => {
  const requestParams = buildJobRequestParams(params, "active");
  const response = await api.get("/api/job/active", { params: requestParams });
  const data = response.data || response;
  return normalizeJobResponse(data, requestParams);
};

export const getCompletedJobs = async (params = {}) => {
  const requestParams = buildJobRequestParams(params, "completed");
  const response = await api.get("/api/job/completed", { params: requestParams });
  const data = response.data || response;
  return normalizeJobResponse(data, requestParams);
};

const clientJobsApi = {
  getActiveJobs,
  getCompletedJobs,
};

export default clientJobsApi;
