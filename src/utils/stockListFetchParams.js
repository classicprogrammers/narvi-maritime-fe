function isNonEmpty(value) {
  if (value == null || value === false || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
}

/**
 * Stock view/edit columns that GET /api/stock/list can filter with empty / not_empty.
 * days_on_stock is calculated and is rejected by the API, so DAYS ON STOCK shares
 * the DATE ON STOCK presence filter (days only exist once a date on stock is set).
 * Hub and destination empty filters use the presence params, not the id filters.
 */
export const STOCK_EMPTY_FILTER_PARAM_BY_LABEL = {
  VESSEL: "vessel_id",
  "Warning ‼️⛔": "warning",
  SUPPLIER: "supplier_id",
  "REQ NO": "req_no",
  "PO NUMBER": "po_text",
  "SO NUMBER": "so_id",
  "SI NUMBER": "si_number",
  "SI COMBINED": "si_combined",
  "DI NUMBER": "di_no",
  "STOCK STATUS": "stock_status",
  "WAREHOUSE ID": "warehouse_new",
  ORIGIN: "origin_text",
  "VIA HUB 1": "via_hub",
  "VIA HUB 2": "via_hub2",
  "AP DESTINATION": "ap_destination_new",
  DESTINATION: "destination_new",
  "SHIPPING DOCS": "shipping_doc",
  "EXPORT DOC 1": "export_doc",
  "EXPORT DOC 2": "export_doc_2",
  "EXP READY FROM SUPPLIER": "exp_ready_in_stock",
  "DATE ON STOCK": "date_on_stock",
  "DAYS ON STOCK": "date_on_stock",
  "SHIPPED DATE": "shipped_date",
  "DELIVERED DATE": "delivered_date",
  "DG/UN NUMBER": "dg_un",
  "T 1": "t_1",
  REMARKS: "remarks",
  BOXES: "item",
  "WEIGHT KGS": "weight_kg",
  "LWH TEXT": "lwh_text",
  "TOTAL VOLUME CBM": "volume_cbm",
  "TOTAL CW AIR FREIGHT": "cw_air_freight_new",
  CURRENCY: "currency_id",
  VALUE: "value",
  CLIENT: "client_id",
  "INTERNAL REMARKS": "internal_remark",
  FILES: "attachments",
  STOCKITEMID: "stock_item_id",
};

export const STOCK_EMPTY_FILTER_PARAMS = new Set(Object.values(STOCK_EMPTY_FILTER_PARAM_BY_LABEL));

export function stockEmptyFilterParamForLabel(label) {
  return STOCK_EMPTY_FILTER_PARAM_BY_LABEL[label] || null;
}

/** @returns {"empty"|"not_empty"|null} */
export function isStockEmptyPresence(value) {
  if (value == null || value === false || Array.isArray(value)) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "empty" || normalized === "not_empty") return normalized;
  return null;
}

export function readStockEmptyFilters(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next = {};
  for (const [key, mode] of Object.entries(value)) {
    if (!STOCK_EMPTY_FILTER_PARAMS.has(key)) continue;
    const presence = isStockEmptyPresence(mode);
    if (presence) next[key] = presence;
  }
  return next;
}

function hasConcreteFilterValue(value) {
  if (value == null || value === false || value === "") return false;
  if (isStockEmptyPresence(value)) return false;
  if (Array.isArray(value)) return value.some((entry) => hasConcreteFilterValue(entry));
  return String(value).trim() !== "";
}

function paramAlreadyHasValue(params, param) {
  if (param === "date_on_stock") {
    return (
      hasConcreteFilterValue(params.date_on_stock) ||
      hasConcreteFilterValue(params.date_on_stock_from) ||
      hasConcreteFilterValue(params.date_on_stock_to)
    );
  }
  if (param === "via_hub") return hasConcreteFilterValue(params.narvi_stock_via_hub1);
  if (param === "via_hub2") return hasConcreteFilterValue(params.narvi_stock_via_hub2);
  if (param === "ap_destination_new") return hasConcreteFilterValue(params.narvi_stock_ap_destination);
  if (param === "destination_new") {
    return (
      params.has_destination === true ||
      params.has_destination === "true" ||
      hasConcreteFilterValue(params.narvi_stock_destination)
    );
  }
  return hasConcreteFilterValue(params[param]);
}

