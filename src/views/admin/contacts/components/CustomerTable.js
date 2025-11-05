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
  Grid,
  Textarea,
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
import { useCustomer } from "redux/hooks/useCustomer";
import { SuccessModal } from "components/modals";
import countriesAPI from "../../../../api/countries";

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
  MdVisibility,
} from "react-icons/md";

export default function CustomerTable(props) {
  const { columnsData, tableData, isLoading = false } = props;
  const history = useHistory();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({
    client_id: "",
    name: "",
    category: "",
  });
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest, alphabetical
  const [showFilterFields, setShowFilterFields] = useState(false);
  const {
    updateCustomer,
    deleteCustomer,
    registerCustomer,
    addCustomerToRedux,
    updateLoading,
    deleteLoading,
    getCustomers,
  } = useCustomer();

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    client_code: "",
    client_category: "",
    email: "",
    email2: "",
    phone: "",
    phone2: "",
    street: "",
    street2: "",
    city: "",
    zip: "",
    country_id: null,
    reg_no: "",
    website: "",
    remarks: "",
  });
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
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
  const filteredCustomers = useMemo(() => {
    let filtered = Array.isArray(tableData) ? [...tableData] : [];

    // Apply search filter
    if (searchValue) {
      filtered = filtered.filter(
        (item) =>
          (item.name &&
            item.name.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.client_code &&
            item.client_code.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.client_category &&
            item.client_category.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.street &&
            item.street.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.street2 &&
            item.street2.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.zip &&
            item.zip.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.city &&
            item.city.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.country_name &&
            item.country_name.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.reg_no &&
            item.reg_no.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.email &&
            item.email.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.email2 &&
            item.email2.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.phone && item.phone.toString().includes(searchValue)) ||
          (item.phone2 && item.phone2.toString().includes(searchValue)) ||
          (item.website &&
            item.website.toLowerCase().includes(searchValue.toLowerCase())) ||
          (item.remarks &&
            item.remarks.toLowerCase().includes(searchValue.toLowerCase()))
      );
    }

    // Apply client ID filter
    if (filters.client_id) {
      filtered = filtered.filter(
        (item) =>
          item.client_code &&
          item.client_code.toLowerCase().includes(filters.client_id.toLowerCase())
      );
    }

    // Apply name filter
    if (filters.name) {
      filtered = filtered.filter(
        (item) =>
          item.name &&
          item.name.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(
        (item) =>
          item.client_category &&
          item.client_category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    return filtered.map((item) => ({
      ...item,
      location: [item.city, item.country_name || item.country?.name]
        .filter(Boolean)
        .join(", "),
    }));
  }, [tableData, searchValue, filters]);

  const data = useMemo(() => {
    const sortedData = applyCustomSorting(filteredCustomers);
    return sortedData;
  }, [filteredCustomers, sortOrder]);

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
    setNewCustomer((prev) => ({
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
      client_id: "",
      name: "",
      category: "",
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
    setEditingCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCustomer = async () => {
    // Validate required fields
    if (!newCustomer.name || newCustomer.name.trim() === "") {
      return;
    }

    try {
      setIsRegistering(true);
      // Call the API to register the customer
      const result = await registerCustomer(newCustomer);

      if (result.success) {
        onClose();

        // Reset form
        setNewCustomer({
          name: "",
          client_code: "",
          client_category: "",
          email: "",
          email2: "",
          phone: "",
          phone2: "",
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: null,
          reg_no: "",
          website: "",
          remarks: "",
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
      // Check if customer exists
      if (!editingCustomer || !editingCustomer.id) {
        onEditClose();
        setEditingCustomer(null);
        return;
      }

      // Find the original customer to compare changes
      const originalCustomer = tableData.find(
        (c) => c.id === editingCustomer.id
      );

      if (!originalCustomer) {
        onEditClose();
        setEditingCustomer(null);
        return;
      }

      // Validate required fields
      if (!editingCustomer.name || editingCustomer.name.trim() === "") {
        return;
      }
      if (!editingCustomer.client_code || editingCustomer.client_code.trim() === "") {
        return;
      }
      if (!editingCustomer.client_category || editingCustomer.client_category.trim() === "") {
        return;
      }

      // Check if there are any changes
      const hasChanges = Object.keys(editingCustomer).some(
        (key) => editingCustomer[key] !== originalCustomer[key]
      );

      if (!hasChanges) {
        onEditClose();
        setEditingCustomer(null);
        return;
      }

      // Call the API to update the customer
      const result = await updateCustomer(editingCustomer.id, editingCustomer);

      if (result.success) {
        onEditClose();
        setEditingCustomer(null);
        // Set success message and show modal
        setSuccessMessage("Client updated successfully!");
        setIsSuccessOpen(true);
        // Refresh the customers list to show updated data
        getCustomers();
      }
      // Error handling is done by the API modal system
    } catch (error) {
      // Error handling is done by the API modal system
    }
  };

  const handleEdit = (customer) => {
    if (!customer || !customer.id) return;

    const original = Array.isArray(tableData)
      ? tableData.find((item) => String(item.id) === String(customer.id))
      : null;

    const payload = original || customer;
    // Navigate to the registration page in edit mode
    history.push('/admin/customer-registration', { client: payload, clientId: payload.id });
  };

  const handleDelete = (customer) => {
    if (!customer || !customer.id) {
      return;
    }
    setCustomerToDelete(customer);
    onDeleteOpen();
  };

  const handleView = (customer) => {
    if (!customer || !customer.id) return;
    const original = Array.isArray(tableData)
      ? tableData.find((item) => String(item.id) === String(customer.id))
      : null;

    const payload = original || customer;

    history.push(`/admin/contacts/customer/${customer.id}`, { client: payload });
  };

  const confirmDelete = async () => {
    try {
      // Check if customer still exists
      if (!customerToDelete || !customerToDelete.id) {
        onDeleteClose();
        setCustomerToDelete(null);
        return;
      }

      // Call the API to delete the customer
      const result = await deleteCustomer(customerToDelete.id);

      if (result.success) {
        onDeleteClose();
        setCustomerToDelete(null);
        // Refresh the customers list to show updated data
        getCustomers();
      }
      // Error handling is done by the API modal system
    } catch (error) {
      // Error handling is done by the API modal system
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setNewCustomer({
      name: "",
      client_code: "",
      client_category: "",
      email: "",
      email2: "",
      phone: "",
      phone2: "",
      street: "",
      street2: "",
      city: "",
      zip: "",
      country_id: null,
      reg_no: "",
      website: "",
      remarks: "",
    });
  };

  const handleCancelEdit = () => {
    onEditClose();
    setEditingCustomer(null);
  };

  // Fetch countries from API
  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await countriesAPI.getCountries();
      if (response && response.result && Array.isArray(response.result)) {
        setCountries(response.result);
      } else if (Array.isArray(response)) {
        setCountries(response);
      }
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      // Set empty array on error to prevent crashes
      setCountries([]);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Fetch countries when component mounts 
  React.useEffect(() => {
    fetchCountries();
  }, []);


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
            Client Management
          </Text>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={() => history.push("/admin/customer-registration")}
            >
              Add Client
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
                Search Clients
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
                  placeholder="Search clients by name, ID, category, address, email, phone, website, remarks..."
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
                borderColor={borderColor}
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
            {(filters.client_id ||
              filters.name ||
              filters.category ||
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
                {/* Client ID Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Client ID
                  </Text>
                  <Input
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="e.g., ACME123..."
                    value={filters.client_id}
                    onChange={(e) => handleFilterChange("client_id", e.target.value)}
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

                {/* Name Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Client Name
                  </Text>
                  <Input
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="e.g., ACME Shipping Co..."
                    value={filters.name}
                    onChange={(e) => handleFilterChange("name", e.target.value)}
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

                {/* Category Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Category
                  </Text>
                  <Select
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="Select category..."
                    value={filters.category}
                    onChange={(e) => handleFilterChange("category", e.target.value)}
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
                    <option value="">All Categories</option>
                    <option value="shipspares">Ship Spares</option>
                    <option value="bunker">Bunker</option>
                    <option value="other">Other</option>
                  </Select>
                </Box>
              </HStack>

              {/* Additional filters removed to match simplified table */}
            </Box>
          )}
        </Box>

        {/* Table Container with Horizontal Scroll */}
        <Box
          px="15px"
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
            minW="600px"
          >
            <Thead bg={tableHeaderBg}>
              {headerGroups.map((headerGroup, index) => (
                <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                  {headerGroup.headers.map((column, index) => (
                    <Th
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                      border="1px"
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
                      minW={column.minWidth || "150px"}
                      w={column.minWidth || "150px"}
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
                      Loading clients...
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
                        ? "No clients available."
                        : "No clients match your search criteria."}
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
                      border="1px"
                      borderColor={tableBorderColor}
                    >
                      {row.cells.map((cell, index) => {
                        const value = cell.value;
                        let data = (
                          <Text color={textColor} fontSize="sm">
                            {value || "-"}
                          </Text>
                        );

                        if (cell.column.Header === "CLIENT ID") {
                          data = (
                            <Text color={textColor} fontSize="sm" fontWeight="600">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "CITY / COUNTRY") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "ACTIONS") {
                          data = (
                            <HStack spacing={1}>
                              <Tooltip label="View Client">
                                <IconButton
                                  icon={<Icon as={MdVisibility} />}
                                  size="sm"
                                  colorScheme="teal"
                                  variant="ghost"
                                  onClick={() => handleView(row.original)}
                                  aria-label="View client"
                                />
                              </Tooltip>
                              <Tooltip label="Edit Client">
                                <IconButton
                                  icon={<Icon as={MdEdit} />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleEdit(row.original)}
                                  aria-label="Edit client"
                                />
                              </Tooltip>
                              <Tooltip label="Delete Client">
                                <IconButton
                                  icon={<Icon as={MdDelete} />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleDelete(row.original)}
                                  aria-label="Delete client"
                                />
                              </Tooltip>
                            </HStack>
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
                            minW={cell.column.minWidth || "150px"}
                            w={cell.column.minWidth || "150px"}
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

        {/* Enhanced Pagination */}
        <Flex px="25px" justify="space-between" align="center" py="20px" flexWrap="wrap" gap={4}>
          {/* Results Info */}
          <Text fontSize="sm" color={tableTextColorSecondary}>
            Showing {data.length === 0 ? 0 : pageIndex * itemsPerPage + 1} to {Math.min((pageIndex + 1) * itemsPerPage, data.length)} of {data.length} results
          </Text>

          {/* Pagination Controls */}
          <HStack spacing={2} align="center">
            {/* Page Size Selector */}
            <HStack spacing={2} align="center">
              <Text fontSize="sm" color={tableTextColorSecondary}>
                Show:
              </Text>
              <Select
                value={itemsPerPage}
                onChange={(e) => {
                  const newPageSize = Number(e.target.value);
                  setItemsPerPage(newPageSize);
                  setPageSize(newPageSize);
                }}
                size="sm"
                w="80px"
                bg={inputBg}
                color={inputText}
                border="1px"
                borderColor={borderColor}
                _focus={{
                  borderColor: "blue.400",
                  boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
              <Text fontSize="sm" color={tableTextColorSecondary}>
                per page
              </Text>
            </HStack>

            {/* Page Navigation */}
            <HStack spacing={1}>
              {/* First Page */}
              <Button
                size="sm"
                onClick={() => gotoPage(0)}
                isDisabled={!canPreviousPage}
                variant="outline"
                aria-label="First page"
              >
                ««
              </Button>

              {/* Previous Page */}
              <Button
                size="sm"
                onClick={() => previousPage()}
                isDisabled={!canPreviousPage}
                variant="outline"
                aria-label="Previous page"
              >
                «
              </Button>

              {/* Page Numbers */}
              {(() => {
                const pageNumbers = [];
                const totalPages = pageCount;
                const currentPage = pageIndex;
                const maxVisiblePages = 5;

                let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

                // Adjust start page if we're near the end
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(0, endPage - maxVisiblePages + 1);
                }

                for (let i = startPage; i <= endPage; i++) {
                  pageNumbers.push(
                    <Button
                      key={i}
                      size="sm"
                      onClick={() => gotoPage(i)}
                      variant={i === currentPage ? "solid" : "outline"}
                      colorScheme={i === currentPage ? "blue" : "gray"}
                      minW="40px"
                      aria-label={`Page ${i + 1}`}
                    >
                      {i + 1}
                    </Button>
                  );
                }

                return pageNumbers;
              })()}

              {/* Next Page */}
              <Button
                size="sm"
                onClick={() => nextPage()}
                isDisabled={!canNextPage}
                variant="outline"
                aria-label="Next page"
              >
                »
              </Button>

              {/* Last Page */}
              <Button
                size="sm"
                onClick={() => gotoPage(pageCount - 1)}
                isDisabled={!canNextPage}
                variant="outline"
                aria-label="Last page"
              >
                »»
              </Button>
            </HStack>

            {/* Page Info */}
            <Text fontSize="sm" color={tableTextColorSecondary}>
              Page {pageIndex + 1} of {pageCount}
            </Text>
          </HStack>
        </Flex>
      </Card>

      {/* Edit Client Modal */}
      <Modal isOpen={isEditOpen} onClose={handleCancelEdit} size="6xl">
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent bg={modalBg} border="1px" borderColor={modalBorder} maxH="90vh" overflowY="auto">
          <ModalHeader
            bg={modalHeaderBg}
            borderBottom="1px"
            borderColor={modalBorder}
          >
            Edit Client
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody py={6}>
            <VStack spacing={6}>
              {/* Basic Information Section */}
              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Basic Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl isRequired>
                    <FormLabel>Client Name</FormLabel>
                    <Input
                      placeholder="e.g., ACME Shipping Co."
                      value={editingCustomer?.name || ""}
                      onChange={(e) => handleEditInputChange("name", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Client ID</FormLabel>
                    <Input
                      placeholder="e.g., ACME123"
                      value={editingCustomer?.client_code || ""}
                      onChange={(e) => handleEditInputChange("client_code", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Client Category</FormLabel>
                    <Select
                      placeholder="Select category..."
                      value={editingCustomer?.client_category || ""}
                      onChange={(e) => handleEditInputChange("client_category", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    >
                      <option value="shipspares">Ship Spares</option>
                      <option value="bunker">Bunker</option>
                      <option value="other">Other</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Registration Number</FormLabel>
                    <Input
                      placeholder="e.g., SG12345678"
                      value={editingCustomer?.reg_no || ""}
                      onChange={(e) => handleEditInputChange("reg_no", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>
                </Grid>
              </Box>

              {/* Address Information Section */}
              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Address Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl>
                    <FormLabel>Street Address 1</FormLabel>
                    <Input
                      placeholder="e.g., 119 Airport Cargo Road"
                      value={editingCustomer?.street || ""}
                      onChange={(e) => handleEditInputChange("street", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Street Address 2</FormLabel>
                    <Input
                      placeholder="e.g., #01-03/04 Changi Cargo Megaplex"
                      value={editingCustomer?.street2 || ""}
                      onChange={(e) => handleEditInputChange("street2", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>City</FormLabel>
                    <Input
                      placeholder="e.g., Singapore"
                      value={editingCustomer?.city || ""}
                      onChange={(e) => handleEditInputChange("city", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Postal Code</FormLabel>
                    <Input
                      placeholder="e.g., 819454"
                      value={editingCustomer?.zip || ""}
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
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Country</FormLabel>
                    <Select
                      placeholder={loadingCountries ? "Loading countries..." : "Select country..."}
                      value={editingCustomer?.country_id || ""}
                      onChange={(e) => handleEditInputChange("country_id", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      isDisabled={loadingCountries}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    >
                      {countries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Box>

              {/* Contact Information Section */}
              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Contact Information
                </Text>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                  <FormControl>
                    <FormLabel>Primary Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="e.g., contact@acme.com"
                      value={editingCustomer?.email || ""}
                      onChange={(e) => handleEditInputChange("email", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Secondary Email</FormLabel>
                    <Input
                      type="email"
                      placeholder="e.g., backup@acme.com"
                      value={editingCustomer?.email2 || ""}
                      onChange={(e) => handleEditInputChange("email2", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Primary Phone</FormLabel>
                    <Input
                      placeholder="e.g., +65 1234 5678"
                      value={editingCustomer?.phone || ""}
                      onChange={(e) => handleEditInputChange("phone", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Secondary Phone</FormLabel>
                    <Input
                      placeholder="e.g., +65 9876 5432"
                      value={editingCustomer?.phone2 || ""}
                      onChange={(e) => handleEditInputChange("phone2", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Website</FormLabel>
                    <Input
                      placeholder="e.g., http://acme.com"
                      value={editingCustomer?.website || ""}
                      onChange={(e) => handleEditInputChange("website", e.target.value)}
                      bg={inputBg}
                      color={inputText}
                      border="2px"
                      borderColor={borderColor}
                      _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                      _focus={{
                        borderColor: "blue.400",
                        boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                      }}
                      _hover={{ borderColor: "blue.300" }}
                    />
                  </FormControl>
                </Grid>
              </Box>

              {/* Additional Information Section */}
              <Box w="100%">
                <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                  Additional Information
                </Text>
                <FormControl>
                  <FormLabel>Remarks</FormLabel>
                  <Textarea
                    placeholder="e.g., Preferred supplier for spare parts..."
                    value={editingCustomer?.remarks || ""}
                    onChange={(e) => handleEditInputChange("remarks", e.target.value)}
                    bg={inputBg}
                    color={inputText}
                    border="2px"
                    borderColor={borderColor}
                    rows={3}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                    _focus={{
                      borderColor: "blue.400",
                      boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                    }}
                    _hover={{ borderColor: "blue.300" }}
                  />
                </FormControl>
              </Box>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveEdit}
              isDisabled={!editingCustomer?.name || !editingCustomer?.client_code || !editingCustomer?.client_category || updateLoading}
              isLoading={updateLoading}
            >
              Update Client
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        title="Client Updated Successfully!"
        message={successMessage}
      />

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
              Delete Client
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{customerToDelete?.name}"? This
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
