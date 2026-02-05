import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import VendorsTable from "views/admin/contacts/components/VendorsTable";
import { columnsDataAgents } from "views/admin/contacts/variables/columnsData";
import { useVendor } from "redux/hooks/useVendor";

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
  const [pageSize, setPageSize] = useState(50);
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({ agent_id: "", agent_type: "", country: "" });

  // Keep latest countries in ref so buildFetchParams doesn't depend on countries ref (avoids infinite loop)
  const countriesRef = useRef(countries);
  countriesRef.current = countries;

  // Build params for API (used only when Search is clicked); country -> country_id for API
  const buildFetchParams = useCallback(
    () => ({
      search: searchValue?.trim() || undefined,
      agentsdb_id: filters.agent_id?.trim() || undefined,
      agent_type: filters.agent_type?.trim() || undefined,
      country_id: resolveCountryId(filters.country, countriesRef.current),
    }),
    [searchValue, filters]
  );

  // Fetch only when user clicks Search (and initial load once)
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      getVendors({});
    }
  }, [getVendors]);

  const handleSearch = useCallback(() => {
    setPage(1);
    getVendors(buildFetchParams());
  }, [getVendors, buildFetchParams]);

  const refreshAgents = useCallback(() => {
    getVendors(buildFetchParams());
  }, [getVendors, buildFetchParams]);

  // Filter top-level agents (backend may return all; keep for safety)
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

  // Frontend-only pagination: slice full list for current page
  const tableData = useMemo(
    () => topLevelAgents.slice((page - 1) * pageSize, page * pageSize),
    [topLevelAgents, page, pageSize]
  );
  const frontendPagination = useMemo(() => {
    const total_count = topLevelAgents.length;
    const total_pages = Math.ceil(total_count / pageSize) || 1;
    return {
      page,
      page_size: pageSize,
      total_count,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    };
  }, [topLevelAgents.length, page, pageSize]);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchValue("");
    setFilters({ agent_id: "", agent_type: "", country: "" });
    setPage(1);
    getVendors({});
  }, [getVendors]);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <VendorsTable
          columnsData={columnsDataAgents}
          tableData={tableData}
          isLoading={isLoading}
          pagination={frontendPagination}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearAll}
          onRefresh={refreshAgents}
          onSearch={handleSearch}
        />
      </VStack>
    </Box>
  );
}
