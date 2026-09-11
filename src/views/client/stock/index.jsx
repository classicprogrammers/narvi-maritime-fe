import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
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
  getStatusOptionsForActiveFilter,
  isArchiveStockStatus,
  normalizeStockStatusKey,
  resolveStockListActiveParam,
} from "constants/stockStatus";
import { getCappedStockReportEntriesForDisplay } from "utils/stockReportAttachmentsUi";
import { normalizeLegacyStockReportFilename } from "utils/stockReportPdf";
import StockListAttachmentsCell from "components/stock-list/StockListAttachmentsCell";
import StockCellText, { getStockCellTooltip } from "components/stock-list/StockCellText";
import StockReportHistoryModal from "components/stock-list/StockReportHistoryModal";
import { useStockAttachmentsGallery } from "hooks/useStockAttachmentsGallery";
import StockHubSortMenuItems from "components/stock-list/StockHubSortMenuItems";
import { getStockHubSortField, isStockHubSortOption } from "constants/stockHubSort";
import {
  getClientStockSortButtonLabel,
  mapStockSortOptionToApiSortBy,
} from "utils/stockSortOptions";
import { formatStockValueDisplay } from "utils/stockValue";
import { formatStockDestinationDisplay } from "utils/stockDestinationOptions";
import {
  getStockEffectiveHubDisplay,
  getStockOriginDisplay,
  getStockViaHub1Display,
  getStockViaHub2Display,
} from "utils/stockLocationOptions";
import clientHubApi, { getClientHubFilterId, toClientHubOptionValue } from "api/clientHub";
import { clearClientNavigationState } from "views/client/dashboard/clientDashboardNavigation";
import * as XLSX from "xlsx";

/**
 * Client portal only (/Client/Stock): stock report PDFs are shown only when status is Stock.
 * Admin stock list (/admin/stock-list/stocks) shows reports for every status — do not reuse here.
 */
const isClientPortalStockStatus = (status) => normalizeStockStatusKey(status) === "stock";

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
  (Array.isArray(stockList) ? stockList : []).map((item, idx) => {
    const stockStatusRaw = item.stock_status;
    const stockStatusKey = normalizeStockStatusKey(stockStatusRaw);
    const reportEntries = isClientPortalStockStatus(stockStatusKey)
      ? getCappedStockReportEntriesForDisplay(item.attachments)
      : [];
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
      warehouseId: toClientStockDisplay(item.warehouse_id || item.stock_item_id),
      stockNumber: toClientStockDisplay(item.stock_number || item.stock_item_id),
      supplier: toClientStockDisplay(item.supplier?.name || item.supplier),
      poNo:
        Array.isArray(item.po_number) && item.po_number.length
          ? item.po_number.map((x) => String(x)).join(", ")
          : toClientStockDisplay(item.po_text),
      dgUnNumber: toClientStockDisplay(item.dg_un_number),
      boxes: formatStockValueDisplay(item.boxes ?? item.box ?? item.pieces ?? item.pcs?.count),
      weight: formatStockValueDisplay(item.weight ?? item.weight_kg),
      totalVolumeCbm: formatStockValueDisplay(item.total_volume_cbm),
      origin: toClientStockDisplay(getStockOriginDisplay(item)),
      location: toClientStockDisplay(getStockEffectiveHubDisplay(item)),
      firstEntryLocation: toClientStockDisplay(getStockOriginDisplay(item)),
      viaHub1: toClientStockDisplay(getStockViaHub1Display(item)),
      viaHub2: toClientStockDisplay(getStockViaHub2Display(item)),
      effectiveHub: toClientStockDisplay(getStockEffectiveHubDisplay(item)),
      apDestination: toClientStockDisplay(formatStockDestinationDisplay(item, "ap")),
      destination: toClientStockDisplay(formatStockDestinationDisplay(item, "destination")),
      stockStatus: toClientStockDisplay(stockStatusRaw),
      stockStatusRaw,
      soNumber: toClientStockDisplay(item.so_number),
      currency: toClientStockDisplay(item.currency),
      value: formatStockValueDisplay(item.value),
      deliveryIrregularities: toClientStockDisplay(item.delivery_irregularities),
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
};

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
  status: nav.stockStatus || "",
});

