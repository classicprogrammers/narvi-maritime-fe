/**
 * Persisted filter state for /admin/shipping-orders (SoNumberTab).
 * Stock list SO links pass filter via URL + module cache (Strict Mode / new tab).
 */

export const SHIPPING_ORDER_LIST_STORAGE_KEY = "narvi_shipping_order_list_state";
export const PENDING_SO_FILTER_KEY = "narvi_pending_so_filter";

/** Survives React Strict Mode remount after URL is stripped. */
let pendingSoFilterCache = null;

/** Default PIC names for ATH / SIN preset chips. */
export const SHIPPING_ORDER_DEFAULT_ATH_PIC_NAMES = ["Amanta", "Igor", "Tasos"];
export const SHIPPING_ORDER_DEFAULT_SIN_PIC_NAMES = ["Alexandra", "Bali", "Martin"];

export function resolvePicIdsByNames(pics = [], names = []) {
  if (!Array.isArray(pics) || !Array.isArray(names)) return [];
  const findPicByName = (name) =>
    pics.find((p) => p.name && p.name.toLowerCase() === String(name).toLowerCase());
  return names
    .map((name) => findPicByName(name))
    .filter(Boolean)
    .map((p) => Number(p.id))
    .filter((id) => Number.isFinite(id));
}

export const SHIPPING_ORDER_STATUS_FILTER_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archive", label: "Archive" },
  { value: "cancelled", label: "Cancelled" },
  { value: "done", label: "Done" },
  { value: "pending_pod", label: "Pending POD" },
  { value: "ready_for_invoice", label: "Ready for Invoice" },
];

/** Status values for Ready for Invoice preset chips (OR match on API). */
export const SHIPPING_ORDER_READY_FOR_INVOICE_DONE = ["ready_for_invoice", "pending_pod"];

const resolveEntityId = (value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "object") {
    const id = value.id ?? value.value;
    return id != null && id !== "" ? id : undefined;
  }
  return value;
};

/** Normalize client filter value for GET /api/shipping/orders (id number when possible). */
export function normalizeShippingOrderClientId(value) {
  const id = resolveEntityId(value);
  if (id == null || id === "") return undefined;
  const asNumber = Number(id);
  if (Number.isFinite(asNumber)) return asNumber;
  return id;
}

const normalizeStoredClientFilter = (value) => {
  const id = normalizeShippingOrderClientId(value);
  return id != null ? id : null;
};

const normalizePicIdsList = (picIds) => {
  if (!Array.isArray(picIds) || picIds.length === 0) return undefined;
  const list = picIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  return list.length ? list : undefined;
};

/** Query params for GET /api/shipping/orders from SO Number Tracker advanced filters. */
export function buildShippingOrderListQueryParams({
  activeFilters = {},
  activeATHPics = [],
  activeSINPics = [],
  athReadyForInvoicePics = [],
  sinReadyForInvoicePics = [],
  activeClientFilter = null,
  readyForInvoiceClientFilter = null,
  searchClientFilter = null,
  searchPicFilter = null,
  searchStatusFilter = "",
} = {}) {
  const params = {};
  const f = activeFilters;

  if (f.activeATH) {
    params.done = "active";
    const picIds = normalizePicIdsList(activeATHPics);
    if (picIds) params.pic_new = picIds;
  } else if (f.activeSIN) {
    params.done = "active";
    const picIds = normalizePicIdsList(activeSINPics);
    if (picIds) params.pic_new = picIds;
  } else if (f.athReadyForInvoice) {
    params.done = [...SHIPPING_ORDER_READY_FOR_INVOICE_DONE];
    const picIds = normalizePicIdsList(athReadyForInvoicePics);
    if (picIds) params.pic_new = picIds;
  } else if (f.sinReadyForInvoice) {
    params.done = [...SHIPPING_ORDER_READY_FOR_INVOICE_DONE];
    const picIds = normalizePicIdsList(sinReadyForInvoicePics);
    if (picIds) params.pic_new = picIds;
  } else if (f.activeClient) {
    params.done = "active";
  } else if (f.readyForInvoiceClient) {
    params.done = [...SHIPPING_ORDER_READY_FOR_INVOICE_DONE];
  }

  let clientId;
  if (f.activeClient) {
    clientId = normalizeShippingOrderClientId(activeClientFilter);
  } else if (f.readyForInvoiceClient) {
    clientId = normalizeShippingOrderClientId(readyForInvoiceClientFilter);
  } else {
    clientId = normalizeShippingOrderClientId(searchClientFilter);
  }

  if (clientId != null && clientId !== "") {
    params.client_id = clientId;
  }

  if (!params.pic_new && searchPicFilter != null && searchPicFilter !== "") {
    const picId = Number(searchPicFilter);
    if (Number.isFinite(picId)) {
      params.pic_new = [picId];
    }
  }

  if (!params.done && searchStatusFilter) {
    params.done = searchStatusFilter;
  }

  return params;
}

