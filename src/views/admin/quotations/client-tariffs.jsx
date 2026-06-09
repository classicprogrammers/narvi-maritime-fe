import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
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
  Select,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { MdAdd, MdDelete, MdEdit, MdSearch } from "react-icons/md";
import SimpleSearchableSelect from "components/forms/SimpleSearchableSelect";
import { useMasterData } from "hooks/useMasterData";
import {
  createClientTariff,
  deleteClientTariff,
  extractClientTariffErrorMessage,
  getClientTariffOptions,
  getClientTariffs,
  updateClientTariff,
} from "api/clientTariff";

const DEFAULT_FORM = {
  location: "",
  agent_id: "",
  currency_id: "",
  rate_name: "",
  rate_text: "",
  rate_calculation: "per_invoice",
  rate: "",
  valid_until: "",
  active: true,
};

const DEFAULT_FILTERS = {
  location: "",
  agent_id: "",
  currency_id: "",
  rate_calculation: "",
  rate_name: "",
  active: "",
};

function boolFilterToParam(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function normalizeRateCalculation(value) {
  const raw = String(value || "").toLowerCase().trim();
  if (raw === "per invoice" || raw === "per_invoice") return "per_invoice";
  if (raw === "per trip" || raw === "per_trip") return "per_trip";
  return raw;
}

function displayText(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  return String(value);
}

function formatAgentOption(agent) {
  if (!agent) return "";
  const code = agent.name || "";
  const company = agent.company_name || "";
  if (code && company) return `${code} — ${company}`;
  return code || company || `Agent ${agent.id}`;
}

export default function ClientTariffs() {
  const toast = useToast();
  const { currencies } = useMasterData();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [locationOptions, setLocationOptions] = useState([]);
  const [agentOptions, setAgentOptions] = useState([]);
  const [rateCalculationOptions, setRateCalculationOptions] = useState([
    { value: "per_invoice", label: "Per Invoice" },
    { value: "per_trip", label: "Per Trip" },
  ]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const optionsSearchTimer = useRef(null);

  const loadOptions = useCallback(async (overrides = {}) => {
    setOptionsLoading(true);
    try {
      const result = await getClientTariffOptions(overrides);
      if (Array.isArray(result?.location_options)) {
        setLocationOptions(result.location_options);
      }
      if (Array.isArray(result?.agent_options)) {
        setAgentOptions(result.agent_options);
      }
      if (Array.isArray(result?.rate_calculation_options) && result.rate_calculation_options.length) {
        setRateCalculationOptions(result.rate_calculation_options);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: extractClientTariffErrorMessage(error, "Failed to load tariff options."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setOptionsLoading(false);
    }
  }, [toast]);

  const scheduleOptionsSearch = useCallback(
    (field, value) => {
      if (optionsSearchTimer.current) clearTimeout(optionsSearchTimer.current);
      optionsSearchTimer.current = setTimeout(() => {
        loadOptions({
          q_location: field === "location" ? value : "",
          q_agent: field === "agent" ? value : "",
        });
      }, 300);
    },
    [loadOptions]
  );

  useEffect(() => {
    loadOptions();
    return () => {
      if (optionsSearchTimer.current) clearTimeout(optionsSearchTimer.current);
    };
  }, [loadOptions]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        location: filters.location || undefined,
        agent_id: filters.agent_id || undefined,
        currency_id: filters.currency_id || undefined,
        rate_calculation: filters.rate_calculation || undefined,
        rate_name: filters.rate_name || undefined,
        active: boolFilterToParam(filters.active),
      };

      const result = await getClientTariffs(params);
      const rows = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result?.tariffs)
          ? result.tariffs
          : Array.isArray(result)
            ? result
            : [];

      setItems(rows);
      setTotalPages(result?.total_pages || 1);
      setTotalCount(result?.total_count ?? rows.length);
    } catch (error) {
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
      toast({
        title: "Error",
        description: extractClientTariffErrorMessage(error, "Failed to load client tariffs."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, search, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const clearFilters = () => {
    setSearch("");
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const openCreate = () => {
    setIsEdit(false);
    setFormData(DEFAULT_FORM);
    loadOptions();
    onOpen();
  };

  const openEdit = (item) => {
    setIsEdit(true);
    setFormData({
      id: item.id,
      location: item.location || item.location_text || "",
      agent_id: item.agent_id?.id || item.agent_id || "",
      currency_id: item.currency_id?.id || item.currency_id || "",
      rate_name: item.rate_name || "",
      rate_text: item.rate_text === false ? "" : item.rate_text || "",
      rate_calculation: normalizeRateCalculation(item.rate_calculation) || "per_invoice",
      rate: item.rate ?? item.rates ?? "",
      valid_until: item.valid_until || "",
      active: item.active !== false,
    });
    loadOptions({
      q_location: item.location || item.location_text || "",
      q_agent: item.agent_id?.name || item.agent || "",
    });
    onOpen();
  };

  const validateForm = () => {
    if (!formData.location) return "Location is required.";
    if (!formData.agent_id) return "Agent is required.";
    if (!formData.currency_id) return "Currency is required.";
    if (!formData.rate_name) return "Rate name is required.";
    if (!formData.rate_calculation) return "Rate calculation is required.";
    if (formData.rate === "" || formData.rate == null) return "Rate is required.";
    if (Number.isNaN(Number(formData.rate))) return "Rate must be a number.";
    return "";
  };

  const saveTariff = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        location: formData.location,
        agent_id: Number(formData.agent_id),
        currency_id: Number(formData.currency_id),
        rate_name: formData.rate_name,
        rate_text: formData.rate_text || "",
        rate_calculation: normalizeRateCalculation(formData.rate_calculation),
        rate: Number(formData.rate),
        valid_until: formData.valid_until || undefined,
        active: Boolean(formData.active),
      };

      if (isEdit) {
        await updateClientTariff({ id: formData.id, ...payload });
      } else {
        await createClientTariff(payload);
      }

      toast({
        title: isEdit ? "Client tariff updated" : "Client tariff created",
        status: "success",
        duration: 2500,
        isClosable: true,
      });

      onClose();
      setPage(1);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: extractClientTariffErrorMessage(
          error,
          isEdit ? "Failed to update client tariff." : "Failed to create client tariff."
        ),
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOne = async (id) => {
    try {
      await deleteClientTariff(id);
      toast({
        title: "Client tariff deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: extractClientTariffErrorMessage(error, "Failed to delete client tariff."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteClientTariff(id)));
      toast({
        title: "Selected tariffs deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setSelectedIds([]);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: extractClientTariffErrorMessage(error, "Failed to delete some selected rows."),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items.length, selectedIds.length]
  );

  const rateCalcLabel = (value, label) =>
    label || (normalizeRateCalculation(value) === "per_trip" ? "Per Trip" : "Per Invoice");

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="24px">
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <HStack>
            <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" onClick={openCreate}>
              New Client Tariff
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              onClick={deleteSelected}
              isDisabled={selectedIds.length === 0}
            >
              Delete Selected
            </Button>
          </HStack>
          <Text fontWeight="600">Total: {totalCount}</Text>
        </Flex>

        <HStack align="end" wrap="wrap" spacing={3}>
          <InputGroup maxW="320px">
            <InputLeftElement>
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
          <Select
            maxW="200px"
            placeholder="All locations"
            value={filters.location}
            onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}
          >
            <option value="">All locations</option>
            {locationOptions.map((opt) => (
              <option key={opt.name} value={opt.name}>
                {opt.name}
              </option>
            ))}
          </Select>
          <Select
            maxW="220px"
            placeholder="All agents"
            value={filters.agent_id}
            onChange={(e) => setFilters((p) => ({ ...p, agent_id: e.target.value }))}
          >
            <option value="">All agents</option>
            {agentOptions.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {formatAgentOption(agent)}
              </option>
            ))}
          </Select>
          <Select
            maxW="180px"
            value={filters.currency_id}
            onChange={(e) => setFilters((p) => ({ ...p, currency_id: e.target.value }))}
          >
            <option value="">All currencies</option>
            {currencies.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.name}
              </option>
            ))}
          </Select>
          <Select
            maxW="180px"
            value={filters.rate_calculation}
            onChange={(e) => setFilters((p) => ({ ...p, rate_calculation: e.target.value }))}
          >
            <option value="">All calculations</option>
            {rateCalculationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Input
            maxW="180px"
            placeholder="Rate name"
            value={filters.rate_name}
            onChange={(e) => setFilters((p) => ({ ...p, rate_name: e.target.value }))}
          />
          <Select
            maxW="140px"
            value={filters.active}
            onChange={(e) => setFilters((p) => ({ ...p, active: e.target.value }))}
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <Button onClick={() => setPage(1)}>Apply</Button>
          <Button variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </HStack>

        <Box borderWidth="1px" borderRadius="8px" maxH="65vh" overflowY="auto" overflowX="auto">
          {loading ? (
            <Flex py={12} justify="center">
              <Spinner />
            </Flex>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds(items.map((it) => it.id));
                        else setSelectedIds([]);
                      }}
                    />
                  </Th>
                  <Th>Location</Th>
                  <Th>Agent</Th>
                  <Th>Currency</Th>
                  <Th>Rate Name</Th>
                  <Th>Rate Text</Th>
                  <Th>Rate Calculation</Th>
                  <Th>Rate</Th>
                  <Th>Valid Until</Th>
                  <Th>Active</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.length === 0 ? (
                  <Tr>
                    <Td colSpan={11}>
                      <Text py={6} textAlign="center" color="gray.500">
                        No client tariffs found.
                      </Text>
                    </Td>
                  </Tr>
                ) : (
                  items.map((item) => (
                    <Tr key={item.id}>
                      <Td>
                        <Checkbox
                          isChecked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, item.id]
                                : prev.filter((id) => id !== item.id)
                            );
                          }}
                        />
                      </Td>
                      <Td>{item.location || item.location_text || "-"}</Td>
                      <Td>{item.agent_id?.name || item.agent || "-"}</Td>
                      <Td>{item.currency_id?.name || "-"}</Td>
                      <Td>{item.rate_name || "-"}</Td>
                      <Td maxW="200px" isTruncated title={displayText(item.rate_text)}>
                        {displayText(item.rate_text)}
                      </Td>
                      <Td>
                        <Badge colorScheme="purple">
                          {rateCalcLabel(item.rate_calculation, item.rate_calculation_label)}
                        </Badge>
                      </Td>
                      <Td>{item.rate ?? item.rates ?? "-"}</Td>
                      <Td>{item.valid_until || "-"}</Td>
                      <Td>
                        <Badge colorScheme={item.active !== false ? "green" : "gray"}>
                          {item.active !== false ? "Yes" : "No"}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={1}>
                          <IconButton
                            aria-label="Edit"
                            size="xs"
                            icon={<MdEdit />}
                            onClick={() => openEdit(item)}
                          />
                          <IconButton
                            aria-label="Delete"
                            size="xs"
                            colorScheme="red"
                            icon={<MdDelete />}
                            onClick={() => deleteOne(item.id)}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          )}
        </Box>

        <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
          <HStack>
            <Text fontSize="sm">Page Size</Text>
            <Select
              w="110px"
              size="sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </Select>
          </HStack>
          <HStack>
            <Button size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={page <= 1}>
              Previous
            </Button>
            <Text fontSize="sm">
              Page {page} of {totalPages}
            </Text>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              isDisabled={page >= totalPages}
            >
              Next
            </Button>
            <Text fontSize="sm" color="gray.600">
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalCount)} of {totalCount}
            </Text>
          </HStack>
        </Flex>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEdit ? "Edit Client Tariff" : "New Client Tariff"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <HStack align="start" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Location</FormLabel>
                  <SimpleSearchableSelect
                    value={formData.location}
                    onChange={(value) => setFormData((p) => ({ ...p, location: value || "" }))}
                    options={locationOptions}
                    valueKey="name"
                    displayKey="name"
                    placeholder="Select location from Rate List"
                    isLoading={optionsLoading}
                    onSearchChange={(q) => scheduleOptionsSearch("location", q)}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Agent</FormLabel>
                  <SimpleSearchableSelect
                    value={formData.agent_id}
                    onChange={(value) => setFormData((p) => ({ ...p, agent_id: value || "" }))}
                    options={agentOptions}
                    formatOption={formatAgentOption}
                    placeholder="Select agent"
                    isLoading={optionsLoading}
                    onSearchChange={(q) => scheduleOptionsSearch("agent", q)}
                  />
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={formData.currency_id}
                    onChange={(e) => setFormData((p) => ({ ...p, currency_id: e.target.value }))}
                  >
                    <option value="">Select currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Rate Calculation</FormLabel>
                  <Select
                    value={formData.rate_calculation}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, rate_calculation: e.target.value }))
                    }
                  >
                    {rateCalculationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Rate Name</FormLabel>
                  <Input
                    value={formData.rate_name}
                    onChange={(e) => setFormData((p) => ({ ...p, rate_name: e.target.value }))}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Rate</FormLabel>
                  <Input
                    type="number"
                    step="any"
                    value={formData.rate}
                    onChange={(e) => setFormData((p) => ({ ...p, rate: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Valid Until</FormLabel>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData((p) => ({ ...p, valid_until: e.target.value }))}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Rate Text</FormLabel>
                <Textarea
                  value={formData.rate_text}
                  onChange={(e) => setFormData((p) => ({ ...p, rate_text: e.target.value }))}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Active</FormLabel>
                <Select
                  value={String(formData.active)}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, active: e.target.value === "true" }))
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={saveTariff} isLoading={saving}>
              {isEdit ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
