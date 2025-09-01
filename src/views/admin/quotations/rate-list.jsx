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
} from "react-icons/md";
import { buildApiUrl, getApiEndpoint, API_CONFIG } from "../../../config/api";
import api from "../../../api/axios";

export default function RateList() {
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchValue, setSearchValue] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Filter states - similar to customer table
    const [filters, setFilters] = useState({
        name: "",
        type: "",
        list_price: "",
        standard_price: "",
        default_code: "",
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
        inc_in_tariff: "",
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

    const textColor = useColorModeValue("gray.700", "white");
    const hoverBg = useColorModeValue("blue.50", "blue.900");
    const searchIconColor = useColorModeValue("gray.400", "gray.500");
    const inputBg = useColorModeValue("white", "gray.700");
    const inputText = useColorModeValue("gray.700", "white");
    const borderColor = useColorModeValue("gray.200", "gray.600");

    // Fetch products
    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            const response = await api.get(getApiEndpoint("PRODUCTS"));
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

            const response = await api.post(getApiEndpoint("PRODUCT_CREATE"), payload);
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
                id: editingItem.id,
                user_id: userId,
            };

            const response = await api.post(getApiEndpoint("PRODUCT_UPDATE"), payload);
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

            const response = await api.post(getApiEndpoint("PRODUCT_DELETE"), payload);
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

    // Load products on component mount
    useEffect(() => {
        fetchProducts();
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
            inc_in_tariff: "",
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
        });
    };

    const clearAllFiltersAndSearch = () => {
        clearAllFilters();
        setSearchValue("");
        setStatusFilter("all");
    };

    // Filter data based on search and filters
    const filteredData = useMemo(() => {
        let filtered = rateItems;

        // Apply search filter
        if (searchValue) {
            filtered = filtered.filter(
                (item) =>
                    item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                    item.default_code.toLowerCase().includes(searchValue.toLowerCase()) ||
                    item.type.toLowerCase().includes(searchValue.toLowerCase())
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

        return filtered;
    }, [rateItems, searchValue, statusFilter, filters]);

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

                    <HStack spacing={4}>
                        <HStack spacing={2}>
                            <Text fontSize="sm" color="gray.600">
                                {filteredData.length} items
                            </Text>
                            <IconButton
                                icon={<Icon as={MdArrowBack} />}
                                size="sm"
                                variant="ghost"
                                aria-label="Previous"
                                isDisabled={currentPage === 1}
                            />
                            <IconButton
                                icon={<Icon as={MdArrowForward} />}
                                size="sm"
                                variant="ghost"
                                aria-label="Next"
                                isDisabled={currentPage === totalPages}
                            />
                        </HStack>
                        <HStack spacing={2}>
                            <Tooltip label="Export">
                                <IconButton
                                    icon={<Icon as={MdDownload} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Export"
                                />
                            </Tooltip>
                            <Tooltip label="Print">
                                <IconButton
                                    icon={<Icon as={MdPrint} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Print"
                                />
                            </Tooltip>
                        </HStack>
                    </HStack>
                </Flex>

                {/* Filter Section */}
                <Box px='25px' mb='20px'>
                    <HStack spacing={4} flexWrap="wrap">
                        <InputGroup w={{ base: "100%", md: "300px" }}>
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
                                placeholder="Search products..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </InputGroup>

                        <Select
                            w={{ base: "100%", md: "200px" }}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            bg={inputBg}
                            color={inputText}
                            borderRadius="8px"
                            fontSize="sm"
                            zIndex={1000}
                            position="relative"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </Select>

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
                            <HStack spacing={6} flexWrap="wrap" align="flex-start">
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
                            </HStack>
                        </Box>
                    )}
                </Box>

                {/* Rate Items Table */}
                <Box px="25px">
                    <Box
                        maxH="400px"
                        overflowY="auto"
                        border="1px"
                        borderColor="gray.200"
                        borderRadius="8px"
                        sx={{
                            '&::-webkit-scrollbar': {
                                width: '8px',
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
                        <Table variant="unstyled" size="sm" minW="100%">
                            <Thead bg="gray.100" position="sticky" top="0" zIndex="1">
                                <Tr>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Checkbox
                                            isChecked={selectedItems.length === filteredData.length}
                                            isIndeterminate={selectedItems.length > 0 && selectedItems.length < filteredData.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Rate ID</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Name</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">List Price</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Standard Price</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Type</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Default Code</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {filteredData.map((item, index) => (
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
                                            <Text color={textColor} fontSize='sm' fontWeight='600'>
                                                {item.id}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.name}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm' fontWeight='600'>
                                                ${item.list_price}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm' fontWeight='600'>
                                                ${item.standard_price}
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
                                                {item.type}
                                            </Badge>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.default_code}
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
                    <Text fontSize='sm' color='gray.500'>
                        Showing {filteredData.length} of {rateItems.length} results
                    </Text>
                    <HStack spacing={2}>
                        <Button
                            size="sm"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            isDisabled={currentPage === 1}
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            variant="outline"
                        >
                            Next
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
                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Rate ID</FormLabel>
                                    <Input
                                        size="md"
                                        value={isEditing ? (editingItem?.id ?? "") : ""}
                                        isDisabled
                                        placeholder="Auto-generated"
                                        borderRadius="md"
                                    />
                                </FormControl>

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
                                    <Input
                                        size="md"
                                        value={isEditing ? editingItem?.location || "" : newRateItem.location}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, location: e.target.value }));
                                            } else {
                                                handleInputChange('location', e.target.value);
                                            }
                                        }}
                                        placeholder="Enter location"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
                                        }}
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
                                    <Input
                                        size="md"
                                        value={isEditing ? editingItem?.inc_in_tariff || "" : newRateItem.inc_in_tariff}
                                        onChange={(e) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, inc_in_tariff: e.target.value }));
                                            } else {
                                                handleInputChange('inc_in_tariff', e.target.value);
                                            }
                                        }}
                                        placeholder="tariff"
                                        borderRadius="md"
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Group ID</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.group_id || "" : newRateItem.group_id}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, group_id: value }));
                                            } else {
                                                handleInputChange('group_id', value);
                                            }
                                        }}
                                        min={0}
                                    >
                                        <NumberInputField border="1px" borderColor="gray.300" _hover={{ borderColor: "gray.400" }} />
                                    </NumberInput>
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
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.uom_id || "" : newRateItem.uom_id}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, uom_id: value }));
                                            } else {
                                                handleInputChange('uom_id', value);
                                            }
                                        }}
                                        min={0}
                                    >
                                        <NumberInputField border="1px" borderColor="gray.300" _hover={{ borderColor: "gray.400" }} />
                                    </NumberInput>
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
                                    <NumberInput
                                        size="sm"
                                        value={isEditing ? editingItem?.currency_id || "" : newRateItem.currency_id}
                                        onChange={(value) => {
                                            if (isEditing) {
                                                setEditingItem(prev => ({ ...prev, currency_id: value }));
                                            } else {
                                                handleInputChange('currency_id', value);
                                            }
                                        }}
                                        min={0}
                                    >
                                        <NumberInputField border="1px" borderColor="gray.300" _hover={{ borderColor: "gray.400" }} />
                                    </NumberInput>
                                </FormControl>
                            </VStack>
                        </Grid>

                        {/* Seller IDs Section */}
                        <Box mt="8">
                            <HStack justify="space-between" mb="3">
                                <Text fontSize="md" fontWeight="600">Sellers</Text>
                                <Button size="sm" leftIcon={<Icon as={MdAdd} />} onClick={addSellerRow}>
                                    Add Seller
                                </Button>
                            </HStack>
                            <VStack spacing="4" align="stretch">
                                {(isEditing ? (editingItem?.seller_ids || []) : (newRateItem.seller_ids || [])).map((seller, idx) => (
                                    <Box key={idx} border="1px" borderColor="gray.200" borderRadius="md" p="4">
                                        <Grid templateColumns="repeat(5, 1fr)" gap="4" alignItems="end">
                                            <FormControl>
                                                <FormLabel fontSize="xs">Seller ID</FormLabel>
                                                <NumberInput size="sm" value={seller?.id ?? ""} onChange={(value) => handleSellerChange(idx, 'id', value)} min={0}>
                                                    <NumberInputField border="1px" borderColor="gray.300" />
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="xs">Min Qty</FormLabel>
                                                <NumberInput size="sm" value={seller?.min_qty ?? ""} onChange={(value) => handleSellerChange(idx, 'min_qty', value)} min={0}>
                                                    <NumberInputField border="1px" borderColor="gray.300" />
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="xs">Price</FormLabel>
                                                <NumberInput size="sm" value={seller?.price ?? ""} onChange={(value) => handleSellerChange(idx, 'price', value)} min={0} step={0.01}>
                                                    <NumberInputField border="1px" borderColor="gray.300" />
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="xs">Currency ID</FormLabel>
                                                <NumberInput size="sm" value={seller?.currency_id ?? ""} onChange={(value) => handleSellerChange(idx, 'currency_id', value)} min={0}>
                                                    <NumberInputField border="1px" borderColor="gray.300" />
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel fontSize="xs">Delay</FormLabel>
                                                <NumberInput size="sm" value={seller?.delay ?? ""} onChange={(value) => handleSellerChange(idx, 'delay', value)} min={0}>
                                                    <NumberInputField border="1px" borderColor="gray.300" />
                                                </NumberInput>
                                            </FormControl>
                                        </Grid>
                                        <Flex justify="flex-end" mt="3">
                                            <Button size="xs" colorScheme="red" leftIcon={<Icon as={MdDelete} />} onClick={() => removeSellerRow(idx)}>
                                                Remove
                                            </Button>
                                        </Flex>
                                    </Box>
                                ))}
                            </VStack>
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