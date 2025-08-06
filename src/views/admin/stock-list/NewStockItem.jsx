import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Button,
    Badge,
    Icon,
    HStack,
    VStack,
    IconButton,
    useColorModeValue,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Input,
    Select,
    Textarea,
    FormControl,
    FormLabel,
    FormHelperText,
} from "@chakra-ui/react";
import {
    MdSettings,
    MdBugReport,
    MdChat,
    MdAccessTime,
    MdPerson,
    MdChevronLeft,
    MdChevronRight,
    MdKeyboardArrowDown,
    MdUpload,
    MdSave,
} from "react-icons/md";

export default function NewStockItem() {
    const history = useHistory();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(2);

    // Form state for all fields
    const [formData, setFormData] = useState({
        stockItemId: "",
        itemDescription: "",
        itemValue: "",
        numberOfPcs: "",
        itemType: "",
        stockStatus: "In Stock",
        soNumber: "",
        poNumber: "",
        siNumber: "",
        siCombined: "",
        diNumber: "",
        exportDocumentReference: "",
        shippingDocument: null,
        exportDocument: null,
    });

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFileUpload = (field, file) => {
        setFormData(prev => ({
            ...prev,
            [field]: file
        }));
    };

    const handleSaveStockItem = () => {
        // Here you would typically save to backend/database
        console.log("Saving stock item:", formData);

        // For now, we'll store in localStorage to demonstrate
        const existingStock = JSON.parse(localStorage.getItem('stockItems') || '[]');
        const newStockItem = {
            id: Date.now(), // Simple ID generation
            ...formData,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('stockItems', JSON.stringify([...existingStock, newStockItem]));

        alert("Stock item created successfully!");
        history.push("/admin/stock-list");
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
        alert("Issues panel opened!");
    };

    const handleMessagesClick = () => {
        alert("Messages panel opened! You have 5 unread messages.");
    };

    const handleRemindersClick = () => {
        alert("Reminders panel opened! You have 5 pending reminders.");
    };

    const handleSettingsClick = () => {
        alert("Settings panel opened!");
    };

    const handleRefreshClick = () => {
        alert("Refreshing data...");
    };

    const handleCloudClick = () => {
        alert("Cloud sync...");
    };

    const handleUploadFile = (type) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.doc,.docx,.txt';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileUpload(type === "Shipping" ? "shippingDocument" : "exportDocument", file);
                alert(`${type} document uploaded: ${file.name}`);
            }
        };
        input.click();
    };

    const handleBackToStockList = () => {
        history.push("/admin/stock-list");
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">

            {/* Sub-Header with Save Button and Status Filters */}
            <Flex
                bg="white"
                px={{ base: "4", md: "6" }}
                py="3"
                justify="space-between"
                align="center"
                borderBottom="1px"
                borderColor="gray.200"
            >
                <HStack spacing="4">
                    <Button
                        leftIcon={<Icon as={MdChevronLeft} />}
                        bg="purple.500"
                        color="white"
                        size="sm"
                        px="6"
                        py="3"
                        borderRadius="md"
                        _hover={{ bg: "purple.600" }}
                        onClick={handleBackToStockList}
                    >
                        Back
                    </Button>
                    <HStack spacing="2">
                        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                            New Stock Item
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

                {/* Save Button */}
                <Button
                    leftIcon={<Icon as={MdSave} />}
                    bg="green.500"
                    color="white"
                    size="sm"
                    px="6"
                    py="3"
                    borderRadius="md"
                    _hover={{ bg: "green.600" }}
                    onClick={handleSaveStockItem}
                >
                    Save Stock Item
                </Button>

                {/* Pagination */}
                <HStack spacing="2">
                    <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                        {currentPage}/{totalPages}
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

            {/* Main Content Area */}
            <Box bg="white" p={{ base: "4", md: "6" }}>
                {/* Stock Item Details Section */}
                <Box mb="6">
                    <Flex gap="8" flexDir={{ base: "column", lg: "row" }}>
                        {/* Left Column - Item Specifics */}
                        <VStack align="flex-start" spacing="4" flex="1">
                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Stock Item ID?
                                </FormLabel>
                                <Input
                                    value={formData.stockItemId}
                                    onChange={(e) => handleInputChange("stockItemId", e.target.value)}
                                    placeholder="Enter Stock Item ID"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Item Description?
                                </FormLabel>
                                <Textarea
                                    value={formData.itemDescription}
                                    onChange={(e) => handleInputChange("itemDescription", e.target.value)}
                                    placeholder="Enter item description"
                                    size="sm"
                                    rows={3}
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Item Value?
                                </FormLabel>
                                <Input
                                    type="number"
                                    value={formData.itemValue}
                                    onChange={(e) => handleInputChange("itemValue", e.target.value)}
                                    placeholder="Enter item value"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Number of Pcs?
                                </FormLabel>
                                <Input
                                    type="number"
                                    value={formData.numberOfPcs}
                                    onChange={(e) => handleInputChange("numberOfPcs", e.target.value)}
                                    placeholder="Enter number of pieces"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Item Type?
                                </FormLabel>
                                <Select
                                    value={formData.itemType}
                                    onChange={(e) => handleInputChange("itemType", e.target.value)}
                                    placeholder="Select item type"
                                    size="sm"
                                >
                                    <option value="electronics">Electronics</option>
                                    <option value="clothing">Clothing</option>
                                    <option value="machinery">Machinery</option>
                                    <option value="furniture">Furniture</option>
                                    <option value="other">Other</option>
                                </Select>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Stock Status?
                                </FormLabel>
                                <Select
                                    value={formData.stockStatus}
                                    onChange={(e) => handleInputChange("stockStatus", e.target.value)}
                                    size="sm"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Shipped">Shipped</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Cancelled">Cancelled</option>
                                </Select>
                            </FormControl>
                        </VStack>

                        {/* Right Column - Order/Document Numbers */}
                        <VStack align="flex-start" spacing="4" flex="1">
                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    SO Number?
                                </FormLabel>
                                <Input
                                    value={formData.soNumber}
                                    onChange={(e) => handleInputChange("soNumber", e.target.value)}
                                    placeholder="Enter SO Number"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    PO Number?
                                </FormLabel>
                                <Input
                                    value={formData.poNumber}
                                    onChange={(e) => handleInputChange("poNumber", e.target.value)}
                                    placeholder="Enter PO Number"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    SI Number?
                                </FormLabel>
                                <Input
                                    value={formData.siNumber}
                                    onChange={(e) => handleInputChange("siNumber", e.target.value)}
                                    placeholder="Enter SI Number"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    SI Combined?
                                </FormLabel>
                                <Input
                                    value={formData.siCombined}
                                    onChange={(e) => handleInputChange("siCombined", e.target.value)}
                                    placeholder="Enter SI Combined"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    DI Number?
                                </FormLabel>
                                <Input
                                    value={formData.diNumber}
                                    onChange={(e) => handleInputChange("diNumber", e.target.value)}
                                    placeholder="Enter DI Number"
                                    size="sm"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize="sm" color="gray.600">
                                    Export Document Reference?
                                </FormLabel>
                                <Input
                                    value={formData.exportDocumentReference}
                                    onChange={(e) => handleInputChange("exportDocumentReference", e.target.value)}
                                    placeholder="Enter export document reference"
                                    size="sm"
                                />
                            </FormControl>
                        </VStack>
                    </Flex>
                </Box>

                {/* Tabs Section */}
                <Tabs variant="enclosed" colorScheme="blue">
                    <TabList>
                        <Tab fontSize="sm" fontWeight="medium" _selected={{ bg: "blue.50", borderBottom: "2px solid blue.500" }}>
                            Shipping and Documents
                        </Tab>
                        <Tab fontSize="sm" fontWeight="medium">Vessel Info</Tab>
                        <Tab fontSize="sm" fontWeight="medium">Dates and Delivery</Tab>
                        <Tab fontSize="sm" fontWeight="medium">Supplier and Client</Tab>
                        <Tab fontSize="sm" fontWeight="medium">Dimensions</Tab>
                        <Tab fontSize="sm" fontWeight="medium">Contacts and Meta</Tab>
                        <Tab fontSize="sm" fontWeight="medium">CNEE</Tab>
                        <Tab fontSize="sm" fontWeight="medium">Remarks and Notes</Tab>
                    </TabList>

                    <TabPanels>
                        <TabPanel>
                            {/* Shipping and Documents Content */}
                            <VStack align="flex-start" spacing="6">
                                <VStack align="flex-start" spacing="2">
                                    <HStack>
                                        <Text fontSize="sm" color="gray.600">Shipping Document?</Text>
                                        <Icon as={MdKeyboardArrowDown} size="xs" color="gray.400" />
                                    </HStack>
                                    <Button
                                        leftIcon={<Icon as={MdUpload} />}
                                        colorScheme="purple"
                                        size="sm"
                                        variant="solid"
                                        onClick={() => handleUploadFile("Shipping")}
                                    >
                                        {formData.shippingDocument ? formData.shippingDocument.name : "Upload your file"}
                                    </Button>
                                </VStack>

                                <VStack align="flex-start" spacing="2">
                                    <HStack>
                                        <Text fontSize="sm" color="gray.600">Export Document?</Text>
                                        <Icon as={MdKeyboardArrowDown} size="xs" color="gray.400" />
                                    </HStack>
                                    <Button
                                        leftIcon={<Icon as={MdUpload} />}
                                        colorScheme="purple"
                                        size="sm"
                                        variant="solid"
                                        onClick={() => handleUploadFile("Export")}
                                    >
                                        {formData.exportDocument ? formData.exportDocument.name : "Upload your file"}
                                    </Button>
                                </VStack>
                            </VStack>
                        </TabPanel>
                        <TabPanel>
                            <Text>Vessel Info content</Text>
                        </TabPanel>
                        <TabPanel>
                            <Text>Dates and Delivery content</Text>
                        </TabPanel>
                        <TabPanel>
                            <Text>Supplier and Client content</Text>
                        </TabPanel>
                        <TabPanel>
                            <Text>Dimensions content</Text>
                        </TabPanel>
                        <TabPanel>
                            <Text>Contacts and Meta content</Text>
                        </TabPanel>
                        <TabPanel>
                            <Text>CNEE content</Text>
                        </TabPanel>
                        <TabPanel>
                            <Text>Remarks and Notes content</Text>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Box>
        </Box>
    );
} 