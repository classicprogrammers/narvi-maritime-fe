import React, { useState, useEffect, useMemo, useCallback } from "react";
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

} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdDirectionsBoat,
} from "react-icons/md";
import { CloseIcon } from "@chakra-ui/icons";
import { List, ListItem } from "@chakra-ui/react";
import vesselsAPI from "../../../api/vessels";

import { getCustomersApi } from "../../../api/customer";
import SearchableSelect from "../../../components/forms/SearchableSelect";

export default function Vessels() {
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingVessel, setEditingVessel] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
    status: "pending",
    attachments: []
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


  // Fetch vessels
  const fetchVessels = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await vesselsAPI.getVessels();
      if (response.vessels && Array.isArray(response.vessels)) {
        setVessels(response.vessels);
      } else {
        setVessels([]);
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
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

  // Filter vessels based on search
  const filteredVessels = useMemo(() => {
    if (!searchValue) return vessels;
    return vessels.filter(vessel =>
      vessel.name?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [vessels, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredVessels.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVessels = filteredVessels.slice(startIndex, endIndex);

  // Reset to first page when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, itemsPerPage]);

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
      status: "pending",
      attachments: []
    });
  };


  // Open modal for creating new vessel
  const handleNewVessel = () => {
    resetForm();
    onModalOpen();
  };

  // // Open modal for editing vessel
  const handleEditVessel = (vessel) => {
    setFormData({
      name: vessel.name || "",
      client_id: vessel.client_id || "",
      status: vessel.status || "pending",
      attachments: vessel.attachments || []
    });
    setEditingVessel(vessel);
    onModalOpen();
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
        // Update existing vessel
        const response = await vesselsAPI.updateVessel(finalFormData);

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
          <InputGroup w={{ base: "100%", md: "400px" }}>
            <InputLeftElement>
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
              placeholder="Search by vessel name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </InputGroup>
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
                    Status
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Attachments
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedVessels.length > 0 ? (
                  paginatedVessels.map((vessel, index) => {
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
                          <Badge
                            colorScheme={
                              vessel.status === "pending" ? "yellow" :
                                vessel.status === "stock" ? "green" :
                                  vessel.status === "shipping_instr" ? "blue" :
                                    vessel.status === "delivery_instr" ? "purple" :
                                      vessel.status === "in_transit" ? "orange" :
                                        vessel.status === "arrived_dest" ? "teal" :
                                          vessel.status === "shipped" ? "cyan" :
                                            vessel.status === "delivered" ? "green" :
                                              vessel.status === "irregularities" ? "red" :
                                                vessel.status === "cancelled" ? "gray" : "gray"
                            }
                            size="sm"
                            textTransform="capitalize"
                          >
                            {vessel.status || "-"}
                          </Badge>
                        </Td>
                        <Td py="12px" px="16px">
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {attachments.length || 0} files
                          </Text>
                        </Td>
                        {/* Removed extra columns that referenced undefined variables */}
                        <Td py="12px" px="16px">
                          <HStack spacing={2}>
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
        <Box px="25px">
          <Flex justify="space-between" align="center" py={4}>
            {/* Records per page selector */}
            <HStack spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Records per page:
              </Text>
              <Select
                size="sm"
                w="80px"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Select>
              <Text fontSize="sm" color="gray.600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredVessels.length)} of {filteredVessels.length} records
              </Text>
            </HStack>

            {/* Pagination buttons */}
            <HStack spacing={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(1)}
                isDisabled={currentPage === 1}
              >
                First
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage - 1)}
                isDisabled={currentPage === 1}
              >
                Previous
              </Button>

              {/* Page numbers */}
              <HStack spacing={1}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={currentPage === pageNum ? "solid" : "outline"}
                      colorScheme={currentPage === pageNum ? "blue" : "gray"}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </HStack>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                isDisabled={currentPage === totalPages}
              >
                Next
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(totalPages)}
                isDisabled={currentPage === totalPages}
              >
                Last
              </Button>
            </HStack>
          </Flex>
        </Box>
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
                  <option value="pending">Pending</option>
                  <option value="stock">Stock</option>
                  <option value="shipping_instr">On a Shipping Instr</option>
                  <option value="delivery_instr">On a Delivery Instr</option>
                  <option value="in_transit">In Transit</option>
                  <option value="arrived_dest">Arrived Dest</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="irregularities">Irregularities</option>
                  <option value="cancelled">Cancelled</option>
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
                                setFormData((prev) => ({
                                  ...prev,
                                  attachments: prev.attachments.filter((_, i) => i !== index),
                                }));
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

      {/* File Preview Modal */}
      <Modal isOpen={!!previewFile} onClose={() => setPreviewFile(null)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{previewFile?.filename}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {previewFile &&
              (previewFile.fileType?.startsWith("image/") ? (
                <img
                  src={previewFile.fileUrl}
                  alt={previewFile.filename}
                  style={{
                    maxWidth: "100%",
                    borderRadius: "8px",
                    objectFit: "contain",
                  }}
                />
              ) : previewFile.fileType === "application/pdf" ? (
                <iframe
                  src={previewFile.fileUrl}
                  title={previewFile.filename}
                  width="100%"
                  height="500px"
                  style={{ borderRadius: "8px", border: "1px solid #ccc" }}
                />
              ) : (
                <Text>
                  File preview not available.{" "}
                  <a
                    href={previewFile.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3182CE" }}
                  >
                    Download or view externally
                  </a>
                  .
                </Text>
              ))}
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


