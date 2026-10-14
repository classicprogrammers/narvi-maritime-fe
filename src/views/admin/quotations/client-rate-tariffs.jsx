import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Spinner,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  MdClear,
  MdDownload,
  MdPictureAsPdf,
  MdPrint,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  fetchAllTariffRows,
  getClientRateTariffOptionsApi,
  getClientRateTariffsApi,
} from "../../../api/rate";
import TariffTable from "./TariffTable";
import useTariffOptions from "./useTariffOptions";
import {
  buildRateListPdf,
  buildTableReportPdfModel,
  getRateListPdfFilename,
} from "./rateListPdf";
import { downloadSheetAsExcel } from "./rateListExcel";
import {
  displayTariffValue,
  formatAgentOption,
  intParam,
  normalizeIdOptions,
  normalizeNameOptions,
  normalizeYesNoOptions,
  TARIFF_PAGE_SIZE,
  tariffErrorMessage,
  withSelectedOption,
} from "./tariffScreenUtils";

// In Tariff defaults to Yes on the backend: it is only sent when the user picks "No".
const DEFAULT_FILTERS = { client_id: "", location: "", agent_id: "", incl_in_tariff: "true" };
const EMPTY_OPTIONS = { clients: [], locations: [], agents: [], inTariff: normalizeYesNoOptions() };

const COLUMNS = [
  { key: "location", label: "Location" },
  { key: "rate_name", label: "Rate Name" },
  { key: "currency", label: "Currency", render: (row) => row.currency ?? row.currency_id?.name },
  { key: "sales", label: "Sales", isNumeric: true },
];

function parseOptions(result) {
  return {
    clients: normalizeIdOptions(result.client_options),
    locations: normalizeNameOptions(result.location_options),
    agents: normalizeIdOptions(result.agent_options),
    inTariff: normalizeYesNoOptions(result.incl_in_tariff_options),
  };
}

const exportCell = (column, row) => {
  const value = column.render ? column.render(row) : row[column.key];
  return displayTariffValue(value);
};

