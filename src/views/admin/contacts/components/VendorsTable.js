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
  Checkbox,
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
import SuccessModal from "components/modals/SuccessModal";
import FailureModal from "components/modals/FailureModal";

// Assets
import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdFilterList,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdUnfoldMore,
} from "react-icons/md";

// API
import { buildApiUrl, getApiEndpoint } from "../../../../config/api";
import api from "../../../../api/axios";

export default function VendorsTable(props) {
  const { columnsData } = props;
  const [searchValue, setSearchValue] = useState("");
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // kept for future loading states
  const [countries, setCountries] = useState([]);
  const [filters, setFilters] = useState({
    email: "",
    phone: "",
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
    street: "",
    street2: "",
    city: "",
    zip: "",
    country_id: "",
    website: "",
    pic: "",
    agency_type: false,
    address_type: false,
    remarks: "",
    warning_notes: "",
  });
  const [editingVendor, setEditingVendor] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });
  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

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

  // Fetch countries from API
  const fetchCountries = async () => {
    try {
      console.log("Fetching countries from API...");
      const response = await api.get("/api/countries");
      const result = response.data;
      console.log("Countries API Response:", result);

      if (result.countries && Array.isArray(result.countries)) {
        setCountries(result.countries);
      } else {
        setCountries([]);
      }
    } catch (error) {
      console.error("Failed to fetch countries:", error);
      setCountries([]);
    }
  };

  // Load vendors and countries on component mount
  React.useEffect(() => {
    fetchVendors();
    fetchCountries();
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
          (item.phone && item.phone.toString().includes(filters.phone))
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
      street: "",
      zip: "",
    });
  };

  const clearAllFiltersAndSearch = () => {
    clearAllFilters();
    setSearchValue("");
  };

  // Checkbox selection functions
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems([...page]);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (item, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, item]);
    } else {
      setSelectedItems(selectedItems.filter((selected) => selected.id !== item.id));
    }
  };

  // Helper function to show success modal
  const showSuccessModal = (title, message) => {
    setSuccessModal({
      isOpen: true,
      title,
      message
    });
  };

  // Helper function to close success modal
  const closeSuccessModal = () => {
    setSuccessModal({
      isOpen: false,
      title: "",
      message: ""
    });
  };

  // Helper function to show error modal
  const showErrorModal = (title, message) => {
    setErrorModal({
      isOpen: true,
      title,
      message
    });
  };

  // Helper function to close error modal
  const closeErrorModal = () => {
    setErrorModal({
      isOpen: false,
      title: "",
      message: ""
    });
  };

  // SearchableSelect Component for Country Selection
  const SearchableSelect = ({ value, onChange, options, placeholder, displayKey = "name", valueKey = "id" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = options.filter(option =>
      option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedOption = options.find(option => option[valueKey] === value);

    return (
      <Box position="relative">
        <Input
          value={selectedOption ? selectedOption[displayKey] : ""}
          placeholder={placeholder}
          readOnly
          onClick={() => setIsOpen(!isOpen)}
          cursor="pointer"
          _focus={{ borderColor: "blue.400" }}
        />
        {isOpen && (
          <Box
            position="absolute"
            top="100%"
            left="0"
            right="0"
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            boxShadow="lg"
            zIndex="1000"
            maxH="200px"
            overflowY="auto"
          >
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              border="none"
              borderRadius="0"
              _focus={{ boxShadow: "none" }}
            />
            {filteredOptions.map((option) => (
              <Box
                key={option[valueKey]}
                px="3"
                py="2"
                cursor="pointer"
                _hover={{ bg: "gray.100" }}
                onClick={() => {
                  onChange(option[valueKey]);
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                {option[displayKey]}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
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
        showSuccessModal("Success!", "Vendor registered successfully!");

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
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: "",
          website: "",
          pic: "",
          agency_type: false,
          address_type: false,
          remarks: "",
          warning_notes: "",
        });
      } else if (result && (result.status === "success" || result.success)) {
        // Handle direct response format
        console.log("Vendor registered successfully:", result);
        showSuccessModal("Success!", "Vendor registered successfully!");

        // Close modal and reset form
        onClose();
        setNewVendor({
          name: "",
          reg_no: "",
          email: "",
          email2: "",
          phone: "",
          phone2: "",
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: "",
          website: "",
          pic: "",
          agency_type: false,
          address_type: false,
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
          street: "",
          street2: "",
          city: "",
          zip: "",
          country_id: "",
          website: "",
          pic: "",
          agency_type: false,
          address_type: false,
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
      };

      console.log("Vendor Update API Payload:", payload);
      console.log("API URL:", buildApiUrl(getApiEndpoint("VENDOR_UPDATE")));

      const response = await api.post(getApiEndpoint("VENDOR_UPDATE"), payload);
      const result = response.data;
      // Refresh vendors list to show the updated vendor
      fetchVendors();

      // Check if the response indicates success
      if (
        (result && result.status === "success") ||
        (result && result.success) ||
        (result && result.result && result.result.status === "success")
      ) {
        console.log("Vendor updated successfully:", result);
        showSuccessModal("Success!", "Vendor updated successfully!");

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
      showErrorModal("Error", `Failed to update vendor: ${error.message}`);
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
        showSuccessModal("Success!", "Vendor deleted successfully!");

        // Refresh vendors list to remove the deleted vendor
        fetchVendors();
      } else if (result && (result.status === "success" || result.success)) {
        // Handle direct response format
        console.log("Vendor deleted successfully:", result);
        showSuccessModal("Success!", "Vendor deleted successfully!");
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
              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                Vendors
              </Text>
            </HStack>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              bg="#1c4a95"
              color="white"
              size="md"
              px="6"
              py="3"
              borderRadius="md"
              _hover={{ bg: "#173f7c" }}
              onClick={onOpen}
            >
              New Vendor
            </Button>
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

          {/* Table Container with Horizontal Scroll */}
          <Box
            pr="25px"
            overflowX="auto"
            css={{
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: scrollbarTrackBg,
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: scrollbarThumbBg,
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: scrollbarThumbHoverBg,
              },
            }}
          >
            <Table
              {...getTableProps()}
              variant="unstyled"
              size="sm"
              minW="1000px"
              ml="25px"
            >
              <Thead bg={tableHeaderBg}>
                {headerGroups.map((headerGroup, index) => (
                  <Tr {...headerGroup.getHeaderGroupProps()} key={index}>
                    <Th
                      borderRight="1px"
                      borderColor={tableBorderColor}
                      py="12px"
                      px="16px"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedItems.length === page.length && page.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </Th>
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
                {page.map((row, index) => {
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
                      <Td
                        borderRight="1px"
                        borderColor={tableBorderColor}
                        py="12px"
                        px="16px"
                      >
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(row.original)}
                          onChange={(e) =>
                            handleSelectItem(row.original, e.target.checked)
                          }
                        />
                      </Td>
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
                })}
              </Tbody>
            </Table>
          </Box>

          {/* Pagination */}
          <Flex px="25px" justify="space-between" align="center" py="20px">
            <Text fontSize="sm" color={tableTextColorSecondary}>
              Showing {page?.length || 0} of {vendors.length} results
            </Text>
            <HStack spacing={2}>
              <Button
                size="sm"
                onClick={previousPage}
                isDisabled={!canPreviousPage}
                variant="outline"
                colorScheme="blue"
                _hover={{ bg: "blue.50" }}
              >
                Previous
              </Button>
              <Button
                size="sm"
                onClick={nextPage}
                variant="outline"
                colorScheme="blue"
                _hover={{ bg: "blue.50" }}
                isDisabled={!canNextPage}
              >
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
                  <SearchableSelect
                    value={newVendor.country_id}
                    onChange={(value) => handleInputChange("country_id", value)}
                    options={countries}
                    placeholder="Select country"
                    displayKey="name"
                    valueKey="id"
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

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Agency Type
                  </FormLabel>
                  <Checkbox
                    isChecked={newVendor.agency_type}
                    onChange={(e) => handleInputChange("agency_type", e.target.checked)}
                    colorScheme="blue"
                  >
                    Enable Agency Type
                  </Checkbox>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">
                    Address Type
                  </FormLabel>
                  <Checkbox
                    isChecked={newVendor.address_type}
                    onChange={(e) => handleInputChange("address_type", e.target.checked)}
                    colorScheme="blue"
                  >
                    Enable Address Type
                  </Checkbox>
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
                <SearchableSelect
                  value={editingVendor?.country_id || ""}
                  onChange={(value) => handleEditInputChange("country_id", value)}
                  options={countries}
                  placeholder="Select country"
                  displayKey="name"
                  valueKey="id"
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

              <FormControl>
                <FormLabel>Agency Type</FormLabel>
                <Checkbox
                  isChecked={editingVendor?.agency_type || false}
                  onChange={(e) => handleEditInputChange("agency_type", e.target.checked)}
                  colorScheme="blue"
                >
                  Enable Agency Type
                </Checkbox>
              </FormControl>

              <FormControl>
                <FormLabel>Address Type</FormLabel>
                <Checkbox
                  isChecked={editingVendor?.address_type || false}
                  onChange={(e) => handleEditInputChange("address_type", e.target.checked)}
                  colorScheme="blue"
                >
                  Enable Address Type
                </Checkbox>
              </FormControl>

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
                !editingVendor?.street ||
                !editingVendor?.zip
              }
            >
              Update Vendor
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={closeSuccessModal}
        title={successModal.title}
        message={successModal.message}
      />

      {/* Error Modal */}
      <FailureModal
        isOpen={errorModal.isOpen}
        onClose={closeErrorModal}
        title={errorModal.title}
        message={errorModal.message}
      />
    </>
  );
}
