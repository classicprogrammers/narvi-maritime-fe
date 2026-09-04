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
import clientShippingOrdersApi from "api/clientShippingOrders";
import clientVesselApi from "api/clientVessel";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { useStockAttachmentsGallery } from "hooks/useStockAttachmentsGallery";
import { normalizeOrder, toDateOnly } from "views/admin/shipping-order/shippingOrderUtils";
import { resolveShippingOrderDownloadFilename } from "utils/shippingOrderAttachments";
import { SHIPPING_ORDER_STATUS_FILTER_OPTIONS } from "utils/shippingOrderListState";
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

function ClientShippingOrders() {
  const toast = useToast();
  const [filters, setFilters] = useState({
    vessel: "",
    status: "",
    destination: "",
    soNumber: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [clientName, setClientName] = useState("");
  const [vesselOptions, setVesselOptions] = useState([]);
  const [loadingFilesOrderId, setLoadingFilesOrderId] = useState(null);
  const filesCacheRef = useRef(new Map());

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const softBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const tableRowHoverBg = useColorModeValue("gray.50", "whiteAlpha.100");

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
      const res = await clientShippingOrdersApi.getClientShippingOrders({
        page: 1,
        page_size: 80,
        fetch_all: true,
        sort_by: "so_id",
        sort_order: "desc",
        search: search.trim() || undefined,
        done: filters.status || undefined,
        vessel_id: selectedVessel?.id,
        destination: filters.destination || undefined,
        so_id: filters.soNumber || undefined,
      });

      filesCacheRef.current.clear();

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
            destinationDisplay: order.destination || "-",
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
    filters.destination,
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
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (
        filters.destination &&
        !String(row.destinationDisplay || "")
          .toLowerCase()
          .includes(filters.destination.toLowerCase())
      ) {
        return false;
      }
      if (filters.soNumber) {
        const so = String(row.so_number || row.so_id || "").toLowerCase();
        if (!so.includes(String(filters.soNumber).toLowerCase().replace(/^so[- ]?/i, ""))) {
          return false;
        }
      }
      return true;
    });
  }, [filters.destination, filters.soNumber, rows]);

  const pagedRows = useMemo(() => {
    const pageSize = Number(entries);
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, entries, filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / Number(entries)));
  const pageStart = filteredRows.length ? (currentPage - 1) * Number(entries) + 1 : 0;
  const pageEnd = Math.min(currentPage * Number(entries), filteredRows.length);

  const destinationOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.destinationDisplay).filter((v) => v && v !== "-"))
      ).map((v) => ({ id: v, name: v })),
    [rows]
  );

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
      soNumber: "",
    });
    setSearch("");
    setEntries("50");
    setCurrentPage(1);
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
      "Next Action",
      "Client Case / Invoice Ref",
      "Vessel Agent Details",
      "Quotation",
      "Date Created",
      "Attachments",
      "CIPL Files",
      "Package",
    ];

    const rowsForExport = filteredRows.map((row) => [
      row.so_number || "-",
      formatStatusLabel(row.done),
      row.vessel_name || "-",
      row.destinationDisplay || "-",
      formatDate(row.eta_date),
      formatDate(row.etb),
      formatDate(row.etd),
      formatDate(row.so_delivery_date),
      formatDate(row.next_action),
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
              {SHIPPING_ORDER_STATUS_FILTER_OPTIONS.map((opt) => (
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
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, destination: value || "" }))
              }
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
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
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

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead bg={softBg}>
            <Tr>
              <Th>SO Number</Th>
              <Th>Status</Th>
              <Th>Vessel</Th>
              <Th>Destination</Th>
              <Th>ETA</Th>
              <Th>ETB</Th>
              <Th>ETD</Th>
              <Th>SO Delivery</Th>
              <Th>Next Action</Th>
              <Th>Client Case / Invoice Ref</Th>
              <Th>Files</Th>
              <Th>Date Created</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedRows.map((row) => (
              <Tr key={row.id || row.so_number} _hover={{ bg: tableRowHoverBg }}>
                <Td fontWeight="600">{row.so_number || "-"}</Td>
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
                <Td>{formatDate(row.next_action)}</Td>
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
        {!isLoading && pagedRows.length === 0 && (
          <Text px={4} py={3} fontSize="sm" color={muted}>
            No shipping orders found for the selected filters.
          </Text>
        )}
      </Box>

      {isLoading && (
        <Text mt={2} fontSize="xs" color={muted}>
          Loading shipping orders...
        </Text>
      )}

      <Flex
        mt={2}
        justify="space-between"
        align="center"
        direction={{ base: "column", md: "row" }}
        gap={2}
      >
        <Text fontSize="xs" color={muted}>
          Showing {pageStart}-{pageEnd} of {filteredRows.length} entries
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

      {galleryModal}
    </Box>
  );
}

export default ClientShippingOrders;
