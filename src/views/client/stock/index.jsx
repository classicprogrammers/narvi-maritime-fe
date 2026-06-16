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
import clientHubApi from "api/clientHub";
import clientVesselApi from "api/clientVessel";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { FALLBACK_ACTIVE_STATUS_OPTIONS, normalizeStockStatusKey } from "constants/stockStatus";
import { getCappedStockReportEntriesForDisplay } from "utils/stockReportAttachmentsUi";
import { normalizeLegacyStockReportFilename } from "utils/stockReportPdf";
import StockListAttachmentsCell from "components/stock-list/StockListAttachmentsCell";
import StockReportHistoryModal from "components/stock-list/StockReportHistoryModal";
import { clearClientNavigationState } from "views/client/dashboard/clientDashboardNavigation";
import * as XLSX from "xlsx";

/**
 * Client portal only (/Client/Stock): stock report PDFs are shown only when status is Stock.
 * Admin stock list (/admin/stock-list/stocks) shows reports for every status — do not reuse here.
 */
const isClientPortalStockStatus = (status) => normalizeStockStatusKey(status) === "stock";

const resolveReportDownloadFilename = (attachment, response) => {
  const name = attachment?.filename || attachment?.name;
  if (name && String(name).trim()) {
    return normalizeLegacyStockReportFilename(String(name).trim());
  }
  const fromHeader = response?.filename;
  if (fromHeader) return normalizeLegacyStockReportFilename(fromHeader);
  return "stock-report.pdf";
};

