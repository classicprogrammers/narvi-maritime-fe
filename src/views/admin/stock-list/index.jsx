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
} from "@chakra-ui/react";
import { MdRefresh, MdEdit, MdDelete } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { deleteStockItemApi } from "../../../api/stock";
import { AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Checkbox } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";
import { getCustomersForSelect, getVesselsForSelect, getDestinationsForSelect, getUsersForSelect } from "../../../api/entitySelects";
import { getVendorsApi } from "../../../api/vendor";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";

export default function StockList() {
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

    // Lookup data for IDs -> Names
    const [clients, setClients] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);

    const textColor = useColorModeValue("gray.700", "white");
    const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
    const tableRowBg = useColorModeValue("white", "gray.800");
    const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
    const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const tableTextColor = useColorModeValue("gray.600", "gray.300");
    const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
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

    // Track refresh state after updates
    useEffect(() => {
        if (isLoading && stockList.length > 0) {
            setIsRefreshing(true);
        } else {
            setIsRefreshing(false);
        }
    }, [isLoading, stockList.length]);

    // Fetch all lookup data for IDs -> Names
    useEffect(() => {
        const fetchLookupData = async () => {
            try {
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
            }
        };
        fetchLookupData();
    }, []);

    // Use stock list directly without filtering
    const filteredAndSortedStock = stockList;

    // Handle bulk edit - navigate to StockDB Main edit page with selected items' full data
    const handleBulkEdit = () => {
        const selectedIds = Array.from(selectedRows);
        if (selectedIds.length > 0) {
            // Filter the full data objects from stockList for selected items
            const selectedItemsData = stockList.filter(item => selectedIds.includes(item.id));
            history.push({
                pathname: '/admin/stock-list/main-db-edit',
                state: { selectedItems: selectedItemsData, isBulkEdit: true }
            });
        }
    };

    // Handle single item edit - navigate to StockDB Main edit page with item's full data
    const handleEditItem = (item) => {
        history.push({
            pathname: '/admin/stock-list/main-db-edit',
            state: { selectedItems: [item], isBulkEdit: false }
        });
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

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedRows(new Set(filteredAndSortedStock.map(item => item.id)));
        } else {
            setSelectedRows(new Set());
        }
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
        const destination = destinations.find(d => String(d.id) === String(destId));
        if (destination) return destination.name;
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
        if (typeof currencyId === 'string' && currencyId.length <= 5) return currencyId;
        return `Currency ${currencyId}`;
    };

    const getLocationName = (locationId) => {
        if (!locationId) return "-";
        const location = locations.find(l => String(l.id) === String(locationId) || String(l.location_id) === String(locationId));
        if (location) return location.name || location.code || `Location ${locationId}`;
        if (typeof locationId === 'string' && locationId.length <= 10) return locationId;
        return `Location ${locationId}`;
    };

    const getUserName = (userId) => {
        if (!userId) return "-";
        const user = users.find(u => String(u.id) === String(userId));
        return user ? (user.name || user.email || `User ${userId}`) : `User ${userId}`;
    };

    const getLocationOrDestinationName = (value) => {
        if (!value) return "-";
        const dest = destinations.find(d =>
            String(d.id) === String(value) ||
            String(d.name).toLowerCase() === String(value).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (dest) return dest.name;
        const loc = locations.find(l =>
            String(l.id) === String(value) ||
            String(l.location_id) === String(value) ||
            String(l.name || "").toLowerCase() === String(value).toLowerCase() ||
            String(l.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (loc) return loc.name || loc.code || `Loc ${value}`;
        if (typeof value === 'string' && value.length <= 10) return value;
        return value;
    };


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
                    {filteredAndSortedStock.length > 0 && (
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
                                            isChecked={selectedRows.size > 0 && selectedRows.size === filteredAndSortedStock.length}
                                            isIndeterminate={selectedRows.size > 0 && selectedRows.size < filteredAndSortedStock.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            size="sm"
                                        />
                                    </Th>
                                    <Th {...headerProps}>STOCKITEMID</Th>
                                    <Th {...headerProps}>SL CREATE DATE</Th>
                                    <Th {...headerProps}>CLIENT</Th>
                                    <Th {...headerProps}>VESSEL</Th>
                                    <Th {...headerProps}>SO NUMBER</Th>
                                    <Th {...headerProps}>SI NUMBER</Th>
                                    <Th {...headerProps}>SI COMBINED</Th>
                                    <Th {...headerProps}>DI NUMBER</Th>
                                    <Th {...headerProps}>STOCK STATUS</Th>
                                    <Th {...headerProps}>SUPPLIER</Th>
                                    <Th {...headerProps}>PO NUMBER</Th>
                                    <Th {...headerProps}>EXTRA 2</Th>
                                    <Th {...headerProps}>ORIGIN</Th>
                                    <Th {...headerProps}>VIA HUB</Th>
                                    <Th {...headerProps}>AP DESTINATION</Th>
                                    <Th {...headerProps}>DESTINATION</Th>
                                    <Th {...headerProps}>WAREHOUSE ID</Th>
                                    <Th {...headerProps}>SHIPPING DOC</Th>
                                    <Th {...headerProps}>EXPORT DOC</Th>
                                    <Th {...headerProps}>REMARKS</Th>
                                    <Th {...headerProps}>DATE ON STOCK</Th>
                                    <Th {...headerProps}>EXP READY IN STOCK</Th>
                                    <Th {...headerProps}>SHIPPED DATE</Th>
                                    <Th {...headerProps}>DELIVERED DATE</Th>
                                    <Th {...headerProps}>DETAILS</Th>
                                    <Th {...headerProps}>ITEMS</Th>
                                    <Th {...headerProps}>WEIGHT KG</Th>
                                    <Th {...headerProps}>LENGTH CM</Th>
                                    <Th {...headerProps}>WIDTH CM</Th>
                                    <Th {...headerProps}>HEIGHT CM</Th>
                                    <Th {...headerProps}>VOLUME NO DIM</Th>
                                    <Th {...headerProps}>VOLUME CBM</Th>
                                    <Th {...headerProps}>LWH TEXT</Th>
                                    <Th {...headerProps}>CW AIRFREIGHT</Th>
                                    <Th {...headerProps}>VALUE</Th>
                                    <Th {...headerProps}>CURRENCY</Th>
                                    <Th {...headerProps}>CLIENT ACCESS</Th>
                                    <Th {...headerProps}>PIC</Th>
                                    <Th {...headerProps}>SO STATUS</Th>
                                    <Th {...headerProps}>VESSEL DEST</Th>
                                    <Th {...headerProps}>VESSEL ETA</Th>
                                    <Th {...headerProps}>SL CREATE DATE TIMESTAMP</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {filteredAndSortedStock.map((item, index) => (
                                    <Tr
                                        key={item.id}
                                        bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                                        borderBottom="1px"
                                        borderColor={tableBorderColor}
                                    >
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="8px" width="40px" minW="40px" maxW="40px">
                                            <Checkbox
                                                isChecked={selectedRows.has(item.id)}
                                                onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                                size="sm"
                                            />
                                        </Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.stock_item_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.sl_create_date || item.sl_create_datetime)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.so_number_id || item.so_number)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_instruction_id || item.si_number)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.si_combined || item.shipping_instruction_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.delivery_instruction_id || item.di_number)}</Text></Td>
                                        <Td {...cellProps}>
                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                {renderText(item.stock_status)}
                                            </Badge>
                                        </Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.po_text || item.po_number)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.extra_2 || item.extra)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.origin_id || item.origin)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.ap_destination_id || item.ap_destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.destination_id || item.destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.warehouse_id ? getLocationName(item.warehouse_id) : "-"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.date_on_stock)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.exp_ready_in_stock)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.details || item.item_desc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.items || item.item_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.length_cm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.width_cm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.height_cm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_cbm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.lwh_text)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.cw_freight || item.cw_airfreight)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.client_access ? "Yes" : "No"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getUserName(item.pic_id || item.pic)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.so_status)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getDestinationName(item.vessel_destination || item.destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.vessel_eta)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDateTime(item.sl_create_datetime)}</Text></Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    )}

                    {!isLoading && filteredAndSortedStock.length === 0 && (
                        <Box textAlign="center" py="16" px="25px">
                            <VStack spacing="4">
                                <Text color={tableTextColor} fontSize="lg" fontWeight="600">
                                    No stock items available yet
                                </Text>
                                <Text color={tableTextColorSecondary} fontSize="sm" maxW="520px">
                                    No stock items found.
                                </Text>
                            </VStack>
                        </Box>
                    )}
                </Box>

                {/* Results Summary */}
                {filteredAndSortedStock.length > 0 && (
                    <Flex px="25px" justify="space-between" align="center" py="20px">
                        <Text fontSize="sm" color={tableTextColorSecondary}>
                            Showing {filteredAndSortedStock.length} of {stockList.length} stock items
                        </Text>
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
