import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Badge,
  Box,
  Button,
  Center,
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
  Spinner,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
  useDisclosure,
  useToast,
  Select,
  Chip,
  Wrap,
  WrapItem,
  Checkbox,
  CheckboxGroup,
  Tag,
  TagLabel,
  Tooltip,
  TagCloseButton,
  Menu,
  Collapse,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdEdit,
  MdRefresh,
  MdSearch,
  MdClose,
  MdArrowUpward,
  MdArrowDownward,
  MdFilterList,
  MdClear,
  MdContentCopy,
} from "react-icons/md";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import quotationsAPI from "../../../api/quotations";
import { useMasterData } from "../../../hooks/useMasterData";
import {
  getShippingOrders,
  createShippingOrder,
  updateShippingOrder,
} from "../../../api/shippingOrders";
import { useHistory, Link } from "react-router-dom";
import { normalizeOrder, buildPayloadFromForm } from "./shippingOrderUtils";
import ShippingOrderFormFields from "./ShippingOrderFormFields";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return value;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numberValue);
};

const SHIPPING_ORDER_LIST_STORAGE_KEY = "narvi_shipping_order_list_state";

function readPersistedShippingOrderListState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SHIPPING_ORDER_LIST_STORAGE_KEY) : null;
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      searchValue: typeof p.searchValue === "string" ? p.searchValue : "",
      searchQuery: typeof p.searchQuery === "string" ? p.searchQuery : "",
      searchClientFilter: p.searchClientFilter != null ? p.searchClientFilter : null,
      searchVesselFilter: p.searchVesselFilter != null ? p.searchVesselFilter : null,
      searchCountryFilter: p.searchCountryFilter != null ? p.searchCountryFilter : null,
      page: typeof p.page === "number" ? p.page : 1,
      sortBy: typeof p.sortBy === "string" ? p.sortBy : "id",
      sortOrder: p.sortOrder === "asc" || p.sortOrder === "desc" ? p.sortOrder : "desc",
      activeFilters: p.activeFilters && typeof p.activeFilters === "object" ? p.activeFilters : {
        activeATH: false,
        activeSIN: false,
        activeClient: false,
        readyForInvoiceClient: false,
        athReadyForInvoice: false,
        sinReadyForInvoice: false,
      },
      activeATHPics: Array.isArray(p.activeATHPics) ? p.activeATHPics : [],
      activeSINPics: Array.isArray(p.activeSINPics) ? p.activeSINPics : [],
      athReadyForInvoicePics: Array.isArray(p.athReadyForInvoicePics) ? p.athReadyForInvoicePics : [],
      sinReadyForInvoicePics: Array.isArray(p.sinReadyForInvoicePics) ? p.sinReadyForInvoicePics : [],
      activeClientFilter: p.activeClientFilter != null ? p.activeClientFilter : null,
      readyForInvoiceClientFilter: p.readyForInvoiceClientFilter != null ? p.readyForInvoiceClientFilter : null,
      sortConfig: p.sortConfig && typeof p.sortConfig === "object" ? p.sortConfig : { field: null, direction: "asc" },
      nextActionSortOption: p.nextActionSortOption === "none" || p.nextActionSortOption === "next_action" ? p.nextActionSortOption : "none",
    };
  } catch {
    return null;
  }
}

