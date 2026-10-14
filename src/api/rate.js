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

// ---- Agent tariffs (GET /api/agent/rate/tariff) ----

export const getAgentRateTariffsApi = async (params = {}) => {
  const response = await api.get("/api/agent/rate/tariff", { params });
  return response?.data || {};
};

export const getAgentRateTariffOptionsApi = async (payload = {}) => {
  const response = await api.post("/api/agent/rate/tariff/options", {
    page: 1,
    page_size: 200,
    ...payload,
  });
  return unwrapRateApiData(response);
};

// ---- Client rate tariffs (GET /api/client/rate/tariff). Not the legacy /api/client/tariff. ----

export const getClientRateTariffsApi = async (params = {}) => {
  const response = await api.get("/api/client/rate/tariff", { params });
  return response?.data || {};
};

export const getClientRateTariffOptionsApi = async (payload = {}) => {
  const response = await api.post("/api/client/rate/tariff/options", {
    page: 1,
    page_size: 200,
    ...payload,
  });
  return unwrapRateApiData(response);
};

/** Fetch every page of a tariff list (used for full PDF/Excel exports). */
export const fetchAllTariffRows = async (fetchPage, params = {}) => {
  const all = [];
  let page = 1;
  for (;;) {
    const result = await fetchPage({ ...params, page, page_size: 200 });
    const batch = Array.isArray(result.data) ? result.data : [];
    all.push(...batch);
    if (!result.has_next || batch.length === 0 || page >= 200) break;
    page += 1;
  }
  return all;
};
