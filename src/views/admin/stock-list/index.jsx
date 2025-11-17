import React, { useState, useEffect, useMemo, useRef } from "react";
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
    VStack,
    useToast,
} from "@chakra-ui/react";
import { MdRefresh, MdEdit, MdSearch, MdFilterList, MdAdd, MdDelete } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { deleteStockItemApi } from "../../../api/stock";
import { AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";

export default function StockList() {
    const history = useHistory();
    const [searchValue, setSearchValue] = useState("");
    const [filters, setFilters] = useState({
        status: "",
    });
    const [sortOrder, setSortOrder] = useState("newest");
    const [showFilterFields, setShowFilterFields] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [stockToDelete, setStockToDelete] = useState(null);
    const cancelRef = React.useRef();

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
    const expandableFilterBg = useColorModeValue("gray.50", "gray.700");
    const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
    const tableRowBg = useColorModeValue("white", "gray.800");
    const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
    const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const tableTextColor = useColorModeValue("gray.600", "gray.300");
    const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");

    // Ensure we only auto-fetch once (avoids double calls in StrictMode)
    const hasFetchedInitialData = useRef(false);

    // Fetch stock list on component mount
    useEffect(() => {
        if (!hasFetchedInitialData.current && stockList.length === 0 && !isLoading) {
            hasFetchedInitialData.current = true;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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


    // Handle edit - navigate to form page
    const handleEditStock = (stock) => {
        history.push(`/admin/stock-list/form/${stock.id}`);
    };

    // Handle create new - navigate to form page
    const handleCreateNew = () => {
        history.push("/admin/stock-list/form");
    };


    // Handle delete
    const handleDeleteStock = async () => {
        if (!stockToDelete) return;

        try {
            const result = await deleteStockItemApi(stockToDelete.id);
            if (result && result.result && result.result.status === 'success') {
                toast({
                    title: 'Success',
                    description: 'Stock item deleted successfully',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                setDeleteDialogOpen(false);
                setStockToDelete(null);
                getStockList();
            } else {
                throw new Error(result?.result?.message || 'Failed to delete stock item');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete stock item',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleDeleteClick = (stock) => {
        setStockToDelete(stock);
        setDeleteDialogOpen(true);
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
                        <Button
                            leftIcon={<Icon as={MdAdd} />}
                            colorScheme="blue"
                            onClick={handleCreateNew}
                            size="sm"
                        >
                            Create New
                        </Button>
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
                        minW="3000px"
                        ml="25px"
                    >
                        <Thead bg={tableHeaderBg}>
                            <Tr>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Client</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Vessel</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">PIC</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Stock Status</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Supplier</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">PO Number</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Warehouse ID</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Shipping Doc</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Items</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Weight kgs</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Length cm</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Width cm</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Height cm</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Volume no dim</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">LWH Text</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Details</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Value</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Currency</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Origin</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Via HUB</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Ready as Supplier</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Date on stock</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Remarks</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Client Access</Th>
                                <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {isLoading ? (
                                <Tr>
                                    <Td colSpan={25} textAlign="center" py="8">
                                        <Spinner size="lg" color="blue.500" />
                                    </Td>
                                </Tr>
                            ) : filteredAndSortedStock.length === 0 ? (
                                <Tr>
                                    <Td colSpan={25} textAlign="center" py="16">
                                        <VStack spacing="4">
                                            <Text color={tableTextColor} fontSize="lg" fontWeight="600">
                                                {searchValue || Object.values(filters).some((f) => f)
                                                    ? "No stock items match your filters"
                                                    : "No stock items available yet"}
                                            </Text>
                                            <Text color={tableTextColorSecondary} fontSize="sm" maxW="520px">
                                                {searchValue || Object.values(filters).some((f) => f)
                                                    ? "Try adjusting your search or clearing filters to see more results."
                                                    : "Start building your stock database by adding the first record."}
                                            </Text>
                                            <Button
                                                size="sm"
                                                colorScheme="blue"
                                                leftIcon={<Icon as={MdAdd} />}
                                                onClick={handleCreateNew}
                                            >
                                                Create Stock Item
                                            </Button>
                                        </VStack>
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
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.client_id || item.client || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.vessel_id || item.vessel || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.pic || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                {item.stock_status || "-"}
                                            </Badge>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.supplier_id || item.supplier || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.po_number || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.warehouse_id || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.shipping_doc || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.items || item.item_desc || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.weight_kg || item.weight_kgs || "0.0"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.length_cm || "0.0"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.width_cm || "0.0"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.height_cm || "0.0"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.volume_no_dim || item.volume_cbm || "0.0"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.lwh_text || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.details || item.item_desc || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.value || "0.0"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.currency || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.origin || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.via_hub || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.ready_as_supplier ? "Yes" : "No"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{formatDate(item.date_on_stock)}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm" noOfLines={1}>{item.remarks || "-"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
                                            <Text color={tableTextColor} fontSize="sm">{item.client_access ? "Yes" : "No"}</Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="16px">
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
                                                <Tooltip label="Delete Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdDelete} />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteClick(item)}
                                                        aria-label="Delete stock item"
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={deleteDialogOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Stock Item
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            Are you sure you want to delete this stock item? This action cannot be undone.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleDeleteStock} ml={3}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
} 
