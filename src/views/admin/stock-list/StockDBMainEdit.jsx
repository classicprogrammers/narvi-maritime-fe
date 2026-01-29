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
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
} from "@chakra-ui/react";
import {
    MdChevronLeft,
    MdSave,
    MdDelete,
    MdAttachFile,
    MdClose as MdRemove,
    MdVisibility,
    MdFullscreen,
    MdArrowDownward,
    MdMoreVert,
    MdAdd,
    MdDownload,
} from "react-icons/md";
import { updateStockItemApi, deleteStockItemApi, getStockItemAttachmentsApi, downloadStockItemAttachmentApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import { getCustomersForSelect, getVesselsForSelect, getDestinationsForSelect } from "../../../api/entitySelects";
import api from "../../../api/axios";
import currenciesAPI from "../../../api/currencies";
import countriesAPI from "../../../api/countries";
import locationsAPI from "../../../api/locations";
import { getShippingOrders } from "../../../api/shippingOrders";
import picAPI from "../../../api/pic";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

export default function StockDBMainEdit() {
    const history = useHistory();
    const location = useLocation();
    const toast = useToast();
    const { getStockList, updateLoading } = useStock();

    // Get selected items and filter state from location.state
    const stateData = location.state || {};
    const selectedItemsFromState = stateData.selectedItems || [];
    const isBulkEdit = selectedItemsFromState.length > 1;
    const filterState = stateData.filterState || null; // Store filter state to restore on navigation back
    const sourcePage = stateData.sourcePage || null; // Store source page to highlight correct tab

    // Store source page in sessionStorage for persistence
    useEffect(() => {
        if (sourcePage) {
            sessionStorage.setItem('stockEditSourcePage', sourcePage);
        }
    }, [sourcePage]);

    const [isLoading, setIsLoading] = useState(false);
    const [lastAutoSaveTime, setLastAutoSaveTime] = useState(null);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const autoSaveTimeoutRef = React.useRef(null);
    const [isLoadingAttachment, setIsLoadingAttachment] = useState(false);

    // Modal state for LWH Text field
    const { isOpen: isLWHModalOpen, onOpen: onLWHModalOpen, onClose: onLWHModalClose } = useDisclosure();
    const [lwhModalRowIndex, setLwhModalRowIndex] = useState(null);
    const [lwhModalValue, setLwhModalValue] = useState("");

    // Dimensions modal state
    const { isOpen: isDimensionsModalOpen, onOpen: onDimensionsModalOpen, onClose: onDimensionsModalClose } = useDisclosure();
    const [dimensionsModalRowIndex, setDimensionsModalRowIndex] = useState(null);
    const [dimensionsList, setDimensionsList] = useState([]);

    // Confirmation dialog for back button
    const { isOpen: isBackConfirmOpen, onOpen: onBackConfirmOpen, onClose: onBackConfirmClose } = useDisclosure();
    const cancelRef = React.useRef();
    const [clients, setClients] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [locations, setLocations] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingDestinations, setIsLoadingDestinations] = useState(false);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [shippingOrders, setShippingOrders] = useState([]);
    const [pics, setPics] = useState([]);
    const [isLoadingPICs, setIsLoadingPICs] = useState(false);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);
    const [isLoadingShippingOrders, setIsLoadingShippingOrders] = useState(false);

    const textColor = useColorModeValue("gray.700", "white");
    const inputBg = useColorModeValue("gray.100", "gray.800");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");
    const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");

    // Cell props for consistent styling
    const cellProps = {
        borderRight: "1px",
        borderColor: tableBorderColor,
        py: "12px",
        px: "12px",
        whiteSpace: "normal",
        minW: "fit-content",
    };

    // Helper function to convert value to number
    const toNumber = (value) => {
        if (value === null || value === undefined || value === "") return 0;
        const num = Number(value);
        return isNaN(num) ? 0 : num;
    };

    // Auto-size helper for text inputs (Chakra `Input` supports `htmlSize`)
    // Keeps widths readable without blowing up the table.
    const getAutoHtmlSize = (value, placeholder = "", opts = {}) => {
        const {
            min = 12,      // minimum characters
            max = 80,      // maximum characters
            padding = 2,   // extra characters for breathing room
        } = opts || {};

        const valueLen = String(value ?? "").length;
        const placeholderLen = String(placeholder ?? "").length;
        const desired = Math.max(valueLen, placeholderLen) + padding;
        return Math.min(max, Math.max(min, desired));
    };

    // Auto-size helper for textarea columns (based on longest line)
    const getAutoCols = (value, placeholder = "", opts = {}) => {
        const {
            min = 24,     // minimum columns
            max = 90,     // maximum columns
            padding = 2,  // extra columns for breathing room
        } = opts || {};

        const text = String(value ?? "");
        const maxLineLen = text
            .split(/\r?\n/)
            .reduce((acc, line) => Math.max(acc, line.length), 0);
        const placeholderLen = String(placeholder ?? "").length;
        const desired = Math.max(maxLineLen, placeholderLen) + padding;
        return Math.min(max, Math.max(min, desired));
    };

    // Helper functions to add/remove prefixes for SO NUMBER, SI NUMBER, SI COMBINED, and DI NUMBER
    // These functions preserve internal spaces (e.g., "00021 1.1" remains "00021 1.1")
    const addSOPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        // .trim() removes leading/trailing spaces, but preserves internal spaces
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("SO-")) return str;
        const withoutPrefix = str.startsWith("SO-") ? str.substring(3) : str;
        // Preserve internal spaces when adding prefix (e.g., "00021 1.1" -> "SO-00021 1.1")
        return `SO-${withoutPrefix}`;
    };

    const removeSOPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str.startsWith("SO-")) return str.substring(3);
        return str;
    };

    const addSIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        // Preserve spaces in the middle of the value (e.g., "00021 1.1")
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("SI-")) return str;
        const withoutPrefix = str.startsWith("SI-") ? str.substring(3) : str;
        // Preserve internal spaces when adding prefix
        return `SI-${withoutPrefix}`;
    };

    const removeSIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str.startsWith("SI-")) return str.substring(3);
        return str;
    };

    const addSICombinedPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        // Preserve spaces in the middle of the value (e.g., "00021 1.1")
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("SIC-")) return str;
        let withoutPrefix = str;
        if (str.startsWith("SIC-")) {
            withoutPrefix = str.substring(4);
        } else if (str.startsWith("SI-C-")) {
            withoutPrefix = str.substring(5);
        } else if (str.startsWith("SI-")) {
            withoutPrefix = str.substring(3);
        }
        // Preserve internal spaces when adding prefix
        return `SIC-${withoutPrefix}`;
    };

    const removeSICombinedPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str.startsWith("SIC-")) return str.substring(4);
        if (str.startsWith("SI-C-")) return str.substring(5);
        if (str.startsWith("SI-")) return str.substring(3);
        return str;
    };

    const addDIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        // Preserve spaces in the middle of the value (e.g., "00021 1.1")
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("DI-")) return str;
        const withoutPrefix = str.startsWith("DI-") ? str.substring(3) : str;
        // Preserve internal spaces when adding prefix
        return `DI-${withoutPrefix}`;
    };

    const removeDIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str.startsWith("DI-")) return str.substring(3);
        return str;
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
        soNumber: "", // STRING type (preserves spaces, e.g., "00021 1.1")
        siNumber: "", // STRING type (preserves spaces, e.g., "00021 1.1")
        siCombined: "", // STRING type (preserves spaces, e.g., "00021 1.1")
        diNumber: "", // STRING type (preserves spaces, e.g., "00021 1.1")
        stockStatus: "",
        supplier: "",
        poNumber: "",
        origin_text: "",
        viaHub1: "",
        viaHub2: "",
        apDestination: "",
        destination: "",
        warehouseId: "",
        shippingDoc: "",
        exportDoc: "",
        exportDoc2: "",
        remarks: "",
        internalRemark: "",
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
        dgUn: "",
        clientAccess: false,
        pic: null, // PIC ID
        attachments: [], // Array of { filename, mimetype, datas } for new uploads
        attachmentsToDelete: [], // Array of attachment IDs to delete (for updates)
        existingAttachments: [], // Array of existing attachments from API { id, filename, mimetype }
        dimensions: [], // Array of dimension objects { id, length_cm, width_cm, height_cm, volume_cbm, cw_air_freight }
        blank: "",
        // Internal fields for API payload
        vesselDestination: "",
        itemId: "",
        item: "",
    });

    // Form state - array of rows
    const [formRows, setFormRows] = useState([getEmptyRow()]);
    // Store original data for comparison
    const [originalRows, setOriginalRows] = useState([]);

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
            // Use getFieldValue to preserve spaces in text fields (e.g., "00021 1.1")
            soNumber: addSOPrefix(getFieldValue(stock.stock_so_number) || getFieldValue(stock.so_number) || ""),
            siNumber: addSIPrefix(getFieldValue(stock.stock_shipping_instruction) || getFieldValue(stock.si_number) || ""),
            siCombined: addSICombinedPrefix(stock.si_combined === false ? "" : (getFieldValue(stock.si_combined) || "")),
            diNumber: addDIPrefix(getFieldValue(stock.stock_delivery_instruction) || getFieldValue(stock.di_number) || ""),
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            poNumber: getFieldValue(stock.po_text) || getFieldValue(stock.po_number) || "",
            origin_text: (() => {
                // If origin_text is already text (from previous saves), use it directly
                if (stock.origin_text && typeof stock.origin_text === 'string' && !/^\d+$/.test(stock.origin_text)) {
                    return stock.origin_text;
                }
                // Otherwise, keep as ID - will be converted to name in useEffect
                return normalizeId(stock.origin_id) || "";
            })(),
            viaHub1: getFieldValue(stock.via_hub, ""),
            viaHub2: getFieldValue(stock.via_hub2, ""),
            apDestination: getFieldValue(stock.ap_destination_new) || getFieldValue(stock.ap_destination) || "",
            destination: getFieldValue(stock.destination_new) || getFieldValue(stock.destination) || "",
            warehouseId: getFieldValue(stock.warehouse_new) || getFieldValue(stock.warehouse_id) || "",
            shippingDoc: getFieldValue(stock.shipping_doc) || "",
            exportDoc: getFieldValue(stock.export_doc) || "",
            exportDoc2: getFieldValue(stock.export_doc_2) || "",
            remarks: getFieldValue(stock.remarks) || "",
            internalRemark: getFieldValue(stock.internal_remark) || "",
            dateOnStock: getFieldValue(stock.date_on_stock) || "",
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            shippedDate: getFieldValue(stock.shipped_date) || "",
            deliveredDate: getFieldValue(stock.delivered_date) || "",
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc) || "",
            items: String(getFieldValue(stock.item) || getFieldValue(stock.items) || getFieldValue(stock.item_id) || getFieldValue(stock.stock_items_quantity) || ""),
            item: stock.item || stock.items || stock.item_id || stock.stock_items_quantity || "",
            weightKgs: String(getFieldValue(stock.weight_kg ?? stock.weight_kgs, "") || ""),
            lengthCm: String(getFieldValue(stock.length_cm, "") || ""),
            widthCm: String(getFieldValue(stock.width_cm, "") || ""),
            heightCm: String(getFieldValue(stock.height_cm, "") || ""),
            volumeNoDim: String(getFieldValue(stock.volume_no_dim ?? stock.volume_dim, "") || ""),
            volumeCbm: String(getFieldValue(stock.volume_cbm, "") || ""),
            lwhText: getFieldValue(stock.lwh_text) || "",
            cwAirfreight: String(getFieldValue(stock.cw_air_freight_new ?? stock.cw_freight ?? stock.cw_airfreight, "") || ""),
            value: String(getFieldValue(stock.value, "") || ""),
            currency: normalizeId(stock.currency_id) || normalizeId(stock.currency) || "",
            dgUn: getFieldValue(stock.dg_un) || "",
            clientAccess: Boolean(stock.client_access),
            pic: normalizeId(stock.pic_new) || normalizeId(stock.pic_id) || normalizeId(stock.pic) || null, // PIC ID
            blank: getFieldValue(stock.blank, ""),
            // Internal fields
            vesselDestination: getFieldValue(stock.vessel_destination) || getFieldValue(stock.vessel_destination_text) || "",
            itemId: normalizeId(stock.item_id) || "",
            attachments: [], // New uploads will be added here
            attachmentsToDelete: [], // IDs of attachments to delete
            existingAttachments: Array.isArray(stock.attachments) ? stock.attachments : [], // Existing attachments from API
            dimensions: Array.isArray(stock.dimensions) && stock.dimensions.length > 0
                ? stock.dimensions.map(dim => ({
                    id: dim.id || null,
                    calculation_method: dim.calculation_method || "lwh",
                    length_cm: dim.length_cm !== null && dim.length_cm !== undefined ? dim.length_cm : "",
                    width_cm: dim.width_cm !== null && dim.width_cm !== undefined ? dim.width_cm : "",
                    height_cm: dim.height_cm !== null && dim.height_cm !== undefined ? dim.height_cm : "",
                    volume_dim: dim.volume_dim !== null && dim.volume_dim !== undefined ? dim.volume_dim : "",
                    volume_cbm: dim.volume_cbm !== null && dim.volume_cbm !== undefined ? dim.volume_cbm : "",
                    cw_air_freight: dim.cw_air_freight !== null && dim.cw_air_freight !== undefined ? dim.cw_air_freight : "",
                }))
                : [],
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    }, []);

    // Load selected items into form
    useEffect(() => {
        if (selectedItemsFromState.length > 0) {
            // Try to restore from localStorage first
            const storageKey = `stockEditFormData_${selectedItemsFromState[0]?.id || 'new'}`;
            const savedData = sessionStorage.getItem(storageKey);

            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    if (parsed.formRows && parsed.formRows.length > 0) {
                        setFormRows(parsed.formRows);
                        setCurrentItemIndex(parsed.currentItemIndex || 0);
                        // Store original data for comparison
                        setOriginalRows(parsed.formRows.map(row => ({ ...row })));
                        toast({
                            title: "Restored",
                            description: "Your previous edits have been restored from local storage",
                            status: "info",
                            duration: 2000,
                            isClosable: true,
                        });
                        return;
                    }
                } catch (error) {
                    console.error("Failed to restore from localStorage:", error);
                }
            }

            // If no saved data, load from API
            const rows = selectedItemsFromState.map((item) => {
                return loadFormDataFromStock(item, true);
            });
            setFormRows(rows.length > 0 ? rows : [getEmptyRow()]);
            // Store original data for comparison - deep copy and normalize types
            setOriginalRows(rows.length > 0 ? rows.map(row => {
                const normalized = { ...row };
                // Normalize numeric fields to strings to match NumberInput output
                if (normalized.items !== undefined) normalized.items = String(normalized.items || "");
                if (normalized.weightKgs !== undefined) normalized.weightKgs = String(normalized.weightKgs || "");
                if (normalized.lengthCm !== undefined) normalized.lengthCm = String(normalized.lengthCm || "");
                if (normalized.widthCm !== undefined) normalized.widthCm = String(normalized.widthCm || "");
                if (normalized.heightCm !== undefined) normalized.heightCm = String(normalized.heightCm || "");
                if (normalized.volumeNoDim !== undefined) normalized.volumeNoDim = String(normalized.volumeNoDim || "");
                if (normalized.volumeCbm !== undefined) normalized.volumeCbm = String(normalized.volumeCbm || "");
                if (normalized.cwAirfreight !== undefined) normalized.cwAirfreight = String(normalized.cwAirfreight || "");
                if (normalized.value !== undefined) normalized.value = String(normalized.value || "");
                // Deep copy dimensions array to ensure proper comparison
                if (normalized.dimensions && Array.isArray(normalized.dimensions)) {
                    normalized.dimensions = normalized.dimensions.map(dim => ({
                        ...dim,
                        // Preserve original values as-is for comparison
                        id: dim.id || null,
                        length_cm: dim.length_cm,
                        width_cm: dim.width_cm,
                        height_cm: dim.height_cm,
                        volume_cbm: dim.volume_cbm,
                        cw_air_freight: dim.cw_air_freight,
                    }));
                }
                return normalized;
            }) : [getEmptyRow()]);
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
                setIsLoadingSuppliers(true);
                const suppliersResponse = await api.get('/api/suppliers');
                const suppliersData = (suppliersResponse.data && Array.isArray(suppliersResponse.data.suppliers))
                    ? suppliersResponse.data.suppliers
                    : (suppliersResponse.data && Array.isArray(suppliersResponse.data))
                        ? suppliersResponse.data
                        : (Array.isArray(suppliersResponse) ? suppliersResponse : []);
                setSuppliers(suppliersData || []);
            } catch (error) {
                console.error('Failed to fetch suppliers:', error);
            } finally {
                setIsLoadingSuppliers(false);
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

            try {
                setIsLoadingShippingOrders(true);
                const shippingOrdersResponse = await getShippingOrders();
                const shippingOrdersData = (shippingOrdersResponse && Array.isArray(shippingOrdersResponse.orders))
                    ? shippingOrdersResponse.orders
                    : (Array.isArray(shippingOrdersResponse) ? shippingOrdersResponse : []);
                setShippingOrders(shippingOrdersData || []);
            } catch (error) {
                console.error('Failed to fetch shipping orders:', error);
            } finally {
                setIsLoadingShippingOrders(false);
            }

            // Fetch PICs
            try {
                setIsLoadingPICs(true);
                const response = await picAPI.getPICs();
                let picList = [];
                if (response && response.persons && Array.isArray(response.persons)) {
                    picList = response.persons;
                } else if (response.result && response.result.persons && Array.isArray(response.result.persons)) {
                    picList = response.result.persons;
                } else if (Array.isArray(response)) {
                    picList = response;
                }
                const normalizedPICs = picList.map((pic) => ({
                    id: pic.id,
                    name: pic.name || "",
                }));
                setPics(normalizedPICs);
            } catch (error) {
                console.error('Failed to fetch PICs:', error);
            } finally {
                setIsLoadingPICs(false);
            }
        };

        fetchLookupData();
    }, []);

    // Convert origin ID to country name text when countries are loaded
    useEffect(() => {
        if (!countries.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.origin_text) {
                    return row;
                }
                const normalizedValue = String(row.origin_text);
                // If it's already text (not a pure number), keep it
                if (!/^\d+$/.test(normalizedValue)) {
                    return row;
                }
                // Try to find country by ID and convert to name
                const country = countries.find((c) => {
                    const cId = c.id || c.country_id;
                    return String(cId) === normalizedValue;
                });
                if (country) {
                    return { ...row, origin_text: country.name || country.code || normalizedValue };
                }
                return row;
            })
        );
    }, [countries]);

    // Handle file upload for attachments
    const handleFileUpload = (rowIndex, files) => {
        const fileArray = Array.from(files || []);
        const filePromises = fileArray.map(file => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result || '';
                // Extract base64 data without data URL prefix
                const base64data = typeof result === 'string' && result.includes(',') ? result.split(',')[1] : result;
                resolve({
                    filename: file.name,
                    datas: base64data,
                    mimetype: file.type || 'application/octet-stream'
                });
            };
            reader.readAsDataURL(file);
        }));

        Promise.all(filePromises).then(newAttachments => {
            setFormRows(prevRows => prevRows.map((row, idx) => {
                if (idx === rowIndex) {
                    return {
                        ...row,
                        attachments: [...(row.attachments || []), ...newAttachments]
                    };
                }
                return row;
            }));
        });
    };

    // Handle attachment deletion (for new uploads)
    const handleDeleteAttachment = (rowIndex, attachmentIndex) => {
        setFormRows(prevRows => prevRows.map((row, idx) => {
            if (idx === rowIndex) {
                const newAttachments = [...(row.attachments || [])];
                newAttachments.splice(attachmentIndex, 1);
                return { ...row, attachments: newAttachments };
            }
            return row;
        }));
    };

    // Handle existing attachment deletion (marks for deletion in API)
    const handleDeleteExistingAttachment = (rowIndex, attachmentId) => {
        setFormRows(prevRows => prevRows.map((row, idx) => {
            if (idx === rowIndex) {
                const existingAttachments = [...(row.existingAttachments || [])];
                const updatedAttachments = existingAttachments.filter(att => att.id !== attachmentId);
                const attachmentsToDelete = [...(row.attachmentsToDelete || []), attachmentId];
                return {
                    ...row,
                    existingAttachments: updatedAttachments,
                    attachmentsToDelete: attachmentsToDelete
                };
            }
            return row;
        }));
    };

    // Handle viewing attachments - use new API endpoint
    const handleViewFile = async (attachment, stockItemId = null) => {
        try {
            let fileUrl = null;

            // Case 1: actual uploaded file (File or Blob)
            if (attachment instanceof File || attachment instanceof Blob) {
                fileUrl = URL.createObjectURL(attachment);
                window.open(fileUrl, '_blank');
                return;
            }

            // Case 2: If we have stockId and attachmentId, use new API endpoint
            if (stockItemId && attachment.id) {
                try {
                    setIsLoadingAttachment(true);
                    // Use new endpoint for viewing: /api/stock/list/${stockId}/attachment/${attachmentId}/download
                    const response = await downloadStockItemAttachmentApi(stockItemId, attachment.id, false);
                    
                    if (response.data instanceof Blob) {
                        const mimeType = response.type || attachment.mimetype || "application/octet-stream";
                        fileUrl = URL.createObjectURL(response.data);
                        window.open(fileUrl, '_blank');
                        return;
                    } else {
                        throw new Error('Invalid response format from server');
                    }
                } catch (apiError) {
                    console.error('Error fetching attachment from API:', apiError);
                    toast({
                        title: 'Error',
                        description: apiError.message || 'Failed to fetch attachment from server',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                    return;
                } finally {
                    setIsLoadingAttachment(false);
                }
            }

            // Case 3: API endpoint URL - legacy support
            if (attachment.url && attachment.url.includes('/api/stock/list/') && attachment.url.includes('/attachments')) {
                try {
                    // Extract stock ID from URL or use provided stockItemId
                    let stockId = stockItemId;
                    if (!stockId) {
                        const urlMatch = attachment.url.match(/\/api\/stock\/list\/(\d+)\/attachments/);
                        if (urlMatch && urlMatch[1]) {
                            stockId = urlMatch[1];
                        }
                    }

                    if (!stockId) {
                        throw new Error('Unable to determine stock item ID from attachment URL');
                    }

                    setIsLoadingAttachment(true);

                    try {
                        // Call API to get attachment
                        const response = await getStockItemAttachmentsApi(stockId);

                        // Handle response - could be blob (direct file) or JSON (metadata)
                        let attachmentData = null;

                        // If response is a blob (direct file data)
                        if (response.data instanceof Blob) {
                            const mimeType = response.type || attachment.mimetype || "application/octet-stream";
                            fileUrl = URL.createObjectURL(response.data);
                            window.open(fileUrl, '_blank');
                            return;
                        }

                        // If response is JSON (metadata or error)
                        if (response.result && response.result.attachments && Array.isArray(response.result.attachments)) {
                            // Find the specific attachment by ID if available
                            if (attachment.id) {
                                attachmentData = response.result.attachments.find(att => att.id === attachment.id);
                            } else {
                                // Use first attachment if no ID match
                                attachmentData = response.result.attachments[0];
                            }
                        } else if (response.attachments && Array.isArray(response.attachments)) {
                            if (attachment.id) {
                                attachmentData = response.attachments.find(att => att.id === attachment.id);
                            } else {
                                attachmentData = response.attachments[0];
                            }
                        } else if (response.result && response.result.data) {
                            // Handle case where attachment data is in result.data
                            attachmentData = response.result.data;
                        } else if (response.data && !(response.data instanceof Blob)) {
                            attachmentData = response.data;
                        }

                        if (!attachmentData) {
                            throw new Error('Attachment not found in API response');
                        }

                        // Now handle the attachment data - it might have base64 data, URL, or file data
                        if (attachmentData.datas) {
                            // Base64 data - convert to blob
                            const mimeType = attachmentData.mimetype || attachment.mimetype || "application/octet-stream";
                            const base64Data = attachmentData.datas;
                            const byteCharacters = atob(base64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: mimeType });
                            fileUrl = URL.createObjectURL(blob);
                            window.open(fileUrl, '_blank');
                            return;
                        } else if (attachmentData.url && !attachmentData.url.includes('/api/stock/list/')) {
                            // Direct file URL (not an API endpoint)
                            fileUrl = attachmentData.url;
                            window.open(fileUrl, '_blank');
                            return;
                        } else if (attachmentData.file || attachmentData.blob) {
                            // File or blob object
                            const file = attachmentData.file || attachmentData.blob;
                            fileUrl = URL.createObjectURL(file);
                            window.open(fileUrl, '_blank');
                            return;
                        } else {
                            throw new Error('Attachment data format not supported');
                        }
                    } finally {
                        setIsLoadingAttachment(false);
                    }
                } catch (apiError) {
                    console.error('Error fetching attachment from API:', apiError);
                    setIsLoadingAttachment(false);
                    toast({
                        title: 'Error',
                        description: apiError.message || 'Failed to fetch attachment from server',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                    return;
                }
            }
            // Case 4: backend URL (non-API endpoint)
            else if (attachment.url) {
                fileUrl = attachment.url;
                window.open(fileUrl, '_blank');
                return;
            }
            // Case 5: base64 data (most common for attachments) - convert to blob
            else if (attachment.datas) {
                try {
                    const mimeType = attachment.mimetype || "application/octet-stream";
                    const base64Data = attachment.datas;

                    // Convert base64 to binary
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });

                    // Create object URL from blob
                    fileUrl = URL.createObjectURL(blob);
                    window.open(fileUrl, '_blank');
                    return;
                } catch (base64Error) {
                    console.error('Error converting base64 to blob:', base64Error);
                    toast({
                        title: 'Error',
                        description: 'Unable to view file. File conversion failed.',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                    return;
                }
            }
            // Case 6: construct URL from attachment ID
            else if (attachment.id) {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
                fileUrl = `${baseUrl}/web/content/${attachment.id}`;
                window.open(fileUrl, '_blank');
                return;
            }
            // Case 7: file path
            else if (attachment.path) {
                fileUrl = attachment.path;
                window.open(fileUrl, '_blank');
                return;
            }

            // If we get here, no valid file data was found
            toast({
                title: 'Error',
                description: 'Unable to view file. File data not available.',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error viewing file:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to view file',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    // Handle force downloading attachments - use new API endpoint with download=true
    const handleDownloadFile = async (attachment, stockItemId = null) => {
        try {
            if (!stockItemId || !attachment.id) {
                toast({
                    title: 'Error',
                    description: 'Stock ID and Attachment ID are required for download',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
                return;
            }

            setIsLoadingAttachment(true);
            try {
                // Use new endpoint for force download: /api/stock/list/${stockId}/attachment/${attachmentId}/download?download=true
                const response = await downloadStockItemAttachmentApi(stockItemId, attachment.id, true);
                
                if (response.data instanceof Blob) {
                    const mimeType = response.type || attachment.mimetype || "application/octet-stream";
                    const filename = response.filename || attachment.filename || attachment.name || 'download';
                    
                    // Create download link
                    const url = URL.createObjectURL(response.data);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                } else {
                    throw new Error('Invalid response format from server');
                }
            } catch (apiError) {
                console.error('Error downloading attachment from API:', apiError);
                toast({
                    title: 'Error',
                    description: apiError.message || 'Failed to download attachment from server',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingAttachment(false);
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to download file',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
        }
    };


    // Handle input change
    const handleInputChange = (rowIndex, field, value) => {
        setFormRows(prev => {
            const newRows = [...prev];
            let processedValue = value;

            // For SO, SI, SI Combined, DI Number - add prefix immediately but preserve spaces
            if (field === "soNumber") {
                if (value && value !== "") {
                    // Remove existing prefix if present, then add it back (preserves spaces)
                    const withoutPrefix = value.startsWith("SO-") ? value.substring(3) : value;
                    processedValue = `SO-${withoutPrefix}`;
                } else {
                    processedValue = "";
                }
            } else if (field === "siNumber") {
                if (value && value !== "") {
                    // Remove existing prefix if present, then add it back (preserves spaces)
                    const withoutPrefix = value.startsWith("SI-") ? value.substring(3) : value;
                    processedValue = `SI-${withoutPrefix}`;
                } else {
                    processedValue = "";
                }
            } else if (field === "siCombined") {
                if (value && value !== "") {
                    // Remove existing prefix if present, then add it back (preserves spaces)
                    let withoutPrefix = value;
                    if (value.startsWith("SIC-")) {
                        withoutPrefix = value.substring(4);
                    } else if (value.startsWith("SI-C-")) {
                        withoutPrefix = value.substring(5);
                    } else if (value.startsWith("SI-")) {
                        withoutPrefix = value.substring(3);
                    }
                    processedValue = `SIC-${withoutPrefix}`;
                } else {
                    processedValue = "";
                }
            } else if (field === "diNumber") {
                if (value && value !== "") {
                    // Remove existing prefix if present, then add it back (preserves spaces)
                    const withoutPrefix = value.startsWith("DI-") ? value.substring(3) : value;
                    processedValue = `DI-${withoutPrefix}`;
                } else {
                    processedValue = "";
                }
            }

            newRows[rowIndex] = {
                ...newRows[rowIndex],
                [field]: processedValue
            };
            return newRows;
        });
    };

    // Copy field value to rows below
    const copyValueToRowsBelow = (rowIndex, field, copyToAll = false) => {
        setFormRows(prev => {
            const newRows = [...prev];
            const sourceValue = newRows[rowIndex][field];

            if (copyToAll) {
                // Copy to all rows below
                for (let i = rowIndex + 1; i < newRows.length; i++) {
                    newRows[i] = {
                        ...newRows[i],
                        [field]: sourceValue
                    };
                }
            } else {
                // Copy only to the next row below
                if (rowIndex + 1 < newRows.length) {
                    newRows[rowIndex + 1] = {
                        ...newRows[rowIndex + 1],
                        [field]: sourceValue
                    };
                }
            }

            return newRows;
        });
    };

    // Helper to compare values (handles different data types)
    const valuesAreEqual = (val1, val2) => {
        // Handle arrays (e.g., dimensions, attachments)
        if (Array.isArray(val1) || Array.isArray(val2)) {
            if (!Array.isArray(val1) || !Array.isArray(val2)) return false;
            if (val1.length !== val2.length) return false;
            // Deep compare array elements (for dimensions with nested objects)
            return val1.every((item, index) => {
                const item2 = val2[index];
                if (typeof item === 'object' && typeof item2 === 'object') {
                    // Compare object properties
                    const keys1 = Object.keys(item || {});
                    const keys2 = Object.keys(item2 || {});
                    if (keys1.length !== keys2.length) return false;
                    return keys1.every(key => {
                        const v1 = item[key];
                        const v2 = item2[key];
                        // Handle numeric comparison for dimension fields
                        if (key.includes('_cm') || key === 'volume_cbm' || key === 'cw_air_freight') {
                            return Number(v1) === Number(v2);
                        }
                        return v1 === v2;
                    });
                }
                return item === item2;
            });
        }

        // Handle null/undefined/empty/false
        const isEmpty1 = val1 === null || val1 === undefined || val1 === false || val1 === "";
        const isEmpty2 = val2 === null || val2 === undefined || val2 === false || val2 === "";
        if (isEmpty1 && isEmpty2) return true;

        // Convert both to numbers if they're numeric strings or numbers
        const num1 = Number(val1);
        const num2 = Number(val2);
        const isNum1 = !isNaN(num1) && val1 !== "" && val1 !== null && val1 !== undefined;
        const isNum2 = !isNaN(num2) && val2 !== "" && val2 !== null && val2 !== undefined;

        // If both are numbers, compare as numbers
        if (isNum1 && isNum2) {
            return num1 === num2;
        }

        // Handle booleans
        if (typeof val1 === "boolean" && typeof val2 === "boolean") return val1 === val2;

        // Convert both to strings for comparison (trim whitespace)
        const str1 = String(val1 || "").trim();
        const str2 = String(val2 || "").trim();
        return str1 === str2;
    };

    // Get payload for API - only include changed fields
    const getPayload = (rowData, originalData, includeStockId = false) => {
        // Start with required fields for update
        const payload = {};

        // Always include stock_id and stock_item_id for updates
        if (includeStockId && rowData.stockId) {
            payload.stock_id = rowData.stockId;
        }
        if (rowData.stockItemId) {
            payload.stock_item_id = rowData.stockItemId;
        }

        // Field mappings: [frontendField, backendField, transformFunction]
        const fieldMappings = [
            ["stockStatus", "stock_status", (v) => v || ""],
            ["client", "client_id", (v) => v ? String(v) : ""],
            ["supplier", "supplier_id", (v) => v ? String(v) : ""],
            ["vessel", "vessel_id", (v) => v ? String(v) : ""],
            ["poNumber", "po_text", (v) => v || ""],
            ["pic", "pic_new", (v) => v ? String(v) : false],
            ["items", "item", (v) => v !== "" && v !== null && v !== undefined ? toNumber(v) || 0 : 0],
            ["itemId", "item_id", (v) => v ? String(v) : ""],
            ["itemId", "stock_items_quantity", (v) => v ? String(v) : ""],
            ["currency", "currency_id", (v) => v ? String(v) : ""],
            ["origin_text", "origin_text", (v) => v ? String(v) : ""],
            ["apDestination", "ap_destination_new", (v) => v || ""], // Free text field
            ["viaHub1", "via_hub", (v) => v || ""],
            ["viaHub2", "via_hub2", (v) => v || ""],
            ["clientAccess", "client_access", (v) => Boolean(v)],
            ["remarks", "remarks", (v) => v || ""],
            ["internalRemark", "internal_remark", (v) => v || ""],
            ["weightKgs", "weight_kg", (v) => toNumber(v) || 0],
            ["widthCm", "width_cm", (v) => toNumber(v) || 0],
            ["lengthCm", "length_cm", (v) => toNumber(v) || 0],
            ["heightCm", "height_cm", (v) => toNumber(v) || 0],
            ["volumeNoDim", "volume_dim", (v) => toNumber(v) || 0],
            ["volumeCbm", "volume_cbm", (v) => toNumber(v) || 0],
            ["lwhText", "lwh_text", (v) => v || ""],
            ["cwAirfreight", "cw_air_freight_new", (v) => toNumber(v) || 0],
            ["value", "value", (v) => toNumber(v) || 0],
            ["destination", "destination_new", (v) => v || ""],
            // Dimensions - handled separately with operation types (create/update/delete)
            ["dimensions", "dimensions", (v) => {
                // This transform is not used anymore - dimensions are handled above with operation types
                return [];
            }],
            // Attachments
            ["attachments", "attachments", (v) => v || []],
            ["attachmentsToDelete", "attachment_to_delete", (v) => v || []],
            ["warehouseId", "warehouse_new", (v) => v || ""],
            ["shippingDoc", "shipping_doc", (v) => v || ""],
            ["exportDoc", "export_doc", (v) => v || ""],
            ["exportDoc2", "export_doc_2", (v) => v || ""],
            ["dateOnStock", "date_on_stock", (v) => v || ""],
            ["expReadyInStock", "exp_ready_in_stock", (v) => v || ""],
            ["shippedDate", "shipped_date", (v) => v || null],
            ["deliveredDate", "delivered_date", (v) => v || ""],
            ["details", "details", (v) => v || ""],
            ["item", "item", (v) => v !== "" && v !== null && v !== undefined ? toNumber(v) || 0 : 0],
            ["vesselDestination", "vessel_destination", (v) => v || ""],
            // SO, SI, SI Combined, DI Number are STRING types - preserve spaces (e.g., "00021 1.1")
            ["soNumber", "stock_so_number", (v) => v ? String(removeSOPrefix(String(v))) : ""],
            ["siNumber", "stock_shipping_instruction", (v) => v ? String(removeSIPrefix(String(v))) : ""],
            ["siCombined", "si_combined", (v) => {
                const cleaned = v ? String(removeSICombinedPrefix(String(v))) : "";
                // If empty, send false (as per backend requirement)
                return cleaned === "" ? false : cleaned;
            }],
            ["diNumber", "stock_delivery_instruction", (v) => v ? String(removeDIPrefix(String(v))) : ""],
            ["vesselDestination", "vessel_destination_text", (v) => v || ""],
            ["dgUn", "dg_un", (v) => v || ""],
        ];

        // Always include dimensions if they exist (before checking other fields)
        // This ensures dimensions are sent to backend for proper calculation of total_volume_cbm and total_cw_air_freight
        // Format: { op: "create|update|delete", id?: number, length_cm, width_cm, height_cm }
        const dimensionsField = fieldMappings.find(([field]) => field === "dimensions");
        if (dimensionsField) {
            const [frontendField, backendField] = dimensionsField;
            const currentDimensions = Array.isArray(rowData[frontendField]) ? rowData[frontendField] : [];
            const originalDimensions = originalData && Array.isArray(originalData[frontendField]) ? originalData[frontendField] : [];

            // Build dimensions payload with operation types
            const dimensionsPayload = [];

            // Helper function to normalize dimension values for comparison
            const normalizeDimValue = (value) => {
                if (value === null || value === undefined || value === "") return 0;
                const num = Number(value);
                return isNaN(num) ? 0 : num;
            };

            // 1. Find dimensions to CREATE (exist in current but not in original, or have no id)
            currentDimensions.forEach(dim => {
                if (!dim.id) {
                    // New dimension - no id means it's new
                    const method = dim.calculation_method || "lwh";
                    
                    if (method === "lwh") {
                        const length = normalizeDimValue(dim.length_cm);
                        const width = normalizeDimValue(dim.width_cm);
                        const height = normalizeDimValue(dim.height_cm);

                        // Only add if at least one value is non-zero
                        if (length > 0 || width > 0 || height > 0) {
                            dimensionsPayload.push({
                                op: "create",
                                calculation_method: "lwh",
                                length_cm: length,
                                width_cm: width,
                                height_cm: height,
                                volume_dim: false,
                                volume_cbm: normalizeDimValue(dim.volume_cbm),
                                cw_air_freight: normalizeDimValue(dim.cw_air_freight),
                            });
                        }
                    } else {
                        // method === "volume"
                        const volumeDim = normalizeDimValue(dim.volume_dim);
                        if (volumeDim > 0) {
                            dimensionsPayload.push({
                                op: "create",
                                calculation_method: "volume",
                                length_cm: 0.0,
                                width_cm: 0.0,
                                height_cm: 0.0,
                                volume_dim: volumeDim,
                                volume_cbm: normalizeDimValue(dim.volume_cbm),
                                cw_air_freight: normalizeDimValue(dim.cw_air_freight),
                            });
                        }
                    }
                    } else {
                        // Check if this dimension exists in original
                        const originalDim = originalDimensions.find(od => od.id === dim.id);
                        if (!originalDim) {
                            // New dimension with id (shouldn't happen, but handle it)
                            const method = dim.calculation_method || "lwh";
                            
                            if (method === "lwh") {
                                const length = normalizeDimValue(dim.length_cm);
                                const width = normalizeDimValue(dim.width_cm);
                                const height = normalizeDimValue(dim.height_cm);

                                if (length > 0 || width > 0 || height > 0) {
                                    dimensionsPayload.push({
                                        op: "create",
                                        calculation_method: "lwh",
                                        length_cm: length,
                                        width_cm: width,
                                        height_cm: height,
                                        volume_dim: false,
                                        volume_cbm: normalizeDimValue(dim.volume_cbm),
                                        cw_air_freight: normalizeDimValue(dim.cw_air_freight),
                                    });
                                }
                            } else {
                                // method === "volume"
                                const volumeDim = normalizeDimValue(dim.volume_dim);
                                if (volumeDim > 0) {
                                    dimensionsPayload.push({
                                        op: "create",
                                        calculation_method: "volume",
                                        length_cm: 0.0,
                                        width_cm: 0.0,
                                        height_cm: 0.0,
                                        volume_dim: volumeDim,
                                        volume_cbm: normalizeDimValue(dim.volume_cbm),
                                        cw_air_freight: normalizeDimValue(dim.cw_air_freight),
                                    });
                                }
                            }
                    } else {
                        // Check if dimension values changed - normalize both for comparison
                        const method = dim.calculation_method || "lwh";
                        const originalMethod = originalDim.calculation_method || "lwh";
                        
                        let hasChanged = false;
                        let updatePayload = {
                            op: "update",
                            id: dim.id,
                            calculation_method: method,
                        };

                        if (method === "lwh") {
                            const currentLength = normalizeDimValue(dim.length_cm);
                            const currentWidth = normalizeDimValue(dim.width_cm);
                            const currentHeight = normalizeDimValue(dim.height_cm);
                            const originalLength = normalizeDimValue(originalDim.length_cm);
                            const originalWidth = normalizeDimValue(originalDim.width_cm);
                            const originalHeight = normalizeDimValue(originalDim.height_cm);

                            hasChanged =
                                method !== originalMethod ||
                                currentLength !== originalLength ||
                                currentWidth !== originalWidth ||
                                currentHeight !== originalHeight;

                            if (hasChanged) {
                                updatePayload = {
                                    ...updatePayload,
                                    length_cm: currentLength,
                                    width_cm: currentWidth,
                                    height_cm: currentHeight,
                                    volume_dim: false,
                                    volume_cbm: normalizeDimValue(dim.volume_cbm),
                                    cw_air_freight: normalizeDimValue(dim.cw_air_freight),
                                };
                            }
                        } else {
                            // method === "volume"
                            const currentVolumeDim = normalizeDimValue(dim.volume_dim);
                            const originalVolumeDim = normalizeDimValue(originalDim.volume_dim);

                            hasChanged =
                                method !== originalMethod ||
                                currentVolumeDim !== originalVolumeDim;

                            if (hasChanged) {
                                updatePayload = {
                                    ...updatePayload,
                                    length_cm: 0.0,
                                    width_cm: 0.0,
                                    height_cm: 0.0,
                                    volume_dim: currentVolumeDim,
                                    volume_cbm: normalizeDimValue(dim.volume_cbm),
                                    cw_air_freight: normalizeDimValue(dim.cw_air_freight),
                                };
                            }
                        }

                        if (hasChanged) {
                            dimensionsPayload.push(updatePayload);
                        }
                    }
                }
            });

            // 2. Find dimensions to DELETE (exist in original but not in current)
            originalDimensions.forEach(originalDim => {
                if (originalDim.id) {
                    const existsInCurrent = currentDimensions.some(dim => dim.id === originalDim.id);
                    if (!existsInCurrent) {
                        // Dimension was deleted
                        dimensionsPayload.push({
                            op: "delete",
                            id: originalDim.id,
                        });
                    }
                }
            });

            // Always include dimensions array if there are any operations
            if (dimensionsPayload.length > 0) {
                payload[backendField] = dimensionsPayload;
            }
        }

        // Only include changed fields
        fieldMappings.forEach(([frontendField, backendField, transform]) => {
            // Skip dimensions as they're handled above
            if (frontendField === "dimensions") {
                return;
            }

            const currentValue = rowData[frontendField];
            const originalValue = originalData ? originalData[frontendField] : undefined;

            // Check if value has changed
            if (!valuesAreEqual(currentValue, originalValue)) {
                const transformedValue = transform(currentValue);
                // Only add if the transformed value is different from original transformed value
                const originalTransformed = originalData ? transform(originalValue) : undefined;
                if (!valuesAreEqual(transformedValue, originalTransformed)) {
                    payload[backendField] = transformedValue;
                }
            }
        });

        // Always include shipment_type as empty string if it's in the original payload structure
        // (This might be needed by the API, but only if other fields changed)
        if (Object.keys(payload).length > (payload.stock_id ? 1 : 0) + (payload.stock_item_id ? 1 : 0) + (payload.dimensions ? 1 : 0)) {
            payload.shipment_type = "";
        }

        return payload;
    };

    // Check if there are unsaved changes
    const hasUnsavedChanges = useCallback(() => {
        // If no original rows, check if formRows have any data
        if (originalRows.length === 0) {
            return formRows.some((row) => {
                // Check if row has any meaningful data (not just empty/default values)
                return Object.keys(row).some(key => {
                    const value = row[key];
                    // Skip empty values, false booleans, empty arrays, and internal fields
                    if (value === null || value === undefined || value === "" || value === false) return false;
                    if (Array.isArray(value) && value.length === 0) return false;
                    if (key === 'attachmentsToDelete' || key === 'existingAttachments' || key === 'stockId' || key === 'id') return false;
                    // Check if it's different from default empty row
                    const emptyRow = getEmptyRow();
                    return value !== emptyRow[key];
                });
            });
        }

        // Check if number of rows changed
        if (formRows.length !== originalRows.length) {
            return true;
        }

        // Check if any rows have changes
        return formRows.some((row, index) => {
            const originalRow = originalRows[index] || {};

            // Check for new rows (rows without stockId that have data)
            if (!row.stockId) {
                // Check if row has any meaningful data (not just empty/default values)
                const hasData = Object.keys(row).some(key => {
                    const value = row[key];
                    // Skip empty values, false booleans, empty arrays, and internal fields
                    if (value === null || value === undefined || value === "" || value === false) return false;
                    if (Array.isArray(value) && value.length === 0) return false;
                    if (key === 'attachmentsToDelete' || key === 'existingAttachments' || key === 'id') return false;
                    // Check if it's different from default empty row
                    const emptyRow = getEmptyRow();
                    return value !== emptyRow[key];
                });
                if (hasData) return true;
            } else {
                // Check for changes in existing rows
                const payload = getPayload(row, originalRow, true);
                const hasChanges = Object.keys(payload).filter(key =>
                    key !== 'stock_id' && key !== 'stock_item_id'
                ).length > 0;
                if (hasChanges) return true;
            }

            // Check for attachment changes (new uploads or deletions)
            const hasNewAttachments = (row.attachments && row.attachments.length > 0);
            const hasDeletedAttachments = (row.attachmentsToDelete && row.attachmentsToDelete.length > 0);
            const originalAttachmentsCount = (originalRow.existingAttachments && originalRow.existingAttachments.length) || 0;
            const currentAttachmentsCount = (row.existingAttachments && row.existingAttachments.length) || 0;

            if (hasNewAttachments || hasDeletedAttachments || originalAttachmentsCount !== currentAttachmentsCount) {
                return true;
            }

            return false;
        });
    }, [formRows, originalRows]);

    // Save form data to localStorage (no API call)
    const saveToLocalStorage = useCallback(() => {
        if (formRows.length === 0) {
            return;
        }
        try {
            const storageKey = `stockEditFormData_${formRows[0]?.stockId || 'new'}`;
            const dataToSave = {
                formRows,
                currentItemIndex,
                timestamp: new Date().toISOString()
            };
            sessionStorage.setItem(storageKey, JSON.stringify(dataToSave));
            setLastAutoSaveTime(new Date());
        } catch (error) {
            console.error("Failed to save to localStorage:", error);
        }
    }, [formRows, currentItemIndex]);


    // Save to localStorage on form changes (debounced)
    useEffect(() => {
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Only save if formRows are loaded
        if (formRows.length === 0) {
            return;
        }

        // Debounce localStorage save: wait 1 second after last change
        autoSaveTimeoutRef.current = setTimeout(() => {
            saveToLocalStorage();
        }, 1000);

        // Cleanup timeout on unmount or when formRows change
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [formRows, currentItemIndex, saveToLocalStorage]);

    // Save to localStorage on page unload/beforeunload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges()) {
                // Save to localStorage before leaving
                saveToLocalStorage();
                // Show browser warning
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. They are saved locally but not to the server.';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, saveToLocalStorage]);

    // Save to localStorage when page becomes hidden (user switches tabs, minimizes, etc.)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && hasUnsavedChanges()) {
                // Save to localStorage when page becomes hidden
                saveToLocalStorage();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [hasUnsavedChanges, saveToLocalStorage]);


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
            // Build lines array from all form rows - only include changed fields
            const lines = formRows.map((row, index) => {
                if (!row.stockId) {
                    throw new Error("Stock ID is required for update");
                }
                const originalRow = originalRows[index] || {};
                const payload = getPayload(row, originalRow, true);
                // Always include payload if it has dimensions (even if no other changes)
                // This ensures dimensions are sent to backend for calculation of totals
                const hasDimensions = payload.hasOwnProperty('dimensions');
                // Only include if there are changes (besides stock_id and stock_item_id) OR if dimensions exist
                const hasChanges = Object.keys(payload).filter(key =>
                    key !== 'stock_id' && key !== 'stock_item_id'
                ).length > 0;
                return (hasChanges || hasDimensions) ? payload : null;
            }).filter(line => line !== null); // Remove unchanged rows

            if (lines.length === 0) {
                toast({
                    title: "No Changes",
                    description: "No fields have been modified",
                    status: "info",
                    duration: 3000,
                    isClosable: true,
                });
                setIsLoading(false);
                return;
            }

            // Send all lines in a single payload
            const payload = { lines };
            const result = await updateStockItemApi(formRows[0]?.stockId, payload);

            if (result && result.result && result.result.status === 'success') {
                // Clear localStorage since data is now saved to server
                if (formRows[0]?.stockId) {
                    const storageKey = `stockEditFormData_${formRows[0].stockId}`;
                    sessionStorage.removeItem(storageKey);
                }

                toast({
                    title: 'Success',
                    description: `${lines.length} stock item(s) updated successfully (${formRows.length - lines.length} item(s) had no changes)`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                // Refresh stock list and navigate back with filter state preserved
                await getStockList();
                if (filterState) {
                    // Determine source page based on filterState structure
                    // If filterState has activeTab, user came from Stocks.jsx (/admin/stock-list/stocks)
                    // Otherwise, user came from index.jsx (/admin/stock-list/main-db)
                    const sourcePath = filterState.activeTab !== undefined
                        ? '/admin/stock-list/stocks'
                        : '/admin/stock-list/main-db';
                    // Clear saved edit state since we're navigating back
                    sessionStorage.removeItem('stockEditState');
                    // Navigate back with filter state to restore filters
                    // Mark as fromEdit to prevent restoring edit state
                    history.push({
                        pathname: sourcePath,
                        state: { filterState, fromEdit: true }
                    });
                } else {
                    history.goBack();
                }
            } else {
                throw new Error(result?.result?.message || result?.message || "Failed to update stock items");
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
            {isLoadingAttachment && (
                <Box
                    position="fixed"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    zIndex={1001}
                    bg={useColorModeValue("white", "gray.800")}
                    p={6}
                    borderRadius="md"
                    boxShadow="lg"
                >
                    <VStack spacing="4">
                        <Spinner size="xl" color="#1c4a95" />
                        <Text color={useColorModeValue("gray.600", "gray.300")}>Loading...</Text>
                    </VStack>
                </Box>
            )}

            {/* Header */}
            <Flex justify="space-between" align="center" mb="6">
                <HStack spacing="4">
                    <IconButton
                        icon={<Icon as={MdChevronLeft} />}
                        size="sm"
                        variant="ghost"
                        aria-label="Back"
                        onClick={() => {
                            // Only show confirmation modal if there are unsaved changes
                            if (hasUnsavedChanges()) {
                                onBackConfirmOpen();
                            } else {
                                // No changes, navigate back directly
                                // Clear edit state from sessionStorage to prevent redirect loop
                                sessionStorage.removeItem('stockEditState');
                                // Clear the specific storage key for this stock
                                if (formRows[0]?.stockId) {
                                    const storageKey = `stockEditFormData_${formRows[0].stockId}`;
                                    sessionStorage.removeItem(storageKey);
                                }
                                // Also clear the 'new' key if it exists
                                sessionStorage.removeItem('stockEditFormData_new');

                                if (filterState) {
                                    const sourcePath = filterState.activeTab !== undefined
                                        ? '/admin/stock-list/stocks'
                                        : '/admin/stock-list/main-db';
                                    history.push({
                                        pathname: sourcePath,
                                        state: { filterState, fromEdit: true }
                                    });
                                } else {
                                    history.goBack();
                                }
                            }
                        }}
                    />
                    <VStack align="start" spacing={0}>
                        <Text fontSize="xl" fontWeight="600" color={textColor}>
                            {isBulkEdit
                                ? `Edit Stock Items (${currentItemIndex + 1} of ${formRows.length})`
                                : "Edit Stock Item"}
                        </Text>
                        {lastAutoSaveTime && (
                            <Text fontSize="xs" color="blue.500" mt={1}>
                                Saved locally: {lastAutoSaveTime.toLocaleTimeString()}
                            </Text>
                        )}
                        {hasUnsavedChanges() && (
                            <Text fontSize="xs" color="orange.500" mt={1}>
                                Changes not saved to server
                            </Text>
                        )}
                    </VStack>
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Origin</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">HUB 1</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">HUB 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">AP Destination</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Destination</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Warehouse ID</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipping Doc</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Export Doc 1</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Export Doc 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Remarks</Th>
                                {/* Internal Remark appears after Remarks */}
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Internal Remark</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Date on stock</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Exp ready from supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipped Date</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Delivered Date</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DG/UN Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Pcs</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Weight KG</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Dimension</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume no dim</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume cbm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">LWH Text</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">CW Airfreight</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Value</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Currency</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client Access</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Files</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PIC</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase"></Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SL Create Date Timestamp</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {formRows.map((row, rowIndex) => (
                                <Tr key={row.id}>
                                    {/* Read-only fields */}
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.stockItemId || ""}
                                            isReadOnly
                                            size="sm"
                                            w="auto"
                                            htmlSize={getAutoHtmlSize(row.stockItemId, "", { min: 12, max: 40 })}
                                            bg={useColorModeValue("gray.100", "gray.700")}
                                            color={inputText}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.slCreateDate || ""}
                                            isReadOnly
                                            size="sm"
                                            w="auto"
                                            htmlSize={getAutoHtmlSize(row.slCreateDate, "", { min: 12, max: 30 })}
                                            bg={useColorModeValue("gray.100", "gray.700")}
                                            color={inputText}
                                        />
                                    </Td>
                                    {/* Editable fields */}
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
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
                                            autoWidth
                                            autoWidthMin={18}
                                            autoWidthMax={50}
                                        />
                                    </Td>
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
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
                                            autoWidth
                                            autoWidthMin={18}
                                            autoWidthMax={50}
                                        />
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="text"
                                                inputMode="text"
                                                value={row.soNumber || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "soNumber", e.target.value)}
                                                placeholder="Enter SO (e.g., SO-00021 1.1)"
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.soNumber, "Enter SO (e.g., SO-00021 1.1)", { min: 18, max: 60 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "soNumber", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "soNumber", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="text"
                                                inputMode="text"
                                                value={row.siNumber || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "siNumber", e.target.value)}
                                                placeholder="Enter SI Number (e.g., SI-00021 1.1)"
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.siNumber, "Enter SI Number (e.g., SI-00021 1.1)", { min: 20, max: 60 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "siNumber", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "siNumber", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="text"
                                                inputMode="text"
                                                value={row.siCombined || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "siCombined", e.target.value)}
                                                placeholder="Enter SI Combined (e.g., SIC-00021 1.1)"
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.siCombined, "Enter SI Combined (e.g., SIC-00021 1.1)", { min: 22, max: 60 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "siCombined", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "siCombined", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="text"
                                                inputMode="text"
                                                value={row.diNumber || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "diNumber", e.target.value)}
                                                placeholder="Enter DI Number (e.g., DI-00021 1.1)"
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.diNumber, "Enter DI Number (e.g., DI-00021 1.1)", { min: 20, max: 60 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "diNumber", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "diNumber", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps}>
                                        <Select
                                            value={row.stockStatus}
                                            onChange={(e) => handleInputChange(rowIndex, "stockStatus", e.target.value)}
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        >
                                            <option value="">Select</option>
                                            <option value="pending">Pending</option>
                                            <option value="in_stock">Stock</option>
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
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.supplier}
                                            onChange={(value) => handleInputChange(rowIndex, "supplier", value)}
                                            options={suppliers}
                                            placeholder="Select Supplier"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Supplier ${option.id}`}
                                            isLoading={isLoadingSuppliers}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            autoWidth
                                            autoWidthMin={18}
                                            autoWidthMax={55}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Textarea
                                            value={row.poNumber || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "poNumber", e.target.value)}
                                            placeholder="Enter PO Number(s) - one per line"
                                            size="sm"
                                            rows={3}
                                            w="auto"
                                            minW="24ch"
                                            maxW="90ch"
                                            cols={getAutoCols(row.poNumber, "Enter PO Number(s) - one per line", { min: 24, max: 90 })}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Box position="relative" flex="0 0 auto">
                                                <Input
                                                    list={`origin-countries-${rowIndex}`}
                                                    value={row.origin_text || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "origin_text", e.target.value)}
                                                    placeholder="Type or select country..."
                                                    size="sm"
                                                    w="auto"
                                                    htmlSize={getAutoHtmlSize(row.origin_text, "Type or select country...", { min: 18, max: 60 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                />
                                                <datalist id={`origin-countries-${rowIndex}`}>
                                                    {countries.map((country) => (
                                                        <option key={country.id || country.country_id} value={country.name || country.code || ""} />
                                                    ))}
                                                </datalist>
                                            </Box>
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "origin_text", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "origin_text", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                value={row.viaHub1 || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "viaHub1", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.viaHub1, "", { min: 12, max: 40 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "viaHub1", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "viaHub1", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                value={row.viaHub2 || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "viaHub2", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.viaHub2, "", { min: 12, max: 40 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "viaHub2", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "viaHub2", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                value={row.apDestination || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "apDestination", e.target.value)}
                                                placeholder="Enter AP Destination"
                                                size="sm"
                                                w="auto"
                                                flex="0 0 auto"
                                                htmlSize={getAutoHtmlSize(row.apDestination, "Enter AP Destination", { min: 18, max: 60 })}
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "apDestination", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "apDestination", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                        <Flex gap="1" align="center">
                                            <Box flex="0 0 auto">
                                                <SimpleSearchableSelect
                                                    value={row.destination}
                                                    onChange={(value) => handleInputChange(rowIndex, "destination", value)}
                                                    options={destinations}
                                                    placeholder="Select Destination"
                                                    displayKey="name"
                                                    valueKey="id"
                                                    formatOption={(option) => option.name || option.code || `Dest ${option.id}`}
                                                    isLoading={isLoadingDestinations}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={55}
                                                />
                                            </Box>
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "destination", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "destination", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps}>
                                        <Textarea
                                            value={row.warehouseId || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "warehouseId", e.target.value)}
                                            placeholder="Enter Warehouse ID"
                                            size="sm"
                                            rows={2}
                                            w="auto"
                                            minW="24ch"
                                            maxW="90ch"
                                            cols={getAutoCols(row.warehouseId, "Enter Warehouse ID", { min: 24, max: 60 })}
                                            resize="vertical"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.shippingDoc || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "shippingDoc", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            w="auto"
                                            htmlSize={getAutoHtmlSize(row.shippingDoc, "", { min: 16, max: 80 })}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="flex-start">
                                            <Textarea
                                                value={row.exportDoc || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "exportDoc", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                rows={2}
                                                w="auto"
                                                minW="24ch"
                                                maxW="90ch"
                                                cols={getAutoCols(row.exportDoc, "", { min: 24, max: 90 })}
                                                flex="0 0 auto"
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                        mt="1"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "exportDoc", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "exportDoc", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="flex-start">
                                            <Textarea
                                                value={row.exportDoc2 || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "exportDoc2", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                rows={2}
                                                w="auto"
                                                minW="24ch"
                                                maxW="90ch"
                                                cols={getAutoCols(row.exportDoc2, "", { min: 24, max: 90 })}
                                                flex="0 0 auto"
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                        mt="1"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "exportDoc2", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "exportDoc2", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    {/* Remarks */}
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="flex-start">
                                            <Textarea
                                                value={row.remarks || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "remarks", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                rows={2}
                                                w="auto"
                                                minW="24ch"
                                                maxW="90ch"
                                                cols={getAutoCols(row.remarks, "", { min: 24, max: 90 })}
                                                flex="0 0 auto"
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                        mt="1"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "remarks", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "remarks", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    {/* Internal Remark - appears after Remarks */}
                                    <Td {...cellProps}>
                                        <Textarea
                                            value={row.internalRemark || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "internalRemark", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            rows={2}
                                            w="auto"
                                            minW="24ch"
                                            maxW="90ch"
                                            cols={getAutoCols(row.internalRemark, "", { min: 24, max: 90 })}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            type="date"
                                            value={row.dateOnStock || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "dateOnStock", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            type="date"
                                            value={row.expReadyInStock || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "expReadyInStock", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="date"
                                                value={row.shippedDate || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "shippedDate", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                minW="200px"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                flex="1"
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "shippedDate", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "shippedDate", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="date"
                                                value={row.deliveredDate || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "deliveredDate", e.target.value)}
                                                placeholder=""
                                                size="sm"
                                                minW="200px"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                flex="1"
                                            />
                                            {formRows.length > 1 && rowIndex < formRows.length - 1 && (
                                                <Menu>
                                                    <MenuButton
                                                        as={IconButton}
                                                        icon={<Icon as={MdMoreVert} />}
                                                        size="xs"
                                                        variant="ghost"
                                                        aria-label="Copy to rows below"
                                                    />
                                                    <MenuList>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "deliveredDate", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "deliveredDate", true)}>
                                                            Assign to all rows below
                                                        </MenuItem>
                                                    </MenuList>
                                                </Menu>
                                            )}
                                        </Flex>
                                    </Td>
                                    <Td {...cellProps}>
                                        <Textarea
                                            value={row.dgUn || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "dgUn", e.target.value)}
                                            placeholder="Enter DG/UN Number"
                                            size="sm"
                                            rows={3}
                                            w="auto"
                                            minW="24ch"
                                            maxW="60ch"
                                            cols={getAutoCols(row.dgUn, "Enter DG/UN Number", { min: 24, max: 60 })}
                                            resize="vertical"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <NumberInput
                                            value={row.items || ""}
                                            onChange={(value) => handleInputChange(rowIndex, "items", value)}
                                            min={0}
                                            precision={0}
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td {...cellProps}>
                                        <NumberInput
                                            value={row.weightKgs}
                                            onChange={(value) => handleInputChange(rowIndex, "weightKgs", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td {...cellProps}>
                                        <Button
                                            size="sm"
                                            leftIcon={<Icon as={MdAdd} />}
                                            onClick={() => {
                                                setDimensionsModalRowIndex(rowIndex);
                                                // Ensure all dimensions are loaded, even if some fields are empty
                                                const dimensions = Array.isArray(row.dimensions) ? row.dimensions : [];
                                                console.log('Loading dimensions for row:', rowIndex, 'Dimensions count:', dimensions.length, dimensions);
                                                setDimensionsList(dimensions);
                                                onDimensionsModalOpen();
                                            }}
                                            colorScheme="blue"
                                            variant="outline"
                                        >
                                            Dimensions ({row.dimensions?.length || 0})
                                        </Button>
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.volumeNoDim}
                                            onChange={(e) => handleInputChange(rowIndex, "volumeNoDim", e.target.value)}
                                            placeholder="Volume no dim"
                                            size="sm"
                                            w="auto"
                                            htmlSize={getAutoHtmlSize(row.volumeNoDim, "Volume no dim", { min: 16, max: 30 })}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <NumberInput
                                            value={row.volumeCbm}
                                            onChange={(value) => handleInputChange(rowIndex, "volumeCbm", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td {...cellProps}>
                                        <VStack spacing={2} align="stretch">
                                            <Textarea
                                                value={row.lwhText || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "lwhText", e.target.value)}
                                                placeholder="Enter LWH text (supports multiple lines)"
                                                size="sm"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                rows={5}
                                                w="auto"
                                                minW="24ch"
                                                maxW="90ch"
                                                cols={getAutoCols(row.lwhText, "Enter LWH text (supports multiple lines)", { min: 24, max: 90 })}
                                                resize="vertical"
                                                minH="100px"
                                            />
                                            <Button
                                                size="xs"
                                                leftIcon={<Icon as={MdFullscreen} />}
                                                colorScheme="blue"
                                                variant="outline"
                                                onClick={() => {
                                                    setLwhModalRowIndex(rowIndex);
                                                    setLwhModalValue(row.lwhText || "");
                                                    onLWHModalOpen();
                                                }}
                                                w="100%"
                                            >
                                                View/Edit Full Text
                                            </Button>
                                        </VStack>
                                    </Td>
                                    <Td {...cellProps}>
                                        <NumberInput
                                            value={row.cwAirfreight}
                                            onChange={(value) => handleInputChange(rowIndex, "cwAirfreight", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td {...cellProps}>
                                        <NumberInput
                                            value={row.value}
                                            onChange={(value) => handleInputChange(rowIndex, "value", value)}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                            minW="200px"
                                            w="100%"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
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
                                            autoWidth
                                            autoWidthMin={16}
                                            autoWidthMax={55}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Checkbox
                                            isChecked={row.clientAccess}
                                            onChange={(e) => handleInputChange(rowIndex, "clientAccess", e.target.checked)}
                                            size="sm"
                                        />
                                    </Td>
                                    {/* Files - Upload button */}
                                    <Td {...cellProps}>
                                        <VStack spacing={2} align="stretch">
                                            {/* File Upload Input */}
                                            <Input
                                                type="file"
                                                multiple
                                                size="sm"
                                                onChange={(e) => handleFileUpload(rowIndex, e.target.files)}
                                                accept="application/pdf,image/*,.doc,.docx"
                                                display="none"
                                                id={`file-upload-main-${rowIndex}`}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor={`file-upload-main-${rowIndex}`}>
                                                <Button
                                                    as="span"
                                                    size="xs"
                                                    variant="outline"
                                                    colorScheme="blue"
                                                    leftIcon={<Icon as={MdAttachFile} />}
                                                    cursor="pointer"
                                                    w="100%"
                                                >
                                                    Upload Files
                                                </Button>
                                            </label>

                                            {/* Display existing attachments */}
                                            {(row.existingAttachments || []).map((att, attIdx) => (
                                                <Flex key={`existing-${att.id || attIdx}`} align="center" justify="space-between" fontSize="xs" gap={1}>
                                                    <Text
                                                        isTruncated
                                                        flex={1}
                                                        title={att.filename || att.name}
                                                        cursor="pointer"
                                                        color="blue.500"
                                                        _hover={{ textDecoration: "underline" }}
                                                        onClick={() => handleViewFile(att, row.stockId)}
                                                    >
                                                        {att.filename || att.name || `File ${attIdx + 1}`}
                                                    </Text>
                                                    <HStack spacing={0}>
                                                        <IconButton
                                                            aria-label="View file"
                                                            icon={<Icon as={MdVisibility} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="blue"
                                                            onClick={() => handleViewFile(att, row.stockId)}
                                                        />
                                                        <IconButton
                                                            aria-label="Download file"
                                                            icon={<Icon as={MdDownload} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="green"
                                                            onClick={() => handleDownloadFile(att, row.stockId)}
                                                        />
                                                        <IconButton
                                                            aria-label="Delete attachment"
                                                            icon={<Icon as={MdRemove} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            onClick={() => handleDeleteExistingAttachment(rowIndex, att.id)}
                                                        />
                                                    </HStack>
                                                </Flex>
                                            ))}

                                            {/* Display newly uploaded attachments */}
                                            {(row.attachments || []).map((att, attIdx) => (
                                                <Flex key={`new-${attIdx}`} align="center" justify="space-between" fontSize="xs" gap={1}>
                                                    <Text
                                                        isTruncated
                                                        flex={1}
                                                        title={att.filename}
                                                        cursor="pointer"
                                                        color="blue.500"
                                                        _hover={{ textDecoration: "underline" }}
                                                        onClick={() => handleViewFile(att)}
                                                    >
                                                        {att.filename || att.name || `File ${attIdx + 1}`}
                                                    </Text>
                                                    <HStack spacing={0}>
                                                        <IconButton
                                                            aria-label="View file"
                                                            icon={<Icon as={MdVisibility} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="blue"
                                                            onClick={() => handleViewFile(att)}
                                                        />
                                                        <IconButton
                                                            aria-label="Remove attachment"
                                                            icon={<Icon as={MdRemove} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="red"
                                                            onClick={() => handleDeleteAttachment(rowIndex, attIdx)}
                                                        />
                                                    </HStack>
                                                </Flex>
                                            ))}
                                        </VStack>
                                    </Td>
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.pic ? String(row.pic) : null}
                                            onChange={(value) => {
                                                // Store the PIC ID
                                                handleInputChange(rowIndex, "pic", value ? String(value) : null);
                                            }}
                                            options={pics}
                                            placeholder="Select PIC"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `PIC ${option.id}`}
                                            isLoading={isLoadingPICs}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                            size="sm"
                                            autoWidth
                                            autoWidthMin={16}
                                            autoWidthMax={40}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.blank || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "blank", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            w="auto"
                                            htmlSize={getAutoHtmlSize(row.blank, "", { min: 12, max: 40 })}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.slCreateDateTime || ""}
                                            isReadOnly
                                            size="sm"
                                            w="auto"
                                            htmlSize={getAutoHtmlSize(row.slCreateDateTime, "", { min: 18, max: 40 })}
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

            {/* LWH Text Modal */}
            <Modal isOpen={isLWHModalOpen} onClose={onLWHModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit LWH Text</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <Textarea
                            value={lwhModalValue}
                            onChange={(e) => setLwhModalValue(e.target.value)}
                            placeholder="Enter LWH text (supports multiple lines)"
                            size="md"
                            bg={inputBg}
                            color={inputText}
                            borderColor={borderColor}
                            rows={12}
                            resize="vertical"
                            fontSize="sm"
                        />
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            colorScheme="blue"
                            mr={3}
                            onClick={() => {
                                if (lwhModalRowIndex !== null) {
                                    handleInputChange(lwhModalRowIndex, "lwhText", lwhModalValue);
                                }
                                onLWHModalClose();
                            }}
                        >
                            Save
                        </Button>
                        <Button variant="ghost" onClick={onLWHModalClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Back Confirmation Dialog */}
            <AlertDialog
                isOpen={isBackConfirmOpen}
                leastDestructiveRef={cancelRef}
                onClose={onBackConfirmClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold">
                            Discard Changes?
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            Are you sure you want to go back? All entered data will be removed from local storage and you will lose any unsaved changes.
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onBackConfirmClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="red"
                                onClick={() => {
                                    // Clear all localStorage data related to this edit
                                    // Clear the specific storage key for this stock
                                    if (formRows[0]?.stockId) {
                                        const storageKey = `stockEditFormData_${formRows[0].stockId}`;
                                        sessionStorage.removeItem(storageKey);
                                    }
                                    // Also clear the 'new' key if it exists
                                    sessionStorage.removeItem('stockEditFormData_new');
                                    // Clear saved edit state
                                    sessionStorage.removeItem('stockEditState');
                                    // Clear source page info
                                    sessionStorage.removeItem('stockEditSourcePage');
                                    // Close dialog
                                    onBackConfirmClose();
                                    // Navigate back
                                    if (filterState) {
                                        // Determine source page based on filterState structure
                                        // If filterState has activeTab, user came from Stocks.jsx (/admin/stock-list/stocks)
                                        // Otherwise, user came from index.jsx (/admin/stock-list/main-db)
                                        const sourcePath = filterState.activeTab !== undefined
                                            ? '/admin/stock-list/stocks'
                                            : '/admin/stock-list/main-db';
                                        // Navigate back with filter state to restore filters
                                        // Mark as fromEdit to prevent restoring edit state
                                        history.push({
                                            pathname: sourcePath,
                                            state: { filterState, fromEdit: true }
                                        });
                                    } else {
                                        history.goBack();
                                    }
                                }}
                                ml={3}
                            >
                                Yes, Remove Data
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>

            {/* Dimensions Modal */}
            <Modal isOpen={isDimensionsModalOpen} onClose={onDimensionsModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Manage Dimensions</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            {dimensionsList.length === 0 ? (
                                <Text color={useColorModeValue("gray.600", "gray.400")} textAlign="center" py={4}>
                                    No dimensions added yet. Click "Add Dimension" to create one.
                                </Text>
                            ) : (
                                dimensionsList.map((dim, index) => (
                                    <Box key={dim.id || index} p={4} border="1px" borderColor={borderColor} borderRadius="md">
                                        <Flex justify="space-between" align="center" mb={3}>
                                            <Text fontWeight="600">Dimension {index + 1}</Text>
                                            <IconButton
                                                aria-label="Remove dimension"
                                                icon={<Icon as={MdDelete} />}
                                                size="sm"
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => {
                                                    const updated = dimensionsList.filter((_, i) => i !== index);
                                                    setDimensionsList(updated);
                                                }}
                                            />
                                        </Flex>
                                        {/* Calculation Method Selector */}
                                        <FormControl mb={3}>
                                            <FormLabel fontSize="sm" fontWeight="600">Calculation Method</FormLabel>
                                            <Select
                                                value={dim.calculation_method || "lwh"}
                                                onChange={(e) => {
                                                    const updated = [...dimensionsList];
                                                    // Strict conditions: clear irrelevant fields when switching methods
                                                    if (e.target.value === "lwh") {
                                                        updated[index] = {
                                                            ...updated[index],
                                                            calculation_method: "lwh",
                                                            volume_dim: "", // Clear volume_dim when switching to lwh
                                                        };
                                                    } else {
                                                        // Switching to "volume"
                                                        updated[index] = {
                                                            ...updated[index],
                                                            calculation_method: "volume",
                                                            length_cm: "", // Clear LWH fields when switching to volume
                                                            width_cm: "",
                                                            height_cm: "",
                                                        };
                                                    }
                                                    setDimensionsList(updated);
                                                }}
                                                size="sm"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            >
                                                <option value="lwh">LWH (Length × Width × Height)</option>
                                                <option value="volume">Volume</option>
                                            </Select>
                                        </FormControl>
                                        {/* Conditional Fields based on calculation_method */}
                                        {dim.calculation_method === "lwh" || !dim.calculation_method ? (
                                            <Flex gap={3} wrap="wrap">
                                                <FormControl flex="1" minW="150px">
                                                    <FormLabel fontSize="sm">Length (cm)</FormLabel>
                                                    <NumberInput
                                                        value={dim.length_cm || ""}
                                                        onChange={(value) => {
                                                            const updated = [...dimensionsList];
                                                            updated[index] = {
                                                                ...updated[index],
                                                                calculation_method: "lwh",
                                                                length_cm: value,
                                                                volume_dim: "", // Ensure volume_dim is cleared
                                                            };
                                                            setDimensionsList(updated);
                                                        }}
                                                        min={0}
                                                        precision={2}
                                                        size="sm"
                                                    >
                                                        <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                    </NumberInput>
                                                </FormControl>
                                                <FormControl flex="1" minW="150px">
                                                    <FormLabel fontSize="sm">Width (cm)</FormLabel>
                                                    <NumberInput
                                                        value={dim.width_cm || ""}
                                                        onChange={(value) => {
                                                            const updated = [...dimensionsList];
                                                            updated[index] = {
                                                                ...updated[index],
                                                                calculation_method: "lwh",
                                                                width_cm: value,
                                                                volume_dim: "", // Ensure volume_dim is cleared
                                                            };
                                                            setDimensionsList(updated);
                                                        }}
                                                        min={0}
                                                        precision={2}
                                                        size="sm"
                                                    >
                                                        <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                    </NumberInput>
                                                </FormControl>
                                                <FormControl flex="1" minW="150px">
                                                    <FormLabel fontSize="sm">Height (cm)</FormLabel>
                                                    <NumberInput
                                                        value={dim.height_cm || ""}
                                                        onChange={(value) => {
                                                            const updated = [...dimensionsList];
                                                            updated[index] = {
                                                                ...updated[index],
                                                                calculation_method: "lwh",
                                                                height_cm: value,
                                                                volume_dim: "", // Ensure volume_dim is cleared
                                                            };
                                                            setDimensionsList(updated);
                                                        }}
                                                        min={0}
                                                        precision={2}
                                                        size="sm"
                                                    >
                                                        <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                    </NumberInput>
                                                </FormControl>
                                            </Flex>
                                        ) : (
                                            <FormControl>
                                                <FormLabel fontSize="sm">Volume Dimension</FormLabel>
                                                <NumberInput
                                                    value={dim.volume_dim || ""}
                                                    onChange={(value) => {
                                                        const updated = [...dimensionsList];
                                                        updated[index] = {
                                                            ...updated[index],
                                                            calculation_method: "volume",
                                                            volume_dim: value,
                                                            length_cm: "", // Ensure LWH fields are cleared
                                                            width_cm: "",
                                                            height_cm: "",
                                                        };
                                                        setDimensionsList(updated);
                                                    }}
                                                    min={0}
                                                    precision={2}
                                                    size="sm"
                                                >
                                                    <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                </NumberInput>
                                            </FormControl>
                                        )}
                                        {/* Additional fields that are always visible */}
                                        <Flex gap={3} wrap="wrap" mt={3}>
                                            <FormControl flex="1" minW="150px">
                                                <FormLabel fontSize="sm">Volume CBM</FormLabel>
                                                <NumberInput
                                                    value={dim.volume_cbm || ""}
                                                    onChange={(value) => {
                                                        const updated = [...dimensionsList];
                                                        updated[index] = {
                                                            ...updated[index],
                                                            volume_cbm: value,
                                                        };
                                                        setDimensionsList(updated);
                                                    }}
                                                    min={0}
                                                    precision={2}
                                                    size="sm"
                                                >
                                                    <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                </NumberInput>
                                            </FormControl>
                                            <FormControl flex="1" minW="150px">
                                                <FormLabel fontSize="sm">CW Air Freight</FormLabel>
                                                <NumberInput
                                                    value={dim.cw_air_freight || ""}
                                                    onChange={(value) => {
                                                        const updated = [...dimensionsList];
                                                        updated[index] = {
                                                            ...updated[index],
                                                            cw_air_freight: value,
                                                        };
                                                        setDimensionsList(updated);
                                                    }}
                                                    min={0}
                                                    precision={2}
                                                    size="sm"
                                                >
                                                    <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                </NumberInput>
                                            </FormControl>
                                        </Flex>
                                    </Box>
                                ))
                            )}
                            <Button
                                leftIcon={<Icon as={MdAdd} />}
                                onClick={() => {
                                    setDimensionsList([...dimensionsList, {
                                        id: null,
                                        calculation_method: "lwh",
                                        length_cm: "",
                                        width_cm: "",
                                        height_cm: "",
                                        volume_dim: "",
                                        volume_cbm: 0.0,
                                        cw_air_freight: 0.0,
                                    }]);
                                }}
                                colorScheme="blue"
                                variant="outline"
                            >
                                Add Dimension
                            </Button>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onDimensionsModalClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={() => {
                                if (dimensionsModalRowIndex !== null) {
                                    const updatedRows = [...formRows];
                                    updatedRows[dimensionsModalRowIndex] = {
                                        ...updatedRows[dimensionsModalRowIndex],
                                        dimensions: dimensionsList,
                                    };
                                    // Recalculate volume_cbm if needed
                                    if (dimensionsList.length > 0 && dimensionsList[0]) {
                                        const dim = dimensionsList[0];
                                        if (dim.calculation_method === "lwh") {
                                            const length = parseFloat(dim.length_cm || 0);
                                            const width = parseFloat(dim.width_cm || 0);
                                            const height = parseFloat(dim.height_cm || 0);
                                            if (length > 0 && width > 0 && height > 0) {
                                                const calculatedCbm = ((length * width * height) / 1000000).toFixed(2);
                                                updatedRows[dimensionsModalRowIndex].volumeCbm = calculatedCbm;
                                            }
                                        } else if (dim.calculation_method === "volume" && dim.volume_dim) {
                                            updatedRows[dimensionsModalRowIndex].volumeCbm = parseFloat(dim.volume_dim);
                                        }
                                    }
                                    setFormRows(updatedRows);
                                }
                                onDimensionsModalClose();
                            }}
                        >
                            Save Dimensions
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

        </Box>
    );
}

