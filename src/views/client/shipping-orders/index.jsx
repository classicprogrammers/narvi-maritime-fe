import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
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
  Select,
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
  useToast,
} from "@chakra-ui/react";
import { MdFileDownload, MdRefresh, MdSearch, MdVisibility } from "react-icons/md";
import { useHistory, useLocation } from "react-router-dom";
import clientShippingOrdersApi from "api/clientShippingOrders";
import clientVesselApi from "api/clientVessel";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import ShippingOrderStockList from "components/shipping-order/ShippingOrderStockList";
import { useStockAttachmentsGallery } from "hooks/useStockAttachmentsGallery";
import { formatShippingOrderDestinationDisplay, normalizeOrder, toDateOnly } from "views/admin/shipping-order/shippingOrderUtils";
import { resolveShippingOrderDownloadFilename } from "utils/shippingOrderAttachments";
import {
  parseSoFilterFromUrl,
} from "utils/shippingOrderListState";
import ClientPortalTableShell, {
  getClientPortalTableSx,
  useClientPortalTableColors,
} from "views/client/ClientPortalTableShell";
import * as XLSX from "xlsx";

const tagFilesWithKind = (files, kind) =>
  (Array.isArray(files) ? files : [])
    .filter((f) => f && f.id != null)
    .map((f) => ({ ...f, __fileKind: kind }));

const buildPreviewFilesFromAttachmentsPayload = (payload = {}) => {
  const attachments = tagFilesWithKind(payload.attachments, "attachment");
  const ciplFiles = tagFilesWithKind(payload.cipl_files, "cipl");
  const shippingPackage = payload.shipping_package || null;
  const packageMerged =
    shippingPackage?.is_merged === true ||
    shippingPackage?.has_shipping_package === true ||
    Boolean(shippingPackage?.download_url || shippingPackage?.full_download_url);
  const packageFile = packageMerged
    ? {
        id: "package",
        filename: "Shipping package.pdf",
        mimetype: "application/pdf",
        download_url: shippingPackage.download_url || shippingPackage.full_download_url,
        __fileKind: "package",
      }
    : null;
  return [...attachments, ...ciplFiles, ...(packageFile ? [packageFile] : [])];
};

const formatDate = (value) => {
  if (!value || value === false) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const dateOnly = toDateOnly(String(value));
    return dateOnly || "-";
  }
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value || value === false) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatStatusLabel = (done) => {
  if (done === "pending_pod") return "Pending POD";
  if (done === "ready_for_invoice") return "Ready for Invoice";
  if (done === "done") return "Done";
  if (done === "cancelled") return "Cancelled";
  if (done === "archive") return "Archive";
  return "Active";
};

const statusColorScheme = (done) => {
  if (done === "active") return "green";
  if (done === "done") return "blue";
  if (done === "cancelled") return "red";
  if (done === "archive") return "gray";
  if (done === "ready_for_invoice") return "purple";
  return "orange";
};

const triggerBlobDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const soNumberFromSearch = (search) => {
  const fromUrl = parseSoFilterFromUrl(search);
  if (!fromUrl) return "";
  return String(fromUrl.searchQuery || "").trim()
    || String(fromUrl.searchValue || "").replace(/^SO[- ]?/i, "").trim();
};

const CLIENT_SHIPPING_ORDER_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
];

const getClientShippingOrderStockCount = (order) => {
  const count = Number(order?.stock_item_count);
  if (Number.isFinite(count)) return count;
  if (Array.isArray(order?.stock_list)) return order.stock_list.length;
  return 0;
};

