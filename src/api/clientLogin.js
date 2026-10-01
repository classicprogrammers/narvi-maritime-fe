import api from "./axios";
import { showApiModal } from "../components/ApiModal";

const handleApiError = (error, operation) => {
  console.error(`${operation} failed:`, error);

  let errorMessage = error.message || `Failed to ${operation.toLowerCase()}`;
  if (error.response?.data?.result?.message) {
    errorMessage = error.response.data.result.message;
  } else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  } else if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  }

  showApiModal("error", `${operation} Failed`, errorMessage);
  throw new Error(errorMessage);
};

export const createClientLoginApi = async (payload) => {
  try {
    const res = await api.post("/api/client_login/create", payload);
    return res.data;
  } catch (error) {
    return handleApiError(error, "Create Client Login");
  }
};

export const listClientLoginApi = async (params = {}) => {
  try {
    const res = await api.get("/api/client_login/list", { params });
    return res.data;
  } catch (error) {
    return handleApiError(error, "Fetch Client Logins");
  }
};

export const getClientLoginApi = async (id) => {
  try {
    const res = await api.post("/api/client_login/get", { id });
    return res.data;
  } catch (error) {
    return handleApiError(error, "Fetch Client Login");
  }
};

export const updateClientLoginApi = async (payload) => {
  try {
    const res = await api.post("/api/client_login/update", payload);
    return res.data;
  } catch (error) {
    return handleApiError(error, "Update Client Login");
  }
};

export const deleteClientLoginApi = async (id) => {
  try {
    const res = await api.post("/api/client_login/delete", { id });
    return res.data;
  } catch (error) {
    return handleApiError(error, "Delete Client Login");
  }
};

const toClientId = (value) => {
  if (value == null || value === false || value === "") return null;
  if (Array.isArray(value)) return toClientId(value[0]);
  if (typeof value === "object") return toClientId(value.id);
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};

export function parseClientLoginIds(record) {
  const ids = [];
  const seen = new Set();
  const add = (raw) => {
    if (raw == null || raw === false || raw === "") return;
    if (Array.isArray(raw)) {
      const looksLikeTuple =
        raw.length <= 2 &&
        raw.length >= 1 &&
        (typeof raw[0] === "number" || typeof raw[0] === "string") &&
        raw.every((item) => item == null || typeof item !== "object");
      if (looksLikeTuple) {
        add(raw[0]);
        return;
      }
      raw.forEach(add);
      return;
    }
    const id = toClientId(raw);
    if (id == null || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  add(record?.client_ids);
  return ids;
}

export function formatClientLoginNames(record) {
  if (!Array.isArray(record?.client_ids) || !record.client_ids.length) return "";
  return record.client_ids
    .map((item) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return String(item.name || "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .join(", ");
}

export function buildClientLoginIdsPayload(clientIds) {
  const ids = [];
  const seen = new Set();
  (Array.isArray(clientIds) ? clientIds : []).forEach((value) => {
    const id = toClientId(value);
    if (id == null || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
}

