import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
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
  VStack,
} from "@chakra-ui/react";
import { MdAdd, MdClose, MdDelete, MdEdit, MdFilterList, MdSearch } from "react-icons/md";
import { useHistory } from "react-router-dom";
import Card from "components/card/Card";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import {
  deleteNarviQuotation,
  extractNarviQuotationError,
  getNarviQuotationOptions,
  getNarviQuotations,
} from "../../../api/narviQuotation";
import {
  formatClientOption,
  formatVesselOption,
  intOrUndef,
  m2oName,
  normalizeClientOptions,
  normalizeVesselOptions,
  quotationRateNames,
  quotationSoDisplay,
  quotationVesselName,
} from "./quotationUtils";

const DEFAULT_FILTERS = {
  client_id: "",
  vessel_id: "",
  sale_order_id: "",
  rate_name: "",
  validity_date: "",
};

function TruncatedCell({ value, maxW = "200px", fontWeight, textColor, tdStyle, cellText }) {
  const text = value || "-";
  return (
    <Td
      maxW={maxW}
      isTruncated
      fontWeight={fontWeight}
      title={text !== "-" ? text : undefined}
      {...tdStyle}
    >
      <Text color={textColor} fontSize="sm" fontWeight={fontWeight} {...cellText}>
        {text}
      </Text>
    </Td>
  );
}

