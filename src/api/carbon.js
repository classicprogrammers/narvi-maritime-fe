import api from "./axios";
import { getApiEndpoint } from "../config/api";

function unwrapResponse(data) {
  if (!data || typeof data !== "object") return data;
  if (data.status === "error") {
    throw new Error(data.message || "Carbon API request failed");
  }
  if (data.result && typeof data.result === "object") {
    if (data.result.status === "error") {
      throw new Error(data.result.message || "Carbon API request failed");
    }
    return data.result;
  }
  return data;
}

export function extractCarbonErrorMessage(error, fallback = "Request failed.") {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  if (data?.result?.message) return data.result.message;
  if (error?.message) return error.message;
  return fallback;
}

/** Backend may use `land`; UI uses `road`. */
export function normalizeCarbonMode(mode) {
  const key = String(mode || "").toLowerCase().trim();
  if (key === "land") return "road";
  return key;
}

function normalizeLegs(rawLegs) {
  const list = Array.isArray(rawLegs) ? rawLegs : [];
  return list.map((leg) => ({
    from: leg.from ?? "—",
    to: leg.to ?? "—",
    fromLocationId: leg.from_location_id ?? leg.fromLocationId ?? null,
    toLocationId: leg.to_location_id ?? leg.toLocationId ?? null,
    mode: normalizeCarbonMode(leg.mode),
    modeLabel: leg.mode_label || leg.modeLabel || leg.mode,
    distanceKm: Number(leg.distance_km ?? leg.distanceKm) || 0,
    distanceSource: leg.distance_source ?? leg.distanceSource ?? "",
    preventAutoCalculation: Boolean(leg.prevent_auto_calculation ?? leg.preventAutoCalculation),
    co2eKg: Number(leg.co2e_kg ?? leg.co2eKg) || 0,
    factor: leg.factor != null ? Number(leg.factor) : undefined,
  }));
}

const CLIENT_MODES = ["air", "sea", "road"];

export function normalizeEmissionFactorsList(data) {
  const raw = Array.isArray(data?.factors) ? data.factors : [];
  const byMode = {};
  raw.forEach((row) => {
    const mode = normalizeCarbonMode(row.mode);
    if (!CLIENT_MODES.includes(mode)) return;
    byMode[mode] = {
      mode,
      label: row.label || row.mode,
      factor: Number(row.factor),
      unit: row.unit || "kg_co2e_per_tonne_km",
    };
  });
  return CLIENT_MODES.filter((mode) => byMode[mode]).map((mode) => byMode[mode]);
}

export function factorsListToMap(factors = []) {
  return factors.reduce((acc, row) => {
    if (row.mode) acc[row.mode] = row.factor;
    return acc;
  }, {});
}

export function mapActiveFilterToApi(activeFilter) {
  if (activeFilter === "false") return false;
  if (activeFilter === "all") return "all";
  return true;
}

export const DISTANCE_SOURCE_LABELS = {
  location_matrix: "From location distances",
  location_matrix_no_auto: "Matrix row, no auto-calculation",
  stock_manual: "Manual distance on this stock",
  warehouse_road_default: "Default 120 km",
  default_estimate: "Estimated 2500 km",
};

export function normalizeStockEmissionItem(item = {}) {
  const legs = normalizeLegs(item.legs ?? item.route_legs ?? item.routeLegs);

  return {
    stockItemId: item.stock_item_id ?? item.stockItemId ?? null,
    stockRecordId: item.stock_id ?? item.stockId ?? null,
    stockId: item.stock_item_id ?? item.stockItemId ?? item.stock_id ?? item.stockId,
    stockStatus: item.stock_status ?? item.stockStatus,
    clientName: item.client_name ?? item.clientName ?? "—",
    vesselName: item.vessel_name ?? item.vesselName ?? "—",
    weightKg: Number(item.weight_kg ?? item.weightKg) || 0,
    weightSource: item.weight_source ?? item.weightSource,
    routeLabel: item.route_label ?? item.routeLabel ?? "—",
    primaryMode: normalizeCarbonMode(item.primary_mode ?? item.primaryMode),
    primaryModeLabel: item.primary_mode_label ?? item.primaryModeLabel,
    totalCo2eKg: Number(item.total_co2e_kg ?? item.totalCo2eKg) || 0,
    totalDistanceKm: Number(item.total_distance_km ?? item.totalDistanceKm) || 0,
    isEstimate: item.is_estimate === true,
    carbonUseManualDistance: item.carbon_use_manual_distance === true,
    carbonManualDistanceKm:
      item.carbon_manual_distance_km === false || item.carbon_manual_distance_km == null
        ? ""
        : String(item.carbon_manual_distance_km),
    legs,
  };
}

