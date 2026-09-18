import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  Spinner,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { useLocation } from "react-router-dom";
import {
  MdRefresh,
  MdFileDownload,
  MdSearch,
  MdPictureAsPdf,
  MdTableChart,
} from "react-icons/md";
import clientStockApi from "api/clientStock";
import clientVesselApi from "api/clientVessel";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  getClientPortalStatusOptionsForActiveFilter,
  formatStockStatusLabel,
  isArchiveStockStatus,
  normalizeStockStatusKey,
  resolveClientPortalNavStockStatus,
  resolveStockListActiveParam,
} from "constants/stockStatus";
import { getAttachmentEntriesNewestFirst } from "utils/stockReportAttachmentsUi";
import { normalizeLegacyStockReportFilename } from "utils/stockReportPdf";
import StockListAttachmentsCell from "components/stock-list/StockListAttachmentsCell";
import StockCellText, { getStockCellTooltip } from "components/stock-list/StockCellText";
import StockSoNumberLink from "components/stock-list/StockSoNumberLink";
import { openClientShippingOrdersFiltered } from "utils/shippingOrderListState";
import StockReportHistoryModal from "components/stock-list/StockReportHistoryModal";
import { useStockAttachmentsGallery } from "hooks/useStockAttachmentsGallery";
import StockHubSortMenuItems from "components/stock-list/StockHubSortMenuItems";
import {
  StockStatusBadge,
  getStockRowStatusStyle,
} from "components/stock-list/StockStatusBadge";
import {
  getStockHubSortField,
  isStockHubSortOption,
} from "constants/stockHubSort";
import {
  getClientStockSortButtonLabel,
  mapStockSortOptionToApiSortBy,
} from "utils/stockSortOptions";
import { formatStockValueDisplay } from "utils/stockValue";
import { formatStockDestinationDisplay, getStockM2OId } from "utils/stockDestinationOptions";
import {
  getStockEffectiveHubDisplay,
  getStockOriginDisplay,
  getStockViaHub1Display,
  getStockViaHub2Display,
  resolveStockLocationOptionId,
} from "utils/stockLocationOptions";
import clientHubApi, { getClientHubFilterId, toClientHubOptionValue } from "api/clientHub";
import { clearClientNavigationState } from "views/client/dashboard/clientDashboardNavigation";
import * as XLSX from "xlsx";

const toClientStockDisplay = (value) => {
  if (value == null || value === false || value === "") return "-";
  if (typeof value === "object") {
    const name = value.name || value.label || value.display_name;
    return name != null && name !== false && String(name).trim() !== "" ? String(name).trim() : "-";
  }
  const text = String(value).trim();
  return !text || text === "[object Object]" ? "-" : text;
};

const mapClientStockRows = (stockList, clientName = "") =>
  (Array.isArray(stockList) ? stockList : [])
    .filter((item) => normalizeStockStatusKey(item.stock_status) !== "cancelled")
    .map((item, idx) => {
    const stockStatusRaw = item.stock_status;
    const stockStatusKey = normalizeStockStatusKey(stockStatusRaw);
    const reportEntries = getAttachmentEntriesNewestFirst(item.attachments);
    const reportAttachments = reportEntries.map((e) => e.att);
    return {
      id: `${item.id ?? item.stock_item_id ?? "stock"}-${idx}`,
      stockRecordId: item.id,
      stockItemId: item.stock_item_id ?? item.stock_id,
      stockStatusKey,
      attachmentEntries: reportEntries,
      reportAttachments,
      latestReport: reportEntries[0]?.att ?? null,
      previousReportEntries: reportEntries.slice(1),
      client: toClientStockDisplay(item.client?.name || clientName),
      dateOnStock: toClientStockDisplay(item.date_on_stock || item.first_entry_date),
      firstEntryDate: toClientStockDisplay(item.first_entry_date || item.date_on_stock),
      vessel: toClientStockDisplay(item.vessel?.name || item.vessel),
      stockNumber: toClientStockDisplay(item.stock_number || item.stock_item_id),
      supplier: toClientStockDisplay(item.supplier?.name || item.supplier),
      poNo:
        Array.isArray(item.po_number) && item.po_number.length
          ? item.po_number.map((x) => String(x)).join(", ")
          : toClientStockDisplay(item.po_text),
      reqNo:
        Array.isArray(item.req_no) && item.req_no.length
          ? item.req_no.map((x) => String(x)).join(", ")
          : toClientStockDisplay(item.req_no).replace(/\n+/g, ", "),
      dgUnNumber: toClientStockDisplay(item.dg_un_number || item.dg_un),
      boxes: toClientStockDisplay(item.boxes ?? item.box ?? item.pieces ?? item.pcs?.count),
      weight: formatStockValueDisplay(item.weight ?? item.weight_kg),
      totalVolumeCbm: formatStockValueDisplay(item.total_volume_cbm),
      origin: toClientStockDisplay(getStockOriginDisplay(item)),
      location: toClientStockDisplay(getStockEffectiveHubDisplay(item)),
      firstEntryLocation: toClientStockDisplay(getStockOriginDisplay(item)),
      viaHub1: toClientStockDisplay(getStockViaHub1Display(item)),
      viaHub2: toClientStockDisplay(getStockViaHub2Display(item)),
      effectiveHub: toClientStockDisplay(getStockEffectiveHubDisplay(item)),
      apDestination: toClientStockDisplay(formatStockDestinationDisplay(item, "ap")),
      destinationId: getStockM2OId(item.narvi_stock_destination),
      destination: toClientStockDisplay(formatStockDestinationDisplay(item, "destination")),
      stockStatus: toClientStockDisplay(stockStatusRaw),
      stockStatusRaw,
      so_id: item.so_id,
      stock_so_number: item.stock_so_number,
      so_number: item.so_number,
      soNumber: toClientStockDisplay(item.so_number || item.stock_so_number || item.so_id),
      currency: toClientStockDisplay(item.currency),
      value: formatStockValueDisplay(item.value),
      deliveryIrregularities: toClientStockDisplay(item.delivery_irregularities),
      remarks: toClientStockDisplay(item.remarks),
      poRemarks: toClientStockDisplay(item.po_remarks),
      createDate: toClientStockDisplay(item.create_date),
      writeDate: toClientStockDisplay(item.write_date),
      locationHistory: Array.isArray(item.location_history) ? item.location_history : [],
      pcsLines: Array.isArray(item.pcs?.lines)
        ? item.pcs.lines
        : Array.isArray(item.dimensions)
          ? item.dimensions
          : [],
      pcsCount: item.pcs?.count ?? item.pieces ?? item.boxes ?? item.box ?? 0,
      shippingDoc: toClientStockDisplay(item.shipping_doc),
      exportDoc1: toClientStockDisplay(item.export_doc),
      exportDoc2: toClientStockDisplay(item.export_doc_2),
    };
  });

const resolveReportDownloadFilename = (attachment, response) => {
  const name = attachment?.filename || attachment?.name;
  if (name && String(name).trim()) {
    return normalizeLegacyStockReportFilename(String(name).trim());
  }
  const fromHeader = response?.filename;
  if (fromHeader) return normalizeLegacyStockReportFilename(fromHeader);
  return "stock-report.pdf";
};

