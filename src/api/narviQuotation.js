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
  const raw = error?.response?.data;
  const unwrapped = unwrapNarviResponse(raw ?? {});

  if (typeof unwrapped?.message === "string" && unwrapped.message.trim()) return unwrapped.message;
  if (typeof raw?.message === "string" && raw.message.trim()) return raw.message;
  if (typeof raw?.error === "string" && raw.error.trim()) return raw.error;
  if (typeof raw?.result?.message === "string" && raw.result.message.trim()) return raw.result.message;
  if (typeof error?.message === "string" && error.message.trim() && error.message !== "Network Error") {
    return error.message;
  }
  if (error?.response?.status === 401) return "Authentication required. Please log in again.";
  if (error?.response?.status === 400) {
    return unwrapped?.message || raw?.message || raw?.error || fallback;
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
  const result = unwrapNarviResponse(response.data);
  if (result?.status === "error") {
    const err = new Error(result.message || "Failed to load quotation.");
    err.response = { data: result };
    throw err;
  }
  if (result?.quotation && typeof result.quotation === "object" && !Array.isArray(result.quotation)) {
    return result.quotation;
  }
  if (result?.data && typeof result.data === "object" && !Array.isArray(result.data)) {
    return result.data;
  }
  if (Array.isArray(result?.data)) {
    const match = result.data.find((row) => String(row.id) === String(id));
    if (match) return match;
    if (result.data.length === 1) return result.data[0];
  }
  return result;
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
  return ensureNarviSuccess(response.data, "Failed to create quotation.");
}

export async function updateNarviQuotation(payload) {
  const response = await api.post("/api/narvi/quotation/update", payload);
  return ensureNarviSuccess(response.data, "Failed to update quotation.");
}

export async function deleteNarviQuotation(id) {
  const response = await api.post("/api/narvi/quotation/delete", { id });
  return ensureNarviSuccess(response.data, "Failed to delete quotation.");
}

export async function getQuotationBuildOrigins({ client_id, search } = {}) {
  const response = await api.get("/api/narvi/quotation/build/origins", {
    params: cleanNarviPayload({ client_id, search }),
  });
  return ensureNarviSuccess(response.data, "Failed to load origins.");
}

export async function getQuotationBuildRates(params = {}) {
  const response = await api.get("/api/narvi/quotation/build/rates", {
    params: cleanNarviPayload(params),
  });
  return ensureNarviSuccess(response.data, "Failed to load rates.");
}

export async function createQuotationFromSelection(payload) {
  const response = await api.post("/api/narvi/quotation/create-from-selection", payload);
  return ensureNarviSuccess(response.data, "Failed to create quotation.");
}

export async function acceptNarviQuotation(payload) {
  const response = await api.post("/api/narvi/quotation/accept", payload);
  return ensureNarviSuccess(response.data, "Failed to accept quotation.");
}

export async function reviseNarviQuotation(id) {
  const response = await api.post("/api/narvi/quotation/revise", { id });
  return ensureNarviSuccess(response.data, "Failed to revise quotation.");
}

export async function readyForInvoiceNarviQuotation(id) {
  const response = await api.post("/api/narvi/quotation/ready-for-invoice", { id });
  return ensureNarviSuccess(response.data, "Failed to mark quotation ready for invoice.");
}

export async function archiveNarviQuotation(id) {
  const response = await api.post("/api/narvi/quotation/archive", { id });
  return ensureNarviSuccess(response.data, "Failed to archive quotation.");
}

export async function getNarviQuotationCopyText(id) {
  const response = await api.get("/api/narvi/quotation/copy-text", { params: { id } });
  return ensureNarviSuccess(response.data, "Failed to load copy text.");
}

export async function getNarviQuotationVersions(id) {
  const response = await api.get("/api/narvi/quotation/versions", { params: { id } });
  return ensureNarviSuccess(response.data, "Failed to load versions.");
}

const narviQuotation = {
  getNarviQuotations,
  getNarviQuotation,
  getNarviQuotationOptions,
  getNarviQuotationLineOptions,
  createNarviQuotation,
  updateNarviQuotation,
  deleteNarviQuotation,
  getQuotationBuildOrigins,
  getQuotationBuildRates,
  createQuotationFromSelection,
  acceptNarviQuotation,
  reviseNarviQuotation,
  readyForInvoiceNarviQuotation,
  archiveNarviQuotation,
  getNarviQuotationCopyText,
  getNarviQuotationVersions,
};

export default narviQuotation;
