export const RATE_LIST_STORAGE_KEY = "narvi_rate_list_state";

export const defaultRateListState = {
  search: "",
  debouncedSearch: "",
  filters: {
    rate_type: "",
    client_id: "",
    agent_id: "",
    currency_id: "",
    rate_name: "",
    import_group: "",
  },
  page: 1,
  pageSize: 50,
  showFilterFields: false,
  selectedRates: {},
};

export function readPersistedRateListState() {
  try {
    const raw =
      typeof sessionStorage !== "undefined"
        ? sessionStorage.getItem(RATE_LIST_STORAGE_KEY)
        : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    const defaultFilters = defaultRateListState.filters;
    return {
      search: typeof p.search === "string" ? p.search : "",
      debouncedSearch:
        typeof p.debouncedSearch === "string"
          ? p.debouncedSearch
          : typeof p.search === "string"
            ? p.search
            : "",
      filters: {
        rate_type:
          typeof p.filters?.rate_type === "string" ? p.filters.rate_type : defaultFilters.rate_type,
        client_id: p.filters?.client_id ?? defaultFilters.client_id,
        agent_id: p.filters?.agent_id ?? defaultFilters.agent_id,
        currency_id: p.filters?.currency_id ?? defaultFilters.currency_id,
        rate_name:
          typeof p.filters?.rate_name === "string" ? p.filters.rate_name : defaultFilters.rate_name,
        import_group:
          typeof p.filters?.import_group === "string"
            ? p.filters.import_group
            : defaultFilters.import_group,
      },
      page: typeof p.page === "number" && p.page >= 1 ? p.page : 1,
      pageSize: typeof p.pageSize === "number" && p.pageSize >= 1 ? p.pageSize : 50,
      showFilterFields: Boolean(p.showFilterFields),
      selectedRates:
        p.selectedRates && typeof p.selectedRates === "object" ? p.selectedRates : {},
    };
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