const EMPTY_CLIENT_STOCK_FILTERS = {
  fromDate: "",
  toDate: "",
  vessel: "",
  status: "",
  location: "",
  destination: "",
  poNumber: "",
  reqNo: "",
};

const PAGE_COPY = {
  title: "Stock Report",
  excelSheet: "Stock Report",
  excelFilePrefix: "stock-report",
  loadingLabel: "Loading stock report...",
  emptyLabel: "No stock records found.",
  searchPlaceholder: "Search stock id, remarks, origin, vessel...",
};

const CLIENT_STOCK_SEARCH_KEYS = [
  "stockItemId",
  "stockNumber",
  "vessel",
  "supplier",
  "poNo",
  "reqNo",
  "origin",
  "destination",
  "viaHub1",
  "viaHub2",
  "apDestination",
  "soNumber",
  "client",
  "remarks",
  "poRemarks",
  "shippingDoc",
  "stockStatus",
  "dgUnNumber",
  "location",
  "effectiveHub",
  "exportDoc1",
  "exportDoc2",
];

const STOCK_STATUS_SORT_ORDER = [
  "pending",
  "stock",
  "in_transit",
  "arrived",
  "on_shipping",
  "on_delivery",
  "irregular",
];

const STOCK_STATUS_SORT_ALIASES = {
  arrived_dest: "arrived",
  arrived_destination: "arrived",
  on_a_shipping_instr: "on_shipping",
  on_a_shipping_instruction: "on_shipping",
  on_a_shipping_order: "on_shipping",
  on_shipping: "on_shipping",
  on_a_delivery_instr: "on_delivery",
  on_a_delivery_instruction: "on_delivery",
  on_a_delivery_order: "on_delivery",
  on_delivery: "on_delivery",
  irregularities: "irregular",
  irregular: "irregular",
};

const hasClientStockDisplayValue = (value) => {
  const text = String(value ?? "").trim();
  return Boolean(text) && text !== "-";
};

const filterClientStockSearch = (rows, query) => {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    CLIENT_STOCK_SEARCH_KEYS.some((key) => {
      const value = row[key];
      if (!hasClientStockDisplayValue(value)) return false;
      return String(value).toLowerCase().includes(q);
    })
  );
};

const filterClientStockByHubSort = (rows, sortOption) => {
  if (!isStockHubSortOption(sortOption)) return rows;
  return rows.filter((row) => {
    if (sortOption === "origin_ap_destination") {
      return hasClientStockDisplayValue(row.origin) && hasClientStockDisplayValue(row.apDestination);
    }
    if (sortOption === "via_hub") return hasClientStockDisplayValue(row.viaHub1);
    if (sortOption === "via_hub_ap_destination") {
      return hasClientStockDisplayValue(row.viaHub1) && hasClientStockDisplayValue(row.apDestination);
    }
    if (sortOption === "via_hub_via_hub2") {
      return hasClientStockDisplayValue(row.viaHub1) && hasClientStockDisplayValue(row.viaHub2);
    }
    if (sortOption === "via_hub_via_hub2_ap_destination") {
      return (
        hasClientStockDisplayValue(row.viaHub1) &&
        hasClientStockDisplayValue(row.viaHub2) &&
        hasClientStockDisplayValue(row.apDestination)
      );
    }
    return true;
  });
};

const normalizeStatusForClientSort = (status) => {
  const key = normalizeStockStatusKey(status);
  return STOCK_STATUS_SORT_ALIASES[key] || key;
};

const sortClientStockRows = (rows, sortOption) => {
  if (!sortOption || sortOption === "none") return rows;
  const next = [...rows];
  const getViaHub1 = (row) =>
    String(row.viaHub1 && row.viaHub1 !== "-" ? row.viaHub1 : "").toLowerCase().trim();
  const getViaHub2 = (row) =>
    String(row.viaHub2 && row.viaHub2 !== "-" ? row.viaHub2 : "").toLowerCase().trim();
  const getApDestination = (row) =>
    String(row.apDestination && row.apDestination !== "-" ? row.apDestination : "").toLowerCase().trim();
  const getViaHub = (row) =>
    String(row.viaHub2 && row.viaHub2 !== "-" ? row.viaHub2 : row.viaHub1 || "").toLowerCase().trim();
  const getEffectiveHub = (row) => {
    const explicit = row.effectiveHub != null && row.effectiveHub !== "-" ? String(row.effectiveHub) : "";
    if (explicit.trim()) return explicit.toLowerCase().trim();
    return getViaHub(row);
  };
  const getVessel = (row) => String(row.vessel || "").toLowerCase().trim();
  const compareStatus = (a, b) => {
    const aStatus = normalizeStatusForClientSort(a.stockStatusRaw || a.stockStatus);
    const bStatus = normalizeStatusForClientSort(b.stockStatusRaw || b.stockStatus);
    const aRank = STOCK_STATUS_SORT_ORDER.indexOf(aStatus);
    const bRank = STOCK_STATUS_SORT_ORDER.indexOf(bStatus);
    const aOrder = aRank >= 0 ? aRank : 999;
    const bOrder = bRank >= 0 ? bRank : 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return aStatus.localeCompare(bStatus);
  };

  if (isStockHubSortOption(sortOption)) {
    const hubSortField = getStockHubSortField(sortOption);
    const getHubSortValue = (row) => {
      if (hubSortField === "narvi_stock_via_hub1") return getViaHub1(row);
      if (hubSortField === "narvi_stock_via_hub2") return getViaHub2(row);
      if (hubSortField === "narvi_stock_ap_destination") return getApDestination(row);
      return getEffectiveHub(row);
    };
    next.sort((a, b) => getHubSortValue(a).localeCompare(getHubSortValue(b)));
    return next;
  }
  if (sortOption === "via_vessel") {
    next.sort((a, b) => getVessel(a).localeCompare(getVessel(b)));
    return next;
  }
  if (sortOption === "status") {
    next.sort(compareStatus);
    return next;
  }
  if (sortOption === "via_hub_status") {
    next.sort((a, b) => {
      const hubCmp = getEffectiveHub(a).localeCompare(getEffectiveHub(b));
      if (hubCmp !== 0) return hubCmp;
      return compareStatus(a, b);
    });
    return next;
  }
  if (sortOption === "via_vessel_status") {
    next.sort((a, b) => {
      const vesselCmp = getVessel(a).localeCompare(getVessel(b));
      if (vesselCmp !== 0) return vesselCmp;
      return compareStatus(a, b);
    });
    return next;
  }
  if (sortOption === "via_vessel_via_hub_status") {
    next.sort((a, b) => {
      const vesselCmp = getVessel(a).localeCompare(getVessel(b));
      if (vesselCmp !== 0) return vesselCmp;
      const hubCmp = getEffectiveHub(a).localeCompare(getEffectiveHub(b));
      if (hubCmp !== 0) return hubCmp;
      return compareStatus(a, b);
    });
    return next;
  }
  return next;
};

