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
} from "react-icons/md";

export default function StockList() {
    const history = useHistory();
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");

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
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">

            {/* Main Content Area */}
            <Box bg="white" p={{ base: "4", md: "6" }}>
                {/* Top Section with New Button, Title, Search, and Pagination */}
                <Flex
                    justify="space-between"
                    align="center"
                    mb="6"
                    flexDir={{ base: "column", lg: "row" }}
                    gap={{ base: "4", lg: "0" }}
                >
                    <HStack spacing="4">
                        <Button
                            leftIcon={<Icon as={MdAdd} />}
                            bg="#1c4a95"
                            color="white"
                            size="sm"
                            px="6"
                            py="3"
                            borderRadius="md"
                            _hover={{ bg: "#173f7c" }}
                            onClick={handleNewButton}
                        >
                            New
                        </Button>
                        <HStack spacing="2">
                            <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                                Stock List
                            </Text>
                            <IconButton
                                size="xs"
                                icon={<Icon as={MdSettings} color={textColor} />}
                                variant="ghost"
                                aria-label="Settings"
                                onClick={handleSettingsClick}
                                _hover={{ bg: "gray.100" }}
                            />
                        </HStack>
                    </HStack>

                    {/* Search Bar */}
                    <InputGroup maxW="400px">
                        <InputLeftElement pointerEvents="none">
                            <Icon as={MdSearch} color="gray.400" />
                        </InputLeftElement>
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            size="sm"
                            bg="white"
                            border="1px"
                            borderColor="gray.300"
                            borderRadius="md"
                        />
                    </InputGroup>

                    {/* Pagination */}
                    <HStack spacing="2">
                        <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                            {currentPage}-2/{totalPages}
                        </Text>
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdChevronLeft} color={textColor} />}
                            variant="ghost"
                            aria-label="Previous"
                            onClick={handlePreviousPage}
                            isDisabled={currentPage <= 1}
                            _hover={{ bg: "gray.100" }}
                        />
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdChevronRight} color={textColor} />}
                            variant="ghost"
                            aria-label="Next"
                            onClick={handleNextPage}
                            isDisabled={currentPage >= totalPages}
                            _hover={{ bg: "gray.100" }}
                        />
                    </HStack>
                </Flex>

                {/* Stock List Table */}
                <Box overflowX="auto" maxW="100%">
                    <Table variant="unstyled" size="sm" minW="1400px" border="1px" borderColor="gray.300">
                        <Thead>
                            <Tr bg="gray.100">
                                <Th fontSize="xs" color="gray.600" textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300">
                                    <Checkbox
                                        isChecked={selectedItems.length === stockData.length}
                                        isIndeterminate={selectedItems.length > 0 && selectedItems.length < stockData.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        size="sm"
                                    />
                                </Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Stock Item ID</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">SO Number</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">PO Number</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Supplier</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Vessel Name</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Origin Country</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Destination C...</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Stock Status</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Item Descript...</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Item Value</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Number of Pcs</Th>
                                <Th fontSize="xs" color="gray.600" py="3" px="3" borderRight="1px" borderColor="gray.300">Submitted to ...</Th>
                                <Th fontSize="xs" color="gray.600" textAlign="center" py="3" px="3">
                                    <IconButton
                                        size="xs"
                                        icon={<Icon as={MdFilterList} color="gray.500" />}
                                        variant="ghost"
                                        aria-label="Filter"
                                        onClick={handleFilterClick}
                                        _hover={{ bg: "gray.200" }}
                                    />
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {stockData.map((item, index) => (
                                <Tr key={item.id} bg={index % 2 === 0 ? "white" : "gray.50"} _hover={{ bg: "blue.50" }}>
                                    <Td textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        <Checkbox
                                            isChecked={selectedItems.includes(item.id)}
                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            size="sm"
                                        />
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.stockItemId}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.soNumber}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.poNumber}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.supplier}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.vesselName}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.originCountry}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.destinationCountry}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.stockStatus}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.itemDescription}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.itemValue}
                                    </Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        {item.numberOfPcs}
                                    </Td>
                                    <Td textAlign="center" py="3" px="3" borderRight="1px" borderColor="gray.300" borderBottom="1px">
                                        <Checkbox
                                            isChecked={item.submittedToCustoms}
                                            size="sm"
                                        />
                                    </Td>
                                    <Td py="3" px="3" borderBottom="1px">
                                        {/* Empty cell for filter icon column */}
                                    </Td>
                                </Tr>
                            ))}
                            {/* Empty rows for visual spacing
                            {[...Array(1)].map((_, index) => (
                                <Tr key={`empty-${index}`} bg={index % 2 === 0 ? "white" : "gray.50"}>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderRight="1px" borderColor="gray.300" borderBottom="1px"></Td>
                                    <Td py="3" px="3" fontSize="xs" borderBottom="1px"></Td>
                                </Tr>
                            ))} */}
                        </Tbody>
                    </Table>
                </Box>

                {/* Action Buttons */}
                <HStack spacing="4" mt="6" justify="space-between">
                    <HStack spacing="3">
                        <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={handleDeleteSelected}
                            isDisabled={selectedItems.length === 0}
                        >
                            Delete Selected ({selectedItems.length})
                        </Button>
                        <Button
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={handleExportData}
                        >
                            Export Data
                        </Button>
                        <Button
                            size="sm"
                            colorScheme="green"
                            variant="outline"
                            onClick={handleRefreshData}
                        >
                            Refresh
                        </Button>
                    </HStack>

                    <Text fontSize="sm" color="gray.500">
                        {selectedItems.length} item(s) selected
                    </Text>
                </HStack>
            </Box>
        </Box>
    );
} 