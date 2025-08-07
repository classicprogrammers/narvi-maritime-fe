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
  const [statusFilter, setStatusFilter] = useState("all");

  // Color mode values
  const textColor = useColorModeValue("gray.700", "white");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.700", "white");

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
              New Delivery Instruction
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Delivery Instructions
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage delivery instructions and logistics
              </Text>
            </VStack>
          </HStack>
          
          <HStack spacing={4}>
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.600">
                {deliveryInstructions.length} items
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
                isDisabled={currentPage === Math.ceil(deliveryInstructions.length / 10)}
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
                placeholder="Search delivery instructions..."
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
              <option value="delivered">Delivered</option>
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

        {/* Delivery Instructions Table */}
        <Box px="25px">
          <Table variant="unstyled" size="sm" minW="100%">
            <Thead bg="gray.100">
              <Tr>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                  <Checkbox
                    isChecked={selectedItems.length === deliveryInstructions.length}
                    isIndeterminate={selectedItems.length > 0 && selectedItems.length < deliveryInstructions.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Delivery Instruction Reference</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Vessel Name</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Job Number</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">SO Number</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Location</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Date Issued</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Delivery Deadline</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Status</Th>
                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {deliveryInstructions.map((item, index) => (
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
                      {item.deliveryInstructionRef}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.vesselName}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.jobNumber}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.soNumber}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.location}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.dateIssued}
                    </Text>
                  </Td>
                  <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                    <Text color={textColor} fontSize='sm'>
                      {item.deliveryDeadline}
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
                      <Tooltip label="View Delivery Instruction">
                        <IconButton
                          icon={<Icon as={MdVisibility} />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          aria-label="View delivery instruction"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewItem(item);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Edit Delivery Instruction">
                        <IconButton
                          icon={<Icon as={MdEdit} />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          aria-label="Edit delivery instruction"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditItem(item);
                          }}
                        />
                      </Tooltip>
                      <Tooltip label="Delete Delivery Instruction">
                        <IconButton
                          icon={<Icon as={MdDelete} />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          aria-label="Delete delivery instruction"
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
            Showing {deliveryInstructions.length} of {deliveryInstructions.length} results
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
              onClick={() => setCurrentPage(Math.min(Math.ceil(deliveryInstructions.length / 10), currentPage + 1))}
              isDisabled={currentPage === Math.ceil(deliveryInstructions.length / 10)}
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
