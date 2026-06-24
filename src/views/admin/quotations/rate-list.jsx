import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
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
  MdClose,
  MdDelete,
  MdEdit,
  MdFilterList,
  MdPictureAsPdf,
  MdPrint,
  MdSearch,
} from "react-icons/md";
import Card from "components/card/Card";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import api from "../../../api/axios";
import { useMasterData } from "../../../hooks/useMasterData";
import {
  buildRateListPdf,
  buildRateListPdfModel,
  fetchAllFilteredRates,
  getRateListPdfFilename,
  RATE_LIST_PDF_TYPES,
} from "./rateListPdf";

const RATE_TYPE_FILTER_OPTIONS = [
  { id: "general", name: "General" },
  { id: "client_specific", name: "Client Specific" },
];

const DEFAULT_FORM = {
  rate_type: "general",
  client_id: "",
  location_text: "",
  agent_id: "",
  currency_id: "",
  rate_name: "",
  rate_text: "",
  rate_float: "",
  rate_calculation: "",
  fixed_sales_rate: "",
  valid_until: "",
  remarks: "",
  sort_order: "",
  incl_in_tariff: false,
  import_group: "",
  last_update: "",
  active: true,
  rate_id: "",
};

const DEFAULT_FILTERS = {
  rate_type: "",
  client_id: "",
  agent_id: "",
  currency_id: "",
  rate_name: "",
  rate_id: "",
};

