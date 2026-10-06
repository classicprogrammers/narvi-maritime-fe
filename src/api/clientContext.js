import api from "./axios";
import { parseNamedClients } from "../utils/portalClients";

const unwrapContextPayload = (data) => {
  if (data?.result && typeof data.result === "object" && !Array.isArray(data.result)) {
    return data.result;
  }
  return data || {};
};

export async function getClientContext() {
  const response = await api.get("/api/client/context");
  const data = unwrapContextPayload(response.data || response);

  if (data.status === "error") {
    const error = new Error(data.message || "Failed to load clients.");
    error.response = { data, status: response.status };
    throw error;
  }

  const clients = parseNamedClients(data.clients);
  return {
    status: data.status || "success",
    multiClient: data.multi_client === true || clients.length > 1,
    clients,
    selectedClient:
      data.selected_client && data.selected_client !== false
        ? parseNamedClients([data.selected_client])[0] || null
        : null,
  };
}

const clientContextApi = {
  getClientContext,
};

export default clientContextApi;
