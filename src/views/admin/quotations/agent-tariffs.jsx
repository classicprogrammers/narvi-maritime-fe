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
  SimpleGrid,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdClear, MdDownload, MdPictureAsPdf, MdRefresh, MdSearch } from "react-icons/md";
import SearchableSelect from "components/forms/SearchableSelect";
import { getAgentRateTariffOptionsApi, getAgentRateTariffsApi, withFetchAll } from "../../../api/rate";
import {
  defaultAgentTariffState,
  readPersistedAgentTariffState,
  writePersistedAgentTariffState,
} from "../../../utils/agentTariffState";
import FetchAllSwitch from "./FetchAllSwitch";
import { exportScopeProblem } from "../../../utils/clientTariffSections";
import { buildTypeTariffPdfModel, loadConsigneeText, PDF_TYPE_LABELS } from "./typeTariffPdf";
import { downloadSheetAsExcel } from "./rateListExcel";
import usePdfPreview from "./usePdfPreview";
import TariffTable from "./TariffTable";
import useTariffOptions from "./useTariffOptions";
import {
  formatAgentOption,
  intParam,
  normalizeIdOptions,
  normalizeNameOptions,
  TARIFF_PAGE_SIZE,
  toTableRows,
  tariffErrorMessage,
  withSelectedOption,
} from "./tariffScreenUtils";

const DEFAULT_FILTERS = { agent_id: "", location: "", import_group: "", active: "" };

// Archived rows are hidden unless active=false is sent, so "Active" is the default (no param).
const ACTIVE_OPTIONS = [
  { id: "true", name: "Active" },
  { id: "false", name: "Archived" },
];

const EMPTY_OPTIONS = { agents: [], locations: [], groups: [] };

// The on-screen list follows Sort Order, as in Rate Items. The PDF / Excel exports list Standard rows first, then
// the groups in the order set in Rate Items (the backend sorts, so nothing is re-sorted here).
const AGENT_TARIFF_SORT = { sort_by: "sort_order", sort_order: "asc" };
const AGENT_TARIFF_EXPORT_SORT = { sort_by: "group_name" };

const COLUMNS = [
  { key: "group_name", label: "Group Name" },
  { key: "rate_name", label: "Rate Name" },
  { key: "rate_text", label: "Rate Text" },
  { key: "charge_category_label", label: "Standard / If Apply" },
  { key: "rate_calculation", label: "Rate Calculation" },
  { key: "rate_cost", label: "Rate Cost", isNumeric: true },
  { key: "sales", label: "Sales", isNumeric: true },
];

// The Excel export leaves out Rate Text and Sales.
const EXCEL_COLUMNS = COLUMNS.filter((column) => !["rate_text", "sales"].includes(column.key));

function parseOptions(result) {
  return {
    agents: normalizeIdOptions(result.agent_options),
    locations: normalizeNameOptions(result.location_options),
    groups: normalizeNameOptions(result.import_group_options),
  };
}

