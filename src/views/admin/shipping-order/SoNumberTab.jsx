import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Center,
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
  Spinner,
  Switch,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useColorModeValue,
  useDisclosure,
  useToast,
  Select,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdRefresh,
  MdSearch,
} from "react-icons/md";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import {
  getCustomersForSelect,
  getVesselsForSelect,
  getDestinationsForSelect,
} from "../../../api/entitySelects";
import quotationsAPI from "../../../api/quotations";
import {
  getShippingOrders,
  createShippingOrder,
  updateShippingOrder,
  deleteShippingOrder,
} from "../../../api/shippingOrders";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return value;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numberValue);
};

const SoNumberTab = () => {
  const textColor = useColorModeValue("gray.700", "white");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");

  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [formData, setFormData] = useState(null);
  const [clients, setClients] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingVessels, setIsLoadingVessels] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);

  const formDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();

  const resetForm = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localTimestamp = `${pad(now.getDate())}/${pad(
      now.getMonth() + 1
    )}/${now.getFullYear()} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;

    setFormData({
      id: null,
      so_number: "",
      date_created: "",
      done: false,
      pic: "",
      client: "",
      client_id: null,
      vessel_name: "",
      vessel_id: null,
      destination: "",
      destination_id: null,
      next_action: "",
      eta_date: "",
      deadline_info: "",
      est_to_usd: "",
      est_profit_usd: "",
      internal_remark: "",
      client_remark: "",
      quotation: "",
      quotation_id: null,
      timestamp: localTimestamp,
    });
  };

  // Normalize backend data into the shape the table expects
  const normalizeOrder = (order) => {
    if (!order) return null;
    return {
      id: order.id,
      so_number: order.so_number || order.name || (order.id ? `SO-${order.id}` : ""),
      date_created: order.date_created || order.date_order,
      done: order.done === "done" || order.done === true,
      pic: order.pic || order.pic_name || "",
      client: order.client || order.client_name || "",
      client_id: order.client_id || order.partner_id || null,
      vessel_name: order.vessel_name || order.vessel || "",
      vessel_id: order.vessel_id || null,
      destination: order.destination || order.destination_name || "",
      destination_id: order.destination_id || null,
      next_action: order.next_action || "",
      eta_date: order.eta_date,
      deadline_info: order.deadline_info,
      est_to_usd: order.est_to_usd,
      est_profit_usd: order.est_profit_usd,
      internal_remark: order.internal_remark,
      client_remark: order.client_remark,
      quotation: order.quotation || order.quotation_name || order.quotation_oc_number || "",
      quotation_id: order.quotation_id || order.quotation?.id || null,
      timestamp: order.timestamp || order.so_create_date || order.date_order,
      _raw: order,
    };
  };

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getShippingOrders();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data?.result)
            ? data.result
            : Array.isArray(data?.data)
              ? data.data
              : [];

      const normalized = list
        .map(normalizeOrder)
        .filter(Boolean)
        .sort((a, b) => (b.id || 0) - (a.id || 0));

      setOrders(normalized);
    } catch (error) {
      console.error("Failed to fetch shipping orders", error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message;
      toast({
        title: "Error",
        description: apiMessage || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Fetch lookup data for client, vessel, destination selects
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        setIsLoadingClients(true);
        setIsLoadingVessels(true);
        setIsLoadingDestinations(true);

        const [clientsData, vesselsData, destinationsData] = await Promise.all([
          getCustomersForSelect().catch(() => []),
          getVesselsForSelect().catch(() => []),
          getDestinationsForSelect().catch(() => []),
        ]);

        setClients(clientsData || []);
        setVessels(vesselsData || []);
        setDestinations(destinationsData || []);
      } catch (error) {
        console.error("Failed to fetch SO lookups", error);
        toast({
          title: "Lookup load failed",
          description: "Unable to load clients / vessels / destinations",
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
      } finally {
        setIsLoadingClients(false);
        setIsLoadingVessels(false);
        setIsLoadingDestinations(false);
      }
    };

    fetchLookups();
  }, [toast]);

  // Fetch quotations for searchable quotation field
  useEffect(() => {
    const fetchQuotations = async () => {
      try {
        setIsLoadingQuotations(true);
        const response = await quotationsAPI.getQuotations();
        const data = response || {};

        const list =
          (Array.isArray(data.quotations) && data.quotations) ||
          (Array.isArray(data.result?.quotations) && data.result.quotations) ||
          [];

        // Normalize to { id, name } for SimpleSearchableSelect
        const normalized = list.map((q) => ({
          id: q.id,
          name: q.oc_number || q.name || `Q-${q.id}`,
        }));

        setQuotations(normalized);
      } catch (error) {
        console.error("Failed to fetch quotations for SO", error);
        setQuotations([]);
      } finally {
        setIsLoadingQuotations(false);
      }
    };

    fetchQuotations();
  }, []);

  const filteredOrders = useMemo(() => {
    if (!searchValue) return orders;
    const lowered = searchValue.toLowerCase();

    return orders.filter((order) => {
      const candidateValues = [
        order.so_number,
        order.vessel_name,
        order.client,
        order.destination,
        order.pic,
        order.internal_remark,
        order.client_remark,
        order.deadline_info,
      ];

      return candidateValues.some((value) =>
        value ? value.toString().toLowerCase().includes(lowered) : false
      );
    });
  }, [orders, searchValue]);

  const handleCreate = () => {
    setEditingOrder(null);
    resetForm();
    formDisclosure.onOpen();
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({ ...order });
    formDisclosure.onOpen();
  };

  const handleFormClose = () => {
    setEditingOrder(null);
    setFormData(null);
    formDisclosure.onClose();
  };

  const handleDeleteRequest = (order) => {
    setOrderToDelete(order);
    deleteDisclosure.onOpen();
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;

    try {
      await deleteShippingOrder(orderToDelete.id);
      toast({
        title: "Order deleted",
        description: `${orderToDelete.so_number || "SO"} has been removed`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      await fetchOrders();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err?.message || "Unable to delete sales order",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      deleteDisclosure.onClose();
      setOrderToDelete(null);
    }
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  const buildPayloadFromForm = (data) => {
    const toNumber = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const num = Number(v);
      return Number.isNaN(num) ? null : num;
    };

    const toDateTime = (dateStr) => {
      if (!dateStr) return null;
      // Backend expects "YYYY-MM-DD 00:00:00" format
      return `${dateStr} 00:00:00`;
    };

    return {
      // Core identifiers / required data
      name: data.so_number || "",
      so_number: data.so_number || "",
      client_id: data.client_id || null,
      vessel_id: data.vessel_id || null,
      destination_id: data.destination_id || null,
      // Status and meta
      done: data.done ? "done" : "draft",
      pic: data.pic || "",
      // Backend expects empty string when no quotation is linked
      quotation_id:
        data.quotation_id === null || data.quotation_id === undefined
          ? ""
          : data.quotation_id,
      eta_date: toDateTime(data.eta_date),
      date_order: toDateTime(data.date_created || data.date_order),
      deadline_info: data.deadline_info || "",
      est_to_usd: toNumber(data.est_to_usd),
      est_profit_usd: toNumber(data.est_profit_usd),
      internal_remark: data.internal_remark || "",
      client_remark: data.client_remark || "",
    };
  };

  const handleFormSubmit = async () => {
    const hasSoNumber = formData?.so_number && formData.so_number.trim() !== "";
    const hasClient = !!formData?.client_id;
    const hasVessel = !!formData?.vessel_id;

    if (!formData || !hasSoNumber || !hasClient || !hasVessel) {
      toast({
        title: "Missing details",
        description: "SO number, client, and vessel are required.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSaving(true);

      if (editingOrder) {
        const payload = buildPayloadFromForm(formData);
        await updateShippingOrder(editingOrder.id, payload, editingOrder._raw || {});
        toast({
          title: "SO updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        const payload = buildPayloadFromForm(formData);
        await createShippingOrder(payload);
        toast({
          title: "SO created",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }

      await fetchOrders();
      handleFormClose();
    } catch (error) {
      console.error("Failed to save shipping order", error);
      toast({
        title: "Save failed",
        description: error.message || "Unable to save shipping order",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getSoNumber = (order) => {
    if (order.so_number) return order.so_number;
    return order.id ? `SO-${order.id}` : "-";
  };

  const getEtaDisplay = (order) => {
    const eta = order.eta_date ? formatDate(order.eta_date) : null;
    const nextAction = order.next_action;
    if (eta && nextAction) return `${eta} • ${nextAction}`;
    if (eta) return eta;
    if (nextAction) return nextAction;
    return "-";
  };

  const renderTableBody = () => {
    if (isLoading && orders.length === 0) {
      return (
        <Tr>
          <Td colSpan={16}>
            <Center py="10">
              <Spinner size="lg" color="blue.500" />
            </Center>
          </Td>
        </Tr>
      );
    }

    if (filteredOrders.length === 0) {
      return (
        <Tr>
          <Td colSpan={16}>
            <Center py="10">
              <Text color={tableTextColor}>No SO records match your filters.</Text>
            </Center>
          </Td>
        </Tr>
      );
    }

    return filteredOrders.map((order) => (
      <Tr key={order.id || order.so_number}>
        <Td>{getSoNumber(order)}</Td>
        <Td>{formatDate(order.date_order || order.create_date)}</Td>
        <Td>
          <Badge colorScheme={order.done ? "green" : "orange"}>
            {order.done ? "Active" : "Pending POD"}
          </Badge>
        </Td>
        <Td>{order.pic || "-"}</Td>
        <Td>{order.client || "-"}</Td>
        <Td>{order.vessel_name || "-"}</Td>
        <Td>{order.destination || "-"}</Td>
        <Td>{getEtaDisplay(order)}</Td>
        <Td>{order.deadline_info || "-"}</Td>
        <Td>{formatCurrency(order.est_to_usd)}</Td>
        <Td>{formatCurrency(order.est_profit_usd)}</Td>
        <Td maxW="200px">
          <Text noOfLines={2}>{order.internal_remark || "-"}</Text>
        </Td>
        <Td maxW="200px">
          <Text noOfLines={2}>{order.client_remark || "-"}</Text>
        </Td>
        <Td>{order.quotation || "-"}</Td>
        <Td>{formatDateTime(order.timestamp || order.date_created)}</Td>
        <Td>
          <HStack spacing="2">
            <IconButton
              size="sm"
              aria-label="Edit SO"
              icon={<Icon as={MdEdit} />}
              variant="ghost"
              onClick={() => handleEdit(order)}
            />
            <IconButton
              size="sm"
              aria-label="Delete SO"
              icon={<Icon as={MdDelete} />}
              variant="ghost"
              colorScheme="red"
              onClick={() => handleDeleteRequest(order)}
            />
          </HStack>
        </Td>
      </Tr>
    ));
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb="4" flexWrap="wrap" gap="3">
        <Text fontSize="lg" fontWeight="700" color={textColor}>
          SO Number Tracker
        </Text>
        <HStack spacing="3">
          <InputGroup maxW="260px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color={placeholderColor} />
            </InputLeftElement>
            <Input
              placeholder="Search SO, client, vessel..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              bg={inputBg}
              color={inputText}
              borderColor={borderColor}
              size="sm"
            />
          </InputGroup>
          <IconButton
            size="sm"
            icon={<Icon as={MdRefresh} />}
            aria-label="Refresh SO data"
            onClick={handleRefresh}
            isLoading={isLoading}
            variant="outline"
          />
          <Button
            size="sm"
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            onClick={handleCreate}
            px={6}
          >
            New SO
          </Button>
        </HStack>
      </Flex>

      <Box
        border="1px"
        borderColor={borderColor}
        borderRadius="12px"
        overflowX="auto"
      >
        <Table size="sm" variant="simple" minW="1400px">
          <Thead bg={tableHeaderBg}>
            <Tr>
              {[
                "SO Number",
                "Date Created",
                "Done",
                "Person in Charge",
                "Client",
                "Vessel Name",
                "Destination",
                "Next Action / ETA",
                "Deadline",
                "EstTO USD",
                "EstProfit USD",
                "Internal Remark",
                "Client Remark",
                "Quotation",
                "SOCreateDate Timestamp",
                "Actions",
              ].map((label) => (
                <Th
                  key={label}
                  borderRight="1px"
                  borderColor={tableBorderColor}
                  color={tableTextColor}
                  fontSize="11px"
                  textTransform="uppercase"
                  fontWeight="600"
                  py="10px"
                  px="12px"
                  minW="130px"
                >
                  {label}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>{renderTableBody()}</Tbody>
        </Table>
      </Box>

      <Modal isOpen={formDisclosure.isOpen} onClose={handleFormClose} size="4xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingOrder ? "Edit SO" : "Create SO"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {formData && (
              <VStack spacing="4" align="stretch">
                <Flex gap="4" flexWrap="wrap">
                  <FormControl isRequired flex="1">
                    <FormLabel>SO Number</FormLabel>
                    <Input
                      value={formData.so_number}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, so_number: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>Date Created</FormLabel>
                    <Input
                      type="date"
                      value={formData.date_created || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, date_created: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>Done</FormLabel>
                    <Select
                      size="sm"
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                      value={formData.done ? "active" : "pending_pod"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          done: e.target.value === "active",
                        }))
                      }
                    >
                      <option value="active">Active</option>
                      <option value="pending_pod">Pending POD</option>
                    </Select>
                  </FormControl>
                </Flex>

                <Flex gap="4" flexWrap="wrap">
                  <FormControl flex="1">
                    <FormLabel>Person in Charge</FormLabel>
                    <Input
                      value={formData.pic}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, pic: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1" isRequired>
                    <FormLabel>Client</FormLabel>
                    <SimpleSearchableSelect
                      value={formData.client_id}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, client_id: value }))
                      }
                      options={clients}
                      placeholder="Select client"
                      displayKey="name"
                      valueKey="id"
                      isLoading={isLoadingClients}
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl flex="1" isRequired>
                    <FormLabel>Vessel</FormLabel>
                    <SimpleSearchableSelect
                      value={formData.vessel_id}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, vessel_id: value }))
                      }
                      options={vessels}
                      placeholder="Select vessel"
                      displayKey="name"
                      valueKey="id"
                      isLoading={isLoadingVessels}
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                      size="sm"
                    />
                  </FormControl>
                </Flex>

                <Flex gap="4" flexWrap="wrap">
                  <FormControl flex="1">
                    <FormLabel>Destination</FormLabel>
                    <SimpleSearchableSelect
                      value={formData.destination_id}
                      onChange={(value) =>
                        setFormData((prev) => ({ ...prev, destination_id: value }))
                      }
                      options={destinations}
                      placeholder="Select destination"
                      displayKey="name"
                      valueKey="id"
                      isLoading={isLoadingDestinations}
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>Next Action</FormLabel>
                    <Input
                      value={formData.next_action}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, next_action: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>ETA</FormLabel>
                    <Input
                      type="date"
                      value={formData.eta_date || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, eta_date: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>Deadline / ETA text</FormLabel>
                    <Input
                      value={formData.deadline_info}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, deadline_info: e.target.value }))
                      }
                    />
                  </FormControl>
                </Flex>

                <Flex gap="4" flexWrap="wrap">
                  <FormControl flex="1">
                    <FormLabel>EstTO USD</FormLabel>
                    <Input
                      type="number"
                      value={formData.est_to_usd}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, est_to_usd: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>EstProfit USD</FormLabel>
                    <Input
                      type="number"
                      value={formData.est_profit_usd}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, est_profit_usd: e.target.value }))
                      }
                    />
                  </FormControl>
                </Flex>

                <FormControl>
                  <FormLabel>Internal Remark</FormLabel>
                  <Textarea
                    value={formData.internal_remark}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, internal_remark: e.target.value }))
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Client Remark</FormLabel>
                  <Textarea
                    value={formData.client_remark}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, client_remark: e.target.value }))
                    }
                  />
                </FormControl>

                <Flex gap="4" flexWrap="wrap">
                  <FormControl flex="1">
                    <FormLabel>Quotation</FormLabel>
                    <SimpleSearchableSelect
                      value={formData.quotation_id}
                      onChange={(value) =>
                        setFormData((prev) => {
                          const selected = quotations.find((q) => q.id === value);
                          return {
                            ...prev,
                            quotation_id: value,
                            quotation: selected ? selected.name : "",
                          };
                        })
                      }
                      options={quotations}
                      placeholder="Select quotation"
                      displayKey="name"
                      valueKey="id"
                      isLoading={isLoadingQuotations}
                      bg={inputBg}
                      color={inputText}
                      borderColor={borderColor}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl flex="1">
                    <FormLabel>SO Timestamp</FormLabel>
                    <Input
                      value={formData.timestamp}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, timestamp: e.target.value }))
                      }
                      placeholder="13/06/2025 12:44:22"
                    />
                  </FormControl>
                </Flex>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleFormClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleFormSubmit} isLoading={isSaving}>
              {editingOrder ? "Save Changes" : "Create SO"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={null}
        onClose={deleteDisclosure.onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete SO entry
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete {orderToDelete?.name || "this SO"}?
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={deleteDisclosure.onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default SoNumberTab;

