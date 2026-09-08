import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Badge,
  Box,
  Button,
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
  MdFilterList,
  MdClear,
  MdContentCopy,
  MdSort,
  MdDownload,
  MdVisibility,
  MdLocalShipping,
} from "react-icons/md";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import { getNarviQuotations } from "../../../api/narviQuotation";
import { useMasterData } from "../../../hooks/useMasterData";
import { useStockAttachmentsGallery } from "../../../hooks/useStockAttachmentsGallery";
import {
  getShippingOrders,
  createShippingOrder,
  updateShippingOrder,
  mergeShippingOrderPackage,
  resolveShippingPackageDownloadUrl,
  downloadShippingOrderAttachmentApi,
  downloadShippingOrderCiplApi,
} from "../../../api/shippingOrders";
import { useHistory, Link, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import { normalizeOrder, buildPayloadFromForm, getOrderAttachmentsForDisplay } from "./shippingOrderUtils";
import {
  applyShippingOrderFilesToPayload,
  mapExistingCiplFilesFromOrder,
  notifyShippingOrderSaveResult,
  resolveShippingOrderDownloadFilename,
} from "../../../utils/shippingOrderAttachments";
import ShippingOrderFormFields from "./ShippingOrderFormFields";
import {
  buildShippingOrderListQueryParams,
  buildShippingOrderListSortParams,
  clearPendingSoFilter,
  getInitialShippingOrderListState,
  parseSoFilterFromUrl,
  resolvePicIdsByNames,
  SHIPPING_ORDER_DEFAULT_ATH_PIC_NAMES,
  SHIPPING_ORDER_DEFAULT_SIN_PIC_NAMES,
  SHIPPING_ORDER_STATUS_FILTER_OPTIONS,
  writePersistedShippingOrderListState,
} from "../../../utils/shippingOrderListState";

const prettyTableDate = (value) => {
  if (!value || value === false) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const prettyTableDateTime = (value) => {
  if (!value || value === false) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${prettyTableDate(value)} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const TruncatedText = ({ value, maxW = "160px", fontWeight, fontSize = "sm", onClick, cursor }) => {
  const text = value == null || value === false || value === "" || value === "-" ? "" : String(value);
  const isEmpty = !text;
  return (
    <Tooltip label={text} isDisabled={isEmpty || text.length < 14} openDelay={250} hasArrow placement="top">
      <Text
        fontSize={fontSize}
        fontWeight={fontWeight}
        color={isEmpty ? "gray.400" : undefined}
        maxW={maxW}
        noOfLines={1}
        cursor={onClick ? cursor || "pointer" : !isEmpty && text.length >= 14 ? "help" : "default"}
        onClick={onClick}
      >
        {isEmpty ? "—" : text}
      </Text>
    </Tooltip>
  );
};

const statusColorScheme = (done) => {
  if (done === "active") return "green";
  if (done === "done") return "blue";
  if (done === "cancelled") return "red";
  if (done === "archive") return "gray";
  if (done === "ready_for_invoice") return "purple";
  if (done === "pending_pod") return "orange";
  return "orange";
};

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

const formatStatusLabel = (done) => {
  if (done === "pending_pod") return "Pending POD";
  if (done === "ready_for_invoice") return "Ready for Invoice";
  if (done === "done") return "Done";
  if (done === "cancelled") return "Cancelled";
  if (done === "archive") return "Archive";
  return "Active";
};

const SHIPPING_ORDER_TABLE_COLUMNS = [
  { label: "Actions", field: null, sortable: false },
  { label: "SO Number", field: "so_number", sortable: false },
  { label: "Status", field: "done", sortable: false },
  { label: "Next Action date", field: "next_action", sortable: true },
  { label: "SO Delivery date", field: "so_delivery_date", sortable: false },
  { label: "Vessel Name", field: "vessel_name", sortable: false },
  { label: "Destination", field: "destination", sortable: false },
  { label: "Internal remarks", field: "internal_remark", sortable: false },
  { label: "Vessels Agent details", field: "vsls_agent_dtls", sortable: false },
  { label: "Client Code", field: "client", sortable: false },
  { label: "Person in Charge", field: "pic", sortable: false },
  { label: "ETA", field: "eta_date", sortable: false },
  { label: "ETB", field: "etb", sortable: false },
  { label: "ETD", field: "etd", sortable: false },
  { label: "Client case / Invoice Ref", field: "client_case_invoice_ref", sortable: false },
  { label: "Files", field: "attachments", sortable: false },
  { label: "Package Link", field: null, sortable: false },
  { label: "Quotation", field: "quotation", sortable: false },
  { label: "Date Created", field: "date_created", sortable: false },
  { label: "Cancel Reason", field: "cancel_text", sortable: false },
];

const STICKY_ACTIONS_WIDTH = "88px";
const STICKY_SO_WIDTH = "140px";

const SoNumberTab = () => {
  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const headerColor = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "gray.800");
  const soColor = useColorModeValue("blue.700", "blue.200");
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
  };
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "whiteAlpha.50");
  const stickyEdgeShadow = useColorModeValue(
    "inset -1px 0 0 var(--chakra-colors-gray-200)",
    "inset -1px 0 0 var(--chakra-colors-whiteAlpha-200)"
  );

  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [savedState] = useState(() => getInitialShippingOrderListState(location.search));

  useEffect(() => {
    if (parseSoFilterFromUrl(location.search)) {
      history.replace(location.pathname);
    }
    const timer = setTimeout(() => clearPendingSoFilter(), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search state
  const [searchValue, setSearchValue] = useState(savedState.searchValue);
  const [searchQuery, setSearchQuery] = useState(savedState.searchQuery);

  // Search filter state (client, vessel, country/destination)
  const [searchClientFilter, setSearchClientFilter] = useState(savedState.searchClientFilter);
  const [searchVesselFilter, setSearchVesselFilter] = useState(savedState.searchVesselFilter);
  const [searchCountryFilter, setSearchCountryFilter] = useState(savedState.searchCountryFilter);
  const [searchPicFilter, setSearchPicFilter] = useState(savedState.searchPicFilter);
  const [searchStatusFilter, setSearchStatusFilter] = useState(
    savedState.searchStatusFilter || ""
  );

  // Pagination state
  const [page, setPage] = useState(savedState.page);
  const [pageSize] = useState(80);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const [formData, setFormData] = useState(null);
  const { clients, vessels, countries, pics, destinations } = useMasterData();
  const [quotations, setQuotations] = useState([]);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  const formDisclosure = useDisclosure();
  const picFilterModalDisclosure = useDisclosure();
  const vslsAgentDtlsDisclosure = useDisclosure();
  const packageLinkDisclosure = useDisclosure();
  const advancedFiltersDisclosure = useDisclosure({ defaultIsOpen: false });

  const [mergingOrderId, setMergingOrderId] = useState(null);
  const [packageLinkData, setPackageLinkData] = useState({ url: "", soNumber: "" });
  const [downloadingFileKey, setDownloadingFileKey] = useState(null);

  const resolveShippingOrderPreviewUrl = useCallback(async (attachment, orderId) => {
    if (!orderId || attachment?.id == null) {
      throw new Error("File is not available for preview.");
    }
    const kind = attachment.__fileKind === "cipl" ? "cipl" : "attachment";
    const response =
      kind === "cipl"
        ? await downloadShippingOrderCiplApi(orderId, attachment.id, false)
        : await downloadShippingOrderAttachmentApi(orderId, attachment.id, false);
    if (!(response?.data instanceof Blob)) {
      throw new Error("Could not load file.");
    }
    const filename = resolveShippingOrderDownloadFilename(attachment, response);
    const mimeType =
      response.type ||
      attachment.mimetype ||
      (/\.pdf$/i.test(filename) ? "application/pdf" : "application/octet-stream");
    return {
      fileUrl: URL.createObjectURL(response.data),
      mimeType,
      filename,
      blob: response.data,
      shouldRevoke: true,
    };
  }, []);

  const { openGallery, galleryModal } = useStockAttachmentsGallery({
    resolvePreviewUrl: resolveShippingOrderPreviewUrl,
  });

  const getOrderFilesForPreview = useCallback((order) => {
    const attachments = (getOrderAttachmentsForDisplay(order) || [])
      .filter((f) => f && f.id != null)
      .map((f) => ({ ...f, __fileKind: "attachment" }));
    const ciplSource =
      Array.isArray(order?.existingCiplFiles) && order.existingCiplFiles.length
        ? order.existingCiplFiles
        : mapExistingCiplFilesFromOrder(order?._raw || order || {});
    const ciplFiles = (ciplSource || [])
      .filter((f) => f && f.id != null)
      .map((f) => ({ ...f, __fileKind: "cipl" }));
    return [...attachments, ...ciplFiles];
  }, []);

  const handlePreviewOrderFiles = useCallback(
    (order, startIndex = 0) => {
      if (!order?.id) return;
      const files = getOrderFilesForPreview(order);
      if (!files.length) {
        toast({
          title: "No files",
          description: "No files are available for this shipping order.",
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        return;
      }
      openGallery(files, order.id, Math.min(startIndex, files.length - 1));
    },
    [getOrderFilesForPreview, openGallery, toast]
  );

  const handleDownloadOrderFile = useCallback(
    async (order, file) => {
      if (!order?.id || file?.id == null) return;
      const key = `${file.__fileKind || "attachment"}-${order.id}-${file.id}`;
      setDownloadingFileKey(key);
      try {
        const kind = file.__fileKind === "cipl" ? "cipl" : "attachment";
        const response =
          kind === "cipl"
            ? await downloadShippingOrderCiplApi(order.id, file.id, true)
            : await downloadShippingOrderAttachmentApi(order.id, file.id, true);
        if (!(response?.data instanceof Blob)) {
          throw new Error("Could not download file.");
        }
        const filename = resolveShippingOrderDownloadFilename(file, response);
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "download";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast({
          title: "Download failed",
          description: err?.message || "Unable to download file.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setDownloadingFileKey(null);
      }
    },
    [toast]
  );

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

  const picDefaultsInitializedRef = useRef(false);

  // Client filter states
  const [activeClientFilter, setActiveClientFilter] = useState(savedState.activeClientFilter);
  const [readyForInvoiceClientFilter, setReadyForInvoiceClientFilter] = useState(savedState.readyForInvoiceClientFilter);

  const [nextActionSortOption, setNextActionSortOption] = useState(
    savedState.nextActionSortOption || "so_number"
  );

  // Current PIC filter being edited
  const [editingPicFilter, setEditingPicFilter] = useState(null); // 'activeATH', 'activeSIN', 'athReadyForInvoice', 'sinReadyForInvoice'

  const activeATHPicsKey = activeATHPics.join(",");
  const activeSINPicsKey = activeSINPics.join(",");
  const athReadyForInvoicePicsKey = athReadyForInvoicePics.join(",");
  const sinReadyForInvoicePicsKey = sinReadyForInvoicePics.join(",");

  const handlePicChipSelectionChange = (filterType, values) => {
    const picIds = values.map((v) => Number(v)).filter((id) => Number.isFinite(id));
    if (filterType === "activeATH") {
      setActiveATHPics(picIds);
    } else if (filterType === "activeSIN") {
      setActiveSINPics(picIds);
    } else if (filterType === "athReadyForInvoice") {
      setAthReadyForInvoicePics(picIds);
    } else if (filterType === "sinReadyForInvoice") {
      setSinReadyForInvoicePics(picIds);
    }
    setPage(1);
  };

  const applyDefaultPicsForFilter = useCallback(
    (filterName) => {
      if (!pics.length) return;
      const athIds = resolvePicIdsByNames(pics, SHIPPING_ORDER_DEFAULT_ATH_PIC_NAMES);
      const sinIds = resolvePicIdsByNames(pics, SHIPPING_ORDER_DEFAULT_SIN_PIC_NAMES);
      if (filterName === "activeATH" && athIds.length) {
        setActiveATHPics(athIds);
      } else if (filterName === "athReadyForInvoice" && athIds.length) {
        setAthReadyForInvoicePics(athIds);
      } else if (filterName === "activeSIN" && sinIds.length) {
        setActiveSINPics(sinIds);
      } else if (filterName === "sinReadyForInvoice" && sinIds.length) {
        setSinReadyForInvoicePics(sinIds);
      }
    },
    [pics]
  );

  const applyAllDefaultPicSelections = useCallback(() => {
    if (!pics.length) return;
    const athIds = resolvePicIdsByNames(pics, SHIPPING_ORDER_DEFAULT_ATH_PIC_NAMES);
    const sinIds = resolvePicIdsByNames(pics, SHIPPING_ORDER_DEFAULT_SIN_PIC_NAMES);
    if (athIds.length) {
      setActiveATHPics(athIds);
      setAthReadyForInvoicePics(athIds);
    }
    if (sinIds.length) {
      setActiveSINPics(sinIds);
      setSinReadyForInvoicePics(sinIds);
    }
  }, [pics]);

  // Persist filter state so it survives navigation (e.g. edit/create SO then back)
  useEffect(() => {
    writePersistedShippingOrderListState({
      searchValue,
      searchQuery,
      searchClientFilter,
      searchVesselFilter,
      searchCountryFilter,
      searchPicFilter,
      searchStatusFilter,
      page,
      activeFilters,
      activeATHPics,
      activeSINPics,
      athReadyForInvoicePics,
      sinReadyForInvoicePics,
      activeClientFilter,
      readyForInvoiceClientFilter,
      nextActionSortOption,
    });
  }, [
    searchValue,
    searchQuery,
    searchClientFilter,
    searchPicFilter,
    searchStatusFilter,
    searchVesselFilter,
    searchCountryFilter,
    page,
    activeFilters,
    activeATHPics,
    activeSINPics,
    athReadyForInvoicePics,
    sinReadyForInvoicePics,
    activeClientFilter,
    readyForInvoiceClientFilter,
    nextActionSortOption,
  ]);

  const resetForm = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
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
      cancel_text: "",
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
      so_delivery_date: "",
      next_action: "",
      internal_remark: "",
      client_case_invoice_ref: "",
      vsls_agent_dtls: "",
      quotation: "",
      quotation_id: null,
      attachments: [],
      existingAttachments: [],
      attachment_to_delete: [],
      cipl_files: [],
      existingCiplFiles: [],
      cipl_files_to_delete: [],
    });
  };

  const openVslsAgentDtlsModal = useCallback((value, mode = "view", title = "Details", targetField = null) => {
    setVslsAgentDtlsModalMode(mode);
    setVslsAgentDtlsModalTitle(title);
    setVslsAgentDtlsModalTargetField(targetField);
    setVslsAgentDtlsModalValue(String(value || ""));
    vslsAgentDtlsDisclosure.onOpen();
  }, [vslsAgentDtlsDisclosure]);

  const buildListRequestParams = useCallback((options = {}) => {
    const {
      fetchAll = false,
      page: pageOverride = page,
      page_size: pageSizeOverride = pageSize,
    } = options;
    const advancedParams = buildShippingOrderListQueryParams({
      activeFilters,
      activeATHPics,
      activeSINPics,
      athReadyForInvoicePics,
      sinReadyForInvoicePics,
      activeClientFilter,
      readyForInvoiceClientFilter,
      searchClientFilter,
      searchPicFilter,
      searchStatusFilter,
    });

    const vesselId = searchVesselFilter != null && typeof searchVesselFilter === "object"
      ? (searchVesselFilter.id ?? searchVesselFilter.value)
      : searchVesselFilter;
    const countryId = searchCountryFilter != null && typeof searchCountryFilter === "object"
      ? (searchCountryFilter.id ?? searchCountryFilter.value)
      : searchCountryFilter;

    const soId = searchQuery && searchQuery.trim() !== "" ? searchQuery.trim() : undefined;

    return {
      ...(fetchAll ? { fetch_all: true } : { page: pageOverride, page_size: pageSizeOverride }),
      ...(soId != null && soId !== "" && { so_id: soId }),
      ...advancedParams,
      ...buildShippingOrderListSortParams(nextActionSortOption),
      ...(vesselId != null && vesselId !== "" && { vessel_id: vesselId }),
      ...(countryId != null && countryId !== "" && { country_id: countryId }),
    };
  }, [
    page,
    pageSize,
    searchQuery,
    activeFilters,
    activeATHPics,
    activeSINPics,
    athReadyForInvoicePics,
    sinReadyForInvoicePics,
    activeClientFilter,
    readyForInvoiceClientFilter,
    searchClientFilter,
    searchPicFilter,
    searchStatusFilter,
    searchVesselFilter,
    searchCountryFilter,
    nextActionSortOption,
  ]);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getShippingOrders(buildListRequestParams({ page, page_size: pageSize }));

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
        .filter(Boolean);

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
    buildListRequestParams,
    page,
    pageSize,
    toast,
  ]);

  // Refetch when PIC chip selections change (debounced while toggling checkboxes in modal)
  const skipInitialPicChipFetchRef = useRef(true);
  useEffect(() => {
    const picChipActive =
      activeFilters.activeATH ||
      activeFilters.activeSIN ||
      activeFilters.athReadyForInvoice ||
      activeFilters.sinReadyForInvoice;
    if (!picChipActive) return undefined;

    if (skipInitialPicChipFetchRef.current) {
      skipInitialPicChipFetchRef.current = false;
      return undefined;
    }

    const timer = window.setTimeout(() => {
      fetchOrders();
    }, 200);

    return () => window.clearTimeout(timer);
  }, [
    activeATHPicsKey,
    activeSINPicsKey,
    athReadyForInvoicePicsKey,
    sinReadyForInvoicePicsKey,
    activeFilters.activeATH,
    activeFilters.activeSIN,
    activeFilters.athReadyForInvoice,
    activeFilters.sinReadyForInvoice,
    fetchOrders,
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
    activeFilters,
    activeATHPics,
    activeSINPics,
    athReadyForInvoicePics,
    sinReadyForInvoicePics,
    activeClientFilter,
    readyForInvoiceClientFilter,
    searchClientFilter,
    searchPicFilter,
    searchStatusFilter,
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
        const response = await getNarviQuotations({ page: 1, page_size: 200 });
        const list = Array.isArray(response?.data) ? response.data : [];

        const normalized = list.map((q) => ({
          id: q.id,
          name: q.name || `Q-${q.id}`,
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

  // Default ATH/SIN PIC selections when master data loads (overrides stale session PIC ids)
  useEffect(() => {
    if (pics.length === 0 || picDefaultsInitializedRef.current) return;
    picDefaultsInitializedRef.current = true;
    applyAllDefaultPicSelections();
  }, [pics, applyAllDefaultPicSelections]);

  // Helper to get client name for filter labels (filter stores id; list display uses order.client from API)
  const getClientName = useCallback((clientId) => {
    if (clientId == null || clientId === "") return "-";
    const normalizedId = typeof clientId === "object"
      ? (clientId.id ?? clientId.value)
      : clientId;
    if (normalizedId == null || normalizedId === "") return "-";
    const client = clients.find((c) => String(c.id) === String(normalizedId));
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
  const PIC_CHIP_FILTERS = ["activeATH", "athReadyForInvoice", "activeSIN", "sinReadyForInvoice"];

  const toggleFilter = (filterName) => {
    setActiveFilters((prev) => {
      const nextValue = !prev[filterName];
      if (!nextValue) {
        return { ...prev, [filterName]: false };
      }
      if (PIC_CHIP_FILTERS.includes(filterName)) {
        applyDefaultPicsForFilter(filterName);
      }
      const cleared = Object.keys(prev).reduce(
        (acc, key) => ({ ...acc, [key]: false }),
        {}
      );
      return { ...cleared, [filterName]: true };
    });
    setPage(1);
  };

  const openPicFilterModal = (filterType) => {
    setEditingPicFilter(filterType);
    picFilterModalDisclosure.onOpen();
  };

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

  const setNextActionSort = useCallback((option) => {
    setNextActionSortOption(option);
    setPage(1);
  }, []);

  const cycleNextActionColumnSort = useCallback(() => {
    setNextActionSortOption((prev) => (prev === "next_action" ? "so_number" : "next_action"));
    setPage(1);
  }, []);

  const nextActionSortLabel =
    nextActionSortOption === "next_action"
      ? "Next Action"
      : "SO #";

  const getSoNumber = (order) => {
    if (order.so_number) return order.so_number;
    return order.id ? `SO-${order.id}` : "-";
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const data = await getShippingOrders(buildListRequestParams({ fetchAll: true }));
      const list = Array.isArray(data.orders)
        ? data.orders
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.result)
            ? data.result
            : Array.isArray(data?.data)
              ? data.data
              : [];
      const rows = list.map(normalizeOrder).filter(Boolean);
      if (rows.length === 0) {
        toast({
          title: "No data",
          description: "No shipping orders match the current filters.",
          status: "warning",
          duration: 2200,
          isClosable: true,
        });
        return;
      }

      const headers = [
        "SO Number",
        "Status",
        "Next Action date",
        "SO Delivery date",
        "Vessel Name",
        "Destination",
        "Internal remarks",
        "Vessels Agent details",
        "Client Code",
        "Person in Charge",
        "ETA",
        "ETB",
        "ETD",
        "Client case / Invoice Ref",
        "Files",
        "Quotation",
        "Date Created",
        "Cancel Reason",
      ];

      const excelRows = rows.map((order) => {
        const files = getOrderAttachmentsForDisplay(order);
        const fileSummary = files.length
          ? files.map((f) => f.filename || f.name).filter(Boolean).join("; ") || `${files.length} files`
          : "-";
        const clientCode =
          order.client_code != null && order.client_code !== false && order.client_code !== ""
            ? String(order.client_code)
            : (order.client || "-");
        return [
          getSoNumber(order),
          formatStatusLabel(order.done),
          order.next_action ? formatDate(order.next_action) : "-",
          order.so_delivery_date ? formatDate(order.so_delivery_date) : "-",
          order.vessel_name || "-",
          getDestinationDisplay(order),
          order.internal_remark || "-",
          order.vsls_agent_dtls || "-",
          clientCode,
          order.pic_name || "-",
          order.eta_date ? formatDate(order.eta_date) : "-",
          order.etb && order.etb !== false ? formatDate(order.etb) : "-",
          order.etd && order.etd !== false ? formatDate(order.etd) : "-",
          order.client_case_invoice_ref || "-",
          fileSummary,
          order.quotation || "-",
          formatDateTime(order.create_date || order.date_created || order.date_order),
          order.cancel_text ? String(order.cancel_text) : "-",
        ];
      });

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);
      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { c: 0, r: 0 },
          e: { c: headers.length - 1, r: Math.max(excelRows.length, 1) },
        }),
      };
      worksheet["!cols"] = headers.map(() => ({ wch: 22 }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Shipping Orders");
      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `shipping-orders-${dateTag}.xlsx`);
    } catch (error) {
      console.error("Failed to export shipping orders", error);
      toast({
        title: "Export failed",
        description:
          error?.response?.data?.message ||
          error?.response?.data?.result?.message ||
          error.message ||
          "Unable to export shipping orders",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleGeneratePackageLink = async (order) => {
    if (!order?.id) return;
    setMergingOrderId(order.id);
    try {
      const data = await mergeShippingOrderPackage(order.id);
      if (data.status !== "success") {
        const lines = (data.missing || []).map(
          (key) => data.missing_messages?.[key] || key
        );
        toast({
          title: "Cannot generate link",
          description: lines.join("\n\n") || data.message || "Merge failed.",
          status: "error",
          duration: 8000,
          isClosable: true,
        });
        return;
      }
      const url = resolveShippingPackageDownloadUrl(
        data.shipping_package?.full_download_url
      );
      if (!url) {
        toast({
          title: "Merge succeeded",
          description: "No download URL was returned.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      setPackageLinkData({ url, soNumber: getSoNumber(order) });
      packageLinkDisclosure.onOpen();
    } catch (error) {
      const lines = (error.missing || []).map(
        (key) => error.missing_messages?.[key] || key
      );
      toast({
        title: "Cannot generate link",
        description: lines.join("\n\n") || error.message || "Merge failed.",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setMergingOrderId(null);
    }
  };

  const handleFormSubmit = async () => {
    const hasClient = !!formData?.client_id;

    if (!formData || !hasClient) {
      toast({
        title: "Missing details",
        description: "Client is required.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSaving(true);

      const payload = applyShippingOrderFilesToPayload(
        buildPayloadFromForm(formData, false),
        formData
      );
      const response = await createShippingOrder(payload);
      const notify = notifyShippingOrderSaveResult(response, toast, { created: true });
      if (notify.ok && !notify.partial) {
        toast({
          title: "SO created",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

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

  const getEtaDisplay = (order) => prettyTableDate(order.eta_date);

  const renderTableBody = () =>
    orders.map((order, index) => {
      const rowBg = index % 2 === 0 ? tableRowBg : tableRowBgAlt;
      const nextAction = prettyTableDate(order.next_action);
      const deliveryDate = prettyTableDate(order.so_delivery_date);
      const eta = getEtaDisplay(order);
      const etb = order.etb && order.etb !== false ? prettyTableDate(order.etb) : "";
      const etd = order.etd && order.etd !== false ? prettyTableDate(order.etd) : "";
      const created = prettyTableDateTime(order.create_date || order.date_created || order.date_order);
      const destination = getDestinationDisplay(order);
      const clientValue =
        order.client_code != null && order.client_code !== false && order.client_code !== ""
          ? String(order.client_code)
          : order.client || "";
      const files = getOrderFilesForPreview(order);
      const fileCount = files.length;

      return (
        <Tr
          key={order.id || order.so_number}
          bg={rowBg}
          _hover={{ bg: hoverBg }}
          sx={{ "& td": { bg: "inherit" } }}
        >
          <Td
            {...tableCellProps}
            position="sticky"
            left={0}
            zIndex={1}
            minW={STICKY_ACTIONS_WIDTH}
            w={STICKY_ACTIONS_WIDTH}
            maxW={STICKY_ACTIONS_WIDTH}
          >
            <HStack spacing="2" justify="center">
              <Tooltip label="Edit" hasArrow>
                <IconButton
                  size="sm"
                  aria-label="Edit SO"
                  icon={<Icon as={MdEdit} />}
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => handleEdit(order)}
                />
              </Tooltip>
            </HStack>
          </Td>
          <Td
            {...tableCellProps}
            position="sticky"
            left={STICKY_ACTIONS_WIDTH}
            zIndex={1}
            minW={STICKY_SO_WIDTH}
            w={STICKY_SO_WIDTH}
            boxShadow={stickyEdgeShadow}
          >
            <Button
              variant="link"
              color={soColor}
              fontWeight="800"
              fontSize="sm"
              whiteSpace="nowrap"
              onClick={() => handleEdit(order)}
            >
              {getSoNumber(order)}
            </Button>
          </Td>
          <Td {...tableCellProps}>
            <Badge
              colorScheme={statusColorScheme(order.done)}
              variant="subtle"
              borderRadius="full"
              px={2.5}
              py={0.5}
              fontSize="xs"
              textTransform="none"
            >
              {formatStatusLabel(order.done)}
            </Badge>
          </Td>
          <Td {...tableCellProps} whiteSpace="nowrap" color={nextAction ? "inherit" : "gray.400"}>
            {nextAction || "—"}
          </Td>
          <Td {...tableCellProps} whiteSpace="nowrap" color={deliveryDate ? "inherit" : "gray.400"}>
            {deliveryDate || "—"}
          </Td>
          <Td {...tableCellProps}>
            <TruncatedText value={order.vessel_name} maxW="160px" />
          </Td>
          <Td {...tableCellProps}>
            <TruncatedText value={destination} maxW="180px" />
          </Td>
          <Td {...tableCellProps} maxW="240px">
            <TruncatedText
              value={order.internal_remark}
              maxW="220px"
              cursor={order.internal_remark && order.internal_remark !== "-" ? "pointer" : "default"}
              onClick={() => {
                if (order.internal_remark && order.internal_remark !== "-") {
                  openVslsAgentDtlsModal(order.internal_remark, "view", `Internal Remark — ${getSoNumber(order)}`);
                }
              }}
            />
          </Td>
          <Td {...tableCellProps} maxW="240px">
            <TruncatedText
              value={order.vsls_agent_dtls}
              maxW="220px"
              cursor={order.vsls_agent_dtls && order.vsls_agent_dtls !== "-" ? "pointer" : "default"}
              onClick={() => {
                if (order.vsls_agent_dtls && order.vsls_agent_dtls !== "-") {
                  openVslsAgentDtlsModal(order.vsls_agent_dtls, "view", `VSLS Agent Details — ${getSoNumber(order)}`);
                }
              }}
            />
          </Td>
          <Td {...tableCellProps}>
            <TruncatedText value={clientValue} maxW="140px" />
          </Td>
          <Td {...tableCellProps}>
            <TruncatedText value={order.pic_name} maxW="140px" />
          </Td>
          <Td {...tableCellProps} whiteSpace="nowrap" color={eta ? "inherit" : "gray.400"}>
            {eta || "—"}
          </Td>
          <Td {...tableCellProps} whiteSpace="nowrap" color={etb ? "inherit" : "gray.400"}>
            {etb || "—"}
          </Td>
          <Td {...tableCellProps} whiteSpace="nowrap" color={etd ? "inherit" : "gray.400"}>
            {etd || "—"}
          </Td>
          <Td {...tableCellProps} maxW="240px">
            <TruncatedText value={order.client_case_invoice_ref} maxW="200px" />
          </Td>
          <Td {...tableCellProps} maxW="220px">
            {fileCount === 0 ? (
              <Text color="gray.400">—</Text>
            ) : (
              <VStack align="stretch" spacing={1} minW="160px">
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="blue"
                  leftIcon={<Icon as={MdVisibility} />}
                  w="100%"
                  onClick={() => handlePreviewOrderFiles(order, 0)}
                >
                  Preview all ({fileCount})
                </Button>
                {files.map((file, idx) => {
                  const label = file.filename || file.name || `File ${file.id}`;
                  const key = `${file.__fileKind || "attachment"}-${order.id}-${file.id}`;
                  const isDownloading = downloadingFileKey === key;
                  return (
                    <HStack key={key} spacing={1} align="center">
                      <Tooltip label={label} placement="top" hasArrow>
                        <Text fontSize="xs" isTruncated flex={1} color="blue.700" fontWeight="500">
                          {isDownloading ? "Downloading…" : label}
                        </Text>
                      </Tooltip>
                      <IconButton
                        icon={<Icon as={MdVisibility} />}
                        size="xs"
                        variant="outline"
                        colorScheme="blue"
                        aria-label={`Preview ${label}`}
                        onClick={() => handlePreviewOrderFiles(order, idx)}
                      />
                      <IconButton
                        icon={<Icon as={MdDownload} />}
                        size="xs"
                        variant="outline"
                        colorScheme="green"
                        aria-label={`Download ${label}`}
                        isLoading={isDownloading}
                        onClick={() => handleDownloadOrderFile(order, file)}
                      />
                    </HStack>
                  );
                })}
              </VStack>
            )}
          </Td>
          <Td {...tableCellProps} maxW="160px">
            <Button
              size="xs"
              colorScheme="blue"
              variant="outline"
              isLoading={mergingOrderId === order.id}
              loadingText="Merging"
              onClick={() => handleGeneratePackageLink(order)}
            >
              Generate Link
            </Button>
          </Td>
          <Td {...tableCellProps}>
            <TruncatedText value={order.quotation} maxW="140px" />
          </Td>
          <Td {...tableCellProps} whiteSpace="nowrap" color={created ? "inherit" : "gray.400"}>
            {created || "—"}
          </Td>
          <Td {...tableCellProps} maxW="240px">
            <TruncatedText value={order.cancel_text} maxW="200px" />
          </Td>
        </Tr>
      );
    });

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
          {(searchClientFilter || searchVesselFilter || searchCountryFilter || searchPicFilter || searchStatusFilter) && (
            <Badge ml="2" colorScheme="blue" fontSize="xs">
              {(searchClientFilter ? 1 : 0) + (searchVesselFilter ? 1 : 0) + (searchCountryFilter ? 1 : 0) + (searchPicFilter ? 1 : 0) + (searchStatusFilter ? 1 : 0)}
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
            <Box flex="1" minW="200px">
              <FormControl>
                <FormLabel fontSize="xs" mb="1">Search by PIC</FormLabel>
                <SimpleSearchableSelect
                  value={searchPicFilter}
                  onChange={(value) => {
                    setSearchPicFilter(value != null && value !== "" ? value : null);
                    setPage(1);
                  }}
                  options={pics || []}
                  placeholder="Select PIC"
                  displayKey="name"
                  valueKey="id"
                  formatOption={(opt) => opt.name || `PIC ${opt.id}`}
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                />
              </FormControl>
            </Box>
            <Box flex="1" minW="200px">
              <FormControl>
                <FormLabel fontSize="xs" mb="1">Search by Status</FormLabel>
                <Select
                  size="sm"
                  value={searchStatusFilter}
                  onChange={(e) => {
                    setSearchStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="All statuses"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                >
                  <option value="">All statuses</option>
                  {SHIPPING_ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </Box>
            {(searchClientFilter || searchVesselFilter || searchCountryFilter || searchPicFilter || searchStatusFilter) && (
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
                  setSearchPicFilter(null);
                  setSearchStatusFilter("");
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
          <Flex align="center" justify="space-between" gap="3" flexWrap="wrap" w="100%">
            <Wrap spacing="3" flex="1" minW="0">
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
            <HStack spacing="3" flexShrink={0}>
              <Button
                size="sm"
                leftIcon={<Icon as={MdDownload} />}
                colorScheme="green"
                variant="outline"
                onClick={handleExportExcel}
                isLoading={isExportingExcel}
                isDisabled={isLoading}
              >
                Export Excel
              </Button>
              <Menu>
                <MenuButton
                  as={Button}
                  size="sm"
                  variant={nextActionSortOption === "next_action" ? "solid" : "outline"}
                  colorScheme={nextActionSortOption === "next_action" ? "blue" : "gray"}
                  leftIcon={<Icon as={MdSort} />}
                  flexShrink={0}
                >
                  Sort: {nextActionSortLabel}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => setNextActionSort("so_number")}>SO #</MenuItem>
                  <MenuItem onClick={() => setNextActionSort("next_action")}>Next Action</MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Flex>

          {/* Client selection when Active Client or Ready for Invoice Client chip is on */}
          {(activeFilters.activeClient || activeFilters.readyForInvoiceClient) && (
            <Box w="100%" maxW="360px">
              <FormControl>
                <FormLabel fontSize="xs" mb="1" color={textColor}>
                  {activeFilters.activeClient ? "Active Client — select client (optional)" : "Ready for Invoice Client — select client (optional)"}
                </FormLabel>
                <SimpleSearchableSelect
                  value={activeFilters.activeClient ? activeClientFilter : readyForInvoiceClientFilter}
                  onChange={(value) => {
                    const next = value != null && value !== "" ? value : null;
                    if (activeFilters.activeClient) {
                      setActiveClientFilter(next);
                    } else {
                      setReadyForInvoiceClientFilter(next);
                    }
                    setPage(1);
                  }}
                  options={clients}
                  placeholder="Search or select client"
                  displayKey="name"
                  valueKey="id"
                  formatOption={(opt) => opt.name || `Client ${opt.id}`}
                  isLoading={false}
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  size="sm"
                />
              </FormControl>
            </Box>
          )}
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
        {isLoading ? (
          <Flex justify="center" align="center" py={16}>
            <Spinner />
          </Flex>
        ) : orders.length === 0 ? (
          <VStack spacing={3} py={16} px={6} textAlign="center">
            <Icon as={MdLocalShipping} boxSize={10} color="gray.400" />
            <Text fontWeight="700" color="gray.700">
              No shipping orders found
            </Text>
            <Text fontSize="sm" color="gray.500" maxW="360px">
              {searchQuery || searchClientFilter || searchVesselFilter || searchCountryFilter || searchPicFilter || searchStatusFilter
                ? "Try clearing search or filters to see more results."
                : "Create a shipping order to see it listed here."}
            </Text>
            {!searchQuery && (
              <Button mt={1} size="sm" colorScheme="blue" leftIcon={<Icon as={MdAdd} />} onClick={handleCreate}>
                New SO
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
              <Table size="sm" variant="simple" minW="1400px">
                <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={3}>
                  <Tr>
                    {SHIPPING_ORDER_TABLE_COLUMNS.map((col, colIndex) => {
                      const isActions = colIndex === 0;
                      const isSoNumber = colIndex === 1;
                      const isSticky = isActions || isSoNumber;
                      return (
                        <Th
                          key={col.label}
                          {...tableHeaderCellProps}
                          minW={isActions ? STICKY_ACTIONS_WIDTH : isSoNumber ? STICKY_SO_WIDTH : "130px"}
                          w={isActions ? STICKY_ACTIONS_WIDTH : isSoNumber ? STICKY_SO_WIDTH : undefined}
                          maxW={isActions ? STICKY_ACTIONS_WIDTH : isSoNumber ? STICKY_SO_WIDTH : undefined}
                          position={isSticky ? "sticky" : "relative"}
                          left={isActions ? 0 : isSoNumber ? STICKY_ACTIONS_WIDTH : undefined}
                          top={isSticky ? 0 : undefined}
                          zIndex={isSticky ? 4 : undefined}
                          bg={tableHeaderBg}
                          boxShadow={isSoNumber ? stickyEdgeShadow : undefined}
                          cursor={col.field === "next_action" ? "pointer" : undefined}
                          onClick={col.field === "next_action" ? cycleNextActionColumnSort : undefined}
                          _hover={col.field === "next_action" ? { bg: hoverBg } : undefined}
                        >
                          <HStack spacing="1">
                            <Text>{col.label}</Text>
                            {col.field === "next_action" && nextActionSortOption === "next_action" && (
                              <Text fontSize="xs">↓</Text>
                            )}
                          </HStack>
                        </Th>
                      );
                    })}
                  </Tr>
                </Thead>
                <Tbody>{renderTableBody()}</Tbody>
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
                  <Button size="sm" variant="outline" onClick={() => setPage(1)} isDisabled={!hasPrevious || page === 1}>
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

      {/* Shipping package download link (shown only after merge) */}
      <Modal
        isOpen={packageLinkDisclosure.isOpen}
        onClose={packageLinkDisclosure.onClose}
        size="lg"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Package download link — {packageLinkData.soNumber}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" mb={3} color={tableTextColor}>
              CIPL and stock report PDFs were merged. Share this link to download the package.
            </Text>
            <Input
              value={packageLinkData.url}
              isReadOnly
              size="sm"
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              leftIcon={<Icon as={MdContentCopy} />}
              colorScheme="blue"
              mr={3}
              onClick={async () => {
                try {
                  if (packageLinkData.url) {
                    await navigator.clipboard.writeText(packageLinkData.url);
                    toast({
                      title: "Link copied",
                      status: "success",
                      duration: 2000,
                      isClosable: true,
                    });
                  }
                } catch {
                  toast({
                    title: "Copy failed",
                    status: "error",
                    duration: 2000,
                    isClosable: true,
                  });
                }
              }}
            >
              Copy link
            </Button>
            <Button variant="ghost" onClick={packageLinkDisclosure.onClose}>
              Close
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
                  if (editingPicFilter) {
                    handlePicChipSelectionChange(editingPicFilter, values);
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

      {galleryModal}
    </Box>
  );
};

export default SoNumberTab;

