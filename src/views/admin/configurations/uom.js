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
  Textarea,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@chakra-ui/react";
import {
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdStraighten,
} from "react-icons/md";
import uomAPI from "../../../api/uom";

// Custom Searchable Select Component
const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder,
  displayKey = "name",
  valueKey = "id",
  formatOption = (option) => `${option[valueKey]} - ${option[displayKey]}`,
  isRequired = false,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (searchValue) {
      const filtered = options.filter(option =>
        formatOption(option).toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchValue, options, formatOption]);

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchValue("");
  };

  // Find the selected option to display its text
  const selectedOption = options.find(option => option[valueKey] === value);
  const displayValue = selectedOption ? formatOption(selectedOption) : searchValue;

  return (
    <Box position="relative">
      <Input
        value={isOpen ? searchValue : displayValue}
        onChange={(e) => setSearchValue(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        borderRadius="md"
        size="md"
        readOnly={!isOpen}
      />
      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          bg="white"
          border="1px"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          zIndex={1000}
          maxH="200px"
          overflowY="auto"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <Box
                key={index}
                px={3}
                py={2}
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => handleSelect(option)}
                borderBottom="1px"
                borderColor="gray.100"
              >
                <Text fontSize="sm">{formatOption(option)}</Text>
              </Box>
            ))
          ) : (
            <Box px={3} py={2} color="gray.500">
              <Text fontSize="sm">No options found</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default function UOM() {
  const [uomList, setUomList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [editingUOM, setEditingUOM] = useState(null);
  const [deleteUOMId, setDeleteUOMId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Category management states
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState(null);
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [categoryItemsPerPage, setCategoryItemsPerPage] = useState(10);

  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // Category modal disclosures
  const { isOpen: isCategoryModalOpen, onOpen: onCategoryModalOpen, onClose: onCategoryModalClose } = useDisclosure();
  const { isOpen: isCategoryDeleteOpen, onOpen: onCategoryDeleteOpen, onClose: onCategoryDeleteClose } = useDisclosure();

  const toast = useToast();

  const textColor = useColorModeValue("gray.700", "white");
  const hoverBg = useColorModeValue("blue.50", "blue.900");
  const searchIconColor = useColorModeValue("gray.400", "gray.500");
  const inputBg = useColorModeValue("white", "gray.700");
  const inputText = useColorModeValue("gray.700", "white");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
  });

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
  });

  // Fetch UOM list
  const fetchUOM = async () => {
    try {
      setIsLoading(true);
      const response = await uomAPI.getUOM();
      if (response.uom && Array.isArray(response.uom)) {
        setUomList(response.uom);
      } else {
        setUomList([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch UOM: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setUomList([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch UOM categories
  const fetchCategories = async () => {
    try {
      const response = await uomAPI.getUOMCategories();
      if (response.category && Array.isArray(response.category)) {
        setCategoriesList(response.category);
      } else {
        setCategoriesList([]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to fetch UOM categories: ${error.message}`,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setCategoriesList([]);
    }
  };

  // Load UOM and categories on component mount
  useEffect(() => {
    fetchUOM();
    fetchCategories();
  }, []);

  // Filter UOM based on search
  const filteredUOM = useMemo(() => {
    if (!searchValue) return uomList;
    return uomList.filter(uom =>
      uom.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      uom.category_name?.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [uomList, searchValue]);

  // Pagination logic
  const totalPages = Math.ceil(filteredUOM.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUOM = filteredUOM.slice(startIndex, endIndex);

  // Category filtering and pagination
  const filteredCategories = useMemo(() => {
    if (!categorySearchValue) return categoriesList;
    return categoriesList.filter(category =>
      category.name?.toLowerCase().includes(categorySearchValue.toLowerCase())
    );
  }, [categoriesList, categorySearchValue]);

  const categoryTotalPages = Math.ceil(filteredCategories.length / categoryItemsPerPage);
  const categoryStartIndex = (categoryCurrentPage - 1) * categoryItemsPerPage;
  const categoryEndIndex = categoryStartIndex + categoryItemsPerPage;
  const paginatedCategories = filteredCategories.slice(categoryStartIndex, categoryEndIndex);

  // Reset to first page when search or items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchValue, itemsPerPage]);

  // Reset category pagination when search or items per page changes
  useEffect(() => {
    setCategoryCurrentPage(1);
  }, [categorySearchValue, categoryItemsPerPage]);

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
      category_id: "",
    });
    setEditingUOM(null);
  };

  // Open modal for creating new UOM
  const handleNewUOM = () => {
    resetForm();
    onModalOpen();
  };

  // Open modal for editing UOM
  const handleEditUOM = (uom) => {
    setFormData({
      name: uom.name || "",
      category_id: uom.category_id || "",
    });
    setEditingUOM(uom);
    onModalOpen();
  };

  // Handle form submission (create or update)
  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      if (editingUOM) {
        // Update existing UOM
        const response = await uomAPI.updateUOM(editingUOM.id, formData);
        
        // Extract success message from API response
        let successMessage = "Unit of Measurement updated successfully";
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
        // Create new UOM
        const response = await uomAPI.createUOM(formData);
        
        // Extract success message from API response
        let successMessage = "Unit of Measurement created successfully";
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
      fetchUOM();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingUOM ? 'update' : 'create'} UOM`;
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

  // Category management functions
  const handleCategoryInputChange = (field, value) => {
    setCategoryFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
    });
    setEditingCategory(null);
  };

  const handleNewCategory = () => {
    resetCategoryForm();
    onCategoryModalOpen();
  };

  const handleEditCategory = (category) => {
    setCategoryFormData({
      name: category.name || "",
    });
    setEditingCategory(category);
    onCategoryModalOpen();
  };

  const handleCategorySubmit = async () => {
    try {
      setIsLoading(true);

      if (editingCategory) {
        // Update existing category
        const response = await uomAPI.updateUOMCategory(editingCategory.id, categoryFormData);
        
        // Extract success message from API response
        let successMessage = "UOM Category updated successfully";
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
        // Create new category
        const response = await uomAPI.createUOMCategory(categoryFormData);
        
        // Extract success message from API response
        let successMessage = "UOM Category created successfully";
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

      onCategoryModalClose();
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = `Failed to ${editingCategory ? 'update' : 'create'} UOM Category`;
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

  const handleDeleteCategory = (categoryId) => {
    setDeleteCategoryId(categoryId);
    onCategoryDeleteOpen();
  };

  const confirmDeleteCategory = async () => {
    try {
      setIsLoading(true);
      const response = await uomAPI.deleteUOMCategory(deleteCategoryId);

      // Extract success message from API response
      let successMessage = "UOM Category deleted successfully";
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
      onCategoryDeleteClose();
      setDeleteCategoryId(null);
      fetchCategories();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = "Failed to delete UOM Category";
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

  // Handle delete UOM
  const handleDeleteUOM = (uomId) => {
    setDeleteUOMId(uomId);
    onDeleteOpen();
  };

  // Confirm delete
  const confirmDelete = async () => {
    try {
      setIsLoading(true);
      const response = await uomAPI.deleteUOM(deleteUOMId);

      // Extract success message from API response
      let successMessage = "Unit of Measurement deleted successfully";
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
      setDeleteUOMId(null);
      fetchUOM();
    } catch (error) {
      // Extract error message from API response
      let errorMessage = "Failed to delete UOM";
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
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">
              Manage UOM categories and units of measurement
            </Text>
          </VStack>
        </Flex>

        {/* Tabs Section */}
        <Box px="25px">
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList>
              <Tab>Units of Measurement</Tab>
              <Tab>UOM Categories</Tab>
            </TabList>

            <TabPanels>
                            {/* Units of Measurement Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {/* UOM Header */}
                  <Flex justify="space-between" align="center">
                    <Button
                      leftIcon={<Icon as={MdAdd} />}
                      colorScheme="purple"
                      size="sm"
                      onClick={handleNewUOM}
                    >
                      New UOM
                    </Button>
                  </Flex>

                  {/* Search Section */}
                  <Box>
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
                        placeholder="Search by UOM name or category..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                      />
                    </InputGroup>
                  </Box>

                  {/* UOM Table */}
                  <Box>
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
                              Category
                            </Th>
                            <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                              Actions
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {paginatedUOM.map((uom, index) => (
                            <Tr
                              key={uom.id}
                              bg={index % 2 === 0 ? "white" : "gray.50"}
                              _hover={{ bg: hoverBg }}
                              borderBottom="1px"
                              borderColor="gray.200"
                            >
                              <Td py="12px" px="16px">
                                <Text color={textColor} fontSize="sm" fontWeight="500">
                                  {uom.name || "-"}
                                </Text>
                              </Td>
                              <Td py="12px" px="16px">
                                <Badge
                                  colorScheme="blue"
                                  variant="subtle"
                                  fontSize="xs"
                                  px="8px"
                                  py="4px"
                                  borderRadius="full"
                                >
                                  {uom.category_name || "-"}
                                </Badge>
                              </Td>
                              <Td py="12px" px="16px">
                                <HStack spacing={2}>
                                  <Tooltip label="Edit UOM">
                                    <IconButton
                                      icon={<Icon as={MdEdit} />}
                                      size="sm"
                                      colorScheme="blue"
                                      variant="ghost"
                                      aria-label="Edit UOM"
                                      onClick={() => handleEditUOM(uom)}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Delete UOM">
                                    <IconButton
                                      icon={<Icon as={MdDelete} />}
                                      size="sm"
                                      colorScheme="red"
                                      variant="ghost"
                                      aria-label="Delete UOM"
                                      onClick={() => handleDeleteUOM(uom.id)}
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
                  <Box>
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
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredUOM.length)} of {filteredUOM.length} records
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
              </TabPanel>

                            {/* UOM Categories Tab */}
              <TabPanel>
                <VStack spacing={6} align="stretch">
                  {/* Category Header */}
                  <Flex justify="space-between" align="center">
                    <Button
                      leftIcon={<Icon as={MdAdd} />}
                      colorScheme="purple"
                      size="sm"
                      onClick={handleNewCategory}
                    >
                      New Category
                    </Button>
                  </Flex>

                  {/* Category Search */}
                  <Box>
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
                        placeholder="Search by category name..."
                        value={categorySearchValue}
                        onChange={(e) => setCategorySearchValue(e.target.value)}
                      />
                    </InputGroup>
                  </Box>

                  {/* Category Table */}
                  <Box>
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
                              ID
                            </Th>
                            <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                              Name
                            </Th>
                            <Th py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">
                              Actions
                            </Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {paginatedCategories.map((category, index) => (
                            <Tr
                              key={category.id}
                              bg={index % 2 === 0 ? "white" : "gray.50"}
                              _hover={{ bg: hoverBg }}
                              borderBottom="1px"
                              borderColor="gray.200"
                            >
                              <Td py="12px" px="16px">
                                <Text color={textColor} fontSize="sm" fontWeight="500">
                                  {category.id || "-"}
                                </Text>
                              </Td>
                              <Td py="12px" px="16px">
                                <Text color={textColor} fontSize="sm" fontWeight="500">
                                  {category.name || "-"}
                                </Text>
                              </Td>
                              <Td py="12px" px="16px">
                                <HStack spacing={2}>
                                  <Tooltip label="Edit Category">
                                    <IconButton
                                      icon={<Icon as={MdEdit} />}
                                      size="sm"
                                      colorScheme="blue"
                                      variant="ghost"
                                      aria-label="Edit Category"
                                      onClick={() => handleEditCategory(category)}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Delete Category">
                                    <IconButton
                                      icon={<Icon as={MdDelete} />}
                                      size="sm"
                                      colorScheme="red"
                                      variant="ghost"
                                      aria-label="Delete Category"
                                      onClick={() => handleDeleteCategory(category.id)}
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

                  {/* Category Pagination */}
                  <Box>
                    <Flex justify="space-between" align="center" py={4}>
                      {/* Records per page selector */}
                      <HStack spacing={3}>
                        <Text fontSize="sm" color="gray.600">
                          Records per page:
                        </Text>
                        <Select
                          size="sm"
                          w="80px"
                          value={categoryItemsPerPage}
                          onChange={(e) => setCategoryItemsPerPage(Number(e.target.value))}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </Select>
                        <Text fontSize="sm" color="gray.600">
                          Showing {categoryStartIndex + 1}-{Math.min(categoryEndIndex, filteredCategories.length)} of {filteredCategories.length} records
                        </Text>
                      </HStack>

                      {/* Pagination buttons */}
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCategoryCurrentPage(1)}
                          isDisabled={categoryCurrentPage === 1}
                        >
                          First
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCategoryCurrentPage(categoryCurrentPage - 1)}
                          isDisabled={categoryCurrentPage === 1}
                        >
                          Previous
                        </Button>
                        
                        {/* Page numbers */}
                        <HStack spacing={1}>
                          {Array.from({ length: Math.min(5, categoryTotalPages) }, (_, i) => {
                            let pageNum;
                            if (categoryTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (categoryCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (categoryCurrentPage >= categoryTotalPages - 2) {
                              pageNum = categoryTotalPages - 4 + i;
                            } else {
                              pageNum = categoryCurrentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                size="sm"
                                variant={categoryCurrentPage === pageNum ? "solid" : "outline"}
                                colorScheme={categoryCurrentPage === pageNum ? "blue" : "gray"}
                                onClick={() => setCategoryCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </HStack>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCategoryCurrentPage(categoryCurrentPage + 1)}
                          isDisabled={categoryCurrentPage === categoryTotalPages}
                        >
                          Next
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCategoryCurrentPage(categoryTotalPages)}
                          isDisabled={categoryCurrentPage === categoryTotalPages}
                        >
                          Last
                        </Button>
                      </HStack>
                    </Flex>
                  </Box>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="purple.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingUOM ? MdEdit : MdAdd} />
              <Text>{editingUOM ? "Edit UOM" : "Create New UOM"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  UOM Name
                </FormLabel>
                <Input
                  size="md"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g., Kilogram, Meter, Liter"
                  borderRadius="md"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Category
                </FormLabel>
                <SearchableSelect
                  value={formData.category_id}
                  onChange={(value) => handleInputChange("category_id", value)}
                  options={categoriesList}
                  placeholder="Search and select category..."
                  displayKey="name"
                  valueKey="id"
                  formatOption={(category) => `${category.id} - ${category.name}`}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={onModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSubmit}
              isLoading={isLoading}
            >
              {editingUOM ? "Update UOM" : "Create UOM"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <AlertDialogOverlay />
        <AlertDialogContent borderRadius="lg">
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
            Delete UOM
          </AlertDialogHeader>
          <AlertDialogBody>
            Are you sure you want to delete this unit of measurement? This action cannot be undone.
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

      {/* Category Create/Edit Modal */}
      <Modal isOpen={isCategoryModalOpen} onClose={onCategoryModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="purple.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={editingCategory ? MdEdit : MdAdd} />
              <Text>{editingCategory ? "Edit UOM Category" : "Create New UOM Category"}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <VStack spacing="4" align="stretch">
              <FormControl isRequired>
                <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                  Category Name
                </FormLabel>
                <Input
                  size="md"
                  value={categoryFormData.name}
                  onChange={(e) => handleCategoryInputChange("name", e.target.value)}
                  placeholder="e.g., Length, Weight, Volume"
                  borderRadius="md"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={onCategoryModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCategorySubmit}
              isLoading={isLoading}
            >
              {editingCategory ? "Update Category" : "Create Category"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Category Delete Confirmation Dialog */}
      <AlertDialog isOpen={isCategoryDeleteOpen} onClose={onCategoryDeleteClose}>
        <AlertDialogOverlay />
        <AlertDialogContent borderRadius="lg">
          <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
            Delete UOM Category
          </AlertDialogHeader>
          <AlertDialogBody>
            Are you sure you want to delete this UOM category? This action cannot be undone.
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button variant="outline" onClick={onCategoryDeleteClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDeleteCategory} ml={3} isLoading={isLoading}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
