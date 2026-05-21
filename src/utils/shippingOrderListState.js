/**
 * Persisted filter state for /admin/shipping-orders (SoNumberTab).
 * Stock list SO links pass filter via URL + module cache (Strict Mode / new tab).
 */

export const SHIPPING_ORDER_LIST_STORAGE_KEY = "narvi_shipping_order_list_state";
export const PENDING_SO_FILTER_KEY = "narvi_pending_so_filter";

/** Survives React Strict Mode remount after URL is stripped. */
let pendingSoFilterCache = null;

export const defaultShippingOrderListState = {
  searchValue: "",
  searchQuery: "",
  searchClientFilter: null,
  searchVesselFilter: null,
  searchCountryFilter: null,
  page: 1,
  sortBy: "id",
  sortOrder: "desc",
  activeFilters: {
    activeATH: false,
    activeSIN: false,
    activeClient: false,
    readyForInvoiceClient: false,
    athReadyForInvoice: false,
    sinReadyForInvoice: false,
  },
  activeATHPics: [],
  activeSINPics: [],
  athReadyForInvoicePics: [],
  sinReadyForInvoicePics: [],
  activeClientFilter: null,
  readyForInvoiceClientFilter: null,
  sortConfig: { field: null, direction: "asc" },
  nextActionSortOption: "none",
};

export function readPersistedShippingOrderListState() {
  try {
    const raw =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(SHIPPING_ORDER_LIST_STORAGE_KEY)
        : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      searchValue: typeof p.searchValue === "string" ? p.searchValue : "",
      searchQuery: typeof p.searchQuery === "string" ? p.searchQuery : "",
      searchClientFilter: p.searchClientFilter != null ? p.searchClientFilter : null,
      searchVesselFilter: p.searchVesselFilter != null ? p.searchVesselFilter : null,
      searchCountryFilter: p.searchCountryFilter != null ? p.searchCountryFilter : null,
      page: typeof p.page === "number" ? p.page : 1,
      sortBy: typeof p.sortBy === "string" ? p.sortBy : "id",
      sortOrder: p.sortOrder === "asc" || p.sortOrder === "desc" ? p.sortOrder : "desc",
      activeFilters:
        p.activeFilters && typeof p.activeFilters === "object"
          ? p.activeFilters
          : defaultShippingOrderListState.activeFilters,
      activeATHPics: Array.isArray(p.activeATHPics) ? p.activeATHPics : [],
      activeSINPics: Array.isArray(p.activeSINPics) ? p.activeSINPics : [],
      athReadyForInvoicePics: Array.isArray(p.athReadyForInvoicePics) ? p.athReadyForInvoicePics : [],
      sinReadyForInvoicePics: Array.isArray(p.sinReadyForInvoicePics) ? p.sinReadyForInvoicePics : [],
      activeClientFilter: p.activeClientFilter != null ? p.activeClientFilter : null,
      readyForInvoiceClientFilter:
        p.readyForInvoiceClientFilter != null ? p.readyForInvoiceClientFilter : null,
      sortConfig:
        p.sortConfig && typeof p.sortConfig === "object"
          ? p.sortConfig
          : defaultShippingOrderListState.sortConfig,
      nextActionSortOption:
        p.nextActionSortOption === "none" || p.nextActionSortOption === "next_action"
          ? p.nextActionSortOption
          : "none",
    };
  } catch {
    return null;
  }
}