function ClientStock() {
  const location = useLocation();
  const [stockRows, setStockRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [clientName, setClientName] = useState("");
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    vessel: "",
    status: "",
    location: "",
    destination: "",
    poNumber: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
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
  const statusColorMap = {
    pending: "orange",
    stock: "blue",
    available: "green",
    delivered: "green",
    in_transit: "purple",
    transit: "purple",
    cancelled: "red",
    lost: "red",
    hold: "yellow",
  };

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    try {
      let sort_by;
      let sort_order;
      if (clientSortOption === "via_hub") {
        sort_by = "via_hub";
        sort_order = "asc";
      } else if (clientSortOption === "via_vessel") {
        sort_by = "vessel_name";
        sort_order = "asc";
      } else if (clientSortOption === "status") {
        sort_by = "stock_status";
        sort_order = "asc";
      } else if (clientSortOption === "via_hub_status") {
        sort_by = "via_hub_status";
        sort_order = "asc";
      } else if (clientSortOption === "via_vessel_status") {
        sort_by = "vessel_status";
        sort_order = "asc";
      }
      const res = await clientStockApi.getClientStock({
        search: search.trim() || undefined,
        stock_status: filters.status || undefined,
        sort_by,
        sort_order,
      });
      const toDisplay = (value) =>
        value != null && value !== false && String(value).trim() !== "" ? String(value) : "-";
      const toNumberDisplay = (value) =>
        value != null && value !== false && value !== "" && !Number.isNaN(Number(value))
          ? String(value)
          : "-";

      const normalizedRows = (res?.stock_list || []).map((item, idx) => {
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
        client: toDisplay(item.client?.name || res?.client?.name),
        dateOnStock: toDisplay(item.date_on_stock || item.first_entry_date),
        firstEntryDate: toDisplay(item.first_entry_date || item.date_on_stock),
        vessel: toDisplay(item.vessel?.name || item.vessel),
        warehouseId: toDisplay(item.warehouse_id || item.stock_item_id),
        stockNumber: toDisplay(item.stock_number || item.stock_item_id),
        supplier: toDisplay(item.supplier?.name || item.supplier),
        poNo: Array.isArray(item.po_number) && item.po_number.length
          ? item.po_number.map((x) => String(x)).join(", ")
          : toDisplay(item.po_text),
        dgUnNumber: toDisplay(item.dg_un_number),
        boxes: toNumberDisplay(item.boxes ?? item.box ?? item.pieces ?? item.pcs?.count),
        weight: toNumberDisplay(item.weight ?? item.weight_kg),
        totalVolumeCbm: toNumberDisplay(item.total_volume_cbm),
        origin: toDisplay(item.first_entry_location || item.origin),
        location: toDisplay(item.first_entry_location || item.origin),
        firstEntryLocation: toDisplay(item.first_entry_location || item.origin),
        viaHub1: toDisplay(item.via_hub_1),
        viaHub2: toDisplay(item.via_hub_2),
        apDestination: toDisplay(item.ap_destination),
        destination: toDisplay(item.destination),
        stockStatus: toDisplay(stockStatusRaw),
        stockStatusRaw,
        soNumber: toDisplay(item.so_number),
        currency: toDisplay(item.currency),
        value: toNumberDisplay(item.value),
        deliveryIrregularities: toDisplay(item.delivery_irregularities),
        poRemarks: toDisplay(item.po_remarks),
        createDate: toDisplay(item.create_date),
        writeDate: toDisplay(item.write_date),
        locationHistory: Array.isArray(item.location_history) ? item.location_history : [],
        pcsLines: Array.isArray(item.pcs?.lines)
          ? item.pcs.lines
          : Array.isArray(item.dimensions)
            ? item.dimensions
            : [],
        pcsCount: item.pcs?.count ?? item.pieces ?? item.boxes ?? item.box ?? 0,
      };
      });
      setStockRows(normalizedRows);
      setClientName(res?.client?.name || "");
    } catch (_e) {
      setStockRows([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [clientSortOption, filters.status, search]);

  const fetchVesselFilterOptions = useCallback(async () => {
    try {
      const res = await clientVesselApi.getClientVessels({});
      const options = (Array.isArray(res?.vessels) ? res.vessels : [])
        .map((v) => (typeof v === "string" ? v : v?.name))
        .filter((v) => typeof v === "string" && v.trim() !== "");
      setVesselFilterOptions(Array.from(new Set(options)));
    } catch (_error) {
      setVesselFilterOptions([]);
    }
  }, []);

  const fetchHubFilterOptions = useCallback(async () => {
    try {
      const res = await clientHubApi.getClientHubs({});
      const options = (Array.isArray(res?.hubs) ? res.hubs : [])
        .map((h) => h?.hub)
        .filter((h) => typeof h === "string" && h.trim() !== "");
      setHubFilterOptions(Array.from(new Set(options)));
    } catch (_error) {
      setHubFilterOptions([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStock]);

  useEffect(() => {
    fetchVesselFilterOptions();
    fetchHubFilterOptions();
  }, [fetchHubFilterOptions, fetchVesselFilterOptions]);

  const filteredRows = useMemo(
    () =>
      stockRows.filter((row) => {
        if (filters.vessel && row.vessel !== filters.vessel) return false;
        if (filters.location && row.location !== filters.location) return false;
        if (filters.destination && row.destination !== filters.destination) return false;
        if (filters.poNumber && row.poNo !== filters.poNumber) return false;
        if (
          filters.fromDate &&
          row.dateOnStock &&
          row.dateOnStock !== "-" &&
          String(row.dateOnStock) < filters.fromDate
        ) {
          return false;
        }
        if (
          filters.toDate &&
          row.dateOnStock &&
          row.dateOnStock !== "-" &&
          String(row.dateOnStock) > filters.toDate
        ) {
          return false;
        }
        return true;
      }),
    [filters, stockRows]
  );
  const sortedFilteredRows = useMemo(() => {
    const rows = [...filteredRows];
    const getViaHub = (row) => String(row.viaHub2 && row.viaHub2 !== "-" ? row.viaHub2 : row.viaHub1 || "").toLowerCase().trim();
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

    if (clientSortOption === "via_hub") {
      rows.sort((a, b) => getViaHub(a).localeCompare(getViaHub(b)));
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
        const hubCmp = getViaHub(a).localeCompare(getViaHub(b));
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
    return rows;
  }, [clientSortOption, filteredRows]);
  const pagedRows = useMemo(
    () => {
      const pageSize = Number(entries);
      const start = (currentPage - 1) * pageSize;
      return sortedFilteredRows.slice(start, start + pageSize);
    },
    [currentPage, entries, sortedFilteredRows]
  );
  const totalPages = Math.max(1, Math.ceil(sortedFilteredRows.length / Number(entries)));
  const pageStart = sortedFilteredRows.length ? (currentPage - 1) * Number(entries) + 1 : 0;
  const pageEnd = Math.min(currentPage * Number(entries), sortedFilteredRows.length);

  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedRowIds.includes(row.id));

  useEffect(() => {
    const currentIds = new Set(pagedRows.map((row) => row.id));
    setSelectedRowIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [pagedRows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [entries, filters, search]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const selectedVessel = location?.state?.selectedVessel;
    const selectedHubLocation = location?.state?.selectedHubLocation;
    const stockStatus = location?.state?.dashboardFilter?.stockStatus;
    if (selectedVessel || selectedHubLocation || stockStatus) {
      setFilters((prev) => ({
        ...prev,
        vessel: selectedVessel || prev.vessel,
        location: selectedHubLocation || prev.location,
        status: stockStatus || prev.status,
      }));
      clearClientNavigationState();
    }
  }, [location]);

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      vessel: "",
      status: "",
      location: "",
      destination: "",
      poNumber: "",
    });
    setSearch("");
    setEntries("50");
    setCurrentPage(1);
    setSelectedRowIds([]);
  };
  const formatStatus = (status) => {
    const value = String(status || "").trim();
    if (!value) return "-";
    return value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  };

  const vesselOptions = useMemo(
    () =>
      vesselFilterOptions.length
        ? vesselFilterOptions
        : Array.from(new Set(stockRows.map((r) => r.vessel).filter(Boolean).filter((v) => v !== "-"))),
    [stockRows, vesselFilterOptions]
  );
  const locationOptions = useMemo(
    () =>
      hubFilterOptions.length
        ? hubFilterOptions
        : Array.from(new Set(stockRows.map((r) => r.location).filter(Boolean).filter((v) => v !== "-"))),
    [stockRows, hubFilterOptions]
  );
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

  const handleViewReportFile = async (row, attachment) => {
    if (!isClientPortalStockStatus(row.stockStatusKey)) return;
    const stockRecordId = row.stockRecordId ?? row.stockItemId;
    if (!stockRecordId || !attachment?.id) return;
    setIsPreparingPreview(true);
    try {
      const response = await fetchReportBlob({ stockRecordId }, attachment, false);
      if (!(response?.data instanceof Blob)) {
        throw new Error("Could not load file.");
      }
      const blobUrl = URL.createObjectURL(response.data);
      setReportPreviewItems((prev) => {
        clearPreviewUrls(prev);
        return [
          {
            rowId: row.id,
            stockRecordId,
            attachmentId: attachment.id,
            filename: resolveReportDownloadFilename(attachment, response),
            blobUrl,
          },
        ];
      });
      setActivePreviewIndex(0);
      setIsReportPreviewOpen(true);
    } catch (e) {
      toast({
        title: "Unable to open file",
        description: e?.message || "Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPreparingPreview(false);
    }
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

  const handleDownloadExcel = () => {
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
      "Stock Status",
      "Date On Stock",
      "SO Number",
      "Currency",
      "Value",
    ];
    const rowsForExport = sortedFilteredRows.map((row) => [
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
            {clientName ? `Showing stock for ${clientName}.` : "Track inventory movement by vessel, location, and date range."}
          </Text>
        </Box>
      </Flex>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
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
              options={toSelectOptions(vesselOptions)}
              placeholder="All vessels"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select size="sm" placeholder="All statuses" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
              {FALLBACK_ACTIVE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value="delivered">Delivered</option>
              <option value="returned">Returned</option>
              <option value="lost">Lost</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Location</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.location}
              onChange={(value) => handleFilterChange("location", value || "")}
              options={toSelectOptions(locationOptions)}
              placeholder="All locations"
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
            <Select size="xs" w="72px" value={entries} onChange={(e) => setEntries(e.target.value)}>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
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
                {({
                  via_hub: "Sorting: VIA HUB (Alphabetically)",
                  via_vessel: "Sorting: VIA VESSEL (Alphabetically)",
                  status: "Sorting: Stock Status",
                  via_hub_status: "Sorting: VIA HUB + Status",
                  via_vessel_status: "Sorting: VIA VESSEL + Status",
                  none: "Sorting: No Sort",
                }[clientSortOption] || "Sorting: No Sort")}
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => setClientSortOption("via_hub")}>
                  Sort by VIA HUB (Alphabetically)
                </MenuItem>
                <MenuItem onClick={() => setClientSortOption("via_vessel")}>
                  Sort by VIA VESSEL (Alphabetically)
                </MenuItem>
                <MenuItem onClick={() => setClientSortOption("status")}>
                  Sort by Stock Status
                </MenuItem>
                <MenuItem onClick={() => setClientSortOption("via_hub_status")}>
                  Sort by VIA HUB + Status
                </MenuItem>
                <MenuItem onClick={() => setClientSortOption("via_vessel_status")}>
                  Sort by VIA VESSEL + Status
                </MenuItem>
                <MenuItem onClick={() => setClientSortOption("none")}>
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

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" overflowX="auto">
        {isLoading && (
          <Text px={4} py={3} fontSize="sm" color={muted}>
            Loading stock report...
          </Text>
        )}
        <Table
          size="sm"
          variant="simple"
          sx={{
            tableLayout: "auto",
            th: {
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
                  <Td>{row.client}</Td>
                  <Td>{row.vessel}</Td>
                  <Td>{row.warehouseId}</Td>
                  <Td>{row.supplier}</Td>
                  <Td>{row.poNo}</Td>
                  <Td>{row.dgUnNumber}</Td>
                  <Td>{row.boxes}</Td>
                  <Td>{row.weight}</Td>
                  <Td>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => handleOpenDimensionsModal(row)}
                    >
                      {row.totalVolumeCbm}
                    </Button>
                  </Td>
                  <Td>{row.origin}</Td>
                  <Td>{row.viaHub1}</Td>
                  <Td>{row.viaHub2}</Td>
                  <Td>{row.apDestination}</Td>
                  <Td>{row.destination}</Td>
                  <Td>
                    <Badge
                      borderRadius="full"
                      px={2.5}
                      py={1}
                      colorScheme={statusColorMap[String(row.stockStatus || "").toLowerCase()] || "gray"}
                    >
                      {formatStatus(row.stockStatus)}
                    </Badge>
                  </Td>
                  <Td>{row.dateOnStock}</Td>
                  <Td>{row.soNumber}</Td>
                  <Td>{row.currency}</Td>
                  <Td>{row.value}</Td>
                  <Td>
                    {isClientPortalStockStatus(row.stockStatusKey) ? (
                      row.stockRecordId && (row.reportAttachments?.length || 0) > 0 ? (
                        <StockListAttachmentsCell
                          attachments={row.reportAttachments}
                          stockItemId={row.stockRecordId}
                          previousLabel="Previous status reports"
                          emptyLabel="—"
                          onViewFile={(att, stockRecordId) =>
                            handleViewReportFile(
                              { ...row, stockRecordId },
                              att
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
      <Flex mt={2} justify="space-between" align="center" direction={{ base: "column", md: "row" }} gap={2}>
        <Text fontSize="xs" color={muted}>
          Showing {pageStart}-{pageEnd} of {sortedFilteredRows.length} entries
        </Text>
        <Flex gap={2} align="center">
          <Button
            size="xs"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            isDisabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Text fontSize="xs" color={muted}>
            Page {currentPage} of {totalPages}
          </Text>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            isDisabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </Flex>
      </Flex>

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
        onViewFile={(att, stockRecordId) =>
          handleViewReportFile(
            {
              id: previousReportsModal.rowId,
              stockRecordId,
              stockStatusKey: previousReportsModal.stockStatusKey,
            },
            att
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
    </Box>
  );
}

export default ClientStock;