export default function ClientRateTariffs() {
  const toast = useToast();
  const { isOpen: isPdfOpen, onOpen: onPdfOpen, onClose: onPdfClose } = useDisclosure();
  const pdfIframeRef = useRef(null);
  const pdfBlobUrlRef = useRef(null);

  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const panelBg = useColorModeValue("gray.50", "gray.700");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pins, setPins] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false });
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [pdfModel, setPdfModel] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Selected filters, shared by the list, the dropdown narrowing and the full exports.
  const filterParams = useMemo(
    () => ({
      client_id: intParam(filters.client_id),
      location: filters.location || undefined,
      agent_id: intParam(filters.agent_id),
      incl_in_tariff: filters.incl_in_tariff === "false" ? false : undefined,
    }),
    [filters.client_id, filters.location, filters.agent_id, filters.incl_in_tariff]
  );

  const { options, loading: optionsLoading, onSearch } = useTariffOptions({
    fetchOptions: getClientRateTariffOptionsApi,
    payload: filterParams,
    parse: parseOptions,
    initial: EMPTY_OPTIONS,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClientRateTariffsApi({
        ...filterParams,
        search: debouncedSearch || undefined,
        page,
        page_size: TARIFF_PAGE_SIZE,
      });
      setRows(Array.isArray(result.data) ? result.data : []);
      setMeta({
        totalCount: result.total_count || 0,
        totalPages: result.total_pages || 1,
        hasNext: Boolean(result.has_next),
        hasPrevious: Boolean(result.has_previous),
      });
    } catch (error) {
      setRows([]);
      setMeta({ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false });
      toast({
        title: "Error",
        description: tariffErrorMessage(error, "Failed to load client tariffs."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [filterParams, debouncedSearch, page, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (field, value, optionList) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value || (field === "incl_in_tariff" ? "true" : ""),
    }));
    setPins((prev) => ({
      ...prev,
      [field]: value ? optionList?.find((option) => String(option.id) === String(value)) || prev[field] : null,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPins({});
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const hasAnyFilter = Boolean(
    search ||
      debouncedSearch ||
      filters.client_id ||
      filters.location ||
      filters.agent_id ||
      filters.incl_in_tariff !== "true"
  );

  const fetchAllRows = useCallback(
    () =>
      fetchAllTariffRows(getClientRateTariffsApi, {
        ...filterParams,
        search: debouncedSearch || undefined,
      }),
    [filterParams, debouncedSearch]
  );

  const exportScope = useMemo(() => {
    const parts = [];
    const client = options.clients.find((o) => String(o.id) === String(filters.client_id)) || pins.client_id;
    const agent = options.agents.find((o) => String(o.id) === String(filters.agent_id)) || pins.agent_id;
    if (client) parts.push(client.name);
    if (filters.location) parts.push(filters.location);
    if (agent) parts.push(agent.name);
    return parts.join(" · ");
  }, [options.clients, options.agents, filters, pins]);

  const handleExportExcel = useCallback(async () => {
    setIsExcelLoading(true);
    try {
      const all = await fetchAllRows();
      if (!all.length) {
        toast({ title: "No tariffs to export", status: "info", duration: 3000, isClosable: true });
        return;
      }
      downloadSheetAsExcel({
        headers: COLUMNS.map((column) => column.label),
        rows: all.map((row) => COLUMNS.map((column) => exportCell(column, row))),
        filePrefix: "client-tariff",
        sheetName: "Client Tariff",
        colWidths: [24, 36, 14, 14],
      });
      toast({
        title: "Excel export",
        description: `${all.length} rate${all.length === 1 ? "" : "s"} exported.`,
        status: "success",
        duration: 2200,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: tariffErrorMessage(error, "Could not load tariffs for Excel export."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsExcelLoading(false);
    }
  }, [fetchAllRows, toast]);

  const revokePdfUrl = () => {
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
    }
  };

  const handleExportPdf = useCallback(async () => {
    setIsPdfLoading(true);
    try {
      const all = await fetchAllRows();
      if (!all.length) {
        toast({ title: "No tariffs to export", status: "info", duration: 3000, isClosable: true });
        return;
      }
      const model = buildTableReportPdfModel({
        title: "Client Tariff",
        scopeLabel: exportScope,
        head: COLUMNS.map((column) => column.label),
        body: all.map((row) => COLUMNS.map((column) => exportCell(column, row))),
        filenameSuffix: "client-tariff",
      });
      const doc = await buildRateListPdf(model);
      revokePdfUrl();
      const url = URL.createObjectURL(doc.output("blob"));
      pdfBlobUrlRef.current = url;
      setPdfModel(model);
      setPdfUrl(url);
      onPdfOpen();
    } catch (error) {
      toast({
        title: "PDF failed",
        description: tariffErrorMessage(error, "Could not generate client tariff PDF."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsPdfLoading(false);
    }
  }, [fetchAllRows, exportScope, onPdfOpen, toast]);

  const handleClosePdf = () => {
    revokePdfUrl();
    setPdfUrl(null);
    onPdfClose();
  };

  const handleDownloadPdf = async () => {
    if (!pdfModel) return;
    const doc = await buildRateListPdf(pdfModel);
    doc.save(getRateListPdfFilename(pdfModel));
  };

  const handlePrint = () => {
    const win = pdfIframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  useEffect(() => revokePdfUrl, []);

  const selectProps = { size: "sm", bg: inputBg, color: inputText, borderColor, prefillOnFocus: false };

  const field = (label, control) => (
    <FormControl>
      <FormLabel fontSize="xs" mb="1" color={textColor}>
        {label}
      </FormLabel>
      {control}
    </FormControl>
  );

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb="4" flexWrap="wrap" gap="3">
        <Text fontSize="lg" fontWeight="700" color={textColor}>
          Client Tariffs
        </Text>
        <HStack spacing="3" flexWrap="wrap">
          <InputGroup size="sm" w={{ base: "100%", md: "260px" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={placeholderColor} />
            </InputLeftElement>
            <Input
              size="sm"
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              borderRadius="md"
              placeholder="Search rate name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Tooltip label="Refresh" hasArrow>
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Refresh client tariffs"
              icon={<Icon as={MdRefresh} />}
              onClick={loadData}
              isLoading={loading}
            />
          </Tooltip>
          {hasAnyFilter && (
            <Button size="sm" variant="outline" leftIcon={<Icon as={MdClear} />} onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<Icon as={MdPictureAsPdf} />}
            onClick={handleExportPdf}
            isLoading={isPdfLoading}
            loadingText="Generating..."
            isDisabled={meta.totalCount === 0}
          >
            Export PDF
          </Button>
          <Button
            size="sm"
            colorScheme="green"
            variant="outline"
            leftIcon={<Icon as={MdDownload} />}
            onClick={handleExportExcel}
            isLoading={isExcelLoading}
            loadingText="Exporting..."
            isDisabled={meta.totalCount === 0}
          >
            Export Excel
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid
        columns={{ base: 1, md: 2, xl: 4 }}
        spacing="4"
        p="4"
        mb="4"
        bg={panelBg}
        borderRadius="md"
        border="1px"
        borderColor={borderColor}
      >
        {field(
          "Client Name",
          <SimpleSearchableSelect
            {...selectProps}
            value={filters.client_id}
            options={withSelectedOption(options.clients, filters.client_id, pins.client_id)}
            placeholder="All Clients"
            formatOption={(option) => option.name}
            isLoading={optionsLoading}
            onSearchChange={(query) => onSearch("q_client", query)}
            onChange={(value) => handleFilterChange("client_id", value, options.clients)}
          />
        )}
        {field(
          "Location",
          <SimpleSearchableSelect
            {...selectProps}
            value={filters.location}
            options={withSelectedOption(options.locations, filters.location, pins.location)}
            placeholder="All Locations"
            formatOption={(option) => option.name}
            isLoading={optionsLoading}
            onSearchChange={(query) => onSearch("q_location", query)}
            onChange={(value) => handleFilterChange("location", value, options.locations)}
          />
        )}
        {field(
          "Agent",
          <SimpleSearchableSelect
            {...selectProps}
            value={filters.agent_id}
            options={withSelectedOption(options.agents, filters.agent_id, pins.agent_id)}
            placeholder="All Agents"
            formatOption={formatAgentOption}
            isLoading={optionsLoading}
            onSearchChange={(query) => onSearch("q_agent", query)}
            onChange={(value) => handleFilterChange("agent_id", value, options.agents)}
          />
        )}
        {field(
          "In Tariff",
          <SimpleSearchableSelect
            {...selectProps}
            value={filters.incl_in_tariff}
            options={options.inTariff}
            placeholder="Yes"
            isClearable={false}
            formatOption={(option) => option.name}
            onChange={(value) => handleFilterChange("incl_in_tariff", value, options.inTariff)}
          />
        )}
      </SimpleGrid>

      <TariffTable
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        emptyText="No client tariffs found. Try changing or clearing the filters."
        page={page}
        pageSize={TARIFF_PAGE_SIZE}
        totalCount={meta.totalCount}
        totalPages={meta.totalPages}
        hasNext={meta.hasNext}
        hasPrevious={meta.hasPrevious}
        onPageChange={setPage}
      />

      <Modal isOpen={isPdfOpen} onClose={handleClosePdf} size="full" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent m={0} maxW="100vw" h="100vh" maxH="100vh" borderRadius={0} display="flex" flexDirection="column">
          <ModalHeader flexShrink={0}>
            {pdfModel?.title || "Client Tariff"}
            {pdfModel?.scopeLabel ? ` — ${pdfModel.scopeLabel}` : ""}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} flex="1" minH={0} overflow="hidden" display="flex" flexDirection="column">
            {pdfUrl ? (
              <Box flex="1" minH={0} w="100%" display="flex">
                <iframe
                  ref={pdfIframeRef}
                  title="Client tariff PDF preview"
                  src={pdfUrl}
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
            <Button leftIcon={<Icon as={MdPrint} />} onClick={handlePrint} isDisabled={!pdfUrl}>
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
            <Button variant="ghost" onClick={handleClosePdf}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
