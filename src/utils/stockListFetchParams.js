function isNonEmpty(value) {
  if (value == null || value === false || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
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
    effective_hub,
    hub,
    via_hub,
    narvi_stock_via_hub1,
    narvi_stock_via_hub2,
    narvi_stock_ap_destination,
    supplier_id,
    warehouse_id,
    warehouse_new,
    currency_id,
    active,
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
  if (isNonEmpty(effective_hub) || isNonEmpty(hub) || isNonEmpty(via_hub)) return true;
  if (isNonEmpty(narvi_stock_via_hub1) || isNonEmpty(narvi_stock_via_hub2) || isNonEmpty(narvi_stock_ap_destination)) {
    return true;
  }
  if (isNonEmpty(supplier_id) || isNonEmpty(warehouse_id) || isNonEmpty(warehouse_new) || isNonEmpty(currency_id)) return true;
  if (active != null && String(active).trim() !== "" && String(active) !== "true") return true;
  return false;
}

/** When filters are set, request all matches in one call (`fetch_all=true`). Otherwise paginate. */
export function withStockListFetchMode(params = {}, { page = 1, page_size = 50 } = {}) {
  const { fetch_all: _fa, page: _p, page_size: _ps, ...rest } = params;
  if (stockListHasSearchFilters(rest)) {
    return { ...rest, fetch_all: true };
  }
  return { ...rest, page, page_size };
}
