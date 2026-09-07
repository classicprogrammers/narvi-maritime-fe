export const RATE_LIST_STORAGE_KEY = "narvi_rate_list_state";

export const RATE_LIST_DEFAULT_SORT = {
  sort_by: "id",
  sort_order: "desc",
};

export const defaultRateListState = {
  search: "",
  debouncedSearch: "",
  filters: {
    rate_type: "",
    location_text: "",
    client_id: "",
    agent_id: "",
    currency_id: "",
    rate_text: "",
    import_group: "",
    active: "",
    incl_in_tariff: "",
  },
  page: 1,
  pageSize: 50,
  showFilterFields: false,
  selectedRates: {},
};

export function buildRateListFilterSnapshot(state = {}) {
  const defaultFilters = defaultRateListState.filters;
  return {
    search: typeof state.search === "string" ? state.search : "",
    debouncedSearch:
      typeof state.debouncedSearch === "string"
        ? state.debouncedSearch
        : typeof state.search === "string"
          ? state.search
          : "",
    filters: {
      rate_type:
        typeof state.filters?.rate_type === "string" ? state.filters.rate_type : defaultFilters.rate_type,
      location_text:
        typeof state.filters?.location_text === "string"
          ? state.filters.location_text
          : defaultFilters.location_text,
      client_id: state.filters?.client_id ?? defaultFilters.client_id,
      agent_id: state.filters?.agent_id ?? defaultFilters.agent_id,
      currency_id: state.filters?.currency_id ?? defaultFilters.currency_id,
      rate_text:
        typeof state.filters?.rate_text === "string"
          ? state.filters.rate_text
          : typeof state.filters?.rate_name === "string"
            ? state.filters.rate_name
            : defaultFilters.rate_text,
      import_group:
        typeof state.filters?.import_group === "string"
          ? state.filters.import_group
          : defaultFilters.import_group,
      active: typeof state.filters?.active === "string" ? state.filters.active : defaultFilters.active,
      incl_in_tariff:
        typeof state.filters?.incl_in_tariff === "string"
          ? state.filters.incl_in_tariff
          : defaultFilters.incl_in_tariff,
    },
    page: typeof state.page === "number" && state.page >= 1 ? state.page : 1,
    pageSize: typeof state.pageSize === "number" && state.pageSize >= 1 ? state.pageSize : 50,
    showFilterFields: Boolean(state.showFilterFields),
    selectedRates:
      state.selectedRates && typeof state.selectedRates === "object" ? state.selectedRates : {},
  };
}

export function readPersistedRateListState() {
  try {
    const raw =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(RATE_LIST_STORAGE_KEY)
        : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    return buildRateListFilterSnapshot(p);
  } catch {
    return null;
  }
}

export function writePersistedRateListState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(RATE_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearPersistedRateListState() {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.removeItem(RATE_LIST_STORAGE_KEY);
  } catch {
    // ignore
  }
}