export default function Quotations() {
  const history = useHistory();
  const toast = useToast();

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const hoverBg = useColorModeValue("blue.50", "gray.700");

  const cellText = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    display: "block",
  };
  const thStyle = {
    border: "1px",
    borderColor: tableBorderColor,
    py: "12px",
    px: "16px",
    fontSize: "12px",
    fontWeight: "600",
    color: tableTextColor,
    textTransform: "uppercase",
  };
  const tdStyle = {
    borderRight: "1px",
    borderColor: tableBorderColor,
    py: "12px",
    px: "16px",
  };
  const filterInputProps = {
    variant: "outline",
    fontSize: "sm",
    bg: inputBg,
    color: inputText,
    borderRadius: "8px",
    border: "2px",
    borderColor: borderColor,
    _focus: {
      borderColor: "blue.400",
      boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
    },
    _hover: {
      borderColor: "blue.300",
    },
    _placeholder: { color: placeholderColor, fontSize: "14px" },
  };
  const searchableSelectProps = {
    size: "sm",
    bg: inputBg,
    color: inputText,
    borderColor: borderColor,
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [clientOptions, setClientOptions] = useState([]);
  const [vesselOptions, setVesselOptions] = useState([]);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const filterSearchTimer = useRef(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const hasAnyAdvanceFilter = Boolean(
    filters.client_id ||
    filters.vessel_id ||
    filters.sale_order_id ||
    filters.rate_name.trim() ||
    filters.validity_date
  );
  const hasAnyFilter = Boolean(search || hasAnyAdvanceFilter);
  const [showFilterFields, setShowFilterFields] = useState(false);

  useEffect(() => {
    if (hasAnyAdvanceFilter) setShowFilterFields(true);
  }, [hasAnyAdvanceFilter]);

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (!isFirstSearchRun.current) {
        setPage(1);
      }
      isFirstSearchRun.current = false;
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadFilterOptions = useCallback(
    async (overrides = {}) => {
      setFilterOptionsLoading(true);
      try {
        const current = filtersRef.current;
        const clientId = intOrUndef(overrides.client_id ?? current.client_id);
        const vesselId = intOrUndef(overrides.vessel_id ?? current.vessel_id);
        const result = await getNarviQuotationOptions({
          page: 1,
          page_size: 50,
          client_id: clientId,
          vessel_id: vesselId,
          q_client: overrides.q_client ?? "",
          q_vessel: overrides.q_vessel ?? "",
          q_so: "",
        });
        setClientOptions(normalizeClientOptions(result.client_options ?? []));
        setVesselOptions(
          clientId ? normalizeVesselOptions(result.vessel_options ?? []) : []
        );
      } catch (error) {
        toast({
          title: "Error",
          description: extractNarviQuotationError(error, "Failed to load filter options."),
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setFilterOptionsLoading(false);
      }
    },
    [toast]
  );

  const scheduleFilterSearch = (field, value) => {
    const q = String(value ?? "").trim();
    if (!q) return;
    if (filterSearchTimer.current) clearTimeout(filterSearchTimer.current);
    filterSearchTimer.current = setTimeout(() => {
      const current = filtersRef.current;
      loadFilterOptions({
        client_id: current.client_id || undefined,
        vessel_id: current.vessel_id || undefined,
        q_client: field === "client" ? q : "",
        q_vessel: field === "vessel" ? q : "",
      });
    }, 300);
  };

  const handleFilterFieldFocus = (field) => {
    const current = filtersRef.current;
    if (field === "vessel" && !current.client_id) return;
    loadFilterOptions({
      client_id: current.client_id || undefined,
      vessel_id: current.vessel_id || undefined,
      q_client: "",
      q_vessel: "",
    });
  };

  useEffect(() => {
    loadFilterOptions();
    return () => {
      if (filterSearchTimer.current) clearTimeout(filterSearchTimer.current);
    };
  }, [loadFilterOptions]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: debouncedSearch.trim() || undefined,
        client_id: intOrUndef(filters.client_id),
        vessel_id: intOrUndef(filters.vessel_id),
        sale_order_id: intOrUndef(filters.sale_order_id),
        rate_name: filters.rate_name.trim() || undefined,
        validity_date: filters.validity_date || undefined,
      };

      const result = await getNarviQuotations(params);
      const rows = Array.isArray(result.data) ? result.data : [];
      setItems(rows);
      setTotalPages(result.total_pages || 1);
      setTotalCount(result.total_count ?? rows.length);
      setHasNext(Boolean(result.has_next));
      setHasPrevious(Boolean(result.has_previous));
    } catch (error) {
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
      setHasNext(false);
      setHasPrevious(false);
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to load quotations."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filters, toast]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "client_id") {
        next.vessel_id = "";
        next.sale_order_id = "";
      }
      if (field === "vessel_id") {
        next.sale_order_id = "";
      }
      return next;
    });
    setPage(1);
    if (field === "client_id") {
      setVesselOptions([]);
      loadFilterOptions({ client_id: value || undefined, vessel_id: undefined });
    } else if (field === "vessel_id") {
      loadFilterOptions({
        client_id: filtersRef.current.client_id || undefined,
        vessel_id: value || undefined,
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setFilters(DEFAULT_FILTERS);
    setVesselOptions([]);
    setPage(1);
    loadFilterOptions();
  };

  const handleDelete = async (quotationId) => {
    try {
      await deleteNarviQuotation(quotationId);
      toast({ title: "Quotation deleted", status: "success", duration: 2000, isClosable: true });
      await loadList();
    } catch (error) {
      toast({
        title: "Error",
        description: extractNarviQuotationError(error, "Failed to delete quotation."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        <Card direction="column" w="100%" px="0px" overflowX={{ sm: "scroll", lg: "hidden" }}>
          <Flex px="25px" justify="space-between" mb="20px" align="center">
            <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
              Quotations
            </Text>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={() => history.push("/admin/quotations/create")}
            >
              New Quotation
            </Button>
          </Flex>

          <Box
            px="25px"
            mb="20px"
            bg={inputBg}
            borderRadius="16px"
            p="24px"
            border="1px"
            mx="15px"
            borderColor={borderColor}
          >
            <HStack spacing={6} justify="space-between" align="center" flexWrap="wrap" mb={4}>
              <Box flex="1" minW="240px">
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  Search Quotations
                </Text>
                <InputGroup>
                  <InputLeftElement>
                    <Icon as={MdSearch} color="blue.500" w="16px" h="16px" />
                  </InputLeftElement>
                  <Input
                    {...filterInputProps}
                    borderRadius="10px"
                    placeholder="Search client, vessel, SO, rate name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    pr={search ? "32px" : undefined}
                  />
                  {search && (
                    <InputRightElement width="32px">
                      <IconButton
                        aria-label="Clear search"
                        size="xs"
                        variant="ghost"
                        icon={<Icon as={MdClose} />}
                        onClick={() => setSearch("")}
                        _hover={{ bg: "gray.200" }}
                      />
                    </InputRightElement>
                  )}
                </InputGroup>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  &nbsp;
                </Text>
                {hasAnyFilter && (
                  <Button
                    size="md"
                    variant="outline"
                    onClick={clearFilters}
                    colorScheme="red"
                    _hover={{ bg: "red.50" }}
                    borderRadius="10px"
                    border="2px"
                  >
                    Clear All
                  </Button>
                )}
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  Advanced Filters
                </Text>
                <Button
                  size="md"
                  variant={hasAnyAdvanceFilter ? "solid" : "outline"}
                  colorScheme={hasAnyAdvanceFilter ? "blue" : "gray"}
                  leftIcon={<Icon as={MdFilterList} />}
                  onClick={() => setShowFilterFields(!showFilterFields)}
                  borderRadius="10px"
                  border="2px"
                  borderColor={borderColor}
                >
                  {showFilterFields ? "Hide Filters" : "Show Filters"}
                </Button>
              </Box>

              <Box>
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                  Page Size
                </Text>
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  size="md"
                  bg={inputBg}
                  color={inputText}
                  borderRadius="8px"
                  border="2px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                  }}
                >
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </Select>
              </Box>
            </HStack>

            {showFilterFields && (
              <Box
                mt={4}
                pt={4}
                borderTop="2px"
                borderColor={borderColor}
                bg={expandableFilterBg}
                borderRadius="12px"
                p="20px"
              >
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={4}>
                  Filter by Specific Fields
                </Text>
                <HStack spacing={6} flexWrap="wrap" align="flex-start">
                  <Box minW="220px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Client
                    </Text>
                    <SimpleSearchableSelect
                      value={filters.client_id}
                      onChange={(value) => handleFilterChange("client_id", value || "")}
                      options={clientOptions}
                      placeholder="All Clients"
                      isLoading={filterOptionsLoading}
                      formatOption={formatClientOption}
                      prefillOnFocus={false}
                      clearOnEmptySearch={false}
                      serverSideSearch
                      onSearchChange={(q) => scheduleFilterSearch("client", q)}
                      {...searchableSelectProps}
                    />
                  </Box>
                  <Box minW="220px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Vessel
                    </Text>
                    <SimpleSearchableSelect
                      value={filters.vessel_id}
                      onChange={(value) => handleFilterChange("vessel_id", value || "")}
                      options={vesselOptions}
                      placeholder={filters.client_id ? "All Vessels" : "Select client first"}
                      isLoading={filterOptionsLoading}
                      isDisabled={!filters.client_id}
                      formatOption={formatVesselOption}
                      prefillOnFocus={false}
                      clearOnEmptySearch={false}
                      serverSideSearch
                      onFocus={() => handleFilterFieldFocus("vessel")}
                      onSearchChange={(q) => scheduleFilterSearch("vessel", q)}
                      {...searchableSelectProps}
                    />
                  </Box>
                  <Box minW="160px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      SO ID
                    </Text>
                    <Input
                      {...filterInputProps}
                      placeholder="SO ID"
                      value={filters.sale_order_id}
                      onChange={(e) => handleFilterChange("sale_order_id", e.target.value)}
                    />
                  </Box>
                  <Box minW="200px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Rate Name
                    </Text>
                    <Input
                      {...filterInputProps}
                      placeholder="Rate name"
                      value={filters.rate_name}
                      onChange={(e) => handleFilterChange("rate_name", e.target.value)}
                    />
                  </Box>
                  <Box minW="180px" flex="1">
                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                      Valid Date
                    </Text>
                    <Input
                      {...filterInputProps}
                      type="date"
                      value={filters.validity_date}
                      onChange={(e) => handleFilterChange("validity_date", e.target.value)}
                    />
                  </Box>
                </HStack>
              </Box>
            )}
          </Box>

          <Box px="15px" maxH="65vh" overflow="auto">
            <Table variant="unstyled" size="sm" minW="1000px" layout="fixed">
              <Thead bg={tableHeaderBg} position="sticky" top={0} zIndex={1} boxShadow="sm">
                <Tr>
                  {[
                    { label: "Quotation", w: "12%" },
                    { label: "Client", w: "16%" },
                    { label: "Vessel", w: "14%" },
                    { label: "SO ID", w: "10%" },
                    { label: "Rate Name", w: "24%" },
                    { label: "Valid Date", w: "10%" },
                    { label: "", w: "90px" },
                  ].map((col) => (
                    <Th key={col.label || "actions"} w={col.w} {...thStyle}>
                      {col.label}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py="40px" {...tdStyle}>
                      <Text color={tableTextColorSecondary} fontSize="sm">
                        Loading quotations...
                      </Text>
                    </Td>
                  </Tr>
                ) : items.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} textAlign="center" py="40px" {...tdStyle}>
                      <Text color={tableTextColorSecondary} fontSize="sm">
                        No quotations found.
                      </Text>
                    </Td>
                  </Tr>
                ) : (
                  items.map((item, index) => (
                    <Tr
                      key={item.id}
                      bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                      border="1px"
                      borderColor={tableBorderColor}
                      _hover={{ bg: hoverBg }}
                    >
                      <TruncatedCell
                        value={item.name || `QT/${item.id}`}
                        maxW="120px"
                        fontWeight="600"
                        textColor={textColor}
                        tdStyle={tdStyle}
                        cellText={cellText}
                      />
                      <TruncatedCell
                        value={item.client_name || m2oName(item.client_id, "-")}
                        maxW="220px"
                        textColor={textColor}
                        tdStyle={tdStyle}
                        cellText={cellText}
                      />
                      <TruncatedCell
                        value={quotationVesselName(item)}
                        maxW="200px"
                        textColor={textColor}
                        tdStyle={tdStyle}
                        cellText={cellText}
                      />
                      <TruncatedCell
                        value={quotationSoDisplay(item)}
                        maxW="140px"
                        textColor={textColor}
                        tdStyle={tdStyle}
                        cellText={cellText}
                      />
                      <TruncatedCell
                        value={quotationRateNames(item)}
                        maxW="320px"
                        textColor={textColor}
                        tdStyle={tdStyle}
                        cellText={cellText}
                      />
                      <TruncatedCell
                        value={item.validity_date || "-"}
                        maxW="140px"
                        textColor={textColor}
                        tdStyle={tdStyle}
                        cellText={cellText}
                      />
                      <Td w="90px" {...tdStyle}>
                        <HStack spacing={1}>
                          <Tooltip label="Edit">
                            <IconButton
                              aria-label="Edit quotation"
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              icon={<MdEdit />}
                              onClick={() => history.push(`/admin/quotations/edit/${item.id}`)}
                            />
                          </Tooltip>
                          <Tooltip label="Delete">
                            <IconButton
                              aria-label="Delete quotation"
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              icon={<MdDelete />}
                              onClick={() => handleDelete(item.id)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>

          <Flex px="25px" justify="space-between" align="center" py="20px" flexWrap="wrap" gap={4}>
            <Text fontSize="sm" color={tableTextColorSecondary}>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalCount)} of {totalCount} results
            </Text>
            <HStack spacing={1}>
              <Button size="sm" variant="outline" isDisabled={!hasPrevious} onClick={() => setPage(1)}>
                ««
              </Button>
              <Button
                size="sm"
                variant="outline"
                isDisabled={!hasPrevious}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                «
              </Button>
              <Text fontSize="sm" color={tableTextColorSecondary} px={2}>
                Page {page} of {totalPages}
              </Text>
              <Button
                size="sm"
                variant="outline"
                isDisabled={!hasNext}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                »
              </Button>
              <Button size="sm" variant="outline" isDisabled={!hasNext} onClick={() => setPage(totalPages)}>
                »»
              </Button>
            </HStack>
          </Flex>
        </Card>
      </VStack>
    </Box>
  );
}
