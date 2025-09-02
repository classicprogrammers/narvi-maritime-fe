
import React, { useState, useMemo, useEffect } from "react";
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
    Badge,
    Icon,
    HStack,
    VStack,
    IconButton,
    useColorModeValue,
    Checkbox,
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
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Grid,
    useToast,
    Tooltip,
    Textarea,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    List,
    ListItem,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSearch,
    MdArrowBack,
    MdArrowForward,
    MdDelete,
    MdEdit,
    MdFilterList,
    MdDownload,
    MdPrint,
    MdKeyboardArrowDown,
} from "react-icons/md";

import api from "../../../api/axios";
import uomAPI from "../../../api/uom";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";
import groupsAPI from "../../../api/groups";

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

    const selectedOption = options.find(option => option[valueKey] == value);

    const handleSelect = (option) => {
        onChange(option[valueKey]);
        setSearchValue("");
        setIsOpen(false);
    };

    return (
        <Popover minW="100%" isOpen={isOpen} onClose={() => setIsOpen(false)} placement="bottom-start" >
            <PopoverTrigger>
                <Button
                    w="100%"
                    minW="100%"
                    justifyContent="space-between"
                    variant="outline"
                    size="md"
                    bg="white"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: "#1c4a95", boxShadow: "0 0 0 1px #1c4a95", bg: "#f0f4ff" }}
                    onClick={() => setIsOpen(!isOpen)}
                    borderRadius="md"
                    fontWeight="normal"
                    fontSize="sm"
                    h="40px"
                >
                    {selectedOption ? formatOption(selectedOption) : placeholder}
                    <Icon as={MdKeyboardArrowDown} />
                </Button>
            </PopoverTrigger>
            <PopoverContent w="100%" maxH="200px" overflowY="auto" borderRadius="md" minW="100%">
                <PopoverBody p={0}>
                    <Input
                        placeholder="Search..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        border="none"
                        borderRadius="0"
                        borderBottom="1px"
                        borderColor="gray.200"
                        _focus={{ borderColor: "#1c4a95" }}
                        px={3}
                        py={2}
                        fontSize="sm"
                    />
                    <List spacing={0}>
                        {filteredOptions.map((option) => (
                            <ListItem
                                key={option[valueKey]}
                                px={3}
                                py={2}
                                cursor="pointer"
                                _hover={{ bg: "gray.100" }}
                                onClick={() => handleSelect(option)}
                                borderBottom="1px"
                                borderColor="gray.100"
                                fontSize="sm"
                            >
                                {formatOption(option)}
                            </ListItem>
                        ))}
                        {filteredOptions.length === 0 && (
                            <ListItem px={3} py={2} color="gray.500" fontSize="sm">
                                No options found
                            </ListItem>
                        )}
                    </List>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};

