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
  MdLocationOn,
} from "react-icons/md";
import destinationsAPI from "../../../api/destinations";

export default function Destinations() {
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingDestination, setEditingDestination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();

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

  // Fetch destinations
  const fetchDestinations = async () => {
    try {
      setIsLoading(true);
      const response = await destinationsAPI.getDestinations();
      if (response.destinations && Array.isArray(response.destinations)) {
        setDestinations(response.destinations);
      } else {
        setDestinations([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch destinations: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setDestinations([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load destinations on component mount
  useEffect(() => {
    fetchDestinations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter destinations based on search
  const filteredDestinations = useMemo(() => {
    let filtered = destinations;

    // Filter by search
    if (searchValue) {
      filtered = filtered.filter(destination =>
        destination.name?.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    return filtered;
  }, [destinations, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredDestinations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDestinations = filteredDestinations.slice(startIndex, endIndex);

  // Reset to first page when search, status filter, or items per page changes
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
    setEditingDestination(null);
  };

  // Open modal for creating new destination
  const handleNewDestination = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing destination
  const handleEditDestination = (destination) => {
    setFormData({
      name: destination.name || "",
    });
    setEditingDestination(destination);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (editingDestination) {
        // Update existing destination
        const response = await destinationsAPI.updateDestination(editingDestination.id, formData);

        // Extract success message from API response
        let successMessage = "Destination updated successfully";
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
        // Create new destination
        const response = await destinationsAPI.createDestination(formData);

        // Extract success message from API response
        let successMessage = "Destination created successfully";
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
      fetchDestinations();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingDestination ? 'update' : 'create'} destination`;
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

  // Handle delete destination
  const handleDeleteDestination = async (destination) => {
    if (window.confirm(`Are you sure you want to delete "${destination.name}"?`)) {
      try {
        setIsLoading(true);
        const response = await destinationsAPI.deleteDestination(destination.id);

        let successMessage = "Destination deleted successfully";
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

        fetchDestinations();
      } catch (error) {
        let errorMessage = "Failed to delete destination";
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
              onClick={handleNewDestination}
            >
              New Destination
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="green.600">
                Destinations
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage shipping destinations
              </Text>
            </VStack>
          </HStack>
        </Flex>

        {/* Search and Filter Section */}
        <Box px="25px">
          <HStack spacing={4} align="end">
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
                placeholder="Search by destination name..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </InputGroup>
          </HStack>
        </Box>

        {/* Destinations Table */}
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
                {paginatedDestinations.length > 0 ? (
                  paginatedDestinations.map((destination, index) => (
                    <Tr
                      key={destination.id}
                      bg={index % 2 === 0 ? "white" : "gray.50"}
                      _hover={{ bg: hoverBg }}
                      borderBottom="1px"
                      borderColor="gray.200"
                    >
                      <Td py="12px" px="16px">
                        <HStack spacing={2}>
                          <Icon as={MdLocationOn} color="green.500" w="16px" h="16px" />
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {destination.name || "-"}
                          </Text>
                        </HStack>
                      </Td>
                      <Td py="12px" px="16px">
                        <HStack spacing={2}>
                          <Tooltip label="Edit Destination">
                            <IconButton
                              icon={<Icon as={MdEdit} />}
                              size="sm"
                              colorScheme="blue"
                              variant="ghost"
                              aria-label="Edit destination"
                              onClick={() => handleEditDestination(destination)}
                            />
                          </Tooltip>
                          <Tooltip label="Delete Destination">
                            <IconButton
                              icon={<Icon as={MdDelete} />}
                              size="sm"
                              colorScheme="red"
                              variant="ghost"
                              aria-label="Delete destination"
                              onClick={() => handleDeleteDestination(destination)}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={2} py="40px" textAlign="center">
                      <VStack spacing={3}>
                        <Icon as={MdLocationOn} color="gray.400" w="48px" h="48px" />
                        <VStack spacing={1}>
                          <Text color="gray.500" fontSize="lg" fontWeight="medium">
                            No destinations found
                          </Text>
                          <Text color="gray.400" fontSize="sm">
                            {searchValue
                              ? "No destinations match your search criteria"
                              : "Get started by creating your first destination"
                            }
                          </Text>
                        </VStack>
                        {!searchValue && (
                          <Button
                            leftIcon={<Icon as={MdAdd} />}
                            colorScheme="green"
                            size="sm"
                            onClick={handleNewDestination}
                          >
                            Create First Destination
                          </Button>
                        )}
                      </VStack>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>

        {/* Pagination Controls */}
        {filteredDestinations.length > 0 && (
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
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredDestinations.length)} of {filteredDestinations.length} records
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
        )}
      </VStack>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="green.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingDestination ? MdEdit : MdAdd} />
              <Text>{editingDestination ? "Edit Destination" : "Create New Destination"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Destination Name
                </FormLabel>
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter destination name (e.g., New York Port)"
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
              {editingDestination ? "Update Destination" : "Create Destination"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
