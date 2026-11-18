import api from "./axios";
import { getApiEndpoint } from "../config/api";

const unwrapError = (data, fallback) => {
  if (data?.result?.status === "error") {
    throw new Error(data.result.message || fallback);
  }
  if (data?.status === "error") {
    throw new Error(data.message || fallback);
  }
};

const OPTIONAL_KEYS = [
  "client_id",
  "search",
  "entry_date_from",
  "entry_date_to",
  "follow_up_date_from",
  "follow_up_date_to",
  "sort_by",
  "sort_order",
  "fetch_all",
];

export const getClientSales = async (params = {}) => {
  const requestParams = {};
  const page = params.page != null && params.page >= 1 ? params.page : 1;
  const pageSize =
    params.page_size != null && params.page_size > 0 ? params.page_size : 50;
  requestParams.page = page;
  requestParams.page_size = pageSize;

  OPTIONAL_KEYS.forEach((key) => {
    const value = params[key];
    if (value != null && String(value).trim() !== "") {
      requestParams[key] = typeof value === "string" ? value.trim() : value;
    }
  });

  const response = await api.get(getApiEndpoint("CLIENT_SALES"), {
    params: requestParams,
  });
  const data = response.data || response;
  unwrapError(data, "Failed to fetch sales notes");

  const list = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.result?.data)
      ? data.result.data
      : [];
  const meta = data?.data !== undefined ? data : data?.result || data;

  return {
    status: data.status || "success",
    data: list,
    total_count: meta.total_count ?? list.length,
    page: meta.page ?? page,
    page_size: meta.page_size ?? pageSize,
    total_pages: meta.total_pages ?? 1,
    has_next: meta.has_next ?? false,
    has_previous: meta.has_previous ?? false,
  };
};

export const createClientSale = async (payload) => {
  const response = await api.post(getApiEndpoint("CLIENT_SALES_CREATE"), payload);
  const data = response.data || response;
  unwrapError(data, "Failed to create sales note");
  return data;
};

export const updateClientSale = async (payload) => {
  const response = await api.post(getApiEndpoint("CLIENT_SALES_UPDATE"), payload);
  const data = response.data || response;
  unwrapError(data, "Failed to update sales note");
  return data;
};

export const deleteClientSale = async (id) => {
  const response = await api.post(getApiEndpoint("CLIENT_SALES_DELETE"), { id });
  const data = response.data || response;
  unwrapError(data, "Failed to delete sales note");
  return data;
};

export default {
  getClientSales,
  createClientSale,
  updateClientSale,
  deleteClientSale,
};
