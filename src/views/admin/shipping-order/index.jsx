import React, { useState } from "react";
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
    Grid,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    FormControl,
    FormLabel,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Link,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSettings,
    MdSearch,
    MdMoreVert,
    MdDelete,
    MdEdit,
    MdVisibility,
    MdLocalShipping,
    MdLocationOn,
    MdCalendarToday,
    MdAttachMoney,
    MdPerson,
    MdBugReport,
    MdChat,
    MdAccessTime,
    MdCloudUpload,
    MdRefresh,
    MdHelp,
    MdChevronLeft,
    MdChevronRight,
    MdAttachFile,
    MdSend,
    MdNote,
    MdHistory,
    MdMenu,
    MdClose,
} from "react-icons/md";

export default function ShippingOrder() {
    const [selectedItems, setSelectedItems] = useState([]);
    const [activeTab, setActiveTab] = useState("orderLines");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Quotation data state
    const [quotationData, setQuotationData] = useState({
        quotationId: "S00025",
        invoiceAddress: "Transcoma Shipping SA (Worldwide requests for DOB)",
        deliveryAddress: "Transcoma Shipping SA (Worldwide requests for DOB)",
        quotationTemplate: "",
    });

    // Order lines state
    const [orderLines, setOrderLines] = useState([
        {
            id: 1,
            isSelected: true,
            rate: "0.00",
            quantity: "0.00",
            buyRate: "0.00",
            costActual: "0.00",
            fixedCost: false,
            costSum: "0.00",
            roe: "0.00",
            costUSD: "0.00",
            muPercent: "0.00",
            muAmount: "0.00",
            qtRate: "0.00",
            amendment: "0.00",
            rateTo: "0.00",
        }
    ]);

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");


    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedItems(orderLines.map(item => item.id));
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

    const handleInputChange = (field, value) => {
        setQuotationData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleOrderLineChange = (id, field, value) => {
        setOrderLines(prev => prev.map(line =>
            line.id === id ? { ...line, [field]: value } : line
        ));
    };

    const addOrderLine = () => {
        const newLine = {
            id: orderLines.length + 1,
            isSelected: false,
            rate: "0.00",
            quantity: "0.00",
            buyRate: "0.00",
            costActual: "0.00",
            fixedCost: false,
            costSum: "0.00",
            roe: "0.00",
            costUSD: "0.00",
            muPercent: "0.00",
            muAmount: "0.00",
            qtRate: "0.00",
            amendment: "0.00",
            rateTo: "0.00",
        };
        setOrderLines([...orderLines, newLine]);
    };

    const deleteOrderLine = (id) => {
        setOrderLines(prev => prev.filter(line => line.id !== id));
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="12222">
            {/* Sub Header Bar */}
            <Flex
                bg="gray.100"
                borderBottom="1px"
                borderColor={borderColor}
                px={{ base: "4", md: "6" }}
                py="3"
                justify="space-between"
                align="center"
                flexDir={{ base: "column", lg: "row" }}
                gap={{ base: "2", lg: "0" }}
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
                    >
                        New
                    </Button>
                    <HStack spacing="2">
                        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                            Shipping Orders {quotationData.quotationId}
                        </Text>
                        <IconButton
                            size="xs"
                            icon={<Icon as={MdSettings} color={textColor} />}
                            variant="ghost"
                            aria-label="Settings"
                        />
                    </HStack>
                </HStack>

                <HStack spacing="2">
                    <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                        1/8
                    </Text>
                    <IconButton
                        size="sm"
                        icon={<Icon as={MdChevronLeft} color={textColor} />}
                        variant="ghost"
                        aria-label="Previous"
                    />
                    <IconButton
                        size="sm"
                        icon={<Icon as={MdChevronRight} color={textColor} />}
                        variant="ghost"
                        aria-label="Next"
                    />
                </HStack>
            </Flex>

            {/* Main Content Area */}
            <Flex>
         
                {/* Main Content */}
                <Box flex="1" bg="white" p={{ base: "4", md: "6" }}>
                    {/* Shipping Order ID Header */}
                    <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color={textColor} mb="6">
                        {quotationData.quotationId}
                    </Text>

                    {/* Quotation Details Form */}
                    <Grid templateColumns="repeat(3, 1fr)" gap="6" mb="6">
                        <FormControl>
                            <FormLabel fontSize="sm" color={textColor} display="flex" alignItems="center" gap="2">
                                Invoice Address
                                <Icon as={MdHelp} w="4" h="4" color="gray.400" />
                            </FormLabel>
                            <Input
                                size="sm"
                                value={quotationData.invoiceAddress}
                                onChange={(e) => handleInputChange('invoiceAddress', e.target.value)}
                                border="1px"
                                borderColor="gray.300"
                                borderRadius="md"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel fontSize="sm" color={textColor} display="flex" alignItems="center" gap="2">
                                Delivery Address
                                <Icon as={MdHelp} w="4" h="4" color="gray.400" />
                            </FormLabel>
                            <Input
                                size="sm"
                                value={quotationData.deliveryAddress}
                                onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                                border="1px"
                                borderColor="gray.300"
                                borderRadius="md"
                            />
                        </FormControl>

                        <FormControl>
                            <FormLabel fontSize="sm" color={textColor} display="flex" alignItems="center" gap="2">
                                Quotation Template
                                <Icon as={MdHelp} w="4" h="4" color="gray.400" />
                            </FormLabel>
                            <Input
                                size="sm"
                                value={quotationData.quotationTemplate}
                                onChange={(e) => handleInputChange('quotationTemplate', e.target.value)}
                                border="1px"
                                borderColor="gray.300"
                                borderRadius="md"
                                placeholder="Select template"
                            />
                        </FormControl>
                    </Grid>

                    {/* Tabs */}
                    <Tabs value={activeTab} onChange={setActiveTab} variant="enclosed" mb="6">
                        <TabList>
                            <Tab fontSize="sm" color={textColor}>Order Lines</Tab>
                            <Tab fontSize="sm" color={textColor}>Quotation Details</Tab>
                            <Tab fontSize="sm" color={textColor}>Shipping Details</Tab>
                            <Tab fontSize="sm" color={textColor}>Remarks</Tab>
                            <Tab fontSize="sm" color={textColor}>Optional Products</Tab>
                            <Tab fontSize="sm" color={textColor}>Other Info</Tab>
                            <Tab fontSize="sm" color={textColor}>Customer Signature</Tab>
                        </TabList>

                        <TabPanels>
                            <TabPanel>
                                {/* Order Lines Table */}
                                <Box overflowX="auto" maxW="100%">
                                    <Table variant="simple" size="sm" border="1px" borderColor={borderColor} minW="1400px">
                                        <Thead>
                                            <Tr>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} textAlign="center" bg="gray.50" py="2">Is ...</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Rate</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Quantity</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Buy Rate</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Cost act...</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} textAlign="center" bg="gray.50" py="2">Fixe...</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Cost sum</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">ROE</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Cost USD</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">MU %</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">MU Amo...</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">QT Rate</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Amende...</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} bg="gray.50" py="2">Rate to ...</Th>
                                                <Th fontSize="xs" color="gray.500" border="1px" borderColor={borderColor} textAlign="center" bg="gray.50" py="2">Actions</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {orderLines.map((line) => (
                                                <Tr key={line.id} _hover={{ bg: "gray.50" }}>
                                                    <Td textAlign="center" border="1px" borderColor={borderColor} py="2">
                                                        <Checkbox
                                                            isChecked={line.isSelected}
                                                            onChange={(e) => handleOrderLineChange(line.id, 'isSelected', e.target.checked)}
                                                            colorScheme="green"
                                                            size="sm"
                                                        />
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.rate}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'rate', value)}
                                                            min={0}
                                                            step={0.01}
                                                            bg="orange.50"
                                                            border="1px"
                                                            borderColor="orange.200"
                                                            borderRadius="sm"
                                                        >
                                                            <NumberInputField
                                                                fontSize="xs"
                                                                py="1"
                                                                px="2"
                                                                border="none"
                                                                bg="transparent"
                                                                textAlign="center"
                                                            />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.quantity}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'quantity', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.buyRate}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'buyRate', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.costActual}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'costActual', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td textAlign="center" border="1px" borderColor={borderColor} py="2">
                                                        <Checkbox
                                                            isChecked={line.fixedCost}
                                                            onChange={(e) => handleOrderLineChange(line.id, 'fixedCost', e.target.checked)}
                                                            size="sm"
                                                        />
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.costSum}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'costSum', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.roe}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'roe', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.costUSD}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'costUSD', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.muPercent}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'muPercent', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.muAmount}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'muAmount', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.qtRate}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'qtRate', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.amendment}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'amendment', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td border="1px" borderColor={borderColor} py="1">
                                                        <NumberInput
                                                            size="xs"
                                                            value={line.rateTo}
                                                            onChange={(value) => handleOrderLineChange(line.id, 'rateTo', value)}
                                                            min={0}
                                                            step={0.01}
                                                        >
                                                            <NumberInputField fontSize="xs" py="1" px="2" border="1px" borderColor="gray.300" textAlign="center" />
                                                            <NumberInputStepper>
                                                                <NumberIncrementStepper h="12px" fontSize="8px" />
                                                                <NumberDecrementStepper h="12px" fontSize="8px" />
                                                            </NumberInputStepper>
                                                        </NumberInput>
                                                    </Td>
                                                    <Td textAlign="center" border="1px" borderColor={borderColor} py="2">
                                                        <IconButton
                                                            size="xs"
                                                            icon={<Icon as={MdDelete} />}
                                                            variant="ghost"
                                                            color="gray.500"
                                                            aria-label="Delete"
                                                            onClick={() => deleteOrderLine(line.id)}
                                                        />
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                </Box>
                                <HStack spacing="2" mt="2">
                                    <Link color="blue.500" fontSize="sm" display="inline-block" onClick={addOrderLine}>
                                        Add a line
                                    </Link>
                                    <Icon as={MdEdit} w="4" h="4" color="blue.500" />
                                </HStack>
                            </TabPanel>
                            <TabPanel>
                                <Text color="gray.500">Quotation Details content</Text>
                            </TabPanel>
                            <TabPanel>
                                <Text color="gray.500">Shipping Details content</Text>
                            </TabPanel>
                            <TabPanel>
                                <Text color="gray.500">Remarks content</Text>
                            </TabPanel>
                            <TabPanel>
                                <Text color="gray.500">Optional Products content</Text>
                            </TabPanel>
                            <TabPanel>
                                <Text color="gray.500">Other Info content</Text>
                            </TabPanel>
                            <TabPanel>
                                <Text color="gray.500">Customer Signature content</Text>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>

                    {/* Bottom Communication Section */}
                    <Box
                        borderTop="1px"
                        borderColor={borderColor}
                        pt="4"
                        mt="6"
                    >
                        <Flex justify="space-between" align="center" mb="4">
                            <HStack spacing="4">
                                <Button
                                    leftIcon={<Icon as={MdSend} />}
                                    bg="#1c4a95"
                                    color="white"
                                    size="sm"
                                    _hover={{ bg: "#173f7c" }}
                                >
                                    Send message
                                </Button>
                                <Button
                                    leftIcon={<Icon as={MdNote} />}
                                    variant="ghost"
                                    size="sm"
                                    color="gray.500"
                                >
                                    Log note
                                </Button>
                                <Button
                                    leftIcon={<Icon as={MdHistory} />}
                                    variant="ghost"
                                    size="sm"
                                    color="gray.500"
                                >
                                    Activities
                                </Button>
                            </HStack>

                            <HStack spacing="4">
                                <IconButton
                                    size="sm"
                                    icon={<Icon as={MdSearch} />}
                                    variant="ghost"
                                    aria-label="Search"
                                />
                                <HStack spacing="1">
                                    <Icon as={MdAttachFile} w="4" h="4" color="gray.500" />
                                    <Badge colorScheme="blue" size="sm">1</Badge>
                                </HStack>
                                <Text fontSize="sm" color="gray.500">Following</Text>
                            </HStack>
                        </Flex>

                        <Flex justify="space-between" align="center">
                            <Text fontSize="sm" color="gray.500">
                                You're viewing older messages
                            </Text>
                            <Link color="blue.500" fontSize="sm">
                                Jump to Present
                            </Link>
                        </Flex>
                    </Box>
                </Box>
            </Flex>
        </Box>
    );
} 