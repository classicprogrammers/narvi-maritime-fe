import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataClient } from "views/admin/contacts/variables/columnsData";
import { useCustomer } from "redux/hooks/useCustomer";

const mapSortOrderToApi = (uiSort) => {
  switch (uiSort) {
    case "newest": return { sort_by: "create_date", sort_order: "desc" };
    case "oldest": return { sort_by: "create_date", sort_order: "asc" };
    case "alphabetical":
    default: return { sort_by: "name", sort_order: "asc" };
  }
};

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

export default function Customer() {
  const history = useHistory();
  const { customers, isLoading, getCustomers, pagination, countries } = useCustomer();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(80);
  const [nameSearchValue, setNameSearchValue] = useState("");
  const [overallSearchValue, setOverallSearchValue] = useState("");
  const [filters, setFilters] = useState({ client_code: "", email: "", country: "" });
  const [sortOrder, setSortOrder] = useState("alphabetical");

  const countriesRef = useRef(countries);
  countriesRef.current = countries;
  const buildFetchParams = useCallback(
    (overrides = {}) => {
      const sortApi = mapSortOrderToApi(overrides.sortOrder ?? sortOrder);
      return {
        name: nameSearchValue?.trim() || undefined,
        search: overallSearchValue?.trim() || undefined,
        client_code: filters.client_code?.trim() || undefined,
        email: filters.email?.trim() || undefined,
        country_id: resolveCountryId(filters.country, countriesRef.current),
        page: overrides.page ?? page,
        page_size: overrides.page_size ?? pageSize,
        sort_by: sortApi.sort_by,
        sort_order: sortApi.sort_order,
      };
    },
    [nameSearchValue, overallSearchValue, filters, page, pageSize, sortOrder]
  );

  const fetchCustomers = useCallback(
    (opts = {}) => {
      const p = { ...buildFetchParams(), ...opts };
      getCustomers(p);
    },
    [getCustomers, buildFetchParams]
  );

  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      getCustomers({ page: 1, page_size: 80, ...mapSortOrderToApi("alphabetical") });
    }
  }, [getCustomers]);

  // Search on change (debounced) – skip initial mount
  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchCustomers({ page: 1 });
    }, 400);
    return () => clearTimeout(timer);
  }, [nameSearchValue, overallSearchValue, fetchCustomers]);

  const refreshCustomers = useCallback(() => {
    fetchCustomers({ page });
  }, [fetchCustomers, page]);

  const handlePageChange = useCallback(
    (newPage) => {
      setPage(newPage);
      fetchCustomers({ page: newPage });
    },
    [fetchCustomers]
  );

  const tableData = customers || [];

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
            total_count: tableData.length,
            total_pages: 1,
            has_next: false,
            has_previous: false,
          },
    [pagination, page, pageSize, tableData.length]
  );

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setNameSearchValue("");
    setOverallSearchValue("");
    setFilters({ client_code: "", email: "", country: "" });
    setSortOrder("alphabetical");
    setPage(1);
    getCustomers({ page: 1, page_size: pageSize, ...mapSortOrderToApi("alphabetical") });
  }, [getCustomers, pageSize]);

  const handleSortOrderChange = useCallback(
    (v) => {
      setSortOrder(v);
      setPage(1);
      fetchCustomers({ page: 1, ...mapSortOrderToApi(v) });
    },
    [fetchCustomers]
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <CustomerTable
          columnsData={columnsDataClient}
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
          sortOrder={sortOrder}
          onSortOrderChange={handleSortOrderChange}
          onClearAll={handleClearAll}
          onRefresh={refreshCustomers}
        />
      </VStack>
    </Box>
  );
}
