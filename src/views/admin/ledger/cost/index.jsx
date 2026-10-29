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
  MdEdit,
  MdFilterList,
  MdOpenInNew,
  MdReceipt,
  MdSearch,
} from "react-icons/md";
import { useHistory } from "react-router-dom";
import { bulkUpdateLedgerCosts, deleteLedgerCost, getLedgerCosts } from "api/ledgerCost";
import { useMasterData } from "hooks/useMasterData";
import useLedgerAgentOptions from "hooks/useLedgerAgentOptions";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import LedgerAutoTag from "components/ledger/LedgerAutoTag";
import LedgerBulkEditModal from "components/ledger/LedgerBulkEditModal";
import LedgerDateRangeFilterModal from "components/ledger/LedgerDateRangeFilterModal";
import LedgerSortableHeader from "components/ledger/LedgerSortableHeader";
import { COST_COLUMNS } from "utils/ledgerColumns";
import {
  BULK_MAX_IDS,
  COST_BULK_FIELDS,
  buildBulkUpdatePayload,
  validateBulkSelection,
} from "utils/ledgerBulkEdit";
import {
  agentOptionLabel,
  agentOptionSecondary,
  SO_DONE_STATUS_OPTIONS,
  soDoneStatusColor,
  soDoneStatusLabel,
} from "utils/ledgerDisplay";
import {
  buildDateRangeParams,
  COST_DATE_FILTER_FIELDS,
  COST_SORT_KEYS,
  countActiveDateRanges,
  DEFAULT_LEDGER_SORT,
  nextSortState,
  sanitizeDateRanges,
} from "utils/ledgerListQuery";
import {
  BIZ_CATEGORY_OPTIONS,
  bizCategoryDisplay,
  extractApiMessage,
  formatCostDate,
  formatCostNumber,
  getMany2oneName,
  isProbablyUrl,
  normalizeBizCategory,
} from "./ledgerCostUtils";

const COST_LIST_STORAGE_KEY = "narvi_cost_list_state";

const defaultCostListState = {
  searchValue: "",
  soNumber: "",
  agentId: "",
  agentLabel: "",
  clientId: "",
  vesselId: "",
  destination: "",
  bizCategory: "",
  soDoneStatus: "",
  clientCaseRef: "",
  dateRanges: {},
  sortBy: DEFAULT_LEDGER_SORT.sortBy,
  sortOrder: DEFAULT_LEDGER_SORT.sortOrder,
  page: 1,
  pageSize: 50,
  showAdvancedFilters: false,
};

function readPersistedCostListState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(COST_LIST_STORAGE_KEY) : null;
    if (!raw) return { ...defaultCostListState };
    const parsed = JSON.parse(raw);
    const next = { ...defaultCostListState, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    next.bizCategory = normalizeBizCategory(next.bizCategory);
    next.dateRanges = sanitizeDateRanges(next.dateRanges, COST_DATE_FILTER_FIELDS);
    if (!COST_SORT_KEYS.includes(next.sortBy) || !["asc", "desc"].includes(next.sortOrder)) {
      next.sortBy = DEFAULT_LEDGER_SORT.sortBy;
      next.sortOrder = DEFAULT_LEDGER_SORT.sortOrder;
    }
    return next;
  } catch (error) {
    return { ...defaultCostListState };
  }
}

