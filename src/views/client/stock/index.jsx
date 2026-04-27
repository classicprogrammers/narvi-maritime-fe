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
  MdFilterAlt,
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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import narviLetterheadPrint from "../../../assets/letterHead/NarviLetterhead.jpeg";

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
  const [vesselFilterOptions, setVesselFilterOptions] = useState([]);
  const [hubFilterOptions, setHubFilterOptions] = useState([]);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkPdfLoading, setIsBulkPdfLoading] = useState(false);
  const [pdfPreviewItems, setPdfPreviewItems] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
  const [isPreparingPreview, setIsPreparingPreview] = useState(false);
  const [isDimensionsModalOpen, setIsDimensionsModalOpen] = useState(false);
  const [selectedDimensions, setSelectedDimensions] = useState([]);
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
      const res = await clientStockApi.getClientStock({
        search: search.trim() || undefined,
        stock_status: filters.status || undefined,
      });
      const toDisplay = (value) =>
        value != null && value !== false && String(value).trim() !== "" ? String(value) : "-";
      const toNumberDisplay = (value) =>
        value != null && value !== false && value !== "" && !Number.isNaN(Number(value))
          ? String(value)
          : "-";

      const normalizedRows = (res?.stock_list || []).map((item, idx) => ({
        id: `${item.stock_item_id || "stock"}-${idx}`,
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
        firstEntryLocation: toDisplay(item.first_entry_location || item.origin),
        viaHub1: toDisplay(item.via_hub_1),
        viaHub2: toDisplay(item.via_hub_2),
        apDestination: toDisplay(item.ap_destination),
        destination: toDisplay(item.destination),
        stockStatus: toDisplay(item.stock_status),
        soNumber: toDisplay(item.so_number),
        currency: toDisplay(item.currency),
        value: toNumberDisplay(item.value),
        deliveryIrregularities: toDisplay(item.delivery_irregularities),
        poRemarks: toDisplay(item.po_remarks),
        locationHistory: Array.isArray(item.location_history) ? item.location_history : [],
        pcsLines: Array.isArray(item.pcs?.lines)
          ? item.pcs.lines
          : Array.isArray(item.dimensions)
            ? item.dimensions
            : [],
        pcsCount: item.pcs?.count ?? item.pieces ?? item.boxes ?? item.box ?? 0,
      }));
      setStockRows(normalizedRows);
      setClientName(res?.client?.name || "");
    } catch (_e) {
      setStockRows([]);
      setClientName("");
    } finally {
      setIsLoading(false);
    }
  }, [filters.status, search]);

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

  const filteredRows = useMemo(() => {
    return stockRows
      .filter((row) => {
        if (filters.vessel && row.vessel !== filters.vessel) return false;
        if (filters.location && row.location !== filters.location) return false;
        if (filters.destination && row.destination !== filters.destination) return false;
        if (filters.poNumber && row.poNo !== filters.poNumber) return false;
        if (filters.fromDate && row.date !== "-" && row.date < filters.fromDate) return false;
        if (filters.toDate && row.date !== "-" && row.date > filters.toDate) return false;
        return true;
      })
      .slice(0, Number(entries));
  }, [entries, filters, stockRows]);

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedRowIds.includes(row.id));

  useEffect(() => {
    const currentIds = new Set(filteredRows.map((row) => row.id));
    setSelectedRowIds((prev) => prev.filter((id) => currentIds.has(id)));
  }, [filteredRows]);

  const handleFilterChange = (key, value) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const selectedVessel = location?.state?.selectedVessel;
    if (selectedVessel) {
      setFilters((prev) => ({ ...prev, vessel: selectedVessel }));
      // Clear route state after applying, so refresh/back won't re-apply unexpectedly
      if (window.history?.replaceState) {
        window.history.replaceState({}, document.title);
      }
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

  const buildStockRowPdf = async (row) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });
    const contentLeft = 30;
    const contentTop = 150;

    try {
      await loadLetterheadOnPdf(doc);
    } catch (e) {
      console.error("Failed to load letterhead image for stock PDF:", e);
    }

    doc.setFontSize(12);
    doc.text(`Stock Report - ${row.vessel || "-"}`, contentLeft, contentTop);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, contentLeft, contentTop + 14);

    const drawSectionHeader = (title, yPos) => {
      autoTable(doc, {
        startY: yPos,
        head: [[title]],
        body: [],
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [236, 238, 241], textColor: [33, 33, 33], fontStyle: "bold" },
        margin: { left: contentLeft, right: 24 },
      });
      return (doc.lastAutoTable?.finalY || yPos) + 2;
    };

    const clean = (value) =>
      value != null && value !== false && String(value).trim() !== "" ? String(value) : "-";
    const toFixedOrDash = (value, digits = 3) =>
      value != null && value !== false && value !== "" && !Number.isNaN(Number(value))
        ? Number(value).toFixed(digits)
        : "-";

    const stockDetailsRows = [
      ["PO number", clean(row.poNo), "Stock number", clean(row.stockNumber)],
      ["Supplier", clean(row.supplier), "Status", clean(formatStatus(row.stockStatus))],
      ["First entry location", clean(row.firstEntryLocation), "First entry date", clean(row.firstEntryDate)],
      ["Destination", clean(row.destination), "AP Destination", clean(row.apDestination)],
      ["Weight", clean(row.weight), "CBM", clean(row.totalVolumeCbm)],
      ["Pieces", clean(row.boxes), "Priority", "-"],
      ["Delivery Irregularities", clean(row.deliveryIrregularities), "PO remarks", clean(row.poRemarks)],
      ["SO Number", clean(row.soNumber), "Currency / Value", `${clean(row.currency)} ${clean(row.value)}`],
      ["Vessel", clean(row.vessel), "Client", clean(row.client)],
      ["DG/UN Number", clean(row.dgUnNumber), "Via Hub 1 / 2", `${clean(row.viaHub1)} / ${clean(row.viaHub2)}`],
    ];

    let cursorY = drawSectionHeader("Stock details", contentTop + 24);
    autoTable(doc, {
      startY: cursorY,
      body: stockDetailsRows,
      theme: "plain",
      styles: { fontSize: 8.7, cellPadding: { top: 3, right: 5, bottom: 3, left: 5 } },
      margin: { left: contentLeft, right: 24 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 110 },
        1: { cellWidth: 150 },
        2: { fontStyle: "bold", cellWidth: 110 },
        3: { cellWidth: 150 },
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
    cursorY = drawSectionHeader("Location history", cursorY);
    const locationHistoryRows = Array.isArray(row.locationHistory) && row.locationHistory.length
      ? row.locationHistory.map((entry) => [
        "Location",
        clean(entry?.location),
        "Delivery date",
        clean(entry?.delivery_date),
      ])
      : [["Location", clean(row.firstEntryLocation || row.origin), "Delivery date", clean(row.firstEntryDate || row.dateOnStock)]];
    autoTable(doc, {
      startY: cursorY,
      body: locationHistoryRows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: contentLeft, right: 24 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 110 },
        1: { cellWidth: 150 },
        2: { fontStyle: "bold", cellWidth: 110 },
        3: { cellWidth: 150 },
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 10;
    const pcsLines = Array.isArray(row.pcsLines) ? row.pcsLines : [];
    cursorY = drawSectionHeader(`Pcs (${clean(row.pcsCount || row.boxes || pcsLines.length || 0)})`, cursorY);
    const pcsRows = pcsLines.length
      ? pcsLines.flatMap((line, lineIndex) => ([
        [
          clean(line?.piece_name || `Piece ${line?.piece_no ?? lineIndex + 1}`),
          clean(line?.warehouse_ref),
          "Warehouse ref",
          clean(line?.warehouse_ref),
        ],
        [
          "L x W x H",
          clean(line?.lwh || (
            line?.length_cm || line?.width_cm || line?.height_cm
              ? `${clean(line?.length_cm)} x ${clean(line?.width_cm)} x ${clean(line?.height_cm)}`
              : "-"
          )),
          "CBM",
          clean(toFixedOrDash(line?.cbm, 3)),
        ],
        [
          "VW",
          clean(toFixedOrDash(line?.vw, 2)),
          "Weight",
          clean(toFixedOrDash(line?.weight ?? line?.weight_kg, 2)),
        ],
      ]))
      : [[
        "Piece 1",
        `${clean(row.client)} - ${clean(row.warehouseId)}`,
        "Warehouse ref",
        clean(row.warehouseId),
      ], [
        "L x W x H",
        "-",
        "CBM",
        clean(row.totalVolumeCbm),
      ], [
        "VW",
        "-",
        "Weight",
        clean(row.weight),
      ]];
    autoTable(doc, {
      startY: cursorY,
      body: pcsRows,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: contentLeft, right: 24, bottom: 24 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 110 },
        1: { cellWidth: 150 },
        2: { fontStyle: "bold", cellWidth: 110 },
        3: { cellWidth: 150 },
      },
    });

    return doc;
  };

  const getStockPdfFilename = (row) => {
    const vesselSlug = String(row.vessel || "vessel")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const warehouseSlug = String(row.warehouseId || "warehouse")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `stock-${vesselSlug || "vessel"}-${warehouseSlug || "warehouse"}.pdf`;
  };

  const handleDownloadSinglePdf = async (row) => {
    await handleOpenPdfPreview([row]);
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

  const handleClosePdfPreview = useCallback(() => {
    setIsPdfPreviewOpen(false);
    setActivePreviewIndex(0);
    setPdfPreviewItems((prev) => {
      clearPreviewUrls(prev);
      return [];
    });
  }, [clearPreviewUrls]);

  useEffect(() => {
    return () => {
      clearPreviewUrls(pdfPreviewItems);
    };
  }, [clearPreviewUrls, pdfPreviewItems]);

  const handleOpenPdfPreview = async (rows) => {
    if (!rows.length) {
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
      for (const rowItem of rows) {
        // Build preview blobs sequentially to keep browser responsive.
        // eslint-disable-next-line no-await-in-loop
        const doc = await buildStockRowPdf(rowItem);
        const blob = doc.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        nextPreviewItems.push({
          rowId: rowItem.id,
          filename: getStockPdfFilename(rowItem),
          blobUrl,
        });
      }

      setPdfPreviewItems((prev) => {
        clearPreviewUrls(prev);
        return nextPreviewItems;
      });
      setActivePreviewIndex(0);
      setIsPdfPreviewOpen(true);
    } catch (e) {
      console.error("Failed to build stock PDF preview:", e);
      toast({
        title: "Unable to prepare preview",
        description: "Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPreparingPreview(false);
    }
  };

  const handleDownloadSelectedPdfs = async () => {
    const selectedRows = filteredRows.filter((row) => selectedRowIds.includes(row.id));
    setIsBulkPdfLoading(true);
    try {
      await handleOpenPdfPreview(selectedRows);
    } catch (e) {
      console.error("Failed to open selected stock PDF previews:", e);
      toast({
        title: "Preview preparation failed",
        description: "Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
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
    if (!pdfPreviewItems.length) return;
    pdfPreviewItems.forEach((item) => {
      triggerBrowserDownload(item.blobUrl, item.filename);
    });
    toast({
      title: "PDF download started",
      description: `${pdfPreviewItems.length} PDF(s) queued for download.`,
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
    const visibleIds = filteredRows.map((row) => row.id);
    if (checked) {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      return;
    }
    setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
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
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={3}>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>From Date</Text>
            <Input size="sm" type="date" value={filters.fromDate} onChange={(e) => handleFilterChange("fromDate", e.target.value)} />
          </GridItem>
          <GridItem>
            <Text fontSize="xs" mb={1} color={muted}>To Date</Text>
            <Input size="sm" type="date" value={filters.toDate} onChange={(e) => handleFilterChange("toDate", e.target.value)} />
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
              <option value="stock">Stock</option>
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
          <Button size="sm" variant="brand" leftIcon={<Icon as={MdFilterAlt} />}>
            Apply Filters
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
                onClick={handleDownloadSelectedPdfs}
              >
                Preview PDF (Selected)
              </MenuItem>
              <MenuItem icon={<Icon as={MdTableChart} color="green.500" />}>
                Download Excel
              </MenuItem>
            </MenuList>
          </Menu>
          <Button
            size="sm"
            variant="brand"
            leftIcon={<Icon as={MdPictureAsPdf} />}
            onClick={handleDownloadSelectedPdfs}
            isLoading={isBulkPdfLoading}
            loadingText="Generating..."
          >
            Preview Selected PDFs
          </Button>
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
              <Th>PDF</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredRows.map((row) => {
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
                    <Button
                      size="xs"
                      variant="outline"
                      leftIcon={<Icon as={MdPictureAsPdf} color="red.500" />}
                      onClick={() => handleDownloadSinglePdf(row)}
                    >
                      Preview
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
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

      <Modal isOpen={isPdfPreviewOpen} onClose={handleClosePdfPreview} size="5xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            PDF Preview
            {pdfPreviewItems.length > 1
              ? ` (${activePreviewIndex + 1}/${pdfPreviewItems.length})`
              : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={2}>
            {isPreparingPreview ? (
              <Text fontSize="sm" color={muted}>Preparing preview...</Text>
            ) : pdfPreviewItems.length ? (
              <Box border="1px solid" borderColor={borderColor} borderRadius="10px" overflow="hidden">
                <iframe
                  title="Stock PDF Preview"
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
                  onClick={() =>
                    setActivePreviewIndex((i) => Math.min(pdfPreviewItems.length - 1, i + 1))
                  }
                  isDisabled={
                    !pdfPreviewItems.length || activePreviewIndex >= pdfPreviewItems.length - 1
                  }
                >
                  Next
                </Button>
              </Flex>
              <Flex gap={2}>
                <Button size="sm" variant="outline" onClick={handleClosePdfPreview}>
                  Close
                </Button>
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

export default ClientStock;
