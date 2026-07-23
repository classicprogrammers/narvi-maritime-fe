import api from "./axios";

export const updateRateListApi = async (rateData = {}) => {
  const payload = rateData.lines ? rateData : { lines: [rateData] };
  const response = await api.post("/api/rate/list/update", payload);
  const data = response.data || response;

  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Failed to update rate(s)");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Failed to update rate(s)");
  }

  return data;
};

export const createRateListApi = async (rateData) => {
  const response = await api.post("/api/rate/list/create", rateData);
  const data = response.data || response;

  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Failed to create rate");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Failed to create rate");
  }

  return data;
};

export const deleteRateListApi = async (id) => {
  const response = await api.post("/api/rate/list/delete", { id });
  const data = response.data || response;

  if (data.result?.status === "error") {
    throw new Error(data.result.message || "Failed to delete rate");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Failed to delete rate");
  }

  return data;
};
