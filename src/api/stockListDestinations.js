import api from "./axios";

function parseListPayload(data, listKey) {
  const root = data?.data ?? data ?? {};
  const res = root.result && typeof root.result === "object" ? root.result : root;
  const list = res[listKey] ?? root[listKey];
  return {
    items: Array.isArray(list) ? list : [],
    total_count: res.total_count ?? root.total_count ?? (Array.isArray(list) ? list.length : 0),
    total_pages: res.total_pages ?? root.total_pages ?? 0,
    page: res.page ?? root.page ?? 1,
    page_size: res.page_size ?? root.page_size ?? 50,
  };
}

function assertNotError(data) {
  if (data?.result?.status === "error") {
    throw new Error(data.result.message || "Request failed");
  }
  if (data?.status === "error") {
    throw new Error(data.message || "Request failed");
  }
}

const stockListDestinationsAPI = {
  listDestinations: async ({ search = "", page = 1, page_size = 50 } = {}) => {
    const params = { page, page_size };
    const q = String(search ?? "").trim();
    if (q) params.search = q;
    const response = await api.get("/api/stock/list/destinations", { params });
    const data = response.data;
    assertNotError(data);
    return parseListPayload(data, "destinations");
  },

  getDestinationById: async (id) => {
    const response = await api.get("/api/stock/list/destinations", { params: { id } });
    const data = response.data;
    assertNotError(data);
    const parsed = parseListPayload(data, "destinations");
    if (parsed.items.length === 1) return parsed.items[0];
    const single = data?.destination ?? data?.result?.destination ?? data?.data?.destination;
    if (single) return single;
    return parsed.items[0] ?? null;
  },

  createDestination: async ({ name }) => {
    const response = await api.post("/api/stock/list/destination/create", { name });
    return response.data;
  },

  updateDestination: async (id, { name }) => {
    const response = await api.post("/api/stock/list/destination/update", { id, name });
    return response.data;
  },

  deleteDestination: async (id) => {
    const response = await api.post("/api/stock/list/destination/delete", { id });
    return response.data;
  },
};

export default stockListDestinationsAPI;
