import React, { useState, useEffect, useMemo } from "react";
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  FormControl,
  FormLabel,
  useToast,
  Tooltip,
  Select,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
} from "react-icons/md";
import locationsAPI from "../../../api/locations";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingLocation, setEditingLocation] = useState(null);
  const [deleteLocationId, setDeleteLocationId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
  });

  // Fetch locations
  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await locationsAPI.getLocations();
      if (response.locations && Array.isArray(response.locations)) {
        setLocations(response.locations);
      } else {
        setLocations([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch locations: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load locations on component mount
  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchValue) return locations;
    return locations.filter(location =>
      location.name?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [locations, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, endIndex);

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
    });
    setEditingLocation(null);
  };

  // Open modal for creating new location
  const handleNewLocation = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing location
  const handleEditLocation = (location) => {
    setFormData({
      name: location.name || "",
    });
    setEditingLocation(location);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (editingLocation) {
        // Update existing location
        const response = await locationsAPI.updateLocation(editingLocation.id, formData);
        
        // Extract success message from API response
        let successMessage = "Location updated successfully";
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
        // Create new location
        const response = await locationsAPI.createLocation(formData);
        
        // Extract success message from API response
        let successMessage = "Location created successfully";
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
      fetchLocations();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingLocation ? 'update' : 'create'} location`;
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

  // Handle delete location
  const handleDeleteLocation = (locationId) => {
    setDeleteLocationId(locationId);
    onDeleteOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      const response = await locationsAPI.deleteLocation(deleteLocationId);

      // Extract success message from API response
      let successMessage = "Location deleted successfully";
      let status = "success";

      if (response && response.result) {
        // Handle JSON-RPC response format
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
      onDeleteClose();
      setDeleteLocationId(null);
      fetchLocations();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = "Failed to delete location";
      let status = "error";

      if (error.response && error.response.data) {
        // Handle JSON-RPC response format
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

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <VStack spacing={6} align="stretch">
        {/* Header Section */}
        <Flex justify="space-between" align="center" px="25px">
          <HStack spacing={4}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="green"
              size="sm"
              onClick={handleNewLocation}
            >
              New Location
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="green.600">
                Locations
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage shipping and delivery locations
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
              placeholder="Search by location name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </InputGroup>
        </Box>

        {/* Locations Table */}
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
                    Name
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedLocations.map((location, index) => (
                  <Tr
                    key={location.id}
                    bg={index % 2 === 0 ? "white" : "gray.50"}
                    _hover={{ bg: hoverBg }}
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    <Td py="12px" px="16px">
                      <Text color={textColor} fontSize="sm" fontWeight="500">
                        {location.name || "-"}
                      </Text>
                    </Td>
                    <Td py="12px" px="16px">
                      <HStack spacing={2}>
                        <Tooltip label="Edit Location">
                          <IconButton
                            icon={<Icon as={MdEdit} />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            aria-label="Edit location"
                            onClick={() => handleEditLocation(location)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete Location">
                          <IconButton
                            icon={<Icon as={MdDelete} />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            aria-label="Delete location"
                            onClick={() => handleDeleteLocation(location.id)}
                          />
                        </Tooltip>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
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
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredLocations.length)} of {filteredLocations.length} records
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="green.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingLocation ? MdEdit : MdAdd} />
              <Text>{editingLocation ? "Edit Location" : "Create New Location"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Location Name
                </FormLabel>
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter location name"
                  borderRadius="md"
                />
              </FormControl>










            </VStack>
          </ModalBody>
          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={onModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="green"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingLocation ? "Update Location" : "Create Location"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <AlertDialogOverlay />
        <AlertDialogContent borderRadius="lg">
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
            Delete Location
          </AlertDialogHeader>
          <AlertDialogBody>
            Are you sure you want to delete this location? This action cannot be undone.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button variant="outline" onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={isLoading}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
