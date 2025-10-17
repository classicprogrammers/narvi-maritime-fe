import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    Badge,
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
    FormControl,
    FormLabel,
    Select,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Grid,
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
    useToast,
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverBody,
    List,
    ListItem,
} from "@chakra-ui/react";
import {
    MdAdd,
    MdSettings,
    MdDelete,
    MdEdit,
    MdKeyboardArrowDown,
} from "react-icons/md";
import quotationsAPI from "../../../api/quotations";
import { getCustomersApi } from "../../../api/customer";
import { useHistory } from "react-router-dom";
import vesselsAPI from "../../../api/vessels";
import api from "../../../api/axios";
import uomAPI from "../../../api/uom";
import currenciesAPI from "../../../api/currencies";
import destinationsAPI from "../../../api/destinations";

const SearchableSelect = ({
    value,
    onChange,
    options,
    placeholder,
    displayKey = "name",
    valueKey = "id",
    formatOption = (option) => `${option[valueKey]} - ${option[displayKey]}`,
    isRequired = false,
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [filteredOptions, setFilteredOptions] = useState(options);

    useEffect(() => {
        if (searchValue) {
            const filtered = options.filter(option =>
                formatOption(option).toLowerCase().includes(searchValue.toLowerCase())
            );
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options);
        }
    }, [searchValue, options, formatOption]);

    const selectedOption = options.find(option => option[valueKey] === value);

    const handleSelect = (option) => {
        onChange(option[valueKey]);
        setSearchValue("");
        setIsOpen(false);
    };

    return (
        <Popover minW="100%" isOpen={isOpen} onClose={() => setIsOpen(false)} placement="bottom-start" >
            <PopoverTrigger>
                <Button
                    w="100%"
                    minW="100%"
                    justifyContent="space-between"
                    variant="outline"
                    size="sm"
                    bg="white"
                    borderColor="gray.300"
                    _hover={{ borderColor: "gray.400" }}
                    _focus={{ borderColor: "#1c4a95", boxShadow: "0 0 0 1px #1c4a95", bg: "#f0f4ff" }}
                    onClick={() => setIsOpen(!isOpen)}
                    borderRadius="md"
                    fontWeight="normal"
                    fontSize="sm"
                    h="32px"
                >
                    {selectedOption ? formatOption(selectedOption) : placeholder}
                    <Icon as={MdKeyboardArrowDown} />
                </Button>
            </PopoverTrigger>
            <PopoverContent w="100%" maxH="200px" overflowY="auto" borderRadius="md" minW="100%">
                <PopoverBody p={0}>
                    <Input
                        placeholder="Search..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        border="none"
                        borderRadius="0"
                        borderBottom="1px"
                        borderColor="gray.200"
                        _focus={{ borderColor: "#1c4a95" }}
                        px={3}
                        py={2}
                        fontSize="sm"
                    />
                    <List spacing={0}>
                        {filteredOptions.map((option) => (
                            <ListItem
                                key={option[valueKey]}
                                px={3}
                                py={2}
                                cursor="pointer"
                                _hover={{ bg: "gray.100" }}
                                onClick={() => handleSelect(option)}
                                borderBottom="1px"
                                borderColor="gray.100"
                                fontSize="sm"
                            >
                                {formatOption(option)}
                            </ListItem>
                        ))}
                        {filteredOptions.length === 0 && (
                            <ListItem px={3} py={2} color="gray.500" fontSize="sm">
                                No options found
                            </ListItem>
                        )}
                    </List>
                </PopoverBody>
            </PopoverContent>
        </Popover>
    );
};

