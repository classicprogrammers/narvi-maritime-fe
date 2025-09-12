import React, { useState, useEffect, useMemo } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    Icon,
    HStack,
    IconButton,
    useColorModeValue,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Card,
    Input,
    InputGroup,
    InputLeftElement,
    Select,
    Tooltip,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    VStack,
    useToast,
    FormControl,
    FormLabel,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Textarea,
} from "@chakra-ui/react";
import { MdRefresh, MdEdit, MdSearch, MdFilterList, MdSave, MdClose } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";

export default function StockList() {
    const [searchValue, setSearchValue] = useState("");
    const [filters, setFilters] = useState({
        status: "",
    });
    const [sortOrder, setSortOrder] = useState("newest");
    const [showFilterFields, setShowFilterFields] = useState(false);
    const [editingStock, setEditingStock] = useState(null);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const {
        stockList,
        isLoading,
        error,
        updateLoading,
        getStockList,
        updateStockItem,
    } = useStock();

    // Track if we're refreshing after an update
    const [isRefreshing, setIsRefreshing] = useState(false);

    const textColor = useColorModeValue("gray.700", "white");
    const inputBg = useColorModeValue("white", "navy.900");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const hoverBg = useColorModeValue("blue.50", "gray.700");
    const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
    const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
    const tableRowBg = useColorModeValue("white", "gray.800");
    const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
    const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const tableTextColor = useColorModeValue("gray.600", "gray.300");
    const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
    const placeholderColor = useColorModeValue("gray.400", "gray.500");

    // Fetch stock list on component mount
    useEffect(() => {
        if (stockList.length === 0 && !isLoading) {
            getStockList();
        }
    }, [getStockList, stockList.length, isLoading]);

    // Track refresh state after updates
    useEffect(() => {
        if (isLoading && stockList.length > 0) {
            setIsRefreshing(true);
        } else {
            setIsRefreshing(false);
        }
    }, [isLoading, stockList.length]);

    // Apply custom sorting
    const applyCustomSorting = (data) => {
        if (sortOrder === "newest") {
            return [...data].sort((a, b) => new Date(b.sl_create_datetime || b.id) - new Date(a.sl_create_datetime || a.id));
        } else if (sortOrder === "oldest") {
            return [...data].sort((a, b) => new Date(a.sl_create_datetime || a.id) - new Date(b.sl_create_datetime || b.id));
        } else if (sortOrder === "alphabetical") {
            return [...data].sort((a, b) => (a.stock_item_id || "").localeCompare(b.stock_item_id || ""));
        }
        return data;
    };

    // Filter and sort data
    const filteredAndSortedStock = useMemo(() => {
        let filtered = stockList;

        // Apply search filter
        if (searchValue) {
            filtered = filtered.filter(
                (item) =>
                    (item.stock_item_id && item.stock_item_id.toLowerCase().includes(searchValue.toLowerCase())) ||
                    (item.id && item.id.toString().includes(searchValue)) ||
                    (item.client_id && item.client_id.toString().includes(searchValue)) ||
                    (item.vessel_id && item.vessel_id.toString().includes(searchValue))
            );
        }

        // Apply status filter
        if (filters.status) {
            filtered = filtered.filter((item) => item.stock_status === filters.status);
        }

        return applyCustomSorting(filtered);
    }, [stockList, searchValue, filters, sortOrder]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            status: "",
        });
    };

    const clearAllFiltersAndSorting = () => {
        clearAllFilters();
        setSearchValue("");
        setSortOrder("newest");
    };

    const handleEditStock = (stock) => {
        setEditingStock({ ...stock });
        onOpen();
    };

    const handleSaveStock = async () => {
        if (!editingStock) return;

        try {
            // Find the original stock item for comparison
            const originalStock = stockList.find(item => item.id === editingStock.id);
            
            const result = await updateStockItem(editingStock.id, editingStock, originalStock);
            if (result.success) {
                toast({
                    title: 'Success',
                    description: 'Stock item updated successfully',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                onClose();
                setEditingStock(null);
                // Note: Auto-refresh is handled in the Redux action
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update stock item',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleCancelEdit = () => {
        onClose();
        setEditingStock(null);
    };

    const handleInputChange = (field, value) => {
        setEditingStock((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString();
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case "delivered":
                return "green";
            case "in_transit":
                return "blue";
            case "pending":
                return "orange";
            case "cancelled":
                return "red";
            default:
                return "gray";
        }
    };

    // Show loading state
    if (isLoading && stockList.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Flex justify="center" align="center" h="200px">
                    <HStack spacing="4">
                        <Spinner size="xl" color="#1c4a95" />
                        <Text>Loading stock list...</Text>
                    </HStack>
                </Flex>
            </Box>
        );
    }

    // Show error state
    if (error && stockList.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Alert status="error">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Error loading stock list!</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Box>
                </Alert>
                <Button mt="4" onClick={() => getStockList()} leftIcon={<Icon as={MdRefresh} />}>
                    Retry
                </Button>
            </Box>
        );
    }

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <Card
                direction="column"
                w="100%"
                px="0px"
                overflowX={{ sm: "scroll", lg: "hidden" }}
            >
                {/* Header */}
                <Flex px="25px" justify="space-between" mt="20px" mb="20px" align="center">
                    <HStack spacing="3">
                        <Text
                            color={textColor}
                            fontSize="22px"
                            fontWeight="700"
                            lineHeight="100%"
                        >
                            Stock List Management
                        </Text>
                        {isRefreshing && (
                            <HStack spacing="2">
                                <Spinner size="sm" color="blue.500" />
                                <Text fontSize="sm" color="blue.500">
                                    Refreshing...
                                </Text>
                            </HStack>
                        )}
                    </HStack>
                    <HStack spacing="3">
                            <IconButton
                                size="sm"
                                    icon={<Icon as={MdRefresh} />}
                                    variant="ghost"
                                    aria-label="Refresh"
                            onClick={() => getStockList()}
                            isLoading={isLoading}
                        />
                    </HStack>
                </Flex>

                {/* Enhanced Filter & Sort Section */}
                <Box px="25px" mb="20px">
                    <HStack spacing={6} flexWrap="wrap" align="flex-start">
                        {/* Search */}
                        <Box minW="300px" flex="1">
                            <Text fontSize="sm" fontWeight="600" color={textColor} mb={2}>
                                Search Stock Items
                            </Text>
                            <InputGroup>
                            <InputLeftElement>
                                    <Icon as={MdSearch} color={textColor} />
                            </InputLeftElement>
                            <Input
                                    variant="outline"
                                    fontSize="sm"
                                bg={inputBg}
                                color={inputText}
                                borderRadius="8px"
                                    placeholder="Search stock items, IDs, clients, vessels..."
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
                                variant={filters.status ? "solid" : "outline"}
                                colorScheme={filters.status ? "blue" : "gray"}
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
                        {(filters.status || searchValue || sortOrder !== "newest") && (
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

                            <HStack spacing={6} flexWrap="wrap" align="flex-start" mb={4}>
                                {/* Status Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Status
                                    </Text>
                                <Select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange("status", e.target.value)}
                                    size="sm"
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
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="in_transit">In Transit</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                </Select>
                                </Box>
                            </HStack>
                        </Box>
                        )}
                </Box>

                {/* Table Container */}
                <Box pr="25px" overflowX="auto">
                    <Table
                        variant="unstyled"
                        size="sm"
                        minW="1200px"
                        ml="25px"
                    >
                        <Thead bg={tableHeaderBg}>
                            <Tr>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Stock Item ID
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Status
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Client ID
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Vessel ID
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    SO Number
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Weight (kg)
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Value
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Create Date
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                    borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                    color={tableTextColor}
                                        textTransform="uppercase"
                                    >
                                    Actions
                                    </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {isLoading ? (
                                <Tr>
                                    <Td colSpan={9} textAlign="center" py="8">
                                        <Spinner size="lg" color="blue.500" />
                                    </Td>
                                </Tr>
                            ) : filteredAndSortedStock.length === 0 ? (
                                <Tr>
                                    <Td colSpan={9} textAlign="center" py="8">
                                        <Text color={tableTextColor} fontSize="lg">
                                            {searchValue || Object.values(filters).some(f => f) 
                                                ? "No stock items match your search criteria." 
                                                : "No stock items available."}
                                        </Text>
                                    </Td>
                                </Tr>
                            ) : (
                                filteredAndSortedStock.map((item, index) => (
                                    <Tr
                                        key={item.id}
                                        bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                                        borderBottom="1px"
                                        borderColor={tableBorderColor}
                                    >
                                        <Td
                                        borderRight="1px"
                                            borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        >
                                            <Text
                                                color={textColor}
                                                fontSize="sm"
                                        fontWeight="600"
                                            >
                                                {item.stock_item_id || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                        borderRight="1px"
                                            borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        >
                                            <Badge
                                                colorScheme={getStatusColor(item.stock_status)}
                                                size="sm"
                                                borderRadius="full"
                                                px="3"
                                                py="1"
                                            >
                                                {item.stock_status || "-"}
                                            </Badge>
                                        </Td>
                                        <Td
                                        borderRight="1px"
                                            borderColor={tableBorderColor}
                                        py="12px"
                                        px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {item.client_id || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {item.vessel_id || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {item.so_number_id || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {item.weight_kg || "0.0"} kg
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {item.value || "0.0"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {formatDate(item.sl_create_datetime)}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <HStack spacing="2">
                                                <Tooltip label="Edit Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdEdit} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        onClick={() => handleEditStock(item)}
                                                        aria-label="Edit stock item"
                                                    />
                                                </Tooltip>
                                            </HStack>
                                        </Td>
                                    </Tr>
                                ))
                            )}
                            </Tbody>
                        </Table>
                </Box>

                {/* Results Summary */}
                <Flex px="25px" justify="space-between" align="center" py="20px">
                    <Text fontSize="sm" color={tableTextColorSecondary}>
                        Showing {filteredAndSortedStock.length} of {stockList.length} stock items
                    </Text>
                </Flex>
            </Card>

            {/* Edit Stock Item Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="4xl">
                <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
                <ModalContent maxW="900px" borderRadius="xl" boxShadow="2xl">
                    <ModalHeader
                        bg="linear-gradient(135deg, #1c4a95 0%, #2c5aa0 100%)"
                        color="white"
                        borderRadius="xl 0 0 0"
                        py="6"
                    >
                        <VStack align="start" spacing="2">
                            <Text fontSize="xl" fontWeight="bold">
                                Edit Stock Item
                            </Text>
                            <Text fontSize="lg" opacity="0.9">
                                {editingStock?.stock_item_id}
                            </Text>
                        </VStack>
                    </ModalHeader>
                    <ModalCloseButton color="white" size="lg" />
                    <ModalBody p="6">
                        {editingStock && (
                            <VStack spacing={6}>
                                {/* Basic Information */}
                                <Box w="100%">
                                    <Text fontSize="lg" fontWeight="600" color={textColor} mb={4}>
                                        Basic Information
                                    </Text>
                                    <VStack spacing={4}>
                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Stock Item ID</FormLabel>
                                                <Input
                                                    value={editingStock.stock_item_id || ""}
                                                    isReadOnly
                                                    bg="gray.100"
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Status</FormLabel>
                                                <Select
                                                    value={editingStock.stock_status || ""}
                                                    onChange={(e) => handleInputChange("stock_status", e.target.value)}
                                                    bg={inputBg}
                                                    color={inputText}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="in_transit">In Transit</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </Select>
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Weight (kg)</FormLabel>
                                                <NumberInput
                                                    value={editingStock.weight_kg || 0}
                                                    onChange={(value) => handleInputChange("weight_kg", parseFloat(value) || 0)}
                                                    min={0}
                                                    precision={2}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Value</FormLabel>
                                                <NumberInput
                                                    value={editingStock.value || 0}
                                                    onChange={(value) => handleInputChange("value", parseFloat(value) || 0)}
                                                    min={0}
                                                    precision={2}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>PCS Count</FormLabel>
                                                <NumberInput
                                                    value={editingStock.pcs_count || 0}
                                                    onChange={(value) => handleInputChange("pcs_count", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Length (cm)</FormLabel>
                                                <NumberInput
                                                    value={editingStock.length_cm || 0}
                                                    onChange={(value) => handleInputChange("length_cm", parseFloat(value) || 0)}
                                                    min={0}
                                                    precision={2}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Width (cm)</FormLabel>
                                                <NumberInput
                                                    value={editingStock.width_cm || 0}
                                                    onChange={(value) => handleInputChange("width_cm", parseFloat(value) || 0)}
                                                    min={0}
                                                    precision={2}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Height (cm)</FormLabel>
                                                <NumberInput
                                                    value={editingStock.height_cm || 0}
                                                    onChange={(value) => handleInputChange("height_cm", parseFloat(value) || 0)}
                                                    min={0}
                                                    precision={2}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Volume (CBM)</FormLabel>
                                                <NumberInput
                                                    value={editingStock.volume_cbm || 0}
                                                    onChange={(value) => handleInputChange("volume_cbm", parseFloat(value) || 0)}
                                                    min={0}
                                                    precision={2}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Client ID</FormLabel>
                                                <NumberInput
                                                    value={editingStock.client_id || 0}
                                                    onChange={(value) => handleInputChange("client_id", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Vessel ID</FormLabel>
                                                <NumberInput
                                                    value={editingStock.vessel_id || 0}
                                                    onChange={(value) => handleInputChange("vessel_id", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Supplier ID</FormLabel>
                                                <NumberInput
                                                    value={editingStock.supplier_id || 0}
                                                    onChange={(value) => handleInputChange("supplier_id", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Origin</FormLabel>
                                                <NumberInput
                                                    value={editingStock.origin || 0}
                                                    onChange={(value) => handleInputChange("origin", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Destination</FormLabel>
                                                <NumberInput
                                                    value={editingStock.destination || 0}
                                                    onChange={(value) => handleInputChange("destination", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Warehouse ID</FormLabel>
                                                <NumberInput
                                                    value={editingStock.warehouse_id || 0}
                                                    onChange={(value) => handleInputChange("warehouse_id", parseInt(value) || 0)}
                                                    min={0}
                                                >
                                                    <NumberInputField />
                                                    <NumberInputStepper>
                                                        <NumberIncrementStepper />
                                                        <NumberDecrementStepper />
                                                    </NumberInputStepper>
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Extra</FormLabel>
                                                <Input
                                                    value={editingStock.extra || ""}
                                                    onChange={(e) => handleInputChange("extra", e.target.value)}
                                                    placeholder="Enter extra information..."
                                                    bg={inputBg}
                                                    color={inputText}
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Item Description</FormLabel>
                                                <Input
                                                    value={editingStock.item_desc || ""}
                                                    onChange={(e) => handleInputChange("item_desc", e.target.value)}
                                                    placeholder="Enter item description..."
                                                    bg={inputBg}
                                                    color={inputText}
                                                />
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Date on Stock</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={editingStock.date_on_stock || ""}
                                                    onChange={(e) => handleInputChange("date_on_stock", e.target.value)}
                                                    bg={inputBg}
                                                    color={inputText}
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Expected Ready in Stock</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={editingStock.exp_ready_in_stock || ""}
                                                    onChange={(e) => handleInputChange("exp_ready_in_stock", e.target.value)}
                                                    bg={inputBg}
                                                    color={inputText}
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Shipped Date</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={editingStock.shipped_date || ""}
                                                    onChange={(e) => handleInputChange("shipped_date", e.target.value)}
                                                    bg={inputBg}
                                                    color={inputText}
                                                />
                                            </FormControl>
                                        </HStack>

                                        <HStack spacing={4} w="100%">
                                            <FormControl>
                                                <FormLabel>Delivered Date</FormLabel>
                                                <Input
                                                    type="date"
                                                    value={editingStock.delivered_date || ""}
                                                    onChange={(e) => handleInputChange("delivered_date", e.target.value)}
                                                    bg={inputBg}
                                                    color={inputText}
                                                />
                                            </FormControl>
                                            <FormControl>
                                                <FormLabel>Submit to Stock DB</FormLabel>
                                                <Select
                                                    value={editingStock.submit_to_stockdb ? "true" : "false"}
                                                    onChange={(e) => handleInputChange("submit_to_stockdb", e.target.value === "true")}
                                                    bg={inputBg}
                                                    color={inputText}
                                                >
                                                    <option value="false">No</option>
                                                    <option value="true">Yes</option>
                                                </Select>
                                            </FormControl>
                                        </HStack>

                                        <FormControl>
                                            <FormLabel>Remarks</FormLabel>
                                            <Textarea
                                                value={editingStock.remarks || ""}
                                                onChange={(e) => handleInputChange("remarks", e.target.value)}
                                                placeholder="Enter remarks..."
                                                bg={inputBg}
                                                color={inputText}
                                                rows={3}
                                            />
                                        </FormControl>
                                    </VStack>
                                </Box>

                                {/* Action Buttons */}
                                <HStack spacing={4} w="100%" justify="flex-end">
                                    <Button
                                        leftIcon={<Icon as={MdClose} />}
                                        onClick={handleCancelEdit}
                                        variant="outline"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        leftIcon={<Icon as={MdSave} />}
                                        onClick={handleSaveStock}
                                        colorScheme="blue"
                                        isLoading={updateLoading}
                                        loadingText="Saving..."
                                    >
                                        Save Changes
                                    </Button>
                                </HStack>
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    );
} 
