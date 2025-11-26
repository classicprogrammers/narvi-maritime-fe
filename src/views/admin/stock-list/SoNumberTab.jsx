import React, { useMemo, useState } from "react";
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
} from "@chakra-ui/react";
import {
  MdAdd,
  MdDelete,
  MdEdit,
  MdRefresh,
  MdSearch,
} from "react-icons/md";

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

const DUMMY_ORDERS = [
  {
    id: 1,
    so_number: "SO 2835",
    date_created: "2025-06-13",
    done: false,
    pic: "Igor",
    client: "INNOSPEC",
    vessel_name: "INVOICE MAY",
    destination: "INVOICE MAY DEST",
    next_action: "Pending PO to finalise invoice",
    eta_date: "2025-04-30",
    deadline_info: "30/04/2025",
    est_to_usd: 120000,
    est_profit_usd: 45000,
    internal_remark: "Accumulate SO for invoice purpose ex May deliveries",
    client_remark: "",
    quotation: "Q-2025-044",
    timestamp: "13/06/2025 12:44:22",
  },
  {
    id: 2,
    so_number: "SO 2840",
    date_created: "2025-06-18",
    done: true,
    pic: "Ainun",
    client: "ESSO",
    vessel_name: "MV LUMINOUS",
    destination: "SINGAPORE",
    next_action: "Finalize docs",
    eta_date: "2025-05-02",
    deadline_info: "02/05/2025",
    est_to_usd: 95000,
    est_profit_usd: 30000,
    internal_remark: "SO closed, awaiting payment",
    client_remark: "Thanks team!",
    quotation: "Q-2025-052",
    timestamp: "18/06/2025 09:12:05",
  },
];

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
  const [orders, setOrders] = useState(DUMMY_ORDERS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingOrder, setEditingOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [formData, setFormData] = useState(null);

  const formDisclosure = useDisclosure();
  const deleteDisclosure = useDisclosure();

  const resetForm = () => {
    setFormData({
      id: null,
      so_number: "",
      date_created: "",
      done: false,
      pic: "",
      client: "",
      vessel_name: "",
      destination: "",
      next_action: "",
      eta_date: "",
      deadline_info: "",
      est_to_usd: "",
      est_profit_usd: "",
      internal_remark: "",
      client_remark: "",
      quotation: "",
      timestamp: "",
    });
  };

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
      setOrders((prev) => prev.filter((order) => order.id !== orderToDelete.id));
      toast({
        title: "Order deleted",
        description: `${orderToDelete.so_number || "SO"} has been removed`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
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
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 600);
  };

  const handleFormSubmit = () => {
    if (!formData || !formData.so_number || !formData.client || !formData.vessel_name) {
      toast({
        title: "Missing details",
        description: "SO number, client, and vessel are required.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    if (editingOrder) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === editingOrder.id ? { ...formData, id: editingOrder.id } : order
        )
      );
      toast({
        title: "SO updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      setOrders((prev) => [{ ...formData, id: Date.now() }, ...prev]);
      toast({
        title: "SO created",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    }
    handleFormClose();
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
            {order.done ? "Done" : "Active"}
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
          />
          <Button
            size="sm"
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            onClick={handleCreate}
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
                  <FormControl display="flex" alignItems="center" flex="1">
                    <FormLabel mb="0">Done</FormLabel>
                    <Switch
                      isChecked={formData.done}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, done: e.target.checked }))
                      }
                    />
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
                    <Input
                      value={formData.client}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, client: e.target.value }))
                      }
                    />
                  </FormControl>
                  <FormControl flex="1" isRequired>
                    <FormLabel>Vessel</FormLabel>
                    <Input
                      value={formData.vessel_name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, vessel_name: e.target.value }))
                      }
                    />
                  </FormControl>
                </Flex>

                <Flex gap="4" flexWrap="wrap">
                  <FormControl flex="1">
                    <FormLabel>Destination</FormLabel>
                    <Input
                      value={formData.destination}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, destination: e.target.value }))
                      }
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
                    <Input
                      value={formData.quotation}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, quotation: e.target.value }))
                      }
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
            <Button colorScheme="blue" onClick={handleFormSubmit}>
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