export const defaultShippingOrderListState = {
  searchValue: "",
  searchQuery: "",
  searchClientFilter: null,
  searchVesselFilter: null,
  searchCountryFilter: null,
  searchPicFilter: null,
  searchStatusFilter: "",
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
      searchClientFilter: normalizeStoredClientFilter(p.searchClientFilter),
      searchVesselFilter: p.searchVesselFilter != null ? p.searchVesselFilter : null,
      searchCountryFilter: p.searchCountryFilter != null ? p.searchCountryFilter : null,
      searchPicFilter: p.searchPicFilter != null ? p.searchPicFilter : null,
      searchStatusFilter:
        typeof p.searchStatusFilter === "string" ? p.searchStatusFilter : "",
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
      activeClientFilter: normalizeStoredClientFilter(p.activeClientFilter),
      readyForInvoiceClientFilter:
        normalizeStoredClientFilter(p.readyForInvoiceClientFilter),
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

/** Resolve shipping order record id for stock form dropdown (M2O so_id.id). */
export function resolveStockSoIdForForm(stock, shippingOrders = []) {
  if (!stock) return null;
  if (typeof stock.so_id === "object" && stock.so_id != null && stock.so_id.id != null) {
    return String(stock.so_id.id);
  }
  if (stock.so_id != null && stock.so_id !== "" && stock.so_id !== false) {
    const raw = String(stock.so_id);
    if (/^\d+$/.test(raw)) return raw;
  }
  const legacy = stock.stock_so_number ?? stock.so_number;
  if (legacy != null && legacy !== "" && Array.isArray(shippingOrders) && shippingOrders.length > 0) {
    const legacyStr = String(legacy).trim().replace(/^SO-/i, "");
    const match = shippingOrders.find(
      (s) =>
        String(s.so_id) === legacyStr ||
        String(s.so_number || s.name || "")
          .trim()
          .replace(/^SO-/i, "") === legacyStr ||
        String(s.id) === legacyStr
    );
    if (match?.id != null) return String(match.id);
  }
  return null;
}

/** Display label for a shipping order row (e.g. SO-3674). */
export function getShippingOrderDisplayLabel(order) {
  if (!order) return "";
  if (order.so_id != null && order.so_id !== "" && order.so_id !== false) {
    return `SO-${order.so_id}`;
  }
  const name = order.so_number ?? order.name;
  if (name != null && String(name).trim() !== "") {
    const str = String(name).trim();
    return /^SO-/i.test(str) ? str : `SO-${str.replace(/^SO-/i, "")}`;
  }
  return order.id != null ? `SO-${order.id}` : "";
}

/** Options for SimpleSearchableSelect on stock forms. */
export function buildShippingOrderSelectOptions(shippingOrders = []) {
  return (Array.isArray(shippingOrders) ? shippingOrders : [])
    .filter((so) => so && so.id != null)
    .map((so) => ({
      id: so.id,
      name: getShippingOrderDisplayLabel(so),
    }));
}

/** Normalize form soId for comparison (shipping order record id or null). */
export function normalizeStockFormSoId(value) {
  if (value == null || value === "" || value === false) return null;
  if (typeof value === "object" && value != null && value.id != null) {
    return String(value.id);
  }
  return String(value);
}

/** Compare two form soId values. */
export function stockFormSoIdsEqual(a, b) {
  return normalizeStockFormSoId(a) === normalizeStockFormSoId(b);
}

/** Build so_id payload for stock create/update; false clears the link. */
export function buildStockSoIdPayloadValue(soId, shippingOrders = []) {
  if (soId == null || soId === "" || soId === false) return false;
  return buildStockSoIdM2O(soId, shippingOrders) || false;
}

/** Compare transformed so_id payload values. */
export function stockSoIdPayloadValuesEqual(a, b, shippingOrders = []) {
  const left = buildStockSoIdPayloadValue(a, shippingOrders);
  const right = buildStockSoIdPayloadValue(b, shippingOrders);
  if (left === false && right === false) return true;
  if (left && right && typeof left === "object" && typeof right === "object") {
    return String(left.id) === String(right.id) && String(left.name) === String(right.name);
  }
  return false;
}

/** Build M2O so_id payload { id, name } for stock create/update. */
export function buildStockSoIdM2O(soId, shippingOrders = []) {
  if (soId == null || soId === "" || soId === false) return undefined;
  const id = Number(soId);
  if (!Number.isFinite(id)) return undefined;
  const order = (Array.isArray(shippingOrders) ? shippingOrders : []).find(
    (s) => String(s.id) === String(soId)
  );
  let name = "";
  if (order) {
    if (order.so_id != null && order.so_id !== "" && order.so_id !== false) {
      name = String(order.so_id);
    } else {
      name = String(order.so_number ?? order.name ?? "")
        .trim()
        .replace(/^SO-/i, "");
    }
  }
  return { id, name: name || String(id) };
}

/** SO number for stock edit/create form inputs (M2O so_id.name, stock_so_number, etc.). @deprecated use resolveStockSoIdForForm */
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

  if (item.soId != null && item.soId !== "") {
    const built = buildStockSoIdM2O(item.soId, item._shippingOrders || []);
    const fromBuilt = getSoNumberSearchKeyFromField(built);
    if (fromBuilt) return buildFilterFromSearchKey(fromBuilt);
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
