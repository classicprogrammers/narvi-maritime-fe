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
  MdCheckCircle,
  MdCancel,
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdFilterList,
} from "react-icons/md";

// API
import {
  buildApiUrl,
  getApiEndpoint,
  API_CONFIG,
} from "../../../../config/api";

export default function VendorsTable(props) {
  const { columnsData, tableData } = props;
  const [searchValue, setSearchValue] = useState("");
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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
    email: "",
    phone: "",
    mobile: "",
    street: "",
    zip: "",
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

      // Get user token from localStorage for authentication
      const userToken = localStorage.getItem("token");
      if (!userToken) {
        throw new Error("User not authenticated. Please login again.");
      }

      // Create headers with authentication token
      const headers = {
        ...API_CONFIG.DEFAULT_HEADERS,
        Authorization: `Bearer ${userToken}`,
        "X-User-Token": userToken,
      };

      console.log("🔧 Fetching vendors from API...");

      // Try the main API endpoint first
      try {
        const response = await fetch(buildApiUrl(getApiEndpoint("VENDORS")), {
          method: "GET",
          headers: headers,
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          const error = new Error(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`
          );
          error.status = response.status;
          throw error;
        }

        const result = await response.json();
        console.log("🔧 Vendors API Response:", result);

        if (result.vendors && Array.isArray(result.vendors)) {
          setVendors(result.vendors);
        } else {
          setVendors([]);
        }
        return;
      } catch (mainError) {
        // If main endpoint fails, try alternative backend URLs
        if (
          mainError.name === "TypeError" &&
          mainError.message.includes("Failed to fetch")
        ) {
          console.log("🔧 Main endpoint failed, trying alternative URLs...");

          const alternativeUrls = [
            "http://localhost:8069",
            "http://127.0.0.1:8069",
            "http://3.6.118.75:8069",
          ];

          for (const baseUrl of alternativeUrls) {
            try {
              console.log(`🔧 Trying ${baseUrl}...`);
              const url = `${baseUrl}/api/vendors`;

              const response = await fetch(url, {
                method: "GET",
                headers: headers,
              });

              if (response.ok) {
                const result = await response.json();
                console.log("🔧 Alternative backend worked:", result);

                if (result.vendors && Array.isArray(result.vendors)) {
                  setVendors(result.vendors);
                  return;
                }
              }
            } catch (altError) {
              console.log(`🔧 ${baseUrl} failed:`, altError.message);
              continue;
            }
          }
        }

        throw mainError;
      }
    } catch (error) {
      console.error("🔧 Failed to fetch vendors:", error);

      // Provide more specific error messages
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        console.error(
          "🔧 CORS or network error. Please check backend server and CORS configuration."
        );
      }

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
          item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.email.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.phone.includes(searchValue) ||
          item.mobile.includes(searchValue) ||
          item.street.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.zip.includes(searchValue)
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
      initialState: { pageIndex: 0, pageSize: 5 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const { getTableProps, getTableBodyProps, headerGroups, page, prepareRow } =
    tableInstance;

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

  // Vendor Registration API call function
  const handleVendorRegistrationApi = async (vendorData) => {
    try {
      // Get user token from localStorage for authentication
      const userToken = localStorage.getItem("token");
      if (!userToken) {
        throw new Error("User not authenticated. Please login again.");
      }

      // Get user ID from localStorage
      const userData = localStorage.getItem("user");
      if (!userData) {
        throw new Error("User data not found. Please login again.");
      }

      const user = JSON.parse(userData);
      const userId = user.id;

      // Create headers with authentication token
      const headers = {
        ...API_CONFIG.DEFAULT_HEADERS,
        Authorization: `Bearer ${userToken}`,
        "X-User-Token": userToken,
      };

      // Prepare vendor data with user_id
      const payload = {
        ...vendorData,
        user_id: userId,
      };

      console.log("🔧 Vendor Registration API Payload:", payload);
      console.log(
        "🔧 API URL:",
        buildApiUrl(getApiEndpoint("VENDOR_REGISTER"))
      );

      // Try the main API endpoint first
      try {
        const response = await fetch(
          buildApiUrl(getApiEndpoint("VENDOR_REGISTER")),
          {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
          }
        );

        console.log("🔧 Response status:", response.status);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "Unknown error" }));
          const error = new Error(
            errorData.message ||
              `HTTP ${response.status}: ${response.statusText}`
          );
          error.status = response.status;
          throw error;
        }

        const result = await response.json();
        console.log("🔧 Vendor Registration API Response:", result);

        // Check if the JSON-RPC response indicates an error
        if (result.result && result.result.status === "error") {
          throw new Error(
            result.result.message || "Vendor registration failed"
          );
        }

        // Check if the response has the expected structure
        if (!result.result || result.result.status !== "success") {
          throw new Error("Invalid response from server");
        }

        return result;
      } catch (mainError) {
        // If main endpoint fails, try alternative backend URLs
        if (
          mainError.name === "TypeError" &&
          mainError.message.includes("Failed to fetch")
        ) {
          console.log("🔧 Main endpoint failed, trying alternative URLs...");

          const alternativeUrls = [
            "http://localhost:8069",
            "http://127.0.0.1:8069",
            "http://3.6.118.75:8069",
          ];

          for (const baseUrl of alternativeUrls) {
            try {
              console.log(`🔧 Trying ${baseUrl}...`);
              const url = `${baseUrl}/api/vendor/register`;

              const response = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload),
              });

              if (response.ok) {
                const result = await response.json();
                console.log("🔧 Alternative backend worked:", result);

                if (result.result && result.result.status === "success") {
                  return result;
                }
              }
            } catch (altError) {
              console.log(`🔧 ${baseUrl} failed:`, altError.message);
              continue;
            }
          }
        }

        throw mainError;
      }
    } catch (error) {
      console.error("🔧 Vendor Registration API failed:", error);

      // Provide more specific error messages
      if (
        error.name === "TypeError" &&
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
        );
      }

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

      // Call the vendor registration API
      const result = await handleVendorRegistrationApi(newVendor);

      if (result && result.result && result.result.status === "success") {
        console.log("Vendor registered successfully:", result);

        // Show success message (you can add a toast or modal here)
        alert("Vendor registered successfully!");

        // Close modal and reset form
        onClose();
        setNewVendor({
          name: "",
          email: "",
          phone: "",
          mobile: "",
          street: "",
          zip: "",
        });

        // Refresh vendors list to show the new vendor
        fetchVendors();
      } else {
        alert("Vendor registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Failed to register vendor:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSaveEdit = () => {
    // Here you would typically update your backend
    console.log("Updating vendor:", editingVendor);

    onEditClose();
    setEditingVendor(null);
  };

  const handleEdit = (vendor) => {
    setEditingVendor({ ...vendor });
    onEditOpen();
  };

  const handleDelete = (vendor) => {
    // Here you would typically delete from your backend
    console.log("Deleting vendor:", vendor);

    // For demo purposes, just log the action
    // In a real app, you'd remove the vendor from your data source
    alert(`Vendor "${vendor.name}" would be deleted`);
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
      zip: "",
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
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            size="sm"
            onClick={onOpen}
          >
            Add Vendor
          </Button>
        </Flex>

        {/* Filter Section */}
        <Box px="25px" mb="20px">
          <HStack spacing={4} flexWrap="wrap">
            <InputGroup w={{ base: "100%", md: "300px" }}>
              <InputLeftElement>
                <Icon as={MdSearch} color={searchIconColor} w="15px" h="15px" />
              </InputLeftElement>
              <Input
                variant="search"
                fontSize="sm"
                bg={inputBg}
                color={inputText}
                fontWeight="500"
                _placeholder={{ color: "gray.400", fontSize: "14px" }}
                borderRadius="30px"
                placeholder="Search vendors..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </InputGroup>

            {/* Filter Button */}
            <Box>
              <Button
                size="md"
                variant={showFilterFields ? "solid" : "outline"}
                colorScheme={
                  filters.email ||
                  filters.phone ||
                  filters.mobile ||
                  filters.street ||
                  filters.zip
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

            {/* Clear All Button */}
            {(filters.email ||
              filters.phone ||
              filters.mobile ||
              filters.street ||
              filters.zip ||
              searchValue) && (
              <Box>
                <Button
                  size="md"
                  variant="outline"
                  onClick={clearAllFiltersAndSearch}
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
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
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
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
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
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
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
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
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
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
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
                    onChange={(e) => handleFilterChange("zip", e.target.value)}
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

        <Table {...getTableProps()} variant="simple" color="gray.500" mb="24px">
          <Thead>
            {headerGroups.map((headerGroup, index) => (
              <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                {headerGroup.headers.map((column, index) => (
                  <Th
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    pe="10px"
                    key={index}
                    borderColor={borderColor}
                  >
                    <Flex
                      justify="space-between"
                      align="center"
                      fontSize={{ sm: "10px", lg: "12px" }}
                      color="gray.400"
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
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "EMAIL") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "PHONE") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "MOBILE") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "STREET") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    } else if (cell.column.Header === "ZIP") {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
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
                              onClick={() => handleDelete(row.original)}
                              aria-label="Delete vendor"
                            />
                          </Tooltip>
                        </HStack>
                      );
                    } else {
                      data = (
                        <Text color={textColor} fontSize="sm" fontWeight="700">
                          {cell.value}
                        </Text>
                      );
                    }
                    return (
                      <Td
                        {...cell.getCellProps()}
                        key={index}
                        fontSize={{ sm: "14px" }}
                        minW={{ sm: "150px", md: "200px", lg: "auto" }}
                        borderColor="transparent"
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
      </Card>

      {/* Add Vendor Modal */}
      <Modal isOpen={isOpen} onClose={handleCancel}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Vendor</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Vendor Name</FormLabel>
                <Input
                  placeholder="Enter vendor name"
                  value={newVendor.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newVendor.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Phone</FormLabel>
                <Input
                  placeholder="Enter phone number"
                  value={newVendor.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Mobile</FormLabel>
                <Input
                  placeholder="Enter mobile number"
                  value={newVendor.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Street</FormLabel>
                <Input
                  placeholder="Enter street address"
                  value={newVendor.street}
                  onChange={(e) => handleInputChange("street", e.target.value)}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Zip</FormLabel>
                <Input
                  placeholder="Enter zip code"
                  value={newVendor.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCancel}>
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
              Save Vendor
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

              <FormControl isRequired>
                <FormLabel>Zip</FormLabel>
                <Input
                  placeholder="Enter zip code"
                  value={editingVendor?.zip || ""}
                  onChange={(e) => handleEditInputChange("zip", e.target.value)}
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
