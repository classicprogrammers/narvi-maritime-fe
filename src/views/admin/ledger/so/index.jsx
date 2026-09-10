import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Collapse,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
  SimpleGrid,
  Spinner,
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
import { MdAssignment, MdClear, MdFilterList, MdSearch } from "react-icons/md";
import { useHistory } from "react-router-dom";
import { getLedgerSos } from "api/ledgerSo";
import { useMasterData } from "hooks/useMasterData";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  displaySoNumber,
  etaDisplay,
  extractApiMessage,
  formatCostNumber,
  formatProfitPercent,
  getMany2oneName,
  prettySoDate,
  readApiText,
  SO_LEDGER_BIZ_CATEGORY_OPTIONS,
  soLedgerBizCategoryDisplay,
} from "./ledgerSoUtils";

const SO_LEDGER_LIST_STORAGE_KEY = "narvi_so_ledger_list_state";

const defaultSoLedgerListState = {
  searchValue: "",
  soNumber: "",
  clientId: "",
  vesselId: "",
  destination: "",
  bizCategory: "",
  page: 1,
  pageSize: 50,
  showAdvancedFilters: false,
};

function readPersistedSoLedgerListState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SO_LEDGER_LIST_STORAGE_KEY) : null;
    if (!raw) return { ...defaultSoLedgerListState };
    const parsed = JSON.parse(raw);
    return { ...defaultSoLedgerListState, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch (error) {
    return { ...defaultSoLedgerListState };
  }
}

