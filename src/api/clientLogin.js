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

