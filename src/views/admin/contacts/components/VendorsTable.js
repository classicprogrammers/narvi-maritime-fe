import {
  Flex,
  Table,
  Icon,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  VStack,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Select,
} from "@chakra-ui/react";
import React, { useMemo, useState, useRef } from "react";
import { useHistory } from "react-router-dom";
import {
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";

// Custom components
import Card from "components/card/Card";
import { useVendor } from "redux/hooks/useVendor";

// Assets
import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdUnfoldMore,
  MdFilterList,
} from "react-icons/md";

export default function VendorsTable(props) {
  const { columnsData, tableData, isLoading = false } = props;
  const history = useHistory();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({
    company: "",
    city: "",
    status: "",
    email: "",
    phone: "",
  });
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest, alphabetical
  const [showFilterFields, setShowFilterFields] = useState(false);
  const {
    updateVendor,
    deleteVendor,
    registerVendor,
    addVendorToRedux,
    updateLoading,
    deleteLoading,
    getVendors,
  } = useVendor();

  const [itemsPerPage] = useState(10);
  const [newVendor, setNewVendor] = useState({
    name: "",
    email: "",
    phone: "",
    mobile: "",
    street: "",
    city: "",
    zip: "",
    country_id: null,
  });
  const [editingVendor, setEditingVendor] = useState(null);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const cancelRef = useRef();

  const columns = useMemo(() => columnsData, [columnsData]);

  // Apply custom sorting
  const applyCustomSorting = (data) => {
    if (sortOrder === "newest") {
      return [...data].sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
    } else if (sortOrder === "oldest") {
      return [...data].sort((a, b) => new Date(a.created_at || a.id) - new Date(b.created_at || b.id));
    } else if (sortOrder === "alphabetical") {
      return [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return data;
  };

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    let filtered = tableData;

    // Apply search filter
    if (searchValue) {
      filtered = filtered.filter(
        (item) =>
          (item.name &&
            item.name.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.email &&
            item.email.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.phone && item.phone.toString().includes(searchValue)) ||
          (item.mobile && item.mobile.toString().includes(searchValue)) ||
          (item.street &&
            item.street.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.city &&
            item.city.toLowerCase().includes(searchValue.toLowerCase()))
      );
    }

    // Apply company filter
    if (filters.company) {
      filtered = filtered.filter(
        (item) => item.company && item.company.toLowerCase().includes(filters.company.toLowerCase())
      );
    }

    // Apply city filter
    if (filters.city) {
      filtered = filtered.filter(
        (item) =>
          item.city &&
          item.city.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Apply status filter (if status field exists)
    if (filters.status) {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    // Apply email filter
    if (filters.email) {
      filtered = filtered.filter(
        (item) =>
          item.email &&
          item.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }

    // Apply phone filter
    if (filters.phone) {
      filtered = filtered.filter(
        (item) =>
          (item.phone && item.phone.toString().includes(filters.phone)) ||
          (item.mobile && item.mobile.toString().includes(filters.phone))
      );
    }

    return filtered;
  }, [tableData, searchValue, filters]);

  const data = useMemo(() => {
    const sortedData = applyCustomSorting(filteredData);
    return sortedData;
  }, [filteredData, sortOrder]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: itemsPerPage },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    setPageSize,
    state: { pageIndex },
  } = tableInstance;

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const searchIconColor = useColorModeValue("gray.700", "white");
  const inputBg = useColorModeValue("white", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");
  const hoverBg = useColorModeValue("blue.50", "gray.700");
  const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
  const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
  const tableRowBg = useColorModeValue("white", "gray.800");
  const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
  const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
  const tableTextColor = useColorModeValue("gray.600", "gray.300");
  const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
  const scrollbarTrackBg = useColorModeValue("#f1f1f1", "#2d3748");
  const scrollbarThumbBg = useColorModeValue("#c1c1c1", "#4a5568");
  const scrollbarThumbHoverBg = useColorModeValue("#a8a8a8", "#718096");
  const dropdownBg = useColorModeValue("white", "gray.800");
  const dropdownText = useColorModeValue("gray.700", "gray.100");
  const dropdownHoverBg = useColorModeValue("gray.50", "gray.700");
  const dropdownBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const modalBg = useColorModeValue("white", "gray.800");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");

  const handleInputChange = (field, value) => {
    setNewVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      company: "",
      city: "",
      status: "",
      email: "",
      phone: "",
    });
  };

  const clearAllSorting = () => {
    tableInstance.setSortBy([]);
  };

  const clearAllFiltersAndSorting = () => {
    clearAllFilters();
    clearAllSorting();
    setSearchValue("");
    setSortOrder("newest");
  };

  // Get unique values for dropdowns
  const getUniqueCompanies = () => {
    const companies = tableData.map(item => item.company).filter(Boolean);
    return [...new Set(companies)].sort();
  };

  const getUniqueStatuses = () => {
    const statuses = tableData.map(item => item.status).filter(Boolean);
    return [...new Set(statuses)].sort();
  };

  const handleEditInputChange = (field, value) => {
    setEditingVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveVendor = async () => {
    // Validate required fields
    if (!newVendor.name || newVendor.name.trim() === "") {
        return;
      }

    try {
      setIsRegistering(true);
      // Call the API to register the vendor
      const result = await registerVendor(newVendor);

      if (result.success) {
        onClose();

        // Reset form
        setNewVendor({
          name: "",
          email: "",
          phone: "",
          mobile: "",
          street: "",
          city: "",
          zip: "",
          country_id: null,
        });
      }
    } catch (error) {
      // Error handling is done by the API modal system
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Check if vendor exists
      if (!editingVendor || !editingVendor.id) {
        onEditClose();
        setEditingVendor(null);
        return;
      }

      // Find the original vendor to compare changes
      const originalVendor = tableData.find(
        (v) => v.id === editingVendor.id
      );

      if (!originalVendor) {
        onEditClose();
        setEditingVendor(null);
        return;
      }

      // Validate required fields
      if (!editingVendor.name || editingVendor.name.trim() === "") {
        return;
      }

      // Check if there are any changes
      const hasChanges = Object.keys(editingVendor).some(
        (key) => editingVendor[key] !== originalVendor[key]
      );

      if (!hasChanges) {
        onEditClose();
        setEditingVendor(null);
        return;
      }

      // Call the API to update the vendor
      const result = await updateVendor(editingVendor.id, editingVendor);

      if (result.success) {
        onEditClose();
        setEditingVendor(null);
        // Refresh the vendors list to show updated data
        getVendors();
      }
      // Error handling is done by the API modal system
    } catch (error) {
      // Error handling is done by the API modal system
    }
  };

  const handleEdit = (vendor) => {
    if (!vendor || !vendor.id) {
      return;
    }
    setEditingVendor({ ...vendor });
    onEditOpen();
  };

  const handleDelete = (vendor) => {
    if (!vendor || !vendor.id) {
      return;
    }
    setVendorToDelete(vendor);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    try {
      // Check if vendor still exists
      if (!vendorToDelete || !vendorToDelete.id) {
        onDeleteClose();
        setVendorToDelete(null);
        return;
      }

      // Call the API to delete the vendor
      const result = await deleteVendor(vendorToDelete.id);

      if (result.success) {
        onDeleteClose();
        setVendorToDelete(null);
        // Refresh the vendors list to show updated data
        getVendors();
      }
      // Error handling is done by the API modal system
    } catch (error) {
      // Error handling is done by the API modal system
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setNewVendor({
      name: "",
      email: "",
      phone: "",
      mobile: "",
      street: "",
      city: "",
      zip: "",
      country_id: null,
    });
  };

  const handleCancelEdit = () => {
    onEditClose();
    setEditingVendor(null);
  };


  return (
    <>
      <Card
        direction="column"
        w="100%"
        px="0px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <Flex px="25px" justify="space-between" mb="20px" align="center">
          <Text
            color={textColor}
            fontSize="22px"
            fontWeight="700"
            lineHeight="100%"
          >
            Vendor Management
              </Text>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={() => history.push("/admin/customer-registration")}
            >
              Add Vendor
            </Button>
          </HStack>
          </Flex>

        {/* Enhanced Filter & Sort Section */}
        <Box
          px="25px"
          mb="20px"
          bg={inputBg}
          borderRadius="16px"
          p="24px"
          border="1px"
          borderColor={borderColor}
        >
          {/* Main Controls Row */}
          <HStack
            spacing={6}
            justify="space-between"
            align="center"
            flexWrap="wrap"
            mb={4}
          >
            {/* Search */}
            <Box flex="1" minW="280px">
              <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                Search Vendors
              </Text>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={MdSearch} color="blue.500" w="16px" h="16px" />
                </InputLeftElement>
                <Input
                  variant="outline"
                  fontSize="sm"
                  bg={inputBg}
                  color={inputText}
                  fontWeight="500"
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                  borderRadius="10px"
                  placeholder="Search vendors by name, email, phone, city..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  border="2px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                  }}
                />
              </InputGroup>
            </Box>

            {/* Filter Button */}
            <Box>
              <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                Advanced Filters
              </Text>
              <Button
                size="md"
                variant={
                  filters.company || filters.city || filters.status
                    ? "solid"
                    : "outline"
                }
                colorScheme={
                  filters.company || filters.city || filters.status
                    ? "blue"
                    : "gray"
                }
                leftIcon={<Icon as={MdFilterList} />}
                onClick={() => setShowFilterFields(!showFilterFields)}
                borderRadius="10px"
                border="2px"
              >
                {showFilterFields ? "Hide Filters" : "Show Filters"}
              </Button>
            </Box>

            {/* Sort Dropdown */}
            <Box>
              <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                Sort Options
              </Text>
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                size="md"
                bg={inputBg}
                color={inputText}
                borderRadius="8px"
                border="2px"
                borderColor={borderColor}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                }}
                _hover={{
                  borderColor: "blue.300",
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">A-Z Alphabetical</option>
              </Select>
            </Box>

            {/* Clear All */}
            {(filters.company ||
              filters.city ||
              filters.status ||
              sortOrder !== "newest") && (
                <Box>
                  <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                    &nbsp;
                  </Text>
              <Button
                    size="md"
                variant="outline"
                    onClick={clearAllFiltersAndSorting}
                    colorScheme="red"
                    _hover={{ bg: "red.50" }}
                    borderRadius="10px"
                    border="2px"
              >
                Clear All
              </Button>
                </Box>
              )}
            </HStack>

            {/* Expandable Filter Fields */}
            {showFilterFields && (
              <Box
                mt={4}
                pt={4}
                borderTop="2px"
                borderColor={borderColor}
              bg={expandableFilterBg}
                borderRadius="12px"
                p="20px"
              >
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={4}>
                  Filter by Specific Fields
                </Text>

              {/* First Row - Basic Info */}
                <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>

                {/* City Filter */}
                  <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    City
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                    placeholder="e.g., New York, London, Tokyo..."
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{
                        borderColor: "blue.300",
                      }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    />
                  </Box>
                </HStack>

              {/* Second Row - Contact Info */}
                <HStack spacing={6} flexWrap="wrap" align="flex-start">
                {/* Email Filter */}
                  <Box minW="250px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Email
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                    placeholder="e.g., john@company.com..."
                    value={filters.email || ""}
                      onChange={(e) =>
                      handleFilterChange("email", e.target.value)
                      }
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{
                        borderColor: "blue.300",
                      }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    />
                  </Box>

                {/* Phone Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Phone
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                    placeholder="e.g., +1-555-123-4567..."
                    value={filters.phone || ""}
                      onChange={(e) =>
                      handleFilterChange("phone", e.target.value)
                      }
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{
                        borderColor: "blue.300",
                      }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    />
                  </Box>
                </HStack>
              </Box>
            )}
          </Box>

          {/* Table Container with Horizontal Scroll */}
          <Box
            pr="25px"
            overflowX="auto"
            css={{
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
              background: useColorModeValue("#f1f1f1", "#2d3748"),
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
              background: useColorModeValue("#c1c1c1", "#4a5568"),
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
              background: useColorModeValue("#a8a8a8", "#718096"),
              },
            }}
          >
            <Table
              {...getTableProps()}
              variant="unstyled"
              size="sm"
            minW="800px"
              ml="25px"
            >
              <Thead bg={tableHeaderBg}>
                {headerGroups.map((headerGroup, index) => (
                  <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                    {headerGroup.headers.map((column, index) => (
                      <Th
                        {...column.getHeaderProps(column.getSortByToggleProps())}
                        borderRight="1px"
                        borderColor={tableBorderColor}
                        py="12px"
                        px="16px"
                        key={index}
                        fontSize="12px"
                        fontWeight="600"
                        color={tableTextColor}
                        textTransform="uppercase"
                        cursor="pointer"
                        _hover={{ bg: tableHeaderBg }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="center">
                          {column.render("Header")}
                          <Flex direction="column" align="center" ml={2}>
                            {column.isSorted ? (
                              column.isSortedDesc ? (
                                <Icon
                                  as={MdKeyboardArrowDown}
                                  color="blue.500"
                                  boxSize={4}
                                />
                              ) : (
                                <Icon
                                  as={MdKeyboardArrowUp}
                                  color="blue.500"
                                  boxSize={4}
                                />
                              )
                            ) : (
                              <Icon
                                as={MdUnfoldMore}
                                color={tableTextColorSecondary}
                                boxSize={4}
                              />
                            )}
                          </Flex>
                        </Flex>
                      </Th>
                    ))}
                  </Tr>
                ))}
              </Thead>
              <Tbody>
              {isLoading ? (
                <Tr>
                  <Td
                    colSpan={headerGroups[0]?.headers.length + 1}
                    textAlign="center"
                    py="40px"
                  >
                    <Text color={tableTextColorSecondary} fontSize="sm">
                      Loading vendors...
                    </Text>
                  </Td>
                </Tr>
              ) : page.length === 0 ? (
                <Tr>
                  <Td
                    colSpan={headerGroups[0]?.headers.length + 1}
                    textAlign="center"
                    py="40px"
                  >
                    <Text color={tableTextColorSecondary} fontSize="sm">
                      {tableData.length === 0
                        ? "No vendors available. Please check your backend connection."
                        : "No vendors match your search criteria."}
                    </Text>
                  </Td>
                </Tr>
              ) : (
                page.map((row, index) => {
                  prepareRow(row);
                  return (
                    <Tr
                      {...row.getRowProps()}
                      key={index}
                      bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                      _hover={{ bg: hoverBg }}
                      borderBottom="1px"
                      borderColor={tableBorderColor}
                    >
                      {row.cells.map((cell, index) => {
                        let data = "";
                        if (cell.column.Header === "VENDOR NAME") {
                          data = (
                            <Text
                              color={textColor}
                              fontSize="sm"
                              fontWeight="600"
                            >
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "EMAIL") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "PHONE") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "MOBILE") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "STREET") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "CITY") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "ZIP") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "COUNTRY") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "ACTIONS") {
                          data = (
                            <HStack spacing={2}>
                              <Tooltip label="Edit Vendor">
                                <IconButton
                                  icon={<Icon as={MdEdit} />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleEdit(row.original)}
                                  aria-label="Edit vendor"
                                />
                              </Tooltip>
                              <Tooltip label="Delete Vendor">
                                <IconButton
                                  icon={<Icon as={MdDelete} />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleDelete(row.original)}
                                  aria-label="Delete vendor"
                                />
                              </Tooltip>
                            </HStack>
                          );
                        } else {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {cell.value || "-"}
                            </Text>
                          );
                        }
                        return (
                          <Td
                            {...cell.getCellProps()}
                            key={index}
                            borderRight="1px"
                            borderColor={tableBorderColor}
                            py="12px"
                            px="16px"
                          >
                            {data}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })
              )}
              </Tbody>
            </Table>
          </Box>

          {/* Pagination */}
          <Flex px="25px" justify="space-between" align="center" py="20px">
            <Text fontSize="sm" color={tableTextColorSecondary}>
            Showing {pageIndex * itemsPerPage + 1} to{" "}
            {Math.min((pageIndex + 1) * itemsPerPage, data.length)} of{" "}
            {data.length} results
            </Text>
            <HStack spacing={2}>
              <Button
                size="sm"
              onClick={() => previousPage()}
                isDisabled={!canPreviousPage}
                variant="outline"
              >
                Previous
              </Button>
              <Button
                size="sm"
              onClick={() => nextPage()}
                isDisabled={!canNextPage}
              variant="outline"
              >
                Next
              </Button>
            </HStack>
          </Flex>
      </Card>

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditOpen} onClose={handleCancelEdit}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent bg={modalBg} border="1px" borderColor={modalBorder}>
          <ModalHeader
            bg={modalHeaderBg}
            borderBottom="1px"
            borderColor={modalBorder}
          >
            Edit Vendor
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
                <FormControl isRequired>
                <FormLabel>Vendor Name</FormLabel>
                  <Input
                  placeholder="e.g., John Smith, ABC Corporation..."
                  value={editingVendor?.name || ""}
                    onChange={(e) =>
                    handleEditInputChange("name", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>

                <FormControl>
                <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                  placeholder="e.g., john.smith@company.com..."
                  value={editingVendor?.email || ""}
                    onChange={(e) =>
                    handleEditInputChange("email", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>

                <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="e.g., +1-555-123-4567..."
                  value={editingVendor?.phone || ""}
                    onChange={(e) =>
                    handleEditInputChange("phone", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>

                <FormControl>
                <FormLabel>Mobile</FormLabel>
                  <Input
                  placeholder="e.g., +1-555-987-6543..."
                  value={editingVendor?.mobile || ""}
                    onChange={(e) =>
                    handleEditInputChange("mobile", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>

                <FormControl>
                <FormLabel>Street</FormLabel>
                  <Input
                  placeholder="e.g., 123 Main Street, Suite 100..."
                  value={editingVendor?.street || ""}
                    onChange={(e) =>
                    handleEditInputChange("street", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>

                <FormControl>
                <FormLabel>City</FormLabel>
                  <Input
                  placeholder="🏙️ e.g., New York, London, Tokyo..."
                  value={editingVendor?.city || ""}
                    onChange={(e) =>
                    handleEditInputChange("city", e.target.value)
                  }
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>

                <FormControl>
                <FormLabel>ZIP Code</FormLabel>
                  <Input
                  placeholder="e.g., 10001, SW1A 1AA, 100-0001..."
                  value={editingVendor?.zip || ""}
                  onChange={(e) => handleEditInputChange("zip", e.target.value)}
                  bg={inputBg}
                  color={inputText}
                  border="2px"
                  borderColor={borderColor}
                  _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                  _hover={{
                    borderColor: "blue.300",
                    }}
                  />
                </FormControl>
              </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveEdit}
              isDisabled={!editingVendor?.name || updateLoading}
              isLoading={updateLoading}
            >
              Update Vendor
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay bg="rgba(0, 0, 0, 0.6)">
          <AlertDialogContent
            bg={modalBg}
            border="1px"
            borderColor={modalBorder}
          >
            <AlertDialogHeader
              fontSize="lg"
              fontWeight="bold"
              bg={modalHeaderBg}
              borderBottom="1px"
              borderColor={modalBorder}
            >
              Delete Vendor
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{vendorToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
              Cancel
            </Button>
            <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={deleteLoading}
                isDisabled={deleteLoading}
              >
                Delete
            </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

    </>
  );
}
