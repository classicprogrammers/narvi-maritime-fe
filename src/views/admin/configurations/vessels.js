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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdDirectionsBoat,
} from "react-icons/md";
import vesselsAPI from "../../../api/vessels";

export default function Vessels() {
  const [vessels, setVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingVessel, setEditingVessel] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteVesselId, setDeleteVesselId] = useState(null);

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

  // Fetch vessels
  const fetchVessels = async () => {
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
  };

  // Load vessels on component mount
  useEffect(() => {
    fetchVessels();
  }, []);

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
    });
    setEditingVessel(null);
  };

  // Open modal for creating new vessel
  const handleNewVessel = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing vessel
  const handleEditVessel = (vessel) => {
    setFormData({
      name: vessel.name || "",
    });
    setEditingVessel(vessel);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (editingVessel) {
        // Update existing vessel
        const response = await vesselsAPI.updateVessel(editingVessel.id, formData);

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
        const response = await vesselsAPI.createVessel(formData);

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

      // Extract success message from API response
      let successMessage = "Vessel deleted successfully";
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

      onDeleteClose();
      setDeleteVesselId(null);
      fetchVessels();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = "Failed to delete vessel";
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
                    Name
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedVessels.length > 0 ? (
                  paginatedVessels.map((vessel, index) => (
                    <Tr
                      key={vessel.id}
                      bg={index % 2 === 0 ? "white" : "gray.50"}
                      _hover={{ bg: hoverBg }}
                      borderBottom="1px"
                      borderColor="gray.200"
                    >
                      <Td py="12px" px="16px">
                        <HStack spacing={2}>
                          <Icon as={MdDirectionsBoat} color="blue.500" w="16px" h="16px" />
                          <Text color={textColor} fontSize="sm" fontWeight="500">
                            {vessel.name || "-"}
                          </Text>
                        </HStack>
                      </Td>
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
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={2} py="40px" textAlign="center">
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
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="lg">
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
                  placeholder="Enter vessel name (e.g., Arslan)"
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
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingVessel ? "Update Vessel" : "Create Vessel"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
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
      </AlertDialog>
    </Box>
  );
}
