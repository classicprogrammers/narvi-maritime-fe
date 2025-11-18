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
import { MdRefresh, MdEdit, MdAdd, MdDelete } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { deleteStockItemApi } from "../../../api/stock";
import { AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, Checkbox } from "@chakra-ui/react";
import { useHistory } from "react-router-dom";

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

    // Use stock list directly without filtering
    const filteredAndSortedStock = stockList;

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

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            setSelectedRows(new Set(filteredAndSortedStock.map(item => item.id)));
        } else {
            setSelectedRows(new Set());
        }
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
                                    <Th {...headerProps}>Stock Item ID</Th>
                                    <Th {...headerProps}>SL CreateDate</Th>
                                    <Th {...headerProps}>Client</Th>
                                    <Th {...headerProps}>Vessel</Th>
                                    <Th {...headerProps}>SO Number</Th>
                                    <Th {...headerProps}>SI Number</Th>
                                    <Th {...headerProps}>SI Combined</Th>
                                    <Th {...headerProps}>DI Number</Th>
                                    <Th {...headerProps}>Stock Status</Th>
                                    <Th {...headerProps}>Supplier</Th>
                                    <Th {...headerProps}>PO Number</Th>
                                    <Th {...headerProps}>Extra 2</Th>
                                    <Th {...headerProps}>Origin</Th>
                                    <Th {...headerProps}>Via HUB</Th>
                                    <Th {...headerProps}>AP Destination</Th>
                                    <Th {...headerProps}>Destination</Th>
                                    <Th {...headerProps}>Warehouse ID</Th>
                                    <Th {...headerProps}>Shipping Doc</Th>
                                    <Th {...headerProps}>Export Doc</Th>
                                    <Th {...headerProps}>Remarks</Th>
                                    <Th {...headerProps}>Date on stock</Th>
                                    <Th {...headerProps}>Exp ready in stock</Th>
                                    <Th {...headerProps}>Shipped Date</Th>
                                    <Th {...headerProps}>Delivered Date</Th>
                                    <Th {...headerProps}>Details</Th>
                                    <Th {...headerProps}>Items</Th>
                                    <Th {...headerProps}>Weight kgs</Th>
                                    <Th {...headerProps}>Length cm</Th>
                                    <Th {...headerProps}>Width cm</Th>
                                    <Th {...headerProps}>Height cm</Th>
                                    <Th {...headerProps}>Volume no dim</Th>
                                    <Th {...headerProps}>Volume cbm</Th>
                                    <Th {...headerProps}>LWH Text</Th>
                                    <Th {...headerProps}>CW Airfreight</Th>
                                    <Th {...headerProps}>Value</Th>
                                    <Th {...headerProps}>Currency</Th>
                                    <Th {...headerProps}>Client Access</Th>
                                    <Th {...headerProps}>PIC</Th>
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
                                        <Td {...cellProps}><Text {...cellText}>{formatDateTime(item.sl_create_datetime || item.created_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.client || item.client_name || item.client_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.vessel || item.vessel_name || item.vessel_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.so_number_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_instruction_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.si_combined || item.shipping_instruction_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.delivery_instruction_id)}</Text></Td>
                                        <Td {...cellProps}>
                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                {renderText(item.stock_status)}
                                            </Badge>
                                        </Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.supplier || item.supplier_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.po_text || item.po_number)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.extra)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.origin)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.ap_destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.warehouse_id)}</Text></Td>
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
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.cw_freight)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.currency || item.currency_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.client_access ? "Yes" : "No"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.pic || item.pic_id)}</Text></Td>
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
                                    Start building your stock database by adding the first record.
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
