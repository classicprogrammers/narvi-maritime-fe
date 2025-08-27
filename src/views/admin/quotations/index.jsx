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
    FormControl,
    FormLabel,
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Grid,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    Textarea,
    Checkbox,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSettings,
    MdArrowBack,
    MdArrowForward,
    MdDragIndicator,
    MdHelpOutline,
    MdKeyboardArrowDown,
    MdDelete,
} from "react-icons/md";

export default function Quotations() {
    const [activeTab, setActiveTab] = useState("order-lines");

    // Modal states
    const { isOpen: isNewQuotationOpen, onOpen: onNewQuotationOpen, onClose: onNewQuotationClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [deleteItemIndex, setDeleteItemIndex] = useState(null);

    // Form states for new quotation
    const [newQuotation, setNewQuotation] = useState({
        customer: "",
        address: "",
        city: "",
        country: "",
        expiration: "",
        vessel: "",
        paymentTerms: "",
        invoiceAddress: "",
        deliveryAddress: "",
        quotationTemplate: "",
        pricelist: "Default USD pricelist (USD)",
    });

    // Order lines state
    const [orderLines, setOrderLines] = useState([
        {
            product: "[FURN_1118] Corner Desk Left Sit",
            description: "[FURN_1118] Corner Desk Left Sit",
            route: "",
            quantity: 1.00,
            uom: "Units",
            unitPrice: 85.00,
            taxes: "",
            discount: 0.00,
            taxExcluded: 85.00,
        },
    ]);

    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");

    const quotationData = {
        id: "S00025",
        customer: "Transcoma Shipping SA (Worldwide requests for DOB)",
        address: "Ed. De Servicios, Area El Fresno Torre A",
        city: "11370 Algeciras",
        country: "Spain",
        expiration: "09/03/2025",
        quotationDate: "08/04/2025 13:00:13",
        pricelist: "Default USD pricelist (USD)",
        vessel: "",
        paymentTerms: "",
        invoiceAddress: "Transcoma Shipping SA (Worldwide requests for DOB)",
        deliveryAddress: "Transcoma Shipping SA (Worldwide requests for DOB)",
        quotationTemplate: "",
    };

    const tabs = [
        { id: "order-lines", name: "Order Lines" },
        { id: "quotation-details", name: "Quotation Details" },
        { id: "shipping-details", name: "Shipping Details" },
        { id: "remarks", name: "Remarks" },
        { id: "optional-products", name: "Optional Products" },
        { id: "other-info", name: "Other Info" },
        { id: "customer-signature", name: "Customer Signature" },
    ];

    // Handler functions
    const handleNewQuotation = () => {
        onNewQuotationOpen();
    };

    const handleSaveQuotation = () => {
        // Here you would typically save to backend
        console.log("Saving new quotation:", newQuotation);

        // Add new quotation data to the orderLines array
        const newOrderLine = {
            product: newQuotation.customer || "New Product",
            description: newQuotation.address || "New Description",
            route: "",
            quantity: 1.00,
            uom: "Units",
            unitPrice: 85.00,
            taxes: "",
            discount: 0.00,
            taxExcluded: 85.00,
        };

        setOrderLines([...orderLines, newOrderLine]);

        onNewQuotationClose();
        // Reset form
        setNewQuotation({
            customer: "",
            address: "",
            city: "",
            country: "",
            expiration: "",
            vessel: "",
            paymentTerms: "",
            invoiceAddress: "",
            deliveryAddress: "",
            quotationTemplate: "",
            pricelist: "Default USD pricelist (USD)",
        });
    };

    const handleDeleteItem = (index) => {
        setDeleteItemIndex(index);
        onDeleteOpen();
    };

    const confirmDelete = () => {
        if (deleteItemIndex !== null) {
            const newOrderLines = orderLines.filter((_, index) => index !== deleteItemIndex);
            setOrderLines(newOrderLines);
            setDeleteItemIndex(null);
        }
        onDeleteClose();
    };

    const handleInputChange = (field, value) => {
        setNewQuotation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden">

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
                        onClick={handleNewQuotation}
                    >
                        New
                    </Button>
                    <HStack spacing="2">
                        <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                            Quotations {quotationData.id}
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
                        icon={<Icon as={MdArrowBack} color={textColor} />}
                        variant="ghost"
                        aria-label="Previous"
                    />
                    <IconButton
                        size="sm"
                        icon={<Icon as={MdArrowForward} color={textColor} />}
                        variant="ghost"
                        aria-label="Next"
                    />
                </HStack>
            </Flex>

            {/* Main Content Area */}
            <Box bg="white" p={{ base: "4", md: "6" }}>
                {/* Quotation ID Header */}
                <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color={textColor} mb="6">
                    {quotationData.id}
                </Text>

                {/* Quotation Details Section */}
                <Box mb="6">
                    <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="6">
                        {/* Left Column */}
                        <VStack spacing="4" align="stretch">
                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Customer <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                                    {quotationData.customer}
                                </Text>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                                    {quotationData.address}
                                </Text>
                                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                                    {quotationData.city}, {quotationData.country}
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Vessel <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Input size={{ base: "xs", md: "sm" }} style={{ padding: "6px 10px" }} placeholder="" />
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Invoice Address <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                                    {quotationData.invoiceAddress}
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Delivery Address <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                                    {quotationData.deliveryAddress}
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Quotation Template <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Input size={{ base: "xs", md: "sm" }} style={{ padding: "6px 10px" }} placeholder="" />
                            </FormControl>
                        </VStack>

                        {/* Right Column */}
                        <VStack spacing="4" align="stretch">
                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Expiration <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                                    {quotationData.expiration}
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Quotation Date <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                                    {quotationData.quotationDate}
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Pricelist <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Text fontSize={{ base: "xs", md: "sm" }} color={textColor}>
                                    {quotationData.pricelist}
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel fontSize={{ base: "xs", md: "sm" }} color={textColor} display="flex" alignItems="center">
                                    Payment Terms <Icon as={MdHelpOutline} ml="1" />
                                </FormLabel>
                                <Input size={{ base: "xs", md: "sm" }} style={{ padding: "6px 10px" }} placeholder="" />
                            </FormControl>
                        </VStack>
                    </Grid>
                </Box>

                {/* Tabs */}
                <Tabs value={activeTab} onChange={setActiveTab} variant="enclosed" mb="6">
                    <TabList bg="gray.100" borderRadius="md">
                        {tabs.map((tab) => (
                            <Tab
                                key={tab.id}
                                value={tab.id}
                                _selected={{ bg: "white", color: "blue.500", borderBottom: "2px solid", borderColor: "blue.500" }}
                                _hover={{ bg: "white", color: "blue.500" }}
                                fontSize={{ base: "xs", md: "sm" }}
                                fontWeight="medium"
                                whiteSpace="nowrap"
                            >
                                {tab.name}
                            </Tab>
                        ))}
                    </TabList>

                    <TabPanels>
                        {/* Order Lines Tab */}
                        <TabPanel value="order-lines" p="0">
                            <Box
                                overflowX="auto"
                                maxW="100%"
                                maxH="400px"
                                border="1px"
                                borderColor={borderColor}
                                borderRadius="lg"
                                bg="white"
                                shadow="md"
                                overflowY="auto"
                                sx={{
                                    '&::-webkit-scrollbar': {
                                        height: '12px',
                                    },
                                    '&::-webkit-scrollbar-track': {
                                        background: '#f1f1f1',
                                        borderRadius: '6px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                        background: '#c1c1c1',
                                        borderRadius: '6px',
                                        '&:hover': {
                                            background: '#a8a8a8',
                                        },
                                    },
                                    '&::-webkit-scrollbar-button': {
                                        background: '#e0e0e0',
                                        border: '1px solid #ccc',
                                        borderRadius: '3px',
                                        '&:hover': {
                                            background: '#d0d0d0',
                                        },
                                        '&:active': {
                                            background: '#b0b0b0',
                                        },
                                    },
                                    '&::-webkit-scrollbar-button:single-button': {
                                        height: '12px',
                                        width: '12px',
                                    },
                                    '&::-webkit-scrollbar-button:single-button:vertical:decrement': {
                                        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'><path d=\'M3 6l3-3 3 3\' fill=\'%23666\'/></svg>")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                    },
                                    '&::-webkit-scrollbar-button:single-button:vertical:increment': {
                                        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'><path d=\'M3 3l3 3 3-3\' fill=\'%23666\'/></svg>")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                    },
                                    '&::-webkit-scrollbar-button:single-button:Classictal:decrement': {
                                        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'><path d=\'M6 3l-3 3 3 3\' fill=\'%23666\'/></svg>")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                    },
                                    '&::-webkit-scrollbar-button:single-button:Classictal:increment': {
                                        backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'><path d=\'M3 3l3 3 3-3\' fill=\'%23666\'/></svg>")',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'center',
                                    },
                                }}
                            >
                                <Table variant="simple" size={{ base: "xs", md: "sm" }} minW={{ base: "1000px", lg: "auto" }}>
                                    <Thead>
                                        <Tr bg="gray.100" borderBottom="2px" borderColor={borderColor}>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Product
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Description
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Route
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Quantity
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                UoM
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Unit Price
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Taxes
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Disc.%
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                            >
                                                Tax excl.
                                            </Th>
                                            <Th
                                                fontSize={{ base: "xs", md: "sm" }}
                                                color="gray.700"
                                                border="1px"
                                                borderColor={borderColor}
                                                fontWeight="bold"
                                                py="4"
                                                px="6"
                                                textTransform="none"
                                                letterSpacing="wide"
                                                textAlign="center"
                                            >
                                                Actions
                                            </Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {orderLines.map((line, index) => (
                                            <Tr
                                                key={index}
                                                _hover={{ bg: "blue.50" }}
                                                bg={index % 2 === 0 ? "white" : "gray.25"}
                                                borderBottom="1px"
                                                borderColor={borderColor}
                                                transition="all 0.2s"
                                            >
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    fontWeight="semibold"
                                                    wordBreak="keep-all"
                                                    whiteSpace="nowrap"
                                                    maxW="300px"
                                                    minH="80px"
                                                    overflow="hidden"
                                                >
                                                    <HStack spacing="3">
                                                        <Icon as={MdDragIndicator} color="gray.400" cursor="grab" _hover={{ color: "gray.600" }} />
                                                        <VStack align="flex-start" spacing="0">
                                                            <Text fontWeight="semibold" color="blue.600" noOfLines={1} title={line.product}>{line.product}</Text>
                                                            <Text fontSize="xs" color="gray.500">Product ID</Text>
                                                        </VStack>
                                                    </HStack>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    wordBreak="break-word"
                                                    whiteSpace="normal"
                                                    maxW="200px"
                                                >
                                                    <Text noOfLines={2} title={line.description}>{line.description}</Text>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    wordBreak="break-word"
                                                    whiteSpace="normal"
                                                    maxW="150px"
                                                >
                                                    <Input
                                                        size={{ base: "xs", md: "sm" }}
                                                        style={{ padding: "6px 10px" }}
                                                        placeholder="Enter route..."
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "blue.500",
                                                            boxShadow: "0 0 0 1px blue.500",
                                                            bg: "blue.50"
                                                        }}
                                                        _hover={{ borderColor: "gray.400" }}
                                                    />
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                >
                                                    <NumberInput
                                                        size={{ base: "xs", md: "sm" }}
                                                        style={{ padding: "6px 10px" }}
                                                        value={line.quantity}
                                                        onChange={(value) => {
                                                            const newOrderLines = [...orderLines];
                                                            newOrderLines[index].quantity = parseFloat(value);
                                                            setOrderLines(newOrderLines);
                                                        }}
                                                        min={0}
                                                        step={0.01}
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "blue.500",
                                                            boxShadow: "0 0 0 1px blue.500",
                                                            bg: "blue.50"
                                                        }}
                                                    >
                                                        <NumberInputField
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            style={{ padding: "6px 10px" }}
                                                            _hover={{ borderColor: "gray.400" }}
                                                        />
                                                        <NumberInputStepper>
                                                            <NumberIncrementStepper
                                                                h="16px"
                                                                fontSize="10px"
                                                                border="none"
                                                                bg="transparent"
                                                                _hover={{ bg: "gray.100" }}
                                                            />
                                                            <NumberDecrementStepper
                                                                h="16px"
                                                                fontSize="10px"
                                                                border="none"
                                                                bg="transparent"
                                                                _hover={{ bg: "gray.100" }}
                                                            />
                                                        </NumberInputStepper>
                                                    </NumberInput>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                >
                                                    <Menu>
                                                        <MenuButton
                                                            as={Button}
                                                            size={{ base: "xs", md: "sm" }}
                                                            style={{ padding: "6px 10px" }}
                                                            variant="outline"
                                                            borderRadius="md"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            bg="white"
                                                            color={textColor}
                                                            fontWeight="medium"
                                                            _hover={{
                                                                borderColor: "#1c4a95",
                                                                bg: "#f8f9ff"
                                                            }}
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                            _active={{
                                                                bg: "#e8f0ff"
                                                            }}
                                                            rightIcon={<Icon as={MdKeyboardArrowDown} />}
                                                            w="100%"
                                                            justifyContent="space-between"
                                                        >
                                                            {line.uom}
                                                        </MenuButton>
                                                        <MenuList
                                                            bg="white"
                                                            border="1px"
                                                            borderColor="gray.200"
                                                            borderRadius="md"
                                                            boxShadow="lg"
                                                            py="2"
                                                            minW="120px"
                                                        >
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Units
                                                            </MenuItem>
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Pieces
                                                            </MenuItem>
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Kg
                                                            </MenuItem>
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Liters
                                                            </MenuItem>
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Meters
                                                            </MenuItem>
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Hours
                                                            </MenuItem>
                                                            <MenuItem
                                                                bg="white"
                                                                color="#1c4a95"
                                                                py="3"
                                                                px="4"
                                                                fontSize="14px"
                                                                fontWeight="medium"
                                                                _hover={{
                                                                    bg: "#f8f9ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "semibold"
                                                                }}
                                                                _focus={{
                                                                    bg: "#e8f0ff",
                                                                    color: "#1c4a95",
                                                                    fontWeight: "bold"
                                                                }}
                                                            >
                                                                Days
                                                            </MenuItem>
                                                        </MenuList>
                                                    </Menu>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    fontWeight="bold"
                                                    textAlign="right"
                                                    wordBreak="keep-all"
                                                    whiteSpace="nowrap"
                                                    maxW="120px"
                                                    overflow="hidden"
                                                >
                                                    <Text color="green.600">${line.unitPrice.toFixed(2)}</Text>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    wordBreak="keep-all"
                                                    whiteSpace="nowrap"
                                                    maxW="100px"
                                                    overflow="hidden"
                                                >
                                                    <Input
                                                        size={{ base: "xs", md: "sm" }}
                                                        style={{ padding: "6px 10px" }}
                                                        placeholder="0.00"
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "blue.500",
                                                            boxShadow: "0 0 0 1px blue.500",
                                                            bg: "blue.50"
                                                        }}
                                                        _hover={{ borderColor: "gray.400" }}
                                                    />
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    fontWeight="semibold"
                                                    textAlign="center"
                                                    wordBreak="keep-all"
                                                    whiteSpace="nowrap"
                                                    maxW="80px"
                                                    overflow="hidden"
                                                >
                                                    <Text color={line.discount > 0 ? "orange.600" : "gray.500"}>
                                                        {line.discount.toFixed(2)}%
                                                    </Text>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    wordBreak="keep-all"
                                                    whiteSpace="nowrap"
                                                    maxW="150px"
                                                    overflow="hidden"
                                                >
                                                    <Text fontWeight="bold" color="green.600" fontSize="md" noOfLines={1} title={`$ ${line.taxExcluded.toFixed(2)}`}>
                                                        $ {line.taxExcluded.toFixed(2)}
                                                    </Text>
                                                </Td>
                                                <Td
                                                    fontSize={{ base: "xs", md: "sm" }}
                                                    color={textColor}
                                                    border="1px"
                                                    borderColor={borderColor}
                                                    py="4"
                                                    px="6"
                                                    textAlign="center"
                                                    maxW="100px"
                                                >
                                                    <IconButton
                                                        size="sm"
                                                        icon={<Icon as={MdDelete} />}
                                                        variant="ghost"
                                                        color="red.500"
                                                        aria-label="Delete"
                                                        _hover={{ bg: "red.50", color: "red.600" }}
                                                        _active={{ bg: "red.100" }}
                                                        borderRadius="md"
                                                        onClick={() => handleDeleteItem(index)}
                                                    />
                                                </Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        </TabPanel>

                        {/* Other Tab Panels */}
                        {tabs.slice(1).map((tab) => (
                            <TabPanel key={tab.id} value={tab.id} p="0">
                                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color={textColor}>
                                    {tab.name} Content
                                </Text>
                                <Text color="gray.500" mt="2">
                                    This is the {tab.name.toLowerCase()} section content.
                                </Text>
                            </TabPanel>
                        ))}
                    </TabPanels>
                </Tabs>
            </Box>

            {/* New Quotation Modal */}
            <Modal isOpen={isNewQuotationOpen} onClose={onNewQuotationClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader bg="#1c4a95" color="white">
                        Create New Quotation
                    </ModalHeader>
                    <ModalCloseButton color="white" />
                    <ModalBody py="6">
                        <Grid templateColumns="repeat(2, 1fr)" gap="6">
                            {/* Left Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Customer</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newQuotation.customer}
                                        onChange={(e) => handleInputChange('customer', e.target.value)}
                                        placeholder="Enter customer name"
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Address</FormLabel>
                                    <Textarea
                                        size="sm"
                                        value={newQuotation.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        placeholder="Enter address"
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                        rows={3}
                                    />
                                </FormControl>

                                <HStack spacing="4">
                                    <FormControl>
                                        <FormLabel fontSize="sm" color={textColor}>City</FormLabel>
                                        <Input
                                            size="sm"
                                            value={newQuotation.city}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            placeholder="Enter city"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm" color={textColor}>Country</FormLabel>
                                        <Input
                                            size="sm"
                                            value={newQuotation.country}
                                            onChange={(e) => handleInputChange('country', e.target.value)}
                                            placeholder="Enter country"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                    </FormControl>
                                </HStack>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Vessel</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newQuotation.vessel}
                                        onChange={(e) => handleInputChange('vessel', e.target.value)}
                                        placeholder="Enter vessel name"
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Invoice Address</FormLabel>
                                    <Textarea
                                        size="sm"
                                        value={newQuotation.invoiceAddress}
                                        onChange={(e) => handleInputChange('invoiceAddress', e.target.value)}
                                        placeholder="Enter invoice address"
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                        rows={3}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Delivery Address</FormLabel>
                                    <Textarea
                                        size="sm"
                                        value={newQuotation.deliveryAddress}
                                        onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                                        placeholder="Enter delivery address"
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                        rows={3}
                                    />
                                </FormControl>
                            </VStack>

                            {/* Right Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Expiration Date</FormLabel>
                                    <Input
                                        size="sm"
                                        type="date"
                                        value={newQuotation.expiration}
                                        onChange={(e) => handleInputChange('expiration', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Pricelist</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newQuotation.pricelist}
                                        onChange={(e) => handleInputChange('pricelist', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <option value="Default USD pricelist (USD)">Default USD pricelist (USD)</option>
                                        <option value="EUR Pricelist">EUR Pricelist</option>
                                        <option value="GBP Pricelist">GBP Pricelist</option>
                                    </Select>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Payment Terms</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newQuotation.paymentTerms}
                                        onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                                        placeholder="Enter payment terms"
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Quotation Template</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newQuotation.quotationTemplate}
                                        onChange={(e) => handleInputChange('quotationTemplate', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <option value="">Select template</option>
                                        <option value="Standard Template">Standard Template</option>
                                        <option value="Premium Template">Premium Template</option>
                                        <option value="Custom Template">Custom Template</option>
                                    </Select>
                                </FormControl>

                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" color={textColor} mb="2">
                                        Additional Options
                                    </Text>
                                    <VStack spacing="2" align="flex-start">
                                        <Checkbox size="sm" colorScheme="blue">
                                            Include shipping details
                                        </Checkbox>
                                        <Checkbox size="sm" colorScheme="blue">
                                            Include optional products
                                        </Checkbox>
                                        <Checkbox size="sm" colorScheme="blue">
                                            Require customer signature
                                        </Checkbox>
                                    </VStack>
                                </Box>
                            </VStack>
                        </Grid>
                    </ModalBody>
                    <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
                        <Button variant="ghost" mr={3} onClick={onNewQuotationClose}>
                            Cancel
                        </Button>
                        <Button
                            bg="#1c4a95"
                            color="white"
                            _hover={{ bg: "#173f7c" }}
                            onClick={handleSaveQuotation}
                        >
                            Create Quotation
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <AlertDialogOverlay />
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        Delete Item
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to delete this item? This action cannot be undone.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button onClick={onDeleteClose}>
                            Cancel
                        </Button>
                        <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Box>
    );
}