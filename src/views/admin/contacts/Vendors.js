import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import VendorsTable from "views/admin/contacts/components/VendorsTable";
import { columnsDataAgents } from "views/admin/contacts/variables/columnsData";
import { useVendor } from "redux/hooks/useVendor";

const mapSortOrderToApi = (uiSort) => {
  switch (uiSort) {
    case "newest": return { sort_by: "create_date", sort_order: "desc" };
    case "oldest": return { sort_by: "create_date", sort_order: "asc" };
    case "alphabetical":
    default: return { sort_by: "name", sort_order: "asc" };
  }
};

// Resolve free-text country filter to country_id (int) for API
function resolveCountryId(countryFilter, countries) {
  if (!countryFilter || String(countryFilter).trim() === "") return undefined;
  const typed = String(countryFilter).trim();
  const num = parseInt(typed, 10);
  if (!Number.isNaN(num)) return num;
  const list = Array.isArray(countries) ? countries : (countries?.countries || []);
  const lower = typed.toLowerCase();
  const found = list.find(
    (c) =>
      (c.name && c.name.toLowerCase() === lower) ||
      (c.name && c.name.toLowerCase().includes(lower))
  );
  return found ? found.id : undefined;
}

const AGENT_LIST_STORAGE_KEY = "narvi_agent_list_state";

function readPersistedAgentListState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(AGENT_LIST_STORAGE_KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      page: typeof p.page === "number" ? p.page : 1,
      pageSize: typeof p.pageSize === "number" ? p.pageSize : 80,
      nameSearchValue: typeof p.nameSearchValue === "string" ? p.nameSearchValue : "",
      overallSearchValue: typeof p.overallSearchValue === "string" ? p.overallSearchValue : "",
      filters: {
        agent_id: p.filters?.agent_id != null ? p.filters.agent_id : "",
        agent_type: p.filters?.agent_type != null ? p.filters.agent_type : "",
        country: p.filters?.country != null ? p.filters.country : "",
      },
      sortOrder: p.sortOrder === "newest" || p.sortOrder === "oldest" || p.sortOrder === "alphabetical" ? p.sortOrder : "alphabetical",
    };
  } catch {
    return null;
  }
}

function writePersistedAgentListState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(AGENT_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const defaultAgentListState = {
  page: 1,
  pageSize: 80,
  nameSearchValue: "",
  overallSearchValue: "",
  filters: { agent_id: "", agent_type: "", country: "" },
  sortOrder: "alphabetical",
};

export default function Vendors() {
  const history = useHistory();
  const { vendors, isLoading, getVendors, pagination, countries } = useVendor();
  const [savedState] = useState(() => readPersistedAgentListState() || defaultAgentListState);
  const [page, setPage] = useState(savedState.page);
  const [pageSize, setPageSize] = useState(savedState.pageSize);
  const [nameSearchValue, setNameSearchValue] = useState(savedState.nameSearchValue);
  const [overallSearchValue, setOverallSearchValue] = useState(savedState.overallSearchValue);
  const [filters, setFilters] = useState(savedState.filters);
  const [sortOrder, setSortOrder] = useState(savedState.sortOrder);

  // Persist filter state so it survives navigation (e.g. edit agent then back)
  useEffect(() => {
    writePersistedAgentListState({
      page,
      pageSize,
      nameSearchValue,
      overallSearchValue,
      filters,
      sortOrder,
    });
  }, [page, pageSize, nameSearchValue, overallSearchValue, filters, sortOrder]);

  // Keep latest countries in ref so buildFetchParams doesn't depend on countries ref (avoids infinite loop)
  const countriesRef = useRef(countries);
  countriesRef.current = countries;

  // Build params for API; country -> country_id for API
  const buildFetchParams = useCallback(
    (overrides = {}) => {
      const sortApi = mapSortOrderToApi(overrides.sortOrder ?? sortOrder);
      return {
        name: nameSearchValue?.trim() || undefined,
        search: overallSearchValue?.trim() || undefined,
        agentsdb_id: filters.agent_id?.trim() || undefined,
        agent_type: filters.agent_type?.trim() || undefined,
        country_id: resolveCountryId(filters.country, countriesRef.current),
        page: overrides.page ?? page,
        page_size: overrides.page_size ?? pageSize,
        sort_by: sortApi.sort_by,
        sort_order: sortApi.sort_order,
      };
    },
    [nameSearchValue, overallSearchValue, filters, page, pageSize, sortOrder]
  );

  const fetchVendors = useCallback(
    (opts = {}) => {
      const p = { ...buildFetchParams(), ...opts };
      getVendors(p);
    },
    [getVendors, buildFetchParams]
  );

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      // Use current state (restored from sessionStorage or defaults) for first fetch
      fetchVendors();
    }
  }, [fetchVendors]);

  // Search on change (debounced) – skip initial mount
  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchVendors({ page: 1 });
    }, 400);
    return () => clearTimeout(timer);
  }, [nameSearchValue, overallSearchValue, fetchVendors]);

  const refreshAgents = useCallback(() => {
    fetchVendors({ page });
  }, [fetchVendors, page]);

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
      fetchVendors({ page: newPage });
    },
    [fetchVendors]
  );

  const topLevelAgents = useMemo(() => {
    if (!Array.isArray(vendors)) return [];
    return vendors.filter((agent) => {
      const parentValue = agent?.parent_id ?? agent?.parentId ?? agent?.parent;
      return (
        parentValue === false ||
        parentValue === null ||
        parentValue === undefined ||
        parentValue === ""
      );
    });
  }, [vendors]);

  const tableData = topLevelAgents;

  const serverPagination = useMemo(
    () =>
      pagination && pagination.total_count !== undefined
        ? {
            page: pagination.page ?? page,
            page_size: pagination.page_size ?? pageSize,
            total_count: pagination.total_count ?? 0,
            total_pages: pagination.total_pages ?? 1,
            has_next: pagination.has_next ?? false,
            has_previous: pagination.has_previous ?? false,
          }
        : {
            page,
            page_size: pageSize,
            total_count: topLevelAgents.length,
            total_pages: 1,
            has_next: false,
            has_previous: false,
          },
    [pagination, page, pageSize, topLevelAgents.length]
  );

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setNameSearchValue("");
    setOverallSearchValue("");
    setFilters({ agent_id: "", agent_type: "", country: "" });
    setSortOrder("alphabetical");
    setPage(1);
    getVendors({ page: 1, page_size: pageSize, ...mapSortOrderToApi("alphabetical") });
  }, [getVendors, pageSize]);

  const handleSortOrderChange = useCallback(
    (v) => {
      setSortOrder(v);
      setPage(1);
      fetchVendors({ page: 1, ...mapSortOrderToApi(v) });
    },
    [fetchVendors]
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <VendorsTable
          columnsData={columnsDataAgents}
          tableData={tableData}
          isLoading={isLoading}
          pagination={serverPagination}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          nameSearchValue={nameSearchValue}
          onNameSearchChange={setNameSearchValue}
          overallSearchValue={overallSearchValue}
          onOverallSearchChange={setOverallSearchValue}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAll}
          onRefresh={refreshAgents}
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
        />
      </VStack>
    </Box>
  );
}
