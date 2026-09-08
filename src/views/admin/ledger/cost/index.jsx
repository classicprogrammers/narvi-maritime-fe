import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
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
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { MdAdd, MdClear, MdDelete, MdEdit, MdFilterList, MdOpenInNew, MdReceipt, MdSearch } from "react-icons/md";
import { useHistory } from "react-router-dom";
import { deleteLedgerCost, getLedgerCosts } from "api/ledgerCost";
import { useMasterData } from "hooks/useMasterData";
import { getCached, MASTER_KEYS } from "utils/masterDataCache";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  agentDisplayName,
  BIZ_CATEGORY_OPTIONS,
  bizCategoryDisplay,
  extractApiMessage,
  formatCostDate,
  formatCostNumber,
  getMany2oneName,
  isProbablyUrl,
  normalizeBizCategory,
} from "./ledgerCostUtils";

const COST_LIST_STORAGE_KEY = "narvi_cost_list_state";

const defaultCostListState = {
  searchValue: "",
  soNumber: "",
  agentId: "",
  clientId: "",
  vesselId: "",
  destination: "",
  bizCategory: "",
  page: 1,
  pageSize: 50,
  showAdvancedFilters: false,
};

function readPersistedCostListState() {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(COST_LIST_STORAGE_KEY) : null;
    if (!raw) return { ...defaultCostListState };
    const parsed = JSON.parse(raw);
    const next = { ...defaultCostListState, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    next.bizCategory = normalizeBizCategory(next.bizCategory);
    return next;
  } catch (error) {
    return { ...defaultCostListState };
  }
}