const mergeClientShippingOrderDetail = (baseOrder, raw) => {
  const normalized = normalizeOrder(raw);
  if (!normalized) return baseOrder;
  return {
    ...baseOrder,
    ...normalized,
    so_number: raw?.name || normalized.so_number || baseOrder.so_number,
    destinationDisplay:
      formatShippingOrderDestinationDisplay(normalized) || baseOrder.destinationDisplay,
    attachmentCount: Number(raw?.attachment_count ?? baseOrder.attachmentCount) || 0,
    ciplCount: Number(raw?.cipl_file_count ?? baseOrder.ciplCount) || 0,
    hasPackage: Boolean(raw?.has_shipping_package ?? baseOrder.hasPackage),
    stock_items_url: normalized.stock_items_url || baseOrder.stock_items_url,
  };
};

function ReadOnlyDetailField({ label, children, colSpan = 1 }) {
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.500");
  const bg = useColorModeValue("gray.50", "whiteAlpha.100");
  const border = useColorModeValue("gray.200", "whiteAlpha.200");
  const text = useColorModeValue("navy.700", "white");
  return (
    <GridItem colSpan={colSpan}>
      <Text
        fontSize="11px"
        fontWeight="700"
        color={muted}
        mb={1}
        textTransform="uppercase"
        letterSpacing="0.04em"
      >
        {label}
      </Text>
      <Box
        minH="40px"
        px={3}
        py={2}
        bg={bg}
        border="1px solid"
        borderColor={border}
        borderRadius="md"
      >
        {typeof children === "string" || children == null || typeof children === "number" ? (
          <Text fontSize="sm" color={text} whiteSpace="pre-wrap">
            {children || "—"}
          </Text>
        ) : (
          children
        )}
      </Box>
    </GridItem>
  );
}

