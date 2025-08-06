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

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");

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
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
      {/* Main Content Area */}
      <Box bg="white" p={{ base: "4", md: "6" }}>
        {/* Top Section with New Button, Title, Search, and Pagination */}
        <Flex
          justify="space-between"
          align="center"
          mb="6"
          flexDir={{ base: "column", lg: "row" }}
          gap={{ base: "4", lg: "0" }}
        >
          <HStack spacing="4">
            <Button
              leftIcon={<Icon as={MdAdd} />}
              bg="#1c4a95"
              color="white"
              size="sm"
              px="6"
              py="3"
              borderRadius="md"
              _hover={{ bg: "#173f7c" }}
              onClick={handleNewButton}
            >
              New
            </Button>
            <HStack spacing="2">
              <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                Shipping Instructions
              </Text>
              <IconButton
                size="xs"
                icon={<Icon as={MdSettings} color={textColor} />}
                variant="ghost"
                aria-label="Settings"
                onClick={handleSettingsClick}
                _hover={{ bg: "gray.100" }}
              />
            </HStack>
          </HStack>

          {/* Search Bar */}
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              size="sm"
              bg="white"
              border="1px"
              borderColor="gray.300"
              borderRadius="md"
            />
          </InputGroup>

          {/* Pagination */}
          <HStack spacing="2">
            <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
              1-1/1
            </Text>
            <IconButton
              size="sm"
              icon={<Icon as={MdChevronLeft} color={textColor} />}
              variant="ghost"
              aria-label="Previous"
              onClick={handlePreviousPage}
              isDisabled={currentPage <= 1}
              _hover={{ bg: "gray.100" }}
            />
            <IconButton
              size="sm"
              icon={<Icon as={MdChevronRight} color={textColor} />}
              variant="ghost"
              aria-label="Next"
              onClick={handleNextPage}
              isDisabled={currentPage >= 1}
              _hover={{ bg: "gray.100" }}
            />
          </HStack>
        </Flex>

        {/* Shipping Instructions Table */}
        <Box overflowX="auto" maxW="100%">
          <Table variant="unstyled" size="sm" minW="1000px" border="1px" borderColor="gray.300">
            <Thead>
              <Tr bg="gray.100">
                <Th fontSize="xs" color="gray.600" textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300">
                  <Checkbox
                    isChecked={selectedItems.length === shippingInstructions.length}
                    isIndeterminate={selectedItems.length > 0 && selectedItems.length < shippingInstructions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    size="sm"
                  />
                </Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Instruction Reference</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Sales Order</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Client</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Mode of Transport</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Status</Th>
                <Th fontSize="xs" color="gray.600" textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300">Actions</Th>
                <Th fontSize="xs" color="gray.600" textAlign="center" py="3" px="3">
                  <IconButton
                    size="xs"
                    icon={<Icon as={MdFilterList} color="gray.500" />}
                    variant="ghost"
                    aria-label="Filter"
                    onClick={handleFilterClick}
                    _hover={{ bg: "gray.200" }}
                  />
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {shippingInstructions.map((item, index) => (
                <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"} _hover={{ bg: "blue.50" }}>
                  <Td textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    <Checkbox
                      isChecked={selectedItems.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      size="sm"
                    />
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px" cursor="pointer" onClick={() => handleViewItem(item)}>
                    <Text fontWeight="medium" color="#1c4a95">{item.instructionRef}</Text>
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.salesOrder}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.client}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.modeOfTransport}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    <Badge colorScheme={getStatusColor(item.status)} size="sm">
                      {item.status}
                    </Badge>
                  </Td>
                  <Td textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    <HStack spacing={1} justify="center">
                      <IconButton
                        size="xs"
                        icon={<Icon as={MdVisibility} />}
                        colorScheme="blue"
                        variant="ghost"
                        aria-label="View"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewItem(item);
                        }}
                        _hover={{ bg: "blue.100" }}
                      />
                      <IconButton
                        size="xs"
                        icon={<Icon as={MdEdit} />}
                        colorScheme="green"
                        variant="ghost"
                        aria-label="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditItem(item);
                        }}
                        _hover={{ bg: "green.100" }}
                      />
                      <IconButton
                        size="xs"
                        icon={<Icon as={MdDelete} />}
                        colorScheme="red"
                        variant="ghost"
                        aria-label="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item);
                        }}
                        _hover={{ bg: "red.100" }}
                      />
                    </HStack>
                  </Td>
                  <Td py="3" px="3" borderBottom="1px">
                    {/* Empty cell for filter icon column */}
                  </Td>
                </Tr>
              ))}
              {/* Empty rows for visual spacing */}
              {[...Array(Math.max(0, 8 - shippingInstructions.length))].map((_, index) => (
                <Tr key={`empty-${index}`} bg={index % 2 === 0 ? "white" : "gray.50"}>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderBottom="1px"></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Action Buttons */}
        <HStack spacing="4" mt="6" justify="space-between">
          <HStack spacing="3">
            <Button
              size="sm"
              colorScheme="red"
              variant="outline"
              onClick={handleDeleteSelected}
              isDisabled={selectedItems.length === 0}
            >
              Delete Selected ({selectedItems.length})
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              onClick={handleExportData}
            >
              Export Data
            </Button>
            <Button
              size="sm"
              colorScheme="green"
              variant="outline"
              onClick={handleRefreshData}
            >
              Refresh
            </Button>
          </HStack>

          <Text fontSize="sm" color="gray.500">
            {selectedItems.length} item(s) selected
          </Text>
        </HStack>
      </Box>

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
