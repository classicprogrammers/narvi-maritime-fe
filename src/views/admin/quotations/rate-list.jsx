import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Table,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Spinner,
  Tooltip,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdArrowDownward,
  MdArrowUpward,
  MdAttachMoney,
  MdClear,
  MdDelete,
  MdDownload,
  MdEdit,
  MdFilterList,
  MdPictureAsPdf,
  MdPrint,
  MdRefresh,
  MdSearch,
  MdUnfoldMore,
} from "react-icons/md";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import api from "../../../api/axios";
import { deleteRateListApi, getRateListOptionsApi } from "../../../api/rate";
import {
  buildRateListFilterSnapshot,
  clearPersistedRateListState,
  defaultRateListState,
  RATE_LIST_DEFAULT_SORT,
  readPersistedRateListState,
  writePersistedRateListState,
} from "../../../utils/rateListState";
import {
  buildRateListPdf,
  buildRateListPdfModel,
  fetchAllFilteredRates,
  getRateListPdfFilename,
  RATE_LIST_PDF_TYPES,
} from "./rateListPdf";
import { downloadRateListExcel } from "./rateListExcel";
import { chargeCategoryLabel } from "../../../utils/rateListForm";

const RATE_TYPE_FILTER_OPTIONS = [
  { id: "general", name: "General" },
  { id: "client_specific", name: "Client Specific" },
];

const RATE_FORM_ROUTE = "/admin/quotations/rate-list/rate";

const DEFAULT_FILTERS = {
  rate_type: "",
  location_text: "",
  client_id: "",
  agent_id: "",
  currency_id: "",
  rate_text: "",
  import_group: "",
  active: "",
  incl_in_tariff: "",
};

const BOOLEAN_FILTER_OPTIONS = [
  { id: "true", name: "Yes" },
  { id: "false", name: "No" },
];

const EMPTY_FILTER_OPTIONS = {
  rateTypes: RATE_TYPE_FILTER_OPTIONS,
  clients: [],
  agents: [],
  currencies: [],
  rateTexts: [],
  groups: [],
};

const EMPTY_OPTION_QUERIES = {
  q_rate_type: "",
  q_client: "",
  q_agent: "",
  q_currency: "",
  q_rate_text: "",
  q_group: "",
};

function intFilterToParam(value) {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || agent.agentid || "";
  const company = agent.company_name || "";
  if (code && company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

function formatClientOption(client) {
  if (!client) return "";
  return client.name || client.company_name || `Client ${client.id}`;
}

function formatCurrencyOption(currency) {
  if (!currency) return "";
  if (currency.symbol) return `${currency.name || currency.id} (${currency.symbol})`;
  return currency.name || `Currency ${currency.id}`;
}

function normalizeRateTypeOptions(raw) {
  if (!Array.isArray(raw) || !raw.length) return [...RATE_TYPE_FILTER_OPTIONS];
  return raw
    .map((option) => {
      const id = option?.value ?? option?.id ?? option?.rate_type ?? "";
      if (!id) return null;
      const name =
        option?.label ||
        option?.name ||
        RATE_TYPE_FILTER_OPTIONS.find((item) => item.id === id)?.name ||
        String(id);
      return { id: String(id), name };
    })
    .filter(Boolean);
}

function normalizeIdNameOptions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => {
      const id = option?.id;
      if (id == null || id === "") return null;
      return { ...option, id };
    })
    .filter(Boolean);
}

function normalizeNamedOptions(raw, valueKeys = ["name"]) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => {
      let name = "";
      for (const key of valueKeys) {
        if (option?.[key]) {
          name = String(option[key]);
          break;
        }
      }
      if (!name) return null;
      return { id: name, name, ...option };
    })
    .filter(Boolean);
}

function optionHasValue(options, value, valueKey = "id") {
  if (value === "" || value == null) return true;
  return options.some((option) => String(option[valueKey]) === String(value));
}

function mergeSelectedOption(options, selectedValue, selectedOption, valueKey = "id") {
  if (!selectedValue || !selectedOption) return options;
  if (optionHasValue(options, selectedValue, valueKey)) return options;
  return [selectedOption, ...options];
}

function RateCell({ value, cellProps, fontWeight, color, isNumeric, noOfLines = 2 }) {
  const text = value || "-";
  const isEmpty = text === "-";
  return (
    <Td {...cellProps} isNumeric={isNumeric}>
      <Text
        fontSize="sm"
        fontWeight={fontWeight}
        color={isEmpty ? "gray.400" : color}
        noOfLines={noOfLines}
        wordBreak="break-word"
        title={isEmpty ? undefined : text}
      >
        {text}
      </Text>
    </Td>
  );
}

function formatRateType(value) {
  const match = RATE_TYPE_FILTER_OPTIONS.find((option) => option.id === value);
  if (match) return match.name;
  if (value === false || value == null || String(value).trim() === "") return "-";
  return String(value);
}

function formatRateCost(item) {
  const rate = item.rate_float;
  if (rate === false || rate == null || String(rate).trim() === "") return "-";
  return String(rate);
}

function displayText(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  return String(value);
}

const RATE_LIST_PAGE_SIZE = 50;
const STICKY_CHECKBOX_WIDTH = "44px";
const STICKY_ACTIONS_WIDTH = "104px";

/** Sort keys sent as sort_by to GET /api/rate/list for each sortable table column. */
const RATE_LIST_COLUMNS = [
  { label: "Rate Type", sortKey: "rate_type", minW: "130px" },
  { label: "Location", sortKey: "location_text", aliases: ["location"], minW: "130px" },
  { label: "Client", sortKey: "client_id", minW: "170px" },
  { label: "Agent", sortKey: "agent", aliases: ["agent_text"], minW: "190px" },
  { label: "Group Name", sortKey: "import_group", minW: "150px" },
  { label: "Rate Name", sortKey: "rate_name", minW: "240px" },
  { label: "Charge Category", sortKey: "charge_category", aliases: ["charge_category_label"], minW: "160px" },
  { label: "Rate Text", sortKey: "rate_text", minW: "280px" },
  { label: "Rate Cost", sortKey: "rate_float", minW: "110px", isNumeric: true },
  { label: "Rate Fixed", sortKey: "fixed_sales_rate", minW: "110px", isNumeric: true },
];