export default function AgentTariffs() {
  const toast = useToast();
  const { openPdf, pdfPreviewModal } = usePdfPreview();
  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const panelBg = useColorModeValue("gray.50", "gray.700");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");

  // Filters survive switching screens and refreshes; only Clear Filters resets them.
  const [saved] = useState(() => readPersistedAgentTariffState() || defaultAgentTariffState);
  const [filters, setFilters] = useState(saved.filters);
  const [pins, setPins] = useState(saved.pins);
  const [search, setSearch] = useState(saved.search);
  const [debouncedSearch, setDebouncedSearch] = useState(saved.search.trim());
  const [page, setPage] = useState(saved.page);
  const [fetchAll, setFetchAll] = useState(saved.fetchAll);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false });

  const lastSearchRef = useRef(saved.search.trim());
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      // Keep the restored page when the search is unchanged (e.g. on mount).
      if (next === lastSearchRef.current) return;
      lastSearchRef.current = next;
      setDebouncedSearch(next);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    writePersistedAgentTariffState({ filters, pins, search, page, fetchAll });
  }, [filters, pins, search, page, fetchAll]);

  const optionsPayload = useMemo(
    () => ({
      agent_id: intParam(filters.agent_id),
      location: filters.location || undefined,
      import_group: filters.import_group || undefined,
    }),
    [filters.agent_id, filters.location, filters.import_group]
  );

  const { options, loading: optionsLoading, onSearch } = useTariffOptions({
    fetchOptions: getAgentRateTariffOptionsApi,
    payload: optionsPayload,
    parse: parseOptions,
    initial: EMPTY_OPTIONS,
  });

  // As in the stock list, fetch all is only available while a filter or search is applied.
  const hasAnyFilter = Boolean(search || debouncedSearch || Object.values(filters).some(Boolean));
  const usesFetchAll = fetchAll && hasAnyFilter;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAgentRateTariffsApi(
        withFetchAll(
          {
            page,
            page_size: TARIFF_PAGE_SIZE,
            search: debouncedSearch || undefined,
            ...optionsPayload,
            ...AGENT_TARIFF_SORT,
            active: filters.active === "" ? undefined : filters.active === "true",
          },
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
        description: tariffErrorMessage(error, "Failed to load agent tariffs."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, optionsPayload, filters.active, usesFetchAll, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exports always cover every matching record, whatever the page / fetch all setting.
  const handleExport = async (kind) => {
    // A PDF is for one agent in one location, so the group order of that agent / location applies.
    if (kind !== "excel") {
      const problem = exportScopeProblem(filters);
      if (problem) {
        toast({ title: "Cannot export", description: problem, status: "warning", duration: 3500, isClosable: true });
        return;
      }
    }
    setExporting(kind);
    try {
      const result = await getAgentRateTariffsApi({
        ...optionsPayload,
        ...AGENT_TARIFF_EXPORT_SORT,
        // The Export / Import + DOB PDFs name their own type.
        ...(PDF_TYPE_LABELS[kind] ? { shipment_type: kind } : {}),
        search: debouncedSearch || undefined,
        active: filters.active === "" ? undefined : filters.active === "true",
        fetch_all: true,
      });
      const all = Array.isArray(result.data) ? result.data : [];
      if (!all.length) {
        toast({
          title: PDF_TYPE_LABELS[kind] ? `No ${PDF_TYPE_LABELS[kind]} tariffs to export` : "No tariffs to export",
          status: "info",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      if (kind !== "excel") {
        // Export and Import + DOB are two separate PDFs: Standard charges first, then If Apply charges.
        const consignee = await loadConsigneeText(filters.agent_id);
        await openPdf(
          buildTypeTariffPdfModel({
            shipmentType: kind,
            rows: all,
            location: filters.location,
            scopeLabel: pins.agent_id?.name || "",
            consignee,
            filenameSuffix: `agent-tariff-${kind.replace("_", "-")}`,
          })
        );
      } else {
        downloadSheetAsExcel({
          headers: EXCEL_COLUMNS.map((column) => column.label),
          rows: toTableRows(EXCEL_COLUMNS, all),
          filePrefix: "agent-tariff",
          sheetName: "Agent Tariff",
          colWidths: [20, 40, 20, 20, 14],
        });
      }
    } catch (error) {
      toast({
        title: "Export failed",
        description: tariffErrorMessage(error, "Could not export agent tariffs."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setExporting("");
    }
  };

  const handleFilterChange = (field, value, optionList) => {
    setFilters((prev) => ({ ...prev, [field]: value || "" }));
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
    lastSearchRef.current = "";
    setPage(1);
    setFetchAll(false);
  };

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
          Agent Tariffs
        </Text>
        <HStack spacing="3" flexWrap="wrap">
          <InputGroup size="sm" w={{ base: "100%", md: "300px" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={placeholderColor} />
            </InputLeftElement>
            <Input
              size="sm"
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              borderRadius="md"
              placeholder="Search rate name, group..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Tooltip label="Refresh" hasArrow>
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Refresh agent tariffs"
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
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<Icon as={MdPictureAsPdf} />}
            onClick={() => handleExport("export")}
            isLoading={exporting === "export"}
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
            onClick={() => handleExport("import_dob")}
            isLoading={exporting === "import_dob"}
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
            onClick={() => handleExport("excel")}
            isLoading={exporting === "excel"}
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
          "Agent Name",
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
          "Group Name",
          <SearchableSelect
            {...selectProps}
            value={filters.import_group}
            options={withSelectedOption(options.groups, filters.import_group, pins.import_group)}
            placeholder="All Groups"
            formatOption={(option) => option.name}
            isLoading={optionsLoading}
            onSearchChange={(query) => onSearch("q_import_group", query)}
            onChange={(value) => handleFilterChange("import_group", value, options.groups)}
          />
        )}
        {field(
          "Active",
          <SearchableSelect
            {...selectProps}
            value={filters.active}
            options={ACTIVE_OPTIONS}
            placeholder="Active (default)"
            formatOption={(option) => option.name}
            onChange={(value) => handleFilterChange("active", value, ACTIVE_OPTIONS)}
          />
        )}
      </SimpleGrid>

      <TariffTable
        columns={COLUMNS}
        rows={rows}
        loading={loading}
        emptyText="No agent tariffs found. Try changing or clearing the filters."
        page={page}
        pageSize={TARIFF_PAGE_SIZE}
        totalCount={meta.totalCount}
        totalPages={meta.totalPages}
        hasNext={meta.hasNext}
        hasPrevious={meta.hasPrevious}
        fetchAll={usesFetchAll}
        onPageChange={setPage}
      />

      {pdfPreviewModal}
    </Box>
  );
}
