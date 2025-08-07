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
    Badge,
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
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSettings,
    MdSearch,
    MdBugReport,
    MdChat,
    MdAccessTime,
    MdPerson,
    MdChevronLeft,
    MdChevronRight,
    MdFilterList,
    MdDownload,
    MdPrint,
    MdEdit,
    MdDelete,
    MdVisibility,
} from "react-icons/md";

export default function StockList() {
    const history = useHistory();
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
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
                stockItemId: "dfsds",
                soNumber: "S00024",
                poNumber: "P00011",
                supplier: "",
                vesselName: "",
                originCountry: "",
                destinationCountry: "",
                stockStatus: "In Stock",
                itemDescription: "fsdfasf",
                itemValue: "0",
                numberOfPcs: "0",
                submittedToCustoms: false,
            },
            {
                id: 2,
                stockItemId: "Si",
                soNumber: "",
                poNumber: "",
                supplier: "",
                vesselName: "",
                originCountry: "",
                destinationCountry: "",
                stockStatus: "",
                itemDescription: "",
                itemValue: "0",
                numberOfPcs: "0",
                submittedToCustoms: false,
            },
        ];

        return [...sampleData, ...savedStockItems];
    };

    const [stockData, setStockData] = useState([]);

    // Load stock data on component mount and refresh
    useEffect(() => {
        setStockData(loadStockData());
    }, []);

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedItems(stockData.map(item => item.id));
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
        console.log("Searching for:", value);
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
        alert("Issues panel opened! This would show system issues and bugs.");
    };

    const handleMessagesClick = () => {
        alert("Messages panel opened! You have 5 unread messages.");
    };

    const handleRemindersClick = () => {
        alert("Reminders panel opened! You have 5 pending reminders.");
    };

    const handleSettingsClick = () => {
        alert("Settings panel opened! Configure your stock list preferences.");
    };

    const handleFilterClick = () => {
        alert("Filter panel opened! Filter your stock items by various criteria.");
    };

    const handleDeleteSelected = () => {
        if (selectedItems.length > 0) {
            const confirmed = window.confirm(`Are you sure you want to delete ${selectedItems.length} selected item(s)?`);
            if (confirmed) {
                alert(`${selectedItems.length} item(s) deleted successfully!`);
                setSelectedItems([]);
            }
        } else {
            alert("Please select items to delete.");
        }
    };

    const handleExportData = () => {
        alert("Exporting stock data to CSV/Excel...");
    };

    const handleRefreshData = () => {
        setStockData(loadStockData());
        alert("Stock data refreshed!");
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
                                {stockData.length} items
                            </Text>
                            <IconButton
                                icon={<Icon as={MdChevronLeft} />}
                                size="sm"
                                variant="ghost"
                                aria-label="Previous"
                                isDisabled={currentPage === 1}
                            />
                            <IconButton
                                icon={<Icon as={MdChevronRight} />}
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
                        >
                            Filters
                        </Button>
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
                                            isChecked={selectedItems.length === stockData.length}
                                            isIndeterminate={selectedItems.length > 0 && selectedItems.length < stockData.length}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Stock Item ID</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">SO Number</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">PO Number</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Supplier</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Vessel Name</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Origin Country</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Destination Country</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Stock Status</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Item Description</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Item Value</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Number of Pcs</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Submitted to Customs</Th>
                                    <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Actions</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {stockData.map((item, index) => (
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
                                                {item.soNumber}
                                            </Text>
                                        </Td>
                                        <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                            <Text color={textColor} fontSize='sm'>
                                                {item.poNumber}
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
                                            <Badge
                                                colorScheme={item.stockStatus === "In Stock" ? "green" : "gray"}
                                                variant="subtle"
                                                fontSize="xs"
                                                px="8px"
                                                py="4px"
                                                borderRadius="full">
                                                {item.stockStatus || "Unknown"}
                                            </Badge>
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
                                            <Checkbox isChecked={item.submittedToCustoms} size="sm" />
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
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Edit Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdEdit} />}
                                                        size="sm"
                                                        colorScheme="blue"
                                                        variant="ghost"
                                                        aria-label="Edit stock item"
                                                    />
                                                </Tooltip>
                                                <Tooltip label="Delete Stock Item">
                                                    <IconButton
                                                        icon={<Icon as={MdDelete} />}
                                                        size="sm"
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        aria-label="Delete stock item"
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
                        Showing {stockData.length} of {stockData.length} results
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
                            isDisabled={currentPage === totalPages}
                            variant="outline"
                        >
                            Next
                        </Button>
                    </HStack>
                </Flex>
            </VStack>
        </Box>
    );
} 