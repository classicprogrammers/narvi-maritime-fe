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
  Badge,
  NumberInput,
  NumberInputField,
  Select,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdAttachMoney,
} from "react-icons/md";
import currenciesAPI from "../../../api/currencies";

export default function Currencies() {
  const [currencies, setCurrencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [deleteCurrencyId, setDeleteCurrencyId] = useState(null);
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
    symbol: "",
  });

  // Fetch currencies
  const fetchCurrencies = async () => {
    try {
      setIsLoading(true);
      const response = await currenciesAPI.getCurrencies();
      if (response.currencies && Array.isArray(response.currencies)) {
        setCurrencies(response.currencies);
      } else {
        setCurrencies([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch currencies: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setCurrencies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load currencies on component mount
  useEffect(() => {
    fetchCurrencies();
  }, []);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (!searchValue) return currencies;
    return currencies.filter(currency =>
      currency.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      currency.symbol?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [currencies, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCurrencies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCurrencies = filteredCurrencies.slice(startIndex, endIndex);

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
      symbol: "",
    });
    setEditingCurrency(null);
  };

  // Open modal for creating new currency
  const handleNewCurrency = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing currency
  const handleEditCurrency = (currency) => {
    setFormData({
      name: currency.name || "",
      symbol: currency.symbol || "",
    });
    setEditingCurrency(currency);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      
      if (editingCurrency) {
        // Update existing currency
        await currenciesAPI.updateCurrency(editingCurrency.id, formData);
        toast({
          title: "Success",
          description: "Currency updated successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Create new currency
        await currenciesAPI.createCurrency(formData);
        toast({
          title: "Success",
          description: "Currency created successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      
      onModalClose();
      resetForm();
      fetchCurrencies();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingCurrency ? 'update' : 'create'} currency: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete currency
  const handleDeleteCurrency = (currencyId) => {
    setDeleteCurrencyId(currencyId);
    onDeleteOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      await currenciesAPI.deleteCurrency(deleteCurrencyId);
      toast({
        title: "Success",
        description: "Currency deleted successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onDeleteClose();
      setDeleteCurrencyId(null);
      fetchCurrencies();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete currency: ${error.message}`,
        status: "error",
        duration: 3000,
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
              colorScheme="yellow"
              size="sm"
              onClick={handleNewCurrency}
            >
              New Currency
            </Button>
            <VStack align="start" spacing={1}>
              <Text fontSize="xl" fontWeight="bold" color="yellow.600">
                Currencies
              </Text>
              <Text fontSize="sm" color="gray.500">
                Manage supported currencies
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
            placeholder="Search by currency name or symbol..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </InputGroup>
        </Box>

        {/* Currencies Table */}
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
                            Symbol
                          </Th>
                          <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                            Actions
                          </Th>
                        </Tr>
                      </Thead>
              <Tbody>
                {paginatedCurrencies.map((currency, index) => (
                  <Tr
                    key={currency.id}
                    bg={index % 2 === 0 ? "white" : "gray.50"}
                    _hover={{ bg: hoverBg }}
                    borderBottom="1px"
                    borderColor="gray.200"
                  >
                                                <Td py="12px" px="16px">
                              <Text color={textColor} fontSize="sm" fontWeight="500">
                                {currency.name || "-"}
                              </Text>
                            </Td>
                            <Td py="12px" px="16px">
                              <Text color={textColor} fontSize="sm" fontWeight="600">
                                {currency.symbol || "-"}
                              </Text>
                            </Td>
                            <Td py="12px" px="16px">
                      <HStack spacing={2}>
                        <Tooltip label="Edit Currency">
                          <IconButton
                            icon={<Icon as={MdEdit} />}
                            size="sm"
                            colorScheme="blue"
                            variant="ghost"
                            aria-label="Edit currency"
                            onClick={() => handleEditCurrency(currency)}
                          />
                        </Tooltip>
                        <Tooltip label="Delete Currency">
                          <IconButton
                            icon={<Icon as={MdDelete} />}
                            size="sm"
                            colorScheme="red"
                            variant="ghost"
                            aria-label="Delete currency"
                            onClick={() => handleDeleteCurrency(currency.id)}
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
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredCurrencies.length)} of {filteredCurrencies.length} records
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
          <ModalHeader bg="yellow.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingCurrency ? MdEdit : MdAdd} />
              <Text>{editingCurrency ? "Edit Currency" : "Create New Currency"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
                            <ModalBody py="6">
                    <VStack spacing="4" align="stretch">
                      <FormControl isRequired>
                        <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                          Currency Name
                        </FormLabel>
                        <Input
                          size="md"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Enter currency name"
                          borderRadius="md"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                          Symbol
                        </FormLabel>
                        <Input
                          size="md"
                          value={formData.symbol}
                          onChange={(e) => handleInputChange("symbol", e.target.value)}
                          placeholder="e.g., $, €, £"
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
              colorScheme="yellow"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingCurrency ? "Update Currency" : "Create Currency"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <AlertDialogOverlay />
        <AlertDialogContent borderRadius="lg">
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
            Delete Currency
          </AlertDialogHeader>
          <AlertDialogBody>
            Are you sure you want to delete this currency? This action cannot be undone.
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
