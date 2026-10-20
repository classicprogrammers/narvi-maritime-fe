import api from "./axios";

function unwrapChargeCategoryData(response) {
  const data = response?.data || response || {};
  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Charge category request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Charge category request failed");
  }
  if (data.result && typeof data.result === "object" && !Array.isArray(data.result)) {
    return data.result;
  }
  return data;
}

/** List params: search, active=true|false|all (default active only), page, page_size, fetch_all, id. */
export const getChargeCategoriesApi = async (params = {}) => {
  const response = await api.get("/api/charge/category", { params });
  return unwrapChargeCategoryData(response);
};

/** Every category in sequence order, for dropdowns. Active only unless `active` is passed. */
export const getAllChargeCategoriesApi = async (params = {}) => {
  const result = await getChargeCategoriesApi({ fetch_all: true, ...params });
  return normalizeChargeCategoryList(result);
};

export const createChargeCategoryApi = async (payload) => {
  const response = await api.post("/api/charge/category/create", payload);
  return unwrapChargeCategoryData(response);
};

export const updateChargeCategoryApi = async (payload) => {
  const response = await api.post("/api/charge/category/update", payload);
  return unwrapChargeCategoryData(response);
};

export const deleteChargeCategoryApi = async (id) => {
  const response = await api.post("/api/charge/category/delete", { id });
  return unwrapChargeCategoryData(response);
};

export function normalizeChargeCategoryList(result) {
  const source = result?.data ?? result?.items ?? result?.categories ?? result?.records ?? result;
  return Array.isArray(source) ? source : [];
}
