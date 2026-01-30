import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataClient } from "views/admin/contacts/variables/columnsData";
import { useCustomer } from "redux/hooks/useCustomer";

const STORAGE_KEY = "clientsListSearchState";

function loadPersistedState() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      return {
        searchValue: typeof data.searchValue === "string" ? data.searchValue : "",
        filters: data.filters && typeof data.filters === "object"
          ? {
              client_code: data.filters.client_code ?? "",
              type_client: data.filters.type_client ?? "",
              email: data.filters.email ?? "",
            }
          : { client_code: "", type_client: "", email: "" },
        page: typeof data.page === "number" && data.page >= 1 ? data.page : 1,
        pageSize: [50, 80, 100].includes(data.pageSize) ? data.pageSize : 80,
      };
    }
  } catch (_) {}
  return null;
}

function savePersistedState(searchValue, filters, page, pageSize) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ searchValue, filters, page, pageSize })
    );
  } catch (_) {}
}

export default function Customer() {
  const { customers, isLoading, getCustomers, pagination } = useCustomer();
  const [page, setPage] = useState(() => loadPersistedState()?.page ?? 1);
  const [pageSize, setPageSize] = useState(() => loadPersistedState()?.pageSize ?? 80);
  const [searchValue, setSearchValue] = useState(() => loadPersistedState()?.searchValue ?? "");
  const [debouncedName, setDebouncedName] = useState(() => loadPersistedState()?.searchValue?.trim() ?? "");
  const [filters, setFilters] = useState(() => loadPersistedState()?.filters ?? { client_code: "", type_client: "", email: "" });
  const isFirstMount = useRef(true);

  // Persist search/filters/page/pageSize so they survive navigation
  useEffect(() => {
    savePersistedState(searchValue, filters, page, pageSize);
  }, [searchValue, filters, page, pageSize]);

  // Debounce client name for API (400ms); reset to page 1 when name changes (skip on initial mount so restored state is kept)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const t = setTimeout(() => {
      setDebouncedName(searchValue.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchValue]);

  // Fetch customers with API params only (no pagination in API)
  const fetchParams = useMemo(
    () => ({
      name: debouncedName || undefined,
      client_code: filters.client_code?.trim() || undefined,
      type_client: filters.type_client?.trim() || undefined,
      email: filters.email?.trim() || undefined,
    }),
    [debouncedName, filters]
  );

  useEffect(() => {
    getCustomers(fetchParams);
  }, [getCustomers, fetchParams]);

  const refreshCustomers = useCallback(() => {
    getCustomers(fetchParams);
  }, [getCustomers, fetchParams]);

  // Frontend-only pagination: slice full list for current page
  const fullList = customers || [];
  const tableData = useMemo(
    () => fullList.slice((page - 1) * pageSize, page * pageSize),
    [fullList, page, pageSize]
  );
  const frontendPagination = useMemo(() => {
    const total_count = fullList.length;
    const total_pages = Math.ceil(total_count / pageSize) || 1;
    return {
      page,
      page_size: pageSize,
      total_count,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    };
  }, [fullList.length, page, pageSize]);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchValue("");
    setFilters({ client_code: "", type_client: "", email: "" });
    setPage(1);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  const handlePageSizeChange = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <CustomerTable
          columnsData={columnsDataClient}
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
          onRefresh={refreshCustomers}
        />
      </VStack>
    </Box>
  );
}
