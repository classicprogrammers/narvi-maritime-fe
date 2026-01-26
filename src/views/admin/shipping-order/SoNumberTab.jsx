import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdRefresh,
  MdSearch,
  MdClose,
  MdArrowUpward,
  MdArrowDownward,
  MdFilterList,
  MdClear,
} from "react-icons/md";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import {
  getCustomersForSelect,
  getVesselsForSelect,
  getDestinationsForSelect,
} from "../../../api/entitySelects";
import quotationsAPI from "../../../api/quotations";
import picAPI from "../../../api/pic";
import countriesAPI from "../../../api/countries";
import {
  getShippingOrders,
  createShippingOrder,
  updateShippingOrder,
  deleteShippingOrder,
} from "../../../api/shippingOrders";

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

function toDateOnly(dateStr) {
  if (!dateStr) return "";
  // Extract just the date part (YYYY-MM-DD) if dateStr contains time
  // If it's already in YYYY-MM-DD format, return as-is
  return String(dateStr).split(" ")[0];
}

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

const SoNumberTab = () => {
  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const hoverBg = useColorModeValue("gray.100", "gray.600");

  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Search state
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(80);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [formData, setFormData] = useState(null);
  const [clients, setClients] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [pics, setPics] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingVessels, setIsLoadingVessels] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [isLoadingPICs, setIsLoadingPICs] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

  const formDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();
  const picFilterModalDisclosure = useDisclosure();
  const vslsAgentDtlsDisclosure = useDisclosure();

  // VSLS Agent Details modal state (used for both edit + view)
  const [vslsAgentDtlsModalValue, setVslsAgentDtlsModalValue] = useState("");
  const [vslsAgentDtlsModalMode, setVslsAgentDtlsModalMode] = useState("view"); // 'view' | 'edit'
  const [vslsAgentDtlsModalTitle, setVslsAgentDtlsModalTitle] = useState("VSLS Agent Details");
  const [vslsAgentDtlsModalTargetField, setVslsAgentDtlsModalTargetField] = useState(null); // e.g. 'vsls_agent_dtls'

  // Filter states
  const [activeFilters, setActiveFilters] = useState({
    activeATH: false,
    activeSIN: false,
    activeClient: false,
    readyForInvoiceClient: false,
    athReadyForInvoice: false,
    sinReadyForInvoice: false,
  });

  // PIC filter states - store PIC IDs
  const [activeATHPics, setActiveATHPics] = useState([]); // Default: Amanta, Igor, Tasos
  const [activeSINPics, setActiveSINPics] = useState([]); // Default: Martin
  const [athReadyForInvoicePics, setAthReadyForInvoicePics] = useState([]); // Default: Amanta, Igor, Tasos
  const [sinReadyForInvoicePics, setSinReadyForInvoicePics] = useState([]); // Default: Martin

  // Client filter states
  const [activeClientFilter, setActiveClientFilter] = useState(null);
  const [readyForInvoiceClientFilter, setReadyForInvoiceClientFilter] = useState(null);

  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: 'asc', // 'asc' or 'desc'
  });

  // Next Action sorting option
  const [nextActionSortOption, setNextActionSortOption] = useState(() => {
    const saved = sessionStorage.getItem('soNextActionSortOption');
    return saved || 'none'; // 'none' or 'next_action'
  });

  // Current PIC filter being edited
  const [editingPicFilter, setEditingPicFilter] = useState(null); // 'activeATH', 'activeSIN', 'athReadyForInvoice', 'sinReadyForInvoice'

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

  // Normalize backend data into the shape the table expects
  const normalizeOrder = (order) => {
    if (!order) return null;
    // Use original created date from API response (date_created or date_order), but
    // trim to YYYY-MM-DD for the date input in the form.
    const rawCreated = order.date_created || order.date_order || order.create_date;
    const createdDateOnly = rawCreated ? String(rawCreated).split(" ")[0] : "";

    return {
      id: order.id,
      so_number: order.so_number || order.name || (order.id ? `SO-${order.id}` : ""),
      date_created: createdDateOnly,
      // Keep backend value as-is if present, otherwise default to "active"
      done:
        typeof order.done === "string"
          ? order.done
          : order.done === true
            ? "active"
            : "active",
      pic_new: order.pic_new || order.pic_id || order.pic || null,
      pic_name: order.pic_name || order.pic || "",
      client: order.client || order.client_name || "",
      client_id: order.client_id || order.partner_id || null,
      vessel_name: order.vessel_name || order.vessel || "",
      vessel_id: order.vessel_id || null,
      destination_type: order.destination_type || "",
      destination: order.destination || order.destination_name || "",
      country_id: order.country_id || null,
      destination_id: order.destination_id || null, // legacy field
      eta_date: order.eta_date,
      etb: order.etb,
      etd: order.etd,
      next_action: order.next_action ? toDateOnly(String(order.next_action)) : "",
      internal_remark: order.internal_remark,
      client_case_invoice_ref: order.client_case_invoice_ref,
      vsls_agent_dtls: order.vsls_agent_dtls || order.vsls_agent_details || "",
      quotation: order.quotation || order.quotation_name || order.quotation_oc_number || "",
      quotation_id: order.quotation_id && order.quotation_id !== false ? order.quotation_id : null,
      timestamp: order.timestamp || order.so_create_date || order.date_order,
      _raw: order,
    };
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
      const data = await getShippingOrders({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search: searchQuery,
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
  }, [page, pageSize, sortBy, sortOrder, searchQuery, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Reset to first page when page size or search changes
  useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery]);

  // Handle search button click
  const handleSearch = () => {
    setSearchQuery(searchValue.trim());
    setPage(1); // Reset to first page when searching
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

  // Fetch lookup data for client, vessel, destination selects
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        setIsLoadingClients(true);
        setIsLoadingVessels(true);
        setIsLoadingDestinations(true);

        const [clientsData, vesselsData, destinationsData] = await Promise.all([
          getCustomersForSelect().catch(() => []),
          getVesselsForSelect().catch(() => []),
          getDestinationsForSelect().catch(() => []),
        ]);

        setClients(clientsData || []);
        setVessels(vesselsData || []);
        setDestinations(destinationsData || []);
      } catch (error) {
        console.error("Failed to fetch SO lookups", error);
        toast({
          title: "Lookup load failed",
          description: "Unable to load clients / vessels / destinations",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      } finally {
        setIsLoadingClients(false);
        setIsLoadingVessels(false);
        setIsLoadingDestinations(false);
      }
    };

    fetchLookups();
  }, [toast]);

  // Persist Next Action sort option to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('soNextActionSortOption', nextActionSortOption);
  }, [nextActionSortOption]);

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

  // Fetch PICs for Person in Charge field
  useEffect(() => {
    const fetchPICs = async () => {
      try {
        setIsLoadingPICs(true);
        const response = await picAPI.getPICs();

        // Handle API response format: { status: "success", count: 1, persons: [...] }
        let picList = [];
        if (response && response.persons && Array.isArray(response.persons)) {
          picList = response.persons;
        } else if (response.result && response.result.persons && Array.isArray(response.result.persons)) {
          picList = response.result.persons;
        } else if (Array.isArray(response)) {
          picList = response;
        }

        // Normalize PICs for the dropdown
        const normalizedPICs = picList.map((pic) => ({
          id: pic.id,
          name: pic.name || "",
        }));

        setPics(normalizedPICs);
      } catch (error) {
        console.error("Failed to fetch PICs for PIC field", error);
        setPics([]);
      } finally {
        setIsLoadingPICs(false);
      }
    };

    fetchPICs();
  }, []);

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

  // Fetch countries for destination country dropdown
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const response = await countriesAPI.getCountries();

        // Normalize countries response
        const countriesList =
          Array.isArray(response?.countries) ? response.countries :
            Array.isArray(response?.result?.countries) ? response.result.countries :
              Array.isArray(response) ? response : [];

        const normalized = countriesList.map((c) => ({
          id: c.id,
          name: c.name || "",
          code: c.code || "",
        }));

        setCountries(normalized);
      } catch (error) {
        console.error("Failed to fetch countries for destination", error);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Helper functions to get names from IDs
  const getClientName = useCallback((clientId) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "-";
  }, [clients]);

  const getClientCode = useCallback((clientId) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client ? (client.client_code || client.code || "-") : "-";
  }, [clients]);

  const getVesselName = useCallback((vesselId) => {
    if (!vesselId) return "-";
    const vessel = vessels.find((v) => v.id === vesselId);
    return vessel ? vessel.name : "-";
  }, [vessels]);

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

  // Helper to format destination display for table
  const getDestinationDisplay = useCallback((order) => {
    if (order.destination_type && order.destination) {
      const countryName = order.country_id ? getCountryName(order.country_id) : "";
      if (order.destination_type === "country") {
        return order.destination;
      } else if (countryName && countryName !== "-") {
        return `${order.destination}, ${countryName}`;
      }
      return order.destination;
    }
    // Fallback to legacy destination_id
    if (order.destination_id) {
      return getDestinationName(order.destination_id);
    }
    return "-";
  }, [getCountryName, getDestinationName]);

  const getPICName = useCallback((picId) => {
    if (!picId) return "-";
    const pic = pics.find((p) => p.id === picId);
    return pic ? pic.name : "-";
  }, [pics]);

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
          aValue = getClientCode(a.client_id);
          bValue = getClientCode(b.client_id);
        } else if (sortConfig.field === "pic") {
          aValue = getPICName(a.pic_new) || a.pic_name || "";
          bValue = getPICName(b.pic_new) || b.pic_name || "";
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
    getClientCode,
    getVesselName,
    getDestinationDisplay,
    getPICName,
  ]);

  const handleCreate = () => {
    setEditingOrder(null);
    resetForm();
    formDisclosure.onOpen();
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({ ...order });
    formDisclosure.onOpen();
  };

  const handleFormClose = () => {
    setEditingOrder(null);
    setFormData(null);
    formDisclosure.onClose();
  };

  const handleDeleteRequest = (order) => {
    setOrderToDelete(order);
    deleteDisclosure.onOpen();
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      await deleteShippingOrder(orderToDelete.id);
      toast({
        title: "Order deleted",
        description: `${orderToDelete.so_number || "SO"} has been removed`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await fetchOrders();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err?.message || "Unable to delete sales order",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      deleteDisclosure.onClose();
      setOrderToDelete(null);
    }
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  const buildPayloadFromForm = (data, isUpdate = false, originalData = {}) => {
    const toNumber = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const num = Number(v);
      return Number.isNaN(num) ? null : num;
    };

    const toDateTime = (dateStr) => {
      if (!dateStr) return null;
      // Backend expects "YYYY-MM-DD 00:00:00" format (used for date_order & eta_date)
      return `${dateStr} 00:00:00`;
    };

    // Helper function to check if a value has actually changed
    const hasChanged = (newValue, oldValue) => {
      // Normalize values for comparison
      const normalize = (val) => {
        if (val === null || val === undefined || val === "" || val === false) return null;
        if (typeof val === 'string') return val.trim();
        return val;
      };

      const normalizedNew = normalize(newValue);
      const normalizedOld = normalize(oldValue);

      // Both are null/empty - no change
      if (normalizedNew === null && normalizedOld === null) return false;

      // One is null, other is not - changed
      if (normalizedNew === null || normalizedOld === null) {
        return normalizedNew !== normalizedOld;
      }

      // For strings, compare trimmed values
      if (typeof normalizedNew === 'string' && typeof normalizedOld === 'string') {
        return normalizedNew !== normalizedOld;
      }

      // For numbers, compare values
      if (typeof normalizedNew === 'number' && typeof normalizedOld === 'number') {
        return normalizedNew !== normalizedOld;
      }

      // Default comparison
      return normalizedNew !== normalizedOld;
    };

    // Helper to check if value is non-empty (for create)
    const hasValue = (value) => {
      if (value === null || value === undefined || value === "") return false;
      if (value === false) return false; // false is considered empty for dates
      return true;
    };

    const payload = {};

    // For update, only include changed fields
    if (isUpdate) {
      // Core identifiers - only include if changed
      if (data.so_number) {
        const originalSoNumber = originalData.so_number || originalData.name;
        if (hasChanged(data.so_number, originalSoNumber)) {
          payload.name = data.so_number;
          payload.so_number = data.so_number;
        }
      }

      // Helper to normalize original date values for comparison
      const normalizeOriginalDate = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string') {
          // Extract just the date part (YYYY-MM-DD) for comparison
          return dateValue.split(' ')[0];
        }
        return dateValue;
      };

      // Helper to normalize original datetime values for comparison
      const normalizeOriginalDateTime = (dateValue) => {
        if (!dateValue) return null;
        if (typeof dateValue === 'string') {
          // Extract just the date part (YYYY-MM-DD) for comparison
          return dateValue.split(' ')[0];
        }
        return dateValue;
      };

      // Check each field for changes
      const fields = [
        { 
          key: 'client_id', 
          value: data.client_id || null,
          originalValue: originalData.client_id || null
        },
        { 
          key: 'vessel_id', 
          value: data.vessel_id || null,
          originalValue: originalData.vessel_id || null
        },
        { 
          key: 'destination_type', 
          value: data.destination_type || null,
          originalValue: originalData.destination_type || null
        },
        { 
          key: 'destination', 
          value: data.destination || null,
          originalValue: originalData.destination || null
        },
        { 
          key: 'country_id', 
          value: data.country_id || null,
          originalValue: originalData.country_id || null
        },
        { 
          key: 'destination_id', 
          value: data.destination_id || null,
          originalValue: originalData.destination_id || null
        },
        { 
          key: 'done', 
          value: data.done || "active",
          originalValue: originalData.done || null
        },
        { 
          key: 'pic_new', 
          value: data.pic_new || null,
          originalValue: originalData.pic_new || null
        },
        { 
          key: 'quotation_id', 
          value: data.quotation_id === null || data.quotation_id === undefined ? "" : data.quotation_id,
          originalValue: originalData.quotation_id === null || originalData.quotation_id === undefined ? "" : originalData.quotation_id
        },
        { 
          key: 'eta_date', 
          value: toDateTime(data.eta_date),
          originalValue: normalizeOriginalDateTime(originalData.eta_date),
          compareValue: data.eta_date ? data.eta_date.split(' ')[0] : null
        },
        { 
          key: 'etb', 
          value: data.etb && data.etb !== false ? toDateOnly(data.etb) : false,
          originalValue: normalizeOriginalDate(originalData.etb),
          compareValue: data.etb && data.etb !== false ? toDateOnly(data.etb) : null
        },
        { 
          key: 'etd', 
          value: data.etd && data.etd !== false ? toDateOnly(data.etd) : false,
          originalValue: normalizeOriginalDate(originalData.etd),
          compareValue: data.etd && data.etd !== false ? toDateOnly(data.etd) : null
        },
        { 
          key: 'date_order', 
          value: toDateTime(data.date_created || data.date_order),
          originalValue: normalizeOriginalDateTime(originalData.date_order || originalData.date_created),
          compareValue: data.date_created || data.date_order ? (data.date_created || data.date_order).split(' ')[0] : null
        },
        { 
          key: 'next_action', 
          value: data.next_action ? toDateOnly(data.next_action) : null,
          originalValue: normalizeOriginalDate(originalData.next_action),
          compareValue: data.next_action ? toDateOnly(data.next_action) : null
        },
        { 
          key: 'internal_remark', 
          value: data.internal_remark || null,
          originalValue: originalData.internal_remark || null
        },
        { 
          key: 'client_case_invoice_ref', 
          value: data.client_case_invoice_ref || null,
          originalValue: originalData.client_case_invoice_ref || null
        },
        {
          key: 'vsls_agent_dtls',
          value: data.vsls_agent_dtls || null,
          originalValue: originalData.vsls_agent_dtls || null
        },
      ];

      fields.forEach(({ key, value, originalValue, compareValue }) => {
        // Use compareValue if provided (for dates), otherwise use value
        const newValueToCompare = compareValue !== undefined ? compareValue : value;
        if (hasChanged(newValueToCompare, originalValue)) {
          // Only include the field if it has a non-null value
          // For dates, false is considered empty
          if (value !== null && value !== undefined && value !== "" && value !== false) {
            payload[key] = value;
          }
          // Special handling for quotation_id - empty string is valid
          else if (key === 'quotation_id' && value === "") {
            payload[key] = "";
          }
        }
      });

      return payload;
    }

    // For create, only include fields with actual values
    if (data.so_number) {
      payload.name = data.so_number;
      payload.so_number = data.so_number;
    }

    if (hasValue(data.client_id)) payload.client_id = data.client_id;
    if (hasValue(data.vessel_id)) payload.vessel_id = data.vessel_id;
    if (hasValue(data.destination_type)) payload.destination_type = data.destination_type;
    if (hasValue(data.destination)) payload.destination = data.destination;
    if (hasValue(data.country_id)) payload.country_id = data.country_id;
    if (hasValue(data.destination_id)) payload.destination_id = data.destination_id;
    if (hasValue(data.done)) payload.done = data.done || "active";
    if (hasValue(data.pic_new)) payload.pic_new = data.pic_new;
    if (data.quotation_id !== null && data.quotation_id !== undefined) {
      payload.quotation_id = data.quotation_id;
    }
    
    const etaDate = toDateTime(data.eta_date);
    if (hasValue(etaDate)) payload.eta_date = etaDate;
    
    const etbDate = data.etb && data.etb !== false ? toDateOnly(data.etb) : false;
    if (hasValue(etbDate)) payload.etb = etbDate;
    
    const etdDate = data.etd && data.etd !== false ? toDateOnly(data.etd) : false;
    if (hasValue(etdDate)) payload.etd = etdDate;
    
    const dateOrder = toDateTime(data.date_created || data.date_order);
    if (hasValue(dateOrder)) payload.date_order = dateOrder;
    
    if (hasValue(data.next_action)) payload.next_action = toDateOnly(data.next_action);
    if (hasValue(data.internal_remark)) payload.internal_remark = data.internal_remark;
    if (hasValue(data.client_case_invoice_ref)) payload.client_case_invoice_ref = data.client_case_invoice_ref;
    if (hasValue(data.vsls_agent_dtls)) payload.vsls_agent_dtls = data.vsls_agent_dtls;

    return payload;
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

      if (editingOrder) {
        const payload = buildPayloadFromForm(formData, true, editingOrder._raw || {});
        await updateShippingOrder(editingOrder.id, payload, editingOrder._raw || {});
        toast({
          title: "SO updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const payload = buildPayloadFromForm(formData, false);
        await createShippingOrder(payload);
        toast({
          title: "SO created",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      await fetchOrders();
      handleFormClose();
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
      <Tr key={order.id || order.so_number}>
        <Td>{getSoNumber(order)}</Td>
        <Td>{formatDateTime(order.create_date || order.date_created || order.date_order)}</Td>
        <Td>
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
        <Td>{getPICName(order.pic_new) || order.pic_name || "-"}</Td>
        <Td>{getClientCode(order.client_id)}</Td>
        <Td>{getVesselName(order.vessel_id)}</Td>
        <Td>{getDestinationDisplay(order)}</Td>
        <Td>{order.next_action ? formatDate(order.next_action) : "-"}</Td>
        <Td>{getEtaDisplay(order)}</Td>
        <Td>{order.etb && order.etb !== false ? formatDate(order.etb) : "-"}</Td>
        <Td>{order.etd && order.etd !== false ? formatDate(order.etd) : "-"}</Td>
        <Td maxW="200px">
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
        <Td maxW="200px">
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
        <Td maxW="200px">
          <Tooltip label={order.client_case_invoice_ref || "-"} isDisabled={!order.client_case_invoice_ref || order.client_case_invoice_ref === "-"}>
            <Text noOfLines={2} cursor={order.client_case_invoice_ref && order.client_case_invoice_ref !== "-" ? "help" : "default"}>
              {order.client_case_invoice_ref || "-"}
            </Text>
          </Tooltip>
        </Td>
        <Td>{order.quotation || "-"}</Td>
        <Td>{formatDateTime(order.timestamp || order.date_created)}</Td>
        <Td>
          <HStack spacing="2">
            <IconButton
              size="sm"
              aria-label="Edit SO"
              icon={<Icon as={MdEdit} />}
              variant="ghost"
              onClick={() => handleEdit(order)}
            />
            <IconButton
              size="sm"
              aria-label="Delete SO"
              icon={<Icon as={MdDelete} />}
              variant="ghost"
              colorScheme="red"
              onClick={() => handleDeleteRequest(order)}
            />
          </HStack>
        </Td>
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
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={placeholderColor} />
            </InputLeftElement>
            <Input
              placeholder="Search SO, client, vessel..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
            {searchValue && (
              <InputRightElement>
                <IconButton
                  aria-label="Clear search"
                  icon={<Icon as={MdClear} />}
                  size="xs"
                  variant="ghost"
                  onClick={handleClearSearch}
                  h="1.5rem"
                  w="1.5rem"
                />
              </InputRightElement>
            )}
          </InputGroup>
          <Button
            size="sm"
            leftIcon={<Icon as={MdSearch} />}
            colorScheme="blue"
            onClick={handleSearch}
            isLoading={isLoading}
          >
            Search
          </Button>
          {searchQuery && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearSearch}
            >
              Clear
            </Button>
          )}
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
            px={6}
          >
            New SO
          </Button>
        </HStack>
      </Flex>

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
                isLoading={isLoadingClients}
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
        overflowX="auto"
      >
        <Table size="sm" variant="simple" minW="1400px">
          <Thead bg={tableHeaderBg}>
            <Tr>
              {[
                { label: "SO Number", field: "so_number", sortable: true },
                { label: "Date Created", field: "date_created", sortable: true },
                { label: "Status", field: "done", sortable: false },
                { label: "Person in Charge", field: "pic", sortable: true },
                { label: "Client Code", field: "client", sortable: true },
                { label: "Vessel Name", field: "vessel_name", sortable: false },
                { label: "Destination", field: "destination", sortable: false },
                { label: "Next Action", field: "next_action", sortable: true },
                { label: "ETA", field: "eta_date", sortable: false },
                { label: "ETB", field: "etb", sortable: false },
                { label: "ETD", field: "etd", sortable: false },
                { label: "Internal Remark", field: "internal_remark", sortable: false },
                { label: "VSLS Agent Details", field: "vsls_agent_dtls", sortable: false },
                { label: "Client Case Invoice Ref", field: "client_case_invoice_ref", sortable: false },
                { label: "Quotation", field: "quotation", sortable: false },
                { label: "SOCreateDate Timestamp", field: "timestamp", sortable: false },
                { label: "Actions", field: null, sortable: false },
              ].map((col) => (
                <Th
                  key={col.label}
                  borderRight="1px"
                  borderColor={tableBorderColor}
                  color={tableTextColor}
                  fontSize="11px"
                  textTransform="uppercase"
                  fontWeight="600"
                  py="10px"
                  px="12px"
                  minW="130px"
                  cursor={col.sortable ? "pointer" : "default"}
                  onClick={col.sortable ? () => handleSort(col.field) : undefined}
                  _hover={col.sortable ? { bg: hoverBg } : {}}
                  position="relative"
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
      {totalPages > 0 && (
        <Box px="25px">
          <Flex justify="space-between" align="center" py={4} flexWrap="wrap" gap={4}>
            {/* Page Size Selector and Info */}
            <HStack spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Show
              </Text>
              <Select
                size="sm"
                w="80px"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={80}>80</option>
                <option value={100}>100</option>
              </Select>
              <Text fontSize="sm" color="gray.600">
                per page
              </Text>
              <Text fontSize="sm" color="gray.600" ml={2}>
                Showing {orders.length} of {totalCount} records
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
      )}

      <Modal isOpen={formDisclosure.isOpen} onClose={handleFormClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingOrder ? "Edit SO" : "Create SO"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formData && (
              <VStack spacing="6" align="stretch">
                {/* Basic Information */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    {editingOrder && (
                      <FormControl flex="1">
                        <FormLabel>SO Number</FormLabel>
                        <Input
                          value={formData.so_number || "-"}
                          isReadOnly
                          bg={useColorModeValue("gray.50", "gray.700")}
                          cursor="not-allowed"
                        />
                      </FormControl>
                    )}
                    <FormControl flex="1" minW="220px">
                      <FormLabel>Date Created</FormLabel>
                      <Input
                        type="date"
                        value={formData.date_created || ""}
                        isReadOnly={!!editingOrder}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, date_created: e.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="1" minW="220px">
                      <FormLabel>Status</FormLabel>
                      <Select
                        size="sm"
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        value={formData.done || "active"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            done: e.target.value,
                          }))
                        }
                      >
                        <option value="active">Active</option>
                        <option value="archive">Archive</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="done">Done</option>
                        <option value="pending_pod">Pending POD</option>
                        <option value="ready_for_invoice">Ready for Invoice</option>
                      </Select>
                    </FormControl>
                  </Flex>
                </Box>

                {/* Party & Vessel */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="220px">
                      <FormLabel>Person in Charge</FormLabel>
                      <SimpleSearchableSelect
                        value={formData.pic_new}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, pic_new: value }))
                        }
                        options={pics}
                        placeholder="Select person in charge"
                        displayKey="name"
                        valueKey="id"
                        isLoading={isLoadingPICs}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl flex="1" isRequired minW="260px">
                      <FormLabel>Client</FormLabel>
                      <SimpleSearchableSelect
                        value={formData.client_id}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, client_id: value }))
                        }
                        options={clients}
                        placeholder="Select client"
                        displayKey="name"
                        valueKey="id"
                        isLoading={isLoadingClients}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl flex="1" isRequired minW="260px">
                      <FormLabel>Vessel</FormLabel>
                      <SimpleSearchableSelect
                        value={formData.vessel_id}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, vessel_id: value }))
                        }
                        options={vessels}
                        placeholder="Select vessel"
                        displayKey="name"
                        valueKey="id"
                        isLoading={isLoadingVessels}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        size="sm"
                      />
                    </FormControl>
                  </Flex>
                  <Flex gap="4" flexWrap="wrap" mt="4">
                    <FormControl flex="1" minW="260px">
                      <FormLabel>Destination Type</FormLabel>
                      <Select
                        size="sm"
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        value={formData.destination_type || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            destination_type: e.target.value,
                            destination: "", // Clear destination when type changes
                            country_id: null, // Clear country when type changes
                          }))
                        }
                        placeholder="Select destination type"
                      >
                        <option value="port_country">Port Name + Country</option>
                        <option value="city_country">City + Country</option>
                        <option value="airport_country">Airport + Country</option>
                        <option value="country">Country</option>
                      </Select>
                    </FormControl>
                    {formData.destination_type && formData.destination_type !== "country" && (
                      <FormControl flex="1" minW="260px">
                        <FormLabel>
                          {formData.destination_type === "port_country"
                            ? "Port Name"
                            : formData.destination_type === "city_country"
                              ? "City"
                              : formData.destination_type === "airport_country"
                                ? "Airport"
                                : "Destination"}
                        </FormLabel>
                        <Input
                          size="sm"
                          bg={inputBg}
                          color={inputText}
                          borderColor={borderColor}
                          value={formData.destination || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, destination: e.target.value }))
                          }
                          placeholder={
                            formData.destination_type === "port_country"
                              ? "Enter port name"
                              : formData.destination_type === "city_country"
                                ? "Enter city name"
                                : formData.destination_type === "airport_country"
                                  ? "Enter airport name"
                                  : "Enter destination"
                          }
                        />
                      </FormControl>
                    )}
                    {formData.destination_type && (
                      <FormControl flex="1" minW="260px">
                        <FormLabel>Country</FormLabel>
                        <SimpleSearchableSelect
                          value={formData.country_id}
                          onChange={(value) => {
                            const selectedCountry = countries.find((c) => c.id === value);
                            setFormData((prev) => ({
                              ...prev,
                              country_id: value,
                              // If destination_type is "country", auto-fill destination with country name
                              ...(prev.destination_type === "country" && selectedCountry
                                ? { destination: selectedCountry.name }
                                : {}),
                            }));
                          }}
                          options={countries}
                          placeholder="Select country"
                          displayKey="name"
                          valueKey="id"
                          isLoading={isLoadingCountries}
                          bg={inputBg}
                          color={inputText}
                          borderColor={borderColor}
                          size="sm"
                        />
                      </FormControl>
                    )}
                  </Flex>
                </Box>

                {/* Next Action */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="180px">
                      <FormLabel>Next Action</FormLabel>
                      <Input
                        type="date"
                        value={formData.next_action || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, next_action: e.target.value }))
                        }
                      />
                    </FormControl>
                  </Flex>
                </Box>

                {/* Schedule */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="180px">
                      <FormLabel>ETA</FormLabel>
                      <Input
                        type="date"
                        value={formData.eta_date || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, eta_date: e.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="1" minW="180px">
                      <FormLabel>ETB</FormLabel>
                      <Input
                        type="date"
                        value={formData.etb && formData.etb !== false ? (typeof formData.etb === 'string' ? formData.etb.split(' ')[0] : formData.etb) : ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, etb: e.target.value || false }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="1" minW="180px">
                      <FormLabel>ETD</FormLabel>
                      <Input
                        type="date"
                        value={formData.etd && formData.etd !== false ? (typeof formData.etd === 'string' ? formData.etd.split(' ')[0] : formData.etd) : ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, etd: e.target.value || false }))
                        }
                      />
                    </FormControl>
                  </Flex>
                </Box>

                {/* Remarks */}
                <Box>
                  <FormControl mb="3">
                    <FormLabel>Internal Remark</FormLabel>
                    <Textarea
                      value={formData.internal_remark}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, internal_remark: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl mb="3">
                    <FormLabel>VSLS Agent Details</FormLabel>
                    <VStack align="stretch" spacing="2">
                      <Textarea
                        value={formData.vsls_agent_dtls || ""}
                        isReadOnly
                        rows={2}
                        cursor="pointer"
                        onClick={() =>
                          openVslsAgentDtlsModal(
                            formData.vsls_agent_dtls || "",
                            "edit",
                            `Edit VSLS Agent Details — ${formData.so_number || "SO"}`,
                            "vsls_agent_dtls"
                          )
                        }
                      />
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          openVslsAgentDtlsModal(
                            formData.vsls_agent_dtls || "",
                            "edit",
                            `Edit VSLS Agent Details — ${formData.so_number || "SO"}`,
                            "vsls_agent_dtls"
                          )
                        }
                        alignSelf="flex-start"
                      >
                        Open editor
                      </Button>
                    </VStack>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Client Case Invoice Ref</FormLabel>
                    <Textarea
                      value={formData.client_case_invoice_ref}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, client_case_invoice_ref: e.target.value }))
                      }
                    />
                  </FormControl>
                </Box>

                {/* Quotation & Timestamp */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="260px" isDisabled>
                      <FormLabel>Quotation</FormLabel>
                      <SimpleSearchableSelect
                        value={formData.quotation_id}
                        onChange={(value) =>
                          setFormData((prev) => {
                            const selected = quotations.find((q) => q.id === value);
                            return {
                              ...prev,
                              quotation_id: value,
                              quotation: selected ? selected.name : "",
                            };
                          })
                        }
                        options={quotations}
                        placeholder="Select quotation"
                        displayKey="name"
                        valueKey="id"
                        isLoading={isLoadingQuotations}
                        // Temporarily disabled until quotation integration is finalized
                        isDisabled
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl flex="1" minW="260px">
                      <FormLabel>SO Timestamp</FormLabel>
                      <Input
                        value={formData.timestamp}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, timestamp: e.target.value }))
                        }
                        placeholder="13/06/2025 12:44:22"
                      />
                    </FormControl>
                  </Flex>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleFormClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleFormSubmit} isLoading={isSaving}>
              {editingOrder ? "Save Changes" : "Create SO"}
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
              isReadOnly={vslsAgentDtlsModalMode !== "edit"}
              rows={16}
              resize="vertical"
              placeholder="Enter details..."
            />
          </ModalBody>
          <ModalFooter>
            {vslsAgentDtlsModalMode === "edit" && (
              <Button
                colorScheme="blue"
                mr={3}
                onClick={() => {
                  if (vslsAgentDtlsModalTargetField && formData) {
                    setFormData((prev) => ({
                      ...prev,
                      [vslsAgentDtlsModalTargetField]: vslsAgentDtlsModalValue,
                    }));
                  }
                  vslsAgentDtlsDisclosure.onClose();
                  setVslsAgentDtlsModalTargetField(null);
                }}
              >
                Save
              </Button>
            )}
            <Button
              variant="ghost"
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

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={null}
        onClose={deleteDisclosure.onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete SO entry
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {orderToDelete?.name || "this SO"}?
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={deleteDisclosure.onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

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
            <Button variant="ghost" mr={3} onClick={picFilterModalDisclosure.onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SoNumberTab;

