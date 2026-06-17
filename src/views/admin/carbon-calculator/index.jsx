import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { MdCalculate, MdCloud, MdDownload, MdRefresh, MdSave, MdSearch } from "react-icons/md";
import Card from "components/card/Card";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  calculateCarbonApi,
  extractCarbonErrorMessage,
  factorsListToMap,
  getEmissionFactorsApi,
  getStockEmissionsApi,
  updateEmissionFactorsApi,
} from "api/carbon";
import { useMasterData } from "hooks/useMasterData";
import { useUser } from "redux/hooks/useUser";
import {
  formatStockStatusLabel,
  getStatusOptionsForActiveFilter,
  isArchiveStockStatus,
} from "constants/stockStatus";
import { EMISSION_FACTORS as DEFAULT_EMISSION_FACTORS, formatCo2e, formatCo2eKg, TRANSPORT_MODES } from "utils/carbonEmissions";

const DEFAULT_MANUAL = {
  mode: "air",
  distanceKm: "5000",
  weightKg: "500",
};

const MODE_BADGE_COLORS = {
  air: "purple",
  sea: "blue",
  road: "orange",
  rail: "teal",
  courier: "pink",
};

function ModeBadge({ mode, label }) {
  const normalized = String(mode || "").toLowerCase();
  const displayLabel = label || TRANSPORT_MODES.find((m) => m.value === normalized)?.label || mode;
  return (
    <Badge colorScheme={MODE_BADGE_COLORS[normalized] || "gray"} fontSize="xs">
      {displayLabel}
    </Badge>
  );
}

