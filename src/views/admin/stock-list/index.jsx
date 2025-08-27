import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Button,
    Input,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Icon,
    HStack,
    VStack,
    IconButton,
    useColorModeValue,
    Checkbox,
    InputGroup,
    InputLeftElement,
    Select,
    Tooltip,
    useToast,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSearch,
    MdChevronLeft,
    MdChevronRight,
    MdFilterList,
    MdDownload,
    MdPrint,
    MdEdit,
    MdDelete,
    MdVisibility,
    MdRefresh,
} from "react-icons/md";

export default function StockList() {
    const history = useHistory();
    const toast = useToast();
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("all");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [sortField, setSortField] = useState("stockItemId");
    const [sortDirection, setSortDirection] = useState("asc");

    const textColor = useColorModeValue("gray.700", "white");
    const hoverBg = useColorModeValue("blue.50", "blue.900");
    const searchIconColor = useColorModeValue("gray.400", "gray.500");
    const inputBg = useColorModeValue("white", "gray.700");
    const inputText = useColorModeValue("gray.700", "white");

    // Load stock data from localStorage and combine with sample data
    const loadStockData = () => {
        const savedStockItems = JSON.parse(localStorage.getItem('stockItems') || '[]');
        const sampleData = [
            {
                id: 1,
                stockItemId: "STK001",
                soNumber: "S00024",
                poNumber: "P00011",
                supplier: "Marine Supplies Co.",
                vesselName: "Ocean Voyager",
                originCountry: "USA",
                destinationCountry: "Singapore",
                stockStatus: "In Stock",
                itemDescription: "Marine Engine Parts",
                itemValue: "2500.00",
                numberOfPcs: "5",
                submittedToCustoms: true,
            },
            {
                id: 2,
                stockItemId: "STK002",
                soNumber: "S00025",
                poNumber: "P00012",
                supplier: "Global Maritime",
                vesselName: "Sea Explorer",
                originCountry: "Germany",
                destinationCountry: "Japan",
                stockStatus: "Out of Stock",
                itemDescription: "Navigation Equipment",
                itemValue: "1800.00",
                numberOfPcs: "0",
                submittedToCustoms: false,
            },
            {
                id: 3,
                stockItemId: "STK003",
                soNumber: "S00026",
                poNumber: "P00013",
                supplier: "Ocean Tech",
                vesselName: "Pacific Star",
                originCountry: "UK",
                destinationCountry: "Australia",
                stockStatus: "Pending",
                itemDescription: "Safety Equipment",
                itemValue: "3200.00",
                numberOfPcs: "8",
                submittedToCustoms: true,
            },
        ];

        return [...sampleData, ...savedStockItems];
    };

    const [stockData, setStockData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);

    // Load stock data on component mount
    useEffect(() => {
        const data = loadStockData();
        setStockData(data);
        setFilteredData(data);
    }, []);

    // Filter and search data
    useEffect(() => {
        let filtered = stockData;

        // Apply status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(item => {
                if (statusFilter === "in-stock") return item.stockStatus === "In Stock";
                if (statusFilter === "out-of-stock") return item.stockStatus === "Out of Stock";
                if (statusFilter === "pending") return item.stockStatus === "Pending";
                return true;
            });
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.stockItemId.toLowerCase().includes(query) ||
                item.soNumber.toLowerCase().includes(query) ||
                item.poNumber.toLowerCase().includes(query) ||
                item.supplier.toLowerCase().includes(query) ||
                item.vesselName.toLowerCase().includes(query) ||
                item.itemDescription.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[sortField] || "";
            let bValue = b[sortField] || "";

            if (typeof aValue === "string") aValue = aValue.toLowerCase();
            if (typeof bValue === "string") bValue = bValue.toLowerCase();

            if (sortDirection === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        setFilteredData(filtered);
        setCurrentPage(1); // Reset to first page when filtering
    }, [stockData, searchQuery, statusFilter, sortField, sortDirection]);

    // Calculate pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedItems(currentData.map(item => item.id));
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

    // Button handlers
    const handleNewButton = () => {
        history.push("/admin/new-stock-item");
    };

    const handleSearch = (value) => {
        setSearchQuery(value);
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handleIssuesClick = () => {
        toast({
            title: "Issues Panel",
            description: "System issues and bugs panel opened",
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleMessagesClick = () => {
        toast({
            title: "Messages Panel",
            description: "You have 5 unread messages",
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleRemindersClick = () => {
        toast({
            title: "Reminders Panel",
            description: "You have 5 pending reminders",
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleSettingsClick = () => {
        toast({
            title: "Settings Panel",
            description: "Configure your stock list preferences",
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleFilterClick = () => {
        toast({
            title: "Filter Panel",
            description: "Advanced filtering options opened",
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleDeleteSelected = () => {
        if (selectedItems.length > 0) {
            const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.length} selected item(s)?`);
            if (confirmed) {
                const newStockData = stockData.filter(item => !selectedItems.includes(item.id));
                setStockData(newStockData);
                localStorage.setItem('stockItems', JSON.stringify(newStockData.filter(item => item.id > 3))); // Keep only custom items
                setSelectedItems([]);
                toast({
                    title: "Success",
                    description: `${selectedItems.length} item(s) deleted successfully!`,
                    status: "success",
                    duration: 3000,
                    isClosable: true,
                });
            }
        } else {
            toast({
                title: "Warning",
                description: "Please select items to delete",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleDeleteItem = (itemId) => {
        setDeleteItemId(itemId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDeleteItem = () => {
        if (deleteItemId) {
            const newStockData = stockData.filter(item => item.id !== deleteItemId);
            setStockData(newStockData);
            localStorage.setItem('stockItems', JSON.stringify(newStockData.filter(item => item.id > 3)));
            toast({
                title: "Success",
                description: "Item deleted successfully!",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        }
        setIsDeleteDialogOpen(false);
        setDeleteItemId(null);
    };

    const handleEditItem = (itemId) => {
        history.push(`/admin/edit-stock-item/${itemId}`);
    };

    const handleViewItem = (itemId) => {
        history.push(`/admin/view-stock-item/${itemId}`);
    };

    const handleExportData = () => {
        const csvContent = [
            ['Stock Item ID', 'SO Number', 'PO Number', 'Supplier', 'Vessel Name', 'Origin Country', 'Destination Country', 'Stock Status', 'Item Description', 'Item Value', 'Number of Pcs', 'Submitted to Customs'],
            ...filteredData.map(item => [
                item.stockItemId,
                item.soNumber,
                item.poNumber,
                item.supplier,
                item.vesselName,
                item.originCountry,
                item.destinationCountry,
                item.stockStatus,
                item.itemDescription,
                item.itemValue,
                item.numberOfPcs,
                item.submittedToCustoms ? 'Yes' : 'No'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stock-list.csv';
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
            title: "Export Successful",
            description: "Stock data exported to CSV",
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    };

    const handlePrintData = () => {
        window.print();
        toast({
            title: "Print",
            description: "Printing stock list...",
            status: "info",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleRefreshData = () => {
        const data = loadStockData();
        setStockData(data);
        setFilteredData(data);
        toast({
            title: "Data Refreshed",
            description: "Stock data has been refreshed!",
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleStatusChange = (itemId, newStatus) => {
        const updatedData = stockData.map(item =>
            item.id === itemId ? { ...item, stockStatus: newStatus } : item
        );
        setStockData(updatedData);
        localStorage.setItem('stockItems', JSON.stringify(updatedData.filter(item => item.id > 3)));
        toast({
            title: "Status Updated",
            description: `Stock status changed to ${newStatus}`,
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleCustomsToggle = (itemId) => {
        const updatedData = stockData.map(item =>
            item.id === itemId ? { ...item, submittedToCustoms: !item.submittedToCustoms } : item
        );
        setStockData(updatedData);
        localStorage.setItem('stockItems', JSON.stringify(updatedData.filter(item => item.id > 3)));
        toast({
            title: "Customs Status Updated",
            description: "Customs submission status changed",
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleBulkStatusChange = (newStatus) => {
        if (selectedItems.length === 0) {
            toast({
                title: "Warning",
                description: "Please select items to update",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const updatedData = stockData.map(item =>
            selectedItems.includes(item.id) ? { ...item, stockStatus: newStatus } : item
        );
        setStockData(updatedData);
        localStorage.setItem('stockItems', JSON.stringify(updatedData.filter(item => item.id > 3)));
        setSelectedItems([]);
        toast({
            title: "Bulk Update Successful",
            description: `${selectedItems.length} items updated to ${newStatus}`,
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleBulkCustomsToggle = () => {
        if (selectedItems.length === 0) {
            toast({
                title: "Warning",
                description: "Please select items to update",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        const updatedData = stockData.map(item =>
            selectedItems.includes(item.id) ? { ...item, submittedToCustoms: !item.submittedToCustoms } : item
        );
        setStockData(updatedData);
        localStorage.setItem('stockItems', JSON.stringify(updatedData.filter(item => item.id > 3)));
        setSelectedItems([]);
        toast({
            title: "Bulk Update Successful",
            description: `${selectedItems.length} items customs status updated`,
            status: "success",
            duration: 3000,
            isClosable: true,
        });
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const getSortIcon = (field) => {
        if (sortField !== field) return null;
        return sortDirection === "asc" ? "↑" : "↓";
    };

    const getStockStatistics = () => {
        const total = stockData.length;
        const inStock = stockData.filter(item => item.stockStatus === "In Stock").length;
        const outOfStock = stockData.filter(item => item.stockStatus === "Out of Stock").length;
        const pending = stockData.filter(item => item.stockStatus === "Pending").length;
        const submittedToCustoms = stockData.filter(item => item.submittedToCustoms).length;
        const totalValue = stockData.reduce((sum, item) => sum + parseFloat(item.itemValue || 0), 0);

        return {
            total,
            inStock,
            outOfStock,
            pending,
            submittedToCustoms,
            totalValue: totalValue.toFixed(2)
        };
    };

    const validateStockData = (data) => {
        const errors = [];
        data.forEach((item, index) => {
            if (!item.stockItemId) {
                errors.push(`Row ${index + 1}: Stock Item ID is required`);
            }
            if (!item.itemDescription) {
                errors.push(`Row ${index + 1}: Item Description is required`);
            }
            if (isNaN(parseFloat(item.itemValue))) {
                errors.push(`Row ${index + 1}: Item Value must be a valid number`);
            }
            if (isNaN(parseInt(item.numberOfPcs))) {
                errors.push(`Row ${index + 1}: Number of Pcs must be a valid integer`);
            }
        });
        return errors;
    };

    const handleDataValidation = () => {
        const errors = validateStockData(stockData);
        if (errors.length > 0) {
            toast({
                title: "Validation Errors",
                description: errors.join(", "),
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } else {
            toast({
                title: "Validation Successful",
                description: "All stock data is valid",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const handleDuplicateCheck = () => {
        const duplicates = stockData.filter((item, index, self) =>
            self.findIndex(t => t.stockItemId === item.stockItemId) !== index
        );

        if (duplicates.length > 0) {
            toast({
                title: "Duplicate Items Found",
                description: `${duplicates.length} duplicate stock item IDs found`,
                status: "warning",
                duration: 5000,
                isClosable: true,
            });
        } else {
            toast({
                title: "No Duplicates",
                description: "All stock items have unique IDs",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'n':
                        event.preventDefault();
                        handleNewButton();
                        break;
                    case 'f':
                        event.preventDefault();
                        document.querySelector('input[placeholder="Search stock items..."]')?.focus();
                        break;
                    case 'r':
                        event.preventDefault();
                        handleRefreshData();
                        break;
                    case 'e':
                        event.preventDefault();
                        handleExportData();
                        break;
                    case 'p':
                        event.preventDefault();
                        handlePrintData();
                        break;
                    case 'Delete':
                        event.preventDefault();
                        if (selectedItems.length > 0) {
                            handleDeleteSelected();
                        }
                        break;
                    default:
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
        //eslint-disable-next-line
    }, [selectedItems]);

    const handleQuickActions = (action) => {
        switch (action) {
            case 'selectAll':
                handleSelectAll(true);
                break;
            case 'clearSelection':
                setSelectedItems([]);
                break;
            case 'exportSelected':
                if (selectedItems.length > 0) {
                    const selectedData = stockData.filter(item => selectedItems.includes(item.id));
                    // Export only selected items
                    const csvContent = [
                        ['Stock Item ID', 'SO Number', 'PO Number', 'Supplier', 'Vessel Name', 'Origin Country', 'Destination Country', 'Stock Status', 'Item Description', 'Item Value', 'Number of Pcs', 'Submitted to Customs'],
                        ...selectedData.map(item => [
                            item.stockItemId,
                            item.soNumber,
                            item.poNumber,
                            item.supplier,
                            item.vesselName,
                            item.originCountry,
                            item.destinationCountry,
                            item.stockStatus,
                            item.itemDescription,
                            item.itemValue,
                            item.numberOfPcs,
                            item.submittedToCustoms ? 'Yes' : 'No'
                        ])
                    ].map(row => row.join(',')).join('\n');

                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'selected-stock-items.csv';
                    a.click();
                    window.URL.revokeObjectURL(url);

                    toast({
                        title: "Export Successful",
                        description: `${selectedItems.length} selected items exported`,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                    });
                } else {
                    toast({
                        title: "Warning",
                        description: "Please select items to export",
                        status: "warning",
                        duration: 3000,
                        isClosable: true,
                    });
                }
                break;
            default:
                break;
        }
    };

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
                            onClick={handleNewButton}
                        >
                            New Stock Item
                        </Button>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                                Stock List
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                Manage inventory and stock items
                            </Text>
                        </VStack>
                    </HStack>

                    <HStack spacing={4}>
                        <HStack spacing={2}>
                            <Text fontSize="sm" color="gray.600">
                                {filteredData.length} items
                            </Text>
                            <IconButton
                                icon={<Icon as={MdChevronLeft} />}
                                size="sm"
                                variant="ghost"
                                aria-label="Previous"
                                onClick={handlePreviousPage}
                                isDisabled={currentPage === 1}
                            />
                            <IconButton
                                icon={<Icon as={MdChevronRight} />}
                                size="sm"
                                variant="ghost"
                                aria-label="Next"
                                onClick={handleNextPage}
                                isDisabled={currentPage === totalPages}
                            />
                        </HStack>
                        <HStack spacing={2}>
                            <Tooltip label="Issues">
                                <IconButton
                                    icon={<Icon as={MdVisibility} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Issues"
                                    onClick={handleIssuesClick}
                                />
                            </Tooltip>
                            <Tooltip label="Messages">
                                <IconButton
                                    icon={<Icon as={MdVisibility} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Messages"
                                    onClick={handleMessagesClick}
                                />
                            </Tooltip>
                            <Tooltip label="Reminders">
                                <IconButton
                                    icon={<Icon as={MdVisibility} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Reminders"
                                    onClick={handleRemindersClick}
                                />
                            </Tooltip>
                            <Tooltip label="Settings">
                                <IconButton
                                    icon={<Icon as={MdVisibility} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Settings"
                                    onClick={handleSettingsClick}
                                />
                            </Tooltip>
                        </HStack>
                        <HStack spacing={2}>
                            <Tooltip label="Export">
                                <IconButton
                                    icon={<Icon as={MdDownload} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Export"
                                    onClick={handleExportData}
                                />
                            </Tooltip>
                            <Tooltip label="Print">
                                <IconButton
                                    icon={<Icon as={MdPrint} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Print"
                                    onClick={handlePrintData}
                                />
                            </Tooltip>
                            <Tooltip label="Refresh">
                                <IconButton
                                    icon={<Icon as={MdRefresh} />}
                                    size="sm"
                                    variant="ghost"
                                    aria-label="Refresh"
                                    onClick={handleRefreshData}
                                />
                            </Tooltip>
                            <Tooltip label="Keyboard Shortcuts: Ctrl+N (New), Ctrl+F (Search), Ctrl+R (Refresh), Ctrl+E (Export), Ctrl+P (Print), Delete (Delete Selected)">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    fontSize="xs"
                                    px={2}
                                >
                                    ⌨️
                                </Button>
                            </Tooltip>
                        </HStack>
                    </HStack>
                </Flex>

                {/* Statistics Section */}
                <Box px="25px" mb="20px">
                    <HStack spacing={4} flexWrap="wrap">
                        {(() => {
                            const stats = getStockStatistics();
                            return (
                                <>
                                    <Box bg="blue.50" p={3} borderRadius="8px" minW="120px">
                                        <Text fontSize="xs" color="blue.600" fontWeight="600">Total Items</Text>
                                        <Text fontSize="lg" color="blue.700" fontWeight="bold">{stats.total}</Text>
                                    </Box>
                                    <Box bg="green.50" p={3} borderRadius="8px" minW="120px">
                                        <Text fontSize="xs" color="green.600" fontWeight="600">In Stock</Text>
                                        <Text fontSize="lg" color="green.700" fontWeight="bold">{stats.inStock}</Text>
                                    </Box>
                                    <Box bg="red.50" p={3} borderRadius="8px" minW="120px">
                                        <Text fontSize="xs" color="red.600" fontWeight="600">Out of Stock</Text>
                                        <Text fontSize="lg" color="red.700" fontWeight="bold">{stats.outOfStock}</Text>
                                    </Box>
                                    <Box bg="yellow.50" p={3} borderRadius="8px" minW="120px">
                                        <Text fontSize="xs" color="yellow.600" fontWeight="600">Pending</Text>
                                        <Text fontSize="lg" color="yellow.700" fontWeight="bold">{stats.pending}</Text>
                                    </Box>
                                    <Box bg="purple.50" p={3} borderRadius="8px" minW="120px">
                                        <Text fontSize="xs" color="purple.600" fontWeight="600">Customs Submitted</Text>
                                        <Text fontSize="lg" color="purple.700" fontWeight="bold">{stats.submittedToCustoms}</Text>
                                    </Box>
                                    <Box bg="teal.50" p={3} borderRadius="8px" minW="120px">
                                        <Text fontSize="xs" color="teal.600" fontWeight="600">Total Value</Text>
                                        <Text fontSize="lg" color="teal.700" fontWeight="bold">${stats.totalValue}</Text>
                                    </Box>
                                </>
                            );
                        })()}
                    </HStack>
                </Box>

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
                                placeholder="Search stock items..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
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
                        >
                            <option value="all">All Status</option>
                            <option value="in-stock">In Stock</option>
                            <option value="out-of-stock">Out of Stock</option>
                            <option value="pending">Pending</option>
                        </Select>

                        <Button
                            leftIcon={<Icon as={MdFilterList} />}
                            variant="outline"
                            size="sm"
                            borderRadius="8px"
                            onClick={handleFilterClick}
                        >
                            Filters
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            borderRadius="8px"
                            onClick={handleDataValidation}
                        >
                            Validate Data
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            borderRadius="8px"
                            onClick={handleDuplicateCheck}
                        >
                            Check Duplicates
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            borderRadius="8px"
                            onClick={() => handleQuickActions('selectAll')}
                        >
                            Select All
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            borderRadius="8px"
                            onClick={() => handleQuickActions('clearSelection')}
                            isDisabled={selectedItems.length === 0}
                        >
                            Clear Selection
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            borderRadius="8px"
                            onClick={() => handleQuickActions('exportSelected')}
                            isDisabled={selectedItems.length === 0}
                        >
                            Export Selected
                        </Button>

                        {selectedItems.length > 0 && (
                            <HStack spacing={2}>
                                <Select
                                    size="sm"
                                    placeholder="Bulk Status"
                                    onChange={(e) => handleBulkStatusChange(e.target.value)}
                                    bg={inputBg}
                                    color={inputText}
                                    borderRadius="4px"
                                    w="120px"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                    <option value="Pending">Pending</option>
                                </Select>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBulkCustomsToggle}
                                >
                                    Toggle Customs
                                </Button>
                                <Button
                                    colorScheme="red"
                                    size="sm"
                                    onClick={handleDeleteSelected}
                                >
                                    Delete Selected ({selectedItems.length})
                        </Button>
                            </HStack>
                        )}
                    </HStack>
                </Box>

                {/* Stock List Table */}
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
                                            isChecked={currentData.length > 0 && selectedItems.length === currentData.length}
                                            isIndeterminate={selectedItems.length > 0 && selectedItems.length < currentData.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("stockItemId")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Stock Item ID {getSortIcon("stockItemId")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("soNumber")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        SO Number {getSortIcon("soNumber")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("poNumber")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        PO Number {getSortIcon("poNumber")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("supplier")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Supplier {getSortIcon("supplier")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("vesselName")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Vessel Name {getSortIcon("vesselName")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("originCountry")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Origin Country {getSortIcon("originCountry")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("destinationCountry")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Destination Country {getSortIcon("destinationCountry")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("stockStatus")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Stock Status {getSortIcon("stockStatus")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("itemDescription")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Item Description {getSortIcon("itemDescription")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("itemValue")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Item Value {getSortIcon("itemValue")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("numberOfPcs")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Number of Pcs {getSortIcon("numberOfPcs")}
                                    </Th>
                                    <Th
                                        borderRight="1px"
                                        borderColor="gray.200"
                                        py="12px"
                                        px="16px"
                                        fontSize="12px"
                                        fontWeight="600"
                                        color="gray.600"
                                        textTransform="uppercase"
                                        cursor="pointer"
                                        onClick={() => handleSort("submittedToCustoms")}
                                        _hover={{ bg: "gray.200" }}
                                    >
                                        Submitted to Customs {getSortIcon("submittedToCustoms")}
                                    </Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {currentData.map((item, index) => (
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
                                                {item.stockItemId}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.soNumber || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.poNumber || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.supplier || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.vesselName || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.originCountry || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.destinationCountry || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Select
                                                size="sm"
                                                value={item.stockStatus || ""}
                                                onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                bg={inputBg}
                                                color={inputText}
                                                borderRadius="4px"
                                                fontSize="xs"
                                                minW="100px"
                                            >
                                                <option value="">Select Status</option>
                                                <option value="In Stock">In Stock</option>
                                                <option value="Out of Stock">Out of Stock</option>
                                                <option value="Pending">Pending</option>
                                            </Select>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.itemDescription || "-"}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm' fontWeight='600'>
                                                ${item.itemValue}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.numberOfPcs}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Checkbox
                                                isChecked={item.submittedToCustoms}
                                                size="sm"
                                                onChange={() => handleCustomsToggle(item.id)}
                                            />
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <HStack spacing={2}>
                                                <Tooltip label="View Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdVisibility} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        aria-label="View stock item"
                                                        onClick={() => handleViewItem(item.id)}
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Edit Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdEdit} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        aria-label="Edit stock item"
                                                        onClick={() => handleEditItem(item.id)}
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Delete Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdDelete} />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        aria-label="Delete stock item"
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
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length} results
                    </Text>
                    <HStack spacing={2}>
                        <Button
                            size="sm"
                            onClick={handlePreviousPage}
                            isDisabled={currentPage === 1}
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <Text fontSize="sm" color="gray.600">
                            Page {currentPage} of {totalPages}
                        </Text>
                        <Button
                            size="sm"
                            onClick={handleNextPage}
                            isDisabled={currentPage === totalPages}
                            variant="outline"
                        >
                            Next
                        </Button>
                    </HStack>
                </Flex>
            </VStack>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                leastDestructiveRef={undefined}
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
                            <Button onClick={() => setIsDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={confirmDeleteItem} ml={3}>
                                Delete
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
} 