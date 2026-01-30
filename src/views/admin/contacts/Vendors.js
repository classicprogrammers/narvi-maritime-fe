import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Box, VStack } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import VendorsTable from "views/admin/contacts/components/VendorsTable";
import { columnsDataAgents } from "views/admin/contacts/variables/columnsData";
import { useVendor } from "redux/hooks/useVendor";

const STORAGE_KEY = "agentsListSearchState";
const RETURN_TO_EDIT_KEY = "vendorRegistrationReturnToEdit";

function loadReturnToEdit() {
  try {
    const raw = sessionStorage.getItem(RETURN_TO_EDIT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.vendorId != null && data.vendor) return data;
  } catch (_) {}
  return null;
}

function clearReturnToEdit() {
  try {
    sessionStorage.removeItem(RETURN_TO_EDIT_KEY);
  } catch (_) {}
}

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
              agent_id: data.filters.agent_id ?? "",
              agent_type: data.filters.agent_type ?? "",
              country: data.filters.country ?? "",
            }
          : { agent_id: "", agent_type: "", country: "" },
        page: typeof data.page === "number" && data.page >= 1 ? data.page : 1,
        pageSize: [50, 80, 100].includes(data.pageSize) ? data.pageSize : 50,
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
  const [page, setPage] = useState(() => loadPersistedState()?.page ?? 1);
  const [pageSize, setPageSize] = useState(() => loadPersistedState()?.pageSize ?? 50);
  const [searchValue, setSearchValue] = useState(() => loadPersistedState()?.searchValue ?? "");
  const [filters, setFilters] = useState(() => loadPersistedState()?.filters ?? { agent_id: "", agent_type: "", country: "" });

  // Persist search/filters/page/pageSize so they survive navigation
  useEffect(() => {
    savePersistedState(searchValue, filters, page, pageSize);
  }, [searchValue, filters, page, pageSize]);

  // Build params for API (used only when Search is clicked); country -> country_id for API
  const buildFetchParams = useCallback(
    () => ({
      search: searchValue?.trim() || undefined,
      agentsdb_id: filters.agent_id?.trim() || undefined,
      agent_type: filters.agent_type?.trim() || undefined,
      country_id: resolveCountryId(filters.country, countries),
    }),
    [searchValue, filters, countries]
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

  // If user was editing an agent and navigated away, re-open that agent's edit page when they return to Agents tab
  useEffect(() => {
    const returnToEdit = loadReturnToEdit();
    if (returnToEdit && returnToEdit.vendorId != null && returnToEdit.vendor) {
      clearReturnToEdit();
      history.replace(`/admin/vendor-registration/${returnToEdit.vendorId}`, {
        state: {
          vendorData: returnToEdit.vendor,
          fromReturnToEdit: true,
        },
      });
    }
  }, [history]);

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
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
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
