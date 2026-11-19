import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  VStack,
  useColorModeValue,
} from "@chakra-ui/react";

import SalesNotesTable from "views/admin/contacts/components/SalesNotesTable";
import { FailureModal, SuccessModal } from "components/modals";
import {
  deleteClientSale,
  getClientSales,
} from "api/clientSales";
import { updateCustomerFollowUpApi } from "api/customer";
import {
  countActiveDateRanges,
  nextSortState,
  validateDateRanges,
} from "utils/ledgerListQuery";
import {
  DEFAULT_SALES_SORT,
  SALES_DATE_FILTER_FIELDS,
  SALES_SORT_KEYS,
  buildSalesListParams,
  sanitizeSalesListState,
} from "utils/salesNotes";

const SALES_NOTES_STORAGE_KEY = "narvi_sales_notes_list_state";

function readPersistedSalesListState() {
  try {
    const raw =
      typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SALES_NOTES_STORAGE_KEY) : null;
    return sanitizeSalesListState(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeSalesListState(null);
  }
}

function writePersistedSalesListState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(SALES_NOTES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const EMPTY_PAGINATION = {
  page: 1,
  page_size: 50,
  total_count: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

export default function SalesNotes() {
  const [savedState] = useState(readPersistedSalesListState);
  const [page, setPage] = useState(savedState.page);
  const pageSize = savedState.pageSize;
  const [searchInput, setSearchInput] = useState(savedState.search);
  const [search, setSearch] = useState(savedState.search.trim());
  const [dateRanges, setDateRanges] = useState(savedState.dateRanges);
  const [sort, setSort] = useState(savedState.sort);

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const history = useHistory();
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [failureMessage, setFailureMessage] = useState("");
  const cancelRef = useRef();

  const modalBg = useColorModeValue("white", "gray.800");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");

  const dateErrors = useMemo(
    () => validateDateRanges(dateRanges, SALES_DATE_FILTER_FIELDS),
    [dateRanges]
  );
  const hasDateErrors = Object.keys(dateErrors).length > 0;

  useEffect(() => {
    writePersistedSalesListState({ page, pageSize, search: searchInput, dateRanges, sort });
  }, [page, pageSize, searchInput, dateRanges, sort]);

  // Debounced search: commit the trimmed text 400 ms after typing stops and go back to page 1
  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return undefined;
    const timer = setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, search]);

  // Ignore responses that belong to an older request
  const requestIdRef = useRef(0);
  useEffect(() => {
    // An invalid date range sends no request; the previous results stay
    if (hasDateErrors) {
      setIsLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError("");
    getClientSales(buildSalesListParams({ page, pageSize, search, dateRanges, sort }))
      .then((res) => {
        if (requestId !== requestIdRef.current) return;
        setRows(res.data);
        setPagination({
          page: res.page,
          page_size: res.page_size,
          total_count: res.total_count,
          total_pages: res.total_pages,
          has_next: res.has_next,
          has_previous: res.has_previous,
        });
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setRows([]);
        setPagination(EMPTY_PAGINATION);
        setLoadError(err?.response?.data?.message || err?.message || "Failed to fetch sales notes");
      })
      .finally(() => {
        if (requestId === requestIdRef.current) setIsLoading(false);
      });
  }, [page, pageSize, search, dateRanges, sort, reloadKey, hasDateErrors]);

  const handleDateChange = useCallback((name, value) => {
    setDateRanges((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  }, []);

  const handleSort = useCallback((key) => {
    if (!SALES_SORT_KEYS.includes(key)) return;
    setSort((prev) => nextSortState(prev, key));
    setPage(1);
  }, []);

  const handleClearAll = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setDateRanges({});
    setSort(DEFAULT_SALES_SORT);
    setPage(1);
    setReloadKey((key) => key + 1);
  }, []);

  const hasActiveFilters = countActiveDateRanges(dateRanges, SALES_DATE_FILTER_FIELDS) > 0;
  const hasAnyFilterState =
    !!searchInput.trim() ||
    hasActiveFilters ||
    sort.sortBy !== DEFAULT_SALES_SORT.sortBy ||
    sort.sortOrder !== DEFAULT_SALES_SORT.sortOrder;

  const reload = () => setReloadKey((key) => key + 1);

  // follow_up belongs to the customer: toggle it there, then refresh the notes list
  const [followUpSavingIds, setFollowUpSavingIds] = useState({});
  const handleToggleFollowUp = async (customerId, checked) => {
    if (followUpSavingIds[customerId]) return;
    setFollowUpSavingIds((prev) => ({ ...prev, [customerId]: true }));
    try {
      // The API module already shows the backend error message in a modal
      await updateCustomerFollowUpApi(customerId, checked);
      reload();
    } catch {
      // nothing to roll back: the switch reflects the server value
    } finally {
      setFollowUpSavingIds((prev) => {
        const next = { ...prev };
        delete next[customerId];
        return next;
      });
    }
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteClientSale(noteToDelete.id);
      setNoteToDelete(null);
      setSuccessMessage("Sales note deleted successfully.");
      // Last row of a later page: step back one page (the page change triggers the reload)
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      setNoteToDelete(null);
      setFailureMessage(err?.response?.data?.message || err?.message || "Failed to delete sales note");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <SalesNotesTable
          rows={rows}
          isLoading={isLoading}
          error={loadError}
          pagination={pagination}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
          dateRanges={dateRanges}
          dateErrors={dateErrors}
          onDateChange={handleDateChange}
          sort={sort}
          onSort={handleSort}
          onPageChange={setPage}
          hasActiveFilters={hasActiveFilters}
          hasAnyFilterState={hasAnyFilterState}
          onClearAll={handleClearAll}
          onAdd={() => history.push("/admin/contacts/sales/new")}
          onEdit={(note) =>
            history.push({ pathname: `/admin/contacts/sales/edit/${note.id}`, state: { note } })
          }
          onDelete={setNoteToDelete}
          onToggleFollowUp={handleToggleFollowUp}
          followUpSavingIds={followUpSavingIds}
        />
      </VStack>

      <SuccessModal
        isOpen={!!successMessage}
        onClose={() => setSuccessMessage("")}
        title="Success!"
        message={successMessage}
      />
      <FailureModal
        isOpen={!!failureMessage}
        onClose={() => setFailureMessage("")}
        message={failureMessage}
      />

      <AlertDialog
        isOpen={!!noteToDelete}
        leastDestructiveRef={cancelRef}
        onClose={() => setNoteToDelete(null)}
      >
        <AlertDialogOverlay bg="rgba(0, 0, 0, 0.6)">
          <AlertDialogContent bg={modalBg} border="1px" borderColor={modalBorder}>
            <AlertDialogHeader
              fontSize="lg"
              fontWeight="bold"
              bg={modalHeaderBg}
              borderBottom="1px"
              borderColor={modalBorder}
            >
              Delete Sales Note
            </AlertDialogHeader>
            <AlertDialogBody>
              Delete this sales note for {noteToDelete?.client_id?.name ?? noteToDelete?.client_name ?? "this client"}?
              This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setNoteToDelete(null)} isDisabled={isDeleting}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={isDeleting}
                isDisabled={isDeleting}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