const applyClientStockSearchSort = (rows, searchQuery, sortOption) =>
  sortClientStockRows(
    filterClientStockByHubSort(filterClientStockSearch(rows, searchQuery), sortOption),
    sortOption
  );

const formatClientStockReportNames = (row) => {
  const names = (row?.reportAttachments || [])
    .map((att) => String(att?.filename || att?.name || "").trim())
    .filter(Boolean);
  return names.length ? names.join(", ") : "-";
};

const CLIENT_STOCK_EXPORT_COLUMNS = [
  { header: "Vessel", value: (row) => row.vessel || "-" },
  { header: "Stock ID", value: (row) => row.stockItemId || "-" },
  { header: "Supplier", value: (row) => row.supplier || "-" },
  { header: "Req No", value: (row) => row.reqNo || "-" },
  { header: "PO#", value: (row) => row.poNo || "-" },
  { header: "Stock Status", value: (row) => row.stockStatus || "-" },
  { header: "Date On Stock", value: (row) => row.dateOnStock || "-" },
  { header: "Boxes", value: (row) => row.boxes || "-" },
  { header: "Weight", value: (row) => row.weight || "-" },
  { header: "Total Volume CBM", value: (row) => row.totalVolumeCbm || "-" },
  { header: "Origin", value: (row) => row.origin || "-" },
  { header: "Via Hub 1", value: (row) => row.viaHub1 || "-" },
  { header: "Via Hub 2", value: (row) => row.viaHub2 || "-" },
  { header: "AP Destination", value: (row) => row.apDestination || "-" },
  { header: "Destination", value: (row) => row.destination || "-" },
  { header: "SO Number", value: (row) => row.soNumber || "-" },
  { header: "Currency", value: (row) => row.currency || "-" },
  { header: "Value", value: (row) => row.value || "-" },
  { header: "Client", value: (row) => row.client || "-" },
  { header: "DG/UN Number", value: (row) => row.dgUnNumber || "-" },
  { header: "Report", value: (row) => formatClientStockReportNames(row) },
];
const DEFAULT_ACTIVE_FILTER = "true";

const getClientStockNavState = (location) => {
  const state = location?.state;
  if (!state || typeof state !== "object") {
    return {
      selectedVessel: "",
      selectedVesselId: null,
      hubValue: "",
      stockStatus: "",
      hasNavFilters: false,
    };
  }
  const selectedVessel = state.selectedVessel ? String(state.selectedVessel) : "";
  const selectedVesselId =
    state.selectedVesselId != null && state.selectedVesselId !== false
      ? state.selectedVesselId
      : null;
  const hubValue = toClientHubOptionValue({
    id: state.selectedHubId,
    name: state.selectedHubLocation,
  });
  const stockStatus = state.dashboardFilter?.stockStatus
    ? String(state.dashboardFilter.stockStatus)
    : "";
  return {
    selectedVessel,
    selectedVesselId,
    hubValue,
    stockStatus,
    hasNavFilters: Boolean(
      selectedVessel ||
        selectedVesselId != null ||
        hubValue ||
        stockStatus ||
        state.selectedHubId != null ||
        state.selectedHubLocation
    ),
  };
};

const getInitialClientStockFilters = (nav) => ({
  ...EMPTY_CLIENT_STOCK_FILTERS,
  vessel: nav.selectedVessel || "",
  location: nav.hubValue || "",
  status: resolveClientPortalNavStockStatus(nav.stockStatus),
});

