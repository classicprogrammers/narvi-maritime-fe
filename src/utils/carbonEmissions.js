/**
 * Carbon emission estimation for logistics (GLEC-style tonne-km model).
 * Frontend estimates until backend persistence is available.
 */

export const TRANSPORT_MODES = [
  { value: "air", label: "Air Freight" },
  { value: "sea", label: "Sea Freight" },
  { value: "road", label: "Road / Truck" },
  { value: "rail", label: "Rail" },
  { value: "courier", label: "Courier" },
];

/** kg CO₂e per tonne-km (indicative GLEC-aligned defaults) */
export const EMISSION_FACTORS = {
  air: 0.93,
  sea: 0.016,
  road: 0.096,
  rail: 0.028,
  courier: 0.65,
};

const MODE_LABELS = Object.fromEntries(TRANSPORT_MODES.map((m) => [m.value, m.label]));

/** Great-circle approximations for common lanes (km). Keys are normalized "FROM-TO". */
const ROUTE_DISTANCE_KM = {
  "AMS-DXB": 5200,
  "DXB-SIN": 5800,
  "AMS-SIN": 10500,
  "LHR-DXB": 5500,
  "FRA-SIN": 10200,
  "JFK-LHR": 5500,
  "SIN-HKG": 2600,
  "HKG-SHA": 1200,
  "DXB-JED": 1650,
  "RTM-SIN": 10500,
  "HAM-SIN": 10400,
  "SIN-PER": 3900,
  "SIN-MEL": 6100,
  "DXB-BOM": 1900,
  "SIN-BOM": 3900,
  "LHR-JFK": 5500,
  "CDG-DXB": 5200,
  "SIN-DXB": 5800,
};

const DEFAULT_LEG_DISTANCE_KM = 2500;
const DEFAULT_ROAD_LEG_DISTANCE_KM = 120;

function normalizePoint(value) {
  if (value == null || value === false) return "";
  return String(value).trim().toUpperCase().replace(/\s+/g, " ");
}

function routeKey(from, to) {
  const a = normalizePoint(from);
  const b = normalizePoint(to);
  if (!a || !b) return "";
  return `${a}-${b}`;
}

export function estimateDistanceKm(from, to) {
  const key = routeKey(from, to);
  if (!key) return DEFAULT_LEG_DISTANCE_KM;
  if (ROUTE_DISTANCE_KM[key]) return ROUTE_DISTANCE_KM[key];
  const reverse = key.split("-").reverse().join("-");
  if (ROUTE_DISTANCE_KM[reverse]) return ROUTE_DISTANCE_KM[reverse];
  const a = normalizePoint(from);
  const b = normalizePoint(to);
  if (a.length === 3 && b.length === 3) return DEFAULT_LEG_DISTANCE_KM;
  if (a === b) return 0;
  return DEFAULT_LEG_DISTANCE_KM;
}

export function resolveWeightKg(stock = {}) {
  const cw = Number(stock.cw_air_freight_new ?? stock.cw_air_freight ?? stock.cw_freight);
  if (Number.isFinite(cw) && cw > 0) return cw;

  const weight = Number(stock.weight_kg ?? stock.weight_kgs ?? stock.weight);
  if (Number.isFinite(weight) && weight > 0) return weight;

  const cbm = Number(stock.volume_cbm ?? stock.volume_dim);
  if (Number.isFinite(cbm) && cbm > 0) return Math.max(cbm * 167, 0);

  return 0;
}

function looksLikeAirportCode(value) {
  const v = normalizePoint(value);
  return /^[A-Z]{3}$/.test(v);
}

export function inferTransportMode(stock = {}, legIndex = 0, totalLegs = 1) {
  const shipmentType = String(stock.shipment_type || "").toLowerCase().trim();
  if (shipmentType && EMISSION_FACTORS[shipmentType] != null) return shipmentType;

  const hasAirCw = Number(stock.cw_air_freight_new ?? stock.cw_air_freight) > 0;
  const hasAwb = Boolean(stock.awb_number || stock.shipping_doc);
  const fromAir = looksLikeAirportCode(stock.origin_text || stock.origin);
  const viaAir = looksLikeAirportCode(stock.via_hub) || looksLikeAirportCode(stock.via_hub2);

  if (hasAirCw || hasAwb || fromAir || viaAir) {
    if (legIndex === 0 && stock.warehouse_new && totalLegs > 2) return "road";
    return "air";
  }

  const dest = String(stock.destination_new || stock.destination || stock.vessel_destination || "").toLowerCase();
  if (dest.includes("port") || dest.includes("vessel")) return "sea";

  if (legIndex === 0 && stock.warehouse_new) return "road";
  if (totalLegs === 1) return "sea";
  return legIndex === totalLegs - 1 ? "sea" : "road";
}