function writePersistedCostListState(state) {
  try {
    sessionStorage.setItem(COST_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures (private mode / quota).
  }
}

function prettyCostDate(value) {
  const raw = formatCostDate(value);
  if (!raw || raw === "-") return "";
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isDueOverdue(row) {
  const due = formatCostDate(row.date_due_agent);
  const paid = formatCostDate(row.date_agent_paid);
  if (!due || due === "-" || (paid && paid !== "-")) return false;
  return due < new Date().toISOString().slice(0, 10);
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

const CHECKBOX_COL_W = "44px";

export default function LedgerCost() {
  const toast = useToast();
  const history = useHistory();
  const { refreshClients, refreshVessels, refreshDestinations, refreshCurrencies } = useMasterData();
  const savedState = useRef(readPersistedCostListState()).current;
  const agentPicker = useLedgerAgentOptions();
  const bulkAgentPicker = useLedgerAgentOptions();
  const [clients, setClients] = useState(() => getCached(MASTER_KEYS.CLIENTS) ?? []);
  const [vessels, setVessels] = useState(() => getCached(MASTER_KEYS.VESSELS) ?? []);
  const [destinations, setDestinations] = useState(() => getCached(MASTER_KEYS.DESTINATIONS) ?? []);
  const [currencies, setCurrencies] = useState(() => getCached(MASTER_KEYS.CURRENCIES) ?? []);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState(savedState.searchValue);
  const [searchQuery, setSearchQuery] = useState(String(savedState.searchValue || "").trim());
  const [soNumber, setSoNumber] = useState(savedState.soNumber);
  const [soNumberQuery, setSoNumberQuery] = useState(String(savedState.soNumber || "").trim());
  const [agentId, setAgentId] = useState(savedState.agentId);
  const [agentLabel, setAgentLabel] = useState(savedState.agentLabel);
  const [clientId, setClientId] = useState(savedState.clientId);
  const [vesselId, setVesselId] = useState(savedState.vesselId);
  const [destination, setDestination] = useState(savedState.destination);
  const [destinationQuery, setDestinationQuery] = useState(String(savedState.destination || "").trim());
  const [bizCategory, setBizCategory] = useState(savedState.bizCategory);
  const [soDoneStatus, setSoDoneStatus] = useState(savedState.soDoneStatus);
  const [clientCaseRef, setClientCaseRef] = useState(savedState.clientCaseRef);
  const [clientCaseRefQuery, setClientCaseRefQuery] = useState(String(savedState.clientCaseRef || "").trim());
  const [dateRanges, setDateRanges] = useState(savedState.dateRanges);
  const [sortBy, setSortBy] = useState(savedState.sortBy);
  const [sortOrder, setSortOrder] = useState(savedState.sortOrder);
  // Sort the server says it applied (headers show this; the request uses sortBy/sortOrder)
  const [appliedSort, setAppliedSort] = useState({ sortBy: savedState.sortBy, sortOrder: savedState.sortOrder });
  const lastGoodSortRef = useRef({ sortBy: savedState.sortBy, sortOrder: savedState.sortOrder });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(savedState.showAdvancedFilters);
  const [page, setPage] = useState(savedState.page);
  const [pageSize, setPageSize] = useState(savedState.pageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkError, setBulkError] = useState("");
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [listError, setListError] = useState("");
  const dateApplyPendingRef = useRef(false);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isDateOpen, onOpen: onDateOpen, onClose: onDateClose } = useDisclosure();
  const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
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
  const labelColor = useColorModeValue("gray.700", "gray.200");

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLedgerCosts({
        page,
        page_size: pageSize,
        search: searchQuery,
        so_number: soNumberQuery,
        biz_category: normalizeBizCategory(bizCategory),
        agent_id: agentId,
        client_id: clientId,
        vessel_id: vesselId,
        destination: destinationQuery,
        so_done_status: soDoneStatus,
        client_case_invoice_ref: clientCaseRefQuery,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...buildDateRangeParams(dateRanges, COST_DATE_FILTER_FIELDS),
      });
      setRecords(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 0);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
      // The server is the truth for the applied sort
      const applied =
        COST_SORT_KEYS.includes(data.sort_by) && ["asc", "desc"].includes(data.sort_order)
          ? { sortBy: data.sort_by, sortOrder: data.sort_order }
          : { sortBy, sortOrder };
      setAppliedSort(applied);
      lastGoodSortRef.current = { sortBy, sortOrder };
      setListError("");
      if (dateApplyPendingRef.current) {
        dateApplyPendingRef.current = false;
        onDateClose();
      }
    } catch (error) {
      const message = extractApiMessage(error, "Failed to load cost records.");
      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setListError(message);
      dateApplyPendingRef.current = false;
      // Restore the previous sort if the sort request failed
      const good = lastGoodSortRef.current;
      if (good.sortBy !== sortBy || good.sortOrder !== sortOrder) {
        setSortBy(good.sortBy);
        setSortOrder(good.sortOrder);
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
    bizCategory,
    agentId,
    clientId,
    vesselId,
    destinationQuery,
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
    Promise.all([refreshClients(), refreshVessels(), refreshDestinations(), refreshCurrencies()])
      .then(([clientList, vesselList, destinationList, currencyList]) => {
        if (cancelled) return;
        setClients(Array.isArray(clientList) ? clientList : getCached(MASTER_KEYS.CLIENTS) ?? []);
        setVessels(Array.isArray(vesselList) ? vesselList : getCached(MASTER_KEYS.VESSELS) ?? []);
        setDestinations(
          Array.isArray(destinationList) ? destinationList : getCached(MASTER_KEYS.DESTINATIONS) ?? []
        );
        setCurrencies(
          Array.isArray(currencyList) ? currencyList : getCached(MASTER_KEYS.CURRENCIES) ?? []
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshClients, refreshVessels, refreshDestinations, refreshCurrencies]);

  // Keep the persisted agent in the picker so its label always shows
  const { pin: pinFilterAgent } = agentPicker;
  useEffect(() => {
    if (savedState.agentId && savedState.agentLabel) {
      pinFilterAgent({ id: savedState.agentId, name: savedState.agentLabel });
    }
  }, [pinFilterAgent, savedState.agentId, savedState.agentLabel]);

  useEffect(() => {
    writePersistedCostListState({
      searchValue,
      soNumber,
      agentId,
      agentLabel,
      clientId,
      vesselId,
      destination,
      bizCategory,
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
    agentId,
    agentLabel,
    clientId,
    vesselId,
    destination,
    bizCategory,
    soDoneStatus,
    clientCaseRef,
    dateRanges,
    sortBy,
    sortOrder,
    page,
    pageSize,
    showAdvancedFilters,
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
      setDestinationQuery(destination.trim());
      setClientCaseRefQuery(clientCaseRef.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, soNumber, destination, clientCaseRef]);

  // Selection is cleared on any filter, search or sort change (not on page change)
  useEffect(() => {
    setSelectedIds([]);
  }, [
    searchQuery,
    soNumberQuery,
    destinationQuery,
    clientCaseRefQuery,
    agentId,
    clientId,
    vesselId,
    bizCategory,
    soDoneStatus,
    dateRanges,
    sortBy,
    sortOrder,
  ]);

  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  const handleClearAdvancedFilters = () => {
    setSoNumber("");
    setSoNumberQuery("");
    setAgentId("");
    setAgentLabel("");
    setClientId("");
    setVesselId("");
    setDestination("");
    setDestinationQuery("");
    setBizCategory("");
    setSoDoneStatus("");
    setClientCaseRef("");
    setClientCaseRefQuery("");
    setDateRanges({});
    setPage(1);
  };

  const handleSort = (key) => {
    const next = nextSortState({ sortBy: appliedSort.sortBy, sortOrder: appliedSort.sortOrder }, key);
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
    setPage(1);
  };

  const handleApplyDates = (ranges) => {
    const next = sanitizeDateRanges(ranges, COST_DATE_FILTER_FIELDS);
    if (JSON.stringify(next) === JSON.stringify(dateRanges)) {
      onDateClose();
      return;
    }
    dateApplyPendingRef.current = true;
    setListError("");
    setDateRanges(next);
    setPage(1);
  };

  const handleClearDates = () => {
    if (Object.keys(dateRanges).length === 0) {
      onDateClose();
      return;
    }
    dateApplyPendingRef.current = true;
    setDateRanges({});
    setPage(1);
  };

  const handleOpenCreate = () => {
    history.push("/admin/ledger/cost/form");
  };

  const handleOpenEdit = (row) => {
    history.push(`/admin/ledger/cost/form/${row.id}`);
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    setIsSaving(true);
    try {
      const res = await deleteLedgerCost(deleteId);
      toast({
        title: "Success",
        description: res?.message || res?.result?.message || "Cost deleted successfully.",
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

  // Bulk edit
  const pageIds = records.map((row) => row.id);
  const selectedOnPage = pageIds.filter((rowId) => selectedIds.includes(rowId));
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;
  const selectionError = validateBulkSelection(selectedIds);
  const overBulkLimit = selectedIds.length > BULK_MAX_IDS;

  const toggleRow = (rowId) => {
    setSelectedIds((prev) => (prev.includes(rowId) ? prev.filter((x) => x !== rowId) : [...prev, rowId]));
  };
  const togglePage = () => {
    setSelectedIds((prev) =>
      allOnPageSelected
        ? prev.filter((x) => !pageIds.includes(x))
        : [...prev, ...pageIds.filter((x) => !prev.includes(x))]
    );
  };

  const handleOpenBulk = () => {
    setBulkError("");
    onBulkOpen();
  };

  const handleBulkSubmit = async (enabledValues) => {
    const invalid = validateBulkSelection(selectedIds);
    if (invalid) {
      setBulkError(invalid);
      return;
    }
    setIsBulkSaving(true);
    setBulkError("");
    try {
      const payload = buildBulkUpdatePayload(selectedIds, enabledValues, COST_BULK_FIELDS);
      const result = await bulkUpdateLedgerCosts(payload);
      toast({
        title: "Success",
        description: `Updated ${result.updated_count} records (${(result.updated_fields || []).join(", ")})`,
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
      setIsBulkSaving(false);
    }
  };

  const renderBulkAgentPicker = (value, onChange, disabled) => (
    <SimpleSearchableSelect
      value={value === "" || value == null ? "" : String(value)}
      onChange={(next) => {
        const picked = bulkAgentPicker.options.find((a) => String(a.id) === String(next));
        if (picked) bulkAgentPicker.pin(picked);
        onChange(next || "");
      }}
      options={bulkAgentPicker.options.map((a) => ({ ...a, name: agentOptionLabel(a) }))}
      placeholder="Select agent..."
      serverSideSearch
      onSearchChange={bulkAgentPicker.onSearchChange}
      isLoading={bulkAgentPicker.isLoading}
      formatOption={agentOptionLabel}
      renderOption={renderAgentOption}
      isDisabled={disabled}
      size="sm"
      bg={inputBg}
    />
  );

  function renderAgentOption(option) {
    return (
      <Box>
        <Text fontSize="sm" fontWeight="600" color={labelColor} noOfLines={1}>
          {agentOptionLabel(option)}
        </Text>
        {agentOptionSecondary(option) ? (
          <Text fontSize="xs" color={mutedColor} noOfLines={1}>
            {agentOptionSecondary(option)}
          </Text>
        ) : null}
      </Box>
    );
  }

  const agentFilterOptions = agentPicker.options.map((agent) => ({
    ...agent,
    name: agentOptionLabel(agent),
  }));
  const clientOptions = (Array.isArray(clients) ? clients : []).map((client) => ({
    ...client,
    name: client.name || client.client_code || `Client ${client.id}`,
  }));
  const vesselOptions = (Array.isArray(vessels) ? vessels : []).map((vessel) => ({
    ...vessel,
    name: vessel.name || vessel.vessel_name || `Vessel ${vessel.id}`,
  }));
  const destinationOptions = (Array.isArray(destinations) ? destinations : []).map((item) => ({
    ...item,
    name: item.name || item.destination || `Destination ${item.id}`,
  }));

  const activeDateCount = countActiveDateRanges(dateRanges, COST_DATE_FILTER_FIELDS);
  const advancedFilterCount =
    [soNumber, agentId, clientId, vesselId, destination, bizCategory, soDoneStatus, clientCaseRef].filter(
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

  const dash = <Text color="gray.400">—</Text>;

  // Cell content for COST_COLUMNS (the SO Number column is rendered separately, it is sticky)
  const renderCell = (col, row) => {
    switch (col.key) {
      case "so_create_date":
      case "date_agent_invoice": {
        const text = prettyCostDate(row[col.key]);
        return text ? <Text whiteSpace="nowrap">{text}</Text> : dash;
      }
      case "so_done_status":
        return soDoneStatusLabel(row) === "-" ? (
          dash
        ) : (
          <Badge
            colorScheme={soDoneStatusColor(row.so_done_status)}
            fontSize="2xs"
            whiteSpace="nowrap"
            variant="subtle"
          >
            {soDoneStatusLabel(row)}
          </Badge>
        );
      case "agent": {
        const name = row.agent || row.agent_detail?.name || getMany2oneName(row.agent_id) || "";
        const second = agentOptionSecondary(row.agent_detail);
        return (
          <>
            <TruncatedText value={name} maxW="180px" />
            {second ? (
              <Text fontSize="xs" color={mutedColor} noOfLines={1} maxW="180px" title={second}>
                {second}
              </Text>
            ) : null}
          </>
        );
      }
      case "client":
        return <TruncatedText value={row.client || getMany2oneName(row.client_id)} maxW="180px" />;
      case "vessel_name":
        return <TruncatedText value={row.vessel_name || getMany2oneName(row.vessel_id)} maxW="150px" />;
      case "destination":
        return <TruncatedText value={row.destination} maxW="170px" />;
      case "biz_category": {
        const bizKey = normalizeBizCategory(row.biz_category);
        const bizLabel = bizCategoryDisplay(row.biz_category, row.biz_category_label);
        return bizLabel && bizLabel !== "-" ? (
          <Badge
            colorScheme={bizKey === "bunker" ? "orange" : "purple"}
            variant="subtle"
            borderRadius="full"
            px={2.5}
            py={0.5}
            fontSize="xs"
            textTransform="none"
          >
            {bizLabel}
          </Badge>
        ) : (
          dash
        );
      }
      case "currency_code":
        return <Text>{row.currency_code || getMany2oneName(row.currency_id) || "—"}</Text>;
      case "currency_amount":
        return (
          <Text fontWeight="700" sx={{ fontVariantNumeric: "tabular-nums" }} whiteSpace="nowrap">
            {formatCostNumber(row.currency_amount)}
          </Text>
        );
      case "roe_invoice_date":
        return row.roe_invoice_date ? (
          <Flex align="center" justify="flex-end" whiteSpace="nowrap">
            <Text sx={{ fontVariantNumeric: "tabular-nums" }}>{formatCostNumber(row.roe_invoice_date, 6)}</Text>
            <LedgerAutoTag mode={row.roe_manual ? "manual" : "auto"} compact />
          </Flex>
        ) : (
          dash
        );
      case "usd_cost":
        return (
          <Text fontWeight="600" sx={{ fontVariantNumeric: "tabular-nums" }} whiteSpace="nowrap">
            {formatCostNumber(row.usd_cost, 4)}
          </Text>
        );
      case "gst_input_tax":
      case "gst_in_amount":
        return (
          <Text sx={{ fontVariantNumeric: "tabular-nums" }} whiteSpace="nowrap">
            {formatCostNumber(row[col.key])}
          </Text>
        );
      case "date_due_agent": {
        const dueDate = prettyCostDate(row.date_due_agent);
        if (!dueDate) return dash;
        return (
          <Flex align="center" whiteSpace="nowrap">
            {isDueOverdue(row) ? (
              <Badge colorScheme="red" variant="subtle" borderRadius="full" px={2} textTransform="none">
                {dueDate}
              </Badge>
            ) : (
              dueDate
            )}
            <LedgerAutoTag mode={row.date_due_manual ? "manual" : "auto"} compact />
          </Flex>
        );
      }
      case "date_agent_paid": {
        const paidDate = prettyCostDate(row.date_agent_paid);
        return paidDate ? (
          <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2} textTransform="none">
            {paidDate}
          </Badge>
        ) : (
          dash
        );
      }
      case "invoice_link": {
        const invoiceUrl =
          row.invoice_link && row.invoice_link !== false ? String(row.invoice_link) : "";
        if (!invoiceUrl) return dash;
        return isProbablyUrl(invoiceUrl) ? (
          <Button
            as="a"
            href={invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="xs"
            variant="outline"
            colorScheme="blue"
            rightIcon={<Icon as={MdOpenInNew} />}
          >
            Open
          </Button>
        ) : (
          <TruncatedText value={invoiceUrl} maxW="120px" />
        );
      }
      default:
        // longtext (client case ref, invoices)
        return <TruncatedText value={row[col.key]} maxW="200px" />;
    }
  };

  const isNumericCol = (col) => col.type === "number" || col.type === "roe";
  const listColumns = COST_COLUMNS.filter((col) => col.key !== "so_number");
  const soColumn = COST_COLUMNS.find((col) => col.key === "so_number");
  const tableMinW = `${
    COST_COLUMNS.reduce((sum, col) => sum + parseInt(col.minW, 10), 0) + 160
  }px`;

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={6} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg" mb={1}>
              Cost DB
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Agent invoice costs linked to shipping orders
            </Text>
          </Box>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" size="sm" onClick={handleOpenCreate}>
            New Cost
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
                  placeholder="Search SO, invoices, destination, agent, agent code, company, client, client case ref..."
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
            <Box
              mt={5}
              pt={5}
              px={{ base: 1, md: 2 }}
              borderTop="1px"
              borderColor={borderColor}
            >
              <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
                <Text fontSize="sm" fontWeight="600">
                  Filter by specific fields
                </Text>
                <HStack spacing={3} wrap="wrap">
                  <Button
                    size="sm"
                    h="40px"
                    variant={activeDateCount > 0 ? "solid" : "outline"}
                    colorScheme={activeDateCount > 0 ? "blue" : "gray"}
                    leftIcon={<Icon as={MdDateRange} />}
                    onClick={onDateOpen}
                  >
                    {activeDateCount > 0 ? "Edit Date Filter" : "Filter by Dates"}
                  </Button>
                  {hasAdvancedFilters && (
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="red"
                      h="40px"
                      onClick={handleClearAdvancedFilters}
                    >
                      Clear All
                    </Button>
                  )}
                </HStack>
              </Flex>
              <SimpleGrid
                columns={{ base: 1, md: 2, xl: 3 }}
                columnGap={{ base: 4, md: 8 }}
                rowGap={4}
              >
                <FormControl>
                  <FormLabel {...filterLabelProps}>SO Number</FormLabel>
                  <Input
                    placeholder="Filter by SO number"
                    value={soNumber}
                    onChange={(e) => setSoNumber(e.target.value)}
                    autoComplete="off"
                    name="cost-filter-so-number"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Agent</FormLabel>
                  <SimpleSearchableSelect
                    value={agentId}
                    onChange={(value) => {
                      const picked = agentPicker.options.find((a) => String(a.id) === String(value));
                      if (picked) agentPicker.pin(picked);
                      setAgentId(value ? String(value) : "");
                      setAgentLabel(picked ? agentOptionLabel(picked) : "");
                      setPage(1);
                    }}
                    options={agentFilterOptions}
                    placeholder="All agents"
                    serverSideSearch
                    onSearchChange={agentPicker.onSearchChange}
                    isLoading={agentPicker.isLoading}
                    formatOption={agentOptionLabel}
                    renderOption={renderAgentOption}
                    fallbackDisplay={agentLabel}
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
                  <FormLabel {...filterLabelProps}>Vessel</FormLabel>
                  <SimpleSearchableSelect
                    value={vesselId}
                    onChange={(value) => {
                      setVesselId(value || "");
                      setPage(1);
                    }}
                    options={vesselOptions}
                    placeholder="All vessels"
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
                  <FormLabel {...filterLabelProps}>Biz Category</FormLabel>
                  <Select
                    value={bizCategory}
                    onChange={(e) => {
                      setBizCategory(e.target.value);
                      setPage(1);
                    }}
                    {...controlProps}
                  >
                    <option value="">All categories</option>
                    {BIZ_CATEGORY_OPTIONS.map((option) => (
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
                    name="cost-filter-client-case-ref"
                    {...controlProps}
                  />
                </FormControl>
              </SimpleGrid>
            </Box>
          </Collapse>
        </Box>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
          {selectedIds.length > 0 && (
            <Flex
              px={4}
              py={3}
              gap={3}
              align="center"
              wrap="wrap"
              borderBottom="1px"
              borderColor={tableBorderColor}
            >
              <Text fontSize="sm" fontWeight="600">
                {selectedIds.length} item(s) selected
              </Text>
              <Button
                size="sm"
                colorScheme="red"
                leftIcon={<Icon as={MdEdit} />}
                onClick={handleOpenBulk}
                isDisabled={Boolean(selectionError)}
              >
                Edit selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                Clear Selection
              </Button>
              {overBulkLimit && (
                <Text fontSize="xs" color="red.500">
                  {selectionError}
                </Text>
              )}
            </Flex>
          )}
          {isLoading && records.length === 0 ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner />
            </Flex>
          ) : records.length === 0 ? (
            <VStack spacing={3} py={16} px={6} textAlign="center">
              <Icon as={MdReceipt} boxSize={10} color="gray.400" />
              <Text fontWeight="700" color="gray.700">
                No cost records found
              </Text>
              <Text fontSize="sm" color="gray.500" maxW="360px">
                {searchQuery || hasAdvancedFilters
                  ? "Try clearing search or filters to see more results."
                  : "Create an agent invoice cost to see it listed here."}
              </Text>
              {!searchQuery && !hasAdvancedFilters && (
                <Button mt={1} size="sm" colorScheme="blue" leftIcon={<Icon as={MdAdd} />} onClick={handleOpenCreate}>
                  New Cost
                </Button>
              )}
            </VStack>
          ) : (
            <>
              <Box
                overflowX="auto"
                opacity={isLoading ? 0.6 : 1}
                aria-busy={isLoading}
                sx={{
                  "&::-webkit-scrollbar": { height: "8px" },
                  "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
                }}
              >
                <Table size="sm" variant="simple" minW={tableMinW}>
                  <Thead>
                    <Tr>
                      <Th {...thProps} position="sticky" left={0} zIndex={3} w={CHECKBOX_COL_W} minW={CHECKBOX_COL_W} px={3}>
                        <Checkbox
                          size="sm"
                          colorScheme="blue"
                          isChecked={allOnPageSelected}
                          isIndeterminate={someOnPageSelected}
                          onChange={togglePage}
                          aria-label="Select all rows on this page"
                        />
                      </Th>
                      <LedgerSortableHeader
                        {...thProps}
                        position="sticky"
                        left={CHECKBOX_COL_W}
                        zIndex={3}
                        minW={soColumn.minW}
                        label={soColumn.label}
                        sortKey={soColumn.sortKey}
                        sortBy={appliedSort.sortBy}
                        sortOrder={appliedSort.sortOrder}
                        onSort={handleSort}
                        isPending={isLoading}
                      />
                      {listColumns.map((col) =>
                        col.sortKey ? (
                          <LedgerSortableHeader
                            key={col.key}
                            {...thProps}
                            isNumeric={isNumericCol(col)}
                            minW={col.minW}
                            label={col.label}
                            sortKey={col.sortKey}
                            sortBy={appliedSort.sortBy}
                            sortOrder={appliedSort.sortOrder}
                            onSort={handleSort}
                            isPending={isLoading}
                          />
                        ) : (
                          <Th key={col.key} {...thProps} isNumeric={isNumericCol(col)} minW={col.minW}>
                            {col.label}
                          </Th>
                        )
                      )}
                      <Th {...thProps} position="sticky" right={0} zIndex={3} minW="108px" textAlign="center">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((row, index) => {
                      const rowBg = index % 2 === 0 ? tableRowBg : tableRowBgAlt;
                      const isSelected = selectedIds.includes(row.id);
                      return (
                        <Tr
                          key={row.id}
                          bg={isSelected ? hoverBg : rowBg}
                          _hover={{ bg: hoverBg }}
                          sx={{ "& td": { bg: "inherit" } }}
                        >
                          <Td
                            {...tdProps}
                            px={3}
                            position="sticky"
                            left={0}
                            zIndex={1}
                            w={CHECKBOX_COL_W}
                            minW={CHECKBOX_COL_W}
                          >
                            <Checkbox
                              size="sm"
                              colorScheme="blue"
                              isChecked={isSelected}
                              onChange={() => toggleRow(row.id)}
                              aria-label={`Select row ${displaySo(row)}`}
                            />
                          </Td>
                          <Td
                            {...tdProps}
                            position="sticky"
                            left={CHECKBOX_COL_W}
                            zIndex={1}
                            boxShadow="inset -1px 0 0 var(--chakra-colors-gray-200)"
                          >
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
                          </Td>
                          {listColumns.map((col) => (
                            <Td key={col.key} {...tdProps} isNumeric={isNumericCol(col)}>
                              {renderCell(col, row)}
                            </Td>
                          ))}
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
                                  aria-label="Edit cost"
                                  icon={<MdEdit />}
                                  size="sm"
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => handleOpenEdit(row)}
                                />
                              </Tooltip>
                              <Tooltip label="Delete" hasArrow>
                                <IconButton
                                  aria-label="Delete cost"
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      isDisabled={!hasPrevious}
                    >
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
        fields={COST_DATE_FILTER_FIELDS}
        value={dateRanges}
        onApply={handleApplyDates}
        onClear={handleClearDates}
        isLoading={isLoading && dateApplyPendingRef.current}
        error={isDateOpen ? listError : ""}
      />

      <LedgerBulkEditModal
        isOpen={isBulkOpen}
        onClose={onBulkClose}
        fields={COST_BULK_FIELDS}
        count={selectedIds.length}
        onSubmit={handleBulkSubmit}
        isSubmitting={isBulkSaving}
        error={bulkError}
        renderAgentPicker={renderBulkAgentPicker}
        currencyOptions={(Array.isArray(currencies) ? currencies : []).map((c) => ({
          id: c.id,
          name: c.name || c.code || `Currency ${c.id}`,
        }))}
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
            <AlertDialogHeader>Delete cost</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this cost record? This cannot be undone.
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
