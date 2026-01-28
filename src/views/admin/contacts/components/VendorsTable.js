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
import { useToast } from "@chakra-ui/react";
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
  MdGroups,
  MdInventory,
} from "react-icons/md";

export default function VendorsTable(props) {
  const { columnsData, tableData, isLoading = false, pagination, page = 1, pageSize = 80, onPageChange } = props;
  const history = useHistory();
  const [searchValue, setSearchValue] = useState("");
  const [filters, setFilters] = useState({
    agent_id: "",
    company: "",
    reg_no: "",
    city: "",
    country: "",
  });
  const [sortOrder, setSortOrder] = useState("alphabetical"); // newest, oldest, alphabetical
  const [showFilterFields, setShowFilterFields] = useState(false);
  const {
    updateVendor,
    deleteVendor,
    registerVendor,
    updateLoading,
    deleteLoading,
    getVendors,
  } = useVendor();
  const toast = useToast();

  // Remove client-side pagination state - use backend pagination
  // const [itemsPerPage] = useState(10);
  const [newVendor, setNewVendor] = useState({
    name: "",
    agentsdb_id: "",
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
  const [countries, setCountries] = useState([]);

  const { isOpen, onClose } = useDisclosure();
  const {
    isOpen: isEditOpen,
    // onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const cancelRef = useRef();

  // Load countries on component mount
  React.useEffect(() => {
    const loadCountries = async () => {
      try {
        const countriesData = await countriesAPI.getCountries();
        const countriesList = countriesData.countries || countriesData || [];
        setCountries(countriesList);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    loadCountries();
  }, []);

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
    let filtered = Array.isArray(tableData) ? tableData : [];

    const isTopLevelAgent = (item) => {
      const parentValue = item?.parent_id ?? item?.parentId ?? item?.parent;
      return (
        parentValue === false ||
        parentValue === null ||
        parentValue === undefined ||
        parentValue === ""
      );
    };

    filtered = filtered.filter(isTopLevelAgent);

    // Apply search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filtered = filtered.filter(
        (item) => {
          const name = (item.name || "").toLowerCase();
          const agentsdbId = (item.agentsdb_id || "").toLowerCase();
          const regNo = (item.reg_no || item.registration_no || item.registrationNo || "").toLowerCase();
          const city = (item.city || "").toLowerCase();
          const countryObj = countries.find(
            (c) => c.id === item.country_id || c.id === parseInt(item.country_id)
          );
          const countryName = (countryObj ? countryObj.name : item.country_name || "").toLowerCase();
          const email = (item.email || item.email2 || "").toLowerCase();
          const phone = (item.phone || item.phone2 || "").toString().toLowerCase();

          return (
            name.includes(searchLower) ||
            agentsdbId.includes(searchLower) ||
            regNo.includes(searchLower) ||
            city.includes(searchLower) ||
            countryName.includes(searchLower) ||
            email.includes(searchLower) ||
            phone.includes(searchLower)
          );
        }
      );
    }

    // Apply agent id filter
    if (filters.agent_id) {
      filtered = filtered.filter(
        (item) =>
          item.agentsdb_id &&
          String(item.agentsdb_id).toLowerCase().includes(filters.agent_id.toLowerCase())
      );
    }

    // Apply company filter
    if (filters.company) {
      filtered = filtered.filter(
        (item) => (item.name || "").toLowerCase().includes(filters.company.toLowerCase())
      );
    }

    // Apply registration no filter
    if (filters.reg_no) {
      filtered = filtered.filter(
        (item) => {
          const regNo = item.reg_no || item.registration_no || item.registrationNo || "";
          return String(regNo).toLowerCase().includes(filters.reg_no.toLowerCase());
        }
      );
    }

    // Apply city filter
    if (filters.city) {
      filtered = filtered.filter(
        (item) => (item.city || "").toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Apply country filter (by country name)
    if (filters.country) {
      const needle = filters.country.toLowerCase();
      filtered = filtered.filter((item) => {
        const country = countries.find(
          (c) => c.id === item.country_id || c.id === parseInt(item.country_id)
        );
        const countryName = country ? country.name : item.country_name || "";
        return (countryName || "").toLowerCase().includes(needle);
      });
    }


    // Add computed display fields
    const withComputed = filtered.map((item) => {
      const countryObj = countries.find(
        (c) => c.id === item.country_id || c.id === parseInt(item.country_id)
      );
      const countryName = countryObj ? countryObj.name : item.country_name || "";
      const rawChildren =
        item.children ??
        item.agent_people ??
        item.people ??
        item.contacts ??
        [];
      const derivedCount = Array.isArray(rawChildren) ? rawChildren.length : 0;
      const fallbackCount =
        item.children_count ??
        item.child_count ??
        item.total_contacts ??
        item.contact_count ??
        derivedCount;
      const parsedCount = Number.isFinite(fallbackCount)
        ? fallbackCount
        : parseInt(fallbackCount, 10);
      const childCount = Number.isNaN(parsedCount)
        ? derivedCount
        : Math.max(parsedCount, derivedCount);

      const registrationNo =
        item.reg_no ?? item.registration_no ?? item.registrationNo ?? "";

      // Calculate CNEE count and build display list
      // Only count CNEE entries that have cnee1 values (CNEE1, CNEE2, CNEE3, etc.)
      let cneeCount = 0;
      const cneeDisplay = [];

      if (Array.isArray(item.agent_cnee_ids) && item.agent_cnee_ids.length > 0) {
        // Filter to only include entries with cnee1 values
        const cneeWithCnee1 = item.agent_cnee_ids.filter((cneeItem) => {
          const cnee1 = cneeItem.cnee1 ? String(cneeItem.cnee1).trim() : "";
          return cnee1 !== "";
        });

        cneeCount = cneeWithCnee1.length;
        cneeWithCnee1.forEach((cneeItem, index) => {
          const cnee1 = cneeItem.cnee1 ? String(cneeItem.cnee1).trim() : "";
          const cneeNumber = index + 1;

          // Format: "CNEE 1: CNEE1" or just "CNEE 1" if no cnee1
          if (cnee1) {
            cneeDisplay.push(`CNEE ${cneeNumber}: ${cnee1}`);
          } else {
            cneeDisplay.push(`CNEE ${cneeNumber}`);
          }
        });
      } else {
        // Fallback to legacy cnee1-cnee12 fields
        // Only count entries that have values in cnee1-cnee12 fields
        for (let i = 1; i <= 12; i++) {
          const cneeValue = item[`cnee${i}`];
          if (cneeValue && String(cneeValue).trim() !== "") {
            cneeCount++;
            // For legacy, we don't have separate cnee_text, so just show the cnee value
            cneeDisplay.push(`CNEE ${i}: ${String(cneeValue).trim()}`);
          }
        }
        // Note: Legacy cnee_text field is not counted separately, only cnee1-cnee12
      }

      const normalizedChildren = Array.isArray(rawChildren)
        ? rawChildren.map((child, index) => {
          const firstName = child?.first_name || child?.firstname || "";
          const lastName = child?.last_name || child?.lastname || "";
          const fullName =
            child?.name ||
            [firstName, lastName].filter(Boolean).join(" ").trim();
          const jobTitle = child?.job_title || child?.title || "";
          const email =
            child?.email ||
            child?.email1 ||
            child?.email2 ||
            child?.primary_email ||
            "";
          const phone =
            child?.tel_direct ||
            child?.phone ||
            child?.tel_other ||
            child?.mobile ||
            "";
          return {
            id:
              child?.id ||
              child?.person_id ||
              child?.contact_id ||
              `${fullName || email || phone || index}-${index}`,
            name: fullName || email || phone || "Unnamed Contact",
            jobTitle,
            email,
            phone,
          };
        })
        : [];
      return {
        ...item,
        city_country: [item.city, countryName].filter(Boolean).join(", "),
        cnee_count: cneeCount,
        cnee_display: cneeDisplay,
        reg_no: registrationNo,
        children_count: childCount,
        children_display: normalizedChildren,
      };
    });

    return withComputed;
  }, [tableData, searchValue, filters, countries]);

  const data = useMemo(() => {
    const sortedData = applyCustomSorting(Array.isArray(filteredData) ? filteredData : []);
    return sortedData;
    //eslint-disable-next-line
  }, [filteredData, sortOrder]);

  // Use backend pagination - no client-side pagination needed
  const tableInstance = useTable(
    {
      columns,
      data,
      manualPagination: true, // Tell react-table we're handling pagination server-side
    },
    useGlobalFilter,
    useSortBy
  );

  const {
    getTableProps,
    headerGroups,
    rows: tableRows, // Use all rows since pagination is server-side
    prepareRow,
  } = tableInstance;

  // Use backend pagination data
  const paginationData = pagination || {
    page: page || 1,
    page_size: pageSize || 80,
    total_count: tableData.length || 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  };

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
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
  const modalBg = useColorModeValue("white", "gray.800");
  const modalHeaderBg = useColorModeValue("gray.50", "gray.700");
  const modalBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const peopleIconBgActive = useColorModeValue("blue.100", "whiteAlpha.200");
  const peopleIconBgInactive = useColorModeValue("gray.200", "whiteAlpha.200");
  const peopleIconColorActive = useColorModeValue("blue.600", "blue.200");
  const peopleIconColorInactive = useColorModeValue("gray.500", "gray.400");
  const peopleBadgeBgActive = useColorModeValue("blue.500", "blue.300");
  const peopleBadgeBgInactive = useColorModeValue("gray.200", "whiteAlpha.500");
  const peopleBadgeTextInactive = useColorModeValue("gray.600", "gray.400");

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
    setFilters({ agent_id: "", company: "", reg_no: "", city: "", country: "" });
  };

  const clearAllSorting = () => {
    tableInstance.setSortBy([]);
  };

  const clearAllFiltersAndSorting = () => {
    clearAllFilters();
    clearAllSorting();
    setSearchValue("");
    setSortOrder("alphabetical");
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
          agentsdb_id: "",
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
      const originalVendor = Array.isArray(tableData) ? tableData.find(
        (v) => v.id === editingVendor.id
      ) : null;

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

  // const handleEdit = (vendor) => {
  //   if (!vendor || !vendor.id) {
  //     return;
  //   }
  //   setEditingVendor({ ...vendor });
  //   onEditOpen();
  // };

  const handleDelete = (vendor) => {
    const agentId = vendor?.id || vendor?.agent_id || vendor?.vendor_id;
    if (!vendor || !agentId) {
      console.error("Cannot delete: Agent ID not found", vendor);
      toast({
        title: "Delete Error",
        description: "Cannot delete agent: Agent ID not found.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setVendorToDelete(vendor);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    try {
      // Check if vendor still exists and get the ID
      if (!vendorToDelete) {
        onDeleteClose();
        setVendorToDelete(null);
        return;
      }

      const agentId = vendorToDelete.id || vendorToDelete.agent_id || vendorToDelete.vendor_id;
      if (!agentId) {
        toast({
          title: "Delete Error",
          description: "Cannot delete agent: Agent ID not found.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        onDeleteClose();
        setVendorToDelete(null);
        return;
      }

      // Call the API to delete the vendor
      const result = await deleteVendor(agentId);

      if (result.success) {
        onDeleteClose();
        setVendorToDelete(null);
        // Refresh the vendors list to show updated data
        getVendors();

        // Show success message
        toast({
          title: "Agent Deleted",
          description: `Agent "${vendorToDelete.name || 'Unknown'}" has been successfully deleted.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Handle failure from API
        const errorMessage = result.error || "Failed to delete agent";
        toast({
          title: "Delete Failed",
          description: errorMessage,
          status: "error",
          duration: 8000,
          isClosable: true,
        });
      }
    } catch (error) {
      // Show error message with detailed API error
      let errorMessage = "Failed to delete agent";

      if (error.message) {
        errorMessage = error.message;
      }

      // Handle specific foreign key constraint error
      if (errorMessage.includes('violates foreign key constraint') && errorMessage.includes('sale_order')) {
        errorMessage = `Cannot delete agent "${vendorToDelete?.name || 'Unknown'}" because they have existing sales orders. Please remove all related sales orders before deleting this agent.`;
      }

      toast({
        title: "Delete Failed",
        description: errorMessage,
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setNewVendor({
      name: "",
      agentsdb_id: "",
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
            Agent Management
          </Text>
          <HStack spacing={3}>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="blue"
              size="sm"
              onClick={() => {
                history.push("/admin/vendor-registration");
              }}
            >
              Add Agent
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
                Search Agents
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
                  placeholder="Search agents by name, shortname, email, phone, city..."
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
                  filters.agent_id || filters.company || filters.city || filters.country || filters.email
                    ? "solid"
                    : "outline"
                }
                colorScheme={
                  filters.agent_id || filters.company || filters.city || filters.country || filters.email
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
            {(filters.agent_id ||
              filters.company ||
              filters.reg_no ||
              filters.city ||
              filters.country ||
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
              <HStack spacing={6} flexWrap="wrap" align="flex-start">
                {/* Agent ID Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Agent ID
                  </Text>
                  <Input
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="e.g., ABC, XYZ..."
                    value={filters.agent_id}
                    onChange={(e) => handleFilterChange("agent_id", e.target.value)}
                    border="2px"
                    borderColor={borderColor}
                    _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)" }}
                    _hover={{ borderColor: "blue.300" }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                  />
                </Box>

                {/* Company Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Company Name
                  </Text>
                  <Input
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="e.g., Transcoma, ABC Shipping..."
                    value={filters.company}
                    onChange={(e) => handleFilterChange("company", e.target.value)}
                    border="2px"
                    borderColor={borderColor}
                    _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)" }}
                    _hover={{ borderColor: "blue.300" }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                  />
                </Box>

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
                    placeholder="e.g., Algeciras, Singapore..."
                    value={filters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                    border="2px"
                    borderColor={borderColor}
                    _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)" }}
                    _hover={{ borderColor: "blue.300" }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                  />
                </Box>

                {/* Registration No Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Registration No
                  </Text>
                  <Input
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="e.g., REG-1234..."
                    value={filters.reg_no}
                    onChange={(e) => handleFilterChange("reg_no", e.target.value)}
                    border="2px"
                    borderColor={borderColor}
                    _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)" }}
                    _hover={{ borderColor: "blue.300" }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                  />
                </Box>

                {/* Country Filter */}
                <Box minW="200px" flex="1">
                  <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                    Country
                  </Text>
                  <Input
                    variant="outline"
                    fontSize="sm"
                    bg={inputBg}
                    color={inputText}
                    borderRadius="8px"
                    placeholder="e.g., Spain, Singapore..."
                    value={filters.country}
                    onChange={(e) => handleFilterChange("country", e.target.value)}
                    border="2px"
                    borderColor={borderColor}
                    _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)" }}
                    _hover={{ borderColor: "blue.300" }}
                    _placeholder={{ color: placeholderColor, fontSize: "14px" }}
                  />
                </Box>

              </HStack>
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
            minW="800px"
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
                      Loading agents...
                    </Text>
                  </Td>
                </Tr>
              ) : tableRows.length === 0 ? (
                <Tr>
                  <Td
                    colSpan={headerGroups[0]?.headers.length + 1}
                    textAlign="center"
                    py="40px"
                  >
                    <Text color={tableTextColorSecondary} fontSize="sm">
                      {!Array.isArray(tableData) || tableData.length === 0
                        ? "No agents available."
                        : "No agents match your search criteria."}
                    </Text>
                  </Td>
                </Tr>
              ) : (
                tableRows.map((row, index) => {
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
                        let data = "";
                        if (cell.column.Header === "AGENT ID") {
                          data = (
                            <Text
                              color={textColor}
                              fontSize="sm"
                              fontWeight="500"
                            >
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "COMPANY NAME") {
                          data = (
                            <Text
                              color={textColor}
                              fontSize="sm"
                              fontWeight="600"
                            >
                              {cell.value || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "AGENT TYPE") {
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {row.original.type_client || "-"}
                            </Text>
                          );
                        } else if (cell.column.Header === "CITY / COUNTRY") {
                          const countryObj = countries.find(
                            (c) => c.id === row.original.country_id || c.id === parseInt(row.original.country_id)
                          );
                          const countryName = countryObj ? countryObj.name : row.original.country_name || "";
                          const value = [row.original.city, countryName].filter(Boolean).join(", ") || "-";
                          data = (
                            <Text color={textColor} fontSize="sm">
                              {value}
                            </Text>
                          );
                        } else if (cell.column.Header === "CNEE COUNT") {
                          const rawCount = Number(row.original.cnee_count ?? 0);
                          const cneeCount = Number.isNaN(rawCount) ? 0 : rawCount;
                          const hasCnee = cneeCount > 0;
                          const cneeList = Array.isArray(row.original.cnee_display)
                            ? row.original.cnee_display
                            : [];
                          const tooltipContent = hasCnee
                            ? cneeList
                              .slice(0, 5)
                              .map((cnee) => cnee)
                              .join("\n") + (cneeList.length > 5 ? `\n+${cneeList.length - 5} more` : "")
                            : "";

                          data = (
                            <Tooltip
                              label={tooltipContent}
                              placement="top"
                              hasArrow
                              isDisabled={!hasCnee}
                              maxW="260px"
                              whiteSpace="pre-wrap"
                              openDelay={150}
                            >
                              <HStack spacing={2}>
                                <Flex
                                  align="center"
                                  justify="center"
                                  w="28px"
                                  h="28px"
                                  borderRadius="full"
                                  bg={hasCnee ? peopleIconBgActive : peopleIconBgInactive}
                                >
                                  <Icon
                                    as={MdInventory}
                                    color={hasCnee ? peopleIconColorActive : peopleIconColorInactive}
                                    boxSize={4}
                                  />
                                </Flex>
                                <Box
                                  minW="28px"
                                  px={2}
                                  py={0.5}
                                  borderRadius="md"
                                  bg={hasCnee ? peopleBadgeBgActive : peopleBadgeBgInactive}
                                >
                                  <Text
                                    color={hasCnee ? "white" : peopleBadgeTextInactive}
                                    fontSize="sm"
                                    fontWeight="700"
                                    textAlign="center"
                                  >
                                    {cneeCount}
                                  </Text>
                                </Box>
                              </HStack>
                            </Tooltip>
                          );
                        } else if (cell.column.Header === "AGENT PEOPLE") {
                          const rawCount = Number(row.original.children_count ?? 0);
                          const childCount = Number.isNaN(rawCount) ? 0 : rawCount;
                          const hasPeople = childCount > 0;
                          const peopleList = Array.isArray(row.original.children_display)
                            ? row.original.children_display
                            : [];
                          const tooltipContent = hasPeople
                            ? peopleList
                              .slice(0, 5)
                              .map((person) => {
                                const pieces = [
                                  person.name,
                                  person.jobTitle,
                                  person.email || person.phone,
                                ].filter(Boolean);
                                return pieces.join(" · ");
                              })
                              .join("\n") + (peopleList.length > 5 ? `\n+${peopleList.length - 5} more` : "")
                            : "";

                          data = (
                            <Tooltip
                              label={tooltipContent}
                              placement="top"
                              hasArrow
                              isDisabled={!hasPeople}
                              maxW="260px"
                              whiteSpace="pre-wrap"
                              openDelay={150}
                            >
                              <HStack spacing={2}>
                                <Flex
                                  align="center"
                                  justify="center"
                                  w="28px"
                                  h="28px"
                                  borderRadius="full"
                                  bg={hasPeople ? peopleIconBgActive : peopleIconBgInactive}
                                >
                                  <Icon
                                    as={MdGroups}
                                    color={hasPeople ? peopleIconColorActive : peopleIconColorInactive}
                                    boxSize={4}
                                  />
                                </Flex>
                                <Box
                                  minW="28px"
                                  px={2}
                                  py={0.5}
                                  borderRadius="md"
                                  bg={hasPeople ? peopleBadgeBgActive : peopleBadgeBgInactive}
                                >
                                  <Text
                                    color={hasPeople ? "white" : peopleBadgeTextInactive}
                                    fontSize="sm"
                                    fontWeight="700"
                                    textAlign="center"
                                  >
                                    {childCount}
                                  </Text>
                                </Box>
                              </HStack>
                            </Tooltip>
                          );
                        } else if (cell.column.Header === "ACTIONS") {
                          data = (
                            <HStack spacing={2}>
                              <Tooltip label="View Agent">
                                <IconButton
                                  icon={<Icon as={MdVisibility} />}
                                  size="sm"
                                  colorScheme="teal"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const agentId = row.original.id || row.original.agent_id || row.original.vendor_id;
                                    if (!agentId) {
                                      console.error("Agent ID not found in row data:", row.original);
                                      toast({
                                        title: "View Error",
                                        description: "Cannot view agent: Agent ID not found.",
                                        status: "error",
                                        duration: 3000,
                                        isClosable: true,
                                      });
                                      return;
                                    }
                                    const original = Array.isArray(tableData)
                                      ? tableData.find((v) => String(v.id || v.agent_id || v.vendor_id) === String(agentId))
                                      : null;
                                    const payload = original || row.original;
                                    history.push(`/admin/contacts/agents/${agentId}`, { agent: payload });
                                  }}
                                  aria-label="View agent"
                                />
                              </Tooltip>
                              <Tooltip label="Edit Agent">
                                <IconButton
                                  icon={<Icon as={MdEdit} />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const agentId = row.original.id || row.original.agent_id || row.original.vendor_id;
                                    if (!agentId) {
                                      console.error("Agent ID not found in row data:", row.original);
                                      toast({
                                        title: "Edit Error",
                                        description: "Cannot edit agent: Agent ID not found.",
                                        status: "error",
                                        duration: 3000,
                                        isClosable: true,
                                      });
                                      return;
                                    }
                                    // Store vendor data in localStorage as backup
                                    localStorage.setItem(`vendor_${agentId}`, JSON.stringify(row.original));
                                    history.push({
                                      pathname: `/admin/vendor-registration/${agentId}`,
                                      state: { vendorData: row.original }
                                    });
                                  }}
                                  aria-label="Edit agent"
                                />
                              </Tooltip>
                              <Tooltip label="Delete Agent">
                                <IconButton
                                  icon={<Icon as={MdDelete} />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(row.original);
                                  }}
                                  aria-label="Delete agent"
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

        {/* Backend Pagination */}
        <Flex px="25px" justify="space-between" align="center" py="20px" flexWrap="wrap" gap={4}>
          <Text fontSize="sm" color={tableTextColorSecondary}>
            Showing {paginationData.total_count === 0 ? 0 : ((paginationData.page - 1) * paginationData.page_size + 1)} to {Math.min(paginationData.page * paginationData.page_size, paginationData.total_count)} of {paginationData.total_count} results
          </Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              onClick={() => onPageChange && onPageChange(paginationData.page - 1)}
              isDisabled={!paginationData.has_previous}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => onPageChange && onPageChange(paginationData.page + 1)}
              isDisabled={!paginationData.has_next}
              variant="outline"
            >
              Next
            </Button>
          </HStack>
        </Flex>
      </Card>

      {/* Edit Vendor Modal */}
      <Modal isOpen={isEditOpen} onClose={handleCancelEdit}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent bg={modalBg} border="1px" borderColor={modalBorder}>
          <ModalHeader
            bg={modalHeaderBg}
            borderBottom="1px"
            borderColor={modalBorder}
          >
            Edit Agent
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Agent Company Name</FormLabel>
                <Input
                  placeholder="e.g., ABC Corporation, XYZ Ltd..."
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
                <FormLabel>Agent Shortname</FormLabel>
                <Input
                  placeholder="e.g., ABC, XYZ, DEF..."
                  value={editingVendor?.agentsdb_id || ""}
                  onChange={(e) =>
                    handleEditInputChange("agentsdb_id", e.target.value)
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
                <FormLabel>Email 1</FormLabel>
                <Input
                  type="email"
                  placeholder="e.g., contact@company.com..."
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
                <FormLabel>Phone 1</FormLabel>
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
                <FormLabel>Phone 2</FormLabel>
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
                <FormLabel>Address 1</FormLabel>
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
                <FormLabel>Postcode</FormLabel>
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
              Update Agent
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Vendor Modal */}
      <Modal isOpen={isOpen} onClose={handleCancel}>
        <ModalOverlay bg="rgba(0, 0, 0, 0.6)" />
        <ModalContent bg={modalBg} border="1px" borderColor={modalBorder}>
          <ModalHeader
            bg={modalHeaderBg}
            borderBottom="1px"
            borderColor={modalBorder}
          >
            Add New Agent
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Agent Company Name</FormLabel>
                <Input
                  value={newVendor.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter agent company name"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Agent Shortname</FormLabel>
                <Input
                  value={newVendor.agentsdb_id}
                  onChange={(e) => handleInputChange("agentsdb_id", e.target.value)}
                  placeholder="Enter agent shortname"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Email 1</FormLabel>
                <Input
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter primary email address"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone 1</FormLabel>
                <Input
                  value={newVendor.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter primary phone number"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone 2</FormLabel>
                <Input
                  value={newVendor.mobile}
                  onChange={(e) => handleInputChange("mobile", e.target.value)}
                  placeholder="Enter secondary phone number"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Address 1</FormLabel>
                <Input
                  value={newVendor.street}
                  onChange={(e) => handleInputChange("street", e.target.value)}
                  placeholder="Enter street address"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>City</FormLabel>
                <Input
                  value={newVendor.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Enter city"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Postcode</FormLabel>
                <Input
                  value={newVendor.zip}
                  onChange={(e) => handleInputChange("zip", e.target.value)}
                  placeholder="Enter postcode"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Country</FormLabel>
                <Select
                  value={newVendor.country_id || ""}
                  onChange={(e) => handleInputChange("country_id", e.target.value)}
                  placeholder="Select country"
                  bg={inputBg}
                  color={inputText}
                  borderColor={borderColor}
                  _focus={{
                    borderColor: "blue.400",
                    boxShadow: "0 0 0 1px rgba(66, 153, 225, 0.6)",
                  }}
                >
                  <option value="">Select Country</option>
                  {/* Add country options here if needed */}
                </Select>
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
              isLoading={isRegistering}
              loadingText="Adding..."
            >
              Add Agent
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
              Delete Agent
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