export default function Quotations() {
    const history = useHistory();
    const [quotations, setQuotations] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState(null);
    const [originalQuotationData, setOriginalQuotationData] = useState(null);

    // Master data for quotation lines
    const [rateItems, setRateItems] = useState([]);
    const [agents, setAgents] = useState([]);
    const [uomList, setUomList] = useState([]);
    const [currenciesList, setCurrenciesList] = useState([]);
    const [destinationsList, setDestinationsList] = useState([]);
    // List filters
    const [clientFilter, setClientFilter] = useState("");
    const [vendorFilter, setVendorFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [currencyFilter, setCurrencyFilter] = useState("");
    const [idFilter, setIdFilter] = useState("");

    // Modal states
    const { isOpen: isNewQuotationOpen, onOpen: onNewQuotationOpen, onClose: onNewQuotationClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
    const [deleteQuotationId, setDeleteQuotationId] = useState(null);

    const toast = useToast();
    const handleEditClick = (id) => {
        const selected = quotations.find((q) => q.id === id);
        history.push({ pathname: `/admin/quotations/edit/${id}`, state: { quotation: selected || null } });
    };

    // Function to get only changed fields between two objects
    const getChangedFields = (original, current) => {
        const changed = {};

        // Compare main quotation fields
        const mainFields = [
            'partner_id', 'vessel_id', 'est_to_usd', 'est_profit_usd', 'eta', 'eta_date',
            'deadline_date', 'deadline_info', 'estimated_to', 'estimated_profit', 'oc_number',
            'client_remark', 'internal_remark', 'delivery_note', 'done', 'destination_id',
            'usd_roe', 'general_mu', 'caf'
        ];

        mainFields.forEach(field => {
            if (original[field] !== current[field]) {
                changed[field] = current[field];
            }
        });

        // Compare quotation lines
        if (JSON.stringify(original.quotation_lines) !== JSON.stringify(current.quotation_lines)) {
            changed.quotation_lines = current.quotation_lines;
        }

        return changed;
    };

    // Form states for new quotation - matching API payload
    const [newQuotation, setNewQuotation] = useState({
        partner_id: "",
        vessel_id: "",
        est_to_usd: "",
        est_profit_usd: "",
        eta: "",
        eta_date: "",
        deadline_date: "",
        deadline_info: "",
        estimated_to: "",
        estimated_profit: "",
        oc_number: "",
        client_remark: "",
        internal_remark: "",
        delivery_note: "",
        done: "active",
        destination_id: "",
        usd_roe: "",
        general_mu: "",
        caf: "",
        quotation_lines: []
    });

    const textColor = useColorModeValue("gray.700", "white");

    // Fetch quotations
    const fetchQuotations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await quotationsAPI.getQuotations();
            if (response.quotations && Array.isArray(response.quotations)) {
                setQuotations(response.quotations);
            } else {
                setQuotations([]);
            }
        } catch (error) {
            console.error("Failed to fetch quotations:", error);
            toast({
                title: "Error",
                description: `Failed to fetch quotations: ${error.message}`,
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            setQuotations([]);
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    // Fetch customers
    const fetchCustomers = useCallback(async () => {
        try {
            const response = await getCustomersApi();
            if (response.customers && Array.isArray(response.customers)) {
                setCustomers(response.customers);
            } else {
                setCustomers([]);
            }
        } catch (error) {
            console.error("Failed to fetch customers:", error);
            setCustomers([]);
            // Don't show toast for customers as it's not critical
        }
    }, []);

    // Fetch vessels
    const fetchVessels = useCallback(async () => {
        try {
            const response = await vesselsAPI.getVessels();
            if (response.vessels && Array.isArray(response.vessels)) {
                setVessels(response.vessels);
            } else {
                setVessels([]);
            }
        } catch (error) {
            console.error("Failed to fetch vessels:", error);
            setVessels([]);
        }
    }, []);

    // Fetch rate items (products)
    const fetchRateItems = useCallback(async () => {
        try {
            const response = await api.get("/api/products");
            const result = response.data;
            if (result.status === "success" && result.products) {
                setRateItems(result.products);
            } else {
                setRateItems([]);
            }
        } catch (error) {
            console.error("Failed to fetch rate items:", error);
            setRateItems([]);
        }
    }, []);

    // Fetch agents
    const fetchAgents = useCallback(async () => {
        try {
            const response = await api.get("/api/vendor/list");
            const result = response.data;
            if (result.vendors && Array.isArray(result.vendors)) {
                setAgents(result.vendors);
            } else {
                setAgents([]);
            }
        } catch (error) {
            console.error("Failed to fetch agents:", error);
            setAgents([]);
        }
    }, []);

    // Fetch master data
    const fetchMasterData = useCallback(async () => {
        try {
            // Fetch UOM
            const uomResponse = await uomAPI.getUOM();
            if (uomResponse.uom && Array.isArray(uomResponse.uom)) {
                setUomList(uomResponse.uom);
            } else {
                setUomList([]);
            }

            // Fetch Currencies
            const currenciesResponse = await currenciesAPI.getCurrencies();
            if (currenciesResponse.currencies && Array.isArray(currenciesResponse.currencies)) {
                setCurrenciesList(currenciesResponse.currencies);
            } else {
                setCurrenciesList([]);
            }

            // Fetch destination_ids
            const destinationsResponse = await destinationsAPI.getDestinations();
            if (destinationsResponse.destinations && Array.isArray(destinationsResponse.destinations)) {
                setDestinationsList(destinationsResponse.destinations);
            } else {
                setDestinationsList([]);
            }

        } catch (error) {
            console.error("Failed to fetch master data:", error);
            setUomList([]);
            setCurrenciesList([]);
            setDestinationsList([]);
        }
    }, []);

    // Fetch data on component mount
    useEffect(() => {
        fetchQuotations();
        fetchCustomers();
        fetchVessels();
        fetchRateItems();
        fetchAgents();
        fetchMasterData();
    }, [fetchQuotations, fetchCustomers, fetchVessels, fetchRateItems, fetchAgents, fetchMasterData]);

    // Handler functions
    const handleNewQuotation = () => {
        setEditingQuotation(null);
        resetForm();
        onNewQuotationOpen();
    };

    const handleEditQuotation = (quotation) => {
        setEditingQuotation(quotation);

        // Process quotation lines to ensure all fields are properly mapped
        // Note: API returns quotation_line_ids instead of quotation_lines
        const quotationLines = quotation.quotation_line_ids || quotation.quotation_lines || [];
        const processedQuotationLines = Array.isArray(quotationLines)
            ? quotationLines.map(line => ({
                name: line.name || "",
                agent_id: line.agent_id || "",
                agent_rate: line.agent_rate || "",
                item_name: line.item_name || "",
                rate: line.rate || "",
                rate_remark: line.rate_remark || "",
                free_text: line.free_text || "",
                remark: line.remark || "",
                pre_text: line.pre_text || "",
                currency_override: line.currency_override || "",
                quantity: line.quantity || 1,
                buy_rate_calculation: line.buy_rate_calculation || "",
                uom: line.uom || "",
                cost_actual: line.cost_actual || "",
                fixed: line.fixed || false,
                sale_currency: line.sale_currency || "",
                cost_sum: line.cost_sum || "",
                roe: line.roe || "",
                cost_usd: line.cost_usd || "",
                mu_percent: line.mu_percent || "",
                mu_amount: line.mu_amount || "",
                qt_rate: line.qt_rate || "",
                amended_rate: line.amended_rate || "",
                rate_to_client: line.rate_to_client || "",
                group_free_text: line.group_free_text || "",
                status: line.status || "current"
            }))
            : [];


        const quotationFormData = {
            partner_id: quotation.partner_id || "",
            vessel_id: quotation.vessel_id || "",
            est_to_usd: quotation.est_to_usd || "",
            est_profit_usd: quotation.est_profit_usd || "",
            eta: quotation.eta || "",
            eta_date: quotation.eta_date || "",
            deadline_date: quotation.deadline_date || "",
            deadline_info: quotation.deadline_info || "",
            estimated_to: quotation.estimated_to || "",
            estimated_profit: quotation.estimated_profit || "",
            oc_number: quotation.oc_number || "",
            client_remark: quotation.client_remark || "",
            internal_remark: quotation.internal_remark || "",
            delivery_note: quotation.delivery_note || "",
            done: quotation.done || "active",
            destination_id: quotation.destination_id || "",
            usd_roe: quotation.usd_roe || "",
            general_mu: quotation.general_mu || "",
            caf: quotation.caf || "",
            quotation_lines: processedQuotationLines
        };

        setNewQuotation(quotationFormData);
        setOriginalQuotationData(quotationFormData); // Store original data for comparison
        onNewQuotationOpen();
    };

    const resetForm = () => {
        setNewQuotation({
            partner_id: "",
            vessel_id: "",
            est_to_usd: "",
            est_profit_usd: "",
            eta: "",
            eta_date: "",
            deadline_date: "",
            deadline_info: "",
            estimated_to: "",
            estimated_profit: "",
            oc_number: "",
            client_remark: "",
            internal_remark: "",
            delivery_note: "",
            done: "active",
            destination_id: "",
            usd_roe: "",
            general_mu: "",
            caf: "",
            quotation_lines: []
        });
        setOriginalQuotationData(null); // Clear original data
    };

    const handleSaveQuotation = async () => {
        try {
            setIsLoading(true);

            let response;
            if (editingQuotation) {
                // Update existing quotation - only send changed fields
                const changedFields = getChangedFields(originalQuotationData, newQuotation);

                // Ensure quotation_lines only contains vendor_id (not vendor_name)
                if (changedFields.quotation_lines) {
                    changedFields.quotation_lines = changedFields.quotation_lines.map(line => ({
                        ...line,
                        // Ensure only vendor_id is sent, remove any vendor_name if it exists
                        vendor_id: line.vendor_id || null,
                        // Remove vendor_name if it exists
                        vendor_name: undefined
                    }));
                }

                // Only send changed fields + quotation_id
                const updateData = {
                    quotation_id: editingQuotation.id,
                    ...changedFields
                };

                response = await quotationsAPI.updateQuotation(updateData);
            } else {
                // Create new quotation - send all data but ensure only vendor_id
                const quotationData = {
                    ...newQuotation,
                    quotation_lines: (newQuotation.quotation_lines || []).map(line => ({
                        ...line,
                        // Ensure only vendor_id is sent, remove any vendor_name if it exists
                        vendor_id: line.vendor_id || null,
                        // Remove vendor_name if it exists
                        vendor_name: undefined
                    }))
                };

                response = await quotationsAPI.createQuotation(quotationData);
            }

            // Extract message from API response
            let message = editingQuotation ? "Quotation updated successfully" : "Quotation created successfully";
            let status = "success";

            if (response && response.result) {
                if (response.result && response.result.message) {
                    message = response.result.message;
                    status = response.result.status;
                } else if (response.result.message) {
                    message = response.result.message;
                    status = response.result.status;
                }
            }

            // Check if the response indicates an error
            if (status === "error") {
                // Show error message but keep modal open and don't reset form
                toast({
                    title: "Error",
                    description: message,
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                // Don't close modal or reset form on error
                return;
            }

            // Success case - close modal and reset form
            toast({
                title: "Success",
                description: message,
                status: "success",
                duration: 3000,
                isClosable: true,
            });

            onNewQuotationClose();
            resetForm();
            fetchQuotations();
        } catch (error) {
            // Extract error message from API response
            let errorMessage = `Failed to ${editingQuotation ? 'update' : 'create'} quotation`;

            if (error.response && error.response.data) {
                if (error.response.data.result && error.response.data.result.message) {
                    errorMessage = error.response.data.result.message;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Show error message but keep modal open and don't reset form
            toast({
                title: "Error",
                description: errorMessage,
                status: "error",
                duration: 5000,
                isClosable: true,
            });
            // Don't close modal or reset form on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteQuotation = (quotation) => {
        setDeleteQuotationId(quotation.id);
        onDeleteOpen();
    };

    const confirmDelete = async () => {
        try {
            setIsLoading(true);
            const response = await quotationsAPI.deleteQuotation({
                quotation_id: deleteQuotationId
            });

            // Extract success message from API response
            let successMessage = "Quotation deleted successfully";
            let status = "success";

            if (response && response.result) {
                if (response.result && response.result.message) {
                    successMessage = response.result.message;
                    status = response.result.status;
                } else if (response.result.message) {
                    successMessage = response.result.message;
                    status = response.result.status;
                }
            }

            toast({
                title: status,
                description: successMessage,
                status: status,
                duration: 3000,
                isClosable: true,
            });

            onDeleteClose();
            setDeleteQuotationId(null);
            fetchQuotations();
        } catch (error) {
            // Extract error message from API response
            let errorMessage = "Failed to delete quotation";
            let status = "error";

            if (error.response && error.response.data) {
                if (error.response.data.result && error.response.data.result.message) {
                    errorMessage = error.response.data.result.message;
                    status = error.response.data.result.status;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                    status = error.response.data.result.status;
                }
            } else if (error.message) {
                errorMessage = error.message;
                status = "error";
            }

            toast({
                title: status,
                description: errorMessage,
                status: status,
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setNewQuotation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Add new quotation line
    const addQuotationLine = () => {
        const newLine = {
            name: "",
            vendor_id: "",
            vendor_rate: "",
            item_name: "",
            rate: "",
            rate_remark: "",
            free_text: "",
            remark: "",
            pre_text: "",
            pre_text_auto: false,
            currency_override: "",
            quantity: 1,
            buy_rate_calculation: "",
            uom: "",
            cost_actual: "",
            fixed: false,
            sale_currency: "",
            cost_sum: "",
            roe: "",
            cost_usd: "",
            mu_percent: "",
            mu_amount: "",
            qt_rate: "",
            amended_rate: "",
            rate_to_client: "",
            group_free_text: "",
            status: "current",
            // New worksheet-like fields
            client_specific: false,
            location_id: ""
        };

        setNewQuotation(prev => ({
            ...prev,
            quotation_lines: [...prev.quotation_lines, newLine]
        }));
    };

    // Remove quotation line
    const removeQuotationLine = (index) => {
        setNewQuotation(prev => ({
            ...prev,
            quotation_lines: prev.quotation_lines.filter((_, i) => i !== index)
        }));
    };

    // Update quotation line
    const updateQuotationLine = (index, field, value) => {
        setNewQuotation(prev => ({
            ...prev,
            quotation_lines: prev.quotation_lines.map((line, i) =>
                i === index ? { ...line, [field]: value } : line
            )
        }));
    };

    // Handle rate item selection and auto-fill
    const handleRateItemSelect = (index, rateItem) => {
        if (rateItem) {
            updateQuotationLine(index, 'name', rateItem.name || '');
            updateQuotationLine(index, 'rate', rateItem.rate || '');
            updateQuotationLine(index, 'item_name', rateItem.id || '');
            updateQuotationLine(index, 'uom', rateItem.uom_id || '');
            updateQuotationLine(index, 'currency_override', rateItem.currency_rate_id || '');
            updateQuotationLine(index, 'rate_remark', rateItem.rate_text || '');
            updateQuotationLine(index, 'remark', rateItem.remarks || '');

            // Auto-fill vendor if available in rate item
            if (rateItem.seller_ids && rateItem.seller_ids.length > 0) {
                updateQuotationLine(index, 'vendor_id', rateItem.seller_ids[0]);
            }

        }
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
            <VStack spacing={6} align="stretch">
                {/* Header Section */}
                <Flex justify="space-between" align="center" px="25px">
                    <HStack spacing={4}>
                        <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                            Quotations
                        </Text>
                    </HStack>
                    <Button leftIcon={<Icon as={MdAdd} />} bg="#1c4a95" color="white" size="md" px="6" py="3" borderRadius="md" _hover={{ bg: "#173f7c" }} onClick={() => history.push('/admin/quotations/edit')}>
                        New Quotation
                    </Button>
                </Flex>

                {/* Quotations List */}
                <Box bg="white" borderRadius="lg" boxShadow="sm" mx="25px" mb="6">
                    <Box p="6">
                        {/* Filters Row */}
                        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mb={4} alignItems="end">
                            <Box minW="260px">
                                <Text fontSize="sm" mb={1}>Filter by Client</Text>
                                <SearchableSelect
                                    value={clientFilter}
                                    onChange={(value) => setClientFilter(value)}
                                    options={customers}
                                    placeholder="Select client"
                                    displayKey="name"
                                    valueKey="id"
                                    formatOption={(option) => option.name}
                                />
                            </Box>
                            <Box minW="260px">
                                <Text fontSize="sm" mb={1}>Filter by Quotation ID</Text>
                                <NumberInput size="sm" value={idFilter || ''} onChange={(v) => setIdFilter(v)} min={0}>
                                    <NumberInputField placeholder="ID" />
                                    <NumberInputStepper><NumberIncrementStepper /><NumberDecrementStepper /></NumberInputStepper>
                                </NumberInput>
                            </Box>
                            <Box minW="260px">
                                <Text fontSize="sm" mb={1}>Filter by Vendor</Text>
                                <SearchableSelect
                                    value={vendorFilter}
                                    onChange={(value) => setVendorFilter(value)}
                                    options={agents}
                                    placeholder="Select vendor"
                                    displayKey="name"
                                    valueKey="id"
                                    formatOption={(option) => option.name}
                                />
                            </Box>
                            <Box minW="260px">
                                <Text fontSize="sm" mb={1}>Filter by Location</Text>
                                <SearchableSelect
                                    value={locationFilter}
                                    onChange={(value) => setLocationFilter(value)}
                                    options={destinationsList}
                                    placeholder="Select location"
                                    displayKey="name"
                                    valueKey="id"
                                    formatOption={(option) => option.name}
                                />
                            </Box>
                            <Box minW="260px">
                                <Text fontSize="sm" mb={1}>Filter by Currency</Text>
                                <SearchableSelect
                                    value={currencyFilter}
                                    onChange={(value) => setCurrencyFilter(value)}
                                    options={currenciesList}
                                    placeholder="Select currency"
                                    displayKey="name"
                                    valueKey="id"
                                    formatOption={(option) => option.name}
                                />
                            </Box>
                            <Box gridColumn={{ base: '1 / -1', md: '1 / -1' }} display="flex" justifyContent="flex-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => { setClientFilter(""); setVendorFilter(""); setLocationFilter(""); setCurrencyFilter(""); setIdFilter(""); }}
                                    isDisabled={!clientFilter && !vendorFilter && !locationFilter && !currencyFilter && !idFilter}
                                >
                                    Clear filters
                                </Button>
                            </Box>
                        </Grid>
                        <Box overflowX="auto" borderRadius="lg" border="1px" borderColor="gray.200">
                            <Table variant="simple" size="sm" minW="1200px" w="100%">
                                <Thead bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
                                    <Tr>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Client Specific</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Quotation ID</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Client</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Location</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Vendor</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Rate Item Name</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px" isNumeric>Quantity</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px" isNumeric>Buy Rate</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px" isNumeric>Cost actual</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Fixed Sale</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Currency</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px" isNumeric>Rate to client</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Group</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Free text</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px">Status</Th>
                                        <Th py="16px" px="12px" fontSize="11px" fontWeight="700" color="white" textTransform="uppercase" letterSpacing="0.5px" minW="100px" w="100px">
                                            Actions
                                        </Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {quotations.length > 0 ? (
                                        quotations
                                            .filter((q) => {
                                                const matchClient = clientFilter ? q.partner_id === clientFilter : true;
                                                const matchId = idFilter ? String(q.id) === String(idFilter) : true;
                                                const lines = q.quotation_line_ids || q.quotation_lines || [];
                                                const matchVendor = vendorFilter ? lines.some((l) => l.vendor_id === vendorFilter) : true;
                                                const matchLocation = locationFilter ? lines.some((l) => (l.location_id || l.location) === locationFilter) : true;
                                                const matchCurrency = currencyFilter ? lines.some((l) => (l.sale_currency || l.currency_override) === currencyFilter) : true;
                                                return matchClient && matchId && matchVendor && matchLocation && matchCurrency;
                                            })
                                            .map((quotation, index) => (
                                                <Tr
                                                    key={quotation.id}
                                                    bg={index % 2 === 0 ? "white" : "gray.50"}
                                                    _hover={{
                                                        bg: "linear-gradient(135deg, #f0f4ff 0%, #e6f3ff 100%)",
                                                        transform: "translateY(-1px)",
                                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                                        transition: "all 0.2s ease"
                                                    }}
                                                    borderBottom="1px"
                                                    borderColor="gray.200"
                                                    transition="all 0.2s ease"
                                                >
                                                    {(() => {
                                                        const line = (quotation.quotation_line_ids || quotation.quotation_lines || [])[0] || {};
                                                        const clientName = customers.find(c => c.id === quotation.partner_id)?.name || '-';
                                                        return (
                                                            <>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{line.client_specific ? 'Yes' : 'No'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{quotation.id}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{clientName}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{destinationsList.find(d => d.id === (line.location_id || line.location))?.name || '-'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{agents.find(a => a.id === line.vendor_id)?.name || line.vendor_id || '-'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{rateItems.find(r => r.id === line.item_name)?.name || line.name || '-'}</Text></Td>
                                                                <Td py="14px" px="12px" isNumeric><Text fontSize="sm">{line.quantity ?? '-'}</Text></Td>
                                                                <Td py="14px" px="12px" isNumeric><Text fontSize="sm">{line.buy_rate_calculation ?? '-'}</Text></Td>
                                                                <Td py="14px" px="12px" isNumeric><Text fontSize="sm">{line.cost_actual ?? '-'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{line.fixed ? 'Yes' : 'No'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{currenciesList.find(c => c.id === (line.sale_currency || line.currency_override))?.name || '-'}</Text></Td>
                                                                <Td py="14px" px="12px" isNumeric><Text fontSize="sm">{line.rate_to_client ?? '-'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{line.group_free_text || '-'}</Text></Td>
                                                                <Td py="14px" px="12px"><Text fontSize="sm">{line.free_text || '-'}</Text></Td>
                                                                <Td py="14px" px="12px"><Badge colorScheme={line.status === 'current' ? 'green' : 'gray'} variant="subtle" fontSize="xs" px="8px" py="2px" borderRadius="full">{line.status || '-'}</Badge></Td>
                                                            </>
                                                        )
                                                    })()}
                                                    <Td py="14px" px="12px" minW="100px" w="100px">
                                                        <HStack spacing={1} justify="center">
                                                            <IconButton icon={<Icon as={MdEdit} />} size="sm" colorScheme="blue" variant="ghost" aria-label="Edit quotation" onClick={() => handleEditClick(quotation.id)} _hover={{ bg: "blue.100", transform: "scale(1.1)" }} transition="all 0.2s ease" />
                                                            <Button size="xs" variant="outline" onClick={() => history.push({ pathname: `/admin/quotations/detail/${quotation.id}`, state: { quotation } })}>View</Button>
                                                            <IconButton
                                                                icon={<Icon as={MdDelete} />}
                                                                size="sm"
                                                                colorScheme="red"
                                                                variant="ghost"
                                                                aria-label="Delete quotation"
                                                                onClick={() => handleDeleteQuotation(quotation)}
                                                                _hover={{ bg: "red.100", transform: "scale(1.1)" }}
                                                                transition="all 0.2s ease"
                                                            />
                                                        </HStack>
                                                    </Td>
                                                </Tr>
                                            ))
                                    ) : (
                                        <Tr>
                                            <Td colSpan={18} py="60px" textAlign="center">
                                                <VStack spacing={4}>
                                                    <Box
                                                        p="6"
                                                        borderRadius="full"
                                                        bg="linear-gradient(135deg, #f0f4ff 0%, #e6f3ff 100%)"
                                                        boxShadow="0 4px 12px rgba(0,0,0,0.1)"
                                                    >
                                                        <Icon as={MdSettings} color="blue.400" boxSize={16} />
                                                    </Box>
                                                    <VStack spacing={2}>
                                                        <Text color="gray.600" fontSize="lg" fontWeight="600">
                                                            No quotations available
                                                        </Text>
                                                        <Text color="gray.500" fontSize="sm" textAlign="center" maxW="300px">
                                                            Get started by creating your first quotation. Click the "New Quotation" button above.
                                                        </Text>
                                                    </VStack>
                                                </VStack>
                                            </Td>
                                        </Tr>
                                    )}
                                </Tbody>
                            </Table>
                        </Box>
                    </Box>
                </Box>
            </VStack>

            {/* New Quotation Modal */}
            <Modal isOpen={isNewQuotationOpen} onClose={onNewQuotationClose} size="6xl" maxW="90vw">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader bg="#1c4a95" color="white">
                        {editingQuotation ? "Edit Quotation" : "Create New Quotation"}
                    </ModalHeader>
                    <ModalCloseButton color="white" />
                    <ModalBody py="6">
                        <Grid templateColumns="repeat(2, 1fr)" gap="6">
                            {/* Left Column */}
                            <VStack spacing="4" align="stretch">
                                <FormControl isRequired>
                                    <FormLabel fontSize="sm" color={textColor}>Client</FormLabel>
                                    <SearchableSelect
                                        value={newQuotation.partner_id}
                                        onChange={(value) => handleInputChange('partner_id', value)}
                                        options={customers}
                                        placeholder="Select client"
                                        displayKey="name"
                                        valueKey="id"
                                        formatOption={(option) => option.name}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Vessel</FormLabel>
                                    <SearchableSelect
                                        value={newQuotation.vessel_id}
                                        onChange={(value) => handleInputChange('vessel_id', value)}
                                        options={vessels}
                                        placeholder="Select vessel"
                                        displayKey="name"
                                        valueKey="id"
                                        formatOption={(option) => option.name}
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>ETA</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newQuotation.eta}
                                        onChange={(e) => handleInputChange('eta', e.target.value)}
                                        placeholder="Enter ETA"
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
                                    <FormLabel fontSize="sm" color={textColor}>ETA Date</FormLabel>
                                    <Input
                                        size="sm"
                                        type="date"
                                        value={newQuotation.eta_date}
                                        onChange={(e) => handleInputChange('eta_date', e.target.value)}
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
                                    <FormLabel fontSize="sm" color={textColor}>Deadline Date</FormLabel>
                                    <Input
                                        size="sm"
                                        type="date"
                                        value={newQuotation.deadline_date}
                                        onChange={(e) => handleInputChange('deadline_date', e.target.value)}
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
                                    <FormLabel fontSize="sm" color={textColor}>Deadline Info</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newQuotation.deadline_info}
                                        onChange={(e) => handleInputChange('deadline_info', e.target.value)}
                                        placeholder="Enter deadline info"
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
                                    <FormLabel fontSize="sm" color={textColor}>OC Number</FormLabel>
                                    <Input
                                        size="sm"
                                        value={newQuotation.oc_number}
                                        onChange={(e) => handleInputChange('oc_number', e.target.value)}
                                        placeholder="Enter OC number"
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
                                    <FormLabel fontSize="sm" color={textColor}>CAF</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.caf}
                                        onChange={(value) => handleInputChange('caf', value)}
                                        step={0.1}
                                        precision={2}
                                    >
                                        <NumberInputField
                                            placeholder="Enter CAF"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Status</FormLabel>
                                    <Select
                                        size="sm"
                                        value={newQuotation.done}
                                        onChange={(e) => handleInputChange('done', e.target.value)}
                                        border="1px"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        _focus={{
                                            borderColor: "#1c4a95",
                                            boxShadow: "0 0 0 1px #1c4a95",
                                            bg: "#f0f4ff"
                                        }}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </Select>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Client Remark</FormLabel>
                                    <Textarea
                                        size="sm"
                                        value={newQuotation.client_remark}
                                        onChange={(e) => handleInputChange('client_remark', e.target.value)}
                                        placeholder="Enter client remark"
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
                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Estimated TO (USD)</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.est_to_usd}
                                        onChange={(value) => handleInputChange('est_to_usd', value)}
                                    >
                                        <NumberInputField
                                            placeholder="Enter estimated TO"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Estimated Profit (USD)</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.est_profit_usd}
                                        onChange={(value) => handleInputChange('est_profit_usd', value)}
                                    >
                                        <NumberInputField
                                            placeholder="Enter estimated profit"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Estimated TO</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.estimated_to}
                                        onChange={(value) => handleInputChange('estimated_to', value)}
                                    >
                                        <NumberInputField
                                            placeholder="Enter estimated TO"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Estimated Profit</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.estimated_profit}
                                        onChange={(value) => handleInputChange('estimated_profit', value)}
                                    >
                                        <NumberInputField
                                            placeholder="Enter estimated profit"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Destination</FormLabel>
                                    <SearchableSelect
                                        value={newQuotation.destination}
                                        onChange={(value) => handleInputChange('destination', value)}
                                        options={destinationsList}
                                        valueKey="id"
                                        labelKey="name"
                                        placeholder="Select destination"
                                    />
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>USD ROE</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.usd_roe}
                                        onChange={(value) => handleInputChange('usd_roe', value)}
                                        step={0.1}
                                        precision={2}
                                    >
                                        <NumberInputField
                                            placeholder="Enter USD ROE"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>General MU</FormLabel>
                                    <NumberInput
                                        size="sm"
                                        value={newQuotation.general_mu}
                                        onChange={(value) => handleInputChange('general_mu', value)}
                                        step={0.1}
                                        precision={2}
                                    >
                                        <NumberInputField
                                            placeholder="Enter general MU"
                                            border="1px"
                                            borderColor="gray.300"
                                            borderRadius="md"
                                            _focus={{
                                                borderColor: "#1c4a95",
                                                boxShadow: "0 0 0 1px #1c4a95",
                                                bg: "#f0f4ff"
                                            }}
                                        />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                </FormControl>

                                <FormControl>
                                    <FormLabel fontSize="sm" color={textColor}>Internal Remark</FormLabel>
                                    <Textarea
                                        size="sm"
                                        value={newQuotation.internal_remark}
                                        onChange={(e) => handleInputChange('internal_remark', e.target.value)}
                                        placeholder="Enter internal remark"
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
                                    <FormLabel fontSize="sm" color={textColor}>Delivery Note</FormLabel>
                                    <Textarea
                                        size="sm"
                                        value={newQuotation.delivery_note}
                                        onChange={(e) => handleInputChange('delivery_note', e.target.value)}
                                        placeholder="Enter delivery note"
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
                        </Grid>

                        {/* Quotation Lines Section */}
                        <Box mt="6" borderTop="1px" borderColor="gray.200" pt="6">
                            <Flex justify="space-between" align="center" mb="4">
                                <Text fontSize="lg" fontWeight="bold" color={textColor}>
                                    Quotation Lines
                                </Text>
                                <Button
                                    leftIcon={<Icon as={MdAdd} />}
                                    size="sm"
                                    bg="#1c4a95"
                                    color="white"
                                    _hover={{ bg: "#173f7c" }}
                                    onClick={addQuotationLine}
                                >
                                    Add Line
                                </Button>
                            </Flex>

                            {newQuotation.quotation_lines.length > 0 ? (
                                <VStack spacing="4" align="stretch">
                                    {newQuotation.quotation_lines.map((line, index) => (
                                        <Box
                                            key={index}
                                            p="4"
                                            border="1px"
                                            borderColor="gray.200"
                                            borderRadius="md"
                                            bg="gray.50"
                                        >
                                            <Flex justify="space-between" align="center" mb="3">
                                                <Text fontSize="md" fontWeight="semibold" color={textColor}>
                                                    Line {index + 1}
                                                </Text>
                                                <IconButton
                                                    icon={<Icon as={MdDelete} />}
                                                    size="sm"
                                                    colorScheme="red"
                                                    variant="ghost"
                                                    onClick={() => removeQuotationLine(index)}
                                                />
                                            </Flex>

                                            <Grid templateColumns="repeat(5, 1fr)" gap="4">
                                                {/* Client Specific */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Client Specific</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={line.client_specific ? 'true' : 'false'}
                                                        onChange={(e) => updateQuotationLine(index, 'client_specific', e.target.value === 'true')}
                                                    >
                                                        <option value={'false'}>No</option>
                                                        <option value={'true'}>Yes</option>
                                                    </Select>
                                                </FormControl>
                                                {/* Location ID */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Location ID</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        value={line.location_id}
                                                        onChange={(e) => updateQuotationLine(index, 'location_id', e.target.value)}
                                                        placeholder="Enter location id"
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
                                                {/* Rate Item Selection */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Rate Item</FormLabel>
                                                    <SearchableSelect
                                                        value={line.item_name}
                                                        onChange={(value) => {
                                                            const selectedItem = rateItems.find(item => item.id === value);
                                                            handleRateItemSelect(index, selectedItem);
                                                        }}
                                                        options={rateItems}
                                                        placeholder="Select rate item"
                                                        displayKey="name"
                                                        valueKey="id"
                                                        formatOption={(option) => `${option.name} - $${option.rate || 0}`}
                                                    />
                                                </FormControl>

                                                {/* Name */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Name</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        value={line.name}
                                                        onChange={(e) => updateQuotationLine(index, 'name', e.target.value)}
                                                        placeholder="Enter name"
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

                                                {/* Vendor */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Vendor</FormLabel>
                                                    <SearchableSelect
                                                        value={line.vendor_id}
                                                        onChange={(value) => updateQuotationLine(index, 'vendor_id', value)}
                                                        options={agents}
                                                        placeholder="Select vendor"
                                                        displayKey="name"
                                                        valueKey="id"
                                                        formatOption={(option) => option.name}
                                                    />
                                                </FormControl>

                                                {/* Vendor Rate */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Vendor Rate</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.vendor_rate}
                                                        onChange={(value) => updateQuotationLine(index, 'vendor_rate', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter vendor rate"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* Rate */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Rate</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.rate}
                                                        onChange={(value) => updateQuotationLine(index, 'rate', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter rate"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* Quantity */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Quantity</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.quantity}
                                                        onChange={(value) => updateQuotationLine(index, 'quantity', value)}
                                                        min={1}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter quantity"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* UOM */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>UOM</FormLabel>
                                                    <SearchableSelect
                                                        value={line.uom}
                                                        onChange={(value) => updateQuotationLine(index, 'uom', value)}
                                                        options={uomList}
                                                        placeholder="Select UOM"
                                                        displayKey="name"
                                                        valueKey="id"
                                                        formatOption={(option) => option.name}
                                                    />
                                                </FormControl>

                                                {/* Currency Override */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Currency</FormLabel>
                                                    <SearchableSelect
                                                        value={line.currency_override}
                                                        onChange={(value) => updateQuotationLine(index, 'currency_override', value)}
                                                        options={currenciesList}
                                                        placeholder="Select currency"
                                                        displayKey="name"
                                                        valueKey="id"
                                                        formatOption={(option) => option.name}
                                                    />
                                                </FormControl>

                                                {/* Sale Currency */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Sale Currency</FormLabel>
                                                    <SearchableSelect
                                                        value={line.sale_currency}
                                                        onChange={(value) => updateQuotationLine(index, 'sale_currency', value)}
                                                        options={currenciesList}
                                                        placeholder="Select sale currency"
                                                        displayKey="name"
                                                        valueKey="id"
                                                        formatOption={(option) => option.name}
                                                    />
                                                </FormControl>


                                                {/* Fixed */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Fixed</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={line.fixed}
                                                        onChange={(e) => updateQuotationLine(index, 'fixed', e.target.value === 'true')}
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "#1c4a95",
                                                            boxShadow: "0 0 0 1px #1c4a95",
                                                            bg: "#f0f4ff"
                                                        }}
                                                    >
                                                        <option value={false}>No</option>
                                                        <option value={true}>Yes</option>
                                                    </Select>
                                                </FormControl>

                                                {/* Status */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Status</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={line.status}
                                                        onChange={(e) => updateQuotationLine(index, 'status', e.target.value)}
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "#1c4a95",
                                                            boxShadow: "0 0 0 1px #1c4a95",
                                                            bg: "#f0f4ff"
                                                        }}
                                                    >
                                                        <option value="current">Current</option>
                                                    </Select>
                                                </FormControl>
                                            </Grid>

                                            {/* Additional Fields Row */}
                                            <Grid templateColumns="repeat(4, 1fr)" gap="4" mt="4">
                                                {/* Buy Rate Calculation */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Buy Rate Calculation</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.buy_rate_calculation}
                                                        onChange={(value) => updateQuotationLine(index, 'buy_rate_calculation', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter buy rate calculation"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* Cost Actual */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Cost Actual</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.cost_actual}
                                                        onChange={(value) => updateQuotationLine(index, 'cost_actual', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter cost actual"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* Cost Sum */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Cost Sum</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.cost_sum}
                                                        onChange={(value) => updateQuotationLine(index, 'cost_sum', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter cost sum"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* ROE */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>ROE</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.roe}
                                                        onChange={(value) => updateQuotationLine(index, 'roe', value)}
                                                        step={0.01}
                                                        precision={2}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter ROE"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>
                                            </Grid>

                                            {/* Additional Fields Row 2 */}
                                            <Grid templateColumns="repeat(4, 1fr)" gap="4" mt="4">
                                                {/* Cost USD */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Cost USD</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.cost_usd}
                                                        onChange={(value) => updateQuotationLine(index, 'cost_usd', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter cost USD"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* MU Percent */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>MU Percent</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.mu_percent}
                                                        onChange={(value) => updateQuotationLine(index, 'mu_percent', value)}
                                                        step={0.01}
                                                        precision={2}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter MU percent"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* MU Amount */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>MU Amount</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.mu_amount}
                                                        onChange={(value) => updateQuotationLine(index, 'mu_amount', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter MU amount"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* QT Rate */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>QT Rate</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.qt_rate}
                                                        onChange={(value) => updateQuotationLine(index, 'qt_rate', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter QT rate"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>
                                            </Grid>

                                            {/* Additional Fields Row 3 */}
                                            <Grid templateColumns="repeat(4, 1fr)" gap="4" mt="4">
                                                {/* Amended Rate */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Amended Rate</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.amended_rate}
                                                        onChange={(value) => updateQuotationLine(index, 'amended_rate', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter amended rate"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* Rate to Client */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Rate to Client</FormLabel>
                                                    <NumberInput
                                                        size="sm"
                                                        value={line.rate_to_client}
                                                        onChange={(value) => updateQuotationLine(index, 'rate_to_client', value)}
                                                    >
                                                        <NumberInputField
                                                            placeholder="Enter rate to client"
                                                            border="1px"
                                                            borderColor="gray.300"
                                                            borderRadius="md"
                                                            _focus={{
                                                                borderColor: "#1c4a95",
                                                                boxShadow: "0 0 0 1px #1c4a95",
                                                                bg: "#f0f4ff"
                                                            }}
                                                        />
                                                    </NumberInput>
                                                </FormControl>

                                                {/* Group Free Text */}
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Group Free Text</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        value={line.group_free_text}
                                                        onChange={(e) => updateQuotationLine(index, 'group_free_text', e.target.value)}
                                                        placeholder="Enter group free text"
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
                                            </Grid>

                                            {/* Pre-text controls row */}
                                            <Grid templateColumns="repeat(2, 1fr)" gap="4" mt="4">
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Pre-text Mode</FormLabel>
                                                    <Select
                                                        size="sm"
                                                        value={line.pre_text_auto ? 'auto' : 'custom'}
                                                        onChange={(e) => {
                                                            const auto = e.target.value === 'auto';
                                                            updateQuotationLine(index, 'pre_text_auto', auto);
                                                            if (auto) updateQuotationLine(index, 'pre_text', line.name || '');
                                                        }}
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "#1c4a95",
                                                            boxShadow: "0 0 0 1px #1c4a95",
                                                            bg: "#f0f4ff"
                                                        }}
                                                    >
                                                        <option value={'auto'}>Use Rate Item Name</option>
                                                        <option value={'custom'}>Custom</option>
                                                    </Select>
                                                </FormControl>
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Pre-text</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        value={line.pre_text}
                                                        onChange={(e) => updateQuotationLine(index, 'pre_text', e.target.value)}
                                                        placeholder="Enter pre text"
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
                                            </Grid>

                                            {/* Text Fields Row */}
                                            <Grid templateColumns="repeat(2, 1fr)" gap="4" mt="4">
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Rate Remark</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        value={line.rate_remark}
                                                        onChange={(e) => updateQuotationLine(index, 'rate_remark', e.target.value)}
                                                        placeholder="Enter rate remark"
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
                                                    <FormLabel fontSize="sm" color={textColor}>Free Text</FormLabel>
                                                    <Input
                                                        size="sm"
                                                        value={line.free_text}
                                                        onChange={(e) => updateQuotationLine(index, 'free_text', e.target.value)}
                                                        placeholder="Enter free text"
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
                                            </Grid>

                                            {/* Textarea Fields */}
                                            <Grid templateColumns="repeat(2, 1fr)" gap="4" mt="4">
                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Remark</FormLabel>
                                                    <Textarea
                                                        size="sm"
                                                        value={line.remark}
                                                        onChange={(e) => updateQuotationLine(index, 'remark', e.target.value)}
                                                        placeholder="Enter remark"
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "#1c4a95",
                                                            boxShadow: "0 0 0 1px #1c4a95",
                                                            bg: "#f0f4ff"
                                                        }}
                                                        rows={2}
                                                    />
                                                </FormControl>

                                                <FormControl>
                                                    <FormLabel fontSize="sm" color={textColor}>Pre Text</FormLabel>
                                                    <Textarea
                                                        size="sm"
                                                        value={line.pre_text}
                                                        onChange={(e) => updateQuotationLine(index, 'pre_text', e.target.value)}
                                                        placeholder="Enter pre text"
                                                        border="1px"
                                                        borderColor="gray.300"
                                                        borderRadius="md"
                                                        _focus={{
                                                            borderColor: "#1c4a95",
                                                            boxShadow: "0 0 0 1px #1c4a95",
                                                            bg: "#f0f4ff"
                                                        }}
                                                        rows={2}
                                                    />
                                                </FormControl>
                                            </Grid>
                                        </Box>
                                    ))}
                                </VStack>
                            ) : (
                                <Box
                                    p="8"
                                    textAlign="center"
                                    border="2px dashed"
                                    borderColor="gray.300"
                                    borderRadius="md"
                                    bg="gray.50"
                                >
                                    <VStack spacing={2}>
                                        <Icon as={MdAdd} boxSize={8} color="gray.400" />
                                        <Text color="gray.500" fontSize="sm">
                                            No quotation lines added yet. Click "Add Line" to get started.
                                        </Text>
                                    </VStack>
                                </Box>
                            )}
                        </Box>
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
                            isLoading={isLoading}
                        >
                            {editingQuotation ? "Update Quotation" : "Create Quotation"}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose}>
                <AlertDialogOverlay />
                <AlertDialogContent>
                    <AlertDialogHeader fontSize="lg" fontWeight="bold">
                        Delete Quotation
                    </AlertDialogHeader>
                    <AlertDialogBody>
                        Are you sure you want to delete this quotation? This action cannot be undone.
                    </AlertDialogBody>
                    <AlertDialogFooter>
                        <Button onClick={onDeleteClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="red"
                            onClick={confirmDelete}
                            ml={3}
                            isLoading={isLoading}
                        >
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Box>
    );
}