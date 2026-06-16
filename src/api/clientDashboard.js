import api from "./axios";

export async function getClientDashboard() {
  const response = await api.get("/api/client/dashboard");
  const data = response.data || response;

  if (data.status === "error") {
    throw new Error(data.message || "Failed to load dashboard.");
  }

  return data;
}

export function normalizeClientDashboard(data) {
  const payload = data?.status ? data : data?.result ?? data;
  const charts = payload.charts ?? {};

  return {
    generatedAt: payload.generated_at ?? null,
    client: payload.client ?? null,
    cards: Array.isArray(payload.cards) ? payload.cards : [],
    charts: {
      primary: charts.primary ?? null,
      jobsByStatus: charts.jobs_by_status ?? null,
    },
    summary: payload.summary ?? {},
    recent: {
      stockItems: Array.isArray(payload.recent?.stock_items) ? payload.recent.stock_items : [],
      shippingOrders: Array.isArray(payload.recent?.shipping_orders) ? payload.recent.shipping_orders : [],
    },
  };
}

const clientDashboardApi = {
  getClientDashboard,
  normalizeClientDashboard,
};

export default clientDashboardApi;
