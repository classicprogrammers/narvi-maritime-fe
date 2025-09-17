import React, { useState, useEffect, useCallback, useMemo } from "react";
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
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    VStack,
    Grid,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Input,
    InputGroup,
    InputLeftElement,
    Select,
    Tooltip,
    Card,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdRefresh,
    MdVisibility,
    MdEdit,
    MdDelete,
    MdSearch,
    MdFilterList,
} from "react-icons/md";
import { useShippingOrders } from "../../../redux/hooks/useShippingOrders";
import { useLookups } from "../../../hooks/useLookups";
import ShippingOrderForm from "../../../components/forms/ShippingOrderForm";

export default function ShippingOrder() {
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [deletingOrder, setDeletingOrder] = useState(null);
    const [searchValue, setSearchValue] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        user: "",
        partner: "",
        vessel: "",
    });
    const [sortOrder, setSortOrder] = useState("newest");
    const [showFilterFields, setShowFilterFields] = useState(false);

    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
        isOpen: isFormOpen,
        onOpen: onFormOpen,
        onClose: onFormClose
    } = useDisclosure();
    const {
        isOpen: isDeleteOpen,
        onOpen: onDeleteOpen,
        onClose: onDeleteClose
    } = useDisclosure();

    const toast = useToast();

    // Redux state and actions
    const {
        orders,
        isLoading,
        isDeleting,
        error,
        fetchOrders,
        deleteOrder,
        clearError,
    } = useShippingOrders();

    // Lookup service for getting entity names
    const {
        getCachedName,
        getEntityNameById,
    } = useLookups();

    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");
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
    const placeholderColor = useColorModeValue("gray.400", "gray.500");
    const scrollbarTrackBg = useColorModeValue("#f1f1f1", "#2d3748");
    const scrollbarThumbBg = useColorModeValue("#c1c1c1", "#4a5568");
    const scrollbarThumbHoverBg = useColorModeValue("#a8a8a8", "#718096");

    // Fetch orders on component mount (only if not already loaded)
    useEffect(() => {
        if (orders.length === 0 && !isLoading) {
            fetchOrders();
        }
    }, [fetchOrders, orders.length, isLoading]);

    // Trigger name lookups when orders are loaded
    useEffect(() => {
        if (orders.length > 0) {
            // Get unique IDs for each entity type
            const userIds = [...new Set(orders.map(order => order.user_id).filter(Boolean))];
            const partnerIds = [...new Set(orders.map(order => order.partner_id).filter(Boolean))];
            const vesselIds = [...new Set(orders.map(order => order.vessel_id).filter(Boolean))];
            const destinationIds = [...new Set(orders.map(order => order.destination_id).filter(Boolean))];

            // Trigger lookups for each entity type
            userIds.forEach(id => getEntityNameById('users', id));
            partnerIds.forEach(id => getEntityNameById('customers', id));
            vesselIds.forEach(id => getEntityNameById('vessels', id));
            destinationIds.forEach(id => getEntityNameById('destinations', id));
        }
    }, [orders, getEntityNameById]);

    const handleRefresh = useCallback(() => {
        fetchOrders();
        clearError();
    }, [fetchOrders, clearError]);

    const handleViewDetails = (order) => {
        setSelectedOrder(order);
        onOpen();
    };

    const handleCreateOrder = () => {
        setEditingOrder(null);
        onFormOpen();
    };

    const handleEditOrder = (order) => {
        setEditingOrder(order);
        onFormOpen();
    };

    const handleDeleteOrder = (order) => {
        setDeletingOrder(order);
        onDeleteOpen();
    };

    const confirmDelete = async () => {
        if (!deletingOrder) return;

        try {
            await deleteOrder(deletingOrder.id);
            toast({
                title: 'Success',
                description: 'Shipping order deleted successfully',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            onDeleteClose();
            setDeletingOrder(null);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete shipping order',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleFormClose = () => {
        setEditingOrder(null);
        onFormClose();
    };

    // Filter and sort data
    const filteredAndSortedOrders = useMemo(() => {
        // Apply custom sorting
        const applyCustomSorting = (data) => {
            if (sortOrder === "newest") {
                return [...data].sort((a, b) => new Date(b.create_date || b.id) - new Date(a.create_date || a.id));
            } else if (sortOrder === "oldest") {
                return [...data].sort((a, b) => new Date(a.create_date || a.id) - new Date(b.create_date || b.id));
            } else if (sortOrder === "alphabetical") {
                return [...data].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
            }
            return data;
        };

        let filtered = orders;

        // Apply search filter
        if (searchValue) {
            filtered = filtered.filter(
                (order) =>
                    (order.name && order.name.toLowerCase().includes(searchValue.toLowerCase())) ||
                    (order.id && order.id.toString().includes(searchValue)) ||
                    (getCachedName('users', order.user_id) && getCachedName('users', order.user_id).toLowerCase().includes(searchValue.toLowerCase())) ||
                    (getCachedName('customers', order.partner_id) && getCachedName('customers', order.partner_id).toLowerCase().includes(searchValue.toLowerCase())) ||
                    (getCachedName('vessels', order.vessel_id) && getCachedName('vessels', order.vessel_id).toLowerCase().includes(searchValue.toLowerCase()))
            );
        }

        // Apply status filter
        if (filters.status) {
            filtered = filtered.filter((order) => {
                if (filters.status === "done") return order.done;
                if (filters.status === "pending") return !order.done;
                return true;
            });
        }

        // Apply user filter
        if (filters.user) {
            filtered = filtered.filter((order) =>
                getCachedName('users', order.user_id) && getCachedName('users', order.user_id).toLowerCase().includes(filters.user.toLowerCase())
            );
        }

        // Apply partner filter
        if (filters.partner) {
            filtered = filtered.filter((order) =>
                getCachedName('customers', order.partner_id) && getCachedName('customers', order.partner_id).toLowerCase().includes(filters.partner.toLowerCase())
            );
        }

        // Apply vessel filter
        if (filters.vessel) {
            filtered = filtered.filter((order) =>
                getCachedName('vessels', order.vessel_id) && getCachedName('vessels', order.vessel_id).toLowerCase().includes(filters.vessel.toLowerCase())
            );
        }

        return applyCustomSorting(filtered);
    }, [orders, searchValue, filters, sortOrder, getCachedName]);

    const handleFilterChange = (field, value) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            status: "",
            user: "",
            partner: "",
            vessel: "",
        });
    };

    const clearAllFiltersAndSorting = () => {
        clearAllFilters();
        setSearchValue("");
        setSortOrder("newest");
    };


    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString();
    };

    // Show loading state
    if (isLoading && orders.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <VStack spacing="4">
                    <Spinner size="xl" color="#1c4a95" />
                    <Text>Loading shipping orders...</Text>
                </VStack>
            </Box>
        );
    }

    // Show error state
    if (error && orders.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Alert status="error">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Error loading shipping orders!</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Box>
                </Alert>
                <Button mt="4" onClick={handleRefresh} leftIcon={<Icon as={MdRefresh} />}>
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
                    <Text
                        color={textColor}
                        fontSize="22px"
                        fontWeight="700"
                        lineHeight="100%"
                    >
                        Shipping Orders Management
                    </Text>
                    <HStack spacing="3">
                        <Button
                            leftIcon={<Icon as={MdAdd} />}
                            colorScheme="blue"
                            size="sm"
                            onClick={handleCreateOrder}
                        >
                            New Order
                        </Button>
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdRefresh} />}
                            variant="ghost"
                            aria-label="Refresh"
                            onClick={handleRefresh}
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
                                Search Orders
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
                                    placeholder="Search orders, users, partners, vessels..."
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
                                    filters.status || filters.user || filters.partner || filters.vessel
                                        ? "solid"
                                        : "outline"
                                }
                                colorScheme={
                                    filters.status || filters.user || filters.partner || filters.vessel
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
                        {(filters.status || filters.user || filters.partner || filters.vessel || searchValue || sortOrder !== "newest") && (
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
                                        <option value="done">Done</option>
                                    </Select>
                                </Box>

                                {/* User Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        User
                                    </Text>
                                    <Input
                                        variant="outline"
                                        fontSize="sm"
                                        bg={inputBg}
                                        color={inputText}
                                        borderRadius="8px"
                                        placeholder="Search users..."
                                        value={filters.user}
                                        onChange={(e) => handleFilterChange("user", e.target.value)}
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

                                {/* Partner Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Partner/Client
                                    </Text>
                                    <Input
                                        variant="outline"
                                        fontSize="sm"
                                        bg={inputBg}
                                        color={inputText}
                                        borderRadius="8px"
                                        placeholder="Search partners..."
                                        value={filters.partner}
                                        onChange={(e) => handleFilterChange("partner", e.target.value)}
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

                                {/* Vessel Filter */}
                                <Box minW="200px" flex="1">
                                    <Text fontSize="sm" fontWeight="500" color={textColor} mb={2}>
                                        Vessel
                                    </Text>
                                    <Input
                                        variant="outline"
                                        fontSize="sm"
                                        bg={inputBg}
                                        color={inputText}
                                        borderRadius="8px"
                                        placeholder="Search vessels..."
                                        value={filters.vessel}
                                        onChange={(e) => handleFilterChange("vessel", e.target.value)}
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
                                    Order Name
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
                                    ID
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
                                    User
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
                                    Partner/Client
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
                                    Vessel
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
                                    Destination
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
                                    Quotation ID
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
                                    <Td colSpan={10} textAlign="center" py="8">
                                        <VStack spacing="4">
                                            <Spinner size="lg" color="blue.500" />
                                            <Text color={tableTextColor}>Loading shipping orders...</Text>
                                        </VStack>
                                    </Td>
                                </Tr>
                            ) : filteredAndSortedOrders.length === 0 ? (
                                <Tr>
                                    <Td colSpan={10} textAlign="center" py="8">
                                        <Text color={tableTextColor} fontSize="lg">
                                            {searchValue || Object.values(filters).some(f => f)
                                                ? "No orders match your search criteria."
                                                : "No shipping orders available."}
                                        </Text>
                                    </Td>
                                </Tr>
                            ) : (
                                filteredAndSortedOrders.map((order, index) => (
                                    <Tr
                                        key={order.id}
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
                                            <Text
                                                color={textColor}
                                                fontSize="sm"
                                                fontWeight="600"
                                            >
                                                {order.name || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                #{order.id}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Badge
                                                colorScheme={order.done ? "green" : "orange"}
                                                size="sm"
                                                borderRadius="full"
                                                px="3"
                                                py="1"
                                            >
                                                {order.done ? "Done" : "Pending"}
                                            </Badge>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text
                                                fontSize="sm"
                                                color={getCachedName('users', order.user_id) === 'Loading...' ? tableTextColorSecondary : tableTextColor}
                                            >
                                                {getCachedName('users', order.user_id) || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text
                                                fontSize="sm"
                                                color={getCachedName('customers', order.partner_id) === 'Loading...' ? tableTextColorSecondary : tableTextColor}
                                            >
                                                {getCachedName('customers', order.partner_id) || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text
                                                fontSize="sm"
                                                color={getCachedName('vessels', order.vessel_id) === 'Loading...' ? tableTextColorSecondary : tableTextColor}
                                            >
                                                {getCachedName('vessels', order.vessel_id) || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text
                                                fontSize="sm"
                                                color={getCachedName('destinations', order.destination_id) === 'Loading...' ? tableTextColorSecondary : tableTextColor}
                                            >
                                                {getCachedName('destinations', order.destination_id) || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {formatDate(order.create_date)}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <Text color={tableTextColor} fontSize="sm">
                                                {order.quotation_id || "-"}
                                            </Text>
                                        </Td>
                                        <Td
                                            borderRight="1px"
                                            borderColor={tableBorderColor}
                                            py="12px"
                                            px="16px"
                                        >
                                            <HStack spacing="2">
                                                <Tooltip label="View Details">
                                                    <IconButton
                                                        icon={<Icon as={MdVisibility} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        onClick={() => handleViewDetails(order)}
                                                        aria-label="View order"
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Edit Order">
                                                    <IconButton
                                                        icon={<Icon as={MdEdit} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        onClick={() => handleEditOrder(order)}
                                                        aria-label="Edit order"
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Delete Order">
                                                    <IconButton
                                                        icon={<Icon as={MdDelete} />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteOrder(order)}
                                                        aria-label="Delete order"
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
                        Showing {filteredAndSortedOrders.length} of {orders.length} orders
                    </Text>
                </Flex>
            </Card>

            {/* Details Modal */}
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
                                Order Details
                            </Text>
                            <Text fontSize="lg" opacity="0.9">
                                {selectedOrder?.name}
                            </Text>
                        </VStack>
                    </ModalHeader>
                    <ModalCloseButton color="white" size="lg" />
                    <ModalBody p="0">
                        {selectedOrder && (
                            <Box>
                                {/* Status Banner */}
                                <Box
                                    bg={selectedOrder.done ? "green.50" : "orange.50"}
                                    borderLeft="4px solid"
                                    borderLeftColor={selectedOrder.done ? "green.400" : "orange.400"}
                                    p="4"
                                    mx="6"
                                    mt="6"
                                    borderRadius="md"
                                >
                                    <HStack spacing="3">
                                        <Badge
                                            colorScheme={selectedOrder.done ? "green" : "orange"}
                                            size="lg"
                                            px="3"
                                            py="1"
                                            borderRadius="full"
                                        >
                                            {selectedOrder.done ? "✓ Completed" : "⏳ Pending"}
                                        </Badge>
                                        <Text fontSize="sm" color="gray.600">
                                            Order Status
                                        </Text>
                                    </HStack>
                                </Box>

                                {/* Main Content */}
                                <Box p="6">
                                    <Grid templateColumns="repeat(2, 1fr)" gap="8">
                                        {/* Order Information Card */}
                                        <Box
                                            bg="gray.50"
                                            p="6"
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor="gray.200"
                                        >
                                            <VStack align="start" spacing="4">
                                                <HStack spacing="2">
                                                    <Box w="3" h="3" bg="blue.500" borderRadius="full" />
                                                    <Text fontSize="md" fontWeight="semibold" color="gray.700">
                                                        Order Information
                                                    </Text>
                                                </HStack>

                                                <VStack align="start" spacing="3" w="full">
                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Order ID
                                                        </Text>
                                                        <Text fontSize="lg" fontWeight="medium" color="gray.800">
                                                            #{selectedOrder.id}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Order Name
                                                        </Text>
                                                        <Text fontSize="lg" fontWeight="medium" color="gray.800">
                                                            {selectedOrder.name}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Create Date
                                                        </Text>
                                                        <Text fontSize="md" color="gray.700">
                                                            {formatDate(selectedOrder.create_date)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Order Date
                                                        </Text>
                                                        <Text fontSize="md" color="gray.700">
                                                            {formatDate(selectedOrder.date_order)}
                                                        </Text>
                                                    </Box>
                                                </VStack>
                                            </VStack>
                                        </Box>

                                        {/* Entity Information Card */}
                                        <Box
                                            bg="blue.50"
                                            p="6"
                                            borderRadius="lg"
                                            border="1px solid"
                                            borderColor="blue.200"
                                        >
                                            <VStack align="start" spacing="4">
                                                <HStack spacing="2">
                                                    <Box w="3" h="3" bg="blue.500" borderRadius="full" />
                                                    <Text fontSize="md" fontWeight="semibold" color="gray.700">
                                                        Entity Information
                                                    </Text>
                                                </HStack>

                                                <VStack align="start" spacing="3" w="full">
                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            User
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('users', selectedOrder.user_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('users', selectedOrder.user_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Partner/Client
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('customers', selectedOrder.partner_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('customers', selectedOrder.partner_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Vessel
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('vessels', selectedOrder.vessel_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('vessels', selectedOrder.vessel_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Destination
                                                        </Text>
                                                        <Text
                                                            fontSize="md"
                                                            color={getCachedName('destinations', selectedOrder.destination_id) === 'Loading...' ? 'gray.400' : 'gray.700'}
                                                            fontWeight="medium"
                                                        >
                                                            {getCachedName('destinations', selectedOrder.destination_id)}
                                                        </Text>
                                                    </Box>

                                                    <Box w="full">
                                                        <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                            Quotation ID
                                                        </Text>
                                                        <Text fontSize="md" color="gray.700" fontWeight="medium">
                                                            #{selectedOrder.quotation_id}
                                                        </Text>
                                                    </Box>
                                                </VStack>
                                            </VStack>
                                        </Box>
                                    </Grid>

                                    {/* Additional Information Card */}
                                    <Box
                                        bg="purple.50"
                                        p="6"
                                        borderRadius="lg"
                                        border="1px solid"
                                        borderColor="purple.200"
                                        mt="6"
                                    >
                                        <VStack align="start" spacing="4">
                                            <HStack spacing="2">
                                                <Box w="3" h="3" bg="purple.500" borderRadius="full" />
                                                <Text fontSize="md" fontWeight="semibold" color="gray.700">
                                                    Additional Information
                                                </Text>
                                            </HStack>

                                            <Grid templateColumns="repeat(3, 1fr)" gap="6" w="full">
                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        ETA Date
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700">
                                                        {formatDate(selectedOrder.eta_date)}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Est. to USD
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontWeight="medium">
                                                        {selectedOrder.est_to_usd || 'N/A'}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Est. Profit USD
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontWeight="medium">
                                                        {selectedOrder.est_profit_usd || 'N/A'}
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Deadline Info
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700">
                                                        {selectedOrder.deadline_info || 'N/A'}
                                                    </Text>
                                                </Box>

                                                <Box colSpan={2}>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Internal Remark
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontStyle={selectedOrder.internal_remark ? "normal" : "italic"}>
                                                        {selectedOrder.internal_remark || 'No internal remarks'}
                                                    </Text>
                                                </Box>

                                                <Box colSpan={3}>
                                                    <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                                                        Client Remark
                                                    </Text>
                                                    <Text fontSize="md" color="gray.700" fontStyle={selectedOrder.client_remark ? "normal" : "italic"}>
                                                        {selectedOrder.client_remark || 'No client remarks'}
                                                    </Text>
                                                </Box>
                                            </Grid>
                                        </VStack>
                                    </Box>
                                </Box>

                                {/* Footer Actions */}
                                <Box
                                    bg="gray.50"
                                    p="6"
                                    borderTop="1px solid"
                                    borderColor="gray.200"
                                    borderRadius="0 0 xl xl"
                                >
                                    <Flex justify="space-between" align="center">
                                        <Text fontSize="sm" color="gray.500">
                                            Last updated: {formatDate(selectedOrder.create_date)}
                                        </Text>
                                        <HStack spacing="3">
                                            <Button size="sm" variant="outline" colorScheme="blue">
                                                Edit Order
                                            </Button>
                                            <Button size="sm" colorScheme="blue">
                                                Export Details
                                            </Button>
                                        </HStack>
                                    </Flex>
                                </Box>
                            </Box>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Shipping Order Form Modal */}
            <ShippingOrderForm
                isOpen={isFormOpen}
                onClose={handleFormClose}
                order={editingOrder}
                mode={editingOrder ? 'edit' : 'create'}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteOpen}
                onClose={onDeleteClose}
                leastDestructiveRef={undefined}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Shipping Order
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to delete the shipping order "{deletingOrder?.name}"?
                            This action cannot be undone.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button onClick={onDeleteClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={confirmDelete}
                                ml={3}
                                isLoading={isDeleting}
                                loadingText="Deleting..."
                            >
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
} 
