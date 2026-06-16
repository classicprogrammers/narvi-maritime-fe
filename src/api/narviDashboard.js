import api from "./axios";
import { ensureNarviSuccess, unwrapNarviResponse } from "./narviQuotation";

function chartRowsHaveValues(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  return rows.some((row) => Number(row?.count ?? row?.value ?? 0) > 0);
}

function resolveRateListChart(charts, summary) {
  const chartRows = charts?.rate_list_type;
  if (chartRowsHaveValues(chartRows)) return chartRows;

  const rateList = summary?.rate_list;
  if (!rateList) return chartRows ?? [];

  return [
    { key: "client_specific", label: "Client Specific", count: Number(rateList.client_specific) || 0 },
    { key: "general", label: "General", count: Number(rateList.general) || 0 },
  ];
}

export async function getNarviDashboard(params = {}) {
  const recentLimit = params.recent_limit ?? 5;
  const response = await api.get("/api/narvi/dashboard", {
    params: {
      recent_limit: Math.min(Math.max(Number(recentLimit) || 5, 1), 20),
    },
  });
  return ensureNarviSuccess(response.data, "Failed to load dashboard.");
}

export function normalizeNarviDashboard(data) {
  const payload = unwrapNarviResponse(data);
  const summary = payload.summary ?? {};
  const charts = payload.charts ?? {};

  return {
    generatedAt: payload.generated_at ?? null,
    summary,
    charts: {
      ...charts,
      quotation_line_status:
        charts.quotation_line_status ?? summary.quotations?.line_status_breakdown ?? [],
      quotation_financial_by_status:
        charts.quotation_financial_by_status ?? summary.quotations?.line_financial_by_status ?? [],
      shipping_order_done_status:
        charts.shipping_order_done_status ?? summary.shipping_orders?.done_breakdown ?? [],
      shipping_financial_by_done:
        charts.shipping_financial_by_done ?? summary.shipping_orders?.financial_by_done ?? [],
      stock_active_status:
        charts.stock_active_status ?? summary.stock?.active_status_breakdown ?? [],
      stock_metrics_by_status:
        charts.stock_metrics_by_status ?? summary.stock?.metrics_by_status ?? [],
      rate_list_type: resolveRateListChart(charts, summary),
    },
    recentQuotations: Array.isArray(payload.recent_quotations) ? payload.recent_quotations : [],
  };
}

const narviDashboard = {
  getNarviDashboard,
  normalizeNarviDashboard,
};

export default narviDashboard;
