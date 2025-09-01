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
  Select,
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
  Textarea,
  Grid,
} from "@chakra-ui/react";
import React, { useMemo, useState } from "react";
import {
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
} from "react-table";

// Custom components
import Card from "components/card/Card";

// Assets
import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdFilterList,
} from "react-icons/md";

// API
import { buildApiUrl, getApiEndpoint } from "../../../../config/api";
import api from "../../../../api/axios";

export default function VendorsTable(props) {
  const { columnsData } = props;
  const [searchValue, setSearchValue] = useState("");
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // kept for future loading states
  const [filters, setFilters] = useState({
    email: "",
    phone: "",
    mobile: "",
    street: "",
    zip: "",
  });
  const [showFilterFields, setShowFilterFields] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: "",
    reg_no: "",
    email: "",
    email2: "",
    phone: "",
    phone2: "",
    mobile: "",
    street: "",
    street2: "",
    city: "",
    zip: "",
    country_id: "",
    website: "",
    pic: "",
    agency_type: "",
    address_type: "",
    remarks: "",
    warning_notes: "",
  });
  const [editingVendor, setEditingVendor] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const columns = useMemo(() => columnsData, [columnsData]);

  // Fetch vendors from API
  const fetchVendors = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching vendors from API...");

      const response = await api.get("/api/vendor/list");
      const result = response.data;
      console.log("Vendors API Response:", result);

      if (result.vendors && Array.isArray(result.vendors)) {
        setVendors(result.vendors);
      } else {
        setVendors([]);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load vendors on component mount
  React.useEffect(() => {
    fetchVendors();
  }, []);

  // Filter data based on search
  const filteredData = useMemo(() => {
    let filtered = vendors;

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
          (item.zip && item.zip.toString().includes(searchValue))
      );
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

    // Apply mobile filter
    if (filters.mobile) {
      filtered = filtered.filter(
        (item) => item.mobile && item.mobile.toString().includes(filters.mobile)
      );
    }

    // Apply street filter
    if (filters.street) {
      filtered = filtered.filter(
        (item) =>
          item.street &&
          item.street.toLowerCase().includes(filters.street.toLowerCase())
      );
    }

    // Apply zip filter
    if (filters.zip) {
      filtered = filtered.filter(
        (item) => item.zip && item.zip.toString().includes(filters.zip)
      );
    }

    return filtered;
  }, [vendors, searchValue, filters]);

  const data = useMemo(() => filteredData, [filteredData]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 },
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
    previousPage,
    nextPage,
    canPreviousPage,
    canNextPage,
    pageIndex,
    pageOptions,
  } = tableInstance || {};

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const searchIconColor = useColorModeValue("gray.700", "white");
  const inputBg = useColorModeValue("secondaryGray.300", "navy.900");
  const inputText = useColorModeValue("gray.700", "gray.100");

  const handleInputChange = (field, value) => {
    setNewVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Filter handling functions
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      email: "",
      phone: "",
      mobile: "",
      street: "",
      zip: "",
    });
  };

  const clearAllFiltersAndSearch = () => {
    clearAllFilters();
    setSearchValue("");
  };

  // Vendor Registration API
  const handleVendorRegistrationApi = async (vendorData) => {
    try {
      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      let userId = null;

      if (userData) {
        try {
          const user = JSON.parse(userData);
          userId = user.id;
        } catch (parseError) {
          console.warn(
            "Failed to parse user data from localStorage:",
            parseError
          );
        }
      }

      // Add user_id to vendor data and coerce numeric fields expected by backend
      const payload = {
        ...vendorData,
        user_id: userId,
      };
      if (
        payload &&
        payload.country_id !== undefined &&
        payload.country_id !== null &&
        payload.country_id !== ""
      ) {
        const parsedCountryId = parseInt(payload.country_id, 10);
        if (!Number.isNaN(parsedCountryId)) {
          payload.country_id = parsedCountryId;
        }
      }

      console.log("Vendor Registration API Payload:", payload);
      console.log("API URL:", buildApiUrl(getApiEndpoint("VENDOR_REGISTER")));

      // Try different endpoint and method combinations
      let response;
      let lastError;

      // Try multiple combinations until one works
      const attempts = [
        { method: "post", endpoint: "/api/vendor/register" },
        { method: "put", endpoint: "/api/vendor/register" },
        { method: "patch", endpoint: "/api/vendor/register" },
        { method: "post", endpoint: "/api/vendor/create" },
        { method: "post", endpoint: "/api/vendors" },
        { method: "put", endpoint: "/api/vendors" },
        { method: "post", endpoint: "/api/vendor" },
      ];

      for (const attempt of attempts) {
        try {
          console.log(
            `Trying ${attempt.method.toUpperCase()} ${attempt.endpoint}`
          );
          response = await api[attempt.method](attempt.endpoint, payload);
          console.log(
            `Success with ${attempt.method.toUpperCase()} ${attempt.endpoint}`
          );
          break;
        } catch (error) {
          lastError = error;
          console.log(
            `Failed ${attempt.method.toUpperCase()} ${attempt.endpoint}:`,
            error.response?.status
          );
          continue;
        }
      }

      if (!response) {
        throw lastError;
      }
      const result = response.data;
      console.log("Vendor Registration API Response:", result);

      // Simple success check - handle both response formats safely
      if (
        (result && result.status === "success") ||
        (result && result.success) ||
        (result && result.result && result.result.status === "success")
      ) {
        return result;
      } else {
        const errorMessage =
          result?.result?.message ||
          result?.message ||
          "Vendor registration failed";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Vendor Registration API failed:", error);
      throw error;
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditingVendor((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveVendor = async () => {
    try {
      console.log("Saving new vendor:", newVendor);
      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      let userId = null;

      if (userData) {
        try {
          const user = JSON.parse(userData);
          userId = user.id;
        } catch (parseError) {
          console.warn(
            "Failed to parse user data from localStorage:",
            parseError
          );
        }
      }

      // Prepare minimal payload with only required fields
      const payload = {
        user_id: userId,
        name: newVendor.name,
        email: newVendor.email,
        phone: newVendor.phone,
        street: newVendor.street,
        zip: newVendor.zip,
      };

      // Add optional fields only if they have values
      if (newVendor.city) payload.city = newVendor.city;
      if (newVendor.country_id)
        payload.country_id = parseInt(newVendor.country_id);
      if (newVendor.reg_no) payload.reg_no = newVendor.reg_no;
      if (newVendor.email2) payload.email2 = newVendor.email2;
      if (newVendor.phone2) payload.phone2 = newVendor.phone2;
      if (newVendor.street2) payload.street2 = newVendor.street2;
      if (newVendor.website) payload.website = newVendor.website;
      if (newVendor.pic) payload.pic = newVendor.pic;
      if (newVendor.remarks) payload.remarks = newVendor.remarks;
      if (newVendor.warning_notes)
        payload.warning_notes = newVendor.warning_notes;

      // Use the correct vendor registration endpoint
      console.log("Calling API with payload:", payload);
      const response = await api.post("/api/vendor/register", payload);
      const result = response.data;
      fetchVendors();
      console.log("API Response:", result);

      // Check for error in response
      if (result && result.result && result.result.status === "error") {
        console.error("API Error:", result.result);
        alert(
          `Error: ${result.result.message}\nDetails: ${result.result.details}`
        );
        return;
      }

      // Handle response - check for success
      if (
        result &&
        (result.status === "success" ||
          result.result?.status === "success" ||
          result.success)
      ) {
        console.log("Vendor registered successfully:", result);
        alert("Vendor registered successfully!");

        // Add the new vendor to the local state with API response ID if available
        const newVendorWithId = {
          ...payload,
          id: result.id || result.result?.id || Date.now(),
        };
        setVendors((prevVendors) => [...prevVendors, newVendorWithId]);

        // Close modal and reset form
        onClose();
        setNewVendor({
          name: "",
          reg_no: "",
          email: "",
          email2: "",
          phone: "",
          phone2: "",
          mobile: "",
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: "",
          website: "",
          pic: "",
          agency_type: "",
          address_type: "",
          remarks: "",
          warning_notes: "",
        });
      } else if (result && (result.status === "success" || result.success)) {
        // Handle direct response format
        console.log("Vendor registered successfully:", result);
        alert("Vendor registered successfully!");

        // Close modal and reset form
        onClose();
        setNewVendor({
          name: "",
          reg_no: "",
          email: "",
          email2: "",
          phone: "",
          phone2: "",
          mobile: "",
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: "",
          website: "",
          pic: "",
          agency_type: "",
          address_type: "",
          remarks: "",
          warning_notes: "",
        });

        // Refresh vendors list to show the new vendor
        fetchVendors();
      } else {
        // Close modal and reset form without local optimistic add
        onClose();
        setNewVendor({
          name: "",
          reg_no: "",
          email: "",
          email2: "",
          phone: "",
          phone2: "",
          mobile: "",
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: "",
          website: "",
          pic: "",
          agency_type: "",
          address_type: "",
          remarks: "",
          warning_notes: "",
        });
      }
    } catch (error) {
      console.error("Failed to register vendor:", error);
      onClose();
      setNewVendor({
        name: "",
        reg_no: "",
        email: "",
        email2: "",
        phone: "",
        phone2: "",
        mobile: "",
        street: "",
        street2: "",
        city: "",
        zip: "",
        country_id: "",
        website: "",
        pic: "",
        agency_type: "",
        address_type: "",
        remarks: "",
        warning_notes: "",
      });
    }
  };

  const handleSaveEdit = async () => {
    try {
      console.log("Updating vendor:", editingVendor);

      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      let userId = null;

      if (userData) {
        try {
          const user = JSON.parse(userData);
          userId = user.id;
        } catch (parseError) {
          console.warn(
            "Failed to parse user data from localStorage:",
            parseError
          );
        }
      }

      // Add user_id to vendor update data with proper data types and validation
      const payload = {
        ...editingVendor,
        user_id: userId,
        vendor_id: editingVendor.id,
        country_id: editingVendor.country_id
          ? parseInt(editingVendor.country_id)
          : null,
        address_type: "contact", // Fixed value that backend accepts
      };

      console.log("Vendor Update API Payload:", payload);
      console.log("API URL:", buildApiUrl(getApiEndpoint("VENDOR_UPDATE")));

      const response = await api.post(getApiEndpoint("VENDOR_UPDATE"), payload);
      const result = response.data;
      // Refresh vendors list to show the updated vendor
      fetchVendors();

      // Simple success check - handle both response formats safely
      if (
        (result && result.status === "success") ||
        (result && result.success)
      ) {
        console.log("Vendor updated successfully:", result);
        alert("Vendor updated successfully!");

        // Close edit modal
        onEditClose();
        setEditingVendor(null);
      } else {
        const errorMessage =
          result?.result?.message || result?.message || "Vendor update failed";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Failed to update vendor:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor({ ...vendor });
    onEditOpen();
  };

  const handleDeleteVendor = async (vendor) => {
    try {
      console.log("Deleting vendor:", vendor);

      const response = await api.post(getApiEndpoint("VENDOR_DELETE"), {
        vendor_id: vendor.id,
      });
      const result = response.data;
      console.log("Vendor Delete API Response:", result);

      // Refresh vendors list to remove the deleted vendor
      fetchVendors();
      // Simple success check - handle both response formats safely
      if (
        result &&
        result.result &&
        (result.result.status === "success" || result.result.success)
      ) {
        console.log("Vendor deleted successfully:", result);
        alert("Vendor deleted successfully!");

        // Refresh vendors list to remove the deleted vendor
        fetchVendors();
      } else if (result && (result.status === "success" || result.success)) {
        // Handle direct response format
        console.log("Vendor deleted successfully:", result);
        alert("Vendor deleted successfully!");
      } else {
        const errorMessage =
          result?.result?.message ||
          result?.message ||
          "Vendor deletion failed";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      const errorMessage =
        error?.result?.message ||
        error?.message ||
        "Unknown error occurred during deletion";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setNewVendor({
      name: "",
      reg_no: "",
      email: "",
      email2: "",
      phone: "",
      phone2: "",
      mobile: "",
      street: "",
      street2: "",
      city: "",
      zip: "",
      country_id: "",
      website: "",
      pic: "",
      agency_type: "",
      address_type: "",
      remarks: "",
      warning_notes: "",
    });
  };

  const handleCancelEdit = () => {
    onEditClose();
    setEditingVendor(null);
  };

  return (
    <>
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
        <VStack spacing={6} align="stretch">
          {/* Header Section */}
          <Flex justify="space-between" align="center" px="25px">
            <HStack spacing={4}>
              <Button
                leftIcon={<Icon as={MdAdd} />}
                colorScheme="blue"
                size="sm"
                onClick={onOpen}
              >
                New Vendor
              </Button>
              <VStack align="start" spacing={1}>
                <Text fontSize="xl" fontWeight="bold" color="blue.600">
                  Vendor Management
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Manage vendor information and contacts
                </Text>
              </VStack>
            </HStack>

            <HStack spacing={4}>
              <HStack spacing={2}>
                <Text fontSize="sm" color="gray.600">
                  {vendors.length} vendors
                </Text>
              </HStack>
            </HStack>
          </Flex>

          {/* Filter Section */}
          <Box px="25px" mb="20px">
            <HStack spacing={4} flexWrap="wrap">
              <InputGroup w={{ base: "100%", md: "300px" }}>
                <InputLeftElement>
                  <Icon
                    as={MdSearch}
                    color={searchIconColor}
                    w="15px"
                    h="15px"
                  />
                </InputLeftElement>
                <Input
                  variant="outline"
                  fontSize="sm"
                  bg={inputBg}
                  color={inputText}
                  fontWeight="500"
                  _placeholder={{ color: "gray.400", fontSize: "14px" }}
                  borderRadius="8px"
                  placeholder="Search vendors..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </InputGroup>

              <Button
                leftIcon={<Icon as={MdFilterList} />}
                variant="outline"
                size="sm"
                borderRadius="8px"
                onClick={() => setShowFilterFields(!showFilterFields)}
              >
                {showFilterFields ? "Hide Filters" : "Show Filters"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                borderRadius="8px"
                onClick={clearAllFiltersAndSearch}
              >
                Clear All
              </Button>
            </HStack>

            {/* Expandable Filter Fields */}
            {showFilterFields && (
              <Box
                mt={4}
                pt={4}
                borderTop="2px"
                borderColor={borderColor}
                bg={inputBg}
                borderRadius="12px"
                p="20px"
              >
                <Text fontSize="sm" fontWeight="600" color={textColor} mb={4}>
                  Filter by Specific Fields
                </Text>

                {/* First Row - Contact Info */}
                <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                  {/* Email Filter */}
                  <Box minW="200px" flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={textColor}
                      mb={2}
                    >
                      Email
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="📧 e.g., vendor@example.com"
                      value={filters.email}
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
                    />
                  </Box>

                  {/* Phone Filter */}
                  <Box minW="200px" flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={textColor}
                      mb={2}
                    >
                      Phone
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="📞 e.g., +1-234-567-8900"
                      value={filters.phone}
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
                    />
                  </Box>

                  {/* Mobile Filter */}
                  <Box minW="200px" flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={textColor}
                      mb={2}
                    >
                      Mobile
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="📱 e.g., +1-234-567-8900"
                      value={filters.mobile}
                      onChange={(e) =>
                        handleFilterChange("mobile", e.target.value)
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
                    />
                  </Box>
                </HStack>

                {/* Second Row - Address Info */}
                <HStack spacing={6} flexWrap="wrap" align="flex-start">
                  {/* Street Filter */}
                  <Box minW="250px" flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={textColor}
                      mb={2}
                    >
                      Street
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="🏠 e.g., 123 Main Street"
                      value={filters.street}
                      onChange={(e) =>
                        handleFilterChange("street", e.target.value)
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
                    />
                  </Box>

                  {/* Zip Filter */}
                  <Box minW="150px" flex="1">
                    <Text
                      fontSize="sm"
                      fontWeight="500"
                      color={textColor}
                      mb={2}
                    >
                      ZIP Code
                    </Text>
                    <Input
                      variant="outline"
                      fontSize="sm"
                      bg={inputBg}
                      color={inputText}
                      borderRadius="8px"
                      placeholder="📮 e.g., 12345"
                      value={filters.zip}
                      onChange={(e) =>
                        handleFilterChange("zip", e.target.value)
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
                    />
                  </Box>
                </HStack>
              </Box>
            )}
          </Box>

          {/* Vendor Table */}
          <Box px="25px">
            <Box
              maxH="400px"
              overflowY="auto"
              border="1px"
              borderColor="gray.200"
              borderRadius="8px"
              sx={{
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "gray.100",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "gray.300",
                  borderRadius: "4px",
                  "&:hover": {
                    background: "gray.400",
                  },
                },
              }}
            >
              <Table
                {...getTableProps()}
                variant="simple"
                color="gray.500"
                mb="24px"
                size="sm"
              >
                <Thead>
                  {headerGroups.map((headerGroup, index) => (
                    <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                      {headerGroup.headers.map((column, index) => (
                        <Th
                          {...column.getHeaderProps(
                            column.getSortByToggleProps()
                          )}
                          pe="10px"
                          key={index}
                          borderColor={borderColor}
                          minW="120px"
                          maxW="200px"
                          whiteSpace="nowrap"
                          textOverflow="ellipsis"
                          overflow="hidden"
                          bg="gray.50"
                          position="sticky"
                          top="0"
                          zIndex="2"
                        >
                          <Flex
                            justify="space-between"
                            align="center"
                            fontSize={{ sm: "11px", lg: "12px" }}
                            color="gray.600"
                            fontWeight="600"
                          >
                            {column.render("Header")}
                          </Flex>
                        </Th>
                      ))}
                    </Tr>
                  ))}
                </Thead>
                <Tbody {...getTableBodyProps()}>
                  {page.map((row, index) => {
                    prepareRow(row);
                    return (
                      <Tr {...row.getRowProps()} key={index}>
                        {row.cells.map((cell, index) => {
                          let data = "";
                          if (cell.column.Header === "VENDOR NAME") {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
                              </Text>
                            );
                          } else if (cell.column.Header === "EMAIL") {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
                              </Text>
                            );
                          } else if (cell.column.Header === "PHONE") {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
                              </Text>
                            );
                          } else if (cell.column.Header === "MOBILE") {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
                              </Text>
                            );
                          } else if (cell.column.Header === "STREET") {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
                              </Text>
                            );
                          } else if (cell.column.Header === "ZIP") {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
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
                                    onClick={() =>
                                      handleDeleteVendor(row.original)
                                    }
                                    aria-label="Delete vendor"
                                  />
                                </Tooltip>
                              </HStack>
                            );
                          } else {
                            data = (
                              <Text
                                color={textColor}
                                fontSize="sm"
                                fontWeight="700"
                              >
                                {cell.value}
                              </Text>
                            );
                          }
                          return (
                            <Td
                              {...cell.getCellProps()}
                              key={index}
                              fontSize={{ sm: "13px", md: "14px" }}
                              minW="120px"
                              maxW="200px"
                              whiteSpace="nowrap"
                              textOverflow="ellipsis"
                              overflow="hidden"
                              borderColor="gray.100"
                              py="12px"
                              px="16px"
                            >
                              {data}
                            </Td>
                          );
                        })}
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Pagination */}
          <Flex px="25px" justify="space-between" align="center" py="20px">
            <Text fontSize="sm" color="gray.500">
              Showing {page?.length || 0} of {vendors.length} results
            </Text>
            <HStack spacing={2}>
              <Button
                size="sm"
                onClick={previousPage}
                isDisabled={!canPreviousPage}
                variant="outline"
              >
                Previous
              </Button>
              <Button size="sm" onClick={nextPage} variant="outline">
                Next
              </Button>
            </HStack>
          </Flex>
        </VStack>
      </Box>

      {/* Add Vendor Modal */}
      <Modal isOpen={isOpen} onClose={handleCancel} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="blue.600" color="white" borderRadius="md">
            <HStack spacing={3}>
              <Icon as={MdAdd} />
              <Text>Create New Vendor</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody py="6">
            <Grid templateColumns="repeat(2, 1fr)" gap="8">
              {/* Left Column */}
              <VStack spacing="4" align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Vendor Name
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter vendor name"
                    value={newVendor.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Registration No
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter registration no / type"
                    value={newVendor.reg_no}
                    onChange={(e) =>
                      handleInputChange("reg_no", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Email
                  </FormLabel>
                  <Input
                    size="md"
                    type="email"
                    placeholder="Enter email address"
                    value={newVendor.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Alternate Email
                  </FormLabel>
                  <Input
                    size="md"
                    type="email"
                    placeholder="Enter secondary email"
                    value={newVendor.email2}
                    onChange={(e) =>
                      handleInputChange("email2", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Remarks
                  </FormLabel>
                  <Textarea
                    placeholder="Enter remarks"
                    value={newVendor.remarks}
                    onChange={(e) =>
                      handleInputChange("remarks", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Warning Notes
                  </FormLabel>
                  <Textarea
                    placeholder="Enter warning notes"
                    value={newVendor.warning_notes}
                    onChange={(e) =>
                      handleInputChange("warning_notes", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>
              </VStack>

              {/* Right Column */}
              <VStack spacing="4" align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Phone
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter phone number"
                    value={newVendor.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Alternate Phone
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter alternate phone"
                    value={newVendor.phone2}
                    onChange={(e) =>
                      handleInputChange("phone2", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Mobile
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter mobile number"
                    value={newVendor.mobile}
                    onChange={(e) =>
                      handleInputChange("mobile", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Street
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter street address"
                    value={newVendor.street}
                    onChange={(e) =>
                      handleInputChange("street", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Street 2
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter street address line 2"
                    value={newVendor.street2}
                    onChange={(e) =>
                      handleInputChange("street2", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    City
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter city"
                    value={newVendor.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Zip
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter zip code"
                    value={newVendor.zip}
                    onChange={(e) => handleInputChange("zip", e.target.value)}
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Country
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter country ID"
                    value={newVendor.country_id}
                    onChange={(e) =>
                      handleInputChange("country_id", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Website
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Enter website"
                    value={newVendor.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    PIC
                  </FormLabel>
                  <Input
                    size="md"
                    placeholder="Person in Charge"
                    value={newVendor.pic}
                    onChange={(e) => handleInputChange("pic", e.target.value)}
                    borderRadius="md"
                    _focus={{
                      borderColor: "blue.500",
                      boxShadow: "0 0 0 1px blue.500",
                    }}
                  />
                </FormControl>
              </VStack>
            </Grid>
          </ModalBody>

          <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
            <Button variant="outline" mr={3} onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveVendor}
              isDisabled={
                !newVendor.name ||
                !newVendor.email ||
                !newVendor.phone ||
                !newVendor.mobile ||
                !newVendor.street ||
                !newVendor.zip
              }
            >
              Create Vendor
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Vendor Modal */}
      <Modal isOpen={isEditOpen} onClose={handleCancelEdit}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Vendor</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Vendor Name</FormLabel>
                <Input
                  placeholder="Enter vendor name"
                  value={editingVendor?.name || ""}
                  onChange={(e) =>
                    handleEditInputChange("name", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Registration No</FormLabel>
                <Input
                  placeholder="Enter registration no / type"
                  value={editingVendor?.reg_no || ""}
                  onChange={(e) =>
                    handleEditInputChange("reg_no", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={editingVendor?.email || ""}
                  onChange={(e) =>
                    handleEditInputChange("email", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Alternate Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter secondary email"
                  value={editingVendor?.email2 || ""}
                  onChange={(e) =>
                    handleEditInputChange("email2", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="Enter phone number"
                  value={editingVendor?.phone || ""}
                  onChange={(e) =>
                    handleEditInputChange("phone", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Alternate Phone</FormLabel>
                <Input
                  placeholder="Enter alternate phone"
                  value={editingVendor?.phone2 || ""}
                  onChange={(e) =>
                    handleEditInputChange("phone2", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Mobile</FormLabel>
                <Input
                  placeholder="Enter mobile number"
                  value={editingVendor?.mobile || ""}
                  onChange={(e) =>
                    handleEditInputChange("mobile", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Street</FormLabel>
                <Input
                  placeholder="Enter street address"
                  value={editingVendor?.street || ""}
                  onChange={(e) =>
                    handleEditInputChange("street", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Street 2</FormLabel>
                <Input
                  placeholder="Enter street address line 2"
                  value={editingVendor?.street2 || ""}
                  onChange={(e) =>
                    handleEditInputChange("street2", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>City</FormLabel>
                <Input
                  placeholder="Enter city"
                  value={editingVendor?.city || ""}
                  onChange={(e) =>
                    handleEditInputChange("city", e.target.value)
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Zip</FormLabel>
                <Input
                  placeholder="Enter zip code"
                  value={editingVendor?.zip || ""}
                  onChange={(e) => handleEditInputChange("zip", e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Country</FormLabel>
                <Input
                  placeholder="Enter country ID"
                  value={editingVendor?.country_id || ""}
                  onChange={(e) =>
                    handleEditInputChange("country_id", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Website</FormLabel>
                <Input
                  placeholder="Enter website"
                  value={editingVendor?.website || ""}
                  onChange={(e) =>
                    handleEditInputChange("website", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>PIC</FormLabel>
                <Input
                  placeholder="Person in Charge"
                  value={editingVendor?.pic || ""}
                  onChange={(e) => handleEditInputChange("pic", e.target.value)}
                />
              </FormControl>

              {/* Agency Type and Address Type removed to avoid backend errors */}

              <FormControl>
                <FormLabel>Remarks</FormLabel>
                <Textarea
                  placeholder="Enter remarks"
                  value={editingVendor?.remarks || ""}
                  onChange={(e) =>
                    handleEditInputChange("remarks", e.target.value)
                  }
                />
              </FormControl>

              <FormControl>
                <FormLabel>Warning Notes</FormLabel>
                <Textarea
                  placeholder="Enter warning notes"
                  value={editingVendor?.warning_notes || ""}
                  onChange={(e) =>
                    handleEditInputChange("warning_notes", e.target.value)
                  }
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
              isDisabled={
                !editingVendor?.name ||
                !editingVendor?.email ||
                !editingVendor?.phone ||
                !editingVendor?.mobile ||
                !editingVendor?.street ||
                !editingVendor?.zip
              }
            >
              Update Vendor
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
