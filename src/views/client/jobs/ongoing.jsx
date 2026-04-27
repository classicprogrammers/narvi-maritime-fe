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
import {
  MdFileDownload,
  MdFilterAlt,
  MdPictureAsPdf,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import clientJobsApi from "api/clientJobs";
import clientVesselApi from "api/clientVessel";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";

function ClientOngoingJobs() {
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    vessel: "",
    status: "In Transit",
    origin: "",
    destination: "",
    poNumber: "",
  });
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState("50");
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [clientName, setClientName] = useState("");
  const [vesselOptions, setVesselOptions] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkPdfLoading, setIsBulkPdfLoading] = useState(false);
  const [pdfPreviewItems, setPdfPreviewItems] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const toast = useToast();

  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("secondaryGray.200", "whiteAlpha.200");
  const headingColor = useColorModeValue("navy.700", "white");
  const muted = useColorModeValue("secondaryGray.700", "secondaryGray.600");
  const softBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  const fetchVessels = useCallback(async () => {
    try {
      const res = await clientVesselApi.getClientVessels({});
      const options = (Array.isArray(res?.vessels) ? res.vessels : [])
        .map((v) => ({ id: v?.id, name: typeof v === "string" ? v : v?.name }))
        .filter((v) => v.name);
      setVesselOptions(options);
    } catch (_e) {
      setVesselOptions([]);
    }
  }, []);

  const fetchActiveJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const selectedVessel = vesselOptions.find((v) => String(v.name) === String(filters.vessel));
      const res = await clientJobsApi.getActiveJobs({
        search: search.trim() || undefined,
        status: filters.status === "In Transit" ? "in_transit" : "stock",
        vessel_id: selectedVessel?.id,
        date_from: filters.fromDate || undefined,
        date_to: filters.toDate || undefined,
        origin: filters.origin || undefined,
      });
      const mapped = (res?.stock_list || []).map((item, idx) => ({
        id: `${item.stock_item_id || "active"}-${idx}`,
        vessel: item.vessel?.name || "-",
        jobId: item.stock_item_id || "-",
        poText: item.po_text || (Array.isArray(item.po_number) ? item.po_number.join(", ") : "-"),
        mode: item.warehouse_id || "-",
        remarks: item.remarks || "-",
        status: item.stock_status || "-",
        etd: item.date_on_stock || "-",
        eta: "-",
        origin: item.origin || "-",
        destination: item.destination || "-",
        combined: item.so_number || "-",
        totalPackages: item.box ?? "-",
        totalWeight: item.weight ?? "-",
      }));
      setRows(mapped);
      setClientName(res?.client?.name || "");
    } catch (_e) {
      setRows([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [filters.fromDate, filters.origin, filters.status, filters.toDate, filters.vessel, search, vesselOptions]);

  useEffect(() => {
    fetchVessels();
  }, [fetchVessels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchActiveJobs]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filters.destination && !String(row.destination || "").toLowerCase().includes(filters.destination.toLowerCase())) {
        return false;
      }
      if (filters.poNumber && !String(row.poText || "").toLowerCase().includes(filters.poNumber.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [filters.destination, filters.poNumber, rows]);

  const pagedRows = useMemo(() => filteredRows.slice(0, Number(entries)), [entries, filteredRows]);
  const destinationOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.destination).filter((v) => v && v !== "-"))).map((v) => ({ id: v, name: v })),
    [rows]
  );
  const poOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.poText).filter((v) => v && v !== "-"))).map((v) => ({ id: v, name: v })),
    [rows]
  );
  const originOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.origin).filter((v) => v && v !== "-"))).map((v) => ({ id: v, name: v })),
    [rows]
  );
  const vesselFilterOptions = useMemo(
    () => vesselOptions.map((v) => ({ id: v.name, name: v.name })),
    [vesselOptions]
  );
  const allVisibleSelected =
    pagedRows.length > 0 && pagedRows.every((row) => selectedRowIds.includes(row.id));

  useEffect(() => {
    const currentIds = new Set(pagedRows.map((row) => row.id));
    setSelectedRowIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [pagedRows]);

  const handleReset = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      vessel: "",
      status: "In Transit",
      origin: "",
      destination: "",
      poNumber: "",
    });
    setSearch("");
    setEntries("50");
    setSelectedRowIds([]);
  };

  const loadLetterheadOnPdf = async (doc) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        doc.addImage(img, "JPEG", 0, 0, pageWidth, pageHeight);
        resolve();
      };
      img.onerror = reject;
      img.src = narviLetterheadPrint;
    });
  };

  const buildJobRowPdf = async (row) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4", compress: true });
    const left = 30;
    const top = 150;
    try {
      await loadLetterheadOnPdf(doc);
    } catch (_e) {
      // ignore letterhead errors
    }
    doc.setFontSize(12);
    doc.text(`Ongoing Job - ${row.jobId || "-"}`, left, top);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, left, top + 14);
    autoTable(doc, {
      startY: top + 30,
      head: [["Field", "Value"]],
      body: [
        ["Vessel", row.vessel || "-"],
        ["Job ID", row.jobId || "-"],
        ["PO Number", row.poText || "-"],
        ["Mode of Transport", row.mode || "-"],
        ["Remarks", row.remarks || "-"],
        ["Status", row.status || "-"],
        ["ETD", row.etd || "-"],
        ["ETA", row.eta || "-"],
        ["Origin", row.origin || "-"],
        ["Destination", row.destination || "-"],
        ["Combined", row.combined || "-"],
        ["Total Packages", row.totalPackages || "-"],
        ["Total Weight", row.totalWeight || "-"],
      ],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [28, 74, 149], textColor: 255 },
      margin: { left, right: 24, bottom: 24 },
      columnStyles: { 0: { cellWidth: 170, fontStyle: "bold" } },
    });
    return doc;
  };

  const getJobPdfFilename = (row) =>
    `ongoing-job-${String(row.jobId || "job").replace(/[^a-zA-Z0-9-_]+/g, "-")}.pdf`;

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

  const handleClosePdfPreview = useCallback(() => {
    setIsPdfPreviewOpen(false);
    setActivePreviewIndex(0);
    setPdfPreviewItems((prev) => {
      clearPreviewUrls(prev);
      return [];
    });
  }, [clearPreviewUrls]);

  useEffect(() => () => clearPreviewUrls(pdfPreviewItems), [clearPreviewUrls, pdfPreviewItems]);

  const handleOpenPdfPreview = async (rowsToPreview) => {
    if (!rowsToPreview.length) {
      toast({
        title: "No rows selected",
        description: "Select at least one row to preview PDFs.",
        status: "info",
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    setIsPreparingPreview(true);
    try {
      const nextPreviewItems = [];
      for (const rowItem of rowsToPreview) {
        // eslint-disable-next-line no-await-in-loop
        const doc = await buildJobRowPdf(rowItem);
        const blobUrl = URL.createObjectURL(doc.output("blob"));
        nextPreviewItems.push({ rowId: rowItem.id, filename: getJobPdfFilename(rowItem), blobUrl });
      }
      setPdfPreviewItems((prev) => {
        clearPreviewUrls(prev);
        return nextPreviewItems;
      });
      setActivePreviewIndex(0);
      setIsPdfPreviewOpen(true);
    } catch (_e) {
      toast({ title: "Unable to prepare preview", status: "error", duration: 3000, isClosable: true });
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handlePreviewSelectedPdfs = async () => {
    setIsBulkPdfLoading(true);
    try {
      await handleOpenPdfPreview(pagedRows.filter((row) => selectedRowIds.includes(row.id)));
    } finally {
      setIsBulkPdfLoading(false);
    }
  };

  const handleDownloadCurrentPreview = () => {
    const active = pdfPreviewItems[activePreviewIndex];
    if (!active) return;
    triggerBrowserDownload(active.blobUrl, active.filename);
  };

  const handleDownloadAllFromPreview = () => {
    pdfPreviewItems.forEach((item) => triggerBrowserDownload(item.blobUrl, item.filename));
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
      "Vessel Name",
      "Job ID",
      "PO Number",
      "Mode of Transport",
      "Remarks",
      "Status",
      "ETD",
      "ETA",
      "Origin",
      "Destination",
      "Combined",
      "Total No of Packages",
      "Total Weight (KGS)",
    ];

    const rowsForExport = filteredRows.map((row) => [
      row.vessel || "-",
      row.jobId || "-",
      row.poText || "-",
      row.mode || "-",
      row.remarks || "-",
      row.status || "-",
      row.etd || "-",
      row.eta || "-",
      row.origin || "-",
      row.destination || "-",
      row.combined || "-",
      row.totalPackages || "-",
      row.totalWeight || "-",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rowsForExport]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ongoing Jobs");
    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `ongoing-jobs-${dateTag}.xlsx`);
  };

  return (
    <Box>
      <Heading fontSize="24px" lineHeight="32px" color={headingColor} mb={4}>
        Ongoing Jobs{clientName ? ` - ${clientName}` : ""}
      </Heading>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" p={5} mb={5}>
        <Text fontSize="sm" fontWeight="700" color={headingColor} mb={4}>
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Date Range</Text>
            <Flex gap={2}>
              <Input size="sm" type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
              <Input size="sm" type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
            </Flex>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Vessel</Text>
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
            <Text fontSize="xs" mb={1} color={muted}>Status</Text>
            <Select size="sm" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
              <option>In Transit</option>
              <option>In Stock</option>
            </Select>
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Origin</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.origin}
              onChange={(value) => setFilters((prev) => ({ ...prev, origin: value || "" }))}
              options={originOptions}
              placeholder="All origins"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>Destination</Text>
            <SimpleSearchableSelect
              size="sm"
              value={filters.destination}
              onChange={(value) => setFilters((prev) => ({ ...prev, destination: value || "" }))}
              options={destinationOptions}
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
              onChange={(value) => setFilters((prev) => ({ ...prev, poNumber: value || "" }))}
              options={poOptions}
              placeholder="All PO numbers"
              valueKey="id"
              displayKey="name"
            />
          </GridItem>
        </Grid>
        <Flex mt={4} gap={3}>
          <Button size="sm" variant="brand" leftIcon={<Icon as={MdFilterAlt} />}>
            Apply Filter
          </Button>
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
          <Flex align="center" gap={3}>
            <Menu>
              <MenuButton
                as={Button}
                size="sm"
                variant="outline"
                borderColor={borderColor}
                leftIcon={<Icon as={MdFileDownload} />}
                onClick={handleDownloadExcel}
              >
                Download
              </MenuButton>
              <MenuList>
                <MenuItem icon={<Icon as={MdPictureAsPdf} color="red.500" />} onClick={handlePreviewSelectedPdfs}>
                  Preview PDF (Selected)
                </MenuItem>
                <MenuItem onClick={handleDownloadExcel}>Download Excel</MenuItem>
              </MenuList>
            </Menu>
            <Button
              size="sm"
              variant="brand"
              leftIcon={<Icon as={MdPictureAsPdf} />}
              onClick={handlePreviewSelectedPdfs}
              isLoading={isBulkPdfLoading}
              loadingText="Generating..."
            >
              Preview Selected PDFs
            </Button>
            <InputGroup size="sm" maxW="220px">
              <InputLeftElement>
                <Icon as={MdSearch} color={muted} />
              </InputLeftElement>
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
          </Flex>
        </Flex>
      </Box>

      <Box bg={cardBg} border="1px solid" borderColor={borderColor} borderRadius="16px" overflowX="auto">
        <Table size="sm" variant="simple">
          <Thead bg={softBg}>
            <Tr>
              <Th>
                <Checkbox
                  isChecked={allVisibleSelected}
                  onChange={(e) => handleToggleSelectAllVisible(e.target.checked)}
                />
              </Th>
              <Th>Vessel Name</Th>
              <Th>Job ID</Th>
              <Th>Mode of Transport</Th>
              <Th>Remarks</Th>
              <Th>Status</Th>
              <Th>ETD</Th>
              <Th>ETA</Th>
              <Th>Origin</Th>
              <Th>Destination</Th>
              <Th>Combined</Th>
              <Th>Total No of Packages</Th>
              <Th>Total Weight (KGS)</Th>
            </Tr>
          </Thead>
          <Tbody>
            {pagedRows.map((row) => (
              <Tr key={`${row.jobId}-${row.vessel}`}>
                <Td>
                  <Checkbox
                    isChecked={selectedRowIds.includes(row.id)}
                    onChange={() => handleToggleRow(row.id)}
                  />
                </Td>
                <Td>{row.vessel}</Td>
                <Td>{row.jobId}</Td>
                <Td>{row.mode}</Td>
                <Td>{row.remarks}</Td>
                <Td>
                  <Badge colorScheme="orange" borderRadius="full" px={2.5} py={1}>
                    {row.status}
                  </Badge>
                </Td>
                <Td>{row.etd}</Td>
                <Td>{row.eta}</Td>
                <Td>{row.origin}</Td>
                <Td>{row.destination}</Td>
                <Td>{row.combined}</Td>
                <Td>{row.totalPackages}</Td>
                <Td>{row.totalWeight}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {!isLoading && pagedRows.length === 0 && (
          <Text px={4} py={3} fontSize="sm" color={muted}>
            No ongoing jobs found for the selected filters.
          </Text>
        )}
      </Box>
      {isLoading && (
        <Text mt={2} fontSize="xs" color={muted}>
          Loading ongoing jobs...
        </Text>
      )}
      <Text mt={2} fontSize="xs" color={muted}>
        Showing {pagedRows.length} of {filteredRows.length} entries
      </Text>

      <Modal isOpen={isPdfPreviewOpen} onClose={handleClosePdfPreview} size="5xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            PDF Preview
            {pdfPreviewItems.length > 1 ? ` (${activePreviewIndex + 1}/${pdfPreviewItems.length})` : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={2}>
            {isPreparingPreview ? (
              <Text fontSize="sm" color={muted}>Preparing preview...</Text>
            ) : pdfPreviewItems.length ? (
              <Box border="1px solid" borderColor={borderColor} borderRadius="10px" overflow="hidden">
                <iframe
                  title="Jobs PDF Preview"
                  src={pdfPreviewItems[activePreviewIndex]?.blobUrl}
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
                  isDisabled={activePreviewIndex === 0 || !pdfPreviewItems.length}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActivePreviewIndex((i) => Math.min(pdfPreviewItems.length - 1, i + 1))}
                  isDisabled={!pdfPreviewItems.length || activePreviewIndex >= pdfPreviewItems.length - 1}
                >
                  Next
                </Button>
              </Flex>
              <Flex gap={2}>
                <Button size="sm" variant="outline" onClick={handleClosePdfPreview}>Close</Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Icon as={MdPictureAsPdf} color="red.500" />}
                  onClick={handleDownloadCurrentPreview}
                  isDisabled={!pdfPreviewItems.length}
                >
                  Download This PDF
                </Button>
                <Button
                  size="sm"
                  variant="brand"
                  leftIcon={<Icon as={MdFileDownload} />}
                  onClick={handleDownloadAllFromPreview}
                  isDisabled={!pdfPreviewItems.length}
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

export default ClientOngoingJobs;