export default function CarbonCalculator() {
  const toast = useToast();
  const { user } = useUser();
  const { clients, vessels } = useMasterData();
  const isAdmin = user?.user_type === "admin";

  const textColor = useColorModeValue("gray.700", "white");
  const muted = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const inputBg = useColorModeValue("white", "navy.900");
  const headerBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const accent = "#174693";

  const [loading, setLoading] = useState(false);
  const [factorsLoading, setFactorsLoading] = useState(false);
  const [savingFactors, setSavingFactors] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [emissionItems, setEmissionItems] = useState([]);
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [factorEdits, setFactorEdits] = useState({});

  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [vesselId, setVesselId] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [stockStatusOptions, setStockStatusOptions] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [manualForm, setManualForm] = useState(DEFAULT_MANUAL);
  const [manualResult, setManualResult] = useState(null);

  const clientOptions = useMemo(
    () => (clients || []).map((c) => ({ id: c.id, name: c.name || `Client ${c.id}` })),
    [clients]
  );
  const vesselOptions = useMemo(
    () => (vessels || []).map((v) => ({ id: v.id, name: v.name || `Vessel ${v.id}` })),
    [vessels]
  );

  const factorMap = useMemo(() => {
    const fromApi = factorsListToMap(emissionFactors);
    return { ...DEFAULT_EMISSION_FACTORS, ...fromApi };
  }, [emissionFactors]);

  const displayFactors = useMemo(() => {
    if (emissionFactors.length > 0) return emissionFactors;
    return TRANSPORT_MODES.map((mode) => ({
      mode: mode.value,
      label: mode.label,
      factor: DEFAULT_EMISSION_FACTORS[mode.value],
    }));
  }, [emissionFactors]);

  const statusFilterOptions = useMemo(() => {
    const options = getStatusOptionsForActiveFilter(stockStatusOptions, activeFilter);
    return [{ value: "", label: "All statuses" }, ...options];
  }, [stockStatusOptions, activeFilter]);

  const handleActiveFilterChange = (showActive) => {
    const next = showActive ? "true" : "false";
    setActiveFilter(next);
    if (stockStatus && isArchiveStockStatus(stockStatus) !== (next === "false")) {
      setStockStatus("");
    }
    setPage(1);
  };

  const loadEmissionFactors = useCallback(async () => {
    setFactorsLoading(true);
    try {
      const result = await getEmissionFactorsApi();
      const factors = result.factors.length
        ? result.factors
        : TRANSPORT_MODES.map((mode) => ({
          mode: mode.value,
          label: mode.label,
          factor: DEFAULT_EMISSION_FACTORS[mode.value],
        }));
      setEmissionFactors(factors);
      setFactorEdits(
        factors.reduce((acc, row) => {
          acc[row.mode] = String(row.factor ?? "");
          return acc;
        }, {})
      );
    } catch (error) {
      toast({
        title: "Failed to load emission factors",
        description: extractCarbonErrorMessage(error, "Could not load emission factors."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setFactorsLoading(false);
    }
  }, [toast]);

  const loadStockEmissions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStockEmissionsApi({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        client_id: clientId || undefined,
        vessel_id: vesselId || undefined,
        stock_status: stockStatus || undefined,
        active: activeFilter,
        create_date_from: dateFrom || undefined,
        create_date_to: dateTo || undefined,
        sort_by: "id",
        sort_order: "desc",
      });
      setEmissionItems(result.items);
      setStockStatusOptions(result.stock_status_options);
      setTotalCount(result.total_count ?? 0);
    } catch (error) {
      setEmissionItems([]);
      setTotalCount(0);
      toast({
        title: "Failed to load emissions",
        description: extractCarbonErrorMessage(error, "Could not fetch stock emission estimates."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, clientId, vesselId, stockStatus, activeFilter, dateFrom, dateTo, toast]);

  useEffect(() => {
    loadEmissionFactors();
  }, [loadEmissionFactors]);

  useEffect(() => {
    loadStockEmissions();
  }, [loadStockEmissions]);

  const handleManualCalculate = async () => {
    setCalculating(true);
    try {
      const result = await calculateCarbonApi({
        mode: manualForm.mode,
        distanceKm: manualForm.distanceKm,
        weightKg: manualForm.weightKg,
      });
      setManualResult(result);
    } catch (error) {
      toast({
        title: "Calculation failed",
        description: extractCarbonErrorMessage(error, "Could not calculate emissions."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveFactors = async () => {
    setSavingFactors(true);
    try {
      const payload = displayFactors.map((row) => ({
        mode: row.mode,
        factor: Number(factorEdits[row.mode] ?? row.factor),
      }));
      const result = await updateEmissionFactorsApi(payload);
      const factors = result.factors.length ? result.factors : payload;
      setEmissionFactors(factors);
      setFactorEdits(
        factors.reduce((acc, row) => {
          acc[row.mode] = String(row.factor ?? "");
          return acc;
        }, {})
      );
      toast({
        title: "Emission factors saved",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      loadStockEmissions();
    } catch (error) {
      toast({
        title: "Failed to save factors",
        description: extractCarbonErrorMessage(error, "Could not update emission factors."),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSavingFactors(false);
    }
  };

  const handleRefresh = () => {
    loadEmissionFactors();
    loadStockEmissions();
  };

  const handleExportCsv = () => {
    if (!emissionItems.length) return;
    const headers = [
      "Stock ID",
      "Client",
      "Vessel",
      "Status",
      "Route",
      "Weight (kg)",
      "Primary Mode",
      "CO₂e (kg)",
    ];
    const lines = emissionItems.map((item) =>
      [
        item.stockId || "",
        item.clientName,
        item.vesselName,
        formatStockStatusLabel(item.stockStatus),
        item.routeLabel,
        item.weightKg,
        item.primaryModeLabel || item.primaryMode,
        item.totalCo2eKg.toFixed(2),
      ]
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `carbon-emissions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const manualFactor = factorMap[manualForm.mode] ?? "—";

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px={{ base: "16px", md: "24px" }} pb="40px">
      <Flex justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="4" mb="6">
        <Box>
          <HStack spacing="3">
            <Icon as={MdCloud} boxSize="28px" color={accent} />
            <Text fontSize="2xl" fontWeight="700" color={textColor}>
              Carbon Emission Calculator
            </Text>
          </HStack>
        </Box>
        <HStack>
          <Button leftIcon={<MdRefresh />} variant="outline" onClick={handleRefresh} isLoading={loading || factorsLoading}>
            Refresh
          </Button>
          <Button
            leftIcon={<MdDownload />}
            colorScheme="blue"
            bg={accent}
            onClick={handleExportCsv}
            isDisabled={!emissionItems.length}
          >
            Export CSV
          </Button>
        </HStack>
      </Flex>

      <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap="6" mb="6">
        <Card p="20px">
          <Text fontSize="lg" fontWeight="700" color={textColor} mb="4">
            Quick estimate
          </Text>
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
            <FormControl>
              <FormLabel fontSize="sm">Transport mode</FormLabel>
              <Select
                bg={inputBg}
                value={manualForm.mode}
                onChange={(e) => setManualForm((prev) => ({ ...prev, mode: e.target.value }))}
              >
                {TRANSPORT_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Distance (km)</FormLabel>
              <Input
                bg={inputBg}
                type="number"
                min="0"
                value={manualForm.distanceKm}
                onChange={(e) => setManualForm((prev) => ({ ...prev, distanceKm: e.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Weight (kg)</FormLabel>
              <Input
                bg={inputBg}
                type="number"
                min="0"
                value={manualForm.weightKg}
                onChange={(e) => setManualForm((prev) => ({ ...prev, weightKg: e.target.value }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Emission factor</FormLabel>
              <Input
                bg={inputBg}
                isReadOnly
                value={`${manualFactor} kg CO₂e / tonne-km`}
              />
            </FormControl>
          </Grid>
          <Button
            mt="4"
            leftIcon={<MdCalculate />}
            colorScheme="blue"
            bg={accent}
            onClick={handleManualCalculate}
            isLoading={calculating}
          >
            Calculate
          </Button>
          {manualResult ? (
            <Box mt="4" p="4" borderRadius="md" bg={headerBg} borderWidth="1px" borderColor={borderColor}>
              <Text fontSize="sm" color={muted}>
                Result for {manualResult.modeLabel || manualResult.mode} · {manualResult.distanceKm.toLocaleString()} km ·{" "}
                {manualResult.weightKg.toLocaleString()} kg
              </Text>
              <Text fontSize="xl" fontWeight="700" color={accent} mt="1">
                {formatCo2eKg(manualResult.co2eKg)}
              </Text>
            </Box>
          ) : null}
        </Card>

        <Card p="20px">
          <Flex justify="space-between" align="start" mb="2" gap="3" flexWrap="wrap">
            <Box>
              <Text fontSize="lg" fontWeight="700" color={textColor}>
                Emission factors
              </Text>
              {isAdmin ? (
                <Text fontSize="sm" color={muted} mt="1">
                  Edit the values below and click Save to update calculations.
                </Text>
              ) : null}
            </Box>
            {isAdmin ? (
              <Button
                size="sm"
                leftIcon={<MdSave />}
                colorScheme="blue"
                bg={accent}
                onClick={handleSaveFactors}
                isLoading={savingFactors}
                isDisabled={factorsLoading}
              >
                Save changes
              </Button>
            ) : null}
          </Flex>
          {factorsLoading ? (
            <Flex justify="center" py="8">
              <Spinner color={accent} />
            </Flex>
          ) : (
            <Table size="sm" variant="simple" mt="3" sx={{ "td, th": { py: "6px" } }}>
              <Thead>
                <Tr>
                  <Th>Mode</Th>
                  <Th isNumeric w={{ base: "auto", md: "250px" }}>
                    Factor (kg CO₂e / tonne-km)
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {displayFactors.map((row) => (
                  <Tr key={row.mode}>
                    <Td>
                      <ModeBadge mode={row.mode} label={row.label} />
                    </Td>
                    <Td isNumeric>
                      {isAdmin ? (
                        <Input
                          size="md"
                          type="number"
                          min="0"
                          step="0.001"
                          h="32px"
                          py="0"
                          px="2"
                          bg={inputBg}
                          textAlign="right"
                          w="100%"
                          maxW="200px"
                          ml="auto"
                          fontWeight="600"
                          borderWidth="1px"
                          borderColor={borderColor}
                          borderStyle="solid"
                          boxShadow="sm"
                          placeholder="Enter factor"
                          _hover={{
                            borderColor: accent,
                            boxShadow: "md",
                          }}
                          _focus={{
                            borderColor: accent,
                            boxShadow: `0 0 0 1px ${accent}`,
                          }}
                          value={factorEdits[row.mode] ?? String(row.factor ?? "")}
                          onChange={(e) =>
                            setFactorEdits((prev) => ({ ...prev, [row.mode]: e.target.value }))
                          }
                        />
                      ) : (
                        <Text fontWeight="600">{row.factor}</Text>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </Grid>

      <Card p="20px" mb="6">
        <Text fontSize="lg" fontWeight="700" color={textColor} mb="4">
          Filters
        </Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap="4">
          <FormControl>
            <FormLabel fontSize="sm">Search</FormLabel>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color={muted} />
              </InputLeftElement>
              <Input
                bg={inputBg}
                pl="10"
                placeholder="Stock ID, PO, remarks..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Client</FormLabel>
            <SimpleSearchableSelect
              value={clientId}
              onChange={(val) => {
                setClientId(val || "");
                setPage(1);
              }}
              options={clientOptions}
              placeholder="All clients"
              bg={inputBg}
              py="19px"
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Vessel</FormLabel>
            <SimpleSearchableSelect
              value={vesselId}
              onChange={(val) => {
                setVesselId(val || "");
                setPage(1);
              }}
              options={vesselOptions}
              placeholder="All vessels"
              bg={inputBg}
              py="19px"
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Stock status</FormLabel>
            <Select
              bg={inputBg}
              value={stockStatus}
              onChange={(e) => {
                setStockStatus(e.target.value);
                setPage(1);
              }}
            >
              {statusFilterOptions.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Created from</FormLabel>
            <Input
              bg={inputBg}
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Created to</FormLabel>
            <Input
              bg={inputBg}
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
            />
          </FormControl>
        </Grid>
      </Card>

      <Card p="0" overflow="hidden">
        <Flex
          px="20px"
          py="16px"
          align={{ base: "start", md: "center" }}
          justify="space-between"
          direction={{ base: "column", md: "row" }}
          gap="3"
          borderBottomWidth="1px"
          borderColor={borderColor}
        >
          <Text fontSize="lg" fontWeight="700" color={textColor}>
            Stock emission estimates
          </Text>
          <HStack spacing="4" flexWrap="wrap">
            <HStack spacing="2" align="center">
              <Checkbox
                isChecked={activeFilter !== "false"}
                onChange={(e) => handleActiveFilterChange(e.target.checked)}
                colorScheme="blue"
                borderColor={borderColor}
              >
                <Text fontSize="sm" fontWeight="600" color={textColor}>
                  Active stock
                </Text>
              </Checkbox>
              <Text fontSize="xs" color={muted}>
                {activeFilter === "false"
                  ? "Showing inactive (released / shipped / delivered / cancelled)"
                  : "Showing active stock"}
              </Text>
            </HStack>
            {loading ? <Spinner size="sm" color={accent} /> : null}
          </HStack>
        </Flex>
        <Box maxH={{ base: "50vh", lg: "520px" }} overflowY="auto" overflowX="auto">
          <Table size="sm">
            <Thead bg={headerBg} position="sticky" top={0} zIndex={1} boxShadow="sm">
              <Tr>
                <Th w="40px" />
                <Th>Stock ID</Th>
                <Th>Client</Th>
                <Th>Vessel</Th>
                <Th>Status</Th>
                <Th>Route</Th>
                <Th isNumeric>Weight</Th>
                <Th>Mode</Th>
                <Th isNumeric>CO₂e</Th>
              </Tr>
            </Thead>
            <Tbody>
              {!loading && emissionItems.length === 0 ? (
                <Tr>
                  <Td colSpan={9} py="10" textAlign="center" color={muted}>
                    No stock records found for the selected filters.
                  </Td>
                </Tr>
              ) : null}
              {emissionItems.map((item, index) => {
                const rowKey = item.stockId ?? item.stockRecordId ?? `row-${index}`;
                const isOpen = expandedId === rowKey;
                return (
                  <React.Fragment key={rowKey}>
                    <Tr _hover={{ bg: headerBg }}>
                      <Td>
                        <IconButton
                          aria-label={isOpen ? "Collapse legs" : "Expand legs"}
                          size="xs"
                          variant="ghost"
                          icon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                          onClick={() => setExpandedId(isOpen ? null : rowKey)}
                        />
                      </Td>
                      <Td fontWeight="600">{item.stockId || "—"}</Td>
                      <Td>{item.clientName}</Td>
                      <Td>{item.vesselName}</Td>
                      <Td>{formatStockStatusLabel(item.stockStatus)}</Td>
                      <Td maxW="280px">
                        <Tooltip label={item.routeLabel}>
                          <Text noOfLines={1}>{item.routeLabel}</Text>
                        </Tooltip>
                      </Td>
                      <Td isNumeric>{item.weightKg ? `${item.weightKg.toLocaleString()} kg` : "—"}</Td>
                      <Td>
                        <ModeBadge mode={item.primaryMode} label={item.primaryModeLabel} />
                      </Td>
                      <Td isNumeric fontWeight="700" color={accent}>
                        {formatCo2e(item.totalCo2eKg)}
                      </Td>
                    </Tr>
                    {isOpen ? (
                      <Tr bg={headerBg}>
                        <Td colSpan={9} p="0" borderBottomWidth="1px" borderColor={borderColor}>
                          <Box px="20px" py="3">
                            <Text fontSize="xs" fontWeight="600" color={muted} mb="2">
                              Route legs
                            </Text>
                            {item.legs?.length ? (
                              <Table size="xs" variant="simple" bg={inputBg}>
                                <Thead>
                                  <Tr>
                                    <Th>From</Th>
                                    <Th>To</Th>
                                    <Th>Mode</Th>
                                    <Th isNumeric>Distance</Th>
                                    <Th isNumeric>CO₂e</Th>
                                  </Tr>
                                </Thead>
                                <Tbody>
                                  {item.legs.map((leg, idx) => (
                                    <Tr key={`${rowKey}-leg-${idx}`}>
                                      <Td>{leg.from}</Td>
                                      <Td>{leg.to}</Td>
                                      <Td>
                                        <ModeBadge mode={leg.mode} label={leg.modeLabel} />
                                      </Td>
                                      <Td isNumeric>{leg.distanceKm.toLocaleString()} km</Td>
                                      <Td isNumeric>{formatCo2e(leg.co2eKg)}</Td>
                                    </Tr>
                                  ))}
                                </Tbody>
                              </Table>
                            ) : (
                              <Text fontSize="sm" color={muted}>
                                No route legs returned for this stock item.
                              </Text>
                            )}
                          </Box>
                        </Td>
                      </Tr>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </Tbody>
          </Table>
        </Box>
        {totalCount > pageSize ? (
          <Flex px="20px" py="14px" justify="space-between" align="center" borderTopWidth="1px" borderColor={borderColor}>
            <Text fontSize="sm" color={muted}>
              Page {page} · showing {emissionItems.length} of {totalCount}
            </Text>
            <HStack>
              <Button size="sm" variant="outline" isDisabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                isDisabled={page * pageSize >= totalCount || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        ) : null}
      </Card>
    </Box>
  );
}
