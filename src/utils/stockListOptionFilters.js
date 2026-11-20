/**
 * Helpers for POST /api/stock/list/options on the stock list filters.
 * The endpoint narrows every option list to stock matching the OTHER selected filters,
 * so the selected filters are sent with the same names as GET /api/stock/list.
 */

const SELECTED_FILTER_KEYS = [
  "client_id",
  "vessel_id",
  "so_id",
  "active",
  "stock_status",
  "narvi_stock_via_hub1",
  "narvi_stock_via_hub2",
  "narvi_stock_ap_destination",
  "narvi_stock_destination",
  "warehouse_id",
  "warehouse_new",
  "origin_text",
  "si_number",
  "si_combined",
  "di_no",
  "po_text",
  "req_no",
  "stock_item_id",
];

const isBlankValue = (value) =>
  value == null || value === false || value === "" || (typeof value === "string" && value.trim() === "");

/** Keep only the selected filters the options endpoint understands; drop empty values. */
export const buildStockListOptionsFilterParams = (filters = {}) => {
  const params = {};
  if (!filters || typeof filters !== "object") return params;
  SELECTED_FILTER_KEYS.forEach((key) => {
    const value = filters[key];
    if (Array.isArray(value)) {
      const list = value.map((v) => (v == null ? "" : String(v).trim())).filter(Boolean);
      if (list.length > 0) params[key] = list;
      return;
    }
    if (isBlankValue(value)) return;
    params[key] = typeof value === "string" ? value.trim() : value;
  });
  return params;
};

/** Stable key for the selected filters (used to know when to re-call the options endpoint). */
export const stockListOptionsFilterKey = (filters = {}) => {
  const params = buildStockListOptionsFilterParams(filters);
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .map((key) => [key, Array.isArray(params[key]) ? [...params[key]].sort() : String(params[key])])
  );
};

/** Client / vessel options: `{ id, name }`. */
export const normalizeIdNameFilterOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  raw.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const name = String(item.name ?? item.label ?? "").trim();
    const rawId = item.id ?? item.value_id;
    if (!name || rawId == null || rawId === "") return;
    const id = String(rawId);
    if (seen.has(id)) return;
    seen.add(id);
    result.push({ id, name, key: `id-${id}` });
  });
  return result;
};

/**
 * Origin options: the endpoint returns `{ name, value }` (no id). Use the name as the id so the
 * existing id-based selects and pins keep working; numeric ids are kept when the API sends them.
 */
export const normalizeOriginFilterOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  raw.forEach((item) => {
    if (item == null || item === false) return;
    const source = typeof item === "object" ? item : { name: item };
    const name = String(source.name ?? source.value ?? source.label ?? "").trim();
    if (!name) return;
    const rawId = source.id ?? source.value_id;
    const numericId = rawId != null && rawId !== "" && Number.isFinite(Number(rawId)) ? Number(rawId) : null;
    const id = numericId != null ? numericId : name;
    const key = String(id);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ id, name, key: `origin-${key}` });
  });
  return result;
};

/** SO options: `{ id, name, so_id }`. `value` is the SO number sent as `so_id`. */
export const normalizeSoFilterOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  raw.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const soId = item.so_id ?? item.value;
    if (soId == null || soId === "") return;
    const value = String(soId).trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    const name = String(item.name ?? item.label ?? value).trim() || value;
    result.push({ id: item.id ?? value, name, value, key: `so-${value}` });
  });
  return result;
};

/** Text options (SI, DI, PO, Req No, Stock Item ID): `{ name, value }`. */
export const normalizeValueFilterOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  raw.forEach((item) => {
    if (item == null || item === false) return;
    const source = typeof item === "object" ? item : { name: item, value: item };
    const rawValue = source.value ?? source.name ?? source.label;
    if (rawValue == null || rawValue === "") return;
    const value = String(rawValue).trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    const name = String(source.name ?? source.label ?? value).trim() || value;
    result.push({ name, value, key: `val-${value}` });
  });
  return result;
};

/** Warehouse options: `{ name, warehouse_new }`. The option name is sent as `warehouse_new`. */
export const normalizeWarehouseFilterOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const result = [];
  raw.forEach((item) => {
    if (item == null || item === false) return;
    const source = typeof item === "object" ? item : { name: item };
    const rawName = source.name ?? source.warehouse_new ?? source.label;
    if (rawName == null || rawName === "") return;
    const name = String(rawName).trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    result.push({ name, value: name, key: `wh-${name}` });
  });
  return result;
};