function SortableHeader({ column, sort, isSortable, onSort, headerCellProps, hoverBg }) {
  const isActive = sort.sort_by === column.sortKey;
  const icon = !isActive ? MdUnfoldMore : sort.sort_order === "asc" ? MdArrowUpward : MdArrowDownward;
  const direction = isActive ? (sort.sort_order === "asc" ? "ascending" : "descending") : "none";

  return (
    <Th
      {...headerCellProps}
      minW={column.minW}
      isNumeric={column.isNumeric}
      aria-sort={isSortable ? direction : undefined}
      color={isActive ? "blue.600" : headerCellProps.color}
      cursor={isSortable ? "pointer" : undefined}
      tabIndex={isSortable ? 0 : undefined}
      title={isSortable ? `Sort by ${column.label}` : undefined}
      _hover={isSortable ? { bg: hoverBg } : undefined}
      onClick={isSortable ? () => onSort(column.sortKey) : undefined}
      onKeyDown={
        isSortable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSort(column.sortKey);
              }
            }
          : undefined
      }
    >
      <HStack spacing="1" justify={column.isNumeric ? "flex-end" : "flex-start"}>
        <Text as="span">{column.label}</Text>
        {isSortable && <Icon as={icon} boxSize="14px" opacity={isActive ? 1 : 0.4} />}
      </HStack>
    </Th>
  );
}

