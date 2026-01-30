import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  HStack,
  VStack,
  IconButton,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  useToast,
  Tooltip,
  Select,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdDirectionsBoat,
  MdVisibility,
  MdPrint,
  MdClear,
} from "react-icons/md";
import { CloseIcon } from "@chakra-ui/icons";
import { List, ListItem } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import vesselsAPI from "../../../api/vessels";
import { refreshMasterData, MASTER_KEYS } from "../../../utils/masterDataCache";

import { getCustomersApi } from "../../../api/customer";
import SearchableSelect from "../../../components/forms/SearchableSelect";

export default function Vessels() {
  const history = useHistory();
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search state
  const [searchValue, setSearchValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("desc");
  
  const [editingVessel, setEditingVessel] = useState(null);
  const [deleteVesselId, setDeleteVesselId] = useState(null);


  // API data state

  const [customers, setCustomers] = useState([]);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const toast = useToast();

  const textColor = useColorModeValue("gray.700", "white");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.700", "white");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    status: "active",
    imo: "",
    vessel_type: "",
    attachments: [],
    // For updates: IDs of existing attachments the user removed
    attachment_to_delete: [],
  });

  const [previewFile, setPreviewFile] = useState(null);

  const handleView = (file) => {
    let fileUrl = null;

    // ✅ Case 1: actual uploaded file
    if (file instanceof File || file instanceof Blob) {
      fileUrl = URL.createObjectURL(file);
    }

    // ✅ Case 2: backend URL
    else if (file.url) {
      fileUrl = file.url;
    }

    // ✅ Case 3: base64 data (like your case)
    else if (file.datas) {
      const mimeType = file.mimetype || "application/octet-stream";
      fileUrl = `data:${mimeType};base64,${file.datas}`;
    }

    // ✅ Case 4: fallback path
    else if (file.path) {
      fileUrl = file.path;
    }

    const fileType =
      file.mimetype ||
      file.type ||
      file.filename?.split(".").pop() ||
      "application/octet-stream";

    if (fileUrl) {
      setPreviewFile({ ...file, fileUrl, fileType });
    } else {
      console.warn("⚠️ No valid file URL found for preview:", file);
    }
  };


  // Fetch vessels with pagination and search
  const fetchVessels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await vesselsAPI.getVessels({
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
        search: searchQuery,
      });
      if (response.vessels && Array.isArray(response.vessels)) {
        setVessels(response.vessels);
        setTotalCount(response.total_count || 0);
        setTotalPages(response.total_pages || 0);
        setHasNext(response.has_next || false);
        setHasPrevious(response.has_previous || false);
      } else {
        setVessels([]);
        setTotalCount(0);
        setTotalPages(0);
        setHasNext(false);
        setHasPrevious(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch vessels: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setVessels([]);
      setTotalCount(0);
      setTotalPages(0);
      setHasNext(false);
      setHasPrevious(false);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, toast]);

  // Fetch API data for dropdowns (customers only)
  const fetchApiData = useCallback(async () => {
    try {
      setIsLoadingApiData(true);
      const customersResponse = await getCustomersApi();
      const customersData = customersResponse.customers || customersResponse;
      setCustomers(Array.isArray(customersData) ? customersData : []);

    } catch (error) {
      console.error("Error fetching API data:", error);
      toast({
        title: "Warning",
        description: "Some dropdown data could not be loaded",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingApiData(false);
    }
  }, [toast]);

  // Load vessels and API data on component mount
  useEffect(() => {
    fetchVessels();
    fetchApiData();
  }, [fetchVessels, fetchApiData]);

  // Reset to first page when page size or search changes
  useEffect(() => {
    setPage(1);
  }, [pageSize, searchQuery]);

  // Handle search button click
  const handleSearch = () => {
    setSearchQuery(searchValue.trim());
    setPage(1); // Reset to first page when searching
  };

  // Handle Enter key in search input
  const handleSearchKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchValue("");
    setSearchQuery("");
    setPage(1);
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      client_id: "",
      status: "active",
      imo: "",
      vessel_type: "",
      attachments: [],
      attachment_to_delete: [],
    });
    setEditingVessel(null);
    setPreviewFile(null);
  };


  // Open modal for creating new vessel
  const handleNewVessel = () => {
    resetForm();
    onModalOpen();
  };

  // // Open modal for editing vessel
  const handleEditVessel = async (vessel) => {
    try {
      setIsLoading(true);
      onModalOpen();
      // Fetch vessel data from the singular vessel API
      const vesselData = await vesselsAPI.getVessel(vessel.id);

      // Extract vessel data from response (handle different response structures)
      const vesselInfo = vesselData.vessel || vesselData.result?.vessel || vesselData;

      setFormData({
        name: vesselInfo.name || "",
        client_id: vesselInfo.client_id || "",
        status: vesselInfo.status || "active",
        imo: vesselInfo.imo || "",
        vessel_type: vesselInfo.vessel_type || "",
        attachments: vesselInfo.attachments || [],
        // Start with nothing marked for deletion
        attachment_to_delete: [],
      });
      setEditingVessel({ ...vessel, ...vesselInfo });

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load vessel data: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      // Validate vessel form
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Vessel name is required",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      if (!formData.client_id) {
        toast({
          title: "Error",
          description: "Client ID is required",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // No vessel lines validation needed in simplified structure

      setIsLoading(true);

      // Use the form data as is - only include vessel lines that user has actually added
      let finalFormData = { ...formData, vessel_id: editingVessel?.id };

      if (editingVessel) {
        console.log('worded');
        // Update existing vessel - pass original vessel data to only send changed fields
        const response = await vesselsAPI.updateVessel(finalFormData, null, editingVessel);

        // Extract success message from API response
        let successMessage = "Vessel updated successfully";
        let status = "success";

        if (response && response.result) {
          if (response.result && response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          } else if (response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          }
        }

        toast({
          title: status,
          description: successMessage,
          status: status,
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new vessel
        const response = await vesselsAPI.createVessel(finalFormData);

        // Extract success message from API response
        let successMessage = "Vessel created successfully";
        let status = "success";

        if (response && response.result) {
          if (response.result && response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          } else if (response.result.message) {
            successMessage = response.result.message;
            status = response.result.status;
          }
        }

        toast({
          title: status,
          description: successMessage,
          status: status,
          duration: 3000,
          isClosable: true,
        });
      }

      onModalClose();
      resetForm();
      fetchVessels();
      refreshMasterData(MASTER_KEYS.VESSELS).catch(() => {});
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingVessel ? 'update' : 'create'} vessel`;
      let status = "error";

      if (error.response && error.response.data) {
        if (error.response.data.result && error.response.data.result.message) {
          errorMessage = error.response.data.result.message;
          status = error.response.data.result.status;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
          status = error.response.data.result.status;
        }
      } else if (error.message) {
        errorMessage = error.message;
        status = "error";
      }

      toast({
        title: status,
        description: errorMessage,
        status: status,
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete vessel
  const handleDeleteVessel = (vessel) => {
    setDeleteVesselId(vessel.id);
    onDeleteOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setIsLoading(true);

      const response = await vesselsAPI.deleteVessel(deleteVesselId);

      // ✅ Extract message from API
      const message = response?.result?.message || "Vessel deleted successfully";

      // ✅ Show success toast
      toast({
        title: "Success",
        description: message,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onDeleteClose();
      setDeleteVesselId(null);
      fetchVessels();
      refreshMasterData(MASTER_KEYS.VESSELS).catch(() => {});
    } catch (error) {
      // ✅ Extract and show error toast
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.result?.message ||
        error.message ||
        "Failed to delete vessel";

      toast({
        title: "Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
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
              onClick={handleNewVessel}
            >
              New Vessel
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="blue.600">
                Vessels
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage vessel information
              </Text>
            </VStack>
          </HStack>
        </Flex>

        {/* Search Section */}
        <Box px="25px">
          <Flex gap={2} align="center">
            <InputGroup flex={1} maxW={{ base: "100%", md: "500px" }}>
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color={searchIconColor} w="15px" h="15px" />
              </InputLeftElement>
              <Input
                variant="outline"
                fontSize="sm"
                bg={inputBg}
                color={inputText}
                fontWeight="500"
                _placeholder={{ color: "gray.400", fontSize: "14px" }}
                borderRadius="8px"
                placeholder="Search by vessel name or IMO..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={handleSearchKeyPress}
              />
              {searchValue && (
                <InputRightElement>
                  <IconButton
                    aria-label="Clear search"
                    icon={<MdClear />}
                    size="sm"
                    variant="ghost"
                    onClick={handleClearSearch}
                    h="1.75rem"
                    w="1.75rem"
                  />
                </InputRightElement>
              )}
            </InputGroup>
            <Button
              leftIcon={<MdSearch />}
              colorScheme="blue"
              onClick={handleSearch}
              isLoading={isLoading}
              size="sm"
            >
              Search
            </Button>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
                size="sm"
              >
                Clear
              </Button>
            )}
          </Flex>
        </Box>

        {/* Vessels Table */}
        <Box px="25px">
          <Box
            maxH="600px"
            overflowY="auto"
            border="1px"
            borderColor="gray.200"
            borderRadius="8px"
            sx={{
              '&::-webkit-scrollbar': {
                width: '8px',
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'gray.100',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'gray.300',
                borderRadius: '4px',
                '&:hover': {
                  background: 'gray.400',
                },
              },
            }}
          >
            <Table variant="unstyled" size="sm">
              <Thead bg="gray.100" position="sticky" top="0" zIndex="1">
                <Tr>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Vessel
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Client (Customer)
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Vessel Type
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    IMO
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Status
                  </Th>
                  {/* <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Attachments
                  </Th> */}
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  <Tr>
                    <Td colSpan={6} py="40px" textAlign="center">
                      <Spinner size="lg" />
                    </Td>
                  </Tr>
                ) : vessels.length > 0 ? (
                  vessels.map((vessel, index) => {
                    // Get attachments information
                    const attachments = vessel.attachments || [];

                    return (
                      <Tr
                        key={vessel.id}
                        bg={index % 2 === 0 ? "white" : "gray.50"}
                        _hover={{ bg: hoverBg }}
                        borderBottom="1px"
                        borderColor="gray.200"
                      >
                        <Td py="12px" px="16px" style={{ width: "150px" }}>
                          <HStack spacing={2}>
                            <Icon as={MdDirectionsBoat} color="blue.500" w="16px" h="16px" />
                            <Text color={textColor} fontSize="sm" fontWeight="500">
                              {vessel.name || "-"}
                            </Text>
                          </HStack>
                        </Td>
                        <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {(() => {
                              const customer = customers.find(c => c.id === vessel.client_id);
                              return customer ? (customer.name || customer.company_name || `Customer ${customer.id}`) : (vessel.client_id || "-");
                            })()}
                          </Text>
                        </Td>
                        <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {vessel.vessel_type || "-"}
                          </Text>
                        </Td>
                        <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {vessel.imo || "-"}
                          </Text>
                        </Td>
                        <Td py="12px" px="16px">
                          <Badge
                            colorScheme={
                              vessel.status === "active" ? "green" :
                                vessel.status === "inactive" ? "red" :
                                  vessel.status === "tbn" ? "yellow" :
                                    vessel.status === "new_building" ? "green" : "gray"
                            }
                            size="sm"
                            textTransform="capitalize"
                          >
                            {vessel.status || "-"}
                          </Badge>
                        </Td>
                        {/* <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {attachments.length || 0} files
                          </Text>
                        </Td> */}
                        {/* Removed extra columns that referenced undefined variables */}
                        <Td py="12px" px="16px">
                          <HStack spacing={2}>
                            <Tooltip label="View Vessel Details">
                              <IconButton
                                icon={<Icon as={MdVisibility} />}
                                size="sm"
                                colorScheme="green"
                                variant="ghost"
                                aria-label="View vessel details"
                                onClick={() => history.push(`/admin/configurations/vessels/${vessel.id}`, { vessel })}
                              />
                            </Tooltip>
                            <Tooltip label="Edit Vessel">
                              <IconButton
                                icon={<Icon as={MdEdit} />}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                aria-label="Edit vessel"
                                onClick={() => handleEditVessel(vessel)}
                              />
                            </Tooltip>
                            <Tooltip label="Delete Vessel">
                              <IconButton
                                icon={<Icon as={MdDelete} />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                aria-label="Delete vessel"
                                onClick={() => handleDeleteVessel(vessel)}
                              />
                            </Tooltip>
                          </HStack>
                        </Td>
                      </Tr>
                    );
                  })
                ) : (
                  <Tr>
                    <Td colSpan={8} py="40px" textAlign="center">
                      <VStack spacing={3}>
                        <Icon as={MdDirectionsBoat} color="gray.400" boxSize={12} />
                        <Text color="gray.500" fontSize="md" fontWeight="500">
                          No vessels available
                        </Text>
                        <Text color="gray.400" fontSize="sm">
                          Click "New Vessel" to add your first vessel
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <Box px="25px">
            <Flex justify="space-between" align="center" py={4} flexWrap="wrap" gap={4}>
              {/* Records per page selector */}
              <HStack spacing={3}>
                <Text fontSize="sm" color="gray.600">
                  Show
                </Text>
                <Select
                  size="sm"
                  w="80px"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={80}>80</option>
                  <option value={100}>100</option>
                </Select>
                <Text fontSize="sm" color="gray.600">
                  per page
                </Text>
                <Text fontSize="sm" color="gray.600" ml={2}>
                  Showing {vessels.length} of {totalCount} records
                </Text>
              </HStack>

              {/* Pagination buttons */}
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(1)}
                  isDisabled={!hasPrevious || page === 1}
                >
                  First
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  isDisabled={!hasPrevious}
                >
                  Previous
                </Button>

                {/* Page numbers */}
                <HStack spacing={1}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={page === pageNum ? "solid" : "outline"}
                        colorScheme={page === pageNum ? "blue" : "gray"}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </HStack>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  isDisabled={!hasNext}
                >
                  Next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage(totalPages)}
                  isDisabled={!hasNext || page === totalPages}
                >
                  Last
                </Button>
              </HStack>
            </Flex>
          </Box>
        )}
      </VStack>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="blue.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingVessel ? MdEdit : MdAdd} />
              <Text>{editingVessel ? "Edit Vessel" : "Create New Vessel"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Vessel Name
                </FormLabel>
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter vessel name (e.g., Test Vessel)"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Client (Customer)
                </FormLabel>
                <SearchableSelect
                  value={formData.client_id}
                  onChange={(value) => handleInputChange("client_id", value)}
                  options={customers}
                  placeholder={customers.length === 0 ? "No customers found" : "Select customer"}
                  displayKey="name"
                  valueKey="id"
                  formatOption={(customer) => `${customer.name || customer.company_name || `Customer ${customer.id}`} (ID: ${customer.id})`}
                  isLoading={isLoadingApiData}
                  isRequired
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  IMO
                </FormLabel>
                <Input
                  size="md"
                  value={formData.imo}
                  onChange={(e) => handleInputChange("imo", e.target.value)}
                  placeholder="Enter IMO number"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Vessel Type
                </FormLabel>
                <Input
                  size="md"
                  value={formData.vessel_type}
                  onChange={(e) => handleInputChange("vessel_type", e.target.value)}
                  placeholder="Enter Vessel Type"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Status
                </FormLabel>
                <Select
                  size="md"
                  value={formData.status}
                  onChange={(e) => handleInputChange("status", e.target.value)}
                  borderRadius="md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="tbn">TBN</option>
                  <option value="new_building">New Building</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Attachments
                </FormLabel>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const filePromises = files.map(file => new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const result = reader.result || '';
                        const base64data = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : '';
                        resolve({ filename: file.name, datas: base64data, mimetype: file.type });
                      };
                      reader.readAsDataURL(file);
                    }));
                    Promise.all(filePromises).then(attachments => {
                      setFormData(prev => ({ ...prev, attachments: [...(prev.attachments || []), ...attachments] }));
                    });
                  }}
                  accept="application/pdf,image/*"
                  py={1}
                />
                {formData.attachments && formData.attachments.length > 0 && (
                  <Box mt={2}>
                    <Text fontSize="sm" fontWeight="medium" mb={1}>
                      Attached Files:
                    </Text>
                    <List spacing={1}>
                      {formData.attachments.map((file, index) => (
                        <ListItem
                          key={index}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          border="1px solid"
                          borderColor="gray.200"
                          borderRadius="md"
                          p={2}
                        >
                          <Text fontSize="sm">{file.filename}</Text>

                          <Box>
                            <Button
                              size="xs"
                              colorScheme="blue"
                              variant="outline"
                              onClick={() => handleView(file)}
                              mr={2}
                            >
                              View
                            </Button>
                            <IconButton
                              size="xs"
                              icon={<CloseIcon />}
                              aria-label="Remove attachment"
                              onClick={() => {
                                setFormData((prev) => {
                                  const attachmentToRemove = prev.attachments[index];
                                  const updatedAttachments = prev.attachments.filter((_, i) => i !== index);

                                  // If this attachment came from the backend and has an id,
                                  // track it so the API can delete it.
                                  const updatedAttachmentsToDelete = [
                                    ...(prev.attachment_to_delete || []),
                                  ];

                                  if (attachmentToRemove && attachmentToRemove.id) {
                                    updatedAttachmentsToDelete.push(attachmentToRemove.id);
                                  }

                                  return {
                                    ...prev,
                                    attachments: updatedAttachments,
                                    attachment_to_delete: updatedAttachmentsToDelete,
                                  };
                                });
                              }}
                            />
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </FormControl>

            </VStack>

          </ModalBody >
          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={onModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingVessel ? "Update Vessel" : "Create Vessel"}
            </Button>
          </ModalFooter>
        </ModalContent >
      </Modal >

      {/* File Preview Modal - 65% viewing mode, A4 only when printing */}
      <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} size="full">
        <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
        <ModalContent maxW="65vw" maxH="65vh" m="auto" bg="white">
          <ModalHeader bg="gray.100" borderBottom="1px" borderColor="gray.200">
            <Flex justify="space-between" align="center">
              <Text fontSize="lg" fontWeight="600">
                {previewFile?.filename || "File Preview"}
              </Text>
              <Button
                size="sm"
                leftIcon={<Icon as={MdPrint} />}
                onClick={() => {
                  const printWindow = window.open();
                  if (printWindow && previewFile?.fileUrl) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>${previewFile.filename}</title>
                          <style>
                            @page {
                              size: A4;
                              margin: 0;
                            }
                            body {
                              margin: 0;
                              padding: 0;
                            }
                            img, iframe {
                              width: 100%;
                              height: 100vh;
                              object-fit: contain;
                            }
                          </style>
                        </head>
                        <body>
                          ${previewFile.fileType?.startsWith("image/") 
                            ? `<img src="${previewFile.fileUrl}" alt="${previewFile.filename}" />`
                            : previewFile.fileType === "application/pdf"
                            ? `<iframe src="${previewFile.fileUrl}" style="width: 100%; height: 100vh; border: none;"></iframe>`
                            : `<p>Preview not available. <a href="${previewFile.fileUrl}" download>Download file</a></p>`
                          }
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    setTimeout(() => printWindow.print(), 250);
                  }
                }}
              >
                Print
              </Button>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody p={0} bg="gray.50" display="flex" justifyContent="center" alignItems="center" minH="calc(100vh - 120px)">
            {previewFile && (
              previewFile.fileType?.startsWith("image/") ? (
                <Box
                  w="100%"
                  h="100%"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  p={4}
                >
                  <img
                    src={previewFile.fileUrl}
                    alt={previewFile.filename}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "calc(100vh - 120px)",
                      objectFit: "contain",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              ) : previewFile.fileType === "application/pdf" ? (
                <Box
                  w="100%"
                  h="calc(100vh - 120px)"
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  bg="gray.100"
                >
                  <iframe
                    src={previewFile.fileUrl}
                    title={previewFile.filename}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </Box>
              ) : (
                <Box p={8} textAlign="center">
                  <Text mb={4}>File preview not available for this file type.</Text>
                  <Button
                    as="a"
                    href={previewFile.fileUrl}
                    download={previewFile.filename}
                    colorScheme="blue"
                  >
                    Download File
                  </Button>
                </Box>
              )
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      < AlertDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        leastDestructiveRef={undefined}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Vessel
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this vessel? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={isLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog >
    </Box >
  );
};