function intFilterToParam(value) {
  if (value === "" || value == null) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function emptyToNull(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}

function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || "";
  const company = agent.company_name || "";
  if (code && company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

function TruncatedCell({ value, maxW = "180px", fontWeight, textColor, cellText, tdStyle }) {
  const text = value || "-";
  return (
    <Td
      maxW={maxW}
      isTruncated
      fontWeight={fontWeight}
      title={text !== "-" ? text : undefined}
      {...tdStyle}
    >
      <Text color={textColor} fontSize="sm" fontWeight={fontWeight} {...cellText}>
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

export default function RateList() {
  const toast = useToast();
  const { clients, agents, currencies } = useMasterData();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isPdfPreviewOpen,
    onOpen: onPdfPreviewOpen,
    onClose: onPdfPreviewClose,
  } = useDisclosure();
  const pdfPreviewIframeRef = useRef(null);
  const pdfPreviewBlobUrlRef = useRef(null);

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const hoverBg = useColorModeValue("blue.50", "gray.700");
  const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const modalBg = useColorModeValue("white", "gray.800");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const scrollbarTrack = useColorModeValue("#f1f1f1", "#2d3748");
  const scrollbarThumb = useColorModeValue("#c1c1c1", "#4a5568");
  const scrollbarThumbHover = useColorModeValue("#a8a8a8", "#718096");

  const cellText = {
    // overflow: "hidden",
    // textOverflow: "ellipsis",
    whiteSpace: "wrap",
    display: "block",
  };
  const thStyle = {
    border: "1px",
    borderColor: tableBorderColor,
    py: "12px",
    px: "16px",
    fontSize: "12px",
    fontWeight: "600",
    color: tableTextColor,
    textTransform: "uppercase",
  };
  const tdStyle = {
    borderRight: "1px",
    borderColor: tableBorderColor,
    py: "12px",
    px: "16px",
  };
  const filterInputProps = {
    variant: "outline",
    fontSize: "sm",
    bg: inputBg,
    color: inputText,
    borderRadius: "8px",
    border: "2px",
    borderColor: borderColor,
    _focus: {
      borderColor: "blue.400",
      boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
    },
    _hover: {
      borderColor: "blue.300",
    },
    _placeholder: { color: placeholderColor, fontSize: "14px" },
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [editAgentOption, setEditAgentOption] = useState(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const hasAnyAdvanceFilter = Boolean(
    filters.rate_type ||
    filters.client_id ||
    filters.agent_id ||
    filters.currency_id ||
    filters.rate_name ||
    filters.rate_id
  );
  const hasAnyFilter = Boolean(search || hasAnyAdvanceFilter);
  const [showFilterFields, setShowFilterFields] = useState(false);

  const [selectedRates, setSelectedRates] = useState({});
  const [pdfModel, setPdfModel] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

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
      client_id: intFilterToParam(filters.client_id),
      agent_id: intFilterToParam(filters.agent_id),
      currency_id: intFilterToParam(filters.currency_id),
      rate_name: filters.rate_name.trim() || undefined,
      rate_id: filters.rate_id.trim() || undefined,
    }),
    [debouncedSearch, filters]
  );

  useEffect(() => {
    if (hasAnyAdvanceFilter) setShowFilterFields(true);
  }, [hasAnyAdvanceFilter]);

  useEffect(() => {
    setSelectedRates({});
  }, [debouncedSearch, filters]);

  const isFirstSearchRun = useRef(true);
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
        page_size: Math.min(pageSize, 200),
      };

      const response = await api.get("/api/rate/list", { params });
      const result = response?.data || {};

      setItems(Array.isArray(result.data) ? result.data : []);
      setTotalPages(result.total_pages || 1);
      setTotalCount(result.total_count || 0);
      setHasNext(Boolean(result.has_next));
      setHasPrevious(Boolean(result.has_previous));
    } catch (error) {
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
      setHasNext(false);
      setHasPrevious(false);
      toast({
        title: "Error",
        description: "Failed to load rate list.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [buildListParams, page, pageSize, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setSelectedRates({});
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

  const openCreate = () => {
    setIsEdit(false);
    setEditAgentOption(null);
    setFormData(DEFAULT_FORM);
    onOpen();
  };

  const openEdit = (item) => {
    setIsEdit(true);
    const agentId = item.agent_id?.id ?? item.agent_id ?? "";
    const agentName = item.agent_id?.name || item.agent || item.agent_text || "";
    setEditAgentOption(
      agentId
        ? {
          id: agentId,
          name: agentName,
          company_name: agentName,
        }
        : null
    );
    setFormData({
      id: item.id,
      rate_type: item.rate_type || "general",
      client_id: item.client_id?.id || item.client_id || "",
      location_text: item.location_text || item.location || "",
      agent_id: agentId,
      currency_id: item.currency_id?.id || item.currency_id || "",
      rate_name: item.rate_name || "",
      rate_text: item.rate_text || "",
      rate_float: item.rate_float || "",
      rate_calculation: item.rate_calculation || "",
      fixed_sales_rate: item.fixed_sales_rate || "",
      valid_until: item.valid_until || "",
      remarks: item.remarks || "",
      sort_order: item.sort_order ?? "",
      incl_in_tariff: Boolean(item.incl_in_tariff),
      import_group: item.import_group || "",
      last_update: item.last_update || "",
      active: item.active !== false,
      rate_id: item.rate_id || "",
    });
    onOpen();
  };

  const validateForm = () => {
    if (!formData.rate_type) return "Rate type is required.";
    if (formData.rate_type === "client_specific" && !formData.client_id) {
      return "Client is required for client specific rates.";
    }
    if (!formData.currency_id) return "Currency is required.";
    if (!formData.rate_name) return "Rate name is required.";
    return "";
  };

  const saveRate = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        client_id: formData.rate_type === "client_specific" ? Number(formData.client_id) : null,
        currency_id: Number(formData.currency_id),
        agent_id: formData.agent_id ? Number(formData.agent_id) : null,
        // Backend expects date-like nullable fields as null, not empty string.
        valid_until: emptyToNull(formData.valid_until),
        last_update: emptyToNull(formData.last_update),
      };

      delete payload.agent_text;

      if (!isEdit) {
        delete payload.id;
        delete payload.rate_id;
      }

      await api.post(isEdit ? "/api/rate/list/update" : "/api/rate/list/create", payload);

      toast({
        title: isEdit ? "Rate updated" : "Rate created",
        status: "success",
        duration: 2500,
        isClosable: true,
      });

      onClose();
      setPage(1);
      await loadData();
    } catch (error) {
      const backendMessage =
        error?.response?.data?.result?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "";
      toast({
        title: "Error",
        description:
          backendMessage || (isEdit ? "Failed to update rate." : "Failed to create rate."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOne = async (id) => {
    try {
      await api.post("/api/rate/list/delete", { id });
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
    size: "md",
    bg: inputBg,
    color: inputText,
    borderColor: borderColor,
  };

  const modalAgentOptions = useMemo(() => {
    if (!editAgentOption) return agents;
    const exists = agents.some((agent) => String(agent.id) === String(editAgentOption.id));
    return exists ? agents : [editAgentOption, ...agents];
  }, [agents, editAgentOption]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <Card direction="column" w="100%" px="0px" overflowX={{ sm: "scroll", lg: "hidden" }}>
          <Flex px="25px" justify="space-between" mb="20px" align="center">
            <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
              Rate List
            </Text>
            <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" size="sm" onClick={openCreate}>
              New Rate
            </Button>
          </Flex>

          <Box
            px="25px"
            mb="20px"
            mx="15px"
            bg={inputBg}
            borderRadius="16px"
            p="24px"
            border="1px"
            borderColor={borderColor}
          >
            <HStack spacing={6} justify="space-between" align="center" flexWrap="wrap" mb={4}>
              <Box flex="1" minW="240px">
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  Search Rates
                </Text>
                <InputGroup>
                  <InputLeftElement>
                    <Icon as={MdSearch} color="blue.500" w="16px" h="16px" />
                  </InputLeftElement>
                  <Input
                    {...filterInputProps}
                    borderRadius="10px"
                    placeholder="Search rates (ID, name, location, agent, remarks...)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    pr={search ? "32px" : undefined}
                  />
                  {search && (
                    <InputRightElement width="32px">
                      <IconButton
                        aria-label="Clear search"
                        size="xs"
                        variant="ghost"
                        icon={<Icon as={MdClose} />}
                        onClick={() => setSearch("")}
                        _hover={{ bg: "gray.200" }}
                      />
                    </InputRightElement>
                  )}
                </InputGroup>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  &nbsp;
                </Text>
                {hasAnyFilter && (
                  <Button
                    size="md"
                    variant="outline"
                    onClick={clearFilters}
                    colorScheme="red"
                    _hover={{ bg: "red.50" }}
                    borderRadius="10px"
                    border="2px"
                  >
                    Clear All
                  </Button>
                )}
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  Advanced Filters
                </Text>
                <Button
                  size="md"
                  variant={hasAnyAdvanceFilter ? "solid" : "outline"}
                  colorScheme={hasAnyAdvanceFilter ? "blue" : "gray"}
                  leftIcon={<Icon as={MdFilterList} />}
                  onClick={() => setShowFilterFields(!showFilterFields)}
                  borderRadius="10px"
                  border="2px"
                  borderColor={borderColor}
                >
                  {showFilterFields ? "Hide Filters" : "Show Filters"}
                </Button>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  Page Size
                </Text>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  size="md"
                  bg={inputBg}
                  color={inputText}
                  borderRadius="8px"
                  border="2px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                  }}
                >
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={200}>200 per page</option>
                </Select>
              </Box>
            </HStack>

            {showFilterFields && (
              <Box
                mt={4}
                pt={4}
                borderTop="2px"
                borderColor={borderColor}
                bg={expandableFilterBg}
                borderRadius="12px"
                p="20px"
              >
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={4}>
                  Filter by Specific Fields
                </Text>
                <HStack spacing={6} flexWrap="wrap" align="flex-start">
                  <Box minW="200px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Rate Type
                    </Text>
                    <SimpleSearchableSelect
                      value={filters.rate_type}
                      onChange={(value) => handleFilterChange("rate_type", value || "")}
                      options={RATE_TYPE_FILTER_OPTIONS}
                      placeholder="All Types"
                      displayKey="name"
                      valueKey="id"
                      formatOption={(option) => option.name}
                      {...searchableSelectProps}
                    />
                  </Box>
                  <Box minW="220px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Client
                    </Text>
                    <SimpleSearchableSelect
                      value={filters.client_id}
                      onChange={(value) => handleFilterChange("client_id", value || "")}
                      options={clients}
                      placeholder="All Clients"
                      displayKey="name"
                      valueKey="id"
                      formatOption={(client) => client.name || `Client ${client.id}`}
                      {...searchableSelectProps}
                    />
                  </Box>
                  <Box minW="220px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Agent
                    </Text>
                    <SimpleSearchableSelect
                      value={filters.agent_id}
                      onChange={(value) => handleFilterChange("agent_id", value || "")}
                      options={agents}
                      placeholder="All Agents"
                      displayKey="name"
                      valueKey="id"
                      formatOption={formatAgentOption}
                      {...searchableSelectProps}
                    />
                  </Box>
                  <Box minW="200px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Currency
                    </Text>
                    <SimpleSearchableSelect
                      value={filters.currency_id}
                      onChange={(value) => handleFilterChange("currency_id", value || "")}
                      options={currencies}
                      placeholder="All Currencies"
                      displayKey="name"
                      valueKey="id"
                      formatOption={(currency) => currency.name || `Currency ${currency.id}`}
                      {...searchableSelectProps}
                    />
                  </Box>
                  <Box minW="180px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Rate Name
                    </Text>
                    <Input
                      {...filterInputProps}
                      placeholder="Filter by rate name..."
                      value={filters.rate_name}
                      onChange={(e) => handleFilterChange("rate_name", e.target.value)}
                    />
                  </Box>
                  <Box minW="180px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Rate ID
                    </Text>
                    <Input
                      {...filterInputProps}
                      placeholder="Filter by rate ID..."
                      value={filters.rate_id}
                      onChange={(e) => handleFilterChange("rate_id", e.target.value)}
                    />
                  </Box>
                </HStack>
              </Box>
            )}
          </Box>

          {(selectedCount > 0 || hasAnyFilter) && (
            <Flex
              px="25px"
              mb="20px"
              mx="15px"
              bg={expandableFilterBg}
              borderRadius="16px"
              p="16px 24px"
              border="1px"
              borderColor={borderColor}
              align="center"
              justify="space-between"
              flexWrap="wrap"
              gap={3}
            >
              <Text fontSize="sm" color={tableTextColorSecondary}>
                {selectedCount > 0
                  ? `${selectedCount} rate${selectedCount === 1 ? "" : "s"} selected on this list`
                  : "Use the checkboxes in the table to select rates for PDF export"}
              </Text>
              <HStack spacing={3} flexWrap="wrap">
                {selectedCount > 0 && (
                  <Button
                    colorScheme="blue"
                    size="sm"
                    leftIcon={<Icon as={MdPictureAsPdf} />}
                    onClick={handleExportSelectedPdf}
                    isLoading={isPdfLoading}
                    loadingText="Generating..."
                  >
                    Export Selected ({selectedCount})
                  </Button>
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
                    Export All Filtered ({totalCount})
                  </Button>
                )}
              </HStack>
            </Flex>
          )}

          <Box
            px="15px"
            maxH="600px"
            overflowX="auto"
            overflowY="auto"
            css={{
              "&::-webkit-scrollbar": {
                width: "8px",
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: scrollbarTrack,
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: scrollbarThumb,
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: scrollbarThumbHover,
              },
            }}
          >
            <Table variant="unstyled" size="sm" layout="fixed" w="100%" minW="1250px">
              <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={1}>
                <Tr>
                  <Th w="36px" {...thStyle} textAlign="center">
                    <Checkbox
                      aria-label="Select all rates on this page"
                      isChecked={allPageSelected}
                      isIndeterminate={somePageSelected && !allPageSelected}
                      onChange={toggleSelectAllOnPage}
                      colorScheme="blue"
                    />
                  </Th>
                  <Th w="30px" {...thStyle} />
                  <Th w="140px" {...thStyle}>
                    Rate Type
                  </Th>
                  <Th w="100px" {...thStyle}>
                    Location
                  </Th>
                  <Th w="180px" {...thStyle}>
                    Agent
                  </Th>
                  <Th w="250px" {...thStyle}>
                    Rate Name
                  </Th>
                  <Th w="300px" {...thStyle}>
                    Rate Text
                  </Th>
                  <Th w="85px" {...thStyle}>
                    Rate Cost
                  </Th>
                  <Th w="90px" {...thStyle}>
                    Rate Fixed
                  </Th>
                  <Th w="30px" {...thStyle} />
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={10} textAlign="center" py="40px" {...tdStyle}>
                      <Text color={tableTextColorSecondary} fontSize="sm">
                        Loading rates...
                      </Text>
                    </Td>
                  </Tr>
                ) : items.length === 0 ? (
                  <Tr>
                    <Td colSpan={10} textAlign="center" py="40px" {...tdStyle}>
                      <Text color={tableTextColorSecondary} fontSize="sm">
                        {hasAnyFilter ? "No rates match your search criteria." : "No rates available."}
                      </Text>
                    </Td>
                  </Tr>
                ) : (
                  items.map((item, index) => (
                    <Tr
                      key={item.id}
                      bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                      _hover={{ bg: hoverBg }}
                      border="1px"
                      borderColor={tableBorderColor}
                    >
                      <Td {...tdStyle} p="2px" textAlign="center">
                        <Checkbox
                          aria-label={`Select rate ${item.rate_name || item.id}`}
                          isChecked={Boolean(selectedRates[item.id])}
                          onChange={() => toggleSelectRate(item)}
                          colorScheme="blue"
                        />
                      </Td>
                      <Td {...tdStyle} p="2px" >
                        <Tooltip label="Edit Rate">
                          <IconButton
                            aria-label="Edit rate"
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            icon={<MdEdit />}
                            onClick={() => openEdit(item)}
                          />
                        </Tooltip>
                      </Td>
                      <TruncatedCell
                        value={formatRateType(item.rate_type)}
                        maxW="140px"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <TruncatedCell
                        value={item.location_text || item.location}
                        maxW="100px"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <TruncatedCell
                        value={item.agent_id?.name || item.agent_text || item.agent}
                        maxW="180px"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <TruncatedCell
                        value={item.rate_name}
                        maxW="220px"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <TruncatedCell
                        value={displayText(item.rate_text)}
                        maxW="300px"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <TruncatedCell
                        value={formatRateCost(item)}
                        maxW="85px"
                        fontWeight="bold"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <TruncatedCell
                        value={displayText(item.fixed_sales_rate)}
                        maxW="90px"
                        fontWeight="bold"
                        textColor={textColor}
                        cellText={cellText}
                        tdStyle={tdStyle}
                      />
                      <Td {...tdStyle} p="2px" >
                        <Tooltip label="Delete Rate">
                          <IconButton
                            aria-label="Delete rate"
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            icon={<MdDelete />}
                            onClick={() => deleteOne(item.id)}
                          />
                        </Tooltip>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>

          <Flex px="25px" justify="space-between" align="center" py="20px" flexWrap="wrap" gap={4}>
            <Text fontSize="sm" color={tableTextColorSecondary}>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalCount)} of {totalCount} results
            </Text>

            <HStack spacing={4} align="center" flexWrap="wrap">
              <HStack spacing={1}>
                <Button
                  size="sm"
                  onClick={() => setPage(1)}
                  isDisabled={!hasPrevious}
                  variant="outline"
                  aria-label="First page"
                >
                  ««
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  isDisabled={!hasPrevious}
                  variant="outline"
                  aria-label="Previous page"
                >
                  «
                </Button>
                {(() => {
                  const pageNumbers = [];
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                  if (endPage - startPage < maxVisiblePages - 1) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  for (let i = startPage; i <= endPage; i += 1) {
                    pageNumbers.push(
                      <Button
                        key={i}
                        size="sm"
                        onClick={() => setPage(i)}
                        variant={i === page ? "solid" : "outline"}
                        colorScheme={i === page ? "blue" : "gray"}
                        minW="40px"
                        aria-label={`Page ${i}`}
                      >
                        {i}
                      </Button>
                    );
                  }

                  return pageNumbers;
                })()}
                <Button
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  isDisabled={!hasNext}
                  variant="outline"
                  aria-label="Next page"
                >
                  »
                </Button>
                <Button
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  isDisabled={!hasNext}
                  variant="outline"
                  aria-label="Last page"
                >
                  »»
                </Button>
              </HStack>
              <Text fontSize="sm" color={tableTextColorSecondary}>
                Page {page} of {totalPages}
              </Text>
            </HStack>
          </Flex>
        </Card>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent bg={modalBg} border="1px" borderColor={modalBorder}>
          <ModalHeader
            bg={modalHeaderBg}
            borderBottom="1px"
            borderColor={modalBorder}
          >
            {isEdit ? "Edit Rate" : "New Rate"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {isEdit && (
                <FormControl>
                  <FormLabel>Rate ID (Read only)</FormLabel>
                  <Input value={formData.rate_id || ""} isReadOnly />
                </FormControl>
              )}

              <HStack align="start" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Rate Type</FormLabel>
                  <Select
                    value={formData.rate_type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        rate_type: nextType,
                        client_id: nextType === "general" ? "" : prev.client_id,
                      }));
                    }}
                  >
                    <option value="general">General</option>
                    <option value="client_specific">Client Specific</option>
                  </Select>
                </FormControl>

                {formData.rate_type === "client_specific" && (
                  <FormControl isRequired>
                    <FormLabel>Client</FormLabel>
                    <Select
                      value={formData.client_id}
                      onChange={(e) => setFormData((p) => ({ ...p, client_id: e.target.value }))}
                    >
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl isRequired>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={formData.currency_id}
                    onChange={(e) => setFormData((p) => ({ ...p, currency_id: e.target.value }))}
                  >
                    <option value="">Select Currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>Location Text</FormLabel>
                  <Input
                    value={formData.location_text}
                    onChange={(e) => setFormData((p) => ({ ...p, location_text: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Agent</FormLabel>
                  <SimpleSearchableSelect
                    value={formData.agent_id}
                    onChange={(value) => setFormData((p) => ({ ...p, agent_id: value || "" }))}
                    options={modalAgentOptions}
                    placeholder="Select agent"
                    formatOption={formatAgentOption}
                    {...searchableSelectProps}
                  />
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Rate Name</FormLabel>
                  <Input
                    value={formData.rate_name}
                    onChange={(e) => setFormData((p) => ({ ...p, rate_name: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Rate Float</FormLabel>
                  <Input
                    value={formData.rate_float}
                    onChange={(e) => setFormData((p) => ({ ...p, rate_float: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Fixed Sales Rate</FormLabel>
                  <Input
                    value={formData.fixed_sales_rate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, fixed_sales_rate: e.target.value }))
                    }
                  />
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>Rate Calculation</FormLabel>
                  <Input
                    value={formData.rate_calculation}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, rate_calculation: e.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Valid Until</FormLabel>
                  <Input
                    placeholder="31-12-2026 or 2026-12-31"
                    value={formData.valid_until}
                    onChange={(e) => setFormData((p) => ({ ...p, valid_until: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Last Update</FormLabel>
                  <Input
                    value={formData.last_update}
                    onChange={(e) => setFormData((p) => ({ ...p, last_update: e.target.value }))}
                  />
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>Sort Order</FormLabel>
                  <Input
                    value={formData.sort_order}
                    onChange={(e) => setFormData((p) => ({ ...p, sort_order: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Import Group</FormLabel>
                  <Input
                    value={formData.import_group}
                    onChange={(e) => setFormData((p) => ({ ...p, import_group: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Include in Tariff</FormLabel>
                  <Select
                    value={String(formData.incl_in_tariff)}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, incl_in_tariff: e.target.value === "true" }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Active</FormLabel>
                  <Select
                    value={String(formData.active)}
                    onChange={(e) => setFormData((p) => ({ ...p, active: e.target.value === "true" }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Rate Text</FormLabel>
                <Textarea
                  value={formData.rate_text}
                  onChange={(e) => setFormData((p) => ({ ...p, rate_text: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={saveRate} isLoading={saving}>
              {isEdit ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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
