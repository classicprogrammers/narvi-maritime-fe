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

export default function Vendors() {
  const history = useHistory();
  const { vendors, isLoading, getVendors, pagination, countries } = useVendor();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(80);
  const [nameSearchValue, setNameSearchValue] = useState("");
  const [overallSearchValue, setOverallSearchValue] = useState("");
  const [filters, setFilters] = useState({ agent_id: "", agent_type: "", country: "" });
  const [sortOrder, setSortOrder] = useState("alphabetical");

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
      getVendors({ page: 1, page_size: 80, ...mapSortOrderToApi("alphabetical") });
    }
  }, [getVendors]);

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
