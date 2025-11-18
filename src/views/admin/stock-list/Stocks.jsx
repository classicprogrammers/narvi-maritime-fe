import React, { useState, useEffect, useRef } from "react";
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
    VStack,
    useToast,
    Checkbox,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdRefresh, MdEdit, MdAdd, MdDelete } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { deleteStockItemApi } from "../../../api/stock";
import { AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { getCustomersForSelect, getVesselsForSelect, getDestinationsForSelect, getUsersForSelect } from "../../../api/entitySelects";
import { getVendorsApi } from "../../../api/vendor";
import destinationsAPI from "../../../api/destinations";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

// Status definitions with colors matching the image - only the 10 filter statuses
const STATUS_CONFIG = {
    pending: {
        label: "PENDING",
        color: "blue",
        bgColor: "blue.100",
        textColor: "blue.800",
        lightBg: "blue.50"
    },
    stock: {
        label: "STOCK",
        color: "gray",
        bgColor: "gray.200",
        textColor: "gray.800",
        lightBg: "gray.100"
    },
    on_a_shipping_instr: {
        label: "ON A SHIPPING INSTR",
        color: "green",
        bgColor: "yellow.200",
        textColor: "yellow.900",
        lightBg: "yellow.100"
    },
    on_a_delivery_instr: {
        label: "ON A DELIVERY INSTR",
        color: "green",
        bgColor: "green.100",
        textColor: "green.800",
        lightBg: "green.50"
    },
    in_transit: {
        label: "IN TRANSIT",
        color: "green",
        bgColor: "yellow.200",
        textColor: "yellow.900",
        lightBg: "yellow.100"
    },
    arrived_dest: {
        label: "ARRIVED DEST",
        color: "gray",
        bgColor: "gray.400",
        textColor: "gray.900",
        lightBg: "gray.300"
    },
    shipped: {
        label: "SHIPPED",
        color: "orange",
        bgColor: "orange.200",
        textColor: "orange.800",
        lightBg: "orange.100"
    },
    delivered: {
        label: "DELIVERED",
        color: "red",
        bgColor: "red.100",
        textColor: "red.800",
        lightBg: "pink.50"
    },
    irregularities: {
        label: "IRREGULARITIES",
        color: "red",
        bgColor: "red.400",
        textColor: "red.900",
        lightBg: "red.300"
    },
    cancelled: {
        label: "CANCELLED",
        color: "purple",
        bgColor: "purple.300",
        textColor: "purple.900",
        lightBg: "purple.200"
    },
};

// Status mapping for data variations to map to filter keys
const STATUS_VARIATIONS = {
    "in_stock": "stock",
    "shipping_instr": "on_a_shipping_instr",
    "delivery_instr": "on_a_delivery_instr",
};

export default function Stocks() {
    const history = useHistory();
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const cancelRef = React.useRef();

    const toast = useToast();

    const {
        stockList,
        isLoading,
        error,
        updateLoading,
        getStockList,
    } = useStock();

    // Track if we're refreshing after an update
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters - only status and client filters (no auto-select)
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedStatuses, setSelectedStatuses] = useState(new Set()); // No default selected statuses
    const [clients, setClients] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);

    // Lookup data for IDs -> Names
    const [vessels, setVessels] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const textColor = useColorModeValue("gray.700", "white");
    const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
    const tableRowBg = useColorModeValue("white", "gray.800");
    const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
    const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const tableTextColor = useColorModeValue("gray.600", "gray.300");
    const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
    const inputBg = useColorModeValue("gray.100", "gray.800");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");

    const headerProps = {
        borderRight: "1px",
        borderColor: tableBorderColor,
        py: "12px",
        px: "16px",
        fontSize: "12px",
        fontWeight: "600",
        color: tableTextColor,
        textTransform: "uppercase",
    };
    const cellProps = {
        borderRight: "1px",
        borderColor: tableBorderColor,
        py: "12px",
        px: "16px",
        minW: "130px",
    };
    const cellText = {
        color: tableTextColor,
        fontSize: "sm",
    };

    // Ensure we only auto-fetch once (avoids double calls in StrictMode)
    const hasFetchedInitialData = useRef(false);

    // Fetch stock list on component mount
    useEffect(() => {
        if (!hasFetchedInitialData.current && stockList.length === 0 && !isLoading) {
            hasFetchedInitialData.current = true;
            getStockList();
        }
    }, [getStockList, stockList.length, isLoading]);

    // Fetch all lookup data for IDs -> Names
    useEffect(() => {
        const fetchLookupData = async () => {
            try {
                setIsLoadingClients(true);
                const [
                    clientsData,
                    vesselsData,
                    vendorsData,
                    destinationsData,
                    currenciesData,
                    locationsData,
                    usersData
                ] = await Promise.all([
                    getCustomersForSelect().catch(() => []),
                    getVesselsForSelect().catch(() => []),
                    getVendorsApi().catch(() => []),
                    getDestinationsForSelect().catch(() => []),
                    currenciesAPI.getCurrencies().catch(() => ({ currencies: [] })),
                    locationsAPI.getLocations().catch(() => ({ locations: [] })),
                    getUsersForSelect().catch(() => [])
                ]);
                setClients(clientsData || []);
                setVessels(vesselsData || []);
                setVendors(Array.isArray(vendorsData) ? vendorsData : vendorsData?.vendors || vendorsData?.agents || []);
                setDestinations(destinationsData || []);
                setCurrencies(currenciesData?.currencies || currenciesData || []);
                setLocations(locationsData?.locations || locationsData || []);
                setUsers(usersData || []);
            } catch (error) {
                console.error('Failed to fetch lookup data:', error);
            } finally {
                setIsLoadingClients(false);
            }
        };
        fetchLookupData();
    }, []);

    // Track refresh state after updates
    useEffect(() => {
        if (isLoading && stockList.length > 0) {
            setIsRefreshing(true);
        } else {
            setIsRefreshing(false);
        }
    }, [isLoading, stockList.length]);

    // Filter stock list
    const getFilteredStock = () => {
        let filtered = [...stockList];

        // Apply client filter
        if (selectedClient) {
            filtered = filtered.filter((item) => {
                const clientId = item.client_id || item.client;
                return String(clientId) === String(selectedClient);
            });
        }

        // Apply status filter only if statuses are selected
        if (selectedStatuses.size > 0) {
            filtered = filtered.filter((item) => {
                let status = (item.stock_status || "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
                // Map variations to filter keys (e.g., "in_stock" -> "stock", "shipping_instr" -> "on_a_shipping_instr")
                if (STATUS_VARIATIONS[status]) {
                    status = STATUS_VARIATIONS[status];
                }
                // Check if status matches any selected status (handle variations)
                return Array.from(selectedStatuses).some(selectedStatus => {
                    const normalizedSelected = selectedStatus.toLowerCase();
                    return status === normalizedSelected ||
                        status.includes(normalizedSelected) ||
                        normalizedSelected.includes(status);
                });
            });
        }

        return filtered;
    };

    const filteredAndSortedStock = getFilteredStock();

    // Pagination calculations
    const totalPages = Math.ceil(filteredAndSortedStock.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStock = filteredAndSortedStock.slice(startIndex, endIndex);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedClient, selectedStatuses.size]);

    // Handle status checkbox toggle
    const handleStatusToggle = (status) => {
        setSelectedStatuses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return newSet;
        });
    };

    // Helper functions to get names from IDs
    const getClientName = (clientId) => {
        if (!clientId) return "-";
        const client = clients.find(c => String(c.id) === String(clientId));
        return client ? client.name : `Client ${clientId}`;
    };

    const getVesselName = (vesselId) => {
        if (!vesselId) return "-";
        const vessel = vessels.find(v => String(v.id) === String(vesselId));
        return vessel ? vessel.name : `Vessel ${vesselId}`;
    };

    const getSupplierName = (supplierId) => {
        if (!supplierId) return "-";
        const vendor = vendors.find(v => String(v.id) === String(supplierId));
        return vendor ? vendor.name : `Supplier ${supplierId}`;
    };

    const getDestinationName = (destId) => {
        if (!destId) return "-";
        // Try to find by ID first
        const destination = destinations.find(d => String(d.id) === String(destId));
        if (destination) return destination.name;
        // Try to find by code/name (for cases where it's stored as code)
        const destByName = destinations.find(d =>
            String(d.name).toLowerCase() === String(destId).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(destId).toLowerCase()
        );
        if (destByName) return destByName.name;
        return `Dest ${destId}`;
    };

    const getCurrencyName = (currencyId) => {
        if (!currencyId) return "-";
        const currency = currencies.find(c => String(c.id) === String(currencyId) || String(c.currency_id) === String(currencyId));
        if (currency) return currency.name || currency.code || `Currency ${currencyId}`;
        // If it's already a code/name, return as is
        if (typeof currencyId === 'string' && currencyId.length <= 5) return currencyId;
        return `Currency ${currencyId}`;
    };

    const getLocationName = (locationId) => {
        if (!locationId) return "-";
        const location = locations.find(l => String(l.id) === String(locationId) || String(l.location_id) === String(locationId));
        if (location) return location.name || location.code || `Location ${locationId}`;
        // If it's already a code/name, return as is
        if (typeof locationId === 'string' && locationId.length <= 10) return locationId;
        return `Location ${locationId}`;
    };

    const getUserName = (userId) => {
        if (!userId) return "-";
        const user = users.find(u => String(u.id) === String(userId));
        return user ? (user.name || user.email || `User ${userId}`) : `User ${userId}`;
    };

    // Helper to get name for origin/via_hub/ap_destination/destination (could be destination or location)
    const getLocationOrDestinationName = (value) => {
        if (!value) return "-";
        // Try destination first
        const dest = destinations.find(d =>
            String(d.id) === String(value) ||
            String(d.name).toLowerCase() === String(value).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (dest) return dest.name;
        // Try location
        const loc = locations.find(l =>
            String(l.id) === String(value) ||
            String(l.location_id) === String(value) ||
            String(l.name || "").toLowerCase() === String(value).toLowerCase() ||
            String(l.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (loc) return loc.name || loc.code || `Loc ${value}`;
        // If it's already a short string, might be a code - return as is
        if (typeof value === 'string' && value.length <= 10) return value;
        return value;
    };

    // Handle bulk edit - navigate to form page with selected IDs
    const handleBulkEdit = () => {
        const selectedIds = Array.from(selectedRows);
        if (selectedIds.length > 0) {
            history.push(`/admin/stock-list/form?ids=${selectedIds.join(',')}`);
        }
    };

    // Handle create new - navigate to form page
    const handleCreateNew = () => {
        history.push("/admin/stock-list/form");
    };

    // Handle row selection
    const handleRowSelect = (itemId, isSelected) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    };

    // Handle select all (only for current page)
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            const pageIds = paginatedStock.map(item => item.id);
            setSelectedRows(prev => new Set([...prev, ...pageIds]));
        } else {
            const pageIds = paginatedStock.map(item => item.id);
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                pageIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
    };

    // Check if all items on current page are selected
    const allPageItemsSelected = paginatedStock.length > 0 && paginatedStock.every(item => selectedRows.has(item.id));
    const somePageItemsSelected = paginatedStock.some(item => selectedRows.has(item.id));

    // Handle bulk delete
    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return;

        try {
            const deletePromises = Array.from(selectedRows).map(id => deleteStockItemApi(id));
            const results = await Promise.all(deletePromises);

            const successCount = results.filter(r => r && r.result && r.result.status === 'success').length;

            if (successCount > 0) {
                toast({
                    title: 'Success',
                    description: `${successCount} stock item(s) deleted successfully`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                setBulkDeleteDialogOpen(false);
                setSelectedRows(new Set());
                getStockList();
            } else {
                throw new Error('Failed to delete stock items');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to delete stock items',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleBulkDeleteClick = () => {
        if (selectedRows.size > 0) {
            setBulkDeleteDialogOpen(true);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const parsed = new Date(dateString);
        return Number.isNaN(parsed.getTime()) ? dateString : parsed.toLocaleDateString();
    };

    const formatDateTime = (value) => {
        if (!value) return "-";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    };

    const renderText = (value) => {
        if (value === null || value === undefined || value === "" || value === false) {
            return "-";
        }
        return value;
    };

    // Get status color and background
    const getStatusStyle = (status) => {
        if (!status) {
            return {
                bgColor: tableRowBg,
                textColor: tableTextColor,
                color: "gray"
            };
        }
        let statusKey = status.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

        // Map variations to filter keys (e.g., "in_stock" -> "stock", "shipping_instr" -> "on_a_shipping_instr")
        if (STATUS_VARIATIONS[statusKey]) {
            statusKey = STATUS_VARIATIONS[statusKey];
        }

        // Try exact match first
        let config = STATUS_CONFIG[statusKey];
        // If no exact match, try to find a partial match
        if (!config) {
            const matchingKey = Object.keys(STATUS_CONFIG).find(key => {
                const normalizedKey = key.toLowerCase();
                const normalizedStatus = statusKey.toLowerCase();
                return normalizedStatus.includes(normalizedKey) ||
                    normalizedKey.includes(normalizedStatus) ||
                    normalizedStatus === normalizedKey;
            });
            config = matchingKey ? STATUS_CONFIG[matchingKey] : null;
        }
        return config || {
            bgColor: tableRowBg,
            textColor: tableTextColor,
            color: "gray"
        };
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

    const selectedClientData = selectedClient ? clients.find(c => String(c.id) === String(selectedClient)) : null;

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
                            Stocks
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

                {/* Filters Section */}
                <Box px="25px" mb="20px">

                    {/* Status Filter */}
                    <Box mb="20px" p="4" bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>

                        <Text fontSize="sm" fontWeight="600" color={textColor} mb="12px">
                            Filter by Client
                        </Text>
                        <SimpleSearchableSelect
                            value={selectedClient}
                            onChange={(value) => setSelectedClient(value)}
                            options={clients}
                            placeholder="Select Client"
                            displayKey="name"
                            valueKey="id"
                            formatOption={(option) => option.name || `Client ${option.id}`}
                            isLoading={isLoadingClients}
                            bg={inputBg}
                            color={inputText}
                            borderColor={borderColor}
                        />
                        {selectedClientData && (
                            <Box mt="12px" p="3" bg={useColorModeValue("orange.50", "orange.900")} borderRadius="md">
                                <Text fontSize="xs" fontWeight="600" color={useColorModeValue("orange.700", "orange.200")} mb="4px">
                                    Client ID: {selectedClientData.id || selectedClientData.name}
                                </Text>
                                <Text fontSize="xs" color={useColorModeValue("orange.600", "orange.300")}>
                                    Client Name: {selectedClientData.name}
                                </Text>
                            </Box>
                        )}

                        <Text fontSize="sm" mt="15px" fontWeight="700" color={textColor} mb="12px">
                            CHECK THE BOX BELOW TO SELECT WHICH ITEMS TO SHOW
                        </Text>
                        <Flex wrap="wrap" gap="3">
                            {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                <Box
                                    key={statusKey}
                                    p="4"
                                    minW="150px"
                                    bg={config.bgColor}
                                    borderRadius="md"
                                    border="1px"
                                    borderColor={borderColor}
                                >
                                    <Text
                                        fontSize="xs"
                                        fontWeight="600"
                                        color={config.textColor}
                                        mb="8px"
                                    >
                                        {config.label}
                                    </Text>
                                    <Checkbox
                                        isChecked={selectedStatuses.has(statusKey)}
                                        onChange={() => handleStatusToggle(statusKey)}
                                        size="md"
                                        colorScheme={config.color}
                                        borderColor="gray.600"
                                        sx={{
                                            "& .chakra-checkbox__control": {
                                                borderColor: "gray.600",
                                                _checked: {
                                                    borderColor: `${config.color}.500`,
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            ))}
                        </Flex>
                    </Box>
                </Box>

                {/* Bulk Action Buttons */}
                {selectedRows.size > 0 && (
                    <Flex px="25px" mb="20px" align="center" gap="3">
                        <Text fontSize="sm" color={textColor} fontWeight="600">
                            {selectedRows.size} item(s) selected
                        </Text>
                        <Button
                            leftIcon={<Icon as={MdEdit} />}
                            colorScheme="blue"
                            size="sm"
                            onClick={handleBulkEdit}
                        >
                            Edit Selected
                        </Button>
                        <Button
                            leftIcon={<Icon as={MdDelete} />}
                            colorScheme="red"
                            size="sm"
                            onClick={handleBulkDeleteClick}
                        >
                            Delete Selected
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedRows(new Set())}
                        >
                            Clear Selection
                        </Button>
                    </Flex>
                )}

                {/* Table Container */}
                <Box pr="25px" overflowX="auto">
                    {!isLoading && paginatedStock.length > 0 && (
                        <Table
                            variant="unstyled"
                            size="sm"
                            minW="5000px"
                            ml="25px"
                        >
                            <Thead bg={tableHeaderBg}>
                                <Tr>
                                    <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="8px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase" width="40px" minW="40px" maxW="40px">
                                        <Checkbox
                                            isChecked={allPageItemsSelected}
                                            isIndeterminate={somePageItemsSelected && !allPageItemsSelected}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            size="sm"
                                            borderColor="gray.600"
                                            sx={{
                                                "& .chakra-checkbox__control": {
                                                    borderColor: "gray.600",
                                                    _checked: {
                                                        borderColor: "blue.500",
                                                    },
                                                },
                                            }}
                                        />
                                    </Th>
                                    <Th {...headerProps}>STOCK_ID</Th>
                                    <Th {...headerProps}>STOCK STATUS</Th>
                                    <Th {...headerProps}>CLIENT</Th>
                                    <Th {...headerProps}>VESSEL</Th>
                                    <Th {...headerProps}>EXPECTED READY</Th>
                                    <Th {...headerProps}>DATE ON STOCK</Th>
                                    <Th {...headerProps}>SHIPPED DATE</Th>
                                    <Th {...headerProps}>DELIVERED DATE</Th>
                                    <Th {...headerProps}>WAREHOUSE ID</Th>
                                    <Th {...headerProps}>SUPPLIER</Th>
                                    <Th {...headerProps}>PO#</Th>
                                    <Th {...headerProps}>DETAILS</Th>
                                    <Th {...headerProps}>BOXES</Th>
                                    <Th {...headerProps}>KG</Th>
                                    <Th {...headerProps}>CBM</Th>
                                    <Th {...headerProps}>CUR</Th>
                                    <Th {...headerProps}>VALUE</Th>
                                    <Th {...headerProps}>ORIGIN</Th>
                                    <Th {...headerProps}>VIA HUB</Th>
                                    <Th {...headerProps}>AP DEST</Th>
                                    <Th {...headerProps}>DESTINATION</Th>
                                    <Th {...headerProps}>SHIPPING DOC</Th>
                                    <Th {...headerProps}>EXPORT DOC</Th>
                                    <Th {...headerProps}>REMARKS</Th>
                                    <Th {...headerProps}>SO NUMBER</Th>
                                    <Th {...headerProps}>SI NUMBER</Th>
                                    <Th {...headerProps}>SIC NUMBER</Th>
                                    <Th {...headerProps}>DI NUMBER</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {paginatedStock.map((item, index) => {
                                    const statusStyle = getStatusStyle(item.stock_status);
                                    // Use the same bgColor as the filter boxes for consistent row coloring
                                    const rowBg = statusStyle.bgColor || tableRowBg;

                                    return (
                                        <Tr
                                            key={item.id}
                                            bg={rowBg}
                                            borderBottom="1px"
                                            borderColor={tableBorderColor}
                                            _hover={{ opacity: 0.9 }}
                                        >
                                            <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="8px" width="40px" minW="40px" maxW="40px">
                                                <Checkbox
                                                    isChecked={selectedRows.has(item.id)}
                                                    onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                                    size="sm"
                                                    borderColor="gray.600"
                                                    sx={{
                                                        "& .chakra-checkbox__control": {
                                                            borderColor: "gray.600",
                                                            _checked: {
                                                                borderColor: "blue.500",
                                                            },
                                                        },
                                                    }}
                                                />
                                            </Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.stock_item_id)}</Text></Td>
                                            <Td {...cellProps}>
                                                <Badge colorScheme={statusStyle.color} size="sm" borderRadius="full" px="3" py="1">
                                                    {renderText(item.stock_status)}
                                                </Badge>
                                            </Td>
                                            <Td {...cellProps}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.exp_ready_in_stock)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.date_on_stock)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{item.warehouse_id ? getLocationName(item.warehouse_id) : "-"}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.po_text || item.po_number)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.details || item.item_desc)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.items || item.item_id)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_cbm)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.origin_id || item.origin)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.via_hub_id || item.via_hub)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.ap_destination_id || item.ap_destination)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.destination_id || item.destination)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.so_number_id)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_instruction_id)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.si_combined || item.shipping_instruction_id)}</Text></Td>
                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.delivery_instruction_id)}</Text></Td>
                                        </Tr>
                                    );
                                })}
                            </Tbody>
                        </Table>
                    )}

                    {!isLoading && filteredAndSortedStock.length === 0 && (
                        <Box textAlign="center" py="16" px="25px">
                            <VStack spacing="4">
                                <Text color={tableTextColor} fontSize="lg" fontWeight="600">
                                    No stock items found
                                </Text>
                                <Text color={tableTextColorSecondary} fontSize="sm" maxW="520px">
                                    {selectedClient || selectedStatuses.size > 0
                                        ? "Try adjusting your filters to see more results."
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
                        </Box>
                    )}
                </Box>

                {/* Results Summary and Pagination */}
                {filteredAndSortedStock.length > 0 && (
                    <Flex px="25px" justify="space-between" align="center" py="20px" wrap="wrap" gap="4">
                        <Text fontSize="sm" color={tableTextColorSecondary}>
                            Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedStock.length)} of {filteredAndSortedStock.length} stock items
                            {(selectedClient || selectedStatuses.size > 0) && " (filtered)"}
                            {filteredAndSortedStock.length !== stockList.length && ` of ${stockList.length} total`}
                        </Text>

                        {/* Pagination Controls */}
                        <HStack spacing="2">
                            <IconButton
                                icon={<ChevronLeftIcon />}
                                aria-label="Previous page"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                isDisabled={currentPage === 1}
                                size="sm"
                                variant="outline"
                            />
                            <Text fontSize="sm" color={tableTextColor} px="2">
                                Page {currentPage} of {totalPages || 1}
                            </Text>
                            <IconButton
                                icon={<ChevronRightIcon />}
                                aria-label="Next page"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                isDisabled={currentPage >= totalPages}
                                size="sm"
                                variant="outline"
                            />
                        </HStack>
                    </Flex>
                )}
            </Card>
            {/* Bulk Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={bulkDeleteDialogOpen}
                leastDestructiveRef={cancelRef}
                onClose={() => setBulkDeleteDialogOpen(false)}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Delete Selected Stock Items
                        </AlertDialogHeader>
                        <AlertDialogBody>
                            Are you sure you want to delete {selectedRows.size} selected stock item(s)? This action cannot be undone.
                        </AlertDialogBody>
                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={() => setBulkDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleBulkDelete} ml={3}>
                                Delete All
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}

