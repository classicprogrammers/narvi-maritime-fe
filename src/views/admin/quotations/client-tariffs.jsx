import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  SimpleGrid,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  MdClear,
  MdContentCopy,
  MdDelete,
  MdDownload,
  MdPictureAsPdf,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import SearchableSelect from "components/forms/SearchableSelect";
import {
  getClientRateTariffOptionsApi,
  getClientRateTariffsApi,
  withFetchAll,
} from "../../../api/rate";
import { getAgentByIdQueryApi } from "../../../api/vendor";
import {
  TARIFF_SHIPMENT_TYPE_OPTIONS,
  shipmentTypeLabel,
  shipmentTypeScope,
  shipmentTypeSheetLabel,
} from "../../../utils/shipmentType";
import { buildTypeSections, uniqueCurrencies } from "../../../utils/clientTariffSections";
import CopyTariffModal from "./CopyTariffModal";
import FetchAllSwitch from "./FetchAllSwitch";
import TariffTable from "./TariffTable";
import useTariffOptions from "./useTariffOptions";
import { buildPdfModel } from "./rateListPdf";
import usePdfPreview from "./usePdfPreview";
import { downloadSheetAsExcel } from "./rateListExcel";
import {
  toTableRows,
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
const DEFAULT_FILTERS = { client_id: "", location: "", agent_id: "", incl_in_tariff: "true", shipment_type: "" };
const EMPTY_OPTIONS = { clients: [], locations: [], agents: [], inTariff: normalizeYesNoOptions() };
const shipmentTypeOptions = TARIFF_SHIPMENT_TYPE_OPTIONS;

const COLUMNS = [
  { key: "rate_name", label: "Rate Name" },
  { key: "charge_category_label", label: "Standard / If Apply" },
  { key: "currency", label: "Currency", render: (row) => row.currency ?? row.currency_id?.name },
  { key: "sales", label: "Charges", isNumeric: true },
  { key: "rate_calculation", label: "Rate Calculation" },
];

// On screen the tariff also shows each rate's shipment type; the exports are per type instead.
const SCREEN_COLUMNS = [
  ...COLUMNS,
  {
    key: "shipment_type_label",
    label: "Shipment Type",
    render: (row) => shipmentTypeLabel(row.shipment_type, row.shipment_type_label),
  },
];

// Columns of the PDFs, where the Standard / If Apply split is the section heading instead.
const PDF_COLUMNS = COLUMNS.filter((column) => column.key !== "charge_category_label");
// With a single currency it is printed once under the company name instead of in every row.
const PDF_COLUMNS_NO_CURRENCY = PDF_COLUMNS.filter((column) => column.key !== "currency");
const PDF_TYPE_LABELS = { export: "Export", import_dob: "Import + DOB" };

function parseOptions(result) {
  return {
    clients: normalizeIdOptions(result.client_options),
    locations: normalizeNameOptions(result.location_options),
    agents: normalizeIdOptions(result.agent_options),
    inTariff: normalizeYesNoOptions(result.incl_in_tariff_options),
  };
}

/** Consignee block of the selected agent: its "CNEE 2" entry (Narvi Singapore warehouse). */
async function loadConsigneeText(agentId) {
  if (!agentId) return "";
  try {
    const agent = await getAgentByIdQueryApi(agentId);
    const entries = Array.isArray(agent?.agent_cnee_ids) ? agent.agent_cnee_ids : [];
    const entry =
      entries.find((item) => /cnee\s*2|^2$/i.test(String(item?.cnee1 || "").trim())) || entries[1];
    return String(entry?.cnee_text || "").trim();
  } catch (error) {
    return "";
  }
}

export default function ClientTariffs() {
  const toast = useToast();
  const { openPdf, pdfPreviewModal } = usePdfPreview();
  const copyModal = useDisclosure();
  const copyGeneralModal = useDisclosure();

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
  const [fetchAll, setFetchAll] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false });
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isExcelLoading, setIsExcelLoading] = useState(false);

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
      shipment_type: filters.shipment_type || undefined,
    }),
    [filters.client_id, filters.location, filters.agent_id, filters.incl_in_tariff, filters.shipment_type]
  );

  const { options, loading: optionsLoading, onSearch } = useTariffOptions({
    fetchOptions: getClientRateTariffOptionsApi,
    payload: filterParams,
    parse: parseOptions,
    initial: EMPTY_OPTIONS,
  });

  // As in the stock list, fetch all is only available while a filter or search is applied.
  const hasAnyFilter = Boolean(
    search ||
      debouncedSearch ||
      filters.client_id ||
      filters.location ||
      filters.agent_id ||
      filters.shipment_type ||
      filters.incl_in_tariff !== "true"
  );
  const usesFetchAll = fetchAll && hasAnyFilter;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClientRateTariffsApi(
        withFetchAll(
          { ...filterParams, search: debouncedSearch || undefined, page, page_size: TARIFF_PAGE_SIZE },
          usesFetchAll
        )
      );
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
  }, [filterParams, debouncedSearch, page, usesFetchAll, toast]);

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

  // Exports always cover every matching record, whatever the page / fetch all setting.
  const fetchAllRows = useCallback(async (shipmentType) => {
    const result = await getClientRateTariffsApi({
      ...filterParams,
      // The Export / Import + DOB PDFs name their own type, whatever the Shipment Type filter shows.
      ...(shipmentType ? { shipment_type: shipmentType } : {}),
      search: debouncedSearch || undefined,
      fetch_all: true,
    });
    return Array.isArray(result.data) ? result.data : [];
  }, [filterParams, debouncedSearch]);

  const exportScope = useMemo(() => {
    const parts = [];
    const client = options.clients.find((o) => String(o.id) === String(filters.client_id)) || pins.client_id;
    const agent = options.agents.find((o) => String(o.id) === String(filters.agent_id)) || pins.agent_id;
    if (client) parts.push(client.name);
    if (agent) parts.push(agent.name);
    return parts.join(" · ");
  }, [options.clients, options.agents, filters, pins]);

  // The Excel file follows the Shipment Type filter: only its file name says Export / Import + DOB tariffs.
  const typeScope = shipmentTypeScope(filters.shipment_type);
  const excelFilePrefix = filters.shipment_type === "import_dob" ? "import-dob-tariffs" : "export-tariffs";

  const sourceClient = useMemo(
    () => options.clients.find((o) => String(o.id) === String(filters.client_id)) || pins.client_id || null,
    [options.clients, filters.client_id, pins.client_id]
  );

  // After copying, show the new client's tariff so it can be adjusted straight away.
  const handleCopied = (client) => {
    if (client) {
      setFilters((prev) => ({ ...prev, client_id: String(client.id) }));
      setPins((prev) => ({ ...prev, client_id: client }));
      setPage(1);
    } else {
      loadData();
    }
  };

  const handleExportExcel = useCallback(async () => {
    setIsExcelLoading(true);
    try {
      const all = await fetchAllRows();
      if (!all.length) {
        toast({ title: "No tariffs to export", status: "info", duration: 3000, isClosable: true });
        return;
      }
      const consignee = await loadConsigneeText(filters.agent_id);
      const remarksRows = [
        ...(consignee ? [[], ...consignee.split(/\r?\n/).map((line) => [line])] : []),
        ...(remarks.trim() ? [[], ["Remarks", remarks.trim()]] : []),
      ];
      downloadSheetAsExcel({
        headers: COLUMNS.map((column) => column.label),
        rows: [...toTableRows(COLUMNS, all), ...remarksRows],
        filePrefix: excelFilePrefix,
        sheetName: typeScope ? `Client Tariff - ${shipmentTypeSheetLabel(filters.shipment_type)}` : "Client Tariff",
        colWidths: [44, 20, 14, 14, 30],
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
  }, [fetchAllRows, filters.agent_id, filters.shipment_type, remarks, excelFilePrefix, typeScope, toast]);

  // Export and Import + DOB are two separate PDFs: Standard charges first, then If Apply charges.
  const handleExportPdf = useCallback(async (shipmentType) => {
    const typeLabel = PDF_TYPE_LABELS[shipmentType];
    setIsPdfLoading(true);
    try {
      const all = await fetchAllRows(shipmentType);
      if (!all.length) {
        toast({ title: `No ${typeLabel} tariffs to export`, status: "info", duration: 3000, isClosable: true });
        return;
      }
      const consignee = await loadConsigneeText(filters.agent_id);
      const currencies = uniqueCurrencies(all);
      const pdfColumns = currencies.length === 1 ? PDF_COLUMNS_NO_CURRENCY : PDF_COLUMNS;
      const model = buildPdfModel({
        // The location follows the title ("Export Tariffs - SIN"); the line below is the client name.
        title: filters.location ? `${typeLabel} Tariffs - ${filters.location}` : `${typeLabel} Tariffs`,
        tariffHeader: true,
        scopeLabel: exportScope,
        currencyLabel: currencies.length === 1 ? `Currency: ${currencies[0]}` : "",
        sections: buildTypeSections({
          rows: all,
          head: pdfColumns.map((column) => column.label),
          toBody: (sectionRows) => toTableRows(pdfColumns, sectionRows),
        }),
        footerBlocks: [consignee, remarks.trim() ? `Remarks:\n${remarks.trim()}` : ""],
        filenameSuffix: `client-tariff-${shipmentType.replace("_", "-")}`,
      });
      await openPdf(model);
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
  }, [fetchAllRows, filters.agent_id, filters.location, remarks, exportScope, openPdf, toast]);

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
          <FetchAllSwitch
            isChecked={usesFetchAll}
            isEnabled={hasAnyFilter}
            onChange={(checked) => {
              setFetchAll(checked);
              setPage(1);
            }}
          />
          {hasAnyFilter && (
            <Button size="sm" variant="outline" leftIcon={<Icon as={MdClear} />} onClick={clearFilters}>
              Clear Filters
            </Button>
          )}
          <Tooltip
            label={filters.client_id ? "Copy this client's tariff to another client" : "Select a client first"}
            hasArrow
          >
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={MdContentCopy} />}
              onClick={copyModal.onOpen}
              isDisabled={!filters.client_id || meta.totalCount === 0}
            >
              Copy Tariff
            </Button>
          </Tooltip>
          <Tooltip
            label={filters.agent_id ? "Copy this agent's general rates to a client" : "Select an agent first"}
            hasArrow
          >
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={MdContentCopy} />}
              onClick={copyGeneralModal.onOpen}
              isDisabled={!filters.agent_id}
            >
              Copy General Rates
            </Button>
          </Tooltip>
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<Icon as={MdPictureAsPdf} />}
            onClick={() => handleExportPdf("export")}
            isLoading={isPdfLoading}
            loadingText="Generating..."
            isDisabled={meta.totalCount === 0}
          >
            Export PDF
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            leftIcon={<Icon as={MdPictureAsPdf} />}
            onClick={() => handleExportPdf("import_dob")}
            isLoading={isPdfLoading}
            loadingText="Generating..."
            isDisabled={meta.totalCount === 0}
          >
            Import + DOB PDF
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
          <SearchableSelect
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
          <SearchableSelect
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
          <SearchableSelect
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
          "Shipment Type",
          <SearchableSelect
            {...selectProps}
            value={filters.shipment_type}
            options={shipmentTypeOptions}
            placeholder="All (Export + Import / DOB)"
            formatOption={(option) => option.name}
            onChange={(value) => handleFilterChange("shipment_type", value, shipmentTypeOptions)}
          />
        )}
        {field(
          "In Tariff",
          <SearchableSelect
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

      <FormControl mb="4">
        <Flex align="center" justify="space-between" mb="1">
          <FormLabel fontSize="xs" mb="0" color={textColor}>
            Remarks (printed on the PDF and Excel)
          </FormLabel>
          {/* The remarks stay when the filters change, so they are cleared here before the next location. */}
          <Button
            size="xs"
            variant="ghost"
            colorScheme="red"
            leftIcon={<Icon as={MdDelete} />}
            onClick={() => setRemarks("")}
            isDisabled={!remarks}
          >
            Delete remarks
          </Button>
        </Flex>
        <Textarea
          size="sm"
          rows={2}
          bg={inputBg}
          color={inputText}
          borderColor={borderColor}
          borderRadius="md"
          placeholder="Important information for the client, e.g. delivery to a non-bonded local warehouse will attract GST fee"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </FormControl>

      <TariffTable
        columns={SCREEN_COLUMNS}
        rows={rows}
        loading={loading}
        emptyText="No client tariffs found. Try changing or clearing the filters."
        page={page}
        pageSize={TARIFF_PAGE_SIZE}
        totalCount={meta.totalCount}
        totalPages={meta.totalPages}
        hasNext={meta.hasNext}
        hasPrevious={meta.hasPrevious}
        fetchAll={usesFetchAll}
        onPageChange={setPage}
      />

      <CopyTariffModal
        isOpen={copyModal.isOpen}
        onClose={copyModal.onClose}
        sourceClient={sourceClient}
        filterParams={filterParams}
        onCopied={handleCopied}
      />
      <CopyTariffModal
        source="general"
        isOpen={copyGeneralModal.isOpen}
        onClose={copyGeneralModal.onClose}
        filterParams={filterParams}
        onCopied={handleCopied}
      />
      {pdfPreviewModal}
    </Box>
  );
}