function ClientStock() {
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
    const stockStatus = getClientStockNavState(location).stockStatus;
    if (!stockStatus) return "true";
    return isArchiveStockStatus(stockStatus) ? "false" : "true";
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
  const statusColorMap = {
    pending: "orange",
    stock: "blue",
    available: "green",
    delivered: "green",
    released: "gray",
    shipped: "teal",
    in_transit: "purple",
    transit: "purple",
    cancelled: "red",
    lost: "red",
    hold: "yellow",
  };

  const statusFilterOptions = useMemo(
    () => getStatusOptionsForActiveFilter([], activeFilter),
    [activeFilter]
  );

  const resolvedVesselId = useMemo(() => {
    const fromOptions = vesselFilterOptions.find((v) => v.name === filters.vessel)?.id;
    return fromOptions ?? navVesselId ?? undefined;
  }, [filters.vessel, navVesselId, vesselFilterOptions]);

  const buildStockQueryParams = useCallback(
    (overrides = {}) => {
      const hubValue = String(filters.location || "").trim();
      const hubId = hubValue && !hubValue.startsWith("name:") ? getClientHubFilterId(hubValue) : null;
      const hubName = hubValue.startsWith("name:") ? hubValue.slice(5) : "";
      return {
        search: searchQuery || undefined,
        stock_status: filters.status || undefined,
        sort_by: mapStockSortOptionToApiSortBy(clientSortOption),
        date_from: filters.fromDate || undefined,
        date_to: filters.toDate || undefined,
        vessel_id: resolvedVesselId,
        narvi_stock_via_hub1: hubId != null ? hubId : undefined,
        via_hub: hubId == null && hubName ? hubName : undefined,
        hub: hubId == null && hubName ? hubName : undefined,
        active: resolveStockListActiveParam(activeFilter),
        ...overrides,
      };
    },
    [
      activeFilter,
      clientSortOption,
      filters.fromDate,
      filters.location,
      filters.status,
      filters.toDate,
      resolvedVesselId,
      searchQuery,
    ]
  );

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      const pageSize = Number(entries) || 50;
      const res = await clientStockApi.getClientStock(
        buildStockQueryParams({
          page: currentPage,
          page_size: pageSize,
        })
      );
      const nextClientName = res?.client?.name || "";
      setStockRows(mapClientStockRows(res?.stock_list, nextClientName));
      setClientName(nextClientName);
      setTotalCount(res.total_count ?? res.count ?? 0);
      setTotalPages(Math.max(1, res.total_pages || 1));
      setHasNext(Boolean(res.has_next));
      setHasPrevious(Boolean(res.has_previous));
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
  }, [buildStockQueryParams, currentPage, entries]);

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
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    fetchVesselFilterOptions();
    fetchHubFilterOptions();
  }, [fetchHubFilterOptions, fetchVesselFilterOptions]);

  const filteredRows = useMemo(
    () =>
      stockRows.filter((row) => {
        if (filters.destination && row.destination !== filters.destination) return false;
        if (filters.poNumber && row.poNo !== filters.poNumber) return false;
        return true;
      }),
    [filters.destination, filters.poNumber, stockRows]
  );
  const sortedFilteredRows = useMemo(() => {
    const rows = [...filteredRows];
    const getViaHub1 = (row) => String(row.viaHub1 && row.viaHub1 !== "-" ? row.viaHub1 : "").toLowerCase().trim();
    const getViaHub2 = (row) => String(row.viaHub2 && row.viaHub2 !== "-" ? row.viaHub2 : "").toLowerCase().trim();
    const getApDestination = (row) =>
      String(row.apDestination && row.apDestination !== "-" ? row.apDestination : "").toLowerCase().trim();
    const getViaHub = (row) => String(row.viaHub2 && row.viaHub2 !== "-" ? row.viaHub2 : row.viaHub1 || "").toLowerCase().trim();
    const getEffectiveHub = (row) => {
      const explicit = row.effectiveHub != null && row.effectiveHub !== "-" ? String(row.effectiveHub) : "";
      if (explicit.trim()) return explicit.toLowerCase().trim();
      return getViaHub(row);
    };
    const getVessel = (row) => String(row.vessel || "").toLowerCase().trim();
    const statusOrder = { pending: 1, stock: 2, in_transit: 3 };
    const compareStatus = (a, b) => {
      const aStatus = String(a.stockStatus || "").toLowerCase().trim();
      const bStatus = String(b.stockStatus || "").toLowerCase().trim();
      const aRank = statusOrder[aStatus] ?? 999;
      const bRank = statusOrder[bStatus] ?? 999;
      if (aRank !== bRank) return aRank - bRank;
      return aStatus.localeCompare(bStatus);
    };

    if (isStockHubSortOption(clientSortOption)) {
      const hubSortField = getStockHubSortField(clientSortOption);
      const getHubSortValue = (row) => {
        if (hubSortField === "narvi_stock_via_hub1") return getViaHub1(row);
        if (hubSortField === "narvi_stock_via_hub2") return getViaHub2(row);
        if (hubSortField === "narvi_stock_ap_destination") {
          return getApDestination(row);
        }
        return getEffectiveHub(row);
      };
      rows.sort((a, b) => getHubSortValue(a).localeCompare(getHubSortValue(b)));
      return rows;
    }
    if (clientSortOption === "via_vessel") {
      rows.sort((a, b) => getVessel(a).localeCompare(getVessel(b)));
      return rows;
    }
    if (clientSortOption === "status") {
      rows.sort(compareStatus);
      return rows;
    }
    if (clientSortOption === "via_hub_status") {
      rows.sort((a, b) => {
        const hubCmp = getEffectiveHub(a).localeCompare(getEffectiveHub(b));
        if (hubCmp !== 0) return hubCmp;
        return compareStatus(a, b);
      });
      return rows;
    }
    if (clientSortOption === "via_vessel_status") {
      rows.sort((a, b) => {
        const vesselCmp = getVessel(a).localeCompare(getVessel(b));
        if (vesselCmp !== 0) return vesselCmp;
        return compareStatus(a, b);
      });
      return rows;
    }
    if (clientSortOption === "via_vessel_via_hub_status") {
      rows.sort((a, b) => {
        const vesselCmp = getVessel(a).localeCompare(getVessel(b));
        if (vesselCmp !== 0) return vesselCmp;
        const hubCmp = getEffectiveHub(a).localeCompare(getEffectiveHub(b));
        if (hubCmp !== 0) return hubCmp;
        return compareStatus(a, b);
      });
      return rows;
    }
    return rows;
  }, [clientSortOption, filteredRows]);
  const pagedRows = sortedFilteredRows;
  const pageSize = Number(entries) || 50;
  const pageStart = totalCount ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min((currentPage - 1) * pageSize + pagedRows.length, totalCount);

  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedRowIds.includes(row.id));

  useEffect(() => {
    const currentIds = new Set(pagedRows.map((row) => row.id));
    setSelectedRowIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [pagedRows]);

  const handleFilterChange = (key, value) => {
    if (key === "vessel") setNavVesselId(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
    if (["fromDate", "toDate", "vessel", "status", "location"].includes(key)) {
      setCurrentPage(1);
    }
  };

  const handleActiveFilterChange = (showActive) => {
    const next = showActive ? "true" : "false";
    setActiveFilter(next);
    setFilters((prev) => {
      if (prev.status && isArchiveStockStatus(prev.status) !== (next === "false")) {
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
      setActiveFilter(isArchiveStockStatus(nav.stockStatus) ? "false" : "true");
    }
    if (nav.selectedVesselId != null) {
      setNavVesselId(nav.selectedVesselId);
    }
    setFilters((prev) => {
      const next = {
        ...prev,
        vessel: nav.selectedVessel || prev.vessel,
        location: nav.hubValue || prev.location,
        status: nav.stockStatus || prev.status,
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
    setEntries("50");
    setCurrentPage(1);
    setSelectedRowIds([]);
    setActiveFilter("true");
  };
  const formatStatus = (status) => {
    const value = String(status || "").trim();
    if (!value) return "-";
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

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
  const destinationOptions = useMemo(
    () =>
      Array.from(
        new Set(stockRows.map((r) => r.destination).filter((v) => v && v !== "-"))
      ),
    [stockRows]
  );
  const poOptions = useMemo(
    () =>
      Array.from(
        new Set(stockRows.map((r) => r.poNo).filter((v) => v && v !== "-"))
      ),
    [stockRows]
  );
  const toSelectOptions = (values) =>
    values.map((value) => ({ id: value, name: value }));

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
    if (!isClientPortalStockStatus(row.stockStatusKey)) return;
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
      if (!isClientPortalStockStatus(rowItem.stockStatusKey)) continue;
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
    const eligible = rows.filter(
      (r) => isClientPortalStockStatus(r.stockStatusKey) && (r.reportAttachments?.length || 0) > 0
    );
    if (!eligible.length) {
      toast({
        title: "No reports available",
        description:
          "Stock reports are only available for rows with status Stock that have an uploaded report.",
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
    if (!isClientPortalStockStatus(row.stockStatusKey)) return;
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
    setIsBulkReportLoading(true);
    try {
      let count = 0;
      for (const row of selectedRows) {
        if (!isClientPortalStockStatus(row.stockStatusKey)) continue;
        if (row.latestReport) {
          // eslint-disable-next-line no-await-in-loop
          await handleDownloadReport(row, row.latestReport);
          count += 1;
        }
      }
      if (!count) {
        toast({
          title: "No reports to download",
          description: "Selected rows must have status Stock and an attached report.",
          status: "info",
          duration: 3000,
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
    const headers = [
      "Client",
      "Vessel",
      "Warehouse ID",
      "Supplier",
      "PO#",
      "DG/UN Number",
      "Boxes",
      "Weight",
      "Total Volume CBM",
      "Origin",
      "Via Hub 1",
      "Via Hub 2",
      "AP Destination",
      "Destination",
      "Shipping Docs",
      "Export Docs 1",
      "Export Docs 2",
      "Stock Status",
      "Date On Stock",
      "SO Number",
      "Currency",
      "Value",
    ];
    try {
      const res = await clientStockApi.getClientStock(
        buildStockQueryParams({ fetch_all: true })
      );
      const exportRows = mapClientStockRows(res?.stock_list, res?.client?.name || clientName).filter((row) => {
        if (filters.destination && row.destination !== filters.destination) return false;
        if (filters.poNumber && row.poNo !== filters.poNumber) return false;
        return true;
      });
      const rowsForExport = exportRows.map((row) => [
        row.client || "-",
        row.vessel || "-",
        row.warehouseId || "-",
        row.supplier || "-",
        row.poNo || "-",
        row.dgUnNumber || "-",
        row.boxes || "-",
        row.weight || "-",
        row.totalVolumeCbm || "-",
        row.origin || "-",
        row.viaHub1 || "-",
        row.viaHub2 || "-",
        row.apDestination || "-",
        row.destination || "-",
        row.shippingDoc || "-",
        row.exportDoc1 || "-",
        row.exportDoc2 || "-",
        formatStatus(row.stockStatus),
        row.dateOnStock || "-",
        row.soNumber || "-",
        row.currency || "-",
        row.value || "-",
      ]);
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Report");
      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `stock-report-${dateTag}.xlsx`);
    } catch (_error) {
      toast({
        title: "Export failed",
        description: "Could not download the stock Excel file.",
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
            Stock Report
          </Heading>
          <Text mt={1} fontSize="sm" color={muted}>
            {clientName
              ? `Showing ${activeFilter === "false" ? "inactive" : "active"} stock for ${clientName}.`
              : activeFilter === "false"
                ? "Showing released / shipped / delivered / cancelled stock."
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
                ? "Showing released / shipped / delivered / cancelled"
                : "Showing active statuses"}
            </Text>
          </Flex>
        </Flex>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={3}>
          <GridItem>
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
            <Select size="sm" placeholder="All statuses" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
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
              options={toSelectOptions(destinationOptions)}
              placeholder="All destinations"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>PO Number</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.poNumber}
              onChange={(value) => handleFilterChange("poNumber", value || "")}
              options={toSelectOptions(poOptions)}
              placeholder="All PO numbers"
              valueKey="id"
              displayKey="name"
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
                placeholder="Search stock id, remarks, origin, vessel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
              Download As
            </MenuButton>
            <MenuList>
              <MenuItem
                icon={<Icon as={MdPictureAsPdf} color="red.500" />}
                onClick={handleDownloadSelectedReports}
                isDisabled={isBulkReportLoading}
              >
                Reports (Selected, Stock status)
              </MenuItem>
              <MenuItem icon={<Icon as={MdTableChart} color="green.500" />} onClick={handleDownloadExcel}>
                Excel (All Filtered Rows)
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
            <Text fontSize="sm" color={muted}>Loading stock report...</Text>
          </Flex>
        )}
        {!isLoading && pagedRows.length === 0 ? (
          <Text px={4} py={10} fontSize="sm" color={muted} textAlign="center">
            No stock records found.
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
              <Th>CLIENT</Th>
              <Th>Vessel</Th>
              <Th>WAREHOUSE ID</Th>
              <Th>SUPPLIER</Th>
              <Th>PO#</Th>
              <Th>DG/UN NUMBER</Th>
              <Th>BOXES</Th>
              <Th>WEIGHT</Th>
              <Th>TOTAL VOLUME CBM</Th>
              <Th>ORIGIN</Th>
              <Th>VIA HUB 1</Th>
              <Th>VIA HUB 2</Th>
              <Th>AP DESTINATION</Th>
              <Th>DESTINATION</Th>
              <Th>STOCK STATUS</Th>
              <Th>DATE ON STOCK</Th>
              <Th>SO NUMBER</Th>
              <Th>CURRENCY</Th>
              <Th>VALUE</Th>
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
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.client}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.vessel}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.warehouseId}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.supplier}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.poNo}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.dgUnNumber}</StockCellText>
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
                  <Td title={getStockCellTooltip(formatStatus(row.stockStatus))}>
                    <Badge
                      borderRadius="full"
                      px={2.5}
                      py={1}
                      colorScheme={statusColorMap[String(row.stockStatus || "").toLowerCase()] || "gray"}
                    >
                      {formatStatus(row.stockStatus)}
                    </Badge>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.dateOnStock}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.soNumber}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.currency}</StockCellText>
                  </Td>
                  <Td>
                    <StockCellText fontSize="sm" isTruncated maxW="240px">{row.value}</StockCellText>
                  </Td>
                  <Td>
                    {isClientPortalStockStatus(row.stockStatusKey) ? (
                      row.stockRecordId && (row.reportAttachments?.length || 0) > 0 ? (
                        <StockListAttachmentsCell
                          attachments={row.reportAttachments}
                          stockItemId={row.stockRecordId}
                          previousLabel="Previous status reports"
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
                      )
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
              : `Showing ${pageStart}-${pageEnd} of ${totalCount} entries`}
          </Text>
          <Flex gap={1} align="center" wrap="wrap" justify="center">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage(1)}
              isDisabled={isLoading || !hasPrevious || currentPage <= 1}
            >
              First
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              isDisabled={isLoading || !hasPrevious || currentPage <= 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (currentPage <= 3) pageNum = i + 1;
              else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={isLoading || !hasNext || currentPage >= totalPages}
            >
              Next
            </Button>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setCurrentPage(totalPages)}
              isDisabled={isLoading || !hasNext || currentPage >= totalPages}
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
        title="Previous status reports"
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

export default ClientStock;