function writePersistedSoLedgerListState(state) {
  try {
    sessionStorage.setItem(SO_LEDGER_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function TruncatedText({ value, maxW = "160px", fontWeight, color, fontSize = "sm" }) {
  const text = readApiText(value);
  const isEmpty = !text;
  const display = isEmpty ? "—" : text;
  return (
    <Tooltip label={text} isDisabled={isEmpty || text.length < 14} openDelay={250} hasArrow placement="top">
      <Text
        fontSize={fontSize}
        fontWeight={fontWeight}
        color={isEmpty ? "gray.400" : color}
        maxW={maxW}
        noOfLines={1}
        cursor={!isEmpty && text.length >= 14 ? "help" : "default"}
      >
        {display}
      </Text>
    </Tooltip>
  );
}

export default function LedgerSo() {
  const toast = useToast();
  const history = useHistory();
  const { refreshClients, refreshVessels, refreshDestinations } = useMasterData();
  const savedState = useRef(readPersistedSoLedgerListState()).current;
  const [clients, setClients] = useState(() => getCached(MASTER_KEYS.CLIENTS) ?? []);
  const [vessels, setVessels] = useState(() => getCached(MASTER_KEYS.VESSELS) ?? []);
  const [destinations, setDestinations] = useState(() => getCached(MASTER_KEYS.DESTINATIONS) ?? []);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState(savedState.searchValue);
  const [searchQuery, setSearchQuery] = useState(String(savedState.searchValue || "").trim());
  const [soNumber, setSoNumber] = useState(savedState.soNumber);
  const [soNumberQuery, setSoNumberQuery] = useState(String(savedState.soNumber || "").trim());
  const [clientId, setClientId] = useState(savedState.clientId);
  const [vesselId, setVesselId] = useState(savedState.vesselId);
  const [destination, setDestination] = useState(savedState.destination);
  const [destinationQuery, setDestinationQuery] = useState(String(savedState.destination || "").trim());
  const [bizCategory, setBizCategory] = useState(savedState.bizCategory);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(savedState.showAdvancedFilters);
  const [page, setPage] = useState(savedState.page);
  const [pageSize, setPageSize] = useState(savedState.pageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const pageBg = useColorModeValue("gray.50", "gray.900");
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const inputBg = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "whiteAlpha.50");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const headerColor = useColorModeValue("gray.500", "gray.400");
  const soColor = useColorModeValue("blue.700", "blue.200");

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLedgerSos({
        page,
        page_size: pageSize,
        search: searchQuery,
        so_number: soNumberQuery,
        client_id: clientId,
        vessel_id: vesselId,
        destination: destinationQuery,
        biz_category: bizCategory,
      });
      setRecords(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 0);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
    } catch (error) {
      toast({
        title: "Error",
        description: extractApiMessage(error, "Failed to load SO ledger records."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      setRecords([]);
      setTotalCount(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, searchQuery, soNumberQuery, clientId, vesselId, destinationQuery, bizCategory, toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([refreshClients(), refreshVessels(), refreshDestinations()])
      .then(([clientList, vesselList, destinationList]) => {
        if (cancelled) return;
        setClients(Array.isArray(clientList) ? clientList : getCached(MASTER_KEYS.CLIENTS) ?? []);
        setVessels(Array.isArray(vesselList) ? vesselList : getCached(MASTER_KEYS.VESSELS) ?? []);
        setDestinations(
          Array.isArray(destinationList) ? destinationList : getCached(MASTER_KEYS.DESTINATIONS) ?? []
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshClients, refreshVessels, refreshDestinations]);

  useEffect(() => {
    writePersistedSoLedgerListState({
      searchValue,
      soNumber,
      clientId,
      vesselId,
      destination,
      bizCategory,
      page,
      pageSize,
      showAdvancedFilters,
    });
  }, [searchValue, soNumber, clientId, vesselId, destination, bizCategory, page, pageSize, showAdvancedFilters]);

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setSearchQuery(searchValue.trim());
      setSoNumberQuery(soNumber.trim());
      setDestinationQuery(destination.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue, soNumber, destination]);

  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  const handleClearAdvancedFilters = () => {
    setSoNumber("");
    setSoNumberQuery("");
    setClientId("");
    setVesselId("");
    setDestination("");
    setDestinationQuery("");
    setBizCategory("");
    setPage(1);
  };

  const handleOpenView = (row) => {
    history.push(`/admin/ledger/so/form/${row.id}`);
  };

  const clientOptions = (Array.isArray(clients) ? clients : []).map((client) => ({
    ...client,
    name: client.name || client.client_code || `Client ${client.id}`,
  }));
  const vesselOptions = (Array.isArray(vessels) ? vessels : []).map((vessel) => ({
    ...vessel,
    name: vessel.name || vessel.vessel_name || `Vessel ${vessel.id}`,
  }));
  const destinationOptions = (Array.isArray(destinations) ? destinations : []).map((item) => ({
    ...item,
    name: item.name || item.destination || `Destination ${item.id}`,
  }));

  const advancedFilterCount = [soNumber, clientId, vesselId, destination, bizCategory].filter(
    (value) => value != null && String(value).trim() !== ""
  ).length;
  const hasAdvancedFilters = advancedFilterCount > 0;
  const isAdvancedPanelOpen = showAdvancedFilters || hasAdvancedFilters;

  const handleToggleAdvancedFilters = () => {
    if (hasAdvancedFilters) {
      setShowAdvancedFilters(true);
      return;
    }
    setShowAdvancedFilters((open) => !open);
  };

  const controlProps = {
    size: "md",
    h: "40px",
    bg: inputBg,
  };
  const filterLabelProps = {
    fontSize: "sm",
    fontWeight: "600",
    mb: 2,
  };
  const thProps = {
    py: 3,
    px: 4,
    fontSize: "11px",
    letterSpacing: "0.06em",
    color: headerColor,
    bg: tableHeaderBg,
    borderColor: tableBorderColor,
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    fontWeight: "600",
    position: "sticky",
    top: 0,
    zIndex: 2,
  };
  const tdProps = {
    py: 3,
    px: 4,
    borderColor: tableBorderColor,
    fontSize: "sm",
  };

  const displaySo = (row) => displaySoNumber(row) || "—";

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={6} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg" mb={1}>
              SO Ledger
            </Heading>
            <Text fontSize="sm" color="gray.500">
              SO Ledger is auto-generated from Cost DB and Invoices DB.
            </Text>
          </Box>
        </Flex>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" p={{ base: 4, md: 5 }} mb={6}>
          <Flex gap={4} align="flex-end" wrap="wrap">
            <FormControl flex="1" minW={{ base: "100%", md: "280px" }}>
              <FormLabel {...filterLabelProps}>Search</FormLabel>
              <InputGroup size="md">
                <InputLeftElement h="40px" pointerEvents="none">
                  <MdSearch color={searchIconColor} />
                </InputLeftElement>
                <Input
                  placeholder="Search SO #, destination, client, vessel..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  autoComplete="off"
                  {...controlProps}
                />
                {searchValue && (
                  <InputRightElement h="40px">
                    <IconButton
                      aria-label="Clear search"
                      icon={<MdClear />}
                      size="sm"
                      variant="ghost"
                      onClick={handleClearSearch}
                    />
                  </InputRightElement>
                )}
              </InputGroup>
            </FormControl>

            <FormControl w={{ base: "100%", sm: "auto" }} minW="180px">
              <FormLabel {...filterLabelProps}>Advanced Filters</FormLabel>
              <Button
                w="100%"
                leftIcon={<Icon as={MdFilterList} />}
                variant={hasAdvancedFilters || isAdvancedPanelOpen ? "solid" : "outline"}
                colorScheme={hasAdvancedFilters || isAdvancedPanelOpen ? "blue" : "gray"}
                onClick={handleToggleAdvancedFilters}
                h="40px"
              >
                {hasAdvancedFilters ? "Filters" : isAdvancedPanelOpen ? "Hide Filters" : "Show Filters"}
                {hasAdvancedFilters && (
                  <Badge ml={2} colorScheme="whiteAlpha" bg="white" color="blue.600" borderRadius="full">
                    {advancedFilterCount}
                  </Badge>
                )}
              </Button>
            </FormControl>

            <FormControl w={{ base: "100%", sm: "160px" }}>
              <FormLabel {...filterLabelProps}>Page Size</FormLabel>
              <Select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                {...controlProps}
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={80}>80 / page</option>
              </Select>
            </FormControl>
          </Flex>

          <Collapse in={isAdvancedPanelOpen} animateOpacity>
            <Box mt={5} pt={5} px={{ base: 1, md: 2 }} borderTop="1px" borderColor={borderColor}>
              <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
                <Text fontSize="sm" fontWeight="600">
                  Filter by specific fields
                </Text>
                {hasAdvancedFilters && (
                  <Button size="sm" variant="outline" colorScheme="red" h="40px" onClick={handleClearAdvancedFilters}>
                    Clear All
                  </Button>
                )}
              </Flex>
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} columnGap={{ base: 4, md: 8 }} rowGap={4}>
                <FormControl>
                  <FormLabel {...filterLabelProps}>SO Number</FormLabel>
                  <Input
                    placeholder="Filter by SO number"
                    value={soNumber}
                    onChange={(e) => setSoNumber(e.target.value)}
                    autoComplete="off"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Client</FormLabel>
                  <SimpleSearchableSelect
                    value={clientId}
                    onChange={(value) => {
                      setClientId(value || "");
                      setPage(1);
                    }}
                    options={clientOptions}
                    placeholder="All clients"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Vessel</FormLabel>
                  <SimpleSearchableSelect
                    value={vesselId}
                    onChange={(value) => {
                      setVesselId(value || "");
                      setPage(1);
                    }}
                    options={vesselOptions}
                    placeholder="All vessels"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Destination</FormLabel>
                  <SimpleSearchableSelect
                    value={destination}
                    onChange={(value) => setDestination(value || "")}
                    options={destinationOptions}
                    placeholder="All destinations"
                    valueKey="name"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Biz Category</FormLabel>
                  <Select
                    value={bizCategory}
                    onChange={(e) => {
                      setBizCategory(e.target.value);
                      setPage(1);
                    }}
                    {...controlProps}
                  >
                    <option value="">All categories</option>
                    {SO_LEDGER_BIZ_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
            </Box>
          </Collapse>
        </Box>

        <Box bg={cardBg} border="1px" borderColor={borderColor} borderRadius="lg" overflow="hidden">
          {isLoading ? (
            <Flex justify="center" align="center" py={16}>
              <Spinner />
            </Flex>
          ) : records.length === 0 ? (
            <VStack spacing={3} py={16} px={6} textAlign="center">
              <Icon as={MdAssignment} boxSize={10} color="gray.400" />
              <Text fontWeight="700" color="gray.700">
                No SO ledger records found
              </Text>
              <Text fontSize="sm" color="gray.500" maxW="420px">
                {searchQuery || hasAdvancedFilters
                  ? "Try clearing search or filters to see more results."
                  : "Rows appear automatically after Cost DB or Invoice DB entries are saved for a shipping order."}
              </Text>
            </VStack>
          ) : (
            <>
              <Box
                overflowX="auto"
                sx={{
                  "&::-webkit-scrollbar": { height: "8px" },
                  "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "4px" },
                }}
              >
                <Table size="sm" variant="simple" minW="1480px">
                  <Thead>
                    <Tr>
                      <Th {...thProps} position="sticky" left={0} zIndex={3} minW="120px">
                        SO Number
                      </Th>
                      <Th {...thProps} minW="120px">Date Created</Th>
                      <Th {...thProps} minW="130px">Status</Th>
                      <Th {...thProps} minW="140px">PIC</Th>
                      <Th {...thProps} minW="160px">Client</Th>
                      <Th {...thProps} minW="160px">Vessel</Th>
                      <Th {...thProps} minW="150px">Destination</Th>
                      <Th {...thProps} minW="110px">ETA</Th>
                      <Th {...thProps} minW="130px">Biz Category</Th>
                      <Th {...thProps} isNumeric minW="120px">Actual Sale</Th>
                      <Th {...thProps} isNumeric minW="120px">Actual Cost</Th>
                      <Th {...thProps} isNumeric minW="120px">Actual Profit</Th>
                      <Th {...thProps} isNumeric minW="110px">Profit %</Th>
                      <Th {...thProps} isNumeric minW="130px">Invoice Balance</Th>
                      <Th {...thProps} minW="180px">SO Remark</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((row, index) => {
                      const rowBg = index % 2 === 0 ? tableRowBg : tableRowBgAlt;
                      const profit = Number(row.actual_profit);
                      const profitColor = Number.isFinite(profit)
                        ? profit > 0
                          ? "green.600"
                          : profit < 0
                            ? "red.500"
                            : undefined
                        : undefined;
                      const created = prettySoDate(row.so_create_date);
                      const eta = prettySoDate(row.eta_date) || etaDisplay(row.eta_date, row.eta);
                      const statusLabel = readApiText(row.so_status_label) || readApiText(row.so_status);
                      return (
                        <Tr key={row.id} bg={rowBg} _hover={{ bg: hoverBg }} sx={{ "& td": { bg: "inherit" } }}>
                          <Td
                            {...tdProps}
                            position="sticky"
                            left={0}
                            zIndex={1}
                            boxShadow="inset -1px 0 0 var(--chakra-colors-gray-200)"
                          >
                            <Button
                              variant="link"
                              color={soColor}
                              fontWeight="800"
                              fontSize="sm"
                              whiteSpace="nowrap"
                              onClick={() => handleOpenView(row)}
                            >
                              {displaySo(row)}
                            </Button>
                          </Td>
                          <Td {...tdProps} whiteSpace="nowrap" color={created ? "inherit" : "gray.400"}>
                            {created || "—"}
                          </Td>
                          <Td {...tdProps}>
                            {statusLabel ? (
                              <Badge
                                colorScheme="blue"
                                variant="subtle"
                                borderRadius="full"
                                px={2.5}
                                py={0.5}
                                fontSize="xs"
                                textTransform="none"
                              >
                                {statusLabel}
                              </Badge>
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText
                              value={
                                readApiText(row.pic) ||
                                getMany2oneName(row.pic_new_id) ||
                                getMany2oneName(row.pic_id)
                              }
                              maxW="160px"
                            />
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText
                              value={readApiText(row.client) || getMany2oneName(row.client_id)}
                              maxW="180px"
                            />
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText
                              value={readApiText(row.vessel_name) || getMany2oneName(row.vessel_id)}
                              maxW="180px"
                            />
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText
                              value={readApiText(row.destination) || getMany2oneName(row.destination_id)}
                              maxW="170px"
                            />
                          </Td>
                          <Td {...tdProps} whiteSpace="nowrap" color={eta ? "inherit" : "gray.400"}>
                            {eta || "—"}
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText
                              value={soLedgerBizCategoryDisplay(row.biz_category, row.biz_category_label)}
                              maxW="140px"
                            />
                          </Td>
                          <Td {...tdProps} isNumeric fontWeight="600" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                            {formatCostNumber(row.actual_sale, 2)}
                          </Td>
                          <Td {...tdProps} isNumeric fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                            {formatCostNumber(row.actual_cost, 2)}
                          </Td>
                          <Td
                            {...tdProps}
                            isNumeric
                            fontWeight="700"
                            fontVariantNumeric="tabular-nums"
                            whiteSpace="nowrap"
                            color={profitColor}
                          >
                            {formatCostNumber(row.actual_profit, 2)}
                          </Td>
                          <Td
                            {...tdProps}
                            isNumeric
                            fontWeight="600"
                            fontVariantNumeric="tabular-nums"
                            whiteSpace="nowrap"
                            color={profitColor}
                          >
                            {formatProfitPercent(row.actual_profit_percentage)}
                          </Td>
                          <Td {...tdProps} isNumeric fontWeight="600" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                            {formatCostNumber(row.invoice_balance, 2)}
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText value={row.so_remark} maxW="220px" />
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>

              <Flex
                justify="space-between"
                align="center"
                px={4}
                py={3}
                borderTop="1px"
                borderColor={tableBorderColor}
                wrap="wrap"
                gap={3}
              >
                <Text fontSize="sm" color="gray.500">
                  {totalCount} record{totalCount === 1 ? "" : "s"}
                  {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}
                </Text>
                {totalPages > 1 && (
                  <HStack spacing={1} wrap="wrap">
                    <Button size="sm" variant="outline" onClick={() => setPage(1)} isDisabled={!hasPrevious}>
                      First
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPage(page - 1)} isDisabled={!hasPrevious}>
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={page === pageNum ? "solid" : "outline"}
                          colorScheme={page === pageNum ? "blue" : "gray"}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button size="sm" variant="outline" onClick={() => setPage(page + 1)} isDisabled={!hasNext}>
                      Next
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(totalPages)}
                      isDisabled={!hasNext || page === totalPages}
                    >
                      Last
                    </Button>
                  </HStack>
                )}
              </Flex>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