export async function getEmissionFactorsApi() {
  const response = await api.post(getApiEndpoint("CARBON_EMISSION_FACTORS"), {});
  const data = unwrapResponse(response.data);
  return {
    factors: normalizeEmissionFactorsList(data),
    raw: data,
  };
}

export async function updateEmissionFactorsApi(factors = []) {
  const response = await api.post(getApiEndpoint("CARBON_EMISSION_FACTORS_UPDATE"), {
    factors: factors.map((row) => ({
      mode: row.mode,
      factor: Number(row.factor),
    })),
  });
  const data = unwrapResponse(response.data);
  return {
    factors: normalizeEmissionFactorsList(data),
    raw: data,
  };
}

export async function getStockEmissionsApi(params = {}) {
  const {
    page = 1,
    page_size = 50,
    search = "",
    client_id,
    vessel_id,
    stock_status = "",
    active,
    create_date_from = "",
    create_date_to = "",
    sort_by = "id",
    sort_order = "desc",
  } = params;

  const payload = {
    page,
    page_size,
    sort_by,
    sort_order,
  };

  const trimmedSearch = search ? String(search).trim() : "";
  if (trimmedSearch) payload.search = trimmedSearch;
  if (client_id != null && client_id !== "") payload.client_id = client_id;
  if (vessel_id != null && vessel_id !== "") payload.vessel_id = vessel_id;
  if (stock_status != null && String(stock_status).trim() !== "") {
    payload.stock_status = String(stock_status).trim();
  }
  if (active !== undefined && active !== null && active !== "") {
    payload.active = mapActiveFilterToApi(active);
  }
  if (create_date_from) payload.create_date_from = create_date_from;
  if (create_date_to) payload.create_date_to = create_date_to;

  const response = await api.post(getApiEndpoint("CARBON_STOCK_EMISSIONS"), payload);
  const data = unwrapResponse(response.data);

  const rawItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.stock_emissions)
      ? data.stock_emissions
      : Array.isArray(data.emissions)
        ? data.emissions
        : [];

  const items = rawItems.map(normalizeStockEmissionItem);

  return {
    items,
    stock_status_options: Array.isArray(data.stock_status_options) ? data.stock_status_options : [],
    page: data.page ?? page,
    page_size: data.page_size ?? page_size,
    total_count: data.total_count ?? items.length,
    total_pages: data.total_pages ?? 1,
    raw: data,
  };
}

export function normalizeShippingOrderEmission(item = {}) {
  const rawStocks = item.stock_items ?? item.stockItems;
  return {
    saleOrderId: item.sale_order_id ?? item.saleOrderId,
    soId: item.so_id ?? item.soId ?? "",
    name: item.name ?? "",
    done: item.done ?? "",
    clientName: item.client_name ?? item.clientName ?? "—",
    vesselName: item.vessel_name ?? item.vesselName ?? "—",
    destination: item.destination ?? "",
    stockItemCount: Number(item.stock_item_count ?? item.stockItemCount) || 0,
    totalWeightKg: Number(item.total_weight_kg ?? item.totalWeightKg) || 0,
    totalCo2eKg: Number(item.total_co2e_kg ?? item.totalCo2eKg) || 0,
    totalDistanceKm: Number(item.total_distance_km ?? item.totalDistanceKm) || 0,
    isEstimate: item.is_estimate === true,
    primaryMode: normalizeCarbonMode(item.primary_mode ?? item.primaryMode),
    primaryModeLabel: item.primary_mode_label ?? item.primaryModeLabel ?? "",
    stockItems: Array.isArray(rawStocks) ? rawStocks.map(normalizeStockEmissionItem) : null,
  };
}

