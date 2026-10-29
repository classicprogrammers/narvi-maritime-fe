import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdClear,
  MdDateRange,
  MdDelete,
  MdDescription,
  MdEdit,
  MdFilterList,
  MdSearch,
} from "react-icons/md";
import { useHistory } from "react-router-dom";
import { bulkUpdateLedgerInvoices, deleteLedgerInvoice, getLedgerInvoices } from "api/ledgerInvoice";
import { useMasterData } from "hooks/useMasterData";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import LedgerBulkEditModal from "components/ledger/LedgerBulkEditModal";
import LedgerDateRangeFilterModal from "components/ledger/LedgerDateRangeFilterModal";
import LedgerSortableHeader from "components/ledger/LedgerSortableHeader";
import { buildBulkUpdatePayload, validateBulkSelection } from "utils/ledgerBulkEdit";
import { INVOICE_COLUMNS } from "utils/ledgerColumns";
import { SO_DONE_STATUS_OPTIONS, soDoneStatusColor, soDoneStatusLabel } from "utils/ledgerDisplay";
import {
  buildDateRangeParams,
  countActiveDateRanges,
  DEFAULT_LEDGER_SORT,
  INVOICE_DATE_FILTER_FIELDS,
  isSortableKey,
  nextSortState,
  sanitizeDateRanges,
} from "utils/ledgerListQuery";
import {
  bizCategoryDisplay,
  extractApiMessage,
  formatCostDate,
  formatCostNumber,
  getMany2oneName,
  gstOutputDisplay,
  INVOICE_BULK_FIELDS_UI,
  normalizeInvoiceBulkValues,
  PAYMENT_STATUS_OPTIONS,
  paymentStatusDisplay,
} from "./ledgerInvoiceUtils";

const INVOICE_LIST_STORAGE_KEY = "narvi_invoice_list_state";
const SELECT_COL_W = 44;

const defaultInvoiceListState = {
  searchValue: "",
  soNumber: "",
  invoiceNumber: "",
  clientId: "",
  destination: "",
  paymentStatus: "",
  soDoneStatus: "",
  clientCaseRef: "",
  dateRanges: {},
  sortBy: DEFAULT_LEDGER_SORT.sortBy,
  sortOrder: DEFAULT_LEDGER_SORT.sortOrder,
  page: 1,
  pageSize: 50,
  showAdvancedFilters: false,
};

function readPersistedInvoiceListState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(INVOICE_LIST_STORAGE_KEY) : null;
    if (!raw) return { ...defaultInvoiceListState };
    const parsed = JSON.parse(raw);
    const merged = { ...defaultInvoiceListState, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    merged.dateRanges = sanitizeDateRanges(merged.dateRanges, INVOICE_DATE_FILTER_FIELDS);
    if (!isSortableKey("invoice", merged.sortBy) || !["asc", "desc"].includes(merged.sortOrder)) {
      merged.sortBy = DEFAULT_LEDGER_SORT.sortBy;
      merged.sortOrder = DEFAULT_LEDGER_SORT.sortOrder;
    }
    return merged;
  } catch (error) {
    return { ...defaultInvoiceListState };
  }
}

