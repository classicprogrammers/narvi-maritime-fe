import api from "./axios";

export function extractClientTariffErrorMessage(error, fallback = "Request failed.") {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (data?.result?.message) return data.result.message;
  return fallback;
}

export async function getClientTariffs(params = {}) {
  const response = await api.get("/api/client/tariff", { params });
  return response.data;
}

export async function getClientTariffOptions(payload = {}) {
  const response = await api.post("/api/client/tariff/options", {
    page: 1,
    page_size: 50,
    q_location: "",
    q_agent: "",
    ...payload,
  });
  return response.data;
}

export async function createClientTariff(payload) {
  const response = await api.post("/api/client/tariff/create", payload);
  return response.data;
}

export async function updateClientTariff(payload) {
  const response = await api.post("/api/client/tariff/update", payload);
  return response.data;
}

export async function deleteClientTariff(id) {
  const response = await api.post("/api/client/tariff/delete", { id });
  return response.data;
}
