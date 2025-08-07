import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  IconButton,
  HStack,
  VStack,
  Badge,
  useColorModeValue,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  Textarea,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Tooltip,
} from "@chakra-ui/react";
import {
  MdSearch,
  MdAdd,
  MdSettings,
  MdFilterList,
  MdChevronLeft,
  MdChevronRight,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdDownload,
  MdPrint,
} from "react-icons/md";

export default function ShippingInstructions() {
  const history = useHistory();
  const toast = useToast();
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.700", "white");

  // Form state
  const [formData, setFormData] = useState({
    instructionRef: "",
    salesOrder: "",
    client: "",
    modeOfTransport: "",
    status: "Draft",
    shipmentType: "",
    jobNo: "",
    vessel: "",
    from: "",
    to: "",
    consigneeType: "",
    company: "",
    addressLine1: "",
    addressLine2: "",
    postcode: "",
    city: "",
  });

  // Load shipping instructions from localStorage
  const loadShippingInstructions = () => {
    const savedInstructions = JSON.parse(localStorage.getItem('shippingInstructions') || '[]');
    const sampleData = [
      {
        id: 1,
        instructionRef: "SIS/0001",
        salesOrder: "S00025",
        client: "Deco Addict",
        modeOfTransport: "Sea",
        status: "Draft",
        shipmentType: "Single",
        jobNo: "JOB001",
        vessel: "MV Ocean",
        from: "Shanghai",
        to: "Los Angeles",
        consigneeType: "Importer",
        company: "Deco Addict Ltd",
        addressLine1: "123 Main Street",
        addressLine2: "Suite 100",
        postcode: "90210",
        city: "Beverly Hills",
      },
      {
        id: 2,
        instructionRef: "SIS/0002",
        salesOrder: "S00026",
        client: "Global Trading Co",
        modeOfTransport: "Air",
        status: "Confirmed",
        shipmentType: "Express",
        jobNo: "JOB002",
        vessel: "",
        from: "Hong Kong",
        to: "New York",
        consigneeType: "Distributor",
        company: "Global Trading Co",
        addressLine1: "456 Business Ave",
        addressLine2: "Floor 5",
        postcode: "10001",
        city: "New York",
      },
    ];

    return savedInstructions.length > 0 ? savedInstructions : sampleData;
  };

  const [shippingInstructions, setShippingInstructions] = useState([]);

  // Load data on component mount
  useEffect(() => {
    setShippingInstructions(loadShippingInstructions());
  }, []);

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedItems(shippingInstructions.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId, isChecked) => {
    if (isChecked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Draft":
        return "gray";
      case "Confirmed":
        return "blue";
      case "In Transit":
        return "orange";
      case "Done":
        return "green";
      default:
        return "gray";
    }
  };

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      instructionRef: "",
      salesOrder: "",
      client: "",
      modeOfTransport: "",
      status: "Draft",
      shipmentType: "",
      jobNo: "",
      vessel: "",
      from: "",
      to: "",
      consigneeType: "",
      company: "",
      addressLine1: "",
      addressLine2: "",
      postcode: "",
      city: "",
    });
    setEditingItem(null);
  };

  // Button handlers
  const handleNewButton = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditItem = (item) => {
    setFormData(item);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleViewItem = (item) => {
    history.push(`/admin/forms/shipping-instruction/${item.id}`);
  };

  const handleDeleteItem = (item) => {
    setEditingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveShippingInstruction = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const newInstructions = [...shippingInstructions];
      
      if (editingItem) {
        // Update existing item
        const index = newInstructions.findIndex(item => item.id === editingItem.id);
        newInstructions[index] = { ...editingItem, ...formData };
        toast({
          title: "Shipping Instruction Updated",
          description: "The shipping instruction has been updated successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Add new item
        const newItem = {
          ...formData,
          id: Date.now(),
          createdAt: new Date().toISOString(),
        };
        newInstructions.push(newItem);
        toast({
          title: "Shipping Instruction Created",
          description: "A new shipping instruction has been created successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      
      setShippingInstructions(newInstructions);
      localStorage.setItem('shippingInstructions', JSON.stringify(newInstructions));
      setIsModalOpen(false);
      resetForm();
      setIsLoading(false);
    }, 1000);
  };

  const handleConfirmDelete = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const newInstructions = shippingInstructions.filter(item => item.id !== editingItem.id);
      setShippingInstructions(newInstructions);
      localStorage.setItem('shippingInstructions', JSON.stringify(newInstructions));
      
      toast({
        title: "Shipping Instruction Deleted",
        description: "The shipping instruction has been deleted successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      setIsDeleteDialogOpen(false);
      setEditingItem(null);
      setIsLoading(false);
    }, 1000);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < Math.ceil(shippingInstructions.length / 10)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSettingsClick = () => {
    toast({
      title: "Settings",
      description: "Settings panel opened! Configure your shipping instructions preferences.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleFilterClick = () => {
    toast({
      title: "Filter",
      description: "Filter panel opened! Filter your shipping instructions by various criteria.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length > 0) {
      const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.length} selected item(s)?`);
      if (confirmed) {
        const newInstructions = shippingInstructions.filter(item => !selectedItems.includes(item.id));
        setShippingInstructions(newInstructions);
        localStorage.setItem('shippingInstructions', JSON.stringify(newInstructions));
        setSelectedItems([]);
        
        toast({
          title: "Items Deleted",
          description: `${selectedItems.length} item(s) deleted successfully!`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      toast({
        title: "No Selection",
        description: "Please select items to delete.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleExportData = () => {
    toast({
      title: "Export Data",
      description: "Exporting shipping instructions data to CSV/Excel...",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleRefreshData = () => {
    setShippingInstructions(loadShippingInstructions());
    toast({
      title: "Data Refreshed",
      description: "Shipping instructions data refreshed!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <Flex justify="space-between" align="center" px="25px">
          <HStack spacing={4}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={handleNewButton}
            >
              New Shipping Instruction
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Shipping Instructions
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage shipping instructions and logistics
              </Text>
            </VStack>
          </HStack>
          
          <HStack spacing={4}>
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.600">
                {shippingInstructions.length} items
              </Text>
              <IconButton
                icon={<Icon as={MdChevronLeft} />}
                size="sm"
                variant="ghost"
                aria-label="Previous"
                isDisabled={currentPage === 1}
              />
              <IconButton
                icon={<Icon as={MdChevronRight} />}
                size="sm"
                variant="ghost"
                aria-label="Next"
                isDisabled={currentPage === Math.ceil(shippingInstructions.length / 10)}
              />
            </HStack>
            <HStack spacing={2}>
              <Tooltip label="Export">
                <IconButton
                  icon={<Icon as={MdDownload} />}
                  size="sm"
                  variant="ghost"
                  aria-label="Export"
                />
              </Tooltip>
              <Tooltip label="Print">
                <IconButton
                  icon={<Icon as={MdPrint} />}
                  size="sm"
                  variant="ghost"
                  aria-label="Print"
                />
              </Tooltip>
            </HStack>
          </HStack>
        </Flex>

        {/* Filter Section */}
        <Box px='25px' mb='20px'>
          <HStack spacing={4} flexWrap="wrap">
            <InputGroup w={{ base: "100%", md: "300px" }}>
              <InputLeftElement>
                <Icon as={MdSearch} color={searchIconColor} w='15px' h='15px' />
              </InputLeftElement>
              <Input
                variant='outline'
                fontSize='sm'
                bg={inputBg}
                color={inputText}
                fontWeight='500'
                _placeholder={{ color: "gray.400", fontSize: "14px" }}
                borderRadius="8px"
                placeholder="Search shipping instructions..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </InputGroup>

            <Select
              w={{ base: "100%", md: "200px" }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              bg={inputBg}
              color={inputText}
              borderRadius="8px"
              fontSize="sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="in-transit">In Transit</option>
              <option value="done">Done</option>
            </Select>

            <Button
              leftIcon={<Icon as={MdFilterList} />}
              variant="outline"
              size="sm"
              borderRadius="8px"
            >
              Filters
            </Button>
          </HStack>
        </Box>

        {/* Shipping Instructions Table */}
        <Box px="25px">
          <Table variant="unstyled" size="sm" minW="100%">
            <Thead bg="gray.100">
              <Tr>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                  <Checkbox
                    isChecked={selectedItems.length === shippingInstructions.length}
                    isIndeterminate={selectedItems.length > 0 && selectedItems.length < shippingInstructions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Instruction Reference</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Sales Order</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Client</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Mode of Transport</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Status</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {shippingInstructions.map((item, index) => (
                <Tr
                  key={item.id}
                  bg={index % 2 === 0 ? "white" : "gray.50"}
                  _hover={{ bg: hoverBg }}
                  borderBottom="1px"
                  borderColor="gray.200">
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Checkbox
                      isChecked={selectedItems.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                    />
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px" cursor="pointer" onClick={() => handleViewItem(item)}>
                    <Text color="blue.600" fontSize='sm' fontWeight='600'>
                      {item.instructionRef}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.salesOrder}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.client}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.modeOfTransport}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Badge
                      colorScheme={getStatusColor(item.status)}
                      variant="subtle"
                      fontSize="xs"
                      px="8px"
                      py="4px"
                      borderRadius="full">
                      {item.status}
                    </Badge>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <HStack spacing={2}>
                      <Tooltip label="View Shipping Instruction">
                        <IconButton
                          icon={<Icon as={MdVisibility} />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          aria-label="View shipping instruction"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewItem(item);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Edit Shipping Instruction">
                        <IconButton
                          icon={<Icon as={MdEdit} />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          aria-label="Edit shipping instruction"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Delete Shipping Instruction">
                        <IconButton
                          icon={<Icon as={MdDelete} />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          aria-label="Delete shipping instruction"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item);
                          }}
                        />
                      </Tooltip>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Pagination */}
        <Flex px='25px' justify='space-between' align='center' py='20px'>
          <Text fontSize='sm' color='gray.500'>
            Showing {shippingInstructions.length} of {shippingInstructions.length} results
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              isDisabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setCurrentPage(Math.min(Math.ceil(shippingInstructions.length / 10), currentPage + 1))}
              isDisabled={currentPage === Math.ceil(shippingInstructions.length / 10)}
              variant="outline"
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </VStack>

      {/* Add/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingItem ? "Edit Shipping Instruction" : "New Shipping Instruction"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Instruction Reference</FormLabel>
                  <Input
                    value={formData.instructionRef}
                    onChange={(e) => handleInputChange("instructionRef", e.target.value)}
                    placeholder="SIS/0001"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Sales Order</FormLabel>
                  <Input
                    value={formData.salesOrder}
                    onChange={(e) => handleInputChange("salesOrder", e.target.value)}
                    placeholder="S00025"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Client</FormLabel>
                  <Input
                    value={formData.client}
                    onChange={(e) => handleInputChange("client", e.target.value)}
                    placeholder="Client Name"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Mode of Transport</FormLabel>
                  <Select
                    value={formData.modeOfTransport}
                    onChange={(e) => handleInputChange("modeOfTransport", e.target.value)}
                    size="sm"
                  >
                    <option value="">Select Transport</option>
                    <option value="Sea">Sea</option>
                    <option value="Air">Air</option>
                    <option value="Land">Land</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Status</FormLabel>
                  <Select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    size="sm"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Done">Done</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Shipment Type</FormLabel>
                  <Select
                    value={formData.shipmentType}
                    onChange={(e) => handleInputChange("shipmentType", e.target.value)}
                    size="sm"
                  >
                    <option value="">Select Type</option>
                    <option value="Single">Single</option>
                    <option value="Express">Express</option>
                    <option value="Bulk">Bulk</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Job No</FormLabel>
                  <Input
                    value={formData.jobNo}
                    onChange={(e) => handleInputChange("jobNo", e.target.value)}
                    placeholder="JOB001"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Vessel</FormLabel>
                  <Input
                    value={formData.vessel}
                    onChange={(e) => handleInputChange("vessel", e.target.value)}
                    placeholder="MV Ocean"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">From</FormLabel>
                  <Input
                    value={formData.from}
                    onChange={(e) => handleInputChange("from", e.target.value)}
                    placeholder="Origin"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">To</FormLabel>
                  <Input
                    value={formData.to}
                    onChange={(e) => handleInputChange("to", e.target.value)}
                    placeholder="Destination"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Consignee Type</FormLabel>
                  <Select
                    value={formData.consigneeType}
                    onChange={(e) => handleInputChange("consigneeType", e.target.value)}
                    size="sm"
                  >
                    <option value="">Select Type</option>
                    <option value="Importer">Importer</option>
                    <option value="Distributor">Distributor</option>
                    <option value="Wholesaler">Wholesaler</option>
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Company</FormLabel>
                  <Input
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Company Name"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontSize="sm">Address Line 1</FormLabel>
                <Input
                  value={formData.addressLine1}
                  onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                  placeholder="Street Address"
                  size="sm"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Address Line 2</FormLabel>
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                  placeholder="Suite, Floor, etc."
                  size="sm"
                />
              </FormControl>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Postcode</FormLabel>
                  <Input
                    value={formData.postcode}
                    onChange={(e) => handleInputChange("postcode", e.target.value)}
                    placeholder="12345"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">City</FormLabel>
                  <Input
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="City Name"
                    size="sm"
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveShippingInstruction}
              isLoading={isLoading}
              loadingText="Saving..."
            >
              {editingItem ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Shipping Instruction
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the shipping instruction "{editingItem?.instructionRef}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmDelete}
                isLoading={isLoading}
                loadingText="Deleting..."
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