function writePersistedInvoiceListState(state) {
  try {
    sessionStorage.setItem(INVOICE_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function prettyInvoiceDate(value) {
  const raw = formatCostDate(value);
  if (!raw || raw === "-") return "";
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function TruncatedText({ value, maxW = "160px", fontWeight, color, fontSize = "sm" }) {
  const text = value == null || value === false || value === "" ? "" : String(value);
  const isEmpty = !text;
  const display = isEmpty ? "—" : text;
  return (
    <Tooltip label={text} isDisabled={isEmpty || text.length < 14} openDelay={250} hasArrow placement="top">
      <Text
        fontSize={fontSize}
        fontWeight={fontWeight}
        color={isEmpty ? "gray.400" : color}
        maxW={maxW}
        noOfLines={1}
        cursor={!isEmpty && text.length >= 14 ? "help" : "default"}
      >
        {display}
      </Text>
    </Tooltip>
  );
}

export default function LedgerInvoice() {
  const toast = useToast();
  const history = useHistory();
  const { refreshClients, refreshDestinations, refreshCurrencies } = useMasterData();
  const savedState = useRef(readPersistedInvoiceListState()).current;
  const [currencies, setCurrencies] = useState(() => getCached(MASTER_KEYS.CURRENCIES) ?? []);
  const [clients, setClients] = useState(() => getCached(MASTER_KEYS.CLIENTS) ?? []);
  const [destinations, setDestinations] = useState(() => getCached(MASTER_KEYS.DESTINATIONS) ?? []);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState(savedState.searchValue);
  const [searchQuery, setSearchQuery] = useState(String(savedState.searchValue || "").trim());
  const [soNumber, setSoNumber] = useState(savedState.soNumber);
  const [soNumberQuery, setSoNumberQuery] = useState(String(savedState.soNumber || "").trim());
  const [invoiceNumber, setInvoiceNumber] = useState(savedState.invoiceNumber);
  const [invoiceNumberQuery, setInvoiceNumberQuery] = useState(String(savedState.invoiceNumber || "").trim());
  const [clientId, setClientId] = useState(savedState.clientId);
  const [destination, setDestination] = useState(savedState.destination);
  const [destinationQuery, setDestinationQuery] = useState(String(savedState.destination || "").trim());
  const [paymentStatus, setPaymentStatus] = useState(savedState.paymentStatus);
  const [soDoneStatus, setSoDoneStatus] = useState(savedState.soDoneStatus);
  const [clientCaseRef, setClientCaseRef] = useState(savedState.clientCaseRef);
  const [clientCaseRefQuery, setClientCaseRefQuery] = useState(String(savedState.clientCaseRef || "").trim());
  const [dateRanges, setDateRanges] = useState(savedState.dateRanges);
  const [sortBy, setSortBy] = useState(savedState.sortBy);
  const [sortOrder, setSortOrder] = useState(savedState.sortOrder);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [dateError, setDateError] = useState("");
  const lastGoodSortRef = useRef({ sortBy: savedState.sortBy, sortOrder: savedState.sortOrder });
  const dateApplyRef = useRef(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(savedState.showAdvancedFilters);
  const [page, setPage] = useState(savedState.page);
  const [pageSize, setPageSize] = useState(savedState.pageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
  const { isOpen: isDateOpen, onOpen: onDateOpen, onClose: onDateClose } = useDisclosure();
  const cancelDeleteRef = useRef(null);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBg = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "whiteAlpha.50");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerColor = useColorModeValue("gray.500", "gray.400");
  const soColor = useColorModeValue("blue.700", "blue.200");
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLedgerInvoices({
        page,
        page_size: pageSize,
        search: searchQuery,
        so_number: soNumberQuery,
        invoice_number: invoiceNumberQuery,
        client_id: clientId,
        destination: destinationQuery,
        payment_status: paymentStatus,
        so_done_status: soDoneStatus,
        client_case_invoice_ref: clientCaseRefQuery,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...buildDateRangeParams(dateRanges, INVOICE_DATE_FILTER_FIELDS),
      });
      setRecords(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 0);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
      // The server is the truth for the applied sort
      const appliedSortBy = data.sort_by && isSortableKey("invoice", data.sort_by) ? data.sort_by : sortBy;
      const appliedSortOrder = data.sort_order === "asc" || data.sort_order === "desc" ? data.sort_order : sortOrder;
      lastGoodSortRef.current = { sortBy: appliedSortBy, sortOrder: appliedSortOrder };
      if (appliedSortBy !== sortBy) setSortBy(appliedSortBy);
      if (appliedSortOrder !== sortOrder) setSortOrder(appliedSortOrder);
      if (dateApplyRef.current) {
        dateApplyRef.current = null;
        setDateError("");
        onDateClose();
      }
    } catch (error) {
      const message = extractApiMessage(error, "Failed to load invoice records.");
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      // Keep the date modal open with the server message and go back to the previous filters
      if (dateApplyRef.current) {
        const previous = dateApplyRef.current.previous;
        dateApplyRef.current = null;
        setDateError(message);
        setDateRanges(previous);
      }
      // Restore the previous sort if the request failed
      const lastGood = lastGoodSortRef.current;
      if (lastGood.sortBy !== sortBy || lastGood.sortOrder !== sortOrder) {
        setSortBy(lastGood.sortBy);
        setSortOrder(lastGood.sortOrder);
      }
      setRecords([]);
      setTotalCount(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    searchQuery,
    soNumberQuery,
    invoiceNumberQuery,
    clientId,
    destinationQuery,
    paymentStatus,
    soDoneStatus,
    clientCaseRefQuery,
    sortBy,
    sortOrder,
    dateRanges,
    onDateClose,
    toast,
  ]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([refreshClients(), refreshDestinations(), refreshCurrencies()])
      .then(([clientList, destinationList, currencyList]) => {
        if (cancelled) return;
        setCurrencies(Array.isArray(currencyList) ? currencyList : getCached(MASTER_KEYS.CURRENCIES) ?? []);
        setClients(Array.isArray(clientList) ? clientList : getCached(MASTER_KEYS.CLIENTS) ?? []);
        setDestinations(
          Array.isArray(destinationList) ? destinationList : getCached(MASTER_KEYS.DESTINATIONS) ?? []
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshClients, refreshDestinations, refreshCurrencies]);

  useEffect(() => {
    writePersistedInvoiceListState({
      searchValue,
      soNumber,
      invoiceNumber,
      clientId,
      destination,
      paymentStatus,
      soDoneStatus,
      clientCaseRef,
      dateRanges,
      sortBy,
      sortOrder,
      page,
      pageSize,
      showAdvancedFilters,
    });
  }, [
    searchValue,
    soNumber,
    invoiceNumber,
    clientId,
    destination,
    paymentStatus,
    soDoneStatus,
    clientCaseRef,
    dateRanges,
    sortBy,
    sortOrder,
    page,
    pageSize,
    showAdvancedFilters,
  ]);

  // Selection is cleared on any search, filter or sort change
  const dateRangesKey = JSON.stringify(dateRanges);
  useEffect(() => {
    setSelectedIds([]);
  }, [
    searchQuery,
    soNumberQuery,
    invoiceNumberQuery,
    clientId,
    destinationQuery,
    paymentStatus,
    soDoneStatus,
    clientCaseRefQuery,
    dateRangesKey,
    sortBy,
    sortOrder,
  ]);

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setSearchQuery(searchValue.trim());
      setSoNumberQuery(soNumber.trim());
      setInvoiceNumberQuery(invoiceNumber.trim());
      setDestinationQuery(destination.trim());
      setClientCaseRefQuery(clientCaseRef.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, soNumber, invoiceNumber, destination, clientCaseRef]);

  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  const handleClearAdvancedFilters = () => {
    setSoNumber("");
    setSoNumberQuery("");
    setInvoiceNumber("");
    setInvoiceNumberQuery("");
    setClientId("");
    setDestination("");
    setDestinationQuery("");
    setPaymentStatus("");
    setSoDoneStatus("");
    setClientCaseRef("");
    setClientCaseRefQuery("");
    setDateRanges({});
    setPage(1);
  };

  const handleSort = (key) => {
    if (isLoading || isBulkOpen || !isSortableKey("invoice", key)) return;
    const next = nextSortState({ sortBy, sortOrder }, key);
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
    setPage(1);
  };

  const handleApplyDates = (ranges) => {
    const next = sanitizeDateRanges(ranges, INVOICE_DATE_FILTER_FIELDS);
    setDateError("");
    dateApplyRef.current = { previous: dateRanges };
    if (JSON.stringify(next) === JSON.stringify(dateRanges)) {
      dateApplyRef.current = null;
      onDateClose();
      return;
    }
    setDateRanges(next);
    setPage(1);
  };

  const handleClearDates = () => {
    setDateError("");
    dateApplyRef.current = null;
    setDateRanges({});
    setPage(1);
    onDateClose();
  };

  const pageIds = records.map((row) => row.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((rowId) => selectedIds.includes(rowId));
  const somePageSelected = pageIds.some((rowId) => selectedIds.includes(rowId));
  const selectionError = validateBulkSelection(selectedIds);
  const isOverBulkLimit = selectedIds.length > 0 && Boolean(selectionError);

  const toggleRow = (rowId) =>
    setSelectedIds((prev) => (prev.includes(rowId) ? prev.filter((x) => x !== rowId) : [...prev, rowId]));

  const toggleAllOnPage = () =>
    setSelectedIds((prev) =>
      allPageSelected
        ? prev.filter((rowId) => !pageIds.includes(rowId))
        : [...prev, ...pageIds.filter((rowId) => !prev.includes(rowId))]
    );

  const handleOpenBulk = () => {
    setBulkError("");
    onBulkOpen();
  };

  const handleBulkSubmit = async (enabledValues) => {
    const problem = validateBulkSelection(selectedIds);
    if (problem) {
      setBulkError(problem);
      return;
    }
    const payload = buildBulkUpdatePayload(selectedIds, enabledValues, INVOICE_BULK_FIELDS_UI);
    payload.values = normalizeInvoiceBulkValues(payload.values);
    setIsBulkSubmitting(true);
    setBulkError("");
    try {
      const result = await bulkUpdateLedgerInvoices(payload);
      const fields = Array.isArray(result.updated_fields) ? result.updated_fields.join(", ") : "";
      toast({
        title: "Success",
        description: `Updated ${result.updated_count} records${fields ? ` (${fields})` : ""}`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      onBulkClose();
      setSelectedIds([]);
      await loadRecords();
    } catch (error) {
      setBulkError(extractApiMessage(error, "Bulk update failed."));
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    history.push("/admin/ledger/invoice/form");
  };

  const handleOpenEdit = (row) => {
    history.push(`/admin/ledger/invoice/form/${row.id}`);
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    setIsSaving(true);
    try {
      const res = await deleteLedgerInvoice(deleteId);
      toast({
        title: "Success",
        description: res?.message || res?.result?.message || "Invoice deleted successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      setDeleteId(null);
      await loadRecords();
    } catch (error) {
      toast({
        title: "Error",
        description: extractApiMessage(error, "Delete failed."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clientOptions = (Array.isArray(clients) ? clients : []).map((client) => ({
    ...client,
    name: client.name || client.client_code || `Client ${client.id}`,
  }));
  const destinationOptions = (Array.isArray(destinations) ? destinations : []).map((item) => ({
    ...item,
    name: item.name || item.destination || `Destination ${item.id}`,
  }));

  const activeDateCount = countActiveDateRanges(dateRanges, INVOICE_DATE_FILTER_FIELDS);
  const advancedFilterCount =
    [soNumber, invoiceNumber, clientId, destination, paymentStatus, soDoneStatus, clientCaseRef].filter(
      (value) => value != null && String(value).trim() !== ""
    ).length + activeDateCount;
  const hasAdvancedFilters = advancedFilterCount > 0;
  const isAdvancedPanelOpen = showAdvancedFilters || hasAdvancedFilters;

  const handleToggleAdvancedFilters = () => {
    if (hasAdvancedFilters) {
      setShowAdvancedFilters(true);
      return;
    }
    setShowAdvancedFilters((open) => !open);
  };

  const controlProps = {
    size: "md",
    h: "40px",
    bg: inputBg,
  };
  const filterLabelProps = {
    fontSize: "sm",
    fontWeight: "600",
    mb: 2,
  };
  const thProps = {
    py: 3,
    px: 4,
    fontSize: "11px",
    letterSpacing: "0.06em",
    color: headerColor,
    bg: tableHeaderBg,
    borderColor: tableBorderColor,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    position: "sticky",
    top: 0,
    zIndex: 2,
  };
  const tdProps = {
    py: 3,
    px: 4,
    borderColor: tableBorderColor,
    fontSize: "sm",
  };

  const displaySo = (row) => {
    const name = getMany2oneName(row.sale_order_id);
    if (name) return name;
    if (row.so_number) return String(row.so_number).startsWith("SO") ? row.so_number : `SO-${row.so_number}`;
    return "-";
  };

  const tableMinW =
    SELECT_COL_W + 108 + INVOICE_COLUMNS.reduce((sum, column) => sum + (parseInt(column.minW, 10) || 120), 0);

  const renderCell = (column, row) => {
    const value = row[column.key];
    switch (column.key) {
      case "so_number":
        return (
          <Button
            variant="link"
            color={soColor}
            fontWeight="800"
            fontSize="sm"
            whiteSpace="nowrap"
            onClick={() => handleOpenEdit(row)}
          >
            {displaySo(row)}
          </Button>
        );
      case "so_done_status": {
        const label = soDoneStatusLabel(row);
        return label === "-" ? (
          <Text color="gray.400">—</Text>
        ) : (
          <Badge colorScheme={soDoneStatusColor(row.so_done_status)} fontSize="2xs" whiteSpace="nowrap" textTransform="none">
            {label}
          </Badge>
        );
      }
      case "client":
        return <TruncatedText value={row.client || getMany2oneName(row.client_id)} maxW="180px" />;
      case "vessel_name":
        return <TruncatedText value={row.vessel_name || getMany2oneName(row.vessel_id)} maxW="150px" />;
      case "biz_category":
        return <TruncatedText value={bizCategoryDisplay(row.biz_category, row.biz_category_label)} maxW="130px" />;
      case "invoice_number":
        return <TruncatedText value={value} maxW="160px" fontWeight="600" />;
      case "currency_code":
        return <TruncatedText value={value || getMany2oneName(row.currency_id)} maxW="90px" />;
      case "gst_output_tax":
        return <TruncatedText value={gstOutputDisplay(value) === "-" ? "" : gstOutputDisplay(value)} maxW="110px" />;
      case "payment_status": {
        const status = String(value || "").toLowerCase();
        return status ? (
          <Badge
            colorScheme={status === "paid" ? "green" : "orange"}
            variant="subtle"
            borderRadius="full"
            px={2.5}
            py={0.5}
            fontSize="xs"
            textTransform="none"
          >
            {paymentStatusDisplay(value, row.payment_status_label)}
          </Badge>
        ) : (
          <Text color="gray.400">—</Text>
        );
      }
      case "date_paid": {
        const paidDate = prettyInvoiceDate(value);
        return paidDate ? (
          <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2} textTransform="none">
            {paidDate}
          </Badge>
        ) : (
          <Text color="gray.400">—</Text>
        );
      }
      default:
        break;
    }
    switch (column.type) {
      case "date": {
        const date = prettyInvoiceDate(value);
        return (
          <Text whiteSpace="nowrap" color={date ? "inherit" : "gray.400"}>
            {date || "—"}
          </Text>
        );
      }
      case "due": {
        const date = prettyInvoiceDate(value);
        return (
          <HStack spacing={1} whiteSpace="nowrap">
            <Text color={date ? "inherit" : "gray.400"}>{date || "—"}</Text>
            {date ? (
              <Badge colorScheme={row.date_due_manual ? "orange" : "blue"} fontSize="2xs" textTransform="lowercase">
                {row.date_due_manual ? "manual" : "auto"}
              </Badge>
            ) : null}
          </HStack>
        );
      }
      case "roe": {
        const hasValue = value != null && value !== false && value !== "";
        return (
          <HStack spacing={1} justify="flex-start" whiteSpace="nowrap">
            <Text sx={{ fontVariantNumeric: "tabular-nums" }}>{formatCostNumber(value, 6)}</Text>
            {hasValue ? (
              <Badge colorScheme={row.roe_manual ? "orange" : "blue"} fontSize="2xs" textTransform="lowercase">
                {row.roe_manual ? "manual" : "auto"}
              </Badge>
            ) : null}
          </HStack>
        );
      }
      case "number":
        return (
          <Text sx={{ fontVariantNumeric: "tabular-nums" }} whiteSpace="nowrap">
            {formatCostNumber(value, column.key === "currency_amount" ? 2 : 4)}
          </Text>
        );
      case "bool": {
        const on = value === true || value === "true";
        return (
          <Badge colorScheme={on ? "green" : "gray"} variant="subtle" textTransform="none">
            {on ? "Yes" : "No"}
          </Badge>
        );
      }
      case "longtext":
        return <TruncatedText value={value} maxW="200px" />;
      default:
        return <TruncatedText value={value} maxW="160px" />;
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={6} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg" mb={1}>
              Invoice DB
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Sales invoices linked to shipping orders
            </Text>
          </Box>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" size="sm" onClick={handleOpenCreate}>
            New Invoice
          </Button>
        </Flex>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" p={{ base: 4, md: 5 }} mb={6}>
          <Flex gap={4} align="flex-end" wrap="wrap">
            <FormControl flex="1" minW={{ base: "100%", md: "280px" }}>
              <FormLabel {...filterLabelProps}>Search</FormLabel>
              <InputGroup size="md">
                <InputLeftElement h="40px" pointerEvents="none">
                  <MdSearch color={searchIconColor} />
                </InputLeftElement>
                <Input
                  placeholder="Search invoice #, SO, destination, client, vessel, client case ref..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoComplete="off"
                  {...controlProps}
                />
                {searchValue && (
                  <InputRightElement h="40px">
                    <IconButton
                      aria-label="Clear search"
                      icon={<MdClear />}
                      size="sm"
                      variant="ghost"
                      onClick={handleClearSearch}
                    />
                  </InputRightElement>
                )}
              </InputGroup>
            </FormControl>

            <FormControl w={{ base: "100%", sm: "auto" }} minW="180px">
              <FormLabel {...filterLabelProps}>Advanced Filters</FormLabel>
              <Button
                w="100%"
                leftIcon={<Icon as={MdFilterList} />}
                variant={hasAdvancedFilters || isAdvancedPanelOpen ? "solid" : "outline"}
                colorScheme={hasAdvancedFilters || isAdvancedPanelOpen ? "blue" : "gray"}
                onClick={handleToggleAdvancedFilters}
                h="40px"
              >
                {hasAdvancedFilters ? "Filters" : isAdvancedPanelOpen ? "Hide Filters" : "Show Filters"}
                {hasAdvancedFilters && (
                  <Badge ml={2} colorScheme="whiteAlpha" bg="white" color="blue.600" borderRadius="full">
                    {advancedFilterCount}
                  </Badge>
                )}
              </Button>
            </FormControl>

            <FormControl w={{ base: "100%", sm: "160px" }}>
              <FormLabel {...filterLabelProps}>Page Size</FormLabel>
              <Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                {...controlProps}
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={80}>80 / page</option>
              </Select>
            </FormControl>
          </Flex>

          <Collapse in={isAdvancedPanelOpen} animateOpacity>
            <Box mt={5} pt={5} px={{ base: 1, md: 2 }} borderTop="1px" borderColor={borderColor}>
              <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
                <Text fontSize="sm" fontWeight="600">
                  Filter by specific fields
                </Text>
                {hasAdvancedFilters && (
                  <Button size="sm" variant="outline" colorScheme="red" h="40px" onClick={handleClearAdvancedFilters}>
                    Clear All
                  </Button>
                )}
              </Flex>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} columnGap={{ base: 4, md: 8 }} rowGap={4}>
                <FormControl>
                  <FormLabel {...filterLabelProps}>SO Number</FormLabel>
                  <Input
                    placeholder="Filter by SO number"
                    value={soNumber}
                    onChange={(e) => setSoNumber(e.target.value)}
                    autoComplete="off"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Invoice Number</FormLabel>
                  <Input
                    placeholder="Filter by invoice number"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    autoComplete="off"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Client</FormLabel>
                  <SimpleSearchableSelect
                    value={clientId}
                    onChange={(value) => {
                      setClientId(value || "");
                      setPage(1);
                    }}
                    options={clientOptions}
                    placeholder="All clients"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Destination</FormLabel>
                  <SimpleSearchableSelect
                    value={destination}
                    onChange={(value) => setDestination(value || "")}
                    options={destinationOptions}
                    placeholder="All destinations"
                    valueKey="name"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Payment Status</FormLabel>
                  <Select
                    value={paymentStatus}
                    onChange={(e) => {
                      setPaymentStatus(e.target.value);
                      setPage(1);
                    }}
                    {...controlProps}
                  >
                    <option value="">All statuses</option>
                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>SO Status</FormLabel>
                  <Select
                    value={soDoneStatus}
                    onChange={(e) => {
                      setSoDoneStatus(e.target.value);
                      setPage(1);
                    }}
                    {...controlProps}
                  >
                    <option value="">All</option>
                    {SO_DONE_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Client Case / Invoice Ref</FormLabel>
                  <Input
                    placeholder="Filter by client case / invoice ref"
                    value={clientCaseRef}
                    onChange={(e) => setClientCaseRef(e.target.value)}
                    autoComplete="off"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Dates</FormLabel>
                  <Button
                    w="100%"
                    leftIcon={<Icon as={MdDateRange} />}
                    variant={activeDateCount > 0 ? "solid" : "outline"}
                    colorScheme={activeDateCount > 0 ? "blue" : "gray"}
                    onClick={() => {
                      setDateError("");
                      onDateOpen();
                    }}
                    h="40px"
                  >
                    {activeDateCount > 0 ? "Edit Date Filter" : "Filter by Dates"}
                  </Button>
                </FormControl>
              </SimpleGrid>
            </Box>
          </Collapse>
        </Box>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
          {isLoading ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner />
            </Flex>
          ) : records.length === 0 ? (
            <VStack spacing={3} py={16} px={6} textAlign="center">
              <Icon as={MdDescription} boxSize={10} color="gray.400" />
              <Text fontWeight="700" color="gray.700">
                No invoice records found
              </Text>
              <Text fontSize="sm" color="gray.500" maxW="360px">
                {searchQuery || hasAdvancedFilters
                  ? "Try clearing search or filters to see more results."
                  : "Create a sales invoice to see it listed here."}
              </Text>
              {!searchQuery && !hasAdvancedFilters && (
                <Button mt={1} size="sm" colorScheme="blue" leftIcon={<Icon as={MdAdd} />} onClick={handleOpenCreate}>
                  New Invoice
                </Button>
              )}
            </VStack>
          ) : (
            <>
              {selectedIds.length > 0 && (
                <Flex px={4} py={3} wrap="wrap" gap={3} align="center" borderBottom="1px" borderColor={tableBorderColor}>
                  <Text fontSize="sm" fontWeight="600">
                    {selectedIds.length} item(s) selected
                  </Text>
                  <Button
                    size="sm"
                    colorScheme="red"
                    leftIcon={<Icon as={MdEdit} />}
                    onClick={handleOpenBulk}
                    isDisabled={isOverBulkLimit}
                  >
                    Edit selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                    Clear Selection
                  </Button>
                  {isOverBulkLimit && (
                    <Text fontSize="xs" color="red.500">
                      {selectionError}
                    </Text>
                  )}
                </Flex>
              )}
              <Box
                overflowX="auto"
                sx={{
                  "&::-webkit-scrollbar": { height: "8px" },
                  "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
                }}
              >
                <Table size="sm" variant="simple" minW={`${tableMinW}px`} aria-busy={isLoading}>
                  <Thead>
                    <Tr>
                      <Th
                        {...thProps}
                        position="sticky"
                        left={0}
                        zIndex={3}
                        w={`${SELECT_COL_W}px`}
                        minW={`${SELECT_COL_W}px`}
                        px={3}
                      >
                        <Checkbox
                          size="sm"
                          colorScheme="blue"
                          isChecked={allPageSelected}
                          isIndeterminate={somePageSelected && !allPageSelected}
                          onChange={toggleAllOnPage}
                          aria-label="Select all rows on this page"
                        />
                      </Th>
                      {INVOICE_COLUMNS.map((column) => {
                        const isSo = column.key === "so_number";
                        const colProps = {
                          ...thProps,
                          minW: column.minW,
                          isNumeric: column.type === "number",
                          ...(isSo ? { position: "sticky", left: `${SELECT_COL_W}px`, zIndex: 3 } : {}),
                        };
                        return column.sortKey ? (
                          <LedgerSortableHeader
                            key={column.key}
                            label={column.label}
                            sortKey={column.sortKey}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                            isPending={isLoading}
                            isDisabled={isBulkOpen}
                            {...colProps}
                          />
                        ) : (
                          <Th key={column.key} {...colProps}>
                            {column.label}
                          </Th>
                        );
                      })}
                      <Th {...thProps} position="sticky" right={0} zIndex={3} minW="108px" textAlign="center">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((row, index) => {
                      const isSelected = selectedIds.includes(row.id);
                      const rowBg = isSelected ? hoverBg : index % 2 === 0 ? tableRowBg : tableRowBgAlt;
                      return (
                        <Tr key={row.id} bg={rowBg} _hover={{ bg: hoverBg }} sx={{ "& td": { bg: "inherit" } }}>
                          <Td
                            {...tdProps}
                            px={3}
                            position="sticky"
                            left={0}
                            zIndex={1}
                            w={`${SELECT_COL_W}px`}
                            minW={`${SELECT_COL_W}px`}
                          >
                            <Checkbox
                              size="sm"
                              colorScheme="blue"
                              isChecked={isSelected}
                              onChange={() => toggleRow(row.id)}
                              aria-label={`Select row ${displaySo(row)}`}
                            />
                          </Td>
                          {INVOICE_COLUMNS.map((column) => {
                            const isSo = column.key === "so_number";
                            return (
                              <Td
                                key={column.key}
                                {...tdProps}
                                isNumeric={column.type === "number"}
                                {...(isSo
                                  ? {
                                      position: "sticky",
                                      left: `${SELECT_COL_W}px`,
                                      zIndex: 1,
                                      boxShadow: "inset -1px 0 0 var(--chakra-colors-gray-200)",
                                    }
                                  : {})}
                              >
                                {renderCell(column, row)}
                              </Td>
                            );
                          })}
                          <Td
                            {...tdProps}
                            position="sticky"
                            right={0}
                            zIndex={1}
                            boxShadow="inset 1px 0 0 var(--chakra-colors-gray-200)"
                          >
                            <HStack spacing={2} justify="center">
                              <Tooltip label="Edit" hasArrow>
                                <IconButton
                                  aria-label="Edit invoice"
                                  icon={<MdEdit />}
                                  size="sm"
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => handleOpenEdit(row)}
                                />
                              </Tooltip>
                              <Tooltip label="Delete" hasArrow>
                                <IconButton
                                  aria-label="Delete invoice"
                                  icon={<MdDelete />}
                                  size="sm"
                                  variant="outline"
                                  colorScheme="red"
                                  onClick={() => {
                                    setDeleteId(row.id);
                                    onDeleteOpen();
                                  }}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>

              <Flex
                justify="space-between"
                align="center"
                px={4}
                py={3}
                borderTop="1px"
                borderColor={tableBorderColor}
                wrap="wrap"
                gap={3}
              >
                <Text fontSize="sm" color="gray.500">
                  {totalCount} record{totalCount === 1 ? "" : "s"}
                  {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
                </Text>
                {totalPages > 1 && (
                  <HStack spacing={1} wrap="wrap">
                    <Button size="sm" variant="outline" onClick={() => setPage(1)} isDisabled={!hasPrevious}>
                      First
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page - 1)} isDisabled={!hasPrevious}>
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={page === pageNum ? "solid" : "outline"}
                          colorScheme={page === pageNum ? "blue" : "gray"}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} isDisabled={!hasNext}>
                      Next
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(totalPages)}
                      isDisabled={!hasNext || page === totalPages}
                    >
                      Last
                    </Button>
                  </HStack>
                )}
              </Flex>
            </>
          )}
        </Box>
      </Box>

      <LedgerDateRangeFilterModal
        isOpen={isDateOpen}
        onClose={onDateClose}
        fields={INVOICE_DATE_FILTER_FIELDS}
        value={dateRanges}
        onApply={handleApplyDates}
        onClear={handleClearDates}
        isLoading={isLoading && Boolean(dateApplyRef.current)}
        error={dateError}
      />

      <LedgerBulkEditModal
        isOpen={isBulkOpen}
        onClose={onBulkClose}
        fields={INVOICE_BULK_FIELDS_UI}
        count={selectedIds.length}
        onSubmit={handleBulkSubmit}
        isSubmitting={isBulkSubmitting}
        error={bulkError}
        currencyOptions={currencies}
      />

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => {
          if (!isSaving) {
            onDeleteClose();
            setDeleteId(null);
          }
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete invoice</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this invoice record? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={onDeleteClose} isDisabled={isSaving}>
                Cancel
              </Button>
              <Button colorScheme="red" ml={3} onClick={handleConfirmDelete} isLoading={isSaving}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