function readShippingOrderList(data) {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.shipping_orders)) return data.shipping_orders;
  if (Array.isArray(data?.shipping_order_emissions)) return data.shipping_order_emissions;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function getShippingOrderEmissionsApi(params = {}) {
  const {
    page = 1,
    page_size = 20,
    search = "",
    client_id,
    vessel_id,
    so_id,
    done,
    with_stock_only,
  } = params;

  const payload = { page, page_size };
  const trimmedSearch = search ? String(search).trim() : "";
  if (trimmedSearch) payload.search = trimmedSearch;
  if (client_id != null && client_id !== "") payload.client_id = client_id;
  if (vessel_id != null && vessel_id !== "") payload.vessel_id = vessel_id;
  if (so_id != null && String(so_id).trim() !== "") {
    const raw = String(so_id).trim();
    payload.so_id = /^\d+$/.test(raw) ? Number(raw) : raw;
  }
  if (done != null && String(done).trim() !== "") payload.done = String(done).trim();
  if (with_stock_only === true) payload.with_stock_only = true;

  const response = await api.post(getApiEndpoint("CARBON_SHIPPING_ORDER_EMISSIONS"), payload);
  const data = unwrapResponse(response.data);
  const items = readShippingOrderList(data).map(normalizeShippingOrderEmission);

  return {
    items,
    page: data.page ?? page,
    page_size: data.page_size ?? page_size,
    total_count: data.total_count ?? items.length,
    total_pages: data.total_pages ?? 1,
  };
}

export async function getShippingOrderEmissionDetailApi(saleOrderId) {
  const response = await api.post(getApiEndpoint("CARBON_SHIPPING_ORDER_EMISSIONS_DETAIL"), {
    sale_order_id: Number(saleOrderId),
  });
  const data = unwrapResponse(response.data);
  const order = data.shipping_order || data.order || data;
  return normalizeShippingOrderEmission(order);
}

export async function calculateCarbonApi({ mode, distanceKm, weightKg }) {
  const response = await api.post(getApiEndpoint("CARBON_CALCULATE"), {
    mode: normalizeCarbonMode(mode) === "road" ? "road" : mode,
    distance_km: Number(distanceKm) || 0,
    weight_kg: Number(weightKg) || 0,
  });
  const data = unwrapResponse(response.data);

  return {
    mode: normalizeCarbonMode(data.mode ?? mode),
    modeLabel: data.mode_label ?? data.modeLabel,
    distanceKm: Number(data.distance_km ?? distanceKm) || 0,
    weightKg: Number(data.weight_kg ?? weightKg) || 0,
    factor: Number(data.factor),
    co2eKg: Number(data.co2e_kg ?? data.co2eKg) || 0,
    raw: data,
  };
}

export async function upsertLocationDistanceApi(payload) {
  const response = await api.post(getApiEndpoint("CARBON_LOCATION_DISTANCE_UPSERT"), {
    origin_location_id: Number(payload.origin_location_id),
    destination_location_id: Number(payload.destination_location_id),
    distance_km: Number(payload.distance_km) || 0,
    prevent_auto_calculation: Boolean(payload.prevent_auto_calculation),
  });
  return unwrapResponse(response.data);
}

export async function setStockManualDistanceApi(payload) {
  const response = await api.post(getApiEndpoint("CARBON_STOCK_MANUAL_DISTANCE"), {
    stock_id: Number(payload.stock_id),
    carbon_use_manual_distance: Boolean(payload.carbon_use_manual_distance),
    carbon_manual_distance_km: Number(payload.carbon_manual_distance_km) || 0,
  });
  const data = unwrapResponse(response.data);
  const item = data.item || data.stock || data;
  return item?.stock_id || item?.stock_item_id ? normalizeStockEmissionItem(item) : data;
}
