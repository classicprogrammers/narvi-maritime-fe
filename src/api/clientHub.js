import api from "./axios";

export const getClientHubs = async (params = {}) => {
  try {
    const requestParams = {};
    if (params.search != null && String(params.search).trim() !== "") {
      requestParams.search = String(params.search).trim();
    }

    const response = await api.get("/api/client/hub", { params: requestParams });
    const data = response.data || response;

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch client hubs");
    }

    return {
      status: data.status || "success",
      count: data.count ?? 0,
      client: data.client || null,
      hubs: Array.isArray(data.hubs) ? data.hubs : [],
    };
  } catch (error) {
    throw error;
  }
};

const clientHubApi = {
  getClientHubs,
};

export default clientHubApi;

