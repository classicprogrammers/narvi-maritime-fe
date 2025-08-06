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
    FormControl,
    FormLabel,
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Grid,
    Textarea,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSettings,
    MdSearch,
    MdArrowBack,
    MdArrowForward,
    MdReport,
    MdChat,
    MdAccessTime,
    MdPerson,
    MdDragIndicator,
    MdMoreVert,
    MdDelete,
} from "react-icons/md";

export default function RateList() {
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal states
    const { isOpen: isNewRateOpen, onOpen: onNewRateOpen, onClose: onNewRateClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [deleteItemId, setDeleteItemId] = useState(null);

    // Form states for new rate item
    const [newRateItem, setNewRateItem] = useState({
        location: "",
        handling: "",
        currency: "",
        rateType: "",
        rateType2: "",
        baseRate: "",
        rateCalculation: "Per AWB",
        fixedSurcharge: "",
        validUntil: "",
        remaining: "",
        rateCalculation2: "Per AWB",
        includeInTariff: false,
        tariffGroup: "",
        sortOrder: "0.00"
    });

    // Rate items state
    const [rateItems, setRateItems] = useState([
        {
            id: "AGP Ag...",
            location: "AGP",
            handling: "Agunca",
            currency: "abp",
            rateType: "",
            rateType2: "",
            baseRate: "3.00",
            rateCalculation: "Per AWB",
            fixedSurcharge: "4.00",
            validUntil: "",
            remaining: "",
            rateCalculation2: "Per AWB",
            includeInTariff: false,
            tariffGroup: "",
            sortOrder: "0.00"
        }
    ]);

    const bgColor = useColorModeValue("white", "gray.800");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const textColor = useColorModeValue("gray.700", "white");

    const handleSelectAll = (isChecked) => {
        if (isChecked) {
            setSelectedItems(rateItems.map(item => item.id));
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

    // Handler functions for modals
    const handleNewRate = () => {
        onNewRateOpen();
    };

    const handleSaveRate = () => {
        // Here you would typically save to backend
        console.log("Saving new rate item:", newRateItem);

        // Add new rate item to the rateItems array
        const newRateItemData = {
            id: `${newRateItem.location} ${newRateItem.handling}...`,
            location: newRateItem.location,
            handling: newRateItem.handling,
            currency: newRateItem.currency,
            rateType: newRateItem.rateType,
            rateType2: newRateItem.rateType2,
            baseRate: newRateItem.baseRate || "0.00",
            rateCalculation: newRateItem.rateCalculation,
            fixedSurcharge: newRateItem.fixedSurcharge || "0.00",
            validUntil: newRateItem.validUntil,
            remaining: newRateItem.remaining,
            rateCalculation2: newRateItem.rateCalculation2,
            includeInTariff: newRateItem.includeInTariff,
            tariffGroup: newRateItem.tariffGroup,
            sortOrder: newRateItem.sortOrder
        };

        setRateItems([...rateItems, newRateItemData]);

        onNewRateClose();
        // Reset form
        setNewRateItem({
            location: "",
            handling: "",
            currency: "",
            rateType: "",
            rateType2: "",
            baseRate: "",
            rateCalculation: "Per AWB",
            fixedSurcharge: "",
            validUntil: "",
            remaining: "",
            rateCalculation2: "Per AWB",
            includeInTariff: false,
            tariffGroup: "",
            sortOrder: "0.00"
        });
    };

    const handleDeleteItem = (itemId) => {
        setDeleteItemId(itemId);
        onDeleteOpen();
    };

    const confirmDelete = () => {
        if (deleteItemId !== null) {
            const newRateItems = rateItems.filter(item => item.id !== deleteItemId);
            setRateItems(newRateItems);
            setDeleteItemId(null);
        }
        onDeleteClose();
    };

    const handleInputChange = (field, value) => {
        setNewRateItem(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            {/* Top Navigation Bar */}
            <Flex
                bg={bgColor}
                borderBottom="1px"
                borderColor={borderColor}
                px={{ base: "4", md: "6" }}
                py="3"
                justify="space-between"
                align="center"
                flexDir={{ base: "column", lg: "row" }}
                gap={{ base: "2", lg: "0" }}
            >
                <HStack spacing={{ base: "2", md: "4" }} flexWrap="wrap" justify="flex-start">
                    {/* <Box
                        w="24px"
                        h="24px"
                        bg="linear-gradient(135deg, #1c4a95 0%, #134391 100%)"
                        borderRadius="4px"
                    /> */}
                    <HStack spacing={{ base: "2", md: "4" }} flexWrap="wrap">
                        {/* Inventory item with colored box */}
                        <Flex align="center" gap="2">
                            <Box
                                w="12px"
                                h="12px"
                                bg="#1c4a95"
                                borderRadius="2px"
                            />
                            <Text fontSize={{ base: "xs", md: "sm" }} color={textColor} fontWeight="medium">
                                Inventory
                            </Text>
                        </Flex>

                        {/* Remaining items */}
                        {["Overview", "Operations", "Products", "Shipment", "Agents", "Reporting", "Configuration"].map((item) => (
                            <Text
                                key={item}
                                fontSize={{ base: "xs", md: "sm" }}
                                color={textColor}
                                fontWeight="medium"
                            >
                                {item}
                            </Text>
                        ))}
                    </HStack>

                </HStack>

                <HStack spacing={{ base: "2", md: "4" }} flexWrap="wrap" justify="flex-end">
                    <IconButton
                        size="sm"
                        icon={<Icon as={MdReport} color={textColor} />}
                        variant="ghost"
                        aria-label="Issues"
                    />
                    <Box position="relative">
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdChat} color={textColor} />}
                            variant="ghost"
                            aria-label="Messages"
                        />
                        <Badge
                            position="absolute"
                            top="-2px"
                            right="-2px"
                            colorScheme="red"
                            borderRadius="full"
                            fontSize="xs"
                        >
                            5
                        </Badge>
                    </Box>
                    <Box position="relative">
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdAccessTime} color={textColor} />}
                            variant="ghost"
                            aria-label="Reminders"
                        />
                        <Badge
                            position="absolute"
                            top="-2px"
                            right="-2px"
                            colorScheme="red"
                            borderRadius="full"
                            fontSize="xs"
                        >
                            5
                        </Badge>
                    </Box>
                    <Text fontSize={{ base: "xs", md: "sm" }} color={textColor} fontWeight="medium" display={{ base: "none", lg: "block" }}>
                        My Company (San Francisco)
                    </Text>
                    <HStack spacing="2">
                        <Icon as={MdPerson} w="24px" h="24px" color={textColor} />
                        <VStack align="flex-start" spacing="0" display={{ base: "none", md: "flex" }}>
                            <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold" color={textColor}>
                                Mitchell Admin
                            </Text>
                            <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500">
                                narvi_maritime
                            </Text>
                        </VStack>
                    </HStack>
                </HStack>
            </Flex>

            {/* Main Content */}
            <Box p={{ base: "4", md: "6" }}>
                {/* Header Section */}
                <Flex
                    justify="space-between"
                    align="center"
                    mb="6"
                    flexDir={{ base: "column", lg: "row" }}
                    gap={{ base: "4", lg: "0" }}
                >
                    <HStack spacing="4" flexWrap="wrap">
                        <Button
                            leftIcon={<MdAdd />}
                            bg="#1c4a95"
                            color="white"
                            size="sm"
                            px="6"
                            py="3"
                            borderRadius="md"
                            _hover={{ bg: "#173f7c" }} // darker shade for hover
                            onClick={handleNewRate}
                        >
                            New
                        </Button>

                        <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color={textColor}>
                            Rate Items
                        </Text>

                        <IconButton
                            size="sm"
                            icon={<Icon as={MdSettings} color={textColor} />}
                            variant="ghost"
                            aria-label="Settings"
                        />
                    </HStack>


                    <HStack spacing="4" flexWrap="wrap">
                        <Box position="relative">
                            <Input
                                placeholder="Search..."
                                size="sm"
                                pr="40px"
                                width={{ base: "150px", md: "200px" }}
                                _placeholder={{ color: "gray.500" }}
                            />
                            <Icon
                                as={MdSearch}
                                position="absolute"
                                right="12px"
                                top="50%"
                                transform="translateY(-50%)"
                                color="gray.500"
                                w="16px"
                                h="16px"
                            />
                        </Box>
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdMoreVert} color={textColor} />}
                            variant="ghost"
                            aria-label="More options"
                        />
                    </HStack>
                </Flex>

                {/* Pagination Info */}
                <Flex
                    justify="space-between"
                    align="center"
                    mb="4"
                    flexDir={{ base: "column", sm: "row" }}
                    gap={{ base: "2", sm: "0" }}
                >
                    <Text fontSize="sm" color={textColor}>
                        {rateItems.length} items
                    </Text>
                    <HStack spacing="2">
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdArrowBack} color={textColor} />}
                            variant="ghost"
                            aria-label="Previous"
                            isDisabled={currentPage === 1}
                        />
                        <Text fontSize="sm" color={textColor}>
                            1-1/1
                        </Text>
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdArrowForward} color={textColor} />}
                            variant="ghost"
                            aria-label="Next"
                            isDisabled={currentPage === totalPages}
                        />
                    </HStack>
                </Flex>

                {/* Rate Items Table */}
                <Box overflowX="auto" maxW="100%">
                    <Table variant="simple" size="sm" border="1px" borderColor={borderColor} minW={{ base: "800px", lg: "auto" }}>
                        <Thead>
                            <Tr>
                                <Th>
                                    <Checkbox
                                        isChecked={selectedItems.length === rateItems.length}
                                        isIndeterminate={selectedItems.length > 0 && selectedItems.length < rateItems.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Rate ID</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Location...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Handlin...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Curre...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Rate Ti...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Rate T...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Base Rate</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Rate Cal...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Fixed Sa...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Valid Until</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Rema...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Rate Cal...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Incl in T...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>Tariff Gr...</Th>
                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor}>
                                    Sort Ord
                                    <Icon as={MdDragIndicator} ml="1" color={textColor} />
                                </Th>

                                <Th fontSize="sm" color="gray.500" border="1px" borderColor={borderColor} textAlign="center">
                                    Delete
                                </Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {rateItems.map((item) => (
                                <Tr key={item.id}>
                                    <Td>
                                        <Checkbox
                                            isChecked={selectedItems.includes(item.id)}
                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                        />
                                    </Td>
                                    <Td fontSize="sm" color={textColor}>{item.id}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.location}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.handling}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.currency}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.rateType}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.rateType2}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.baseRate}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.rateCalculation}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.fixedSurcharge}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.validUntil}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.remaining}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.rateCalculation2}</Td>
                                    <Td>
                                        <Checkbox isChecked={item.includeInTariff} />
                                    </Td>
                                    <Td fontSize="sm" color={textColor}>{item.tariffGroup}</Td>
                                    <Td fontSize="sm" color={textColor}>{item.sortOrder}</Td>

                                    <Td fontSize="sm" color={textColor} textAlign="center">
                                        <IconButton
                                            size="sm"
                                            icon={<Icon as={MdDelete} />}
                                            variant="ghost"
                                            color="red.500"
                                            aria-label="Delete"
                                            _hover={{ bg: "red.50", color: "red.600" }}
                                            _active={{ bg: "red.100" }}
                                            borderRadius="md"
                                            onClick={() => handleDeleteItem(item.id)}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Box>
            </Box>

            {/* New Rate Item Modal */}
            <Modal isOpen={isNewRateOpen} onClose={onNewRateClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader bg="#1c4a95" color="white">
                        Create New Rate Item
                    </ModalHeader>
                    <ModalCloseButton color="white" />
                    <ModalBody py="6">
                        <Grid templateColumns="repeat(2, 1fr)" gap="6">
                            {/* Left Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Location</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newRateItem.location}
                                        onChange={(e) => handleInputChange('location', e.target.value)}
                                        placeholder="Enter location code"
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

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Handling</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newRateItem.handling}
                                        onChange={(e) => handleInputChange('handling', e.target.value)}
                                        placeholder="Enter handling type"
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

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Currency</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newRateItem.currency}
                                        onChange={(e) => handleInputChange('currency', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <option value="">Select currency</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="JPY">JPY</option>
                                        <option value="abp">abp</option>
                                    </Select>
                                </FormControl>

                                <HStack spacing="4">
                                    <FormControl>
                                        <FormLabel fontSize="sm" color={textColor}>Rate Type</FormLabel>
                                        <Input
                                            size="sm"
                                            value={newRateItem.rateType}
                                            onChange={(e) => handleInputChange('rateType', e.target.value)}
                                            placeholder="Enter rate type"
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
                                        <FormLabel fontSize="sm" color={textColor}>Rate Type 2</FormLabel>
                                        <Input
                                            size="sm"
                                            value={newRateItem.rateType2}
                                            onChange={(e) => handleInputChange('rateType2', e.target.value)}
                                            placeholder="Enter rate type 2"
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

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Base Rate</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newRateItem.baseRate}
                                        onChange={(value) => handleInputChange('baseRate', value)}
                                        min={0}
                                        step={0.01}
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <NumberInputField
                                            border="1px"
                                            borderColor="gray.300"
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
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Fixed Surcharge</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newRateItem.fixedSurcharge}
                                        onChange={(value) => handleInputChange('fixedSurcharge', value)}
                                        min={0}
                                        step={0.01}
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <NumberInputField
                                            border="1px"
                                            borderColor="gray.300"
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
                                </FormControl>
                            </VStack>

                            {/* Right Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Valid Until</FormLabel>
                                    <Input
                                        size="sm"
                                        type="date"
                                        value={newRateItem.validUntil}
                                        onChange={(e) => handleInputChange('validUntil', e.target.value)}
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
                                    <FormLabel fontSize="sm" color={textColor}>Remaining</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newRateItem.remaining}
                                        onChange={(e) => handleInputChange('remaining', e.target.value)}
                                        placeholder="Enter remaining value"
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
                                    <FormLabel fontSize="sm" color={textColor}>Rate Calculation</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newRateItem.rateCalculation}
                                        onChange={(e) => handleInputChange('rateCalculation', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <option value="Per AWB">Per AWB</option>
                                        <option value="Per KG">Per KG</option>
                                        <option value="Per Piece">Per Piece</option>
                                        <option value="Fixed">Fixed</option>
                                    </Select>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Rate Calculation 2</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newRateItem.rateCalculation2}
                                        onChange={(e) => handleInputChange('rateCalculation2', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <option value="Per AWB">Per AWB</option>
                                        <option value="Per KG">Per KG</option>
                                        <option value="Per Piece">Per Piece</option>
                                        <option value="Fixed">Fixed</option>
                                    </Select>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Tariff Group</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newRateItem.tariffGroup}
                                        onChange={(e) => handleInputChange('tariffGroup', e.target.value)}
                                        placeholder="Enter tariff group"
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

                                <HStack spacing="4">
                                    <FormControl>
                                        <FormLabel fontSize="sm" color={textColor}>Sort Order</FormLabel>
                                        <NumberInput
                                            size="sm"
                                            value={newRateItem.sortOrder}
                                            onChange={(value) => handleInputChange('sortOrder', value)}
                                            min={0}
                                            step={0.01}
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        >
                                            <NumberInputField
                                                border="1px"
                                                borderColor="gray.300"
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
                                    </FormControl>

                                </HStack>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Include in Tariff</FormLabel>
                                    <Checkbox
                                        size="sm"
                                        colorScheme="blue"
                                        isChecked={newRateItem.includeInTariff}
                                        onChange={(e) => handleInputChange('includeInTariff', e.target.checked)}
                                    >
                                        Include this rate in tariff calculations
                                    </Checkbox>
                                </FormControl>
                            </VStack>
                        </Grid>
                    </ModalBody>
                    <ModalFooter bg="gray.50" borderTop="1px" borderColor="gray.200">
                        <Button variant="ghost" mr={3} onClick={onNewRateClose}>
                            Cancel
                        </Button>
                        <Button
                            bg="#1c4a95"
                            color="white"
                            _hover={{ bg: "#173f7c" }}
                            onClick={handleSaveRate}
                        >
                            Create Rate Item
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <AlertDialogOverlay />
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        Delete Rate Item
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to delete this rate item? This action cannot be undone.
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