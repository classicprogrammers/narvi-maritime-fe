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
  Tooltip,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { MdClear, MdDownload, MdPictureAsPdf, MdRefresh, MdSearch } from "react-icons/md";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { getAgentRateTariffOptionsApi, getAgentRateTariffsApi, withFetchAll } from "../../../api/rate";
import FetchAllSwitch from "./FetchAllSwitch";
import { buildPdfModel } from "./rateListPdf";
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

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [pins, setPins] = useState({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [fetchAll, setFetchAll] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

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
    setExporting(kind);
    try {
      const result = await getAgentRateTariffsApi({
        ...optionsPayload,
        search: debouncedSearch || undefined,
        active: filters.active === "" ? undefined : filters.active === "true",
        fetch_all: true,
      });
      const all = Array.isArray(result.data) ? result.data : [];
      if (!all.length) {
        toast({ title: "No tariffs to export", status: "info", duration: 3000, isClosable: true });
        return;
      }
      if (kind === "pdf") {
        const head = COLUMNS.map((column) => column.label);
        const body = toTableRows(COLUMNS, all);
        const scope = [pins.agent_id?.name, filters.location, filters.import_group].filter(Boolean).join(" · ");
        await openPdf(
          buildPdfModel({
            title: "Agent Tariff",
            scopeLabel: scope,
            sections: [{ head, body }],
            filenameSuffix: "agent-tariff",
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
    setPage(1);
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
            onClick={() => handleExport("pdf")}
            isLoading={exporting === "pdf"}
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
          "Group Name",
          <SimpleSearchableSelect
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
          <SimpleSearchableSelect
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
