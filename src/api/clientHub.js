import api from "./axios";

export const getClientHubLabel = (hub) => {
  if (hub == null || hub === false) return "";
  if (typeof hub === "string" || typeof hub === "number") return String(hub).trim();
  return String(hub.name || hub.hub || hub.label || hub.display_name || "").trim();
};

export const getClientHubFilterId = (hub) => {
  const raw = hub != null && typeof hub === "object" ? hub.id : hub;
  if (raw == null || raw === false || raw === "" || raw === "false") return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
};

export const toClientHubOptionValue = (hub) => {
  const id = getClientHubFilterId(hub);
  if (id != null) return String(id);
  const name = getClientHubLabel(hub);
  return name ? `name:${name}` : "";
};

const normalizeClientHub = (hub) => {
  const name = getClientHubLabel(hub);
  if (!name) return null;
  if (typeof hub === "string" || typeof hub === "number") {
    return { id: false, name, hub: name };
  }
  const id = getClientHubFilterId(hub);
  return {
    ...hub,
    id: id != null ? id : false,
    name,
    hub: name,
  };
};

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
      hubs: Array.isArray(data.hubs) ? data.hubs.map(normalizeClientHub).filter(Boolean) : [],
    };
  } catch (error) {
    throw error;
  }
};

const clientHubApi = {
  getClientHubs,
};

export default clientHubApi;

