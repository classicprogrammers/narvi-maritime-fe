import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import CustomerTable from "views/admin/contacts/components/CustomerTable";
import { columnsDataClient } from "views/admin/contacts/variables/columnsData";
import { useCustomer } from "redux/hooks/useCustomer";

export default function Customer() {
  const history = useHistory();
  const { customers, isLoading, getCustomers, pagination } = useCustomer();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({ client_code: "", email: "", country: "" });
  const [sortOrder, setSortOrder] = useState("alphabetical");

  // Build params for API (used only when Search is clicked)
  const buildFetchParams = useCallback(
    () => ({
      search: searchValue?.trim() || undefined,
      client_code: filters.client_code?.trim() || undefined,
      email: filters.email?.trim() || undefined,
    }),
    [searchValue, filters]
  );

  // Fetch only when user clicks Search (and initial load once)
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      getCustomers({});
    }
  }, [getCustomers]);

  const handleSearch = useCallback(() => {
    setPage(1);
    getCustomers(buildFetchParams());
  }, [getCustomers, buildFetchParams]);

  const refreshCustomers = useCallback(() => {
    getCustomers(buildFetchParams());
  }, [getCustomers, buildFetchParams]);

  // Client-side pagination and sort: API returns all matching records
  const fullList = customers || [];
  const sortedList = useMemo(() => {
    const list = [...fullList];
    if (sortOrder === "newest") return list.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
    if (sortOrder === "oldest") return list.sort((a, b) => new Date(a.created_at || a.id) - new Date(b.created_at || b.id));
    return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [fullList, sortOrder]);
  const tableData = useMemo(
    () => sortedList.slice((page - 1) * pageSize, page * pageSize),
    [sortedList, page, pageSize]
  );
  const frontendPagination = useMemo(() => {
    const total_count = sortedList.length;
    const total_pages = Math.ceil(total_count / pageSize) || 1;
    return {
      page,
      page_size: pageSize,
      total_count,
      total_pages,
      has_next: page < total_pages,
      has_previous: page > 1,
    };
  }, [sortedList.length, page, pageSize]);

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchValue("");
    setFilters({ client_code: "", email: "", country: "" });
    setSortOrder("alphabetical");
    setPage(1);
    getCustomers({});
  }, [getCustomers]);

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
          sortOrder={sortOrder}
          onSortOrderChange={(v) => {
            setSortOrder(v);
            setPage(1);
          }}
          onClearAll={handleClearAll}
          onRefresh={refreshCustomers}
          onSearch={handleSearch}
        />
      </VStack>
    </Box>
  );
}