export default function RateList() {
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const savedListState = useMemo(() => {
    if (location.state?.filterState) {
      return buildRateListFilterSnapshot(location.state.filterState);
    }
    return readPersistedRateListState();
  }, []);
  const {
    isOpen: isPdfPreviewOpen,
    onOpen: onPdfPreviewOpen,
    onClose: onPdfPreviewClose,
  } = useDisclosure();
  const pdfPreviewIframeRef = useRef(null);
  const pdfPreviewBlobUrlRef = useRef(null);

  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTER_OPTIONS);
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false);
  const optionQueriesRef = useRef({ ...EMPTY_OPTION_QUERIES });
  const optionsRequestIdRef = useRef(0);
  const selectedOptionPinsRef = useRef({
    client: null,
    agent: null,
    currency: null,
    rateText: null,
    group: null,
    rateType: null,
  });
  const filtersRef = useRef(DEFAULT_FILTERS);

  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerColor = useColorModeValue("gray.500", "gray.400");
  const mutedTextColor = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.800");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "whiteAlpha.50");
  const selectedRowBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const selectionBarBg = useColorModeValue("blue.50", "whiteAlpha.100");
  const selectionBarBorder = useColorModeValue("blue.100", "whiteAlpha.200");
  const rateValueColor = useColorModeValue("blue.700", "blue.200");
  const stickyEdgeShadow = useColorModeValue(
    "inset -1px 0 0 var(--chakra-colors-gray-200)",
    "inset -1px 0 0 var(--chakra-colors-whiteAlpha-200)"
  );

  const tableHeaderCellProps = {
    py: 3,
    px: 4,
    fontSize: "11px",
    letterSpacing: "0.06em",
    color: headerColor,
    bg: tableHeaderBg,
    borderColor: tableBorderColor,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    fontWeight: "600",
  };
  const tableCellProps = {
    py: 3,
    px: 4,
    borderColor: tableBorderColor,
    fontSize: "sm",
    color: textColor,
  };
  const filterInputProps = {
    size: "sm",
    bg: inputBg,
    color: inputText,
    borderColor: borderColor,
    borderRadius: "md",
    _placeholder: { color: placeholderColor },
  };
  const selectProps = {
    size: "sm",
    bg: inputBg,
    color: inputText,
    borderColor: borderColor,
    borderRadius: "md",
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState(() => savedListState?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => savedListState?.debouncedSearch ?? savedListState?.search ?? ""
  );
  const [filters, setFilters] = useState(() => savedListState?.filters ?? DEFAULT_FILTERS);
  filtersRef.current = filters;
  const [page, setPage] = useState(() => savedListState?.page ?? 1);
  const [sort, setSort] = useState(() => savedListState?.sort ?? { ...RATE_LIST_DEFAULT_SORT });
  const [sortableFields, setSortableFields] = useState(null);
  const isDefaultSort =
    sort.sort_by === RATE_LIST_DEFAULT_SORT.sort_by &&
    sort.sort_order === RATE_LIST_DEFAULT_SORT.sort_order;
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const hasAnyAdvanceFilter = Boolean(
    filters.rate_type ||
    filters.location_text ||
    filters.client_id ||
    filters.agent_id ||
    filters.currency_id ||
    filters.rate_text ||
    filters.import_group ||
    filters.active ||
    filters.incl_in_tariff
  );
  const hasAnyFilter = Boolean(search || hasAnyAdvanceFilter);
  const [showFilterFields, setShowFilterFields] = useState(
    () => savedListState?.showFilterFields ?? false
  );

  const [selectedRates, setSelectedRates] = useState(
    () => savedListState?.selectedRates ?? {}
  );
  const [pdfModel, setPdfModel] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);

  const selectedCount = Object.keys(selectedRates).length;
  const pageItemIds = useMemo(() => items.map((item) => item.id), [items]);
  const allPageSelected =
    items.length > 0 && pageItemIds.every((id) => Object.prototype.hasOwnProperty.call(selectedRates, id));
  const somePageSelected = pageItemIds.some((id) =>
    Object.prototype.hasOwnProperty.call(selectedRates, id)
  );

  const buildListParams = useCallback(
    (overrides = {}) => ({
      page: overrides.page,
      page_size: overrides.page_size,
      search: debouncedSearch.trim() || undefined,
      rate_type: filters.rate_type || undefined,
      location_text: filters.location_text.trim() || undefined,
      client_id: intFilterToParam(filters.client_id),
      agent_id: intFilterToParam(filters.agent_id),
      currency_id: intFilterToParam(filters.currency_id),
      rate_text: filters.rate_text.trim() || undefined,
      import_group: filters.import_group.trim() || undefined,
      active: filters.active === "" ? undefined : filters.active === "true",
      incl_in_tariff: filters.incl_in_tariff === "" ? undefined : filters.incl_in_tariff === "true",
      sort_by: sort.sort_by,
      sort_order: sort.sort_order,
    }),
    [debouncedSearch, filters, sort]
  );

  // Click cycles a column: ascending → descending → back to the default order.
  const handleSort = useCallback((sortKey) => {
    setSort((prev) => {
      if (prev.sort_by !== sortKey) return { sort_by: sortKey, sort_order: "asc" };
      if (prev.sort_order === "asc") return { sort_by: sortKey, sort_order: "desc" };
      return { ...RATE_LIST_DEFAULT_SORT };
    });
    setPage(1);
  }, []);

  const isColumnSortable = useCallback(
    (column) =>
      !Array.isArray(sortableFields) ||
      [column.sortKey, ...(column.aliases || [])].some((key) => sortableFields.includes(key)),
    [sortableFields]
  );

  const getFilterStateSnapshot = useCallback(
    () =>
      buildRateListFilterSnapshot({
        search,
        debouncedSearch,
        filters,
        page,
        sort,
        showFilterFields,
        selectedRates,
      }),
    [search, debouncedSearch, filters, page, sort, showFilterFields, selectedRates]
  );

  const applyFilterState = useCallback((nextState) => {
    if (!nextState) return;
    const snapshot = buildRateListFilterSnapshot(nextState);
    setSearch(snapshot.search);
    setDebouncedSearch(snapshot.debouncedSearch);
    setFilters(snapshot.filters);
    setPage(snapshot.page);
    setSort(snapshot.sort);
    setShowFilterFields(snapshot.showFilterFields);
    setSelectedRates(snapshot.selectedRates);
    skipSelectionClearRef.current = true;
    writePersistedRateListState(snapshot);
  }, []);

  useEffect(() => {
    if (hasAnyAdvanceFilter) setShowFilterFields(true);
  }, [hasAnyAdvanceFilter]);

  useEffect(() => {
    if (location.state?.filterState && location.state?.fromRateForm) {
      applyFilterState(location.state.filterState);
      history.replace({
        pathname: location.pathname,
        search: location.search,
        state: {},
      });
    }
  }, [applyFilterState, history, location.pathname, location.search, location.state]);

  useEffect(() => {
    writePersistedRateListState({
      search,
      debouncedSearch,
      filters,
      page,
      sort,
      showFilterFields,
      selectedRates,
    });
  }, [search, debouncedSearch, filters, page, sort, showFilterFields, selectedRates]);

  useEffect(() => {
    if (skipSelectionClearRef.current) {
      skipSelectionClearRef.current = false;
      return;
    }
    if (isFirstFilterChangeRun.current) {
      isFirstFilterChangeRun.current = false;
      return;
    }
    setSelectedRates({});
  }, [debouncedSearch, filters]);

  const isFirstSearchRun = useRef(true);
  const isFirstFilterChangeRun = useRef(true);
  const skipSelectionClearRef = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (!isFirstSearchRun.current) {
        setPage(1);
      }
      isFirstSearchRun.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...buildListParams(),
        page,
        page_size: RATE_LIST_PAGE_SIZE,
      };

      const response = await api.get("/api/rate/list", { params });
      const result = response?.data || {};

      setItems(Array.isArray(result.data) ? result.data : []);
      setTotalPages(result.total_pages || 1);
      setTotalCount(result.total_count || 0);
      setHasNext(Boolean(result.has_next));
      setHasPrevious(Boolean(result.has_previous));
      if (Array.isArray(result.sortable_fields)) setSortableFields(result.sortable_fields);
    } catch (error) {
      const apiMessage = error?.response?.data?.message;
      const isSortError =
        error?.response?.status === 400 && /sort/i.test(String(apiMessage || ""));
      if (isSortError) {
        // A saved or stale sort the API no longer accepts: fall back to the default order.
        setSort({ ...RATE_LIST_DEFAULT_SORT });
      } else {
        setItems([]);
        setTotalPages(1);
        setTotalCount(0);
        setHasNext(false);
        setHasPrevious(false);
      }
      toast({
        title: isSortError ? "Sorting not available" : "Error",
        description: apiMessage || "Failed to load rate list.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [buildListParams, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildOptionsPayload = useCallback((currentFilters, queries = {}) => {
    const payload = {
      page: 1,
      page_size: 200,
    };
    if (currentFilters.rate_type) payload.rate_type = currentFilters.rate_type;
    const clientId = intFilterToParam(currentFilters.client_id);
    if (clientId != null) payload.client_id = clientId;
    const agentId = intFilterToParam(currentFilters.agent_id);
    if (agentId != null) payload.agent_id = agentId;
    const currencyId = intFilterToParam(currentFilters.currency_id);
    if (currencyId != null) payload.currency_id = currencyId;
    if (currentFilters.rate_text?.trim()) payload.rate_text = currentFilters.rate_text.trim();
    if (currentFilters.import_group?.trim()) payload.import_group = currentFilters.import_group.trim();

    Object.entries(queries).forEach(([key, value]) => {
      const trimmed = typeof value === "string" ? value.trim() : "";
      if (trimmed) payload[key] = trimmed;
    });

    return payload;
  }, []);

  const pinSelectedOptions = useCallback((currentFilters, options) => {
    const pins = selectedOptionPinsRef.current;
    if (currentFilters.rate_type) {
      pins.rateType =
        options.rateTypes.find((option) => String(option.id) === String(currentFilters.rate_type)) ||
        pins.rateType;
    } else {
      pins.rateType = null;
    }
    if (currentFilters.client_id) {
      pins.client =
        options.clients.find((option) => String(option.id) === String(currentFilters.client_id)) ||
        pins.client;
    } else {
      pins.client = null;
    }
    if (currentFilters.agent_id) {
      pins.agent =
        options.agents.find((option) => String(option.id) === String(currentFilters.agent_id)) ||
        pins.agent;
    } else {
      pins.agent = null;
    }
    if (currentFilters.currency_id) {
      pins.currency =
        options.currencies.find((option) => String(option.id) === String(currentFilters.currency_id)) ||
        pins.currency;
    } else {
      pins.currency = null;
    }
    if (currentFilters.rate_text) {
      pins.rateText =
        options.rateTexts.find((option) => String(option.id) === String(currentFilters.rate_text)) ||
        pins.rateText;
    } else {
      pins.rateText = null;
    }
    if (currentFilters.import_group) {
      pins.group =
        options.groups.find((option) => String(option.id) === String(currentFilters.import_group)) ||
        pins.group;
    } else {
      pins.group = null;
    }
  }, []);

  const loadFilterOptions = useCallback(
    async (currentFilters = filtersRef.current, queries = optionQueriesRef.current, options = {}) => {
      const { pruneSelections = true } = options;
      const requestId = ++optionsRequestIdRef.current;
      setIsLoadingFilterOptions(true);
      try {
        const result = await getRateListOptionsApi(buildOptionsPayload(currentFilters, queries));
        if (requestId !== optionsRequestIdRef.current) return;

        const rawGroups =
          (Array.isArray(result.group_options) && result.group_options) ||
          (Array.isArray(result.import_group_options) && result.import_group_options) ||
          (Array.isArray(result.group_name_options) && result.group_name_options) ||
          [];

        const rawOptions = {
          rateTypes: normalizeRateTypeOptions(result.rate_type_options),
          clients: normalizeIdNameOptions(result.client_options),
          agents: normalizeIdNameOptions(result.agent_options),
          currencies: normalizeIdNameOptions(result.currency_options),
          rateTexts: normalizeNamedOptions(result.rate_text_options, ["rate_text", "name"]),
          groups: normalizeNamedOptions(rawGroups, ["import_group", "group_name", "name", "group"]),
        };

        let effectiveFilters = currentFilters;
        if (pruneSelections) {
          const pruned = { ...currentFilters };
          let changed = false;

          if (pruned.rate_type && !optionHasValue(rawOptions.rateTypes, pruned.rate_type)) {
            pruned.rate_type = "";
            changed = true;
          }
          if (pruned.client_id && !optionHasValue(rawOptions.clients, pruned.client_id)) {
            pruned.client_id = "";
            changed = true;
          }
          if (pruned.agent_id && !optionHasValue(rawOptions.agents, pruned.agent_id)) {
            pruned.agent_id = "";
            changed = true;
          }
          if (pruned.currency_id && !optionHasValue(rawOptions.currencies, pruned.currency_id)) {
            pruned.currency_id = "";
            changed = true;
          }
          if (pruned.rate_text && !optionHasValue(rawOptions.rateTexts, pruned.rate_text)) {
            pruned.rate_text = "";
            changed = true;
          }
          if (pruned.import_group && !optionHasValue(rawOptions.groups, pruned.import_group)) {
            pruned.import_group = "";
            changed = true;
          }

          if (changed) {
            effectiveFilters = pruned;
            setFilters((prev) => {
              const next = { ...prev, ...pruned };
              const same =
                prev.rate_type === next.rate_type &&
                prev.client_id === next.client_id &&
                prev.agent_id === next.agent_id &&
                prev.currency_id === next.currency_id &&
                prev.rate_text === next.rate_text &&
                prev.import_group === next.import_group;
              return same ? prev : next;
            });
          }
        }

        const pins = selectedOptionPinsRef.current;
        const nextOptions = {
          rateTypes: mergeSelectedOption(rawOptions.rateTypes, effectiveFilters.rate_type, pins.rateType),
          clients: mergeSelectedOption(rawOptions.clients, effectiveFilters.client_id, pins.client),
          agents: mergeSelectedOption(rawOptions.agents, effectiveFilters.agent_id, pins.agent),
          currencies: mergeSelectedOption(
            rawOptions.currencies,
            effectiveFilters.currency_id,
            pins.currency
          ),
          rateTexts: mergeSelectedOption(
            rawOptions.rateTexts,
            effectiveFilters.rate_text,
            pins.rateText
          ),
          groups: mergeSelectedOption(rawOptions.groups, effectiveFilters.import_group, pins.group),
        };

        setFilterOptions(nextOptions);
        pinSelectedOptions(effectiveFilters, nextOptions);
      } catch (error) {
        if (requestId !== optionsRequestIdRef.current) return;
        setFilterOptions((prev) => prev);
      } finally {
        if (requestId === optionsRequestIdRef.current) {
          setIsLoadingFilterOptions(false);
        }
      }
    },
    [buildOptionsPayload, pinSelectedOptions]
  );

  useEffect(() => {
    optionQueriesRef.current = { ...EMPTY_OPTION_QUERIES };
    loadFilterOptions(filters, EMPTY_OPTION_QUERIES, { pruneSelections: true });
  }, [
    filters.rate_type,
    filters.client_id,
    filters.agent_id,
    filters.currency_id,
    filters.rate_text,
    filters.import_group,
    loadFilterOptions,
  ]);

  const handleOptionSearchChange = useCallback(
    (queryKey, query) => {
      optionQueriesRef.current = {
        ...optionQueriesRef.current,
        [queryKey]: query,
      };
      loadFilterOptions(filtersRef.current, optionQueriesRef.current, { pruneSelections: false });
    },
    [loadFilterOptions]
  );

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      const pins = selectedOptionPinsRef.current;

      if (field === "rate_type") {
        pins.rateType = value
          ? filterOptions.rateTypes.find((option) => String(option.id) === String(value)) || pins.rateType
          : null;
      }
      if (field === "client_id") {
        pins.client = value
          ? filterOptions.clients.find((option) => String(option.id) === String(value)) || pins.client
          : null;
      }
      if (field === "agent_id") {
        pins.agent = value
          ? filterOptions.agents.find((option) => String(option.id) === String(value)) || pins.agent
          : null;
      }
      if (field === "currency_id") {
        pins.currency = value
          ? filterOptions.currencies.find((option) => String(option.id) === String(value)) ||
            pins.currency
          : null;
      }
      if (field === "rate_text") {
        pins.rateText = value
          ? filterOptions.rateTexts.find((option) => String(option.id) === String(value)) ||
            pins.rateText
          : null;
      }
      if (field === "import_group") {
        pins.group = value
          ? filterOptions.groups.find((option) => String(option.id) === String(value)) || pins.group
          : null;
      }

      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setSelectedRates({});
    setShowFilterFields(false);
    setFilterOptions(EMPTY_FILTER_OPTIONS);
    optionQueriesRef.current = { ...EMPTY_OPTION_QUERIES };
    selectedOptionPinsRef.current = {
      client: null,
      agent: null,
      currency: null,
      rateText: null,
      group: null,
      rateType: null,
    };
    writePersistedRateListState(defaultRateListState);
    loadFilterOptions(DEFAULT_FILTERS, EMPTY_OPTION_QUERIES, { pruneSelections: false });
  };

  const toggleSelectRate = (item) => {
    setSelectedRates((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    if (allPageSelected) {
      setSelectedRates((prev) => {
        const next = { ...prev };
        pageItemIds.forEach((id) => {
          delete next[id];
        });
        return next;
      });
      return;
    }
    setSelectedRates((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[item.id] = item;
      });
      return next;
    });
  };

  const navigateToRateForm = (selectedItems = [], isBulkEdit = false) => {
    history.push({
      pathname: RATE_FORM_ROUTE,
      state: {
        selectedItems,
        isBulkEdit,
        filterState: getFilterStateSnapshot(),
      },
    });
  };

  const openCreate = () => {
    history.push({
      pathname: RATE_FORM_ROUTE,
      state: {
        filterState: getFilterStateSnapshot(),
      },
    });
  };

  const openEdit = (item) => {
    navigateToRateForm([item], false);
  };

  const handleNavigateToEdit = () => {
    const selectedItems = Object.values(selectedRates);
    if (!selectedItems.length) return;

    navigateToRateForm(selectedItems, selectedItems.length > 1);
  };

  const deleteOne = async (id) => {
    try {
      await deleteRateListApi(id);
      setSelectedRates((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast({
        title: "Rate deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rate.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleClosePdfPreview = useCallback(() => {
    if (pdfPreviewBlobUrlRef.current) {
      URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
      pdfPreviewBlobUrlRef.current = null;
    }
    setPdfPreviewUrl(null);
    onPdfPreviewClose();
  }, [onPdfPreviewClose]);

  const openPdfPreview = useCallback(
    async (ratesToExport, scopeLabel) => {
      if (!ratesToExport.length) {
        toast({
          title: "No rates to export",
          description: "There are no rate records to include in the PDF.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setIsPdfLoading(true);
      try {
        const model = buildRateListPdfModel({
          items: ratesToExport,
          reportType: RATE_LIST_PDF_TYPES.COST_AND_FIXED,
          scopeLabel,
        });
        setPdfModel(model);

        const doc = await buildRateListPdf(model);
        const blob = doc.output("blob");
        if (pdfPreviewBlobUrlRef.current) {
          URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
          pdfPreviewBlobUrlRef.current = null;
        }
        const url = URL.createObjectURL(blob);
        pdfPreviewBlobUrlRef.current = url;
        setPdfPreviewUrl(url);
        onPdfPreviewOpen();
      } catch (error) {
        console.error("Failed to build rate list PDF:", error);
        toast({
          title: "PDF failed",
          description: "Could not generate rate list PDF.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setIsPdfLoading(false);
      }
    },
    [onPdfPreviewOpen, toast]
  );

  const handleExportSelectedPdf = useCallback(() => {
    openPdfPreview(Object.values(selectedRates), `Selected rates (${selectedCount})`);
  }, [openPdfPreview, selectedCount, selectedRates]);

  const handleExportFilteredPdf = useCallback(async () => {
    setIsPdfLoading(true);
    try {
      const filteredRates = await fetchAllFilteredRates(api, buildListParams());
      await openPdfPreview(filteredRates, `Filtered rates (${filteredRates.length})`);
    } catch (error) {
      console.error("Failed to load filtered rates for PDF:", error);
      toast({
        title: "Export failed",
        description: "Could not load filtered rates for PDF export.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsPdfLoading(false);
    }
  }, [buildListParams, openPdfPreview, toast]);

  const exportRatesToExcel = useCallback(
    (ratesToExport, filePrefix) => {
      if (!ratesToExport.length) {
        toast({
          title: "No rates to export",
          description: "There are no rate records to include in the Excel file.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      downloadRateListExcel(ratesToExport, { filePrefix });
      toast({
        title: "Excel export",
        description: `${ratesToExport.length} rate${ratesToExport.length === 1 ? "" : "s"} exported.`,
        status: "success",
        duration: 2200,
        isClosable: true,
      });
    },
    [toast]
  );

  const handleExportSelectedExcel = useCallback(() => {
    exportRatesToExcel(Object.values(selectedRates), "rate-list-selected");
  }, [exportRatesToExcel, selectedRates]);

  const handleExportFilteredExcel = useCallback(async () => {
    setIsExcelLoading(true);
    try {
      const filteredRates = await fetchAllFilteredRates(api, buildListParams());
      exportRatesToExcel(filteredRates, hasAnyFilter ? "rate-list-filtered" : "rate-list");
    } catch (error) {
      console.error("Failed to load rates for Excel:", error);
      toast({
        title: "Export failed",
        description: "Could not load rates for Excel export.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExcelLoading(false);
    }
  }, [buildListParams, exportRatesToExcel, hasAnyFilter, toast]);

  const handleDownloadPdf = useCallback(async () => {
    if (!pdfModel) return;
    try {
      const doc = await buildRateListPdf(pdfModel);
      doc.save(getRateListPdfFilename(pdfModel));
    } catch (error) {
      console.error("Failed to download rate list PDF:", error);
      toast({
        title: "Download failed",
        description: "Could not download rate list PDF.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  }, [pdfModel, toast]);

  const handlePrintFromPdfPreview = useCallback(() => {
    const win = pdfPreviewIframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }, []);

  useEffect(
    () => () => {
      if (pdfPreviewBlobUrlRef.current) {
        URL.revokeObjectURL(pdfPreviewBlobUrlRef.current);
      }
    },
    []
  );

  const searchableSelectProps = {
    size: "sm",
    bg: inputBg,
    color: inputText,
    borderColor: borderColor,
  };

  const advancedFilterCount = Object.values(filters).filter(
    (value) => value != null && String(value).trim() !== ""
  ).length;
  const sortableColumns = RATE_LIST_COLUMNS.filter((column) => isColumnSortable(column));
  const pageStart = totalCount === 0 ? 0 : (page - 1) * RATE_LIST_PAGE_SIZE + 1;
  const pageEnd = Math.min(page * RATE_LIST_PAGE_SIZE, totalCount);

  const renderFilterField = (label, control) => (
    <FormControl>
      <FormLabel fontSize="xs" mb="1" color={textColor}>
        {label}
      </FormLabel>
      {control}
    </FormControl>
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb="4" flexWrap="wrap" gap="3">
        <Text fontSize="lg" fontWeight="700" color={textColor}>
          Rate List
        </Text>
        <HStack spacing="3" flexWrap="wrap">
          <InputGroup size="sm" w={{ base: "100%", md: "340px" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={placeholderColor} />
            </InputLeftElement>
            <Input
              {...filterInputProps}
              placeholder="Search rates (ID, name, location, agent...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              pr={search ? "32px" : undefined}
            />
            {search && (
              <InputRightElement>
                <IconButton
                  aria-label="Clear search"
                  size="xs"
                  variant="ghost"
                  icon={<Icon as={MdClear} />}
                  onClick={() => setSearch("")}
                />
              </InputRightElement>
            )}
          </InputGroup>
          <Tooltip label="Refresh" hasArrow>
            <IconButton
              size="sm"
              icon={<Icon as={MdRefresh} />}
              aria-label="Refresh rates"
              onClick={loadData}
              isLoading={loading}
              variant="outline"
            />
          </Tooltip>
          <Button
            size="sm"
            leftIcon={<Icon as={MdDownload} />}
            colorScheme="green"
            variant="outline"
            onClick={handleExportFilteredExcel}
            isLoading={isExcelLoading}
            loadingText="Exporting..."
            isDisabled={totalCount === 0}
          >
            Export Excel
          </Button>
          <Button size="sm" leftIcon={<Icon as={MdAdd} />} colorScheme="blue" onClick={openCreate} px={10}>
            New Rate
          </Button>
        </HStack>
      </Flex>

      <Box mb="4">
        <Flex
          align="center"
          justify="space-between"
          gap="3"
          flexWrap="wrap"
          mb={showFilterFields ? 3 : 0}
        >
          <HStack spacing="2" flexWrap="wrap">
            <Button
              size="sm"
              leftIcon={<Icon as={MdFilterList} />}
              variant={showFilterFields ? "solid" : "outline"}
              colorScheme="blue"
              onClick={() => setShowFilterFields((prev) => !prev)}
            >
              Advanced Filters
              {advancedFilterCount > 0 && (
                <Badge ml="2" colorScheme="blue" fontSize="xs">
                  {advancedFilterCount}
                </Badge>
              )}
            </Button>
            {hasAnyFilter && (
              <Button
                size="sm"
                leftIcon={<Icon as={MdClear} />}
                variant="outline"
                colorScheme="gray"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </HStack>

          <HStack spacing="2" flexWrap="wrap">
            <Text
              fontSize="xs"
              fontWeight="600"
              color={headerColor}
              textTransform="uppercase"
              letterSpacing="0.06em"
            >
              Sort
            </Text>
            <Select
              {...selectProps}
              w="200px"
              aria-label="Sort by"
              value={isDefaultSort ? "" : sort.sort_by}
              onChange={(e) => {
                const sortBy = e.target.value;
                setSort(
                  sortBy
                    ? { sort_by: sortBy, sort_order: isDefaultSort ? "asc" : sort.sort_order }
                    : { ...RATE_LIST_DEFAULT_SORT }
                );
                setPage(1);
              }}
            >
              <option value="">Default (newest first)</option>
              {sortableColumns.map((column) => (
                <option key={column.sortKey} value={column.sortKey}>
                  {column.label}
                </option>
              ))}
            </Select>
            <Tooltip
              hasArrow
              label={sort.sort_order === "asc" ? "Ascending — click for descending" : "Descending — click for ascending"}
            >
              <IconButton
                aria-label="Toggle sort direction"
                size="sm"
                variant="outline"
                isDisabled={isDefaultSort}
                icon={<Icon as={sort.sort_order === "asc" ? MdArrowUpward : MdArrowDownward} />}
                onClick={() => {
                  setSort((prev) => ({
                    ...prev,
                    sort_order: prev.sort_order === "asc" ? "desc" : "asc",
                  }));
                  setPage(1);
                }}
              />
            </Tooltip>
          </HStack>
        </Flex>

        <Collapse in={showFilterFields} animateOpacity>
          <SimpleGrid
            columns={{ base: 1, md: 2, lg: 3, xl: 5 }}
            spacing="4"
            p="4"
            bg={tableHeaderBg}
            borderRadius="md"
            border="1px"
            borderColor={borderColor}
          >
            {renderFilterField(
              "Rate Type",
              <SimpleSearchableSelect
                value={filters.rate_type}
                onChange={(value) => handleFilterChange("rate_type", value || "")}
                options={filterOptions.rateTypes}
                placeholder="All Types"
                displayKey="name"
                valueKey="id"
                formatOption={(option) => option.name}
                isLoading={isLoadingFilterOptions}
                onSearchChange={(query) => handleOptionSearchChange("q_rate_type", query)}
                prefillOnFocus={false}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "Location",
              <Input
                {...filterInputProps}
                placeholder="Filter by location..."
                value={filters.location_text}
                onChange={(e) => handleFilterChange("location_text", e.target.value)}
              />
            )}
            {renderFilterField(
              "Client",
              <SimpleSearchableSelect
                value={filters.client_id}
                onChange={(value) => handleFilterChange("client_id", value || "")}
                options={filterOptions.clients}
                placeholder="All Clients"
                displayKey="name"
                valueKey="id"
                formatOption={formatClientOption}
                isLoading={isLoadingFilterOptions}
                onSearchChange={(query) => handleOptionSearchChange("q_client", query)}
                prefillOnFocus={false}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "Agent",
              <SimpleSearchableSelect
                value={filters.agent_id}
                onChange={(value) => handleFilterChange("agent_id", value || "")}
                options={filterOptions.agents}
                placeholder="All Agents"
                displayKey="name"
                valueKey="id"
                formatOption={formatAgentOption}
                isLoading={isLoadingFilterOptions}
                onSearchChange={(query) => handleOptionSearchChange("q_agent", query)}
                prefillOnFocus={false}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "Group Name",
              <SimpleSearchableSelect
                value={filters.import_group}
                onChange={(value) => handleFilterChange("import_group", value || "")}
                options={filterOptions.groups}
                placeholder="All Groups"
                displayKey="name"
                valueKey="id"
                formatOption={(option) => option.name || option.import_group}
                isLoading={isLoadingFilterOptions}
                onSearchChange={(query) => handleOptionSearchChange("q_group", query)}
                prefillOnFocus={false}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "Rate Text",
              <SimpleSearchableSelect
                value={filters.rate_text}
                onChange={(value) => handleFilterChange("rate_text", value || "")}
                options={filterOptions.rateTexts}
                placeholder="All Rate Texts"
                displayKey="name"
                valueKey="id"
                formatOption={(option) => option.name || option.rate_text}
                isLoading={isLoadingFilterOptions}
                onSearchChange={(query) => handleOptionSearchChange("q_rate_text", query)}
                prefillOnFocus={false}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "Currency",
              <SimpleSearchableSelect
                value={filters.currency_id}
                onChange={(value) => handleFilterChange("currency_id", value || "")}
                options={filterOptions.currencies}
                placeholder="All Currencies"
                displayKey="name"
                valueKey="id"
                formatOption={formatCurrencyOption}
                isLoading={isLoadingFilterOptions}
                onSearchChange={(query) => handleOptionSearchChange("q_currency", query)}
                prefillOnFocus={false}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "Active",
              <SimpleSearchableSelect
                value={filters.active}
                onChange={(value) => handleFilterChange("active", value || "")}
                options={BOOLEAN_FILTER_OPTIONS}
                placeholder="All"
                displayKey="name"
                valueKey="id"
                formatOption={(option) => option.name}
                {...searchableSelectProps}
              />
            )}
            {renderFilterField(
              "In Tariff",
              <SimpleSearchableSelect
                value={filters.incl_in_tariff}
                onChange={(value) => handleFilterChange("incl_in_tariff", value || "")}
                options={BOOLEAN_FILTER_OPTIONS}
                placeholder="All"
                displayKey="name"
                valueKey="id"
                formatOption={(option) => option.name}
                {...searchableSelectProps}
              />
            )}
          </SimpleGrid>
        </Collapse>
      </Box>

      {(selectedCount > 0 || hasAnyFilter) && (
        <Flex
          mb="3"
          px="4"
          py="2"
          align="center"
          justify="space-between"
          flexWrap="wrap"
          gap="3"
          bg={selectedCount > 0 ? selectionBarBg : tableHeaderBg}
          border="1px"
          borderColor={selectedCount > 0 ? selectionBarBorder : borderColor}
          borderRadius="md"
        >
          <Text fontSize="sm" color={selectedCount > 0 ? textColor : mutedTextColor} fontWeight={selectedCount > 0 ? "600" : "normal"}>
            {selectedCount > 0
              ? `${selectedCount} rate${selectedCount === 1 ? "" : "s"} selected`
              : "Tick rates in the table to edit them together or export them to PDF or Excel."}
          </Text>
          <HStack spacing="2" flexWrap="wrap">
            {selectedCount > 0 && (
              <>
                <Button colorScheme="green" size="sm" leftIcon={<Icon as={MdEdit} />} onClick={handleNavigateToEdit}>
                  Edit Selected ({selectedCount})
                </Button>
                <Button
                  colorScheme="blue"
                  size="sm"
                  leftIcon={<Icon as={MdPictureAsPdf} />}
                  onClick={handleExportSelectedPdf}
                  isLoading={isPdfLoading}
                  loadingText="Generating..."
                >
                  Export PDF ({selectedCount})
                </Button>
                <Button
                  colorScheme="green"
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={MdDownload} />}
                  onClick={handleExportSelectedExcel}
                >
                  Export Excel ({selectedCount})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedRates({})}>
                  Clear Selection
                </Button>
              </>
            )}
            {hasAnyFilter && (
              <Button
                colorScheme="teal"
                variant="outline"
                size="sm"
                leftIcon={<Icon as={MdPictureAsPdf} />}
                onClick={handleExportFilteredPdf}
                isLoading={isPdfLoading}
                loadingText="Loading..."
              >
                Export All Filtered PDF ({totalCount})
              </Button>
            )}
          </HStack>
        </Flex>
      )}

      <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
        {loading ? (
          <Flex justify="center" align="center" py={16}>
            <Spinner />
          </Flex>
        ) : items.length === 0 ? (
          <VStack spacing={3} py={16} px={6} textAlign="center">
            <Icon as={MdAttachMoney} boxSize={10} color="gray.400" />
            <Text fontWeight="700" color={textColor}>
              No rates found
            </Text>
            <Text fontSize="sm" color={mutedTextColor} maxW="360px">
              {hasAnyFilter
                ? "Try clearing search or filters to see more results."
                : "Create a rate to see it listed here."}
            </Text>
            {!hasAnyFilter && (
              <Button mt={1} size="sm" colorScheme="blue" leftIcon={<Icon as={MdAdd} />} onClick={openCreate}>
                New Rate
              </Button>
            )}
          </VStack>
        ) : (
          <>
            <Box
              overflowX="auto"
              overflowY="auto"
              maxH="600px"
              sx={{
                "&::-webkit-scrollbar": { width: "8px", height: "8px" },
                "&::-webkit-scrollbar-track": { background: "gray.100", borderRadius: "4px" },
                "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
                "&::-webkit-scrollbar-thumb:hover": { background: "gray.400" },
              }}
            >
              <Table size="sm" variant="simple" minW="1820px">
                <Thead position="sticky" top={0} zIndex={3}>
                  <Tr>
                    <Th
                      {...tableHeaderCellProps}
                      position="sticky"
                      left={0}
                      zIndex={4}
                      minW={STICKY_CHECKBOX_WIDTH}
                      w={STICKY_CHECKBOX_WIDTH}
                      maxW={STICKY_CHECKBOX_WIDTH}
                      px={2}
                    >
                      <Checkbox
                        aria-label="Select all rates on this page"
                        isChecked={allPageSelected}
                        isIndeterminate={somePageSelected && !allPageSelected}
                        onChange={toggleSelectAllOnPage}
                        size="sm"
                        colorScheme="blue"
                        borderColor="gray.500"
                      />
                    </Th>
                    <Th
                      {...tableHeaderCellProps}
                      position="sticky"
                      left={STICKY_CHECKBOX_WIDTH}
                      zIndex={4}
                      minW={STICKY_ACTIONS_WIDTH}
                      w={STICKY_ACTIONS_WIDTH}
                      maxW={STICKY_ACTIONS_WIDTH}
                      textAlign="center"
                      boxShadow={stickyEdgeShadow}
                    >
                      Actions
                    </Th>
                    {RATE_LIST_COLUMNS.map((column) => (
                      <SortableHeader
                        key={column.sortKey}
                        column={column}
                        sort={sort}
                        isSortable={isColumnSortable(column)}
                        onSort={handleSort}
                        headerCellProps={tableHeaderCellProps}
                        hoverBg={hoverBg}
                      />
                    ))}
                  </Tr>
                </Thead>
                <Tbody>
                  {items.map((item, index) => {
                    const isSelected = Boolean(selectedRates[item.id]);
                    const rowBg = isSelected ? selectedRowBg : index % 2 === 0 ? tableRowBg : tableRowBgAlt;
                    const rateTypeLabel = formatRateType(item.rate_type);
                    return (
                      <Tr key={item.id} bg={rowBg} _hover={{ bg: hoverBg }} sx={{ "& td": { bg: "inherit" } }}>
                        <Td
                          {...tableCellProps}
                          position="sticky"
                          left={0}
                          zIndex={1}
                          minW={STICKY_CHECKBOX_WIDTH}
                          w={STICKY_CHECKBOX_WIDTH}
                          maxW={STICKY_CHECKBOX_WIDTH}
                          px={2}
                        >
                          <Checkbox
                            aria-label={`Select rate ${item.rate_name || item.id}`}
                            isChecked={isSelected}
                            onChange={() => toggleSelectRate(item)}
                            size="sm"
                            colorScheme="blue"
                            borderColor="gray.500"
                          />
                        </Td>
                        <Td
                          {...tableCellProps}
                          position="sticky"
                          left={STICKY_CHECKBOX_WIDTH}
                          zIndex={1}
                          minW={STICKY_ACTIONS_WIDTH}
                          w={STICKY_ACTIONS_WIDTH}
                          maxW={STICKY_ACTIONS_WIDTH}
                          boxShadow={stickyEdgeShadow}
                        >
                          <HStack spacing="2" justify="center">
                            <Tooltip label="Edit" hasArrow>
                              <IconButton
                                size="sm"
                                aria-label="Edit rate"
                                icon={<Icon as={MdEdit} />}
                                variant="outline"
                                colorScheme="blue"
                                onClick={() => openEdit(item)}
                              />
                            </Tooltip>
                            <Tooltip label="Delete" hasArrow>
                              <IconButton
                                size="sm"
                                aria-label="Delete rate"
                                icon={<Icon as={MdDelete} />}
                                variant="outline"
                                colorScheme="red"
                                onClick={() => deleteOne(item.id)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                        <Td {...tableCellProps}>
                          {rateTypeLabel === "-" ? (
                            <Text color="gray.400">-</Text>
                          ) : (
                            <Tag
                              size="sm"
                              variant="subtle"
                              colorScheme={item.rate_type === "client_specific" ? "purple" : "blue"}
                              whiteSpace="nowrap"
                            >
                              {rateTypeLabel}
                            </Tag>
                          )}
                        </Td>
                        <RateCell value={item.location_text || item.location} cellProps={tableCellProps} />
                        <RateCell
                          value={item.client_id?.name || item.client_name || item.client}
                          cellProps={tableCellProps}
                        />
                        <RateCell
                          value={item.agent_id?.name || item.agent_text || item.agent}
                          cellProps={tableCellProps}
                        />
                        <RateCell value={item.import_group} cellProps={tableCellProps} />
                        <RateCell value={item.rate_name} cellProps={tableCellProps} fontWeight="600" />
                        <RateCell
                          value={chargeCategoryLabel(item.charge_category, item.charge_category_label)}
                          cellProps={tableCellProps}
                        />
                        <RateCell value={displayText(item.rate_text)} cellProps={tableCellProps} noOfLines={3} />
                        <RateCell
                          value={formatRateCost(item)}
                          cellProps={tableCellProps}
                          fontWeight="700"
                          color={rateValueColor}
                          isNumeric
                        />
                        <RateCell
                          value={displayText(item.fixed_sales_rate)}
                          cellProps={tableCellProps}
                          fontWeight="700"
                          color={rateValueColor}
                          isNumeric
                        />
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
              <Text fontSize="sm" color={mutedTextColor}>
                Showing {pageStart}–{pageEnd} of {totalCount} rate{totalCount === 1 ? "" : "s"}
                {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
              </Text>
              {totalPages > 1 && (
                <HStack spacing={1} wrap="wrap">
                  <Button size="sm" variant="outline" onClick={() => setPage(1)} isDisabled={!hasPrevious || page === 1}>
                    First
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={!hasPrevious}>
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
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    isDisabled={!hasNext}
                  >
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

      <Modal isOpen={isPdfPreviewOpen} onClose={handleClosePdfPreview} size="full" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent
          m={0}
          maxW="100vw"
          h="100vh"
          maxH="100vh"
          borderRadius={0}
          display="flex"
          flexDirection="column"
        >
          <ModalHeader flexShrink={0}>
            {pdfModel?.title || "Rate List PDF"}
            {pdfModel?.scopeLabel ? ` — ${pdfModel.scopeLabel}` : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} flex="1" minH={0} overflow="hidden" display="flex" flexDirection="column">
            {pdfPreviewUrl ? (
              <Box flex="1" minH={0} w="100%" display="flex">
                <iframe
                  ref={pdfPreviewIframeRef}
                  title="Rate list PDF preview"
                  src={pdfPreviewUrl}
                  style={{ border: "none", width: "100%", flex: 1, minHeight: 0 }}
                />
              </Box>
            ) : (
              <Flex align="center" justify="center" flex="1" minH={0}>
                <Spinner size="lg" />
              </Flex>
            )}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap" flexShrink={0}>
            <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrintFromPdfPreview} isDisabled={!pdfPreviewUrl}>
              Print
            </Button>
            <Button
              colorScheme="blue"
              leftIcon={<Icon as={MdPictureAsPdf} />}
              onClick={handleDownloadPdf}
              isDisabled={!pdfModel}
            >
              Download
            </Button>
            <Button variant="ghost" onClick={handleClosePdfPreview}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