export function buildRoutePoints(stock = {}) {
  const points = [
    stock.origin_text || stock.origin,
    stock.warehouse_new || stock.warehouse_id || stock.stock_warehouse,
    stock.via_hub,
    stock.via_hub2,
    stock.ap_destination_new || stock.ap_destination,
    stock.destination_new || stock.destination || stock.vessel_destination,
  ]
    .map((p) => (p == null || p === false ? "" : String(p).trim()))
    .filter(Boolean);

  const unique = [];
  points.forEach((point) => {
    const key = normalizePoint(point);
    if (!unique.some((u) => normalizePoint(u) === key)) unique.push(point);
  });
  return unique;
}

export function calculateLegEmissions({ mode, distanceKm, weightKg, factors = EMISSION_FACTORS }) {
  const tonnes = (Number(weightKg) || 0) / 1000;
  const distance = Math.max(Number(distanceKm) || 0, 0);
  const factor = factors[mode] ?? factors.road ?? 0.096;
  return distance * tonnes * factor;
}

export function calculateManualEmissions({ mode, distanceKm, weightKg }) {
  const co2eKg = calculateLegEmissions({ mode, distanceKm, weightKg });
  return {
    co2eKg,
    mode,
    modeLabel: MODE_LABELS[mode] || mode,
    distanceKm: Number(distanceKm) || 0,
    weightKg: Number(weightKg) || 0,
    factor: EMISSION_FACTORS[mode] ?? EMISSION_FACTORS.road,
  };
}

export function calculateStockEmissions(stock = {}) {
  const weightKg = resolveWeightKg(stock);
  const routePoints = buildRoutePoints(stock);

  if (routePoints.length < 2) {
    const singleMode = inferTransportMode(stock, 0, 1);
    const distanceKm = DEFAULT_LEG_DISTANCE_KM;
    const co2eKg = calculateLegEmissions({ mode: singleMode, distanceKm, weightKg });
    return {
      stockId: stock.stock_item_id || stock.id,
      weightKg,
      routeLabel: routePoints.join(" → ") || "—",
      primaryMode: singleMode,
      primaryModeLabel: MODE_LABELS[singleMode] || singleMode,
      totalCo2eKg: co2eKg,
      legs: [
        {
          from: routePoints[0] || "—",
          to: routePoints[1] || "Destination",
          mode: singleMode,
          modeLabel: MODE_LABELS[singleMode] || singleMode,
          distanceKm,
          co2eKg,
        },
      ],
      hasRoute: routePoints.length > 0,
      isEstimate: true,
    };
  }

  const legs = [];
  let totalCo2eKg = 0;

  for (let i = 0; i < routePoints.length - 1; i += 1) {
    const from = routePoints[i];
    const to = routePoints[i + 1];
    const mode = inferTransportMode(stock, i, routePoints.length - 1);
    const distanceKm =
      mode === "road" && i === 0
        ? DEFAULT_ROAD_LEG_DISTANCE_KM
        : estimateDistanceKm(from, to);
    const co2eKg = calculateLegEmissions({ mode, distanceKm, weightKg });
    totalCo2eKg += co2eKg;
    legs.push({
      from,
      to,
      mode,
      modeLabel: MODE_LABELS[mode] || mode,
      distanceKm,
      co2eKg,
    });
  }

  const modeCounts = legs.reduce((acc, leg) => {
    acc[leg.mode] = (acc[leg.mode] || 0) + leg.co2eKg;
    return acc;
  }, {});
  const primaryMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "sea";

  return {
    stockId: stock.stock_item_id || stock.id,
    weightKg,
    routeLabel: routePoints.join(" → "),
    primaryMode,
    primaryModeLabel: MODE_LABELS[primaryMode] || primaryMode,
    totalCo2eKg,
    legs,
    hasRoute: true,
    isEstimate: true,
  };
}

export function formatCo2e(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(digits)} t`;
  return `${n.toFixed(digits)} kg`;
}

export function formatCo2eKg(value, digits = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: digits })} kg CO₂e`;
}

export function getClientName(stock, clients = []) {
  const clientId = stock.client_id?.id ?? stock.client_id;
  if (stock.client?.name) return stock.client.name;
  if (typeof stock.client_id === "object" && stock.client_id?.name) return stock.client_id.name;
  const match = clients.find((c) => String(c.id) === String(clientId));
  return match?.name || stock.client_name || "—";
}

export function getVesselName(stock, vessels = []) {
  const vesselId = stock.vessel_id?.id ?? stock.vessel_id;
  if (stock.vessel?.name) return stock.vessel.name;
  if (typeof stock.vessel_id === "object" && stock.vessel_id?.name) return stock.vessel_id.name;
  const match = vessels.find((v) => String(v.id) === String(vesselId));
  return match?.name || stock.vessel_name || "—";
}
