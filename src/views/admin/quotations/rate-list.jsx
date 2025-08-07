import React, { useState } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    Input,
    InputGroup,
    InputLeftElement,
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
    useToast,
    Tooltip,
    Card,
    CardBody,
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
    MdEdit,
    MdVisibility,
    MdFilterList,
    MdDownload,
    MdPrint,
} from "react-icons/md";

export default function RateList() {
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchValue, setSearchValue] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal states
    const { isOpen: isNewRateOpen, onOpen: onNewRateOpen, onClose: onNewRateClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [deleteItemId, setDeleteItemId] = useState(null);
    const toast = useToast();

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
    const hoverBg = useColorModeValue("blue.50", "blue.900");
    const searchIconColor = useColorModeValue("gray.400", "gray.500");
    const inputBg = useColorModeValue("white", "gray.700");
    const inputText = useColorModeValue("gray.700", "white");

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

        toast({
            title: "Rate Item Created",
            description: "New rate item has been successfully created.",
            status: "success",
            duration: 3000,
            isClosable: true,
        });

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

            toast({
                title: "Rate Item Deleted",
                description: "Rate item has been successfully deleted.",
                status: "success",
                duration: 3000,
                isClosable: true,
            });
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
            <VStack spacing={6} align="stretch">
                {/* Header Section */}
                <Flex justify="space-between" align="center" px="25px">
                    <HStack spacing={4}>
                        <Button
                            leftIcon={<Icon as={MdAdd} />}
                            colorScheme="blue"
                            size="sm"
                            onClick={handleNewRate}
                        >
                            New Rate Item
                        </Button>
                        <VStack align="start" spacing={1}>
                            <Text fontSize="xl" fontWeight="bold" color="blue.600">
                                Rate List
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                Manage shipping rates and tariffs
                            </Text>
                        </VStack>
                    </HStack>

                    <HStack spacing={4}>
                        <HStack spacing={2}>
                            <Text fontSize="sm" color="gray.600">
                                {rateItems.length} items
                            </Text>
                            <IconButton
                                icon={<Icon as={MdArrowBack} />}
                                size="sm"
                                variant="ghost"
                                aria-label="Previous"
                                isDisabled={currentPage === 1}
                            />
                            <IconButton
                                icon={<Icon as={MdArrowForward} />}
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
                                placeholder="Search rate items..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
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
                            zIndex={1000}
                            position="relative"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
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

                {/* Rate Items Table */}
                <Box px="25px">
                    <Table variant="unstyled" size="sm" minW="100%">
                        <Thead bg="gray.100">
                            <Tr>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                    <Checkbox
                                        isChecked={selectedItems.length === rateItems.length}
                                        isIndeterminate={selectedItems.length > 0 && selectedItems.length < rateItems.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                    />
                                </Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Rate ID</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Location</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Handling</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Currency</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Rate Type</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Base Rate</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Rate Calc</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Fixed Surcharge</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Valid Until</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Include in Tariff</Th>
                                <Th borderRight="1px" borderColor="gray.200" py="12px" px="16px" fontSize="12px" fontWeight="600" color="gray.600" textTransform="uppercase">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {rateItems.map((item, index) => (
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
                                            {item.id}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm'>
                                            {item.location}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm'>
                                            {item.handling}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Badge
                                            colorScheme="blue"
                                            variant="subtle"
                                            fontSize="xs"
                                            px="8px"
                                            py="4px"
                                            borderRadius="full">
                                            {item.currency}
                                        </Badge>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm'>
                                            {item.rateType || "-"}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm' fontWeight='600'>
                                            ${item.baseRate}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm'>
                                            {item.rateCalculation}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm'>
                                            ${item.fixedSurcharge}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Text color={textColor} fontSize='sm'>
                                            {item.validUntil || "-"}
                                        </Text>
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <Checkbox isChecked={item.includeInTariff} size="sm" />
                                    </Td>
                                    <Td borderRight="1px" borderColor="gray.200" py="12px" px="16px">
                                        <HStack spacing={2}>
                                            <Tooltip label="View Rate">
                                                <IconButton
                                                    icon={<Icon as={MdVisibility} />}
                                                    size="sm"
                                                    colorScheme="blue"
                                                    variant="ghost"
                                                    aria-label="View rate"
                                                />
                                            </Tooltip>
                                            <Tooltip label="Edit Rate">
                                                <IconButton
                                                    icon={<Icon as={MdEdit} />}
                                                    size="sm"
                                                    colorScheme="blue"
                                                    variant="ghost"
                                                    aria-label="Edit rate"
                                                />
                                            </Tooltip>
                                            <Tooltip label="Delete Rate">
                                                <IconButton
                                                    icon={<Icon as={MdDelete} />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    aria-label="Delete rate"
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

                {/* Pagination */}
                <Flex px='25px' justify='space-between' align='center' py='20px'>
                    <Text fontSize='sm' color='gray.500'>
                        Showing {rateItems.length} of {rateItems.length} results
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

            {/* New Rate Item Modal */}
            <Modal isOpen={isNewRateOpen} onClose={onNewRateClose} size="6xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader bg="blue.600" color="white" borderRadius="md">
                        <HStack spacing={3}>
                            <Icon as={MdAdd} />
                            <Text>Create New Rate Item</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton color="white" />
                    <ModalBody py="6">
                        <Grid templateColumns="repeat(2, 1fr)" gap="8">
                            {/* Left Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Location</FormLabel>
                                    <Input
                                        size="md"
                                        value={newRateItem.location}
                                        onChange={(e) => handleInputChange('location', e.target.value)}
                                        placeholder="Enter location code"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
                                        }}
                                    />
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Handling</FormLabel>
                                    <Input
                                        size="md"
                                        value={newRateItem.handling}
                                        onChange={(e) => handleInputChange('handling', e.target.value)}
                                        placeholder="Enter handling type"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
                                        }}
                                    />
                                </FormControl>

                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" fontWeight="medium" color="gray.700">Currency</FormLabel>
                                    <Select
                                        size="md"
                                        value={newRateItem.currency}
                                        onChange={(e) => handleInputChange('currency', e.target.value)}
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "blue.500",
                                            boxShadow: "0 0 0 1px blue.500",
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
                        <Button variant="outline" mr={3} onClick={onNewRateClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
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
                <AlertDialogContent borderRadius="lg">
                    <AlertDialogHeader fontSize="lg" fontWeight="bold" color="red.600">
                        Delete Rate Item
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to delete this rate item? This action cannot be undone.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button variant="outline" onClick={onDeleteClose}>
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