function writePersistedShippingOrderListState(state) {
  try {
    if (typeof sessionStorage === "undefined") return;
    sessionStorage.setItem(SHIPPING_ORDER_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const defaultShippingOrderListState = {
  searchValue: "",
  searchQuery: "",
  searchClientFilter: null,
  searchVesselFilter: null,
  searchCountryFilter: null,
  page: 1,
  sortBy: "id",
  sortOrder: "desc",
  activeFilters: {
    activeATH: false,
    activeSIN: false,
    activeClient: false,
    readyForInvoiceClient: false,
    athReadyForInvoice: false,
    sinReadyForInvoice: false,
  },
  activeATHPics: [],
  activeSINPics: [],
  athReadyForInvoicePics: [],
  sinReadyForInvoicePics: [],
  activeClientFilter: null,
  readyForInvoiceClientFilter: null,
  sortConfig: { field: null, direction: "asc" },
  nextActionSortOption: "none",
};

const SoNumberTab = () => {
  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const tableHeaderCellProps = {
    maxW: "240px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const tableCellProps = {
    maxW: "240px",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const cellText = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  };
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const hoverBg = useColorModeValue("gray.100", "gray.600");

  const toast = useToast();
  const history = useHistory();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filters state (initialized from sessionStorage so they persist across navigation)
  const [savedState] = useState(() => readPersistedShippingOrderListState() || defaultShippingOrderListState);

  // Search state
  const [searchValue, setSearchValue] = useState(savedState.searchValue);
  const [searchQuery, setSearchQuery] = useState(savedState.searchQuery);

  // Search filter state (client, vessel, country/destination)
  const [searchClientFilter, setSearchClientFilter] = useState(savedState.searchClientFilter);
  const [searchVesselFilter, setSearchVesselFilter] = useState(savedState.searchVesselFilter);
  const [searchCountryFilter, setSearchCountryFilter] = useState(savedState.searchCountryFilter);

  // Pagination state
  const [page, setPage] = useState(savedState.page);
  const [pageSize] = useState(80);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState(savedState.sortBy);
  const [sortOrder, setSortOrder] = useState(savedState.sortOrder);

  const [formData, setFormData] = useState(null);
  const { clients, vessels, countries, pics, destinations } = useMasterData();
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  const formDisclosure = useDisclosure();
  const picFilterModalDisclosure = useDisclosure();
  const vslsAgentDtlsDisclosure = useDisclosure();
  const advancedFiltersDisclosure = useDisclosure({ defaultIsOpen: false });

  // VSLS Agent Details modal state (used for both edit + view)
  const [vslsAgentDtlsModalValue, setVslsAgentDtlsModalValue] = useState("");
  const [vslsAgentDtlsModalMode, setVslsAgentDtlsModalMode] = useState("view"); // 'view' | 'edit'
  const [vslsAgentDtlsModalTitle, setVslsAgentDtlsModalTitle] = useState("VSLS Agent Details");
  const [vslsAgentDtlsModalTargetField, setVslsAgentDtlsModalTargetField] = useState(null); // e.g. 'vsls_agent_dtls'

  // Filter states
  const [activeFilters, setActiveFilters] = useState(savedState.activeFilters);

  // PIC filter states - store PIC IDs
  const [activeATHPics, setActiveATHPics] = useState(savedState.activeATHPics);
  const [activeSINPics, setActiveSINPics] = useState(savedState.activeSINPics);
  const [athReadyForInvoicePics, setAthReadyForInvoicePics] = useState(savedState.athReadyForInvoicePics);
  const [sinReadyForInvoicePics, setSinReadyForInvoicePics] = useState(savedState.sinReadyForInvoicePics);

  // Client filter states
  const [activeClientFilter, setActiveClientFilter] = useState(savedState.activeClientFilter);
  const [readyForInvoiceClientFilter, setReadyForInvoiceClientFilter] = useState(savedState.readyForInvoiceClientFilter);

  // Sorting state
  const [sortConfig, setSortConfig] = useState(savedState.sortConfig);

  // Next Action sorting option
  const [nextActionSortOption, setNextActionSortOption] = useState(savedState.nextActionSortOption);

  // Current PIC filter being edited
  const [editingPicFilter, setEditingPicFilter] = useState(null); // 'activeATH', 'activeSIN', 'athReadyForInvoice', 'sinReadyForInvoice'

  // Persist filter state so it survives navigation (e.g. edit/create SO then back)
  useEffect(() => {
    writePersistedShippingOrderListState({
      searchValue,
      searchQuery,
      searchClientFilter,
      searchVesselFilter,
      searchCountryFilter,
      page,
      sortBy,
      sortOrder,
      activeFilters,
      activeATHPics,
      activeSINPics,
      athReadyForInvoicePics,
      sinReadyForInvoicePics,
      activeClientFilter,
      readyForInvoiceClientFilter,
      sortConfig,
      nextActionSortOption,
    });
  }, [
    searchValue,
    searchQuery,
    searchClientFilter,
    searchVesselFilter,
    searchCountryFilter,
    page,
    sortBy,
    sortOrder,
    activeFilters,
    activeATHPics,
    activeSINPics,
    athReadyForInvoicePics,
    sinReadyForInvoicePics,
    activeClientFilter,
    readyForInvoiceClientFilter,
    sortConfig,
    nextActionSortOption,
  ]);

  const resetForm = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localTimestamp = `${pad(now.getDate())}/${pad(
      now.getMonth() + 1
    )}/${now.getFullYear()} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;
    // Default DATE CREATED to today's date (YYYY-MM-DD) when creating a new SO
    const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`;

    setFormData({
      id: null,
      so_number: "",
      date_created: todayDate,
      // Default status when creating a new SO
      done: "active",
      pic_new: null,
      client: "",
      client_id: null,
      vessel_name: "",
      vessel_id: null,
      destination_type: "", // "port_country", "city_country", "airport_country", "country"
      destination: "", // text input for port name, city, airport, or country name
      country_id: null, // selected country ID
      destination_id: null, // legacy field, keep for backward compatibility
      eta_date: "",
      etb: "",
      etd: "",
      next_action: "",
      internal_remark: "",
      client_case_invoice_ref: "",
      vsls_agent_dtls: "",
      quotation: "",
      quotation_id: null,
      timestamp: localTimestamp,
    });
  };

  const openVslsAgentDtlsModal = useCallback((value, mode = "view", title = "Details", targetField = null) => {
    setVslsAgentDtlsModalMode(mode);
    setVslsAgentDtlsModalTitle(title);
    setVslsAgentDtlsModalTargetField(targetField);
    setVslsAgentDtlsModalValue(String(value || ""));
    vslsAgentDtlsDisclosure.onOpen();
  }, [vslsAgentDtlsDisclosure]);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const clientIdFrom = (v) => (v != null && typeof v === "object" ? v.id : v);
      let client_id;
      let done;
      if (activeFilters.activeClient && activeClientFilter) {
        client_id = clientIdFrom(activeClientFilter);
        done = "active";
      } else if (activeFilters.readyForInvoiceClient && readyForInvoiceClientFilter) {
        client_id = clientIdFrom(readyForInvoiceClientFilter);
        done = "ready_for_invoice";
      } else if (searchClientFilter) {
        client_id = clientIdFrom(searchClientFilter);
      }
      const vesselId = searchVesselFilter != null && typeof searchVesselFilter === "object"
        ? (searchVesselFilter.id ?? searchVesselFilter.value)
        : searchVesselFilter;
      const countryId = searchCountryFilter != null && typeof searchCountryFilter === "object"
        ? (searchCountryFilter.id ?? searchCountryFilter.value)
        : searchCountryFilter;

      const soId = searchQuery && searchQuery.trim() !== "" ? searchQuery.trim() : undefined;

      const data = await getShippingOrders({
        page,
        page_size: pageSize,
        ...(soId != null && soId !== "" && { so_id: soId }),
        ...(client_id != null && client_id !== "" && { client_id, done }),
        ...(vesselId != null && vesselId !== "" && { vessel_id: vesselId }),
        ...(countryId != null && countryId !== "" && { country_id: countryId }),
      });

      const list = Array.isArray(data.orders)
        ? data.orders
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.result)
            ? data.result
            : Array.isArray(data?.data)
              ? data.data
              : [];

      const normalized = list
        .map(normalizeOrder)
        .filter(Boolean)
        .sort((a, b) => (b.id || 0) - (a.id || 0));

      setOrders(normalized);
      setTotalCount(data.total_count || normalized.length);
      setTotalPages(data.total_pages || 1);
      setHasNext(data.has_next || false);
      setHasPrevious(data.has_previous || false);
    } catch (error) {
      console.error("Failed to fetch shipping orders", error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message;
      toast({
        title: "Error",
        description: apiMessage || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setOrders([]);
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
    sortBy,
    sortOrder,
    nextActionSortOption,
    searchQuery,
    activeFilters.activeClient,
    activeFilters.readyForInvoiceClient,
    activeClientFilter,
    readyForInvoiceClientFilter,
    searchClientFilter,
    searchVesselFilter,
    searchCountryFilter,
    toast,
  ]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset to first page when page size, search, or filters change (skip initial mount to preserve persisted page)
  const isFirstResetPageRun = useRef(true);
  useEffect(() => {
    if (isFirstResetPageRun.current) {
      isFirstResetPageRun.current = false;
      return;
    }
    setPage(1);
  }, [
    pageSize,
    searchQuery,
    activeFilters.activeClient,
    activeFilters.readyForInvoiceClient,
    activeClientFilter,
    readyForInvoiceClientFilter,
    searchClientFilter,
    searchVesselFilter,
    searchCountryFilter,
  ]);

  // Search on input change (debounced) – sync searchValue to searchQuery so API is called automatically
  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setSearchQuery(searchValue.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue]);

  // Normalize SO Number search input to numeric so_id (e.g. "SO-123" -> "123")
  const normalizeSoSearch = (value) => {
    if (!value) return "";
    const digits = String(value).replace(/\D/g, "");
    return digits;
  };

  // Handle search button click (immediate, no wait for debounce)
  const handleSearch = () => {
    const normalized = normalizeSoSearch(searchValue);
    setSearchQuery(normalized);
    setPage(1);
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  // Destinations come from master cache (/api/destinations stored) - no fetch here

  // Fetch quotations for searchable quotation field
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setIsLoadingQuotations(true);
        const response = await quotationsAPI.getQuotations();
        const data = response || {};

        const list =
          (Array.isArray(data.quotations) && data.quotations) ||
          (Array.isArray(data.result?.quotations) && data.result.quotations) ||
          [];

        // Normalize to { id, name } for SimpleSearchableSelect
        const normalized = list.map((q) => ({
          id: q.id,
          name: q.oc_number || q.name || `Q-${q.id}`,
        }));

        setQuotations(normalized);
      } catch (error) {
        console.error("Failed to fetch quotations for SO", error);
        setQuotations([]);
      } finally {
        setIsLoadingQuotations(false);
      }
    };

    fetchQuotations();
  }, []);

  // PICs come from cache (useMasterData) - /api/person/incharge/list stored in cache, no repeated calls

  // Initialize default PICs when PICs are loaded
  useEffect(() => {
    if (pics.length > 0) {
      // Find PICs by name (case-insensitive)
      const findPicByName = (name) => {
        return pics.find((p) => p.name && p.name.toLowerCase() === name.toLowerCase());
      };

      // Initialize Active ATH PICs (Amanta, Igor, Tasos)
      if (activeATHPics.length === 0) {
        const amanta = findPicByName("Amanta");
        const igor = findPicByName("Igor");
        const tasos = findPicByName("Tasos");
        const defaultATH = [amanta, igor, tasos]
          .filter(Boolean)
          .map((p) => Number(p.id))
          .filter((id) => !Number.isNaN(id));
        if (defaultATH.length > 0) {
          setActiveATHPics(defaultATH);
        }
      }

      // Initialize Active SIN PICs (Martin)
      if (activeSINPics.length === 0) {
        const martin = findPicByName("Martin");
        if (martin) {
          const martinId = Number(martin.id);
          if (!Number.isNaN(martinId)) {
            setActiveSINPics([martinId]);
          }
        }
      }

      // Initialize ATH Ready for Invoice PICs (Amanta, Igor, Tasos)
      if (athReadyForInvoicePics.length === 0) {
        const amanta = findPicByName("Amanta");
        const igor = findPicByName("Igor");
        const tasos = findPicByName("Tasos");
        const defaultATH = [amanta, igor, tasos]
          .filter(Boolean)
          .map((p) => Number(p.id))
          .filter((id) => !Number.isNaN(id));
        if (defaultATH.length > 0) {
          setAthReadyForInvoicePics(defaultATH);
        }
      }

      // Initialize SIN Ready for Invoice PICs (Martin)
      if (sinReadyForInvoicePics.length === 0) {
        const martin = findPicByName("Martin");
        if (martin) {
          const martinId = Number(martin.id);
          if (!Number.isNaN(martinId)) {
            setSinReadyForInvoicePics([martinId]);
          }
        }
      }
    }
  }, [pics, activeATHPics.length, activeSINPics.length, athReadyForInvoicePics.length, sinReadyForInvoicePics.length]);

  // Helper to get client name for filter labels (filter stores id; list display uses order.client from API)
  const getClientName = useCallback((clientId) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "-";
  }, [clients]);

  const getDestinationName = useCallback((destinationId) => {
    if (!destinationId) return "-";
    const destination = destinations.find((d) => d.id === destinationId);
    return destination ? destination.name : "-";
  }, [destinations]);

  const getCountryName = useCallback((countryId) => {
    if (!countryId) return "-";
    const country = countries.find((c) => c.id === countryId);
    return country ? country.name : "-";
  }, [countries]);

  // Helper to format destination display for table: show country name, destination (code/name), or both when available
  const getDestinationDisplay = useCallback((order) => {
    const countryName = order.country_id ? getCountryName(order.country_id) : "";
    const hasCountry = countryName && countryName !== "-";
    const destFromField = order.destination || "";
    const destFromId = order.destination_id ? getDestinationName(order.destination_id) : "";
    const destDisplay = destFromField || (destFromId !== "-" ? destFromId : "");

    const parts = [];
    if (destDisplay) parts.push(destDisplay);
    if (hasCountry) parts.push(countryName);
    if (parts.length) return parts.join(", ");
    return "-";
  }, [getCountryName, getDestinationName]);

  // Handler functions for filters
  const toggleFilter = (filterName) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        // Toggle direction if same field
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      } else {
        // New field, default to ascending
        return {
          field,
          direction: "asc",
        };
      }
    });
  };

  const openPicFilterModal = (filterType) => {
    setEditingPicFilter(filterType);
    picFilterModalDisclosure.onOpen();
  };

  const handlePicFilterSave = (selectedPicIds) => {
    if (editingPicFilter === "activeATH") {
      setActiveATHPics(selectedPicIds);
    } else if (editingPicFilter === "activeSIN") {
      setActiveSINPics(selectedPicIds);
    } else if (editingPicFilter === "athReadyForInvoice") {
      setAthReadyForInvoicePics(selectedPicIds);
    } else if (editingPicFilter === "sinReadyForInvoice") {
      setSinReadyForInvoicePics(selectedPicIds);
    }
    picFilterModalDisclosure.onClose();
    setEditingPicFilter(null);
  };

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Note: Text search is now handled server-side via searchQuery
    // Client-side search (searchValue) is removed since we use server-side search

    // Helper function to normalize PIC ID for comparison
    const normalizePicId = (picId) => {
      if (picId === null || picId === undefined || picId === false || picId === "") {
        return null;
      }
      // Convert to number for consistent comparison
      const numId = Number(picId);
      return Number.isNaN(numId) ? null : numId;
    };

    // Helper function to extract PIC ID from order (check multiple fields and raw data)
    const extractPicId = (order) => {
      // Try normalized fields first
      let picId = order.pic_new || order.pic_id || order.pic;

      // If not found, check raw order data
      if (!picId && order._raw) {
        picId = order._raw.pic_new || order._raw.pic_id || order._raw.pic;
      }

      // Handle case where pic might be an object with id property
      if (picId && typeof picId === 'object' && picId.id) {
        picId = picId.id;
      }

      // Handle case where pic might be an array (take first element)
      if (Array.isArray(picId) && picId.length > 0) {
        picId = picId[0];
        // If array element is an object, get its id
        if (typeof picId === 'object' && picId.id) {
          picId = picId.id;
        }
      }

      return normalizePicId(picId);
    };

    // Apply Active ATH filter
    if (activeFilters.activeATH && activeATHPics.length > 0) {
      const normalizedFilterPics = activeATHPics.map(id => Number(id));
      filtered = filtered.filter((order) => {
        const orderPicId = extractPicId(order);
        if (orderPicId === null) return false;
        return order.done === "active" && normalizedFilterPics.includes(orderPicId);
      });
    }

    // Apply Active SIN filter
    if (activeFilters.activeSIN && activeSINPics.length > 0) {
      filtered = filtered.filter((order) => {
        const orderPicId = extractPicId(order);
        if (orderPicId === null) return false;
        // Normalize filter PIC IDs and compare
        const normalizedFilterPics = activeSINPics.map(id => Number(id));
        return order.done === "active" && normalizedFilterPics.includes(orderPicId);
      });
    }

    // Apply Active Client filter
    if (activeFilters.activeClient && activeClientFilter) {
      filtered = filtered.filter((order) => {
        return order.done === "active" && order.client_id === activeClientFilter;
      });
    }

    // Apply Ready for Invoice Client filter
    if (activeFilters.readyForInvoiceClient && readyForInvoiceClientFilter) {
      filtered = filtered.filter((order) => {
        return order.done === "ready_for_invoice" && order.client_id === readyForInvoiceClientFilter;
      });
    }

    // Apply ATH Ready for Invoice filter
    if (activeFilters.athReadyForInvoice && athReadyForInvoicePics.length > 0) {
      filtered = filtered.filter((order) => {
        const orderPicId = extractPicId(order);
        if (orderPicId === null) return false;
        // Normalize filter PIC IDs and compare
        const normalizedFilterPics = athReadyForInvoicePics.map(id => Number(id));
        return order.done === "ready_for_invoice" && normalizedFilterPics.includes(orderPicId);
      });
    }

    // Apply SIN Ready for Invoice filter
    if (activeFilters.sinReadyForInvoice && sinReadyForInvoicePics.length > 0) {
      filtered = filtered.filter((order) => {
        const orderPicId = extractPicId(order);
        if (orderPicId === null) return false;
        // Normalize filter PIC IDs and compare
        const normalizedFilterPics = sinReadyForInvoicePics.map(id => Number(id));
        return order.done === "ready_for_invoice" && normalizedFilterPics.includes(orderPicId);
      });
    }

    // Apply Next Action sorting if enabled
    if (nextActionSortOption === 'next_action') {
      filtered.sort((a, b) => {
        // 1st priority: Sort by Next Action date
        // Items with Next Action dates come first (sorted ascending by date)
        // Items without Next Action dates come at the end
        const aHasNextAction = a.next_action && a.next_action !== "";
        const bHasNextAction = b.next_action && b.next_action !== "";

        if (aHasNextAction && !bHasNextAction) {
          return -1; // a comes before b
        }
        if (!aHasNextAction && bHasNextAction) {
          return 1; // b comes before a
        }
        if (aHasNextAction && bHasNextAction) {
          // Both have Next Action dates - sort by date (ascending - earliest first)
          const aDate = new Date(a.next_action);
          const bDate = new Date(b.next_action);
          if (aDate.getTime() !== bDate.getTime()) {
            return aDate.getTime() - bDate.getTime();
          }
        }
        // If Next Action dates are equal, maintain order
        return 0;
      });
    }

    // Apply manual sorting if selected
    if (sortConfig.field && sortConfig.field !== "next_action") {
      filtered.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.field === "so_number") {
          aValue = a.so_number || "";
          bValue = b.so_number || "";
        } else if (sortConfig.field === "date_created") {
          aValue = a.date_created || "";
          bValue = b.date_created || "";
        } else if (sortConfig.field === "client") {
          aValue = a.client || "";
          bValue = b.client || "";
        } else if (sortConfig.field === "vessel_id") {
          aValue = a.vessel_name || "";
          bValue = b.vessel_name || "";
        } else if (sortConfig.field === "pic") {
          aValue = a.pic_name || "";
          bValue = b.pic_name || "";
        } else {
          aValue = a[sortConfig.field] || "";
          bValue = b[sortConfig.field] || "";
        }

        // Convert to strings for comparison
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();

        if (sortConfig.direction === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filtered;
  }, [
    orders,
    activeFilters,
    activeATHPics,
    activeSINPics,
    activeClientFilter,
    readyForInvoiceClientFilter,
    athReadyForInvoicePics,
    sinReadyForInvoicePics,
    sortConfig,
    nextActionSortOption,
    getClientName,
    getDestinationDisplay,
  ]);

  const handleCreate = () => {
    resetForm();
    formDisclosure.onOpen();
  };

  const handleEdit = (order) => {
    history.push(`/admin/shipping-orders/edit/${order.id}`, { order });
  };

  const handleFormClose = (clearDraft = false) => {
    setFormData(null);
    formDisclosure.onClose();
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  const handleFormSubmit = async () => {
    const hasClient = !!formData?.client_id;
    const hasVessel = !!formData?.vessel_id;

    if (!formData || !hasClient || !hasVessel) {
      toast({
        title: "Missing details",
        description: "Client and vessel are required.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSaving(true);

      const payload = buildPayloadFromForm(formData, false);
      await createShippingOrder(payload);
      toast({
        title: "SO created",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      await fetchOrders();
      handleFormClose(true);
    } catch (error) {
      console.error("Failed to save shipping order", error);
      toast({
        title: "Save failed",
        description: error.message || "Unable to save shipping order",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSoNumber = (order) => {
    if (order.so_number) return order.so_number;
    return order.id ? `SO-${order.id}` : "-";
  };

  const getEtaDisplay = (order) => {
    const eta = order.eta_date ? formatDate(order.eta_date) : null;
    return eta || "-";
  };

  const renderTableBody = () => {
    if (isLoading && orders.length === 0) {
      return (
        <Tr>
          <Td colSpan={19}>
            <Center py="10">
              <Spinner size="lg" color="blue.500" />
            </Center>
          </Td>
        </Tr>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <Tr>
          <Td colSpan={19}>
            <Center py="10">
              <Text color={tableTextColor}>No SO records match your filters.</Text>
            </Center>
          </Td>
        </Tr>
      );
    }

    return filteredOrders.map((order) => (
      <Tr
        key={order.id || order.so_number}
        _hover={{ bg: hoverBg }}
      >
        <Td {...tableCellProps}>
          <HStack spacing="2">
            <IconButton
              size="sm"
              aria-label="Edit SO"
              icon={<Icon as={MdEdit} />}
              variant="ghost"
              onClick={() => handleEdit(order)}
            />
          </HStack>
        </Td>
        <Td {...tableCellProps}><Text {...cellText}>{getSoNumber(order)}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.next_action ? formatDate(order.next_action) : "-"}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{formatDateTime(order.create_date || order.date_created || order.date_order)}</Text></Td>
        <Td {...tableCellProps}>
          <Badge
            colorScheme={
              order.done === "active"
                ? "green"
                : order.done === "done"
                  ? "blue"
                  : order.done === "cancelled"
                    ? "red"
                    : order.done === "archive"
                      ? "gray"
                      : order.done === "ready_for_invoice"
                        ? "purple"
                        : "orange"
            }
          >
            {order.done === "pending_pod"
              ? "Pending POD"
              : order.done === "ready_for_invoice"
                ? "Ready for Invoice"
                : order.done === "done"
                  ? "Done"
                  : order.done === "cancelled"
                    ? "Cancelled"
                    : order.done === "archive"
                      ? "Archive"
                      : "Active"}
          </Badge>
        </Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.pic_name || "-"}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.client_code != null && order.client_code !== false && order.client_code !== "" ? String(order.client_code) : (order.client || "-")}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.vessel_name || "-"}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{getDestinationDisplay(order)}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{getEtaDisplay(order)}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.etb && order.etb !== false ? formatDate(order.etb) : "-"}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.etd && order.etd !== false ? formatDate(order.etd) : "-"}</Text></Td>
        <Td {...tableCellProps} maxW="240px">
          <Tooltip label={order.internal_remark || "-"} isDisabled={!order.internal_remark || order.internal_remark === "-"}>
            <Text
              noOfLines={2}
              cursor={order.internal_remark && order.internal_remark !== "-" ? "pointer" : "default"}
              onClick={() => {
                if (order.internal_remark && order.internal_remark !== "-") {
                  openVslsAgentDtlsModal(order.internal_remark, "view", `Internal Remark — ${getSoNumber(order)}`);
                }
              }}
            >
              {order.internal_remark || "-"}
            </Text>
          </Tooltip>
        </Td>
        <Td {...tableCellProps} maxW="240px">
          <Tooltip label={order.vsls_agent_dtls || "-"} isDisabled={!order.vsls_agent_dtls || order.vsls_agent_dtls === "-"}>
            <Text
              noOfLines={2}
              cursor={order.vsls_agent_dtls && order.vsls_agent_dtls !== "-" ? "pointer" : "default"}
              onClick={() => {
                if (order.vsls_agent_dtls && order.vsls_agent_dtls !== "-") {
                  openVslsAgentDtlsModal(order.vsls_agent_dtls, "view", `VSLS Agent Details — ${getSoNumber(order)}`);
                }
              }}
            >
              {order.vsls_agent_dtls || "-"}
            </Text>
          </Tooltip>
        </Td>
        <Td {...tableCellProps} maxW="240px">
          <Tooltip label={order.client_case_invoice_ref || "-"} isDisabled={!order.client_case_invoice_ref || order.client_case_invoice_ref === "-"}>
            <Text noOfLines={2} cursor={order.client_case_invoice_ref && order.client_case_invoice_ref !== "-" ? "help" : "default"}>
              {order.client_case_invoice_ref || "-"}
            </Text>
          </Tooltip>
        </Td>
        <Td {...tableCellProps}><Text {...cellText}>{order.quotation || "-"}</Text></Td>
        <Td {...tableCellProps}><Text {...cellText}>{formatDateTime(order.timestamp || order.date_created)}</Text></Td>
      </Tr>
    ));
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb="4" flexWrap="wrap" gap="3">
        <Text fontSize="lg" fontWeight="700" color={textColor}>
          SO Number Tracker
        </Text>
        <HStack spacing="3">
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none" h="32px" w="30px">
              <Icon as={MdSearch} color={placeholderColor} />
            </InputLeftElement>
            <Input
              placeholder="Search SO Number"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
            {searchValue && (
              <InputRightElement h="32px" w="30px">
                <IconButton
                  aria-label="Clear search"
                  icon={<Icon as={MdClear} />}
                  size="xs"
                  variant="ghost"
                  onClick={handleClearSearch}
                />
              </InputRightElement>
            )}
          </InputGroup>
          {/* <Button
            size="sm"
            leftIcon={<Icon as={MdSearch} />}
            colorScheme="blue"
            onClick={handleSearch}
            isLoading={isLoading}
            px={10}
          >
            Search
          </Button> */}
          {/* {searchQuery && (
            <Button
              size="sm"
              px="6"
              variant="outline"
              onClick={handleClearSearch}
            >
              Clear
            </Button>
          )} */}
          <IconButton
            size="sm"
            icon={<Icon as={MdRefresh} />}
            aria-label="Refresh SO data"
            onClick={handleRefresh}
            isLoading={isLoading}
            variant="outline"
          />
          <Button
            size="sm"
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            onClick={handleCreate}
            px={10}
          >
            New SO
          </Button>
        </HStack>
      </Flex>

      {/* Advanced Filters button and panel */}
      <Box mb="4">
        <Button
          size="sm"
          leftIcon={<Icon as={MdFilterList} />}
          variant={advancedFiltersDisclosure.isOpen ? "solid" : "outline"}
          colorScheme="blue"
          onClick={advancedFiltersDisclosure.onToggle}
          mb={advancedFiltersDisclosure.isOpen ? 3 : 0}
        >
          Advanced Filters
          {(searchClientFilter || searchVesselFilter || searchCountryFilter) && (
            <Badge ml="2" colorScheme="blue" fontSize="xs">
              {(searchClientFilter ? 1 : 0) + (searchVesselFilter ? 1 : 0) + (searchCountryFilter ? 1 : 0)}
            </Badge>
          )}
        </Button>
        <Collapse in={advancedFiltersDisclosure.isOpen} animateOpacity>
          <Flex
            direction="row"
            gap="4"
            p="4"
            bg={tableHeaderBg}
            borderRadius="md"
            border="1px"
            borderColor={borderColor}
            flexWrap="wrap"
          >
            <Box flex="1" minW="200px">
              <FormControl>
                <FormLabel fontSize="xs" mb="1">Search by Client</FormLabel>
                <SimpleSearchableSelect
                  value={searchClientFilter}
                  onChange={setSearchClientFilter}
                  options={clients || []}
                  placeholder="Select Client"
                  displayKey="name"
                  valueKey="id"
                  formatOption={(opt) => opt.name || `Client ${opt.id}`}
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                />
              </FormControl>
            </Box>
            <Box flex="1" minW="200px">
              <FormControl>
                <FormLabel fontSize="xs" mb="1">Search by Vessel</FormLabel>
                <SimpleSearchableSelect
                  value={searchVesselFilter}
                  onChange={setSearchVesselFilter}
                  options={vessels || []}
                  placeholder="Select Vessel"
                  displayKey="name"
                  valueKey="id"
                  formatOption={(opt) => opt.name || `Vessel ${opt.id}`}
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                />
              </FormControl>
            </Box>
            <Box flex="1" minW="200px">
              <FormControl>
                <FormLabel fontSize="xs" mb="1">Search by Country</FormLabel>
                <SimpleSearchableSelect
                  value={searchCountryFilter}
                  onChange={setSearchCountryFilter}
                  options={countries || []}
                  placeholder="Select Country"
                  displayKey="name"
                  valueKey="id"
                  formatOption={(opt) => opt.name || opt.code || `Country ${opt.id}`}
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                />
              </FormControl>
            </Box>
            {(searchClientFilter || searchVesselFilter || searchCountryFilter) && (
              <Button
                size="sm"
                leftIcon={<Icon as={MdClear} />}
                variant="outline"
                colorScheme="gray"
                alignSelf="flex-end"
                onClick={() => {
                  setSearchClientFilter(null);
                  setSearchVesselFilter(null);
                  setSearchCountryFilter(null);
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </Flex>
        </Collapse>
      </Box>

      {/* Filters Section */}
      <Box mb="4">
        <Flex direction="column" gap="3">
          <Wrap spacing="3">
            {/* Active ATH Filter */}
            <WrapItem>
              <Tag
                size="md"
                borderRadius="full"
                variant={activeFilters.activeATH ? "solid" : "outline"}
                colorScheme={activeFilters.activeATH ? "blue" : "gray"}
                cursor="pointer"
                onClick={() => toggleFilter("activeATH")}
              >
                <TagLabel>Active ATH</TagLabel>
                {activeFilters.activeATH && (
                  <IconButton
                    size="xs"
                    aria-label="Configure PICs"
                    icon={<Icon as={MdFilterList} />}
                    variant="ghost"
                    ml="2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPicFilterModal("activeATH");
                    }}
                  />
                )}
                {activeFilters.activeATH && (
                  <TagCloseButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter("activeATH");
                    }}
                  />
                )}
              </Tag>
            </WrapItem>

            {/* Active SIN Filter */}
            <WrapItem>
              <Tag
                size="md"
                borderRadius="full"
                variant={activeFilters.activeSIN ? "solid" : "outline"}
                colorScheme={activeFilters.activeSIN ? "blue" : "gray"}
                cursor="pointer"
                onClick={() => toggleFilter("activeSIN")}
              >
                <TagLabel>Active SIN</TagLabel>
                {activeFilters.activeSIN && (
                  <IconButton
                    size="xs"
                    aria-label="Configure PICs"
                    icon={<Icon as={MdFilterList} />}
                    variant="ghost"
                    ml="2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPicFilterModal("activeSIN");
                    }}
                  />
                )}
                {activeFilters.activeSIN && (
                  <TagCloseButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter("activeSIN");
                    }}
                  />
                )}
              </Tag>
            </WrapItem>

            {/* Active Client Filter */}
            <WrapItem>
              <Tag
                size="md"
                borderRadius="full"
                variant={activeFilters.activeClient ? "solid" : "outline"}
                colorScheme={activeFilters.activeClient ? "blue" : "gray"}
                cursor="pointer"
                onClick={() => toggleFilter("activeClient")}
              >
                <TagLabel>
                  Active Client
                  {activeFilters.activeClient && activeClientFilter && (
                    <Text as="span" ml="2" fontSize="xs">
                      ({getClientName(activeClientFilter)})
                    </Text>
                  )}
                </TagLabel>
                {activeFilters.activeClient && (
                  <TagCloseButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter("activeClient");
                    }}
                  />
                )}
              </Tag>
            </WrapItem>

            {/* Ready for Invoice Client Filter */}
            <WrapItem>
              <Tag
                size="md"
                borderRadius="full"
                variant={activeFilters.readyForInvoiceClient ? "solid" : "outline"}
                colorScheme={activeFilters.readyForInvoiceClient ? "blue" : "gray"}
                cursor="pointer"
                onClick={() => toggleFilter("readyForInvoiceClient")}
              >
                <TagLabel>
                  Ready for Invoice Client
                  {activeFilters.readyForInvoiceClient && readyForInvoiceClientFilter && (
                    <Text as="span" ml="2" fontSize="xs">
                      ({getClientName(readyForInvoiceClientFilter)})
                    </Text>
                  )}
                </TagLabel>
                {activeFilters.readyForInvoiceClient && (
                  <TagCloseButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter("readyForInvoiceClient");
                    }}
                  />
                )}
              </Tag>
            </WrapItem>

            {/* ATH Ready for Invoice Filter */}
            <WrapItem>
              <Tag
                size="md"
                borderRadius="full"
                variant={activeFilters.athReadyForInvoice ? "solid" : "outline"}
                colorScheme={activeFilters.athReadyForInvoice ? "blue" : "gray"}
                cursor="pointer"
                onClick={() => toggleFilter("athReadyForInvoice")}
              >
                <TagLabel>ATH Ready for Invoice</TagLabel>
                {activeFilters.athReadyForInvoice && (
                  <IconButton
                    size="xs"
                    aria-label="Configure PICs"
                    icon={<Icon as={MdFilterList} />}
                    variant="ghost"
                    ml="2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPicFilterModal("athReadyForInvoice");
                    }}
                  />
                )}
                {activeFilters.athReadyForInvoice && (
                  <TagCloseButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter("athReadyForInvoice");
                    }}
                  />
                )}
              </Tag>
            </WrapItem>

            {/* SIN Ready for Invoice Filter */}
            <WrapItem>
              <Tag
                size="md"
                borderRadius="full"
                variant={activeFilters.sinReadyForInvoice ? "solid" : "outline"}
                colorScheme={activeFilters.sinReadyForInvoice ? "blue" : "gray"}
                cursor="pointer"
                onClick={() => toggleFilter("sinReadyForInvoice")}
              >
                <TagLabel>SIN Ready for Invoice</TagLabel>
                {activeFilters.sinReadyForInvoice && (
                  <IconButton
                    size="xs"
                    aria-label="Configure PICs"
                    icon={<Icon as={MdFilterList} />}
                    variant="ghost"
                    ml="2"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPicFilterModal("sinReadyForInvoice");
                    }}
                  />
                )}
                {activeFilters.sinReadyForInvoice && (
                  <TagCloseButton
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFilter("sinReadyForInvoice");
                    }}
                  />
                )}
              </Tag>
            </WrapItem>
          </Wrap>

          {/* Sorting Section */}
          <Box mt="4">
            <Flex align="center" gap="4">
              <Text fontSize="sm" fontWeight="medium" color={textColor}>
                Sorting:
              </Text>
              <Menu>
                <MenuButton
                  as={Button}
                  rightIcon={<Icon as={MdArrowDownward} />}
                  size="sm"
                  variant="outline"
                  colorScheme={nextActionSortOption === 'next_action' ? 'blue' : 'gray'}
                >
                  {nextActionSortOption === 'next_action'
                    ? 'Sort by Next Action'
                    : 'No Sort'}
                </MenuButton>
                <MenuList>
                  <MenuItem
                    onClick={() => setNextActionSortOption('none')}
                    bg={nextActionSortOption === 'none' ? 'blue.50' : 'transparent'}
                  >
                    No Sort
                  </MenuItem>
                  <MenuItem
                    onClick={() => setNextActionSortOption('next_action')}
                    bg={nextActionSortOption === 'next_action' ? 'blue.50' : 'transparent'}
                  >
                    Sort by Next Action
                  </MenuItem>
                </MenuList>
              </Menu>
              {nextActionSortOption === 'next_action' && (
                <Box
                  p="2"
                  bg="blue.50"
                  borderRadius="md"
                  fontSize="xs"
                  color="blue.700"
                  maxW="400px"
                >
                  <Text fontWeight="medium">Sorting Order:</Text>
                  <Text>1st priority: Items with Next Action dates (sorted ascending)</Text>
                  <Text>2nd priority: Items without Next Action dates (at the end)</Text>
                </Box>
              )}
            </Flex>
          </Box>

          {/* Client Selection for Active and Ready for Invoice Client filters */}
          {(activeFilters.activeClient || activeFilters.readyForInvoiceClient) && (
            <Box>
              <SimpleSearchableSelect
                value={activeFilters.activeClient ? activeClientFilter : readyForInvoiceClientFilter}
                onChange={(value) => {
                  if (activeFilters.activeClient) {
                    setActiveClientFilter(value);
                  } else {
                    setReadyForInvoiceClientFilter(value);
                  }
                }}
                options={clients}
                placeholder="Select client"
                displayKey="name"
                valueKey="id"
                isLoading={false}
                bg={inputBg}
                color={inputText}
                borderColor={borderColor}
                size="sm"
                maxW="300px"
              />
            </Box>
          )}
        </Flex>
      </Box>

      <Box
        border="1px"
        borderColor={borderColor}
        borderRadius="12px"
        maxH="600px"
        overflowX="auto"
        overflowY="auto"
        sx={{
          "&::-webkit-scrollbar": { width: "8px", height: "8px" },
          "&::-webkit-scrollbar-track": { background: "gray.100", borderRadius: "4px" },
          "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
          "&::-webkit-scrollbar-thumb:hover": { background: "gray.400" },
        }}
      >
        <Table size="sm" variant="simple" minW="1400px">
          <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={1}>
            <Tr>
              {[
                { label: "Actions", field: null, sortable: false },
                { label: "SO Number", field: "so_number", sortable: true },
                { label: "Next Action", field: "next_action", sortable: true },
                { label: "Date Created", field: "date_created", sortable: true },
                { label: "Status", field: "done", sortable: false },
                { label: "Person in Charge", field: "pic", sortable: true },
                { label: "Client Code", field: "client", sortable: true },
                { label: "Vessel Name", field: "vessel_name", sortable: false },
                { label: "Destination", field: "destination", sortable: false },
                { label: "ETA", field: "eta_date", sortable: false },
                { label: "ETB", field: "etb", sortable: false },
                { label: "ETD", field: "etd", sortable: false },
                { label: "Internal Remark", field: "internal_remark", sortable: false },
                { label: "VSLS Agent Details", field: "vsls_agent_dtls", sortable: false },
                { label: "Client Case Invoice Ref", field: "client_case_invoice_ref", sortable: false },
                { label: "Quotation", field: "quotation", sortable: false },
                { label: "SOCreateDate Timestamp", field: "timestamp", sortable: false },
              ].map((col) => (
                <Th
                  key={col.label}
                  borderRight="1px"
                  borderColor={tableBorderColor}
                  fontSize="12px"
                  textTransform="uppercase"
                  fontWeight="bold"
                  py="10px"
                  px="12px"
                  minW="130px"
                  style={{ color: "#000000d4" }}
                  cursor={col.sortable ? "pointer" : "default"}
                  onClick={col.sortable ? () => handleSort(col.field) : undefined}
                  _hover={col.sortable ? { bg: hoverBg } : {}}
                  position="relative"
                  {...tableHeaderCellProps}
                >
                  <Flex align="center" gap="2">
                    <Text>{col.label}</Text>
                    {col.sortable && sortConfig.field === col.field && (
                      <Icon
                        as={sortConfig.direction === "asc" ? MdArrowUpward : MdArrowDownward}
                        fontSize="14px"
                      />
                    )}
                  </Flex>
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>{renderTableBody()}</Tbody>
        </Table>
      </Box>

      {/* Pagination Controls */}
      <Box px="25px">
        <Flex justify="space-between" align="center" py={4} flexWrap="wrap" gap={4}>
          <HStack spacing={3}>
            <Text fontSize="sm" color="gray.600">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount)} of {totalCount} records
            </Text>
          </HStack>

          {/* Pagination buttons */}
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(1)}
              isDisabled={!hasPrevious || page === 1}
            >
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

            {/* Page numbers */}
            <HStack spacing={1}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

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
            </HStack>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page + 1)}
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
        </Flex>
      </Box>

      <Modal isOpen={formDisclosure.isOpen} onClose={handleFormClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create SO</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formData && (
              <ShippingOrderFormFields
                formData={formData}
                setFormData={setFormData}
                isEditMode={false}
                clients={clients}
                vessels={vessels}
                countries={countries}
                pics={pics}
                quotations={quotations}
                isLoadingQuotations={isLoadingQuotations}
                onOpenVslsAgentDtlsModal={openVslsAgentDtlsModal}
                showVesselDbLink
              />
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={handleFormClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleFormSubmit} isLoading={isSaving}>
              Create SO
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Large text modal (VSLS Agent Details + other long fields) */}
      <Modal
        isOpen={vslsAgentDtlsDisclosure.isOpen}
        onClose={() => {
          vslsAgentDtlsDisclosure.onClose();
          setVslsAgentDtlsModalTargetField(null);
        }}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{vslsAgentDtlsModalTitle}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Textarea
              value={vslsAgentDtlsModalValue}
              onChange={(e) => {
                if (vslsAgentDtlsModalMode === "edit") {
                  setVslsAgentDtlsModalValue(e.target.value);
                }
              }}
              onPaste={(e) => {
                if (vslsAgentDtlsModalMode === "edit") {
                  e.preventDefault();
                  const pastedText = e.clipboardData.getData('text');
                  // Normalize line breaks: convert all line break types to single LF
                  // This prevents CRLF (\r\n) from creating double line breaks
                  const normalizedText = pastedText
                    .replace(/\r\n/g, '\n')  // Convert Windows line breaks (CRLF) to single LF
                    .replace(/\r/g, '\n');  // Convert old Mac line breaks (CR) to LF

                  // Get current cursor position
                  const textarea = e.target;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const currentValue = vslsAgentDtlsModalValue;

                  // Insert normalized text at cursor position
                  const newValue = currentValue.substring(0, start) + normalizedText + currentValue.substring(end);

                  setVslsAgentDtlsModalValue(newValue);

                  // Set cursor position after pasted text
                  setTimeout(() => {
                    textarea.selectionStart = textarea.selectionEnd = start + normalizedText.length;
                  }, 0);
                }
              }}
              isReadOnly={vslsAgentDtlsModalMode !== "edit"}
              rows={16}
              resize="vertical"
              placeholder="Enter details..."
            />
          </ModalBody>
          <ModalFooter>
            {/* Copy button - available in both view and edit modes */}
            <Button
              leftIcon={<Icon as={MdContentCopy} />}
              variant="outline"
              mr={3}
              onClick={async () => {
                try {
                  if (vslsAgentDtlsModalValue && vslsAgentDtlsModalValue.trim() !== "") {
                    await navigator.clipboard.writeText(vslsAgentDtlsModalValue);
                    toast({
                      title: "Copied to clipboard",
                      description: "VSLS Agent Details copied to clipboard",
                      status: "success",
                      duration: 2000,
                      isClosable: true,
                    });
                  } else {
                    toast({
                      title: "Nothing to copy",
                      description: "The field is empty",
                      status: "warning",
                      duration: 2000,
                      isClosable: true,
                    });
                  }
                } catch (err) {
                  console.error("Failed to copy:", err);
                  toast({
                    title: "Copy failed",
                    description: "Unable to copy to clipboard. Please try again.",
                    status: "error",
                    duration: 2000,
                    isClosable: true,
                  });
                }
              }}
            >
              Copy
            </Button>
            {vslsAgentDtlsModalMode === "edit" && (
              <Button
                colorScheme="blue"
                mr={3}
                onClick={async () => {
                  if (vslsAgentDtlsModalTargetField && formData) {
                    setFormData((prev) => ({
                      ...prev,
                      [vslsAgentDtlsModalTargetField]: vslsAgentDtlsModalValue,
                    }));
                  }

                  // Copy to clipboard when saving
                  try {
                    if (vslsAgentDtlsModalValue && vslsAgentDtlsModalValue.trim() !== "") {
                      await navigator.clipboard.writeText(vslsAgentDtlsModalValue);
                      toast({
                        title: "Saved and copied",
                        description: "VSLS Agent Details saved and copied to clipboard",
                        status: "success",
                        duration: 2000,
                        isClosable: true,
                      });
                    }
                  } catch (err) {
                    console.error("Failed to copy:", err);
                    // Still show success for save, but warn about copy failure
                    toast({
                      title: "Saved",
                      description: "VSLS Agent Details saved (copy to clipboard failed)",
                      status: "warning",
                      duration: 2000,
                      isClosable: true,
                    });
                  }

                  vslsAgentDtlsDisclosure.onClose();
                  setVslsAgentDtlsModalTargetField(null);
                }}
              >
                Save
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                vslsAgentDtlsDisclosure.onClose();
                setVslsAgentDtlsModalTargetField(null);
              }}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* PIC Filter Selection Modal */}
      <Modal isOpen={picFilterModalDisclosure.isOpen} onClose={picFilterModalDisclosure.onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingPicFilter === "activeATH" && "Active ATH - Select PICs"}
            {editingPicFilter === "activeSIN" && "Active SIN - Select PICs"}
            {editingPicFilter === "athReadyForInvoice" && "ATH Ready for Invoice - Select PICs"}
            {editingPicFilter === "sinReadyForInvoice" && "SIN Ready for Invoice - Select PICs"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing="4" align="stretch">
              <Text fontSize="sm" color={tableTextColor}>
                Select Person in Charge (PIC) names to filter:
              </Text>
              <CheckboxGroup
                value={
                  (editingPicFilter === "activeATH"
                    ? activeATHPics
                    : editingPicFilter === "activeSIN"
                      ? activeSINPics
                      : editingPicFilter === "athReadyForInvoice"
                        ? athReadyForInvoicePics
                        : editingPicFilter === "sinReadyForInvoice"
                          ? sinReadyForInvoicePics
                          : []
                  ).map((id) => String(id))
                }
                onChange={(values) => {
                  const picIds = values.map((v) => Number(v));
                  if (editingPicFilter === "activeATH") {
                    setActiveATHPics(picIds);
                  } else if (editingPicFilter === "activeSIN") {
                    setActiveSINPics(picIds);
                  } else if (editingPicFilter === "athReadyForInvoice") {
                    setAthReadyForInvoicePics(picIds);
                  } else if (editingPicFilter === "sinReadyForInvoice") {
                    setSinReadyForInvoicePics(picIds);
                  }
                }}
              >
                <VStack spacing="2" align="stretch" maxH="400px" overflowY="auto">
                  {pics.map((pic) => (
                    <Checkbox
                      key={pic.id}
                      value={String(pic.id)}
                      colorScheme="blue"
                    >
                      {pic.name}
                    </Checkbox>
                  ))}
                </VStack>
              </CheckboxGroup>
              {pics.length === 0 && (
                <Text fontSize="sm" color="gray.500" textAlign="center" py="4">
                  No PICs available
                </Text>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" mr={3} onClick={picFilterModalDisclosure.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SoNumberTab;

