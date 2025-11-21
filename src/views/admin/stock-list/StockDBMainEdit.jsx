import React, { useState, useEffect, useCallback } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
    Box,
    Flex,
    Text,
    Button,
    Icon,
    HStack,
    VStack,
    useColorModeValue,
    Input,
    Select,
    Textarea,
    FormControl,
    FormLabel,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    useToast,
    Spinner,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Card,
    IconButton,
    Checkbox,
} from "@chakra-ui/react";
import {
    MdChevronLeft,
    MdSave,
    MdDelete,
} from "react-icons/md";
import { updateStockItemApi, deleteStockItemApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import { getCustomersForSelect, getVesselsForSelect, getDestinationsForSelect, getUsersForSelect } from "../../../api/entitySelects";
import { getVendorsApi } from "../../../api/vendor";
import currenciesAPI from "../../../api/currencies";
import countriesAPI from "../../../api/countries";
import locationsAPI from "../../../api/locations";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

export default function StockDBMainEdit() {
    const history = useHistory();
    const location = useLocation();
    const toast = useToast();
    const { getStockList, updateLoading } = useStock();

    // Get selected items from state
    const stateData = location.state || {};
    const selectedItemsFromState = stateData.selectedItems || [];
    const isBulkEdit = selectedItemsFromState.length > 1;

    const [isLoading, setIsLoading] = useState(false);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [clients, setClients] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [locations, setLocations] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
    const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);

    const textColor = useColorModeValue("gray.700", "white");
    const inputBg = useColorModeValue("gray.100", "gray.800");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");

    // Helper function to convert value to number
    const toNumber = (value) => {
        if (value === null || value === undefined || value === "") return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    // Default empty row template – all fields from main DB table (all editable except IDs)
    const getEmptyRow = () => ({
        id: Date.now() + Math.random(),
        stockId: null,
        // Read-only fields (IDs and auto-generated dates)
        stockItemId: "",
        slCreateDate: "",
        slCreateDateTime: "",
        // Editable fields - all from main DB table
        client: "",
        vessel: "",
        soNumber: "",
        siNumber: "",
        siCombined: "",
        diNumber: "",
        stockStatus: "",
        supplier: "",
        poNumber: "",
        extra2: "",
        origin: "",
        viaHub: "",
        apDestination: "",
        destination: "",
        warehouseId: "",
        shippingDoc: "",
        exportDoc: "",
        remarks: "",
        dateOnStock: "",
        expReadyInStock: "",
        shippedDate: "",
        deliveredDate: "",
        details: "",
        items: "",
        weightKgs: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        volumeNoDim: "",
        volumeCbm: "",
        lwhText: "",
        cwAirfreight: "",
        value: "",
        currency: "",
        clientAccess: false,
        pic: "",
        soStatus: "",
        vesselDest: "",
        vesselEta: "",
        // Internal fields for API payload
        vesselDestination: "",
        itemId: "",
        item: 1,
    });

    // Form state - array of rows
    const [formRows, setFormRows] = useState([getEmptyRow()]);

    // Load form data from stock item
    const loadFormDataFromStock = useCallback((stock, returnData = false) => {
        const normalizeId = (value) => {
            if (value === null || value === undefined || value === "" || value === false) return "";
            return String(value);
        };

        const getFieldValue = (value, fallback = "") => {
            if (value === null || value === undefined || value === false) return fallback;
            return value || fallback;
        };

        const rowData = {
            id: stock.id || Date.now() + Math.random(),
            stockId: stock.id || null,
            // Read-only fields
            stockItemId: getFieldValue(stock.stock_item_id),
            slCreateDate: getFieldValue(stock.sl_create_date) || getFieldValue(stock.sl_create_datetime) || "",
            slCreateDateTime: getFieldValue(stock.sl_create_datetime) || "",
            // Editable fields - all from main DB table
            client: normalizeId(stock.client_id) || normalizeId(stock.client) || "",
            vessel: normalizeId(stock.vessel_id) || normalizeId(stock.vessel) || "",
            soNumber: getFieldValue(stock.so_number_id) || getFieldValue(stock.so_number) || "",
            siNumber: getFieldValue(stock.shipping_instruction_id) || getFieldValue(stock.si_number) || "",
            siCombined: getFieldValue(stock.si_combined) || "",
            diNumber: getFieldValue(stock.delivery_instruction_id) || getFieldValue(stock.di_number) || "",
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            poNumber: getFieldValue(stock.po_text) || getFieldValue(stock.po_number) || "",
            extra2: getFieldValue(stock.extra_2) || getFieldValue(stock.extra) || "",
            origin: normalizeId(stock.origin_id) || normalizeId(stock.origin) || "",
            viaHub: getFieldValue(stock.via_hub, ""),
            apDestination: normalizeId(stock.ap_destination_id) || normalizeId(stock.ap_destination) || "",
            destination: normalizeId(stock.destination_id) || normalizeId(stock.destination) || "",
            warehouseId: getFieldValue(stock.warehouse_id) || "",
            shippingDoc: getFieldValue(stock.shipping_doc) || "",
            exportDoc: getFieldValue(stock.export_doc) || "",
            remarks: getFieldValue(stock.remarks) || "",
            dateOnStock: getFieldValue(stock.date_on_stock) || "",
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            shippedDate: getFieldValue(stock.shipped_date) || "",
            deliveredDate: getFieldValue(stock.delivered_date) || "",
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc) || "",
            items: getFieldValue(stock.items) || getFieldValue(stock.item_id) || "",
            weightKgs: getFieldValue(stock.weight_kg ?? stock.weight_kgs, ""),
            lengthCm: getFieldValue(stock.length_cm, ""),
            widthCm: getFieldValue(stock.width_cm, ""),
            heightCm: getFieldValue(stock.height_cm, ""),
            volumeNoDim: getFieldValue(stock.volume_no_dim ?? stock.volume_dim, ""),
            volumeCbm: getFieldValue(stock.volume_cbm, ""),
            lwhText: getFieldValue(stock.lwh_text) || "",
            cwAirfreight: getFieldValue(stock.cw_freight ?? stock.cw_airfreight, ""),
            value: getFieldValue(stock.value, ""),
            currency: normalizeId(stock.currency_id) || normalizeId(stock.currency) || "",
            clientAccess: Boolean(stock.client_access),
            pic: getFieldValue(stock.pic) || getFieldValue(stock.pic_id) || "", // PIC is a free text field (char), not an ID
            soStatus: getFieldValue(stock.so_status) || "",
            vesselDest: normalizeId(stock.vessel_destination) || normalizeId(stock.destination) || "",
            vesselEta: getFieldValue(stock.vessel_eta) || "",
            // Internal fields
            vesselDestination: normalizeId(stock.vessel_destination) || normalizeId(stock.destination) || "",
            itemId: normalizeId(stock.item_id) || "",
            item: toNumber(stock.item) || 1,
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    }, []);

    // Load selected items into form
    useEffect(() => {
        if (selectedItemsFromState.length > 0) {
            console.log("Loading stock items from state:", selectedItemsFromState);
            const rows = selectedItemsFromState.map((item) => {
                return loadFormDataFromStock(item, true);
            });
            setFormRows(rows.length > 0 ? rows : [getEmptyRow()]);
        } else {
            // If no items, redirect back
            toast({
                title: "Error",
                description: "No items selected for editing",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            history.push("/admin/stock-list/stocks");
        }
    }, [selectedItemsFromState, loadFormDataFromStock, history, toast]);

    // Fetch lookup data
    useEffect(() => {
        const fetchLookupData = async () => {
            try {
                setIsLoadingClients(true);
                const clientsData = await getCustomersForSelect();
                setClients(clientsData || []);
            } catch (error) {
                console.error('Failed to fetch clients:', error);
            } finally {
                setIsLoadingClients(false);
            }

            try {
                setIsLoadingVessels(true);
                const vesselsData = await getVesselsForSelect();
                setVessels(vesselsData || []);
            } catch (error) {
                console.error('Failed to fetch vessels:', error);
            } finally {
                setIsLoadingVessels(false);
            }

            try {
                setIsLoadingVendors(true);
                const vendorsResponse = await getVendorsApi();
                const vendorsData = (vendorsResponse && Array.isArray(vendorsResponse.vendors))
                    ? vendorsResponse.vendors
                    : (Array.isArray(vendorsResponse) ? vendorsResponse : []);
                setVendors(vendorsData || []);
            } catch (error) {
                console.error('Failed to fetch vendors:', error);
            } finally {
                setIsLoadingVendors(false);
            }

            try {
                setIsLoadingDestinations(true);
                const destinationsData = await getDestinationsForSelect();
                setDestinations(destinationsData || []);
            } catch (error) {
                console.error('Failed to fetch destinations:', error);
            } finally {
                setIsLoadingDestinations(false);
            }

            try {
                setIsLoadingLocations(true);
                const locationsResponse = await locationsAPI.getLocations();
                const locationsData = (locationsResponse && Array.isArray(locationsResponse.locations))
                    ? locationsResponse.locations
                    : (Array.isArray(locationsResponse) ? locationsResponse : []);
                setLocations(locationsData || []);
            } catch (error) {
                console.error('Failed to fetch locations:', error);
            } finally {
                setIsLoadingLocations(false);
            }

            // Only fetch users if not already loaded (for PIC field)
            if (users.length === 0) {
                try {
                    setIsLoadingUsers(true);
                    const usersData = await getUsersForSelect();
                    setUsers(usersData || []);
                } catch (error) {
                    console.error('Failed to fetch users:', error);
                } finally {
                    setIsLoadingUsers(false);
                }
            }

            try {
                setIsLoadingCurrencies(true);
                const currenciesResponse = await currenciesAPI.getCurrencies();
                const currenciesData = (currenciesResponse && Array.isArray(currenciesResponse.currencies))
                    ? currenciesResponse.currencies
                    : (Array.isArray(currenciesResponse) ? currenciesResponse : []);
                setCurrencies(currenciesData || []);
            } catch (error) {
                console.error('Failed to fetch currencies:', error);
            } finally {
                setIsLoadingCurrencies(false);
            }

            try {
                setIsLoadingCountries(true);
                const countriesResponse = await countriesAPI.getCountries();
                const countriesData = (countriesResponse && Array.isArray(countriesResponse.countries))
                    ? countriesResponse.countries
                    : (Array.isArray(countriesResponse) ? countriesResponse : []);
                setCountries(countriesData || []);
            } catch (error) {
                console.error('Failed to fetch countries:', error);
            } finally {
                setIsLoadingCountries(false);
            }
        };

        fetchLookupData();
    }, []);

    // Handle input change
    const handleInputChange = (rowIndex, field, value) => {
        setFormRows(prev => {
            const newRows = [...prev];
            newRows[rowIndex] = {
                ...newRows[rowIndex],
                [field]: value
            };
            return newRows;
        });
    };

    // Get payload for API
    const getPayload = (rowData, includeStockId = false) => {
        // Payload matching the exact API structure - only use keys that exist in the UI
        const payload = {
            stock_status: rowData.stockStatus || "",
            client_id: rowData.client ? String(rowData.client) : "",
            supplier_id: rowData.supplier ? String(rowData.supplier) : "",
            vessel_id: rowData.vessel ? String(rowData.vessel) : "",
            po_text: rowData.poNumber || "",
            pic: rowData.pic || "", // PIC is a char field (free text), not an ID
            item_id: rowData.itemId ? String(rowData.itemId) : "",
            currency_id: rowData.currency ? String(rowData.currency) : "",
            origin: rowData.origin ? String(rowData.origin) : "",
            ap_destination: rowData.apDestination ? String(rowData.apDestination) : "",
            via_hub: rowData.viaHub || "",
            client_access: Boolean(rowData.clientAccess),
            remarks: rowData.remarks || "",
            weight_kg: toNumber(rowData.weightKgs) || 0,
            width_cm: toNumber(rowData.widthCm) || 0,
            length_cm: toNumber(rowData.lengthCm) || 0,
            height_cm: toNumber(rowData.heightCm) || 0,
            volume_dim: toNumber(rowData.volumeNoDim) || 0,
            volume_cbm: toNumber(rowData.volumeCbm) || 0,
            lwh_text: rowData.lwhText || "",
            cw_freight: toNumber(rowData.cwAirfreight) || 0,
            value: toNumber(rowData.value) || 0,
            sl_create_datetime: rowData.slCreateDateTime || new Date().toISOString().replace('T', ' ').slice(0, 19),
            // shipment_type: not in UI, omit from payload
            extra: rowData.extra2 || "",
            destination: rowData.destination ? String(rowData.destination) : "",
            warehouse_id: rowData.warehouseId ? String(rowData.warehouseId) : "",
            shipping_doc: rowData.shippingDoc || "",
            export_doc: rowData.exportDoc || "",
            date_on_stock: rowData.dateOnStock || "",
            exp_ready_in_stock: rowData.expReadyInStock || "",
            shipped_date: rowData.shippedDate || null,
            delivered_date: rowData.deliveredDate || "",
            details: rowData.details || "",
            item: toNumber(rowData.items || rowData.item) || 1,
            vessel_destination: rowData.vesselDestination || rowData.vesselDest ? String(rowData.vesselDestination || rowData.vesselDest) : "",
            vessel_eta: rowData.vesselEta || "",
            // so_number_id: commented out in user's payload, not in UI
            // shipping_instruction_id: commented out in user's payload, not in UI
            // delivery_instruction_id: commented out in user's payload, not in UI
        };

        // Only include stock_item_id if it exists (for updates)
        if (rowData.stockItemId) {
            payload.stock_item_id = rowData.stockItemId;
        }

        // Include stock_id for update operations
        if (includeStockId && rowData.stockId) {
            payload.stock_id = rowData.stockId;
            payload.id = rowData.stockId;
        }

        return payload;
    };

    // Handle save
    const handleSave = async () => {
        if (formRows.length === 0) {
            toast({
                title: "Error",
                description: "No items to save",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setIsLoading(true);
        try {
            const savePromises = formRows.map(async (row) => {
                if (!row.stockId) {
                    throw new Error("Stock ID is required for update");
                }
                const payload = getPayload(row, true);
                return await updateStockItemApi(row.stockId, payload);
            });

            const results = await Promise.all(savePromises);
            const successCount = results.filter(r => r && r.result && r.result.status === 'success').length;

            if (successCount > 0) {
                toast({
                    title: 'Success',
                    description: `${successCount} stock item(s) updated successfully`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                // Refresh stock list and go back
                await getStockList();
                history.push("/admin/stock-list/stocks");
            } else {
                throw new Error("Failed to update stock items");
            }
        } catch (error) {
            console.error("Failed to save stock items:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to update stock items",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle delete row
    const handleDeleteRow = (rowIndex) => {
        if (formRows.length <= 1) {
            toast({
                title: "Warning",
                description: "Cannot delete the last row",
                status: "warning",
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        setFormRows(prev => prev.filter((_, index) => index !== rowIndex));

        // Adjust current index if needed
        if (currentItemIndex >= formRows.length - 1) {
            setCurrentItemIndex(Math.max(0, formRows.length - 2));
        }
    };

    if (isLoading && formRows.length === 0) {
        return (
            <Box p="8" textAlign="center">
                <Spinner size="xl" color="blue.500" />
                <Text mt="4" color={textColor}>Loading...</Text>
            </Box>
        );
    }

    const currentRow = formRows[currentItemIndex] || formRows[0];

    return (
        <Box p={{ base: "4", md: "6" }} mt={{ base: "80px", md: "80px", xl: "70px" }}>
            {/* Header */}
            <Flex justify="space-between" align="center" mb="6">
                <HStack spacing="4">
                    <IconButton
                        icon={<Icon as={MdChevronLeft} />}
                        size="sm"
                        variant="ghost"
                        aria-label="Back"
                        onClick={() => history.push("/admin/stock-list/main-db")}
                    />
                    <Text fontSize="xl" fontWeight="600" color={textColor}>
                        {isBulkEdit
                            ? `Edit Stock Items (${currentItemIndex + 1} of ${formRows.length})`
                            : "Edit Stock Item"}
                    </Text>
                </HStack>
                <HStack spacing="3">
                    <Button
                        leftIcon={<Icon as={MdSave} />}
                        bg="green.500"
                        color="white"
                        size="sm"
                        px="6"
                        py="3"
                        borderRadius="md"
                        _hover={{ bg: "green.600" }}
                        onClick={handleSave}
                        isLoading={updateLoading || isLoading}
                        loadingText="Saving..."
                    >
                        {isBulkEdit ? `Update All (${formRows.length} items)` : "Update Stock Item"}
                    </Button>
                </HStack>
            </Flex>

            {/* Bulk Edit Navigation */}
            {isBulkEdit && formRows.length > 1 && (
                <Flex
                    bg={cardBg}
                    px={{ base: "4", md: "6" }}
                    py="2"
                    justify="space-between"
                    align="center"
                    mb="4"
                    border="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                >
                    <HStack spacing="2">
                        <Button
                            size="xs"
                            onClick={() => {
                                if (currentItemIndex > 0) {
                                    setCurrentItemIndex(currentItemIndex - 1);
                                }
                            }}
                            isDisabled={currentItemIndex === 0}
                        >
                            Previous
                        </Button>
                        <Text fontSize="sm" color={textColor}>
                            Item {currentItemIndex + 1} of {formRows.length}
                        </Text>
                        <Button
                            size="xs"
                            onClick={() => {
                                if (currentItemIndex < formRows.length - 1) {
                                    setCurrentItemIndex(currentItemIndex + 1);
                                }
                            }}
                            isDisabled={currentItemIndex === formRows.length - 1}
                        >
                            Next
                        </Button>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                        Changes will apply to all {formRows.length} selected items
                    </Text>
                </Flex>
            )}

            {/* Form Table with All Fields */}
            <Box bg={cardBg} p={{ base: "4", md: "6" }} borderRadius="md" border="1px" borderColor={borderColor} overflowX="auto">
                <Text mb="4" fontSize="sm" color="gray.500">
                    All fields are editable except IDs (StockItemID, SLCreateDate, SLCreateDate Timestamp)
                </Text>

                <Card w="100%" p="0" overflow="visible">
                    <Table variant="striped" size="sm" colorScheme="gray" minW="6000px">
                        <Thead>
                            <Tr>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="80px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">StockItemID</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SL Create Date</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SO Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SI Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SI Combined</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DI Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Stock Status</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PO Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Extra 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Origin</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Via HUB</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">AP Destination</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Destination</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Warehouse ID</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipping Doc</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Export Doc</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Remarks</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Date on stock</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Exp ready in stock</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipped Date</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Delivered Date</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Details</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Items</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Weight KG</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Length CM</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Width CM</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Height CM</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume no dim</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume cbm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">LWH Text</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">CW Airfreight</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Value</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Currency</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client Access</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PIC</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SO Status</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel Dest</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel ETA</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SL Create Date Timestamp</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {formRows.map((row, rowIndex) => (
                                <Tr key={row.id}>
                                    {/* Read-only fields */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.stockItemId || ""}
                                            isReadOnly
                                            size="sm"
                                            bg={useColorModeValue("gray.100", "gray.700")}
                                            color={inputText}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.slCreateDate || ""}
                                            isReadOnly
                                            size="sm"
                                            bg={useColorModeValue("gray.100", "gray.700")}
                                            color={inputText}
                                        />
                                    </Td>
                                    {/* Editable fields */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.client}
                                            onChange={(value) => handleInputChange(rowIndex, "client", value)}
                                            options={clients}
                                            placeholder="Select Client"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Client ${option.id}`}
                                            isLoading={isLoadingClients}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.vessel}
                                            onChange={(value) => handleInputChange(rowIndex, "vessel", value)}
                                            options={vessels}
                                            placeholder="Select Vessel"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Vessel ${option.id}`}
                                            isLoading={isLoadingVessels}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.soNumber || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "soNumber", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.siNumber || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "siNumber", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.siCombined || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "siCombined", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.diNumber || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "diNumber", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Select
                                            value={row.stockStatus}
                                            onChange={(e) => handleInputChange(rowIndex, "stockStatus", e.target.value)}
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        >
                                            <option value="">Select</option>
                                            <option value="pending">Pending</option>
                                            <option value="in_stock">In Stock</option>
                                            <option value="on_shipping">On Shipping Instr</option>
                                            <option value="on_delivery">On Delivery Instr</option>
                                            <option value="in_transit">In Transit</option>
                                            <option value="arrived">Arrived Dest</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="delivered">Delivered</option>
                                            <option value="irregular">Irregularities</option>
                                            <option value="cancelled">Cancelled</option>
                                        </Select>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.supplier}
                                            onChange={(value) => handleInputChange(rowIndex, "supplier", value)}
                                            options={vendors}
                                            placeholder="Select Supplier"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Supplier ${option.id}`}
                                            isLoading={isLoadingVendors}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.poNumber || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "poNumber", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.extra2 || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "extra2", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.origin}
                                            onChange={(value) => handleInputChange(rowIndex, "origin", value)}
                                            options={[...locations, ...destinations]}
                                            placeholder="Select Origin"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || option.code || `Origin ${option.id}`}
                                            isLoading={isLoadingLocations || isLoadingDestinations}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.viaHub || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.apDestination}
                                            onChange={(value) => handleInputChange(rowIndex, "apDestination", value)}
                                            options={[...locations, ...destinations]}
                                            placeholder="Select AP Destination"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || option.code || `AP Dest ${option.id}`}
                                            isLoading={isLoadingLocations || isLoadingDestinations}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.destination}
                                            onChange={(value) => handleInputChange(rowIndex, "destination", value)}
                                            options={[...locations, ...destinations]}
                                            placeholder="Select Destination"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || option.code || `Dest ${option.id}`}
                                            isLoading={isLoadingLocations || isLoadingDestinations}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.warehouseId}
                                            onChange={(value) => handleInputChange(rowIndex, "warehouseId", value)}
                                            options={locations}
                                            placeholder="Select Warehouse"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || option.code || `Warehouse ${option.id}`}
                                            isLoading={isLoadingLocations}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.shippingDoc || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "shippingDoc", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.exportDoc || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "exportDoc", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Textarea
                                            value={row.remarks || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "remarks", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            rows={2}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            type="date"
                                            value={row.dateOnStock || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "dateOnStock", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            type="date"
                                            value={row.expReadyInStock || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "expReadyInStock", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            type="date"
                                            value={row.shippedDate || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "shippedDate", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            type="date"
                                            value={row.deliveredDate || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "deliveredDate", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Textarea
                                            value={row.details || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "details", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            rows={2}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.items || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "items", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.weightKgs}
                                            onChange={(value) => handleInputChange(rowIndex, "weightKgs", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.lengthCm}
                                            onChange={(value) => handleInputChange(rowIndex, "lengthCm", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.widthCm}
                                            onChange={(value) => handleInputChange(rowIndex, "widthCm", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.heightCm}
                                            onChange={(value) => handleInputChange(rowIndex, "heightCm", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.volumeNoDim}
                                            onChange={(value) => handleInputChange(rowIndex, "volumeNoDim", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.volumeCbm}
                                            onChange={(value) => handleInputChange(rowIndex, "volumeCbm", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.lwhText || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "lwhText", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.cwAirfreight}
                                            onChange={(value) => handleInputChange(rowIndex, "cwAirfreight", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.value}
                                            onChange={(value) => handleInputChange(rowIndex, "value", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.currency}
                                            onChange={(value) => handleInputChange(rowIndex, "currency", value)}
                                            options={currencies}
                                            placeholder="Select Currency"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => {
                                                const code = option.name || option.code || option.symbol || "";
                                                const fullName = option.full_name || option.description || "";
                                                return [code, fullName].filter(Boolean).join(" - ") || `Currency ${option.id}`;
                                            }}
                                            isLoading={isLoadingCurrencies}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Checkbox
                                            isChecked={row.clientAccess}
                                            onChange={(e) => handleInputChange(rowIndex, "clientAccess", e.target.checked)}
                                            size="sm"
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.pic || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "pic", e.target.value)}
                                            placeholder="Enter PIC"
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.soStatus || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "soStatus", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.vesselDest || row.vesselDestination}
                                            onChange={(value) => {
                                                handleInputChange(rowIndex, "vesselDest", value);
                                                handleInputChange(rowIndex, "vesselDestination", value);
                                            }}
                                            options={[...locations, ...destinations]}
                                            placeholder="Select Vessel Dest"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || option.code || `Vessel Dest ${option.id}`}
                                            isLoading={isLoadingLocations || isLoadingDestinations}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            type="date"
                                            value={row.vesselEta || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "vesselEta", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.slCreateDateTime || ""}
                                            isReadOnly
                                            size="sm"
                                            bg={useColorModeValue("gray.100", "gray.700")}
                                            color={inputText}
                                        />
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                </Card>
            </Box>
        </Box>
    );
}

