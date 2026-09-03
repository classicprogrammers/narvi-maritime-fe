import api from "./axios";

function unwrapRateApiData(response) {
  const data = response?.data || response || {};
  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Rate API request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Rate API request failed");
  }
  // Options/list payloads are nested under JSON-RPC `result`.
  if (data.result && typeof data.result === "object" && !Array.isArray(data.result)) {
    return data.result;
  }
  return data;
}

export const getRateListOptionsApi = async (payload = {}) => {
  const response = await api.post("/api/rate/list/options", {
    page: 1,
    page_size: 200,
    ...payload,
  });
  return unwrapRateApiData(response);
};

export const updateRateListApi = async (rateData = {}) => {
  const payload = rateData.lines ? rateData : { lines: [rateData] };
  const response = await api.post("/api/rate/list/update", payload);
  return unwrapRateApiData(response);
};

export const createRateListApi = async (rateData) => {
  const response = await api.post("/api/rate/list/create", rateData);
  return unwrapRateApiData(response);
};

export const deleteRateListApi = async (id) => {
  const response = await api.post("/api/rate/list/delete", { id });
  return unwrapRateApiData(response);
};