/**
 * Apply column empty / not_empty filters.
 * A concrete value already on that column is left in place so both are not sent.
 */
export function mergeStockEmptyFilters(params = {}, filters = {}) {
  const next = { ...params };
  if (!filters || typeof filters !== "object") return next;
  for (const [param, mode] of Object.entries(filters)) {
    if (!STOCK_EMPTY_FILTER_PARAMS.has(param)) continue;
    const presence = isStockEmptyPresence(mode);
    if (!presence) continue;
    if (paramAlreadyHasValue(next, param)) continue;
    next[param] = presence;
    if (param === "date_on_stock") {
      delete next.date_on_stock_from;
      delete next.date_on_stock_to;
    }
    if (param === "via_hub") delete next.narvi_stock_via_hub1;
    if (param === "via_hub2") delete next.narvi_stock_via_hub2;
    if (param === "ap_destination_new") delete next.narvi_stock_ap_destination;
    if (param === "destination_new") {
      delete next.has_destination;
      delete next.narvi_stock_destination;
    }
  }
  return next;
}

/**
 * True when the user applied search/filter criteria (not default paged browse).
 * `active` default "true" is not treated as a filter.
 */
export function stockListHasSearchFilters(params = {}) {
  const {
    search,
    name,
    client_id,
    vessel_id,
    stock_status,
    so_id,
    si_number,
    si_combined,
    di_no,
    po_text,
    req_no,
    remarks,
    stock_item_id,
    date_on_stock,
    days_on_stock,
    days_on_stock_min,
    days_on_stock_max,
    date_on_stock_from,
    date_on_stock_to,
    create_date_from,
    create_date_to,
    narvi_stock_via_hub1,
    narvi_stock_via_hub2,
    narvi_stock_ap_destination,
    narvi_stock_destination,
    origin_text,
    supplier_id,
    warehouse_id,
    warehouse_new,
    currency_id,
    active,
    has_destination,
  } = params;

  if (isNonEmpty(search) || isNonEmpty(name)) return true;
  if (isNonEmpty(client_id) || isNonEmpty(vessel_id)) return true;
  if (isNonEmpty(stock_status)) return true;
  if (isNonEmpty(so_id) || isNonEmpty(si_number) || isNonEmpty(si_combined)) return true;
  if (isNonEmpty(di_no) || isNonEmpty(po_text) || isNonEmpty(req_no)) return true;
  if (isNonEmpty(remarks) || isNonEmpty(stock_item_id)) return true;
  if (isNonEmpty(date_on_stock) || isNonEmpty(days_on_stock)) return true;
  if (isNonEmpty(days_on_stock_min) || isNonEmpty(days_on_stock_max)) return true;
  if (isNonEmpty(date_on_stock_from) || isNonEmpty(date_on_stock_to)) return true;
  if (isNonEmpty(create_date_from) || isNonEmpty(create_date_to)) return true;
  if (
    isNonEmpty(narvi_stock_via_hub1) ||
    isNonEmpty(narvi_stock_via_hub2) ||
    isNonEmpty(narvi_stock_ap_destination) ||
    isNonEmpty(narvi_stock_destination) ||
    isNonEmpty(origin_text)
  ) {
    return true;
  }
  if (isNonEmpty(supplier_id) || isNonEmpty(warehouse_id) || isNonEmpty(warehouse_new) || isNonEmpty(currency_id)) return true;
  if (has_destination === true || has_destination === "true") return true;
  if (active != null && String(active).trim() !== "" && String(active) !== "true") return true;
  for (const key of STOCK_EMPTY_FILTER_PARAMS) {
    if (isNonEmpty(params[key])) return true;
  }
  return false;
}

/**
 * Paginate by default (page + page_size).
 * Only send `fetch_all=true` when the caller explicitly opts in via `fetchAll`.
 */
export function withStockListFetchMode(params = {}, { page = 1, page_size = 50, fetchAll = false } = {}) {
  const { fetch_all: _fa, page: _p, page_size: _ps, ...rest } = params;
  if (fetchAll) {
    return { ...rest, fetch_all: true };
  }
  return { ...rest, page, page_size };
}