export function writePersistedShippingOrderListState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(SHIPPING_ORDER_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** Digits-only for API so_id param (e.g. "SO-3674" -> "3674"). */
export function normalizeSoSearchQuery(value) {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/**
 * Business SO number for API search — M2O uses `name` (e.g. "3674"), not internal `id` (e.g. 23417).
 */
export function getSoNumberSearchKeyFromField(soField) {
  if (soField == null || soField === "" || soField === false || soField === "-") {
    return null;
  }
  if (typeof soField === "object") {
    const name = soField.name ?? soField.so_number ?? soField.so_id;
    if (name != null && String(name).trim() !== "") {
      const label = String(name).trim().replace(/^SO-/i, "").trim();
      return label || null;
    }
    const fallback = soField.so_id ?? soField.id;
    if (fallback == null || fallback === "") return null;
    return normalizeSoSearchQuery(fallback) || String(fallback).trim();
  }
  const str = String(soField).trim().replace(/^SO-/i, "").trim();
  return str || null;
}

function buildFilterFromSearchKey(searchKey) {
  if (!searchKey) return null;
  const searchQuery = normalizeSoSearchQuery(searchKey) || searchKey;
  const searchValue = /^SO-/i.test(searchKey) ? searchKey : `SO-${searchKey}`;
  return { searchValue, searchQuery, page: 1 };
}

/** SO number for stock edit/create form inputs (M2O so_id.name, stock_so_number, etc.). */
export function resolveStockSoNumberForForm(stock) {
  if (!stock) return "";
  const key =
    getSoNumberSearchKeyFromField(stock.so_id) ||
    String(stock.stock_so_number ?? stock.so_number ?? "")
      .trim()
      .replace(/^SO-/i, "")
      .trim();
  if (!key || key === "-") return "";
  return /^SO-/i.test(key) ? key : `SO-${key}`;
}

/**
 * Build search filter from a stock list row or form row ({ so_id, stock_so_number, soNumber }).
 * @returns {{ searchValue: string, searchQuery: string, page: number } | null}
 */
export function resolveSoFilterFromStockItem(item) {
  if (!item) return null;

  const fromSoId = getSoNumberSearchKeyFromField(item.so_id);
  if (fromSoId) {
    return buildFilterFromSearchKey(fromSoId);
  }

  const raw = item.stock_so_number ?? item.so_number ?? item.soNumber ?? "";
  const str = String(raw || "").trim();
  if (!str || str === "-") return null;

  const key = str.replace(/^SO-/i, "").trim();
  return buildFilterFromSearchKey(key);
}

export function getShippingOrdersListPath() {
  const base = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  return `${base}/admin/shipping-orders`;
}

export function parseSoFilterFromUrl(search) {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);
  const soIdParam = params.get("so_id");
  if (!soIdParam?.trim()) return null;
  const key = soIdParam.trim().replace(/^SO-/i, "").trim();
  const soLabel = (params.get("so") || params.get("so_label") || "").trim();
  const built = buildFilterFromSearchKey(key);
  if (!built) return null;
  if (soLabel) built.searchValue = soLabel;
  return built;
}

export function stashSoFilterForNavigation(filter) {
  if (!filter?.searchQuery && !filter?.searchValue) return;
  pendingSoFilterCache = {
    searchValue: filter.searchValue || "",
    searchQuery: filter.searchQuery || "",
    page: 1,
  };
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PENDING_SO_FILTER_KEY, JSON.stringify(pendingSoFilterCache));
    }
  } catch {
    // ignore
  }
}

function readPendingSoFilterFromStorage() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(PENDING_SO_FILTER_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_SO_FILTER_KEY);
    const p = JSON.parse(raw);
    if (!p?.searchQuery && !p?.searchValue) return null;
    return {
      searchValue: p.searchValue || "",
      searchQuery: p.searchQuery || "",
      page: 1,
    };
  } catch {
    return null;
  }
}

export function takePendingSoFilter(locationSearch = "") {
  if (pendingSoFilterCache) return pendingSoFilterCache;
  const fromUrl = parseSoFilterFromUrl(locationSearch);
  if (fromUrl) {
    pendingSoFilterCache = fromUrl;
    return fromUrl;
  }
  const fromStorage = readPendingSoFilterFromStorage();
  if (fromStorage) {
    pendingSoFilterCache = fromStorage;
    return fromStorage;
  }
  return null;
}

export function clearPendingSoFilter() {
  pendingSoFilterCache = null;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(PENDING_SO_FILTER_KEY);
    }
  } catch {
    // ignore
  }
}

export function buildShippingOrdersFilteredUrl(filter) {
  const path = getShippingOrdersListPath();
  const params = new URLSearchParams();
  if (filter.searchQuery) params.set("so_id", filter.searchQuery);
  if (filter.searchValue) params.set("so", filter.searchValue);
  const qs = params.toString();
  const relative = qs ? `${path}?${qs}` : path;
  return relative.startsWith("http") ? relative : `${window.location.origin}${relative}`;
}

export function getInitialShippingOrderListState(locationSearch = "") {
  const pending = takePendingSoFilter(locationSearch);
  if (pending) {
    return { ...defaultShippingOrderListState, ...pending };
  }
  return readPersistedShippingOrderListState() || defaultShippingOrderListState;
}

/** Open shipping orders list in a new tab with SO search applied. */
export function openShippingOrdersFiltered(filter) {
  if (!filter?.searchQuery && !filter?.searchValue) return;
  stashSoFilterForNavigation(filter);
  writePersistedShippingOrderListState({
    ...defaultShippingOrderListState,
    searchValue: filter.searchValue || "",
    searchQuery: filter.searchQuery || "",
    page: 1,
  });
  window.open(buildShippingOrdersFilteredUrl(filter), "_blank", "noopener,noreferrer");
}