function ClientShippingOrders() {
  const toast = useToast();
  const history = useHistory();
  const location = useLocation();
  const [filters, setFilters] = useState({
    vessel: "",
    status: "",
    destination: "",
    destinationQuery: "",
    destinationLabel: "",
    countryId: "",
    destinationId: "",
    soNumber: soNumberFromSearch(location.search),
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [clientName, setClientName] = useState("");
  const [vesselOptions, setVesselOptions] = useState([]);
  const [loadingFilesOrderId, setLoadingFilesOrderId] = useState(null);
  const [stockModal, setStockModal] = useState({
    isOpen: false,
    order: null,
    stockList: [],
    isLoading: false,
  });
  const filesCacheRef = useRef(new Map());
  const stockCacheRef = useRef(new Map());

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const tableColors = useClientPortalTableColors();
  const { tableRowHoverBg, tableRowEvenBg } = tableColors;

  const resolveShippingOrderPreviewUrl = useCallback(async (attachment, orderId) => {
    if (!orderId || (attachment?.id == null && attachment.__fileKind !== "package")) {
      throw new Error("File is not available for preview.");
    }
    const kind = attachment.__fileKind;
    const response =
      kind === "cipl"
        ? await clientShippingOrdersApi.downloadClientShippingOrderCiplApi(
            orderId,
            attachment,
            false
          )
        : kind === "package"
          ? await clientShippingOrdersApi.downloadClientShippingOrderPackageApi(
              orderId,
              attachment,
              false
            )
          : await clientShippingOrdersApi.downloadClientShippingOrderAttachmentApi(
              orderId,
              attachment,
              false
            );
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

  const fetchVessels = useCallback(async () => {
    try {
      const res = await clientVesselApi.getClientVessels({});
      const options = (Array.isArray(res?.vessels) ? res.vessels : [])
        .map((v) => ({ id: v?.id, name: typeof v === "string" ? v : v?.name }))
        .filter((v) => v.name);
      setVesselOptions(options);
      if (res?.client?.name) setClientName(res.client.name);
    } catch (_e) {
      setVesselOptions([]);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const selectedVessel = vesselOptions.find(
        (v) => String(v.name) === String(filters.vessel)
      );
      const destinationText = String(filters.destinationQuery || "").trim();
      const countryId = filters.countryId;
      const res = await clientShippingOrdersApi.getClientShippingOrders({
        page: 1,
        page_size: 80,
        fetch_all: true,
        sort_by: "so_id",
        sort_order: "desc",
        search: search.trim() || undefined,
        name: search.trim() || undefined,
        done: filters.status || undefined,
        vessel_id: selectedVessel?.id,
        destination: destinationText || undefined,
        country_id: countryId || undefined,
        destination_id: filters.destinationId || undefined,
        so_id: filters.soNumber || undefined,
      });

      filesCacheRef.current.clear();
      stockCacheRef.current.clear();

      const mapped = (res?.orders || [])
        .map((item) => {
          const order = normalizeOrder(item);
          if (!order) return null;
          const raw = item || {};
          const attachmentCount = Number(raw.attachment_count ?? 0) || 0;
          const ciplCount = Number(raw.cipl_file_count ?? 0) || 0;
          const hasPackage = Boolean(raw.has_shipping_package);
          return {
            ...order,
            so_number: raw.name || order.so_number,
            attachmentCount,
            ciplCount,
            hasPackage,
            attachmentsUrl: raw.attachments_url || null,
            totalFileCount: attachmentCount + ciplCount + (hasPackage ? 1 : 0),
            destinationDisplay: formatShippingOrderDestinationDisplay(order),
          };
        })
        .filter(Boolean);

      setRows(mapped);
      if (res?.client?.name) setClientName(res.client.name);
    } catch (err) {
      setRows([]);
      toast({
        title: "Unable to load shipping orders",
        description: err?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    filters.countryId,
    filters.destinationId,
    filters.destinationQuery,
    filters.soNumber,
    filters.status,
    filters.vessel,
    search,
    toast,
    vesselOptions,
  ]);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  useEffect(() => {
    const soNumber = soNumberFromSearch(location.search);
    if (!soNumber) return;
    setFilters((prev) => (prev.soNumber === soNumber ? prev : { ...prev, soNumber }));
  }, [location.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const pagedRows = useMemo(() => {
    const pageSize = Number(entries);
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [currentPage, entries, rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / Number(entries)));
  const pageStart = rows.length ? (currentPage - 1) * Number(entries) + 1 : 0;
  const pageEnd = Math.min(currentPage * Number(entries), rows.length);

  const destinationOptions = useMemo(() => {
    const unique = [];
    const seen = new Set();
    const add = (id, name, destination, countryId, destinationId) => {
      const optionId = String(id || "").trim();
      const label = String(name || "").trim();
      if (!optionId || !label || label === "-" || seen.has(optionId)) return;
      seen.add(optionId);
      unique.push({
        id: optionId,
        name: label,
        destination: String(destination || "").trim(),
        country_id: countryId || "",
        destination_id: destinationId || "",
      });
    };
    rows.forEach((row) => {
      const label = row.destinationDisplay;
      const destText = String(row.destination || "").trim();
      const countryId = row.country_id;
      const destinationId =
        row.destination_id && typeof row.destination_id === "object"
          ? row.destination_id.id
          : row.destination_id;
      const optionId =
        destText || (countryId != null && countryId !== "")
          ? `${destText}::${countryId ?? ""}`
          : label;
      add(optionId, label, destText, countryId, destinationId);
    });
    if (filters.destination) {
      add(
        filters.destination,
        filters.destinationLabel || filters.destinationQuery || filters.destination,
        filters.destinationQuery,
        filters.countryId,
        filters.destinationId
      );
    }
    return unique;
  }, [
    filters.countryId,
    filters.destination,
    filters.destinationId,
    filters.destinationLabel,
    filters.destinationQuery,
    rows,
  ]);

  const vesselFilterOptions = useMemo(
    () => vesselOptions.map((v) => ({ id: v.name, name: v.name })),
    [vesselOptions]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [entries, filters, search]);

  const handleReset = () => {
    setFilters({
      vessel: "",
      status: "",
      destination: "",
      destinationQuery: "",
      destinationLabel: "",
      countryId: "",
      destinationId: "",
      soNumber: "",
    });
    setSearch("");
    setEntries("50");
    setCurrentPage(1);
    if (location.search) {
      history.replace("/Client/Shipping-Orders");
    }
  };

  const loadOrderFiles = useCallback(async (order) => {
    if (!order?.id) return [];
    const cacheKey = String(order.id);
    if (filesCacheRef.current.has(cacheKey)) {
      return filesCacheRef.current.get(cacheKey);
    }
    const payload = await clientShippingOrdersApi.getClientShippingOrderAttachmentsApi(
      order.id,
      order.attachmentsUrl
    );
    const files = buildPreviewFilesFromAttachmentsPayload(payload);
    filesCacheRef.current.set(cacheKey, files);
    return files;
  }, []);

  const handlePreviewOrderFiles = async (order, startIndex = 0) => {
    if (!order?.id || !order.totalFileCount) return;
    setLoadingFilesOrderId(order.id);
    try {
      const files = await loadOrderFiles(order);
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
    } catch (err) {
      toast({
        title: "Unable to load files",
        description: err?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingFilesOrderId(null);
    }
  };

  const handleDownloadAllOrderFiles = async (order) => {
    if (!order?.id || !order.totalFileCount) return;
    setLoadingFilesOrderId(order.id);
    try {
      const files = await loadOrderFiles(order);
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
      for (const file of files) {
        const kind = file.__fileKind;
        const response =
          kind === "cipl"
            ? await clientShippingOrdersApi.downloadClientShippingOrderCiplApi(
                order.id,
                file,
                true
              )
            : kind === "package"
              ? await clientShippingOrdersApi.downloadClientShippingOrderPackageApi(
                  order.id,
                  file,
                  true
                )
              : await clientShippingOrdersApi.downloadClientShippingOrderAttachmentApi(
                  order.id,
                  file,
                  true
                );
        if (!(response?.data instanceof Blob)) continue;
        const filename = resolveShippingOrderDownloadFilename(file, response);
        triggerBlobDownload(response.data, filename);
      }
      toast({
        title: "Download started",
        description: `${files.length} file(s) queued for download.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Download failed",
        description: err?.message || "Unable to download files.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingFilesOrderId(null);
    }
  };

  const handleCloseStockItems = () => {
    setStockModal({
      isOpen: false,
      order: null,
      stockList: [],
      isLoading: false,
    });
  };

  const handleOpenStockItems = async (order) => {
    if (!order?.id) return;
    const cacheKey = String(order.id);
    const cachedStock = stockCacheRef.current.get(cacheKey);
    const hasCachedStock = Array.isArray(cachedStock);
    setStockModal({
      isOpen: true,
      order,
      stockList: hasCachedStock ? cachedStock : [],
      isLoading: !hasCachedStock,
    });
    try {
      const [detailRes, stockRes] = await Promise.all([
        clientShippingOrdersApi.getClientShippingOrderById(order.id).catch(() => null),
        cachedStock
          ? Promise.resolve({ stock_list: cachedStock })
          : clientShippingOrdersApi.getClientShippingOrderStockApi(
              order.id,
              order.stock_items_url
            ),
      ]);
      const rawDetail = detailRes?.order || null;
      const detailOrder = rawDetail ? mergeClientShippingOrderDetail(order, rawDetail) : order;
      const fromDetail = Array.isArray(detailOrder.stock_list) ? detailOrder.stock_list : [];
      const fromStockApi = Array.isArray(stockRes?.stock_list) ? stockRes.stock_list : [];
      const stockList = fromStockApi.length ? fromStockApi : fromDetail;
      stockCacheRef.current.set(cacheKey, stockList);
      setStockModal((prev) =>
        prev.order?.id === order.id
          ? { ...prev, order: detailOrder, stockList, isLoading: false }
          : prev
      );
    } catch (err) {
      setStockModal((prev) =>
        prev.order?.id === order.id
          ? { ...prev, stockList: [], isLoading: false }
          : prev
      );
      toast({
        title: "Unable to load stock items",
        description: err?.message || "Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDownloadExcel = () => {
    const headers = [
      "SO Number",
      "Status",
      "Vessel",
      "Destination",
      "ETA",
      "ETB",
      "ETD",
      "SO Delivery Date",
      "Client Case / Invoice Ref",
      "Vessel Agent Details",
      "Quotation",
      "Date Created",
      "Attachments",
      "CIPL Files",
      "Package",
    ];

    const rowsForExport = rows.map((row) => [
      row.so_number || "-",
      formatStatusLabel(row.done),
      row.vessel_name || "-",
      row.destinationDisplay || "-",
      formatDate(row.eta_date),
      formatDate(row.etb),
      formatDate(row.etd),
      formatDate(row.so_delivery_date),
      row.client_case_invoice_ref || "-",
      row.vsls_agent_dtls || "-",
      row.quotation || "-",
      formatDateTime(row.date_created || row.timestamp),
      row.attachmentCount || 0,
      row.ciplCount || 0,
      row.hasPackage ? "Yes" : "No",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shipping Orders");
    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `shipping-orders-${dateTag}.xlsx`);
  };

  const renderFilesCell = (order) => {
    if (!order.totalFileCount) {
      return (
        <Text fontSize="sm" color={muted}>
          -
        </Text>
      );
    }
    const isBusy = loadingFilesOrderId === order.id;
    return (
      <VStack align="stretch" spacing={1} minW="180px" maxW="240px">
        <Text fontSize="xs" color={muted}>
          {order.attachmentCount} attachment{order.attachmentCount === 1 ? "" : "s"}
          {order.ciplCount ? ` · ${order.ciplCount} CIPL` : ""}
          {order.hasPackage ? " · package" : ""}
        </Text>
        <Button
          size="xs"
          variant="outline"
          colorScheme="blue"
          leftIcon={<Icon as={MdVisibility} />}
          w="100%"
          isLoading={isBusy}
          loadingText="Loading"
          onClick={() => handlePreviewOrderFiles(order, 0)}
        >
          Preview all ({order.totalFileCount})
        </Button>
        <Button
          size="xs"
          variant="ghost"
          colorScheme="green"
          leftIcon={<Icon as={MdFileDownload} />}
          w="100%"
          isDisabled={isBusy}
          onClick={() => handleDownloadAllOrderFiles(order)}
        >
          Download all
        </Button>
      </VStack>
    );
  };

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor} mb={4}>
        Shipping Orders{clientName ? ` - ${clientName}` : ""}
      </Heading>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>
              Vessel
            </Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.vessel}
              onChange={(value) => setFilters((prev) => ({ ...prev, vessel: value || "" }))}
              options={vesselFilterOptions}
              placeholder="All vessels"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>
              Status
            </Text>
            <Select
              size="sm"
              h="40px"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All</option>
              {CLIENT_SHIPPING_ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>
              Destination
            </Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.destination}
              onChange={(value) => {
                const option = destinationOptions.find(
                  (item) => String(item.id) === String(value || "")
                );
                setFilters((prev) => ({
                  ...prev,
                  destination: value || "",
                  destinationLabel: option?.name || "",
                  destinationQuery: option?.destination || "",
                  countryId: option?.country_id || "",
                  destinationId: option?.destination_id || "",
                }));
              }}
              options={destinationOptions}
              placeholder="All destinations"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>
              SO Number
            </Text>
            <Input
              size="sm"
              h="40px"
              placeholder="e.g. 3662"
              value={filters.soNumber}
              onChange={(e) => setFilters((prev) => ({ ...prev, soNumber: e.target.value }))}
            />
          </GridItem>
        </Grid>
        <Flex mt={4} gap={3}>
          <Button
            size="sm"
            variant="outline"
            borderColor={borderColor}
            leftIcon={<Icon as={MdRefresh} />}
            onClick={handleReset}
          >
            Reset
          </Button>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={4} mb={3}>
        <Flex
          justify="space-between"
          align={{ base: "start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={3}
        >
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color={muted}>
              Show
            </Text>
            <Select size="xs" w="72px" value={entries} onChange={(e) => setEntries(e.target.value)}>
              <option value="50">50</option>
              <option value="25">25</option>
              <option value="10">10</option>
            </Select>
            <Text fontSize="sm" color={muted}>
              entries
            </Text>
          </Flex>
          <Flex align="center" gap={3}>
            <Button
              size="sm"
              style={{ padding: "8px 25px" }}
              variant="outline"
              borderColor={borderColor}
              leftIcon={<Icon as={MdFileDownload} color="green.500" />}
              onClick={handleDownloadExcel}
            >
              Download Excel
            </Button>
            <InputGroup size="sm" maxW="220px">
              <InputLeftElement>
                <Icon as={MdSearch} color={muted} />
              </InputLeftElement>
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </Flex>
        </Flex>
      </Box>

      <ClientPortalTableShell
        isLoading={isLoading}
        hasRows={pagedRows.length > 0}
        loadingLabel="Loading shipping orders..."
        emptyLabel="No shipping orders found for the selected filters."
        pageStart={pageStart}
        pageEnd={pageEnd}
        totalCount={rows.length}
        currentPage={currentPage}
        totalPages={totalPages}
        onChangePage={setCurrentPage}
      >
        <Table size="sm" variant="simple" sx={getClientPortalTableSx(tableColors)}>
          <Thead>
            <Tr>
              <Th>SO Number</Th>
              <Th>View Stock Items</Th>
              <Th>Status</Th>
              <Th>Vessel</Th>
              <Th>Destination</Th>
              <Th>ETA</Th>
              <Th>ETB</Th>
              <Th>ETD</Th>
              <Th>SO Delivery Date</Th>
              <Th>Client Case / Invoice Ref</Th>
              <Th>Files</Th>
              <Th>Date Created</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedRows.map((row) => (
              <Tr
                key={row.id || row.so_number}
                _hover={{ bg: tableRowHoverBg }}
                _even={{ bg: tableRowEvenBg }}
              >
                <Td fontWeight="600">{row.so_number || "-"}</Td>
                <Td whiteSpace="nowrap">
                  {getClientShippingOrderStockCount(row) > 0 || row.stock_items_url ? (
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="blue"
                      leftIcon={<Icon as={MdVisibility} />}
                      onClick={() => handleOpenStockItems(row)}
                    >
                      {getClientShippingOrderStockCount(row) > 0
                        ? `View stock items (${getClientShippingOrderStockCount(row)})`
                        : "View stock items"}
                    </Button>
                  ) : (
                    <Text fontSize="sm" color={muted}>
                      0 items
                    </Text>
                  )}
                </Td>
                <Td>
                  <Badge
                    colorScheme={statusColorScheme(row.done)}
                    borderRadius="full"
                    px={2.5}
                    py={1}
                  >
                    {formatStatusLabel(row.done)}
                  </Badge>
                </Td>
                <Td>{row.vessel_name || "-"}</Td>
                <Td maxW="180px">
                  <Tooltip
                    label={row.destinationDisplay}
                    isDisabled={!row.destinationDisplay || row.destinationDisplay === "-"}
                  >
                    <Text noOfLines={2}>{row.destinationDisplay || "-"}</Text>
                  </Tooltip>
                </Td>
                <Td>{formatDate(row.eta_date)}</Td>
                <Td>{formatDate(row.etb)}</Td>
                <Td>{formatDate(row.etd)}</Td>
                <Td>{formatDate(row.so_delivery_date)}</Td>
                <Td maxW="180px">
                  <Tooltip
                    label={row.client_case_invoice_ref || "-"}
                    isDisabled={
                      !row.client_case_invoice_ref || row.client_case_invoice_ref === "-"
                    }
                  >
                    <Text noOfLines={2}>{row.client_case_invoice_ref || "-"}</Text>
                  </Tooltip>
                </Td>
                <Td>{renderFilesCell(row)}</Td>
                <Td>{formatDateTime(row.date_created || row.timestamp)}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </ClientPortalTableShell>

      <Modal
        isOpen={stockModal.isOpen}
        onClose={handleCloseStockItems}
        size="6xl"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.500" />
        <ModalContent maxW="96vw" borderRadius="16px" overflow="hidden">
          <ModalHeader
            py={4}
            px={6}
            borderBottom="1px solid"
            borderColor={borderColor}
          >
            <Flex align="center" justify="space-between" pr={8} gap={3} wrap="wrap">
              <Box>
                <Text fontSize="xl" fontWeight="800" color={headingColor}>
                  {stockModal.order?.so_number || "Shipping order"}
                </Text>
                <Text fontSize="sm" color={muted} mt={0.5}>
                  Shipping order details
                </Text>
              </Box>
              {stockModal.order ? (
                <Badge
                  colorScheme={statusColorScheme(stockModal.order.done)}
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="sm"
                >
                  {formatStatusLabel(stockModal.order.done)}
                </Badge>
              ) : null}
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody px={6} py={5}>
            {stockModal.order ? (
              <Box
                border="1px solid"
                borderColor={borderColor}
                borderRadius="12px"
                p={5}
                mb={5}
                bg={cardBg}
              >
                <Text fontSize="md" fontWeight="700" color={headingColor} mb={4}>
                  Order information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4}>
                  <ReadOnlyDetailField label="SO Number">
                    {stockModal.order.so_number || "—"}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Date Created">
                    {formatDateTime(
                      stockModal.order.date_created || stockModal.order.timestamp
                    )}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Status">
                    {formatStatusLabel(stockModal.order.done)}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Client">
                    {stockModal.order.client || clientName || "—"}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Vessel">
                    {stockModal.order.vessel_name || "—"}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Destination" colSpan={{ base: 1, md: 2 }}>
                    {stockModal.order.destinationDisplay || "—"}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="ETA">
                    {formatDate(stockModal.order.eta_date)}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="ETB">
                    {formatDate(stockModal.order.etb)}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="ETD">
                    {formatDate(stockModal.order.etd)}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="SO Delivery Date">
                    {formatDate(stockModal.order.so_delivery_date)}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Quotation">
                    {stockModal.order.quotation || "—"}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Client Case / Invoice Ref" colSpan={{ base: 1, md: 2 }}>
                    {stockModal.order.client_case_invoice_ref || "—"}
                  </ReadOnlyDetailField>
                  <ReadOnlyDetailField label="Vessel Agent Details" colSpan={{ base: 1, xl: 4 }}>
                    {stockModal.order.vsls_agent_dtls || "—"}
                  </ReadOnlyDetailField>
                </Grid>
              </Box>
            ) : null}
            <Box
              border="1px solid"
              borderColor={borderColor}
              borderRadius="12px"
              p={5}
              bg={cardBg}
            >
              <ShippingOrderStockList
                title="Stock items"
                variant="client"
                stockList={stockModal.stockList}
                isLoading={stockModal.isLoading}
                stockItemCount={
                  stockModal.stockList.length ||
                  getClientShippingOrderStockCount(stockModal.order)
                }
                emptyLabel="No stock items linked to this shipping order."
              />
            </Box>
          </ModalBody>
          <ModalFooter borderTop="1px solid" borderColor={borderColor} px={6} py={3}>
            <Button size="sm" variant="outline" onClick={handleCloseStockItems}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {galleryModal}
    </Box>
  );
}

export default ClientShippingOrders;
