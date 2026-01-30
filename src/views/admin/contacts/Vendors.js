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
              reg_no: data.filters.reg_no ?? "",
              city: data.filters.city ?? "",
              country: data.filters.country ?? "",
            }
          : { agent_id: "", reg_no: "", city: "", country: "" },
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

export default function Vendors() {
  const history = useHistory();
  const { vendors, isLoading, getVendors, pagination } = useVendor();
  const [page, setPage] = useState(() => loadPersistedState()?.page ?? 1);
  const [pageSize, setPageSize] = useState(() => loadPersistedState()?.pageSize ?? 80);
  const [searchValue, setSearchValue] = useState(() => loadPersistedState()?.searchValue ?? "");
  const [debouncedName, setDebouncedName] = useState(() => loadPersistedState()?.searchValue?.trim() ?? "");
  const [filters, setFilters] = useState(() => loadPersistedState()?.filters ?? { agent_id: "", reg_no: "", city: "", country: "" });
  const isFirstMount = useRef(true);

  // Persist search/filters/page/pageSize so they survive navigation
  useEffect(() => {
    savePersistedState(searchValue, filters, page, pageSize);
  }, [searchValue, filters, page, pageSize]);

  // Debounce company name for API (400ms); reset to page 1 when name changes (skip on initial mount)
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

  // Fetch agents with API params only (no pagination in API)
  const fetchParams = useMemo(
    () => ({
      name: debouncedName || undefined,
      agentsdb_id: filters.agent_id?.trim() || undefined,
      reg_no: filters.reg_no?.trim() || undefined,
      city: filters.city?.trim() || undefined,
      country: filters.country?.trim() || undefined,
    }),
    [debouncedName, filters]
  );

  useEffect(() => {
    getVendors(fetchParams);
  }, [getVendors, fetchParams]);

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
    getVendors(fetchParams);
  }, [getVendors, fetchParams]);

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
    setFilters({ agent_id: "", reg_no: "", city: "", country: "" });
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
        />
      </VStack>
    </Box>
  );
}
