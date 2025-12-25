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
import picAPI from "../../../api/pic";
import countriesAPI from "../../../api/countries";
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
  const [pics, setPics] = useState([]);
  const [countries, setCountries] = useState([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingVessels, setIsLoadingVessels] = useState(false);
  const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(false);
  const [isLoadingPICs, setIsLoadingPICs] = useState(false);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);

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
    // Default DATE CREATED to today's date (YYYY-MM-DD) when creating a new SO
    const todayDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}`;

    setFormData({
      id: null,
      so_number: "",
      date_created: todayDate,
      // Default status when creating a new SO
      done: "pending_pod",
      pic_new: null,
      client: "",
      client_id: null,
      vessel_name: "",
      vessel_id: null,
      destination_type: "", // "port_country", "city_country", "airport_country", "country"
      destination: "", // text input for port name, city, airport, or country name
      country_id: null, // selected country ID
      destination_id: null, // legacy field, keep for backward compatibility
      eta_date: "",
      etb: "",
      etd: "",
      deadline_info: "",
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
    // Use original created date from API response (date_created or date_order), but
    // trim to YYYY-MM-DD for the date input in the form.
    const rawCreated = order.date_created || order.date_order || order.create_date;
    const createdDateOnly = rawCreated ? String(rawCreated).split(" ")[0] : "";

    return {
      id: order.id,
      so_number: order.so_number || order.name || (order.id ? `SO-${order.id}` : ""),
      date_created: createdDateOnly,
      // Keep backend value as-is if present, otherwise default to "pending_pod"
      done:
        typeof order.done === "string"
          ? order.done
          : order.done === true
            ? "active"
            : "pending_pod",
      pic_new: order.pic_new || order.pic_id || order.pic || null,
      pic_name: order.pic_name || order.pic || "",
      client: order.client || order.client_name || "",
      client_id: order.client_id || order.partner_id || null,
      vessel_name: order.vessel_name || order.vessel || "",
      vessel_id: order.vessel_id || null,
      destination_type: order.destination_type || "",
      destination: order.destination || order.destination_name || "",
      country_id: order.country_id || null,
      destination_id: order.destination_id || null, // legacy field
      eta_date: order.eta_date,
      etb: order.etb,
      etd: order.etd,
      deadline_info: order.deadline_info,
      internal_remark: order.internal_remark,
      client_remark: order.client_remark,
      quotation: order.quotation || order.quotation_name || order.quotation_oc_number || "",
      quotation_id: order.quotation_id && order.quotation_id !== false ? order.quotation_id : null,
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

  // Fetch PICs for Person in Charge field
  useEffect(() => {
    const fetchPICs = async () => {
      try {
        setIsLoadingPICs(true);
        const response = await picAPI.getPICs();

        // Handle API response format: { status: "success", count: 1, persons: [...] }
        let picList = [];
        if (response && response.persons && Array.isArray(response.persons)) {
          picList = response.persons;
        } else if (response.result && response.result.persons && Array.isArray(response.result.persons)) {
          picList = response.result.persons;
        } else if (Array.isArray(response)) {
          picList = response;
        }

        // Normalize PICs for the dropdown
        const normalizedPICs = picList.map((pic) => ({
          id: pic.id,
          name: pic.name || "",
        }));

        setPics(normalizedPICs);
      } catch (error) {
        console.error("Failed to fetch PICs for PIC field", error);
        setPics([]);
      } finally {
        setIsLoadingPICs(false);
      }
    };

    fetchPICs();
  }, []);

  // Fetch countries for destination country dropdown
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setIsLoadingCountries(true);
        const response = await countriesAPI.getCountries();

        // Normalize countries response
        const countriesList =
          Array.isArray(response?.countries) ? response.countries :
            Array.isArray(response?.result?.countries) ? response.result.countries :
              Array.isArray(response) ? response : [];

        const normalized = countriesList.map((c) => ({
          id: c.id,
          name: c.name || "",
          code: c.code || "",
        }));

        setCountries(normalized);
      } catch (error) {
        console.error("Failed to fetch countries for destination", error);
        setCountries([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };

    fetchCountries();
  }, []);

  // Helper functions to get names from IDs
  const getClientName = useCallback((clientId) => {
    if (!clientId) return "-";
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "-";
  }, [clients]);

  const getVesselName = useCallback((vesselId) => {
    if (!vesselId) return "-";
    const vessel = vessels.find((v) => v.id === vesselId);
    return vessel ? vessel.name : "-";
  }, [vessels]);

  const getDestinationName = useCallback((destinationId) => {
    if (!destinationId) return "-";
    const destination = destinations.find((d) => d.id === destinationId);
    return destination ? destination.name : "-";
  }, [destinations]);

  const getCountryName = useCallback((countryId) => {
    if (!countryId) return "-";
    const country = countries.find((c) => c.id === countryId);
    return country ? country.name : "-";
  }, [countries]);

  // Helper to format destination display for table
  const getDestinationDisplay = useCallback((order) => {
    if (order.destination_type && order.destination) {
      const countryName = order.country_id ? getCountryName(order.country_id) : "";
      if (order.destination_type === "country") {
        return order.destination;
      } else if (countryName && countryName !== "-") {
        return `${order.destination}, ${countryName}`;
      }
      return order.destination;
    }
    // Fallback to legacy destination_id
    if (order.destination_id) {
      return getDestinationName(order.destination_id);
    }
    return "-";
  }, [getCountryName, getDestinationName]);

  const getPICName = useCallback((picId) => {
    if (!picId) return "-";
    const pic = pics.find((p) => p.id === picId);
    return pic ? pic.name : "-";
  }, [pics]);

  const filteredOrders = useMemo(() => {
    if (!searchValue) return orders;
    const lowered = searchValue.toLowerCase();

    return orders.filter((order) => {
      const candidateValues = [
        order.so_number,
        getVesselName(order.vessel_id),
        getClientName(order.client_id),
        getDestinationDisplay(order),
        getPICName(order.pic_new) || order.pic_name,
        order.internal_remark,
        order.client_remark,
        order.deadline_info,
      ];

      return candidateValues.some((value) =>
        value ? value.toString().toLowerCase().includes(lowered) : false
      );
    });
  }, [orders, searchValue, getClientName, getVesselName, getDestinationDisplay, getPICName]);

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
      // Backend expects "YYYY-MM-DD 00:00:00" format (used for date_order & eta_date)
      return `${dateStr} 00:00:00`;
    };

    const toDateOnly = (dateStr) => {
      if (!dateStr) return null;
      // Backend expects "YYYY-MM-DD" format (date only, no time) for ETB / ETD
      // If dateStr already contains time, extract just the date part
      return dateStr.split(" ")[0];
    };

    return {
      // Core identifiers / required data
      // Note: so_number is auto-generated by backend for create, only include for update if needed
      ...(data.so_number && { name: data.so_number, so_number: data.so_number }),
      client_id: data.client_id || null,
      vessel_id: data.vessel_id || null,
      // Destination fields - new structure
      destination_type: data.destination_type || null,
      destination: data.destination || null,
      country_id: data.country_id || null,
      // Legacy field for backward compatibility (if needed)
      ...(data.destination_id && { destination_id: data.destination_id }),
      // Status and meta - send status as selected in UI; default already set in resetForm
      done: data.done || "pending_pod",
      pic_new: data.pic_new || null,
      // Backend expects empty string when no quotation is linked
      quotation_id:
        data.quotation_id === null || data.quotation_id === undefined
          ? ""
          : data.quotation_id,
      eta_date: toDateTime(data.eta_date),
      etb: data.etb && data.etb !== false ? toDateOnly(data.etb) : false,
      etd: data.etd && data.etd !== false ? toDateOnly(data.etd) : false,
      date_order: toDateTime(data.date_created || data.date_order),
      deadline_info: data.deadline_info || "",
      internal_remark: data.internal_remark || "",
      client_remark: data.client_remark || "",
    };
  };

  const handleFormSubmit = async () => {
    const hasClient = !!formData?.client_id;
    const hasVessel = !!formData?.vessel_id;

    if (!formData || !hasClient || !hasVessel) {
      toast({
        title: "Missing details",
        description: "Client and vessel are required.",
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
    return eta || "-";
  };

  const renderTableBody = () => {
    if (isLoading && orders.length === 0) {
      return (
        <Tr>
          <Td colSpan={18}>
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
          <Td colSpan={18}>
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
        <Td>{formatDateTime(order.create_date || order.date_created || order.date_order)}</Td>
        <Td>
          <Badge
            colorScheme={
              order.done === "active"
                ? "green"
                : order.done === "done"
                  ? "blue"
                  : order.done === "cancelled"
                    ? "red"
                    : order.done === "archive"
                      ? "gray"
                      : order.done === "ready_for_invoice"
                        ? "purple"
                        : "orange"
            }
          >
            {order.done === "pending_pod"
              ? "Pending POD"
              : order.done === "ready_for_invoice"
                ? "Ready for Invoice"
                : order.done === "done"
                  ? "Done"
                  : order.done === "cancelled"
                    ? "Cancelled"
                    : order.done === "archive"
                      ? "Archive"
                      : "Active"}
          </Badge>
        </Td>
        <Td>{getPICName(order.pic_new) || order.pic_name || "-"}</Td>
        <Td>{getClientName(order.client_id)}</Td>
        <Td>{getVesselName(order.vessel_id)}</Td>
        <Td>{getDestinationDisplay(order)}</Td>
        <Td>{getEtaDisplay(order)}</Td>
        <Td>{order.etb && order.etb !== false ? formatDate(order.etb) : "-"}</Td>
        <Td>{order.etd && order.etd !== false ? formatDate(order.etd) : "-"}</Td>
        <Td>{order.deadline_info || "-"}</Td>
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
                "ETA",
                "ETB",
                "ETD",
                "Deadline",
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
              <VStack spacing="6" align="stretch">
                {/* Basic Information */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    {editingOrder && (
                      <FormControl flex="1">
                        <FormLabel>SO Number</FormLabel>
                        <Input
                          value={formData.so_number || "-"}
                          isReadOnly
                          bg={useColorModeValue("gray.50", "gray.700")}
                          cursor="not-allowed"
                        />
                      </FormControl>
                    )}
                    <FormControl flex="1" minW="220px">
                      <FormLabel>Date Created</FormLabel>
                      <Input
                        type="date"
                        value={formData.date_created || ""}
                        isReadOnly={!!editingOrder}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, date_created: e.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="1" minW="220px">
                      <FormLabel>Done</FormLabel>
                      <Select
                        size="sm"
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        value={formData.done || "pending_pod"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            done: e.target.value,
                          }))
                        }
                      >
                        <option value="active">Active</option>
                        <option value="archive">Archive</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="done">Done</option>
                        <option value="pending_pod">Pending POD</option>
                        <option value="ready_for_invoice">Ready for Invoice</option>
                      </Select>
                    </FormControl>
                  </Flex>
                </Box>

                {/* Party & Vessel */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="220px">
                      <FormLabel>Person in Charge</FormLabel>
                      <SimpleSearchableSelect
                        value={formData.pic_new}
                        onChange={(value) =>
                          setFormData((prev) => ({ ...prev, pic_new: value }))
                        }
                        options={pics}
                        placeholder="Select person in charge"
                        displayKey="name"
                        valueKey="id"
                        isLoading={isLoadingPICs}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl flex="1" isRequired minW="260px">
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
                    <FormControl flex="1" isRequired minW="260px">
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
                  <Flex gap="4" flexWrap="wrap" mt="4">
                    <FormControl flex="1" minW="260px">
                      <FormLabel>Destination Type</FormLabel>
                      <Select
                        size="sm"
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        value={formData.destination_type || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            destination_type: e.target.value,
                            destination: "", // Clear destination when type changes
                            country_id: null, // Clear country when type changes
                          }))
                        }
                        placeholder="Select destination type"
                      >
                        <option value="port_country">Port Name + Country</option>
                        <option value="city_country">City + Country</option>
                        <option value="airport_country">Airport + Country</option>
                        <option value="country">Country</option>
                      </Select>
                    </FormControl>
                    {formData.destination_type && formData.destination_type !== "country" && (
                      <FormControl flex="1" minW="260px">
                        <FormLabel>
                          {formData.destination_type === "port_country"
                            ? "Port Name"
                            : formData.destination_type === "city_country"
                              ? "City"
                              : formData.destination_type === "airport_country"
                                ? "Airport"
                                : "Destination"}
                        </FormLabel>
                        <Input
                          size="sm"
                          bg={inputBg}
                          color={inputText}
                          borderColor={borderColor}
                          value={formData.destination || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, destination: e.target.value }))
                          }
                          placeholder={
                            formData.destination_type === "port_country"
                              ? "Enter port name"
                              : formData.destination_type === "city_country"
                                ? "Enter city name"
                                : formData.destination_type === "airport_country"
                                  ? "Enter airport name"
                                  : "Enter destination"
                          }
                        />
                      </FormControl>
                    )}
                    {formData.destination_type && (
                      <FormControl flex="1" minW="260px">
                        <FormLabel>Country</FormLabel>
                        <SimpleSearchableSelect
                          value={formData.country_id}
                          onChange={(value) => {
                            const selectedCountry = countries.find((c) => c.id === value);
                            setFormData((prev) => ({
                              ...prev,
                              country_id: value,
                              // If destination_type is "country", auto-fill destination with country name
                              ...(prev.destination_type === "country" && selectedCountry
                                ? { destination: selectedCountry.name }
                                : {}),
                            }));
                          }}
                          options={countries}
                          placeholder="Select country"
                          displayKey="name"
                          valueKey="id"
                          isLoading={isLoadingCountries}
                          bg={inputBg}
                          color={inputText}
                          borderColor={borderColor}
                          size="sm"
                        />
                      </FormControl>
                    )}
                  </Flex>
                </Box>

                {/* Schedule */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="180px">
                      <FormLabel>ETA</FormLabel>
                      <Input
                        type="date"
                        value={formData.eta_date || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, eta_date: e.target.value }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="1" minW="180px">
                      <FormLabel>ETB</FormLabel>
                      <Input
                        type="date"
                        value={formData.etb && formData.etb !== false ? (typeof formData.etb === 'string' ? formData.etb.split(' ')[0] : formData.etb) : ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, etb: e.target.value || false }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="1" minW="180px">
                      <FormLabel>ETD</FormLabel>
                      <Input
                        type="date"
                        value={formData.etd && formData.etd !== false ? (typeof formData.etd === 'string' ? formData.etd.split(' ')[0] : formData.etd) : ""}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, etd: e.target.value || false }))
                        }
                      />
                    </FormControl>
                    <FormControl flex="2" minW="260px">
                      <FormLabel>Deadline / ETA text</FormLabel>
                      <Input
                        value={formData.deadline_info}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, deadline_info: e.target.value }))
                        }
                      />
                    </FormControl>
                  </Flex>
                </Box>

                {/* Remarks */}
                <Box>
                  <FormControl mb="3">
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
                </Box>

                {/* Quotation & Timestamp */}
                <Box>
                  <Flex gap="4" flexWrap="wrap">
                    <FormControl flex="1" minW="260px" isDisabled>
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
                        // Temporarily disabled until quotation integration is finalized
                        isDisabled
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl flex="1" minW="260px">
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
                </Box>
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