export default function RateList() {
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [searchValue, setSearchValue] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Filter states - similar to customer table
    const [filters, setFilters] = useState({
        name: "",
        type: "",
        list_price: "",
        standard_price: "",
        default_code: "",
        client_specific: "",
        uom_id: "",
        currency_id: "",
    });
    const [showFilterFields, setShowFilterFields] = useState(false);

    // Modal states
    const { isOpen: isNewRateOpen, onOpen: onNewRateOpen, onClose: onNewRateClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    // Form states for new rate item
    const [newRateItem, setNewRateItem] = useState({
        name: "",
        location: "",
        list_price: "",
        standard_price: "",
        type: "",
        default_code: "",
        client_specific: false,
        rate_text: "",
        valid_until: "",
        inc_in_tariff: false,
        group_id: "",
        sort_order: "",
        remarks: "",
        uom_id: "",
        property_stock_inventory: "",
        currency_id: "",
        seller_ids: []
    });

    // Rate items state - will be populated from API
    const [rateItems, setRateItems] = useState([]);

    // Vendors state for seller dropdown
    const [vendors, setVendors] = useState([]);

    // Master data states
    const [uomList, setUomList] = useState([]);
    const [currenciesList, setCurrenciesList] = useState([]);
    const [locationsList, setLocationsList] = useState([]);
    const [groupsList, setGroupsList] = useState([]);

    const textColor = useColorModeValue("gray.700", "white");
    const hoverBg = useColorModeValue("blue.50", "blue.900");
    const searchIconColor = useColorModeValue("gray.400", "gray.500");
    const inputBg = useColorModeValue("white", "gray.700");
    const inputText = useColorModeValue("gray.700", "white");
    const borderColor = useColorModeValue("gray.200", "gray.600");

    // Fetch vendors for seller dropdown
    const fetchVendors = async () => {
        try {
            const response = await api.get("/api/vendor/list");
            const result = response.data;

            if (result.vendors && Array.isArray(result.vendors)) {
                setVendors(result.vendors);
            } else {
                setVendors([]);
            }
        } catch (error) {
            console.error("Failed to fetch vendors:", error);
            setVendors([]);
        }
    };

    // Fetch master data
    const fetchMasterData = async () => {
        try {
            // Fetch UOM
            const uomResponse = await uomAPI.getUOM();
            if (uomResponse.uom && Array.isArray(uomResponse.uom)) {
                setUomList(uomResponse.uom);
            } else {
                setUomList([]);
            }

            // Fetch Currencies
            const currenciesResponse = await currenciesAPI.getCurrencies();
            if (currenciesResponse.currencies && Array.isArray(currenciesResponse.currencies)) {
                setCurrenciesList(currenciesResponse.currencies);
            } else {
                setCurrenciesList([]);
            }

            // Fetch Locations
            const locationsResponse = await locationsAPI.getLocations();
            if (locationsResponse.locations && Array.isArray(locationsResponse.locations)) {
                setLocationsList(locationsResponse.locations);
            } else {
                setLocationsList([]);
            }

            // Fetch Groups
            const groupsResponse = await groupsAPI.getGroups();
            if (groupsResponse.groups && Array.isArray(groupsResponse.groups)) {
                setGroupsList(groupsResponse.groups);
            } else {
                setGroupsList([]);
            }
        } catch (error) {
            console.error("Failed to fetch master data:", error);
            setUomList([]);
            setCurrenciesList([]);
            setLocationsList([]);
            setGroupsList([]);
        }
    };

    // Fetch products
    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const response = await api.get("/api/products");
            const result = response.data;

            if (result.status === "success" && result.products) {
                setRateItems(result.products);
            } else {
                setRateItems([]);
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to fetch products: ${error.message}`,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Create new product
    const handleCreateProduct = async () => {
        try {
            setIsLoading(true);
            const userData = localStorage.getItem("user");
            if (!userData) {
                throw new Error("User data not found. Please login again.");
            }

            const user = JSON.parse(userData);
            const userId = user.id;

            const payload = {
                ...newRateItem,
                user_id: userId,
            };

            const response = await api.post("/api/product/create", payload);
            const result = response.data;

            if (result.result.status === "success") {
                toast({
                    title: "Product Created",
                    description: "New product has been successfully created.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });

                onNewRateClose();
                setNewRateItem({
                    name: "",
                    location: "",
                    list_price: "",
                    standard_price: "",
                    type: "",
                    default_code: "",
                    client_specific: false,
                    rate_text: "",
                    valid_until: "",
                    inc_in_tariff: "",
                    group_id: "",
                    sort_order: "",
                    remarks: "",
                    uom_id: "",
                    property_stock_inventory: "",
                    currency_id: "",
                    seller_ids: []
                });
                fetchProducts();
            } else {
                throw new Error(result.result.message || "Failed to create product");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to create product: ${error.message}`,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Update product
    const handleUpdateProduct = async () => {
        try {
            setIsLoading(true);
            const userData = localStorage.getItem("user");
            if (!userData) {
                throw new Error("User data not found. Please login again.");
            }

            const user = JSON.parse(userData);
            const userId = user.id;

            const payload = {
                ...editingItem,
                product_id: editingItem.id,
                user_id: userId,
            };

            const response = await api.post("/api/product/update", payload);
            const result = response.data;

            if (result.result.status === "success") {
                toast({
                    title: "Product Updated",
                    description: "Product has been successfully updated.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });

                setIsEditing(false);
                setEditingItem(null);
                onNewRateClose();

                // Refresh products list
                fetchProducts();
            } else {
                throw new Error(result.result.message || "Failed to update product");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to update product: ${error.message}`,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Delete product
    const handleDeleteProduct = async () => {
        try {
            setIsLoading(true);

            // Get user ID from localStorage
            const userData = localStorage.getItem("user");
            let userId = null;

            if (userData) {
                try {
                    const user = JSON.parse(userData);
                    userId = user.id;
                } catch (parseError) {
                    console.warn("Failed to parse user data from localStorage:", parseError);
                }
            }

            const payload = {
                id: deleteItemId,
                user_id: userId
            };

            const response = await api.post("/api/product/delete", payload);
            const result = response.data;

            if (result.result.status === "success") {
                toast({
                    title: "Product Deleted",
                    description: "Product has been successfully deleted.",
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });

                setDeleteItemId(null);
                onDeleteClose();

                // Refresh products list
                fetchProducts();
            } else {
                throw new Error(result.result.message || "Failed to delete product");
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to delete product: ${error.message}`,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Load products, vendors and master data on component mount
    useEffect(() => {
        fetchProducts();
        fetchVendors();
        fetchMasterData();
    }, []);

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedItems(rateItems.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (itemId, isChecked) => {
        if (isChecked) {
            setSelectedItems([...selectedItems, itemId]);
        } else {
            setSelectedItems(selectedItems.filter(id => id !== itemId));
        }
    };

    // Handler functions for modals
    const handleNewRate = () => {
        setIsEditing(false);
        setEditingItem(null);
        setNewRateItem({
            name: "",
            location: "",
            list_price: "",
            standard_price: "",
            type: "",
            default_code: "",
            client_specific: false,
            rate_text: "",
            valid_until: "",
            inc_in_tariff: false,
            group_id: "",
            sort_order: "",
            remarks: "",
            uom_id: "",
            property_stock_inventory: "",
            currency_id: "",
            seller_ids: []
        });
        onNewRateOpen();
    };

    const handleEditRate = (item) => {
        setIsEditing(true);
        setEditingItem({ ...item });
        onNewRateOpen();
    };

    const handleSaveRate = () => {
        if (isEditing) {
            handleUpdateProduct();
        } else {
            handleCreateProduct();
        }
    };

    const handleDeleteItem = (itemId) => {
        setDeleteItemId(itemId);
        onDeleteOpen();
    };

    const confirmDelete = () => {
        if (deleteItemId !== null) {
            handleDeleteProduct();
        }
    };

    const handleInputChange = (field, value) => {
        setNewRateItem(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSellerChange = (index, field, value) => {
        if (isEditing) {
            setEditingItem(prev => {
                const updated = { ...prev };
                const sellers = Array.isArray(updated.seller_ids) ? [...updated.seller_ids] : [];
                sellers[index] = { ...sellers[index], [field]: value };
                updated.seller_ids = sellers;
                return updated;
            });
        } else {
            setNewRateItem(prev => {
                const sellers = Array.isArray(prev.seller_ids) ? [...prev.seller_ids] : [];
                sellers[index] = { ...sellers[index], [field]: value };
                return { ...prev, seller_ids: sellers };
            });
        }
    };

    const addSellerRow = () => {
        const newRow = { id: "", min_qty: "", price: "", currency_id: "", delay: "" };
        if (isEditing) {
            setEditingItem(prev => ({
                ...prev,
                seller_ids: [...(prev.seller_ids || []), newRow]
            }));
        } else {
            setNewRateItem(prev => ({
                ...prev,
                seller_ids: [...(prev.seller_ids || []), newRow]
            }));
        }
    };

    const removeSellerRow = (index) => {
        if (isEditing) {
            setEditingItem(prev => {
                const sellers = [...(prev.seller_ids || [])];
                sellers.splice(index, 1);
                return { ...prev, seller_ids: sellers };
            });
        } else {
            setNewRateItem(prev => {
                const sellers = [...(prev.seller_ids || [])];
                sellers.splice(index, 1);
                return { ...prev, seller_ids: sellers };
            });
        }
    };

    // Filter handling functions - similar to customer table
    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            name: "",
            type: "",
            list_price: "",
            standard_price: "",
            default_code: "",
            client_specific: "",
            uom_id: "",
            currency_id: "",
        });
    };

    const clearAllFiltersAndSearch = () => {
        clearAllFilters();
        setSearchValue("");
        setStatusFilter("all");
        setCurrentPage(1);
    };

    // Reset pagination when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchValue, filters, statusFilter, itemsPerPage]);

    // Pagination logic
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // Filter data based on search and filters
    const filteredData = useMemo(() => {
        let filtered = rateItems;

        // Apply search filter
        if (searchValue) {
            filtered = filtered.filter(
                (item) => {
                    const searchLower = searchValue.toLowerCase();

                    // Search in basic fields
                    const basicMatch =
                        (item.rate_id && item.rate_id.toString().toLowerCase().includes(searchLower)) ||
                        (item.name && item.name.toLowerCase().includes(searchLower)) ||
                        (item.type && item.type.toLowerCase().includes(searchLower)) ||
                        (item.inc_in_tariff && item.inc_in_tariff.toString().toLowerCase().includes(searchLower));

                    // Search in seller names
                    let sellerMatch = false;
                    if (Array.isArray(item.seller_ids) && item.seller_ids.length > 0) {
                        sellerMatch = item.seller_ids.some(seller => {
                            const sellerId = seller.id || seller;
                            const vendor = vendors.find(v => v.id == sellerId);
                            return vendor && vendor.name && vendor.name.toLowerCase().includes(searchLower);
                        });
                    }

                    return basicMatch || sellerMatch;
                }
            );
        }

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter((item) => item.status === statusFilter);
        }

        // Apply specific filters
        if (filters.name) {
            filtered = filtered.filter(
                (item) =>
                    item.name && item.name.toLowerCase().includes(filters.name.toLowerCase())
            );
        }

        if (filters.type) {
            filtered = filtered.filter(
                (item) =>
                    item.type && item.type.toLowerCase().includes(filters.type.toLowerCase())
            );
        }

        if (filters.list_price) {
            filtered = filtered.filter(
                (item) =>
                    item.list_price && item.list_price.toString().includes(filters.list_price)
            );
        }

        if (filters.standard_price) {
            filtered = filtered.filter(
                (item) =>
                    item.standard_price && item.standard_price.toString().includes(filters.standard_price)
            );
        }

        if (filters.default_code) {
            filtered = filtered.filter(
                (item) =>
                    item.default_code && item.default_code.toLowerCase().includes(filters.default_code.toLowerCase())
            );
        }

        if (filters.client_specific !== "") {
            filtered = filtered.filter(
                (item) => item.client_specific === (filters.client_specific === "true")
            );
        }

        if (filters.uom_id) {
            filtered = filtered.filter(
                (item) =>
                    item.uom_id && item.uom_id.toString().includes(filters.uom_id)
            );
        }

        if (filters.currency_id) {
            filtered = filtered.filter(
                (item) =>
                    item.currency_id && item.currency_id.toString().includes(filters.currency_id)
            );
        }

        return filtered;
    }, [rateItems, searchValue, statusFilter, filters, vendors]);

    // Get paginated data
    const paginatedData = useMemo(() => {
        return filteredData.slice(startIndex, endIndex);
    }, [filteredData, startIndex, endIndex]);

    // Calculate total pages
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

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
                            onClick={handleNewRate}
                        >
                            New Product
                        </Button>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                                Product Rate List
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                Manage product pricing and rates
                            </Text>
                        </VStack>
                    </HStack>

                </Flex>

                {/* Filter Section */}
                <Box px='25px' mb='20px'>
                    <HStack spacing={4} flexWrap="wrap">
                        <InputGroup w={{ base: "100%", md: "600px" }}>
                            <InputLeftElement>
                                <Icon as={MdSearch} color={searchIconColor} w='15px' h='15px' />
                            </InputLeftElement>
                            <Input
                                variant='outline'
                                fontSize='sm'
                                bg={inputBg}
                                color={inputText}
                                fontWeight='500'
                                _placeholder={{ color: "gray.400", fontSize: "14px" }}
                                borderRadius="8px"
                                placeholder="Search by rate ID, name, type, inc in tariff, or seller name..."
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

                    {/* Expandable Filter Fields - Customer Table Style */}
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

                            {/* First Row */}
                            <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                                {/* Name Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Product Name
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by name"
                                        value={filters.name}
                                        onChange={(e) => handleFilterChange("name", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>

                                {/* Type Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Product Type
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by type"
                                        value={filters.type}
                                        onChange={(e) => handleFilterChange("type", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>
                            </HStack>

                            {/* Second Row */}
                            <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                                {/* List Price Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        List Price
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by list price"
                                        value={filters.list_price}
                                        onChange={(e) => handleFilterChange("list_price", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>

                                {/* Standard Price Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Standard Price
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by standard price"
                                        value={filters.standard_price}
                                        onChange={(e) => handleFilterChange("standard_price", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>
                            </HStack>

                            {/* Third Row */}
                            <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                                {/* Default Code Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Default Code
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by default code"
                                        value={filters.default_code}
                                        onChange={(e) => handleFilterChange("default_code", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>

                                {/* Client Specific Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Client Specific
                                    </Text>
                                    <Select
                                        size="sm"
                                        value={filters.client_specific}
                                        onChange={(e) => handleFilterChange("client_specific", e.target.value)}
                                        borderRadius="md"
                                    >
                                        <option value="">All</option>
                                        <option value="true">Yes</option>
                                        <option value="false">No</option>
                                    </Select>
                                </Box>
                            </HStack>

                            {/* Fourth Row */}
                            <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                                {/* UOM ID Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        UOM ID
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by UOM ID"
                                        value={filters.uom_id}
                                        onChange={(e) => handleFilterChange("uom_id", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>

                                {/* Currency ID Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Currency ID
                                    </Text>
                                    <Input
                                        size="sm"
                                        placeholder="Filter by currency ID"
                                        value={filters.currency_id}
                                        onChange={(e) => handleFilterChange("currency_id", e.target.value)}
                                        borderRadius="md"
                                    />
                                </Box>
                            </HStack>
                        </Box>
                    )}
                </Box>

                {/* Rate Items Table */}
                <Box px="25px">
                    <Box
                        maxH="600px"
                        overflowY="auto"
                        overflowX="auto"
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
                        <Table variant="unstyled" size="sm" minW="2000px">
                            <Thead bg="gray.100" position="sticky" top="0" zIndex="1">
                                <Tr>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Checkbox
                                            isChecked={selectedItems.length === filteredData.length}
                                            isIndeterminate={selectedItems.length > 0 && selectedItems.length < filteredData.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </Th>

                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Rate ID</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Name</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Client Specific</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Rate Text</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Valid Until</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Inc In Tariff</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Group ID</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Sort Order</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">List Price</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Standard Price</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Remarks</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Type</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">UOM ID</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Default Code</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Stock Inventory</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Currency ID</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Seller IDs</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="700" color="gray.600" textTransform="uppercase">Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {paginatedData.map((item, index) => (
                                    <Tr
                                        key={item.id}
                                        bg={index % 2 === 0 ? "white" : "gray.50"}
                                        _hover={{ bg: hoverBg }}
                                        borderBottom="1px"
                                        borderColor="gray.200">
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Checkbox
                                                isChecked={selectedItems.includes(item.id)}
                                                onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            />
                                        </Td>

                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.rate_id || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.name || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Badge
                                                colorScheme={item.client_specific ? "green" : "gray"}
                                                variant="subtle"
                                                fontSize="xs"
                                                px="8px"
                                                py="4px"
                                                borderRadius="full">
                                                {item.client_specific ? "Yes" : "No"}
                                            </Badge>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.rate_text || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.valid_until ? new Date(item.valid_until).toLocaleDateString() : '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Checkbox
                                                isChecked={!!item.inc_in_tariff}
                                                isReadOnly
                                                colorScheme="green"
                                                size="md"
                                            />
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {(() => {
                                                    const group = groupsList.find(g => g.id == item.group_id);
                                                    return group ? group.name : (item.group_id || '-');
                                                })()}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.sort_order || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm' fontWeight='600'>
                                                {item.list_price ? `$${item.list_price}` : '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm' fontWeight='600'>
                                                {item.standard_price ? `$${item.standard_price}` : '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.remarks || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Badge
                                                colorScheme="blue"
                                                variant="subtle"
                                                fontSize="xs"
                                                px="8px"
                                                py="4px"
                                                borderRadius="full">
                                                {item.type || '-'}
                                            </Badge>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {(() => {
                                                    const uom = uomList.find(u => u.id == item.uom_id);
                                                    return uom ? uom.name : (item.uom_id || '-');
                                                })()}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.default_code || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.property_stock_inventory || '-'}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {(() => {
                                                    const currency = currenciesList.find(c => c.id == item.currency_id);
                                                    return currency ? `${currency.name} (${currency.symbol})` : (item.currency_id || '-');
                                                })()}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {Array.isArray(item.seller_ids) && item.seller_ids.length > 0
                                                    ? item.seller_ids.map(seller => {
                                                        const sellerId = seller.id || seller;
                                                        const vendor = vendors.find(v => v.id == sellerId);
                                                        return vendor ? vendor.name : sellerId;
                                                    }).join(', ')
                                                    : '-'
                                                }
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <HStack spacing={2}>
                                                <Tooltip label="Edit Rate">
                                                    <IconButton
                                                        icon={<Icon as={MdEdit} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        aria-label="Edit rate"
                                                        onClick={() => handleEditRate(item)}
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Delete Rate">
                                                    <IconButton
                                                        icon={<Icon as={MdDelete} />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        aria-label="Delete rate"
                                                        onClick={() => handleDeleteItem(item.id)}
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

                {/* Pagination */}
                <Flex px='25px' justify='space-between' align='center' py='20px'>
                    {/* Records per page selector and info */}
                    <HStack spacing={3}>
                    <Text fontSize='sm' color='gray.500'>
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
                        <Text fontSize='sm' color='gray.500'>
                            Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} results
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
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
            </VStack>

            {/* New/Edit Product Modal */}
            <Modal isOpen={isNewRateOpen} onClose={onNewRateClose} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader bg="blue.600" color="white" borderRadius="md">
                        <HStack spacing={3}>
                            <Icon as={isEditing ? MdEdit : MdAdd} />
                            <Text>{isEditing ? "Edit Product" : "Create New Product"}</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton color="white" />
                    <ModalBody py="6">
                        <Grid templateColumns="repeat(2, 1fr)" gap="8">
                            {/* Left Column */}
                            <VStack spacing="4" align="stretch">


                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Rate Name</FormLabel>
                                    <Input
                                        size="md"
                                        value={isEditing ? editingItem?.name || "" : newRateItem.name}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, name: e.target.value }));
                                            } else {
                                                handleInputChange('name', e.target.value);
                                            }
                                        }}
                                        placeholder="Enter product name"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
                                        }}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Location</FormLabel>
                                    <SearchableSelect
                                        value={isEditing ? editingItem?.location || "" : newRateItem.location}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, location: value }));
                                            } else {
                                                handleInputChange('location', value);
                                            }
                                        }}
                                        options={locationsList}
                                        placeholder="Search and select location..."
                                        displayKey="name"
                                        valueKey="id"
                                        formatOption={(location) => `${location.id} - ${location.name}`}
                                    />
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">List Price</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.list_price || "" : newRateItem.list_price}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, list_price: value }));
                                            } else {
                                                handleInputChange('list_price', value);
                                            }
                                        }}
                                        min={0}
                                        step={0.01}
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <NumberInputField
                                            border="1px"
                                            borderColor="gray.300"
                                            _hover={{ borderColor: "gray.400" }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper
                                                h="16px"
                                                fontSize="10px"
                                                border="none"
                                                bg="transparent"
                                                _hover={{ bg: "gray.100" }}
                                            />
                                            <NumberDecrementStepper
                                                h="16px"
                                                fontSize="10px"
                                                border="none"
                                                bg="transparent"
                                                _hover={{ bg: "gray.100" }}
                                            />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Standard Price</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.standard_price || "" : newRateItem.standard_price}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, standard_price: value }));
                                            } else {
                                                handleInputChange('standard_price', value);
                                            }
                                        }}
                                        min={0}
                                        step={0.01}
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <NumberInputField
                                            border="1px"
                                            borderColor="gray.300"
                                            _hover={{ borderColor: "gray.400" }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper
                                                h="16px"
                                                fontSize="10px"
                                                border="none"
                                                bg="transparent"
                                                _hover={{ bg: "gray.100" }}
                                            />
                                            <NumberDecrementStepper
                                                h="16px"
                                                fontSize="10px"
                                                border="none"
                                                bg="transparent"
                                                _hover={{ bg: "gray.100" }}
                                            />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>
                            </VStack>

                            {/* Right Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Rate Text</FormLabel>
                                    <Input
                                        size="md"
                                        value={isEditing ? editingItem?.rate_text || "" : newRateItem.rate_text}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, rate_text: e.target.value }));
                                            } else {
                                                handleInputChange('rate_text', e.target.value);
                                            }
                                        }}
                                        placeholder="Rate per unit"
                                        borderRadius="md"
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Valid Until</FormLabel>
                                    <Input
                                        type="date"
                                        size="md"
                                        value={isEditing ? editingItem?.valid_until || "" : newRateItem.valid_until}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, valid_until: e.target.value }));
                                            } else {
                                                handleInputChange('valid_until', e.target.value);
                                            }
                                        }}
                                        borderRadius="md"
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Included In Tariff</FormLabel>
                                    <Checkbox
                                        isChecked={isEditing ? !!editingItem?.inc_in_tariff : !!newRateItem.inc_in_tariff}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, inc_in_tariff: e.target.checked }));
                                            } else {
                                                handleInputChange('inc_in_tariff', e.target.checked);
                                            }
                                        }}
                                        colorScheme="green"
                                        size="md"
                                    >
                                        Include this rate in tariff
                                    </Checkbox>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Group ID</FormLabel>
                                    <SearchableSelect
                                        value={isEditing ? editingItem?.group_id || "" : newRateItem.group_id}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, group_id: value }));
                                            } else {
                                                handleInputChange('group_id', value);
                                            }
                                        }}
                                        options={groupsList}
                                        placeholder="Search and select group..."
                                        displayKey="name"
                                        valueKey="id"
                                        formatOption={(group) => `${group.id} - ${group.name}`}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Sort Order</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.sort_order || "" : newRateItem.sort_order}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, sort_order: value }));
                                            } else {
                                                handleInputChange('sort_order', value);
                                            }
                                        }}
                                        min={0}
                                    >
                                        <NumberInputField border="1px" borderColor="gray.300" _hover={{ borderColor: "gray.400" }} />
                                    </NumberInput>
                                </FormControl>
                            </VStack>
                        </Grid>

                        {/* Additional Fields Row */}
                        <Grid templateColumns="repeat(2, 1fr)" gap="8" mt="6">
                            {/* Left Column - Additional Fields */}
                            <VStack spacing="4" align="stretch">
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Type</FormLabel>
                                    <Select
                                        size="md"
                                        value={isEditing ? editingItem?.type || "" : newRateItem.type}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, type: e.target.value }));
                                            } else {
                                                handleInputChange('type', e.target.value);
                                            }
                                        }}
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
                                        }}
                                    >
                                        <option value="">Select type</option>
                                        <option value="consu">Consumable</option>
                                        <option value="service">Service</option>
                                        <option value="product">Product</option>
                                    </Select>
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Default Code</FormLabel>
                                    <Input
                                        size="md"
                                        value={isEditing ? editingItem?.default_code || "" : newRateItem.default_code}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, default_code: e.target.value }));
                                            } else {
                                                handleInputChange('default_code', e.target.value);
                                            }
                                        }}
                                        placeholder="Enter default code"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
                                        }}
                                    />
                                </FormControl>



                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Remarks</FormLabel>
                                    <Textarea
                                        value={isEditing ? editingItem?.remarks || "" : newRateItem.remarks}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, remarks: e.target.value }));
                                            } else {
                                                handleInputChange('remarks', e.target.value);
                                            }
                                        }}
                                        placeholder="Special product for testing"
                                        borderRadius="md"
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Client Specific</FormLabel>
                                    <Checkbox
                                        isChecked={isEditing ? !!editingItem?.client_specific : !!newRateItem.client_specific}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, client_specific: e.target.checked }));
                                            } else {
                                                handleInputChange('client_specific', e.target.checked);
                                            }
                                        }}
                                    >
                                        This rate is client specific
                                    </Checkbox>
                                </FormControl>
                            </VStack>

                            {/* Right Column - Additional Fields */}
                            <VStack spacing="4" align="stretch">
                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">UOM ID</FormLabel>
                                    <SearchableSelect
                                        value={isEditing ? editingItem?.uom_id || "" : newRateItem.uom_id}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, uom_id: value }));
                                            } else {
                                                handleInputChange('uom_id', value);
                                            }
                                        }}
                                        options={uomList}
                                        placeholder="Search and select UOM..."
                                        displayKey="name"
                                        valueKey="id"
                                        formatOption={(uom) => `${uom.id} - ${uom.name}`}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Property Stock Inventory</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.property_stock_inventory || "" : newRateItem.property_stock_inventory}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, property_stock_inventory: value }));
                                            } else {
                                                handleInputChange('property_stock_inventory', value);
                                            }
                                        }}
                                        min={0}
                                    >
                                        <NumberInputField border="1px" borderColor="gray.300" _hover={{ borderColor: "gray.400" }} />
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Currency ID</FormLabel>
                                    <SearchableSelect
                                        value={isEditing ? editingItem?.currency_id || "" : newRateItem.currency_id}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, currency_id: value }));
                                            } else {
                                                handleInputChange('currency_id', value);
                                            }
                                        }}
                                        options={currenciesList}
                                        placeholder="Search and select currency..."
                                        displayKey="name"
                                        valueKey="id"
                                        formatOption={(currency) => `${currency.id} - ${currency.name} (${currency.symbol})`}
                                    />
                                </FormControl>
                            </VStack>
                        </Grid>

                        {/* Seller IDs Section */}
                        <Box mt="6" p="4" border="1px" borderColor="gray.200" borderRadius="md">
                            <HStack justify="space-between" mb="4">
                                <Text fontSize="sm" fontWeight="600" color="gray.700">
                                    Seller Pricing Details
                                </Text>
                                <Button
                                    size="sm"
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={addSellerRow}
                                    leftIcon={<Icon as={MdAdd} />}
                                >
                                    Add Seller
                                </Button>
                            </HStack>

                            {(isEditing ? editingItem?.seller_ids : newRateItem.seller_ids)?.map((seller, index) => (
                                <Box key={index} p="4" border="1px" borderColor="gray.200" borderRadius="md" mb="3">
                                    <HStack justify="space-between" mb="3">
                                        <Text fontSize="sm" fontWeight="500" color="gray.600">
                                            Seller {index + 1}
                                        </Text>
                                        <IconButton
                                            size="sm"
                                            colorScheme="red"
                                            variant="ghost"
                                            icon={<Icon as={MdDelete} />}
                                            onClick={() => removeSellerRow(index)}
                                            aria-label="Remove seller"
                                        />
                                    </HStack>

                                    <Grid templateColumns="repeat(2, 1fr)" gap="4">
                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Seller ID</FormLabel>
                                            <SearchableSelect
                                                value={seller.id || ""}
                                                onChange={(value) => handleSellerChange(index, 'id', value)}
                                                options={vendors}
                                                placeholder="Select seller..."
                                                displayKey="name"
                                                valueKey="id"
                                                formatOption={(vendor) => `${vendor.id} - ${vendor.name}`}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Min Quantity</FormLabel>
                                            <NumberInput
                                                size="sm"
                                                value={seller.min_qty || ""}
                                                onChange={(value) => handleSellerChange(index, 'min_qty', value)}
                                                min={0}
                                            >
                                                <NumberInputField border="1px" borderColor="gray.300" />
                                            </NumberInput>
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Price</FormLabel>
                                            <NumberInput
                                                size="sm"
                                                value={seller.price || ""}
                                                onChange={(value) => handleSellerChange(index, 'price', value)}
                                                min={0}
                                                step={0.01}
                                            >
                                                <NumberInputField border="1px" borderColor="gray.300" />
                                            </NumberInput>
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Currency</FormLabel>
                                            <SearchableSelect
                                                value={seller.currency_id || ""}
                                                onChange={(value) => handleSellerChange(index, 'currency_id', value)}
                                                options={currenciesList}
                                                placeholder="Select currency..."
                                                displayKey="name"
                                                valueKey="id"
                                                formatOption={(currency) => `${currency.id} - ${currency.name} (${currency.symbol})`}
                                            />
                                        </FormControl>

                                        <FormControl>
                                            <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Delay (days)</FormLabel>
                                            <NumberInput
                                                size="sm"
                                                value={seller.delay || ""}
                                                onChange={(value) => handleSellerChange(index, 'delay', value)}
                                                min={0}
                                            >
                                                <NumberInputField border="1px" borderColor="gray.300" />
                                            </NumberInput>
                                        </FormControl>
                                    </Grid>
                                </Box>
                            ))}

                            {(!isEditing ? newRateItem.seller_ids : editingItem?.seller_ids)?.length === 0 && (
                                <Text color="gray.500" textAlign="center" py="4">
                                    No sellers added. Click "Add Seller" to add pricing details.
                                </Text>
                            )}
                        </Box>
                    </ModalBody>
                    <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
                        <Button variant="outline" mr={3} onClick={onNewRateClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={handleSaveRate}
                            isLoading={isLoading}
                        >
                            {isEditing ? "Update Product" : "Create Product"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <AlertDialogOverlay />
                <AlertDialogContent borderRadius="lg">
                    <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
                        Delete Product
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to delete this product? This action cannot be undone.
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