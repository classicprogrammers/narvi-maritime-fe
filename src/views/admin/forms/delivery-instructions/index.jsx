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

export default function DeliveryInstructions() {
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
    deliveryInstructionRef: "",
    vesselName: "",
    jobNumber: "",
    soNumber: "",
    location: "",
    dateIssued: "",
    deliveryDeadline: "",
    status: "Draft",
    consigneeName: "",
    consigneeAddress: "",
    specialInstructions: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
  });

  // Load delivery instructions from localStorage
  const loadDeliveryInstructions = () => {
    const savedInstructions = JSON.parse(localStorage.getItem('deliveryInstructions') || '[]');
    const sampleData = [
      {
        id: 1,
        deliveryInstructionRef: "DIS/00001",
        vesselName: "Ajx",
        jobNumber: "JOB001",
        soNumber: "SO001",
        location: "Port of Los Angeles",
        dateIssued: "2024-01-15",
        deliveryDeadline: "2024-01-30",
        status: "Draft",
        consigneeName: "Global Trading Co",
        consigneeAddress: "123 Harbor Drive, Los Angeles, CA 90210",
        specialInstructions: "Handle with care - fragile items",
        contactPerson: "John Smith",
        contactPhone: "+1-555-0123",
        contactEmail: "john.smith@globaltrading.com",
      },
      {
        id: 2,
        deliveryInstructionRef: "DIS/00002",
        vesselName: "Ocean Star",
        jobNumber: "JOB002",
        soNumber: "SO002",
        location: "Port of New York",
        dateIssued: "2024-01-20",
        deliveryDeadline: "2024-02-05",
        status: "Confirmed",
        consigneeName: "Maritime Logistics Inc",
        consigneeAddress: "456 Dock Street, New York, NY 10001",
        specialInstructions: "Temperature controlled storage required",
        contactPerson: "Sarah Johnson",
        contactPhone: "+1-555-0456",
        contactEmail: "sarah.johnson@maritimelogistics.com",
      },
    ];

    return savedInstructions.length > 0 ? savedInstructions : sampleData;
  };

  const [deliveryInstructions, setDeliveryInstructions] = useState([]);

  // Load data on component mount
  useEffect(() => {
    setDeliveryInstructions(loadDeliveryInstructions());
  }, []);

  const handleSelectAll = (isChecked) => {
    if (isChecked) {
      setSelectedItems(deliveryInstructions.map((item) => item.id));
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
      case "Delivered":
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
      deliveryInstructionRef: "",
      vesselName: "",
      jobNumber: "",
      soNumber: "",
      location: "",
      dateIssued: "",
      deliveryDeadline: "",
      status: "Draft",
      consigneeName: "",
      consigneeAddress: "",
      specialInstructions: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
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
    history.push(`/admin/forms/delivery-instruction/${item.id}`);
  };

  const handleDeleteItem = (item) => {
    setEditingItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveDeliveryInstruction = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const newInstructions = [...deliveryInstructions];
      
      if (editingItem) {
        // Update existing item
        const index = newInstructions.findIndex(item => item.id === editingItem.id);
        newInstructions[index] = { ...editingItem, ...formData };
        toast({
          title: "Delivery Instruction Updated",
          description: "The delivery instruction has been updated successfully.",
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
          title: "Delivery Instruction Created",
          description: "A new delivery instruction has been created successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      
      setDeliveryInstructions(newInstructions);
      localStorage.setItem('deliveryInstructions', JSON.stringify(newInstructions));
      setIsModalOpen(false);
      resetForm();
      setIsLoading(false);
    }, 1000);
  };

  const handleConfirmDelete = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const newInstructions = deliveryInstructions.filter(item => item.id !== editingItem.id);
      setDeliveryInstructions(newInstructions);
      localStorage.setItem('deliveryInstructions', JSON.stringify(newInstructions));
      
      toast({
        title: "Delivery Instruction Deleted",
        description: "The delivery instruction has been deleted successfully.",
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
    if (currentPage < Math.ceil(deliveryInstructions.length / 10)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSettingsClick = () => {
    toast({
      title: "Settings",
      description: "Settings panel opened! Configure your delivery instructions preferences.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleFilterClick = () => {
    toast({
      title: "Filter",
      description: "Filter panel opened! Filter your delivery instructions by various criteria.",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length > 0) {
      const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.length} selected item(s)?`);
      if (confirmed) {
        const newInstructions = deliveryInstructions.filter(item => !selectedItems.includes(item.id));
        setDeliveryInstructions(newInstructions);
        localStorage.setItem('deliveryInstructions', JSON.stringify(newInstructions));
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
      description: "Exporting delivery instructions data to CSV/Excel...",
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleRefreshData = () => {
    setDeliveryInstructions(loadDeliveryInstructions());
    toast({
      title: "Data Refreshed",
      description: "Delivery instructions data refreshed!",
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
                Delivery Instructions
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

        {/* Delivery Instructions Table */}
        <Box overflowX="auto" maxW="100%">
          <Table variant="unstyled" size="sm" minW="1000px" border="1px" borderColor="gray.300">
            <Thead>
              <Tr bg="gray.100">
                <Th fontSize="xs" color="gray.600" textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300">
                  <Checkbox
                    isChecked={selectedItems.length === deliveryInstructions.length}
                    isIndeterminate={selectedItems.length > 0 && selectedItems.length < deliveryInstructions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    size="sm"
                  />
                </Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Delivery Instruction Reference</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Vessel Name</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Job Number</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">SO Number</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Location</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Date Issued</Th>
                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Delivery Deadline</Th>
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
              {deliveryInstructions.map((item, index) => (
                <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"} _hover={{ bg: "blue.50" }}>
                  <Td textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    <Checkbox
                      isChecked={selectedItems.includes(item.id)}
                      onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                      size="sm"
                    />
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px" cursor="pointer" onClick={() => handleViewItem(item)}>
                    <Text fontWeight="medium" color="#1c4a95">{item.deliveryInstructionRef}</Text>
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.vesselName}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.jobNumber}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.soNumber}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.location}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.dateIssued}
                  </Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                    {item.deliveryDeadline}
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
              {[...Array(Math.max(0, 8 - deliveryInstructions.length))].map((_, index) => (
                <Tr key={`empty-${index}`} bg={index % 2 === 0 ? "white" : "gray.50"}>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                  <Td py="3" px="3" borderBottom="1px"></Td>
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
            {editingItem ? "Edit Delivery Instruction" : "New Delivery Instruction"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Delivery Instruction Reference</FormLabel>
                  <Input
                    value={formData.deliveryInstructionRef}
                    onChange={(e) => handleInputChange("deliveryInstructionRef", e.target.value)}
                    placeholder="DIS/00001"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Vessel Name</FormLabel>
                  <Input
                    value={formData.vesselName}
                    onChange={(e) => handleInputChange("vesselName", e.target.value)}
                    placeholder="Vessel Name"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Job Number</FormLabel>
                  <Input
                    value={formData.jobNumber}
                    onChange={(e) => handleInputChange("jobNumber", e.target.value)}
                    placeholder="JOB001"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">SO Number</FormLabel>
                  <Input
                    value={formData.soNumber}
                    onChange={(e) => handleInputChange("soNumber", e.target.value)}
                    placeholder="SO001"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Location</FormLabel>
                  <Input
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Port of Los Angeles"
                    size="sm"
                  />
                </FormControl>
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
                    <option value="Delivered">Delivered</option>
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Date Issued</FormLabel>
                  <Input
                    type="date"
                    value={formData.dateIssued}
                    onChange={(e) => handleInputChange("dateIssued", e.target.value)}
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Delivery Deadline</FormLabel>
                  <Input
                    type="date"
                    value={formData.deliveryDeadline}
                    onChange={(e) => handleInputChange("deliveryDeadline", e.target.value)}
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Consignee Name</FormLabel>
                  <Input
                    value={formData.consigneeName}
                    onChange={(e) => handleInputChange("consigneeName", e.target.value)}
                    placeholder="Consignee Name"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Contact Person</FormLabel>
                  <Input
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                    placeholder="Contact Person"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <HStack spacing={4} w="100%">
                <FormControl>
                  <FormLabel fontSize="sm">Contact Phone</FormLabel>
                  <Input
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                    placeholder="+1-555-0123"
                    size="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Contact Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                    placeholder="contact@example.com"
                    size="sm"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontSize="sm">Consignee Address</FormLabel>
                <Textarea
                  value={formData.consigneeAddress}
                  onChange={(e) => handleInputChange("consigneeAddress", e.target.value)}
                  placeholder="Full address"
                  size="sm"
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm">Special Instructions</FormLabel>
                <Textarea
                  value={formData.specialInstructions}
                  onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                  placeholder="Any special handling instructions"
                  size="sm"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveDeliveryInstruction}
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
              Delete Delivery Instruction
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete the delivery instruction "{editingItem?.deliveryInstructionRef}"? This action cannot be undone.
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
