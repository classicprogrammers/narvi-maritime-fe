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
  Badge,
  Select,
  Checkbox,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdPublic,
} from "react-icons/md";
import countriesAPI from "../../../api/countries";

export default function Countries() {
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingCountry, setEditingCountry] = useState(null);
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
    code: "",
  });

  // Fetch countries
  const fetchCountries = async () => {
    try {
      setIsLoading(true);
      const response = await countriesAPI.getCountries();
      if (response.countries && Array.isArray(response.countries)) {
        setCountries(response.countries);
      } else {
        setCountries([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch countries: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setCountries([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load countries on component mount
  useEffect(() => {
    fetchCountries();
  }, []);

  // Filter countries based on search and status
  const filteredCountries = useMemo(() => {
    let filtered = countries;

    // Filter by search
    if (searchValue) {
      filtered = filtered.filter(country =>
        country.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
        country.code?.toLowerCase().includes(searchValue.toLowerCase())
      );
    }

    return filtered;
  }, [countries, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCountries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCountries = filteredCountries.slice(startIndex, endIndex);

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
      code: "",
      active: true,
    });
    setEditingCountry(null);
  };

  // Open modal for creating new country
  const handleNewCountry = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing country
  const handleEditCountry = (country) => {
    setFormData({
      name: country.name || "",
      code: country.code || "",
      active: country.active !== undefined ? country.active : true,
    });
    setEditingCountry(country);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (editingCountry) {
        // Update existing country
        const response = await countriesAPI.updateCountry(editingCountry.id, formData);

        // Extract success message from API response
        let successMessage = "Country updated successfully";
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
        // Create new country
        const response = await countriesAPI.createCountry(formData);

        // Extract success message from API response
        let successMessage = "Country created successfully";
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
      fetchCountries();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingCountry ? 'update' : 'create'} country`;
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
              colorScheme="green"
              size="sm"
              onClick={handleNewCountry}
            >
              New Country
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="green.600">
                Countries
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage supported countries
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
                placeholder="Search by country name or code..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </InputGroup>
          </HStack>
        </Box>

        {/* Countries Table */}
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
                    Code
                  </Th>
                  <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                    Actions
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedCountries.map((country, index) => (
                  <Tr
                    key={country.id}
                    bg={index % 2 === 0 ? "white" : "gray.50"}
                    _hover={{ bg: hoverBg }}
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                    <Td py="12px" px="16px">
                      <HStack spacing={2}>
                        <Icon as={MdPublic} color="green.500" w="16px" h="16px" />
                        <Text color={textColor} fontSize="sm" fontWeight="500">
                          {country.name || "-"}
                        </Text>
                      </HStack>
                    </Td>
                    <Td py="12px" px="16px">
                      <Text color={textColor} fontSize="sm" fontWeight="600">
                        {country.code || "-"}
                      </Text>
                    </Td>
                    <Td py="12px" px="16px">
                      <HStack spacing={2}>
                        <Tooltip label="Edit Country">
                          <IconButton
                            icon={<Icon as={MdEdit} />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            aria-label="Edit country"
                            onClick={() => handleEditCountry(country)}
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
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCountries.length)} of {filteredCountries.length} records
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
          <ModalHeader bg="green.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingCountry ? MdEdit : MdAdd} />
              <Text>{editingCountry ? "Edit Country" : "Create New Country"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Country Name
                </FormLabel>
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter country name (e.g., Canada)"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Country Code
                </FormLabel>
                <Input
                  size="md"
                  value={formData.code}
                  onChange={(e) => handleInputChange("code", e.target.value)}
                  placeholder="Enter country code (e.g., CA)"
                  borderRadius="md"
                  maxLength={3}
                  textTransform="uppercase"
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
              {editingCountry ? "Update Country" : "Create Country"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>


    </Box>
  );
}