function writePersistedCostListState(state) {
  try {
    sessionStorage.setItem(COST_LIST_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures (private mode / quota).
  }
}

function prettyCostDate(value) {
  const raw = formatCostDate(value);
  if (!raw || raw === "-") return "";
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isDueOverdue(row) {
  const due = formatCostDate(row.date_due_agent);
  const paid = formatCostDate(row.date_agent_paid);
  if (!due || due === "-" || (paid && paid !== "-")) return false;
  return due < new Date().toISOString().slice(0, 10);
}

function TruncatedText({ value, maxW = "160px", fontWeight, color, fontSize = "sm" }) {
  const text = value == null || value === false || value === "" ? "" : String(value);
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

export default function LedgerCost() {
  const toast = useToast();
  const history = useHistory();
  const { refreshAgents, refreshClients, refreshVessels, refreshDestinations } = useMasterData();
  const savedState = useRef(readPersistedCostListState()).current;
  const [agents, setAgents] = useState(() => getCached(MASTER_KEYS.AGENTS) ?? []);
  const [clients, setClients] = useState(() => getCached(MASTER_KEYS.CLIENTS) ?? []);
  const [vessels, setVessels] = useState(() => getCached(MASTER_KEYS.VESSELS) ?? []);
  const [destinations, setDestinations] = useState(() => getCached(MASTER_KEYS.DESTINATIONS) ?? []);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState(savedState.searchValue);
  const [searchQuery, setSearchQuery] = useState(String(savedState.searchValue || "").trim());
  const [soNumber, setSoNumber] = useState(savedState.soNumber);
  const [soNumberQuery, setSoNumberQuery] = useState(String(savedState.soNumber || "").trim());
  const [agentId, setAgentId] = useState(savedState.agentId);
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
  const [deleteId, setDeleteId] = useState(null);

  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelDeleteRef = useRef(null);

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
  const mutedColor = useColorModeValue("gray.500", "gray.400");

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getLedgerCosts({
        page,
        page_size: pageSize,
        search: searchQuery,
        so_number: soNumberQuery,
        biz_category: normalizeBizCategory(bizCategory),
        agent_id: agentId,
        client_id: clientId,
        vessel_id: vesselId,
        destination: destinationQuery,
      });
      setRecords(Array.isArray(data.data) ? data.data : []);
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 0);
      setHasNext(Boolean(data.has_next));
      setHasPrevious(Boolean(data.has_previous));
    } catch (error) {
      toast({
        title: "Error",
        description: extractApiMessage(error, "Failed to load cost records."),
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
  }, [page, pageSize, searchQuery, soNumberQuery, bizCategory, agentId, clientId, vesselId, destinationQuery, toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      refreshAgents(),
      refreshClients(),
      refreshVessels(),
      refreshDestinations(),
    ])
      .then(([agentList, clientList, vesselList, destinationList]) => {
        if (cancelled) return;
        setAgents(Array.isArray(agentList) ? agentList : getCached(MASTER_KEYS.AGENTS) ?? []);
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
  }, [refreshAgents, refreshClients, refreshVessels, refreshDestinations]);

  useEffect(() => {
    writePersistedCostListState({
      searchValue,
      soNumber,
      agentId,
      clientId,
      vesselId,
      destination,
      bizCategory,
      page,
      pageSize,
      showAdvancedFilters,
    });
  }, [
    searchValue,
    soNumber,
    agentId,
    clientId,
    vesselId,
    destination,
    bizCategory,
    page,
    pageSize,
    showAdvancedFilters,
  ]);

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
    setAgentId("");
    setClientId("");
    setVesselId("");
    setDestination("");
    setDestinationQuery("");
    setBizCategory("");
    setPage(1);
  };

  const handleOpenCreate = () => {
    history.push("/admin/ledger/cost/form");
  };

  const handleOpenEdit = (row) => {
    history.push(`/admin/ledger/cost/form/${row.id}`);
  };

  const handleConfirmDelete = async () => {
    if (deleteId == null) return;
    setIsSaving(true);
    try {
      const res = await deleteLedgerCost(deleteId);
      toast({
        title: "Success",
        description: res?.message || res?.result?.message || "Cost deleted successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      setDeleteId(null);
      await loadRecords();
    } catch (error) {
      toast({
        title: "Error",
        description: extractApiMessage(error, "Delete failed."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const agentOptions = (Array.isArray(agents) ? agents : []).map((agent) => ({
    ...agent,
    name: agentDisplayName(agent),
  }));
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

  const advancedFilterCount = [
    soNumber,
    agentId,
    clientId,
    vesselId,
    destination,
    bizCategory,
  ].filter((value) => value != null && String(value).trim() !== "").length;
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

  const displaySo = (row) => {
    const name = getMany2oneName(row.sale_order_id);
    if (name) return name;
    if (row.so_number) return String(row.so_number).startsWith("SO") ? row.so_number : `SO-${row.so_number}`;
    return "-";
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} bg={pageBg} minH="100vh">
      <Box px="25px" pb={8}>
        <Flex justify="space-between" align={{ base: "flex-start", md: "center" }} mb={6} gap={4} wrap="wrap">
          <Box>
            <Heading size="lg" mb={1}>
              Cost DB
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Agent invoice costs linked to shipping orders
            </Text>
          </Box>
          <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" onClick={handleOpenCreate}>
            New Cost
          </Button>
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
                  placeholder="Search SO, invoices, destination, agent, client..."
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
            <Box
              mt={5}
              pt={5}
              px={{ base: 1, md: 2 }}
              borderTop="1px"
              borderColor={borderColor}
            >
              <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
                <Text fontSize="sm" fontWeight="600">
                  Filter by specific fields
                </Text>
                {hasAdvancedFilters && (
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    h="40px"
                    onClick={handleClearAdvancedFilters}
                  >
                    Clear All
                  </Button>
                )}
              </Flex>
              <SimpleGrid
                columns={{ base: 1, md: 2, xl: 3 }}
                columnGap={{ base: 4, md: 8 }}
                rowGap={4}
              >
                <FormControl>
                  <FormLabel {...filterLabelProps}>SO Number</FormLabel>
                  <Input
                    placeholder="Filter by SO number"
                    value={soNumber}
                    onChange={(e) => setSoNumber(e.target.value)}
                    autoComplete="off"
                    name="cost-filter-so-number"
                    {...controlProps}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel {...filterLabelProps}>Agent</FormLabel>
                  <SimpleSearchableSelect
                    value={agentId}
                    onChange={(value) => {
                      setAgentId(value || "");
                      setPage(1);
                    }}
                    options={agentOptions}
                    placeholder="All agents"
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
                    {BIZ_CATEGORY_OPTIONS.map((option) => (
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
              <Icon as={MdReceipt} boxSize={10} color="gray.400" />
              <Text fontWeight="700" color="gray.700">
                No cost records found
              </Text>
              <Text fontSize="sm" color="gray.500" maxW="360px">
                {searchQuery || hasAdvancedFilters
                  ? "Try clearing search or filters to see more results."
                  : "Create an agent invoice cost to see it listed here."}
              </Text>
              {!searchQuery && !hasAdvancedFilters && (
                <Button mt={1} size="sm" colorScheme="blue" leftIcon={<Icon as={MdAdd} />} onClick={handleOpenCreate}>
                  New Cost
                </Button>
              )}
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
                <Table size="sm" variant="simple" minW="1180px">
                  <Thead>
                    <Tr>
                      <Th {...thProps} position="sticky" left={0} zIndex={3} minW="120px">
                        SO Number
                      </Th>
                      <Th {...thProps} minW="160px">Agent</Th>
                      <Th {...thProps} minW="160px">Client</Th>
                      <Th {...thProps} minW="140px">Vessel</Th>
                      <Th {...thProps} minW="140px">Destination</Th>
                      <Th {...thProps} isNumeric minW="120px">Amount</Th>
                      <Th {...thProps} isNumeric minW="110px">USD Cost</Th>
                      <Th {...thProps} isNumeric minW="90px">GST</Th>
                      <Th {...thProps} minW="120px">Biz Category</Th>
                      <Th {...thProps} minW="110px">Invoice Date</Th>
                      <Th {...thProps} minW="110px">Due</Th>
                      <Th {...thProps} minW="110px">Paid</Th>
                      <Th {...thProps} minW="90px">Invoice</Th>
                      <Th {...thProps} position="sticky" right={0} zIndex={3} minW="108px" textAlign="center">
                        Actions
                      </Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((row, index) => {
                      const rowBg = index % 2 === 0 ? tableRowBg : tableRowBgAlt;
                      const agentName = row.agent || getMany2oneName(row.agent_id) || "";
                      const clientName = row.client || getMany2oneName(row.client_id) || "";
                      const vesselName = row.vessel_name || getMany2oneName(row.vessel_id) || "";
                      const currencyCode = row.currency_code || getMany2oneName(row.currency_id) || "";
                      const bizKey = normalizeBizCategory(row.biz_category);
                      const bizLabel = bizCategoryDisplay(row.biz_category, row.biz_category_label);
                      const invoiceDate = prettyCostDate(row.date_agent_invoice);
                      const dueDate = prettyCostDate(row.date_due_agent);
                      const paidDate = prettyCostDate(row.date_agent_paid);
                      const overdue = isDueOverdue(row);
                      const invoiceUrl =
                        row.invoice_link && row.invoice_link !== false ? String(row.invoice_link) : "";
                      return (
                        <Tr
                          key={row.id}
                          bg={rowBg}
                          _hover={{ bg: hoverBg }}
                          sx={{ "& td": { bg: "inherit" } }}
                        >
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
                              onClick={() => handleOpenEdit(row)}
                            >
                              {displaySo(row)}
                            </Button>
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText value={agentName} maxW="180px" />
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText value={clientName} maxW="180px" />
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText value={vesselName} maxW="150px" />
                          </Td>
                          <Td {...tdProps}>
                            <TruncatedText value={row.destination} maxW="150px" />
                          </Td>
                          <Td {...tdProps} isNumeric>
                            <Text fontWeight="700" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                              {formatCostNumber(row.currency_amount)}
                            </Text>
                            <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                              {currencyCode || "—"}
                            </Text>
                          </Td>
                          <Td {...tdProps} isNumeric fontWeight="600" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                            {formatCostNumber(row.usd_cost, 4)}
                          </Td>
                          <Td {...tdProps} isNumeric fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                            {formatCostNumber(row.gst_in_amount)}
                          </Td>
                          <Td {...tdProps}>
                            {bizLabel && bizLabel !== "-" ? (
                              <Badge
                                colorScheme={bizKey === "bunker" ? "orange" : "purple"}
                                variant="subtle"
                                borderRadius="full"
                                px={2.5}
                                py={0.5}
                                fontSize="xs"
                                textTransform="none"
                              >
                                {bizLabel}
                              </Badge>
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td {...tdProps} whiteSpace="nowrap" color={invoiceDate ? "inherit" : "gray.400"}>
                            {invoiceDate || "—"}
                          </Td>
                          <Td {...tdProps} whiteSpace="nowrap">
                            {dueDate ? (
                              overdue ? (
                                <Badge colorScheme="red" variant="subtle" borderRadius="full" px={2} textTransform="none">
                                  {dueDate}
                                </Badge>
                              ) : (
                                dueDate
                              )
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td {...tdProps} whiteSpace="nowrap">
                            {paidDate ? (
                              <Badge colorScheme="green" variant="subtle" borderRadius="full" px={2} textTransform="none">
                                {paidDate}
                              </Badge>
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td {...tdProps}>
                            {invoiceUrl ? (
                              isProbablyUrl(invoiceUrl) ? (
                                <Button
                                  as="a"
                                  href={invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="xs"
                                  variant="outline"
                                  colorScheme="blue"
                                  rightIcon={<Icon as={MdOpenInNew} />}
                                >
                                  Open
                                </Button>
                              ) : (
                                <TruncatedText value={invoiceUrl} maxW="120px" />
                              )
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                          <Td
                            {...tdProps}
                            position="sticky"
                            right={0}
                            zIndex={1}
                            boxShadow="inset 1px 0 0 var(--chakra-colors-gray-200)"
                          >
                            <HStack spacing={2} justify="center">
                              <Tooltip label="Edit" hasArrow>
                                <IconButton
                                  aria-label="Edit cost"
                                  icon={<MdEdit />}
                                  size="sm"
                                  variant="outline"
                                  colorScheme="blue"
                                  onClick={() => handleOpenEdit(row)}
                                />
                              </Tooltip>
                              <Tooltip label="Delete" hasArrow>
                                <IconButton
                                  aria-label="Delete cost"
                                  icon={<MdDelete />}
                                  size="sm"
                                  variant="outline"
                                  colorScheme="red"
                                  onClick={() => {
                                    setDeleteId(row.id);
                                    onDeleteOpen();
                                  }}
                                />
                              </Tooltip>
                            </HStack>
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(page - 1)}
                      isDisabled={!hasPrevious}
                    >
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

      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelDeleteRef}
        onClose={() => {
          if (!isSaving) {
            onDeleteClose();
            setDeleteId(null);
          }
        }}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete cost</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this cost record? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelDeleteRef} onClick={onDeleteClose} isDisabled={isSaving}>
                Cancel
              </Button>
              <Button colorScheme="red" ml={3} onClick={handleConfirmDelete} isLoading={isSaving}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