function ClientStockReportView() {
  const location = useLocation();
  const [stockRows, setStockRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [filters, setFilters] = useState(() =>
    getInitialClientStockFilters(getClientStockNavState(location))
  );
  const [navVesselId, setNavVesselId] = useState(
    () => getClientStockNavState(location).selectedVesselId
  );
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [poNumberQuery, setPoNumberQuery] = useState("");
  const [reqNoQuery, setReqNoQuery] = useState("");
  const [entries, setEntries] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [vesselFilterOptions, setVesselFilterOptions] = useState([]);
  const [hubFilterOptions, setHubFilterOptions] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkReportLoading, setIsBulkReportLoading] = useState(false);
  const [reportPreviewItems, setReportPreviewItems] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [loadingReportKey, setLoadingReportKey] = useState(null);
  const [isDimensionsModalOpen, setIsDimensionsModalOpen] = useState(false);
  const [selectedDimensions, setSelectedDimensions] = useState([]);
  const [clientSortOption, setClientSortOption] = useState("none");
  const [activeFilter, setActiveFilter] = useState(() => {
    const stockStatus = resolveClientPortalNavStockStatus(
      getClientStockNavState(location).stockStatus
    );
    if (stockStatus) {
      return isArchiveStockStatus(stockStatus) ? "false" : "true";
    }
    return DEFAULT_ACTIVE_FILTER;
  });
  const [previousReportsModal, setPreviousReportsModal] = useState({
    isOpen: false,
    entries: [],
    stockRecordId: null,
    stockStatusKey: null,
    rowId: null,
  });
  const toast = useToast();

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const tableBorderColor = useColorModeValue(
    "rgba(226, 232, 240, 0.85)",
    "rgba(255, 255, 255, 0.14)"
  );
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const headingColor = useColorModeValue("navy.700", "white");
  const tableHeaderBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const tableRowHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");
  const tableRowEvenBg = useColorModeValue("blackAlpha.50", "whiteAlpha.50");
  const tableOverlayBg = useColorModeValue("whiteAlpha.800", "blackAlpha.500");

  const statusFilterOptions = useMemo(
    () => getClientPortalStatusOptionsForActiveFilter(activeFilter),
    [activeFilter]
  );

  const resolvedVesselId = useMemo(() => {
    const fromOptions = vesselFilterOptions.find((v) => v.name === filters.vessel)?.id;
    return fromOptions ?? navVesselId ?? undefined;
  }, [filters.vessel, navVesselId, vesselFilterOptions]);

  const usesLocalSearchSort =
    Boolean(String(searchQuery || "").trim()) ||
    Boolean(clientSortOption && clientSortOption !== "none");
  const fetchPage = usesLocalSearchSort ? 1 : currentPage;

  const buildStockQueryParams = useCallback(
    (overrides = {}) => {
      const hubValue = String(filters.location || "").trim();
      const hubId = hubValue && !hubValue.startsWith("name:") ? getClientHubFilterId(hubValue) : null;
      const hubName = hubValue.startsWith("name:") ? hubValue.slice(5) : "";
      const destinationValue = String(filters.destination || "").trim();
      const destinationId = resolveStockLocationOptionId(destinationValue);
      return {
        search: searchQuery || undefined,
        name: searchQuery || undefined,
        stock_status: resolveClientPortalNavStockStatus(filters.status) || undefined,
        sort_by: mapStockSortOptionToApiSortBy(clientSortOption),
        date_from: filters.fromDate || undefined,
        date_to: filters.toDate || undefined,
        date_on_stock_from: filters.fromDate || undefined,
        date_on_stock_to: filters.toDate || undefined,
        vessel_id: resolvedVesselId,
        narvi_stock_via_hub1: hubId != null ? hubId : undefined,
        via_hub: hubId == null && hubName ? hubName : undefined,
        hub: hubId == null && hubName ? hubName : undefined,
        po_text: poNumberQuery || undefined,
        req_no: reqNoQuery || undefined,
        narvi_stock_destination: destinationId ?? undefined,
        destination: destinationId == null && destinationValue ? destinationValue : undefined,
        active: resolveStockListActiveParam(activeFilter),
        ...overrides,
      };
    },
    [
      activeFilter,
      clientSortOption,
      filters.destination,
      filters.fromDate,
      filters.location,
      filters.status,
      filters.toDate,
      poNumberQuery,
      reqNoQuery,
      resolvedVesselId,
      searchQuery,
    ]
  );

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const pageSize = Number(entries) || 50;
      const res = await clientStockApi.getClientStock(
        buildStockQueryParams(
          usesLocalSearchSort
            ? { fetch_all: true }
            : { page: fetchPage, page_size: pageSize }
        )
      );
      const nextClientName = res?.client?.name || "";
      setStockRows(mapClientStockRows(res?.stock_list, nextClientName));
      setClientName(nextClientName);
      if (!usesLocalSearchSort) {
        setTotalCount(res.total_count ?? res.count ?? 0);
        setTotalPages(Math.max(1, res.total_pages || 1));
        setHasNext(Boolean(res.has_next));
        setHasPrevious(Boolean(res.has_previous));
      }
    } catch (_e) {
      setStockRows([]);
      setClientName("");
      setTotalCount(0);
      setTotalPages(1);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  }, [buildStockQueryParams, entries, fetchPage, usesLocalSearchSort]);

  const fetchVesselFilterOptions = useCallback(async () => {
    try {
      const res = await clientVesselApi.getClientVessels({});
      const options = (Array.isArray(res?.vessels) ? res.vessels : [])
        .map((v) => ({
          id: typeof v === "object" ? v?.id : undefined,
          name: typeof v === "string" ? v : v?.name,
        }))
        .filter((v) => typeof v.name === "string" && v.name.trim() !== "")
        .map((v) => ({ ...v, name: v.name.trim() }));
      const unique = [];
      const seen = new Set();
      options.forEach((option) => {
        const key = option.id != null ? `id-${option.id}` : `name-${option.name}`;
        if (seen.has(key)) return;
        seen.add(key);
        unique.push(option);
      });
      setVesselFilterOptions(unique);
    } catch (_error) {
      setVesselFilterOptions([]);
    }
  }, []);

  const fetchHubFilterOptions = useCallback(async () => {
    try {
      const res = await clientHubApi.getClientHubs({});
      const options = (Array.isArray(res?.hubs) ? res.hubs : [])
        .map((h) => {
          const name = typeof h === "string" ? h : h?.name || h?.hub;
          const value = toClientHubOptionValue(h);
          if (!name || !value) return null;
          return { id: value, name: String(name).trim() };
        })
        .filter(Boolean);
      const unique = [];
      const seen = new Set();
      options.forEach((option) => {
        if (seen.has(option.id)) return;
        seen.add(option.id);
        unique.push(option);
      });
      setHubFilterOptions(unique);
    } catch (_error) {
      setHubFilterOptions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = search.trim();
      if (nextQuery === searchQuery) return;
      setSearchQuery(nextQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = String(filters.poNumber || "").trim();
      if (nextQuery === poNumberQuery) return;
      setPoNumberQuery(nextQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.poNumber, poNumberQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const nextQuery = String(filters.reqNo || "").trim();
      if (nextQuery === reqNoQuery) return;
      setReqNoQuery(nextQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.reqNo, reqNoQuery]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    fetchVesselFilterOptions();
    fetchHubFilterOptions();
  }, [fetchHubFilterOptions, fetchVesselFilterOptions]);

  const processedRows = useMemo(
    () => applyClientStockSearchSort(stockRows, searchQuery, clientSortOption),
    [clientSortOption, searchQuery, stockRows]
  );
  const pageSize = Number(entries) || 50;
  const visibleTotalCount = usesLocalSearchSort ? processedRows.length : totalCount;
  const visibleTotalPages = usesLocalSearchSort
    ? Math.max(1, Math.ceil((processedRows.length || 0) / pageSize) || 1)
    : totalPages;
  const visibleHasNext = usesLocalSearchSort ? currentPage < visibleTotalPages : hasNext;
  const visibleHasPrevious = usesLocalSearchSort ? currentPage > 1 : hasPrevious;
  const pagedRows = useMemo(() => {
    if (!usesLocalSearchSort) return processedRows;
    const start = (currentPage - 1) * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [currentPage, pageSize, processedRows, usesLocalSearchSort]);
  const pageStart = visibleTotalCount ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min((currentPage - 1) * pageSize + pagedRows.length, visibleTotalCount);

  useEffect(() => {
    if (currentPage > visibleTotalPages) {
      setCurrentPage(visibleTotalPages);
    }
  }, [currentPage, visibleTotalPages]);

  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedRowIds.includes(row.id));

  useEffect(() => {
    const availableIds = new Set(processedRows.map((row) => row.id));
    setSelectedRowIds((prev) => {
      const next = prev.filter((id) => availableIds.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [processedRows]);

  const handleFilterChange = (key, value) => {
    if (key === "vessel") setNavVesselId(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (["fromDate", "toDate", "vessel", "status", "location", "destination"].includes(key)) {
      setCurrentPage(1);
    }
  };

  const handleActiveFilterChange = (showActive) => {
    const next = showActive ? "true" : "false";
    setActiveFilter(next);
    setFilters((prev) => {
      const statusStillValid = getClientPortalStatusOptionsForActiveFilter(next).some(
        (option) => option.value === prev.status
      );
      if (prev.status && !statusStillValid) {
        return { ...prev, status: "" };
      }
      return prev;
    });
    setCurrentPage(1);
  };

  const handleSortChange = (value) => {
    setClientSortOption(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    const nav = getClientStockNavState(location);
    if (!nav.hasNavFilters) return;

    if (nav.stockStatus) {
      const resolvedStatus = resolveClientPortalNavStockStatus(nav.stockStatus);
      setActiveFilter(resolvedStatus && isArchiveStockStatus(resolvedStatus) ? "false" : "true");
    }
    if (nav.selectedVesselId != null) {
      setNavVesselId(nav.selectedVesselId);
    }
    setFilters((prev) => {
      const next = {
        ...prev,
        vessel: nav.selectedVessel || prev.vessel,
        location: nav.hubValue || prev.location,
        status: resolveClientPortalNavStockStatus(nav.stockStatus) || prev.status,
      };
      if (
        next.vessel === prev.vessel &&
        next.location === prev.location &&
        next.status === prev.status
      ) {
        return prev;
      }
      return next;
    });
    setCurrentPage(1);
    clearClientNavigationState();
  }, [location]);

  const handleReset = () => {
    setNavVesselId(null);
    setFilters({ ...EMPTY_CLIENT_STOCK_FILTERS });
    setSearch("");
    setSearchQuery("");
    setPoNumberQuery("");
    setReqNoQuery("");
    setClientSortOption("none");
    setEntries("50");
    setCurrentPage(1);
    setSelectedRowIds([]);
    setActiveFilter(DEFAULT_ACTIVE_FILTER);
  };
  const formatStatus = (status) => formatStockStatusLabel(status, statusFilterOptions);

  const vesselOptions = useMemo(() => {
    if (vesselFilterOptions.length) return vesselFilterOptions;
    return Array.from(
      new Set(stockRows.map((r) => r.vessel).filter((v) => v && v !== "-"))
    ).map((name) => ({ name, id: name }));
  }, [stockRows, vesselFilterOptions]);
  const locationOptions = useMemo(() => {
    if (hubFilterOptions.length) return hubFilterOptions;
    return Array.from(
      new Set(stockRows.map((r) => r.effectiveHub).filter((v) => v && v !== "-"))
    ).map((name) => ({ id: `name:${name}`, name }));
  }, [stockRows, hubFilterOptions]);
  const destinationOptions = useMemo(() => {
    const unique = [];
    const seen = new Set();
    const add = (id, name) => {
      const label = String(name || "").trim();
      if (!label || label === "-") return;
      const value = id != null && String(id).trim() !== "" ? String(id) : label;
      if (seen.has(value)) return;
      seen.add(value);
      unique.push({ id: value, name: label });
    };
    stockRows.forEach((row) => add(row.destinationId, row.destination));
    if (filters.destination) {
      const selected = unique.find(
        (opt) => opt.id === filters.destination || opt.name === filters.destination
      );
      if (!selected) add(filters.destination, filters.destination);
    }
    return unique;
  }, [filters.destination, stockRows]);

  const reportKey = (row, attachment) => `${row.id}-${attachment?.id ?? attachment?.filename}`;

  const fetchReportBlob = async (row, attachment, forceDownload) => {
    const stockRecordId = row.stockRecordId ?? row.stockItemId;
    if (!stockRecordId || attachment?.id == null) {
      throw new Error("Report file is not available for this row.");
    }
    return clientStockApi.downloadClientStockAttachmentApi(
      stockRecordId,
      attachment,
      forceDownload
    );
  };

  const resolveClientStockPreviewUrl = useCallback(async (attachment, stockItemId) => {
    if (!stockItemId || attachment?.id == null) {
      throw new Error("Report file is not available.");
    }
    const response = await clientStockApi.downloadClientStockAttachmentApi(
      stockItemId,
      attachment,
      false
    );
    if (!(response?.data instanceof Blob)) {
      throw new Error("Could not load file.");
    }
    return {
      fileUrl: URL.createObjectURL(response.data),
      mimeType: response.type || attachment.mimetype || "application/pdf",
      filename: resolveReportDownloadFilename(attachment, response),
      shouldRevoke: true,
    };
  }, []);

  const { openGallery, galleryModal } = useStockAttachmentsGallery({
    resolvePreviewUrl: resolveClientStockPreviewUrl,
  });

  const handleOpenPreviousReports = (entries, stockRecordId, stockStatusKey, rowId) => {
    setPreviousReportsModal({
      isOpen: true,
      entries: entries || [],
      stockRecordId,
      stockStatusKey,
      rowId,
    });
  };

  const handleClosePreviousReports = () => {
    setPreviousReportsModal({
      isOpen: false,
      entries: [],
      stockRecordId: null,
      stockStatusKey: null,
      rowId: null,
    });
  };

  const handlePreviewAllAttachments = (row, attachments, startIndex = 0) => {
    const stockRecordId = row.stockRecordId ?? row.stockItemId;
    const list = Array.isArray(attachments) ? attachments.filter((a) => a?.id != null) : [];
    if (!stockRecordId || !list.length) return;
    openGallery(list, stockRecordId, startIndex);
  };

  const triggerBrowserDownload = (blobUrl, filename) => {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearPreviewUrls = useCallback((items = []) => {
    items.forEach((item) => {
      if (item?.blobUrl) URL.revokeObjectURL(item.blobUrl);
    });
  }, []);

  const handleCloseReportPreview = useCallback(() => {
    setIsReportPreviewOpen(false);
    setActivePreviewIndex(0);
    setReportPreviewItems((prev) => {
      clearPreviewUrls(prev);
      return [];
    });
  }, [clearPreviewUrls]);

  useEffect(() => {
    return () => {
      clearPreviewUrls(reportPreviewItems);
    };
  }, [clearPreviewUrls, reportPreviewItems]);

  const buildPreviewItemsFromRows = async (rows) => {
    const nextPreviewItems = [];
    for (const rowItem of rows) {
      const reports = rowItem.reportAttachments || [];
      if (!reports.length) continue;
      const latest = reports[0];
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchReportBlob(
        { stockRecordId: rowItem.stockRecordId, stockItemId: rowItem.stockItemId },
        latest,
        false
      );
      if (!(response?.data instanceof Blob)) continue;
      const blobUrl = URL.createObjectURL(response.data);
      nextPreviewItems.push({
        rowId: rowItem.id,
        stockItemId: rowItem.stockItemId,
        attachmentId: latest.id,
        filename: resolveReportDownloadFilename(latest, response),
        blobUrl,
      });
    }
    return nextPreviewItems;
  };

  const handleOpenReportPreview = async (rows) => {
    const eligible = rows.filter((r) => (r.reportAttachments?.length || 0) > 0);
    if (!eligible.length) {
      toast({
        title: "No reports available",
        description: "Selected rows do not have uploaded attachments.",
        status: "info",
        duration: 3500,
        isClosable: true,
      });
      return;
    }

    setIsPreparingPreview(true);
    try {
      const nextPreviewItems = await buildPreviewItemsFromRows(eligible);
      if (!nextPreviewItems.length) {
        throw new Error("Could not load report files.");
      }
      setReportPreviewItems((prev) => {
        clearPreviewUrls(prev);
        return nextPreviewItems;
      });
      setActivePreviewIndex(0);
      setIsReportPreviewOpen(true);
    } catch (e) {
      console.error("Failed to load stock report preview:", e);
      toast({
        title: "Unable to open report",
        description: e?.message || "Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleDownloadReport = async (row, attachment) => {
    const key = reportKey(row, attachment);
    setLoadingReportKey(key);
    try {
      const response = await fetchReportBlob(row, attachment, true);
      if (response?.data instanceof Blob) {
        const blobUrl = URL.createObjectURL(response.data);
        triggerBrowserDownload(
          blobUrl,
          resolveReportDownloadFilename(attachment, response)
        );
        URL.revokeObjectURL(blobUrl);
      }
    } catch (e) {
      console.error("Failed to download stock report:", e);
      toast({
        title: "Download failed",
        description: e?.message || "Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoadingReportKey(null);
    }
  };

  const handleDownloadSelectedReports = async () => {
    const selectedRows = pagedRows.filter((row) => selectedRowIds.includes(row.id));
    if (!selectedRows.length) {
      toast({
        title: "No rows selected",
        description: "Select one or more stock rows to download their reports.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setIsBulkReportLoading(true);
    try {
      let count = 0;
      for (const row of selectedRows) {
        const attachments = Array.isArray(row.reportAttachments) ? row.reportAttachments : [];
        for (const attachment of attachments) {
          // eslint-disable-next-line no-await-in-loop
          await handleDownloadReport(row, attachment);
          count += 1;
        }
      }
      if (!count) {
        toast({
          title: "No reports to download",
          description: "Selected rows do not have uploaded attachments.",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Download started",
          description: `${count} report file(s) queued for download.`,
          status: "success",
          duration: 2500,
          isClosable: true,
        });
      }
    } finally {
      setIsBulkReportLoading(false);
    }
  };

  const handleDownloadCurrentPreview = () => {
    const active = reportPreviewItems[activePreviewIndex];
    if (!active) return;
    triggerBrowserDownload(active.blobUrl, active.filename);
  };

  const handleDownloadAllFromPreview = () => {
    if (!reportPreviewItems.length) return;
    reportPreviewItems.forEach((item) => {
      triggerBrowserDownload(item.blobUrl, item.filename);
    });
    toast({
      title: "Download started",
      description: `${reportPreviewItems.length} report file(s) queued for download.`,
      status: "success",
      duration: 2500,
      isClosable: true,
    });
  };

  const handleToggleRow = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleToggleSelectAllVisible = (checked) => {
    const visibleIds = pagedRows.map((row) => row.id);
    if (checked) {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }
    setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
  };

  const handleDownloadExcel = async () => {
    const headers = CLIENT_STOCK_EXPORT_COLUMNS.map((column) => column.header);
    const selectedRows = processedRows.filter((row) => selectedRowIds.includes(row.id));
    try {
      let exportRows = selectedRows;
      if (!selectedRows.length) {
        const res = await clientStockApi.getClientStock(
          buildStockQueryParams({ fetch_all: true })
        );
        exportRows = applyClientStockSearchSort(
          mapClientStockRows(res?.stock_list, res?.client?.name || clientName),
          searchQuery,
          clientSortOption
        );
      }
      const rowsForExport = exportRows.map((row) =>
        CLIENT_STOCK_EXPORT_COLUMNS.map((column) =>
          column.header === "Stock Status" ? formatStatus(row.stockStatus) : column.value(row)
        )
      );
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, PAGE_COPY.excelSheet);
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileSuffix = selectedRows.length ? "selected" : "filtered";
      XLSX.writeFile(workbook, `${PAGE_COPY.excelFilePrefix}-${fileSuffix}-${dateTag}.xlsx`);
    } catch (_error) {
      toast({
        title: "Export failed",
        description: "Could not download the Excel file.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleOpenDimensionsModal = (row) => {
    const dimensions = Array.isArray(row?.pcsLines) ? row.pcsLines : [];
    setSelectedDimensions(dimensions);
    setIsDimensionsModalOpen(true);
  };

  const getDimensionTotal = (keys, decimals = 3) =>
    selectedDimensions
      .reduce((sum, dim) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const value = keyList.reduce((acc, key) => (
          acc != null && acc !== "" ? acc : dim?.[key]
        ), null);
        return sum + (parseFloat(value) || 0);
      }, 0)
      .toFixed(decimals);

  return (
    <Box>
      <Flex align="center" justify="space-between" mb={4}>
        <Box>
          <Heading fontSize="24px" lineHeight="32px" color={headingColor}>
            {PAGE_COPY.title}
          </Heading>
          <Text mt={1} fontSize="sm" color={muted}>
            {clientName
              ? `Showing ${activeFilter === "false" ? "inactive" : "active"} stock for ${clientName}.`
              : activeFilter === "false"
                ? "Showing released / shipped / delivered stock."
                : "Track inventory movement by vessel, location, and date range."}
          </Text>
        </Box>
      </Flex>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} mb={4} gap={3} wrap="wrap">
          <Text fontSize="sm" fontWeight="700" color={headingColor}>
            Filters
          </Text>
          <Flex align="center" gap={2} wrap="wrap">
            <Text fontSize="sm" fontWeight="600" color={headingColor}>
              Active items
            </Text>
            <Switch
              size="sm"
              colorScheme="green"
              isChecked={activeFilter !== "false"}
              onChange={(e) => handleActiveFilterChange(e.target.checked)}
            />
            <Text fontSize="xs" color={muted}>
              {activeFilter === "false"
                ? "Showing released / shipped / delivered"
                : "Showing active statuses"}
            </Text>
          </Flex>
        </Flex>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={3}>
          <GridItem colSpan={{ base: 1, md: 2, xl: 2 }}>
            <Text fontSize="xs" mb={1} color={muted}>Date Range</Text>
            <Flex gap={2}>
              <Input size="sm" type="date" p="20px 12px" value={filters.fromDate} onChange={(e) => handleFilterChange("fromDate", e.target.value)} />
              <Input size="sm" type="date" p="20px 12px" value={filters.toDate} onChange={(e) => handleFilterChange("toDate", e.target.value)} />
            </Flex>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Vessel</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.vessel}
              onChange={(value) => handleFilterChange("vessel", value || "")}
              options={vesselOptions}
              placeholder="All vessels"
              valueKey="name"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select
              size="sm"
              h="40px"
              placeholder="All statuses"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Hub 1</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.location}
              onChange={(value) => handleFilterChange("location", value || "")}
              options={locationOptions}
              placeholder="All Hub 1"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Destination</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.destination}
              onChange={(value) => handleFilterChange("destination", value || "")}
              options={destinationOptions}
              placeholder="All destinations"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>PO Number</Text>
            <Input
              size="sm"
              h="40px"
              placeholder="Search PO number"
              value={filters.poNumber}
              onChange={(e) => handleFilterChange("poNumber", e.target.value)}
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Req No</Text>
            <Input
              size="sm"
              h="40px"
              placeholder="Search req no"
              value={filters.reqNo}
              onChange={(e) => handleFilterChange("reqNo", e.target.value)}
            />
          </GridItem>
        </Grid>

        <Flex mt={4} gap={3}>
          <Button size="sm" variant="outline" borderColor={borderColor} leftIcon={<Icon as={MdRefresh} />} onClick={handleReset}>
            Reset
          </Button>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={4} mb={3}>
        <Flex justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap={3}>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color={muted}>Show</Text>
            <Select
              size="xs"
              w="72px"
              value={entries}
              onChange={(e) => {
                setEntries(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="50">50</option>
              <option value="25">25</option>
              <option value="10">10</option>
            </Select>
            <Text fontSize="sm" color={muted}>entries</Text>
          </Flex>
          <Flex align="center" gap={2} wrap="wrap">
            <InputGroup maxW="340px">
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder={PAGE_COPY.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const nextQuery = search.trim();
                  setSearchQuery(nextQuery);
                  setCurrentPage(1);
                }}
                size="sm"
              />
            </InputGroup>
            <Menu>
              <MenuButton as={Button} size="sm" colorScheme="blue" variant="solid">
                {getClientStockSortButtonLabel(clientSortOption)}
              </MenuButton>
              <MenuList>
                <StockHubSortMenuItems
                  sortOption={clientSortOption}
                  onSelect={handleSortChange}
                />
                <MenuItem onClick={() => handleSortChange("via_vessel")}>
                  Sort by VIA VESSEL (Alphabetically)
                </MenuItem>
                <MenuItem onClick={() => handleSortChange("status")}>
                  Sort by Stock Status
                </MenuItem>
                <MenuItem onClick={() => handleSortChange("via_hub_status")}>
                  Sort by VIA HUB + Status
                </MenuItem>
                <MenuItem onClick={() => handleSortChange("via_vessel_status")}>
                  Sort by VIA VESSEL + Status
                </MenuItem>
                <MenuItem onClick={() => handleSortChange("via_vessel_via_hub_status")}>
                  Sort by VIA VESSEL + VIA HUB + Status
                </MenuItem>
                <MenuItem onClick={() => handleSortChange("none")}>
                  No Sort
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
          <Menu>
            <MenuButton
              as={Button}
              size="sm"
              variant="outline"
              borderColor={borderColor}
              leftIcon={<Icon as={MdFileDownload} />}
            >
              Download
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<Icon as={MdPictureAsPdf} color="red.500" />}
                onClick={handleDownloadSelectedReports}
                isDisabled={isBulkReportLoading}
              >
                Download reports of the selected stock
              </MenuItem>
              <MenuItem icon={<Icon as={MdTableChart} color="green.500" />} onClick={handleDownloadExcel}>
                {selectedRowIds.length
                  ? "Download selected stock in Excel format"
                  : "Download stock in Excel format"}
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" position="relative" overflow="hidden" minH={isLoading && !pagedRows.length ? "240px" : undefined}>
        {isLoading && (
          <Flex
            position={pagedRows.length ? "absolute" : "relative"}
            inset={pagedRows.length ? 0 : undefined}
            minH={pagedRows.length ? undefined : "240px"}
            align="center"
            justify="center"
            gap={3}
            bg={pagedRows.length ? tableOverlayBg : undefined}
            zIndex={4}
          >
            <Spinner size="sm" />
            <Text fontSize="sm" color={muted}>{PAGE_COPY.loadingLabel}</Text>
          </Flex>
        )}
        {!isLoading && pagedRows.length === 0 ? (
          <Text px={4} py={10} fontSize="sm" color={muted} textAlign="center">
            {PAGE_COPY.emptyLabel}
          </Text>
        ) : pagedRows.length > 0 ? (
        <Box
          maxH={{ base: "62vh", md: "calc(100vh - 340px)" }}
          overflowY="auto"
          overflowX="auto"
          sx={{
            "&::-webkit-scrollbar": { height: "8px", width: "8px" },
            "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
          }}
        >
        <Table
          size="sm"
          variant="simple"
          sx={{
            tableLayout: "auto",
            thead: {
              position: "sticky",
              top: 0,
              zIndex: 3,
            },
            th: {
              position: "sticky",
              top: 0,
              zIndex: 3,
              borderColor: `${tableBorderColor} !important`,
              borderRight: `1px solid ${tableBorderColor} !important`,
              borderBottom: `1px solid ${tableBorderColor} !important`,
              fontSize: "11px",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
              py: 3,
              bg: tableHeaderBg,
            },
            td: {
              borderColor: `${tableBorderColor} !important`,
              borderRight: `1px solid ${tableBorderColor} !important`,
              borderBottom: `1px solid ${tableBorderColor} !important`,
              fontSize: "12px",
              py: 2.5,
              verticalAlign: "middle",
            },
            "th:last-child, td:last-child": {
              borderRight: "none",
            },
          }}
        >
          <Thead>
            <Tr>
              <Th>
                <Checkbox
                  isChecked={allVisibleSelected}
                  onChange={(e) => handleToggleSelectAllVisible(e.target.checked)}
                />
              </Th>
              <Th>Vessel</Th>
              <Th>STOCK ID</Th>
              <Th>SUPPLIER</Th>
              <Th>REQ NO</Th>
              <Th>PO#</Th>
              <Th>STOCK STATUS</Th>
              <Th>DATE ON STOCK</Th>
              <Th>BOXES</Th>
              <Th>WEIGHT</Th>
              <Th>TOTAL VOLUME CBM</Th>
              <Th>ORIGIN</Th>
              <Th>VIA HUB 1</Th>
              <Th>VIA HUB 2</Th>
              <Th>AP DESTINATION</Th>
              <Th>DESTINATION</Th>
              <Th>SO NUMBER</Th>
              <Th>CURRENCY</Th>
              <Th>VALUE</Th>
              <Th>CLIENT</Th>
              <Th>DG/UN NUMBER</Th>
              <Th>REPORT</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedRows.map((row) => {
              return (
                <Tr
                  key={row.id}
                  _hover={{ bg: tableRowHoverBg }}
                  _even={{ bg: tableRowEvenBg }}
                >
                  <Td>
                    <Checkbox
                      isChecked={selectedRowIds.includes(row.id)}
                      onChange={() => handleToggleRow(row.id)}
                    />
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.vessel}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{toClientStockDisplay(row.stockItemId)}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.supplier}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.reqNo}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.poNo}</StockCellText>
                  </Td>
                  <Td title={getStockCellTooltip(formatStatus(row.stockStatus))}>
                    <StockStatusBadge
                      statusStyle={getStockRowStatusStyle(
                        row.stockStatusKey || row.stockStatusRaw || row.stockStatus
                      )}
                    >
                      {formatStatus(row.stockStatus)}
                    </StockStatusBadge>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.dateOnStock}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.boxes}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.weight}</StockCellText>
                  </Td>
                  <Td title={getStockCellTooltip(row.totalVolumeCbm)}>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => handleOpenDimensionsModal(row)}
                    >
                      {row.totalVolumeCbm}
                    </Button>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.origin}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.viaHub1}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.viaHub2}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.apDestination}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.destination}</StockCellText>
                  </Td>
                  <Td>
                    <StockSoNumberLink
                      item={row}
                      label={row.soNumber}
                      openFiltered={openClientShippingOrdersFiltered}
                      textProps={{ fontSize: "sm", isTruncated: true, maxW: "240px" }}
                    />
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.currency}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.value}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.client}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.dgUnNumber}</StockCellText>
                  </Td>
                  <Td>
                    {row.stockRecordId && (row.reportAttachments?.length || 0) > 0 ? (
                      <StockListAttachmentsCell
                        attachments={row.reportAttachments}
                        stockItemId={row.stockRecordId}
                        attachmentMode="all"
                        previousLabel="Previous files"
                        emptyLabel="—"
                        onPreviewAll={(attachments, stockRecordId) =>
                          handlePreviewAllAttachments(
                            {
                              id: row.id,
                              stockRecordId,
                              stockStatusKey: row.stockStatusKey,
                            },
                            attachments
                          )
                        }
                        onDownloadFile={(att, stockRecordId) =>
                          handleDownloadReport({ ...row, stockRecordId }, att)
                        }
                        onOpenPreviousReports={(entries, stockRecordId) =>
                          handleOpenPreviousReports(
                            entries,
                            stockRecordId,
                            row.stockStatusKey,
                            row.id
                          )
                        }
                      />
                    ) : (
                      <Text fontSize="xs" color={muted}>
                        —
                      </Text>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        </Box>
        ) : null}
        <Flex
          mt={0}
          px={4}
          py={3}
          justify="space-between"
          align="center"
          direction={{ base: "column", md: "row" }}
          gap={2}
          borderTop="1px solid"
          borderColor={tableBorderColor}
        >
          <Text fontSize="xs" color={muted}>
            {isLoading
              ? "Loading..."
              : `Showing ${pageStart}-${pageEnd} of ${visibleTotalCount} entries`}
          </Text>
          <Flex gap={1} align="center" wrap="wrap" justify="center">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage(1)}
              isDisabled={isLoading || !visibleHasPrevious || currentPage <= 1}
            >
              First
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              isDisabled={isLoading || !visibleHasPrevious || currentPage <= 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, visibleTotalPages) }, (_, i) => {
              let pageNum;
              if (visibleTotalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= visibleTotalPages - 2) pageNum = visibleTotalPages - 4 + i;
              else pageNum = currentPage - 2 + i;
              return (
                <Button
                  key={pageNum}
                  size="xs"
                  variant={currentPage === pageNum ? "solid" : "outline"}
                  colorScheme={currentPage === pageNum ? "blue" : "gray"}
                  onClick={() => setCurrentPage(pageNum)}
                  isDisabled={isLoading}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(visibleTotalPages, p + 1))}
              isDisabled={isLoading || !visibleHasNext || currentPage >= visibleTotalPages}
            >
              Next
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage(visibleTotalPages)}
              isDisabled={isLoading || !visibleHasNext || currentPage >= visibleTotalPages}
            >
              Last
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Modal isOpen={isDimensionsModalOpen} onClose={() => setIsDimensionsModalOpen(false)} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Dimensions Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedDimensions.length ? (
              <Flex direction="column" gap={3}>
                {selectedDimensions.map((dim, index) => {
                  const pieceTitle =
                    dim?.piece_name || `Piece ${dim?.piece_no != null ? dim.piece_no : index + 1}`;
                  const lwhText = dim?.lwh
                    || ((dim?.length_cm || dim?.width_cm || dim?.height_cm)
                      ? `${dim?.length_cm || 0} x ${dim?.width_cm || 0} x ${dim?.height_cm || 0}`
                      : "-");
                  return (
                    <Box key={dim?.id || index} border="1px solid" borderColor={borderColor} borderRadius="10px" p={3}>
                      <Text fontWeight="700" mb={2}>{pieceTitle}</Text>
                      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={2}>
                        <Text fontSize="sm"><b>Warehouse Ref:</b> {dim?.warehouse_ref || "-"}</Text>
                        <Text fontSize="sm"><b>Method:</b> {dim?.calculation_method || "-"}</Text>
                        <Text fontSize="sm"><b>L x W x H:</b> {lwhText}</Text>
                        <Text fontSize="sm"><b>CBM:</b> {dim?.cbm ?? dim?.volume_cbm ?? dim?.volume_dim ?? "-"}</Text>
                        <Text fontSize="sm"><b>VW:</b> {dim?.vw ?? dim?.cw_air_freight ?? "-"}</Text>
                        <Text fontSize="sm"><b>Weight (kg):</b> {dim?.weight ?? dim?.weight_kg ?? "-"}</Text>
                      </Grid>
                    </Box>
                  );
                })}
                {selectedDimensions.length > 1 ? (
                  <Box border="1px solid" borderColor={borderColor} borderRadius="10px" p={3}>
                    <Text fontWeight="700" mb={1}>Total Summary</Text>
                    <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={2}>
                      <Text fontSize="sm"><b>Total CBM:</b> {getDimensionTotal(["cbm", "volume_cbm", "volume_dim"])}</Text>
                      <Text fontSize="sm"><b>Total VW:</b> {getDimensionTotal(["vw", "cw_air_freight"])}</Text>
                      <Text fontSize="sm"><b>Total Weight (kg):</b> {getDimensionTotal(["weight_kg", "weight"], 2)}</Text>
                    </Grid>
                  </Box>
                ) : null}
              </Flex>
            ) : (
              <Text fontSize="sm" color={muted}>No dimensions available for this row.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Button size="sm" onClick={() => setIsDimensionsModalOpen(false)}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <StockReportHistoryModal
        isOpen={previousReportsModal.isOpen}
        onClose={handleClosePreviousReports}
        title="Previous files"
        entries={previousReportsModal.entries}
        stockItemId={previousReportsModal.stockRecordId}
        showFileActions
        allowDelete={false}
        onPreviewAll={(attachments, stockRecordId) =>
          handlePreviewAllAttachments(
            {
              id: previousReportsModal.rowId,
              stockRecordId,
              stockStatusKey: previousReportsModal.stockStatusKey,
            },
            attachments
          )
        }
        onDownloadFile={(att, stockRecordId) =>
          handleDownloadReport(
            {
              id: previousReportsModal.rowId,
              stockRecordId,
              stockStatusKey: previousReportsModal.stockStatusKey,
            },
            att
          )
        }
      />

      <Modal isOpen={isReportPreviewOpen} onClose={handleCloseReportPreview} size="5xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Stock report
            {reportPreviewItems.length > 1
              ? ` (${activePreviewIndex + 1}/${reportPreviewItems.length})`
              : ""}
            {reportPreviewItems[activePreviewIndex]?.filename
              ? ` — ${reportPreviewItems[activePreviewIndex].filename}`
              : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={2}>
            {isPreparingPreview ? (
              <Text fontSize="sm" color={muted}>Loading report...</Text>
            ) : reportPreviewItems.length ? (
              <Box border="1px solid" borderColor={borderColor} borderRadius="10px" overflow="hidden">
                <iframe
                  title="Stock report preview"
                  src={reportPreviewItems[activePreviewIndex]?.blobUrl}
                  style={{ width: "100%", height: "70vh", border: "none" }}
                />
              </Box>
            ) : (
              <Text fontSize="sm" color={muted}>No preview available.</Text>
            )}
          </ModalBody>
          <ModalFooter>
            <Flex w="100%" justify="space-between" align="center" gap={2} direction={{ base: "column", md: "row" }}>
              <Flex gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActivePreviewIndex((i) => Math.max(0, i - 1))}
                  isDisabled={activePreviewIndex === 0 || !reportPreviewItems.length}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActivePreviewIndex((i) => Math.min(reportPreviewItems.length - 1, i + 1))
                  }
                  isDisabled={
                    !reportPreviewItems.length || activePreviewIndex >= reportPreviewItems.length - 1
                  }
                >
                  Next
                </Button>
              </Flex>
              <Flex gap={2}>
                <Button size="sm" variant="outline" onClick={handleCloseReportPreview}>
                  Close
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={MdFileDownload} />}
                  onClick={handleDownloadCurrentPreview}
                  isDisabled={!reportPreviewItems.length}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  variant="brand"
                  leftIcon={<Icon as={MdFileDownload} />}
                  onClick={handleDownloadAllFromPreview}
                  isDisabled={!reportPreviewItems.length}
                >
                  Download All
                </Button>
              </Flex>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {galleryModal}
    </Box>
  );
}

export default ClientStockReportView;
