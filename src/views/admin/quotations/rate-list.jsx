import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import api from "../../../api/axios";
import { useMasterData } from "../../../hooks/useMasterData";

const DEFAULT_FORM = {
  rate_type: "general",
  client_id: "",
  location_text: "",
  agent_text: "",
  currency_id: "",
  rate_name: "",
  rate_text: "",
  rate_float: "",
  rate_calculation: "",
  fixed_sales_rate: "",
  valid_until: "",
  remarks: "",
  sort_order: "",
  incl_in_tariff: false,
  import_group: "",
  last_update: "",
  active: true,
  rate_id: "",
};

const DEFAULT_FILTERS = {
  rate_type: "",
  client_id: "",
  currency_id: "",
  rate_name: "",
  rate_id: "",
  import_group: "",
  active: "",
  incl_in_tariff: "",
};

function boolFilterToParam(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default function RateList() {
  const toast = useToast();
  const { clients, currencies } = useMasterData();
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: search || undefined,
        rate_type: filters.rate_type || undefined,
        client_id: filters.client_id || undefined,
        currency_id: filters.currency_id || undefined,
        rate_name: filters.rate_name || undefined,
        rate_id: filters.rate_id || undefined,
        import_group: filters.import_group || undefined,
        active: boolFilterToParam(filters.active),
        incl_in_tariff: boolFilterToParam(filters.incl_in_tariff),
      };

      const response = await api.get("/api/rate/list", { params });
      const result = response?.data || {};

      setItems(Array.isArray(result.data) ? result.data : []);
      setTotalPages(result.total_pages || 1);
      setTotalCount(result.total_count || 0);
    } catch (error) {
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
      toast({
        title: "Error",
        description: "Failed to load rate list.",
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
    onOpen();
  };

  const openEdit = (item) => {
    setIsEdit(true);
    setFormData({
      id: item.id,
      rate_type: item.rate_type || "general",
      client_id: item.client_id?.id || item.client_id || "",
      location_text: item.location_text || item.location || "",
      agent_text: item.agent_text || item.agent || "",
      currency_id: item.currency_id?.id || item.currency_id || "",
      rate_name: item.rate_name || "",
      rate_text: item.rate_text || "",
      rate_float: item.rate_float || "",
      rate_calculation: item.rate_calculation || "",
      fixed_sales_rate: item.fixed_sales_rate || "",
      valid_until: item.valid_until || "",
      remarks: item.remarks || "",
      sort_order: item.sort_order ?? "",
      incl_in_tariff: Boolean(item.incl_in_tariff),
      import_group: item.import_group || "",
      last_update: item.last_update || "",
      active: item.active !== false,
      rate_id: item.rate_id || "",
    });
    onOpen();
  };

  const validateForm = () => {
    if (!formData.rate_type) return "Rate type is required.";
    if (formData.rate_type === "client_specific" && !formData.client_id) {
      return "Client is required for client specific rates.";
    }
    if (!formData.currency_id) return "Currency is required.";
    if (!formData.rate_name) return "Rate name is required.";
    return "";
  };

  const saveRate = async () => {
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
        ...formData,
        client_id: formData.rate_type === "client_specific" ? Number(formData.client_id) : null,
        currency_id: Number(formData.currency_id),
      };

      if (!isEdit) {
        delete payload.id;
        delete payload.rate_id;
      }

      await api.post(isEdit ? "/api/rate/list/update" : "/api/rate/list/create", payload);

      toast({
        title: isEdit ? "Rate updated" : "Rate created",
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
        description: isEdit ? "Failed to update rate." : "Failed to create rate.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteOne = async (id) => {
    try {
      await api.post("/api/rate/list/delete", { id });
      toast({
        title: "Rate deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete rate.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => api.post("/api/rate/list/delete", { id })));
      toast({
        title: "Selected rates deleted",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      setSelectedIds([]);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete some selected rows.",
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

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} px="24px">
      <VStack align="stretch" spacing={4}>
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <HStack>
            <Button leftIcon={<Icon as={MdAdd} />} colorScheme="blue" onClick={openCreate}>
              New Rate
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
          <InputGroup maxW="420px">
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
            maxW="180px"
            value={filters.rate_type}
            onChange={(e) => setFilters((p) => ({ ...p, rate_type: e.target.value }))}
          >
            <option value="">All Types</option>
            <option value="general">General</option>
            <option value="client_specific">Client Specific</option>
          </Select>
          <Select
            maxW="220px"
            value={filters.client_id}
            onChange={(e) => setFilters((p) => ({ ...p, client_id: e.target.value }))}
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          <Select
            maxW="180px"
            value={filters.active}
            onChange={(e) => setFilters((p) => ({ ...p, active: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
          <Button onClick={() => setPage(1)}>Apply</Button>
          <Button variant="ghost" onClick={clearFilters}>
            Clear
          </Button>
        </HStack>

        <Box borderWidth="1px" borderRadius="8px" overflow="auto">
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
                  <Th>Rate ID</Th>
                  <Th>Rate Type</Th>
                  <Th>Client</Th>
                  <Th>Location</Th>
                  <Th>Agent</Th>
                  <Th>Currency</Th>
                  <Th>Rate Name</Th>
                  <Th>Rate</Th>
                  <Th>Fixed Sales Rate</Th>
                  <Th>Incl Tariff</Th>
                  <Th>Active</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {items.map((item) => (
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
                    <Td>{item.rate_id || "-"}</Td>
                    <Td>
                      <Badge colorScheme={item.rate_type === "client_specific" ? "purple" : "blue"}>
                        {item.rate_type}
                      </Badge>
                    </Td>
                    <Td>{item.client_id?.name || "-"}</Td>
                    <Td>{item.location_text || item.location || "-"}</Td>
                    <Td>{item.agent_text || item.agent || "-"}</Td>
                    <Td>{item.currency_id?.name || "-"}</Td>
                    <Td>{item.rate_name || "-"}</Td>
                    <Td>{item.rate_float || "-"}</Td>
                    <Td>{item.fixed_sales_rate || "-"}</Td>
                    <Td>{item.incl_in_tariff ? "Yes" : "No"}</Td>
                    <Td>{item.active ? "Yes" : "No"}</Td>
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
                ))}
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
              <option value={200}>200</option>
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
          </HStack>
        </Flex>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isEdit ? "Edit Rate" : "New Rate"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {isEdit && (
                <FormControl>
                  <FormLabel>Rate ID (Read only)</FormLabel>
                  <Input value={formData.rate_id || ""} isReadOnly />
                </FormControl>
              )}

              <HStack align="start" spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Rate Type</FormLabel>
                  <Select
                    value={formData.rate_type}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        rate_type: nextType,
                        client_id: nextType === "general" ? "" : prev.client_id,
                      }));
                    }}
                  >
                    <option value="general">General</option>
                    <option value="client_specific">Client Specific</option>
                  </Select>
                </FormControl>

                {formData.rate_type === "client_specific" && (
                  <FormControl isRequired>
                    <FormLabel>Client</FormLabel>
                    <Select
                      value={formData.client_id}
                      onChange={(e) => setFormData((p) => ({ ...p, client_id: e.target.value }))}
                    >
                      <option value="">Select Client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl isRequired>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={formData.currency_id}
                    onChange={(e) => setFormData((p) => ({ ...p, currency_id: e.target.value }))}
                  >
                    <option value="">Select Currency</option>
                    {currencies.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>Location Text</FormLabel>
                  <Input
                    value={formData.location_text}
                    onChange={(e) => setFormData((p) => ({ ...p, location_text: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Agent Text</FormLabel>
                  <Input
                    value={formData.agent_text}
                    onChange={(e) => setFormData((p) => ({ ...p, agent_text: e.target.value }))}
                  />
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
                <FormControl>
                  <FormLabel>Rate Float</FormLabel>
                  <Input
                    value={formData.rate_float}
                    onChange={(e) => setFormData((p) => ({ ...p, rate_float: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Fixed Sales Rate</FormLabel>
                  <Input
                    value={formData.fixed_sales_rate}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, fixed_sales_rate: e.target.value }))
                    }
                  />
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>Rate Calculation</FormLabel>
                  <Input
                    value={formData.rate_calculation}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, rate_calculation: e.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Valid Until</FormLabel>
                  <Input
                    placeholder="31-12-2026 or 2026-12-31"
                    value={formData.valid_until}
                    onChange={(e) => setFormData((p) => ({ ...p, valid_until: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Last Update</FormLabel>
                  <Input
                    value={formData.last_update}
                    onChange={(e) => setFormData((p) => ({ ...p, last_update: e.target.value }))}
                  />
                </FormControl>
              </HStack>

              <HStack align="start" spacing={4}>
                <FormControl>
                  <FormLabel>Sort Order</FormLabel>
                  <Input
                    value={formData.sort_order}
                    onChange={(e) => setFormData((p) => ({ ...p, sort_order: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Import Group</FormLabel>
                  <Input
                    value={formData.import_group}
                    onChange={(e) => setFormData((p) => ({ ...p, import_group: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Include in Tariff</FormLabel>
                  <Select
                    value={String(formData.incl_in_tariff)}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, incl_in_tariff: e.target.value === "true" }))
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Active</FormLabel>
                  <Select
                    value={String(formData.active)}
                    onChange={(e) => setFormData((p) => ({ ...p, active: e.target.value === "true" }))}
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
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
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={saveRate} isLoading={saving}>
              {isEdit ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
