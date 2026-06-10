import api from "./axios";

export function unwrapNarviResponse(data) {
  if (data?.result != null && typeof data.result === "object" && !Array.isArray(data.result)) {
    return data.result;
  }
  return data;
}

function cleanNarviPayload(payload = {}) {
  const next = { ...payload };
  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (value === undefined || value === null) {
      delete next[key];
      return;
    }
    if (typeof value === "string" && value.trim() === "") {
      delete next[key];
    }
  });
  return next;
}

export function ensureNarviSuccess(data, fallback = "Request failed.") {
  const result = unwrapNarviResponse(data);
  if (result?.status === "error") {
    const message = result.message || fallback;
    const err = new Error(message);
    err.response = { data: result };
    throw err;
  }
  return result;
}

export function extractNarviQuotationError(error, fallback = "Request failed.") {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (data?.result?.message) return data.result.message;
  if (typeof error?.message === "string" && error.message.trim() && error.message !== "Network Error") {
    return error.message;
  }
  if (error?.response?.status === 401) return "Authentication required. Please log in again.";
  if (error?.response?.status === 400) {
    return data?.message || data?.error || "Invalid request to quotation API.";
  }
  return fallback;
}

export async function getNarviQuotations(params = {}) {
  const response = await api.get("/api/narvi/quotation", {
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 50,
      ...params,
    },
  });
  return unwrapNarviResponse(response.data);
}

export async function getNarviQuotation(id) {
  const response = await api.get("/api/narvi/quotation", { params: { id } });
  return unwrapNarviResponse(response.data);
}

export async function getNarviQuotationOptions(payload = {}) {
  const response = await api.post("/api/narvi/quotation/options", {
    page: 1,
    page_size: 50,
    q_client: "",
    q_vessel: "",
    q_so: "",
    ...payload,
  });
  return unwrapNarviResponse(response.data);
}

export async function getNarviQuotationLineOptions(payload = {}) {
  const response = await api.post(
    "/api/narvi/quotation/line/options",
    cleanNarviPayload({
      page: 1,
      page_size: 50,
      ...payload,
    })
  );
  return ensureNarviSuccess(response.data, "Failed to load line options.");
}

export async function createNarviQuotation(payload) {
  const response = await api.post("/api/narvi/quotation/create", payload);
  return unwrapNarviResponse(response.data);
}

export async function updateNarviQuotation(payload) {
  const response = await api.post("/api/narvi/quotation/update", payload);
  return unwrapNarviResponse(response.data);
}

export async function deleteNarviQuotation(id) {
  const response = await api.post("/api/narvi/quotation/delete", { id });
  return unwrapNarviResponse(response.data);
}

const narviQuotation = {
  getNarviQuotations,
  getNarviQuotation,
  getNarviQuotationOptions,
  getNarviQuotationLineOptions,
  createNarviQuotation,
  updateNarviQuotation,
  deleteNarviQuotation,
};

export default narviQuotation;
