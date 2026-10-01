import api from "./axios";
import { extractClientsFromPayload } from "../utils/portalClients";

export const getClientVessels = async (params = {}) => {
  try {
    const requestParams = {};
    if (params.search != null && String(params.search).trim() !== "") {
      requestParams.search = String(params.search).trim();
    }

    const response = await api.get("/api/client/vessel", { params: requestParams });
    const data = response.data || response;

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch client vessels");
    }

    return {
      status: data.status || "success",
      count: data.count ?? 0,
      clients: extractClientsFromPayload(data),
      client: data.client || null,
      vessels: Array.isArray(data.vessels) ? data.vessels : [],
    };
  } catch (error) {
    throw error;
  }
};

const clientVesselApi = {
  getClientVessels,
};

export default clientVesselApi;

