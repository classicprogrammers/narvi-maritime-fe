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
    MdAttachFile,
    MdClose as MdRemove,
    MdVisibility,
    MdDownload,
} from "react-icons/md";
import { updateStockItemApi, deleteStockItemApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import { getCustomersForSelect, getVesselsForSelect, getDestinationsForSelect } from "../../../api/entitySelects";
import { getVendorsApi } from "../../../api/vendor";
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
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);
    const [isLoadingVendors, setIsLoadingVendors] = useState(false);
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
        py: "8px",
        px: "8px",
        minW: "130px",
        maxW: "200px",
    };

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
        vesselsProspects: "",
        soNumber: "",
        siNumber: "",
        siCombined: "",
        diNumber: "",
        stockStatus: "",
        supplier: "",
        poNumber: "",
        extra2: "",
        origin: "",
        viaHub1: "",
        viaHub2: "",
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
        pic: null, // PIC ID
        soStatus: "",
        attachments: [], // Array of { filename, mimetype, datas } for new uploads
        attachmentsToDelete: [], // Array of attachment IDs to delete (for updates)
        existingAttachments: [], // Array of existing attachments from API { id, filename, mimetype }
        vesselDest: "",
        vesselEta: "",
        blank: "",
        // Internal fields for API payload
        vesselDestination: "",
        itemId: "",
        item: 1,
    });

    // Form state - array of rows
    const [formRows, setFormRows] = useState([getEmptyRow()]);
    // Store original data for comparison
    const [originalRows, setOriginalRows] = useState([]);

    // Helper to get SO status from shipping order
    const getSoStatusFromShippingOrder = useCallback((stock) => {
        // Try to find shipping order by so_number_id
        if (stock.so_number_id) {
            const so = shippingOrders.find(s => String(s.id) === String(stock.so_number_id));
            if (so && so.done) {
                return so.done === "active" ? "Active" : so.done === "pending" ? "Pending POD" : so.done;
            }
        }
        // Try to find by stock_so_number
        if (stock.stock_so_number) {
            const so = shippingOrders.find(s =>
                String(s.so_number || s.name || "") === String(stock.stock_so_number) ||
                String(s.id) === String(stock.stock_so_number)
            );
            if (so && so.done) {
                return so.done === "active" ? "Active" : so.done === "pending" ? "Pending POD" : so.done;
            }
        }
        return stock.so_status || "";
    }, [shippingOrders]);

    // Helper to get vessel destination and ETA from vessel
    const getVesselData = useCallback((stock) => {
        const vesselId = stock.vessel_id || stock.vessel;
        if (vesselId) {
            const vessel = vessels.find(v => String(v.id) === String(vesselId));
            if (vessel) {
                return {
                    destination: vessel.destination || stock.vessel_destination || stock.vessel_destination_text || stock.destination || "",
                    eta: vessel.eta || stock.vessel_eta || ""
                };
            }
        }
        return {
            destination: stock.vessel_destination || stock.vessel_destination_text || stock.destination || "",
            eta: stock.vessel_eta || ""
        };
    }, [vessels]);

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

        // Get vessel data
        const vesselData = getVesselData(stock);
        // Get SO status
        const soStatusValue = getSoStatusFromShippingOrder(stock);

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
            vesselsProspects: getFieldValue(stock.vessels_prospects, ""),
            soNumber: normalizeId(stock.so_number_id) || normalizeId(stock.so_number) || normalizeId(stock.stock_so_number) || "",
            siNumber: normalizeId(stock.shipping_instruction_id) || normalizeId(stock.si_number) || normalizeId(stock.stock_shipping_instruction) || "",
            siCombined: getFieldValue(stock.si_combined) || "",
            diNumber: normalizeId(stock.delivery_instruction_id) || normalizeId(stock.di_number) || normalizeId(stock.stock_delivery_instruction) || "",
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            poNumber: getFieldValue(stock.po_text) || getFieldValue(stock.po_number) || "",
            extra2: getFieldValue(stock.extra_2) || getFieldValue(stock.extra) || "",
            origin: normalizeId(stock.origin_id) || normalizeId(stock.origin) || "",
            viaHub1: getFieldValue(stock.via_hub, ""),
            viaHub2: getFieldValue(stock.via_hub2, ""),
            apDestination: getFieldValue(stock.ap_destination_new) || getFieldValue(stock.ap_destination) || "",
            destination: getFieldValue(stock.destination_new) || getFieldValue(stock.destination) || "",
            warehouseId: getFieldValue(stock.warehouse_new) || getFieldValue(stock.warehouse_id) || "",
            shippingDoc: getFieldValue(stock.shipping_doc) || "",
            exportDoc: getFieldValue(stock.export_doc) || "",
            remarks: getFieldValue(stock.remarks) || "",
            dateOnStock: getFieldValue(stock.date_on_stock) || "",
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            shippedDate: getFieldValue(stock.shipped_date) || "",
            deliveredDate: getFieldValue(stock.delivered_date) || "",
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc) || "",
            items: getFieldValue(stock.items) || getFieldValue(stock.item_id) || getFieldValue(stock.stock_items_quantity) || "",
            item: toNumber(stock.item) || toNumber(stock.items) || toNumber(stock.item_id) || toNumber(stock.stock_items_quantity) || 1,
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
            pic: normalizeId(stock.pic_new) || normalizeId(stock.pic_id) || normalizeId(stock.pic) || null, // PIC ID
            soStatus: soStatusValue,
            vesselDest: vesselData.destination,
            vesselEta: vesselData.eta,
            blank: getFieldValue(stock.blank, ""),
            // Internal fields
            vesselDestination: vesselData.destination,
            itemId: normalizeId(stock.item_id) || "",
            attachments: [], // New uploads will be added here
            attachmentsToDelete: [], // IDs of attachments to delete
            existingAttachments: Array.isArray(stock.attachments) ? stock.attachments : [], // Existing attachments from API
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    }, [getVesselData, getSoStatusFromShippingOrder]);

    // Load selected items into form
    useEffect(() => {
        if (selectedItemsFromState.length > 0) {
            console.log("Loading stock items from state:", selectedItemsFromState);
            const rows = selectedItemsFromState.map((item) => {
                return loadFormDataFromStock(item, true);
            });
            setFormRows(rows.length > 0 ? rows : [getEmptyRow()]);
            // Store original data for comparison
            setOriginalRows(rows.length > 0 ? rows.map(row => ({ ...row })) : [getEmptyRow()]);
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

    // Helper function to clean and prepare base64 data
    const cleanBase64Data = (data) => {
        if (!data) return null;
        
        let cleaned = String(data).trim();
        
        // Remove data URI prefix if present (e.g., "data:application/pdf;base64,")
        if (cleaned.includes(',')) {
            cleaned = cleaned.split(',')[1];
        }
        
        // Remove any whitespace, newlines, or other non-base64 characters
        cleaned = cleaned.replace(/\s/g, '');
        
        // Handle URL-safe base64 encoding (replace - with + and _ with /)
        cleaned = cleaned.replace(/-/g, '+').replace(/_/g, '/');
        
        // Validate base64 format (should only contain A-Z, a-z, 0-9, +, /, and =)
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(cleaned)) {
            console.warn('Base64 data contains invalid characters, attempting to clean...');
            // Remove any characters that aren't valid base64
            cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, '');
        }
        
        // Ensure proper padding - base64 strings must have length that's a multiple of 4
        const paddingNeeded = (4 - (cleaned.length % 4)) % 4;
        if (paddingNeeded > 0) {
            // Remove any existing padding first
            cleaned = cleaned.replace(/=+$/, '');
            // Add correct padding
            cleaned += '='.repeat(paddingNeeded);
        }
        
        // Final validation - check if the cleaned string is valid base64
        if (cleaned.length === 0) {
            console.warn('Base64 data is empty after cleaning');
            return null;
        }
        
        // Verify the string can be decoded (basic check)
        if (cleaned.length % 4 !== 0) {
            console.warn('Base64 data length is not a multiple of 4:', cleaned.length);
            // Try to fix by adding padding
            const fixPadding = (4 - (cleaned.length % 4)) % 4;
            cleaned += '='.repeat(fixPadding);
        }
        
        return cleaned;
    };

    // Handle viewing attachments
    const handleViewFile = (attachment) => {
        try {
            let fileUrl = null;
            let blobUrl = null; // Track blob URLs for cleanup

            // Case 1: base64 data (most common for attachments)
            if (attachment.datas) {
                const mimeType = attachment.mimetype || "application/octet-stream";
                const base64Data = cleanBase64Data(attachment.datas);
                
                if (!base64Data) {
                    toast({
                        title: 'Error',
                        description: 'Invalid file data format',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                    return;
                }
                
                try {
                    // Validate base64 string before attempting to decode
                    if (base64Data.length === 0) {
                        throw new Error('Base64 data is empty');
                    }

                    // Check if length is valid (should be multiple of 4 after padding)
                    if (base64Data.length % 4 !== 0) {
                        throw new Error(`Invalid base64 length: ${base64Data.length} (must be multiple of 4)`);
                    }

                    // Convert base64 to blob for better browser compatibility
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    
                    blobUrl = URL.createObjectURL(blob);
                    fileUrl = blobUrl;
                } catch (base64Error) {
                    console.error('Error decoding base64:', base64Error, {
                        dataLength: base64Data?.length,
                        firstChars: base64Data?.substring(0, 50),
                        lastChars: base64Data?.substring(Math.max(0, base64Data?.length - 20)),
                        mimeType
                    });
                    toast({
                        title: 'Error',
                        description: `Failed to decode file data. The file may be corrupted or in an unsupported format. ${base64Error.message ? `Error: ${base64Error.message}` : ''}`,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    return;
                }
            }
            // Case 2: backend URL
            else if (attachment.url) {
                fileUrl = attachment.url;
            }
            // Case 3: construct URL from attachment ID
            else if (attachment.id) {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
                fileUrl = `${baseUrl}/web/content/${attachment.id}`;
            }
            // Case 4: file path
            else if (attachment.path) {
                fileUrl = attachment.path;
            }

            if (fileUrl) {
                // Open in new tab
                const newWindow = window.open(fileUrl, '_blank');
                
                // Clean up blob URL after a delay (once it's opened)
                if (blobUrl) {
                    setTimeout(() => {
                        URL.revokeObjectURL(blobUrl);
                    }, 1000);
                }
                
                // If window.open failed, try download instead
                if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                    handleDownloadFile(attachment);
                }
            } else {
                toast({
                    title: 'Error',
                    description: 'Unable to view file. File data not available.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
            }
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

    const handleDownloadFile = (attachment) => {
        try {
            let fileUrl = null;
            let blobUrl = null; // Track blob URLs for cleanup
            let fileName = attachment.filename || attachment.name || 'download';

            // Case 1: base64 data
            if (attachment.datas) {
                const mimeType = attachment.mimetype || "application/octet-stream";
                const base64Data = cleanBase64Data(attachment.datas);
                
                if (!base64Data) {
                    toast({
                        title: 'Error',
                        description: 'Invalid file data format',
                        status: 'error',
                        duration: 3000,
                        isClosable: true,
                    });
                    return;
                }
                
                try {
                    // Validate base64 string before attempting to decode
                    if (base64Data.length === 0) {
                        throw new Error('Base64 data is empty');
                    }

                    // Check if length is valid (should be multiple of 4 after padding)
                    if (base64Data.length % 4 !== 0) {
                        throw new Error(`Invalid base64 length: ${base64Data.length} (must be multiple of 4)`);
                    }

                    // Convert base64 to blob and download
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    
                    blobUrl = URL.createObjectURL(blob);
                    fileUrl = blobUrl;
                } catch (base64Error) {
                    console.error('Error decoding base64:', base64Error, {
                        dataLength: base64Data?.length,
                        firstChars: base64Data?.substring(0, 50),
                        lastChars: base64Data?.substring(Math.max(0, base64Data?.length - 20)),
                        mimeType
                    });
                    toast({
                        title: 'Error',
                        description: `Failed to decode file data. The file may be corrupted or in an unsupported format. ${base64Error.message ? `Error: ${base64Error.message}` : ''}`,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    return;
                }
            }
            // Case 2: backend URL
            else if (attachment.url) {
                fileUrl = attachment.url;
            }
            // Case 3: construct URL from attachment ID
            else if (attachment.id) {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
                fileUrl = `${baseUrl}/web/content/${attachment.id}?download=true`;
            }
            // Case 4: file path
            else if (attachment.path) {
                fileUrl = attachment.path;
            }

            if (fileUrl) {
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up blob URL after download
                if (blobUrl) {
                    setTimeout(() => {
                        URL.revokeObjectURL(blobUrl);
                    }, 100);
                }
            } else {
                toast({
                    title: 'Error',
                    description: 'Unable to download file. File data not available.',
                    status: 'error',
                    duration: 3000,
                    isClosable: true,
                });
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
            newRows[rowIndex] = {
                ...newRows[rowIndex],
                [field]: value
            };
            return newRows;
        });
    };

    // Helper to compare values (handles different data types)
    const valuesAreEqual = (val1, val2) => {
        // Handle null/undefined/empty
        if ((!val1 || val1 === false || val1 === "") && (!val2 || val2 === false || val2 === "")) return true;
        // Handle numbers - compare as numbers
        if (typeof val1 === "number" && typeof val2 === "number") return val1 === val2;
        // Handle booleans
        if (typeof val1 === "boolean" && typeof val2 === "boolean") return val1 === val2;
        // Convert both to strings for comparison
        return String(val1 || "") === String(val2 || "");
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
            ["vesselsProspects", "vessels_prospects", (v) => v || ""],
            ["poNumber", "po_text", (v) => v || ""],
            ["pic", "pic_new", (v) => v ? String(v) : false],
            ["itemId", "item_id", (v) => v ? String(v) : ""],
            ["itemId", "stock_items_quantity", (v) => v ? String(v) : ""],
            ["currency", "currency_id", (v) => v ? String(v) : ""],
            ["origin", "origin", (v) => v ? String(v) : ""],
            ["apDestination", "ap_destination_new", (v) => v || ""], // Free text field
            ["viaHub1", "via_hub", (v) => v || ""],
            ["viaHub2", "via_hub2", (v) => v || ""],
            ["clientAccess", "client_access", (v) => Boolean(v)],
            ["remarks", "remarks", (v) => v || ""],
            ["weightKgs", "weight_kg", (v) => toNumber(v) || 0],
            ["widthCm", "width_cm", (v) => toNumber(v) || 0],
            ["lengthCm", "length_cm", (v) => toNumber(v) || 0],
            ["heightCm", "height_cm", (v) => toNumber(v) || 0],
            ["volumeNoDim", "volume_dim", (v) => toNumber(v) || 0],
            ["volumeCbm", "volume_cbm", (v) => toNumber(v) || 0],
            ["lwhText", "lwh_text", (v) => v || ""],
            ["cwAirfreight", "cw_freight", (v) => toNumber(v) || 0],
            ["value", "value", (v) => toNumber(v) || 0],
            ["extra2", "extra", (v) => v || ""],
            ["destination", "destination_new", (v) => v || ""],
            // Attachments
            ["attachments", "attachments", (v) => v || []],
            ["attachmentsToDelete", "attachment_to_delete", (v) => v || []],
            ["warehouseId", "warehouse_new", (v) => v || ""],
            ["shippingDoc", "shipping_doc", (v) => v || ""],
            ["exportDoc", "export_doc", (v) => v || ""],
            ["dateOnStock", "date_on_stock", (v) => v || ""],
            ["expReadyInStock", "exp_ready_in_stock", (v) => v || ""],
            ["shippedDate", "shipped_date", (v) => v || null],
            ["deliveredDate", "delivered_date", (v) => v || ""],
            ["details", "details", (v) => v || ""],
            ["item", "item", (v) => toNumber(v) || 1],
            ["vesselDestination", "vessel_destination", (v) => v || ""],
            ["vesselEta", "vessel_eta", (v) => v || ""],
            ["soNumber", "stock_so_number", (v) => v ? String(v) : ""],
            ["siNumber", "stock_shipping_instruction", (v) => v ? String(v) : ""],
            ["diNumber", "stock_delivery_instruction", (v) => v ? String(v) : ""],
            ["vesselDestination", "vessel_destination_text", (v) => v || ""],
        ];

        // Only include changed fields
        fieldMappings.forEach(([frontendField, backendField, transform]) => {
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
        if (Object.keys(payload).length > (payload.stock_id ? 1 : 0) + (payload.stock_item_id ? 1 : 0)) {
            payload.shipment_type = "";
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
            // Build lines array from all form rows - only include changed fields
            const lines = formRows.map((row, index) => {
                if (!row.stockId) {
                    throw new Error("Stock ID is required for update");
                }
                const originalRow = originalRows[index] || {};
                const payload = getPayload(row, originalRow, true);
                // Only include if there are changes (besides stock_id and stock_item_id)
                const hasChanges = Object.keys(payload).filter(key =>
                    key !== 'stock_id' && key !== 'stock_item_id'
                ).length > 0;
                return hasChanges ? payload : null;
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
                toast({
                    title: 'Success',
                    description: `${lines.length} stock item(s) updated successfully (${formRows.length - lines.length} item(s) had no changes)`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                // Refresh stock list and go back
                await getStockList();
                history.push("/admin/stock-list/stocks");
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessels Prospects</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SO Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SI Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SI Combined</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DI Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Stock Status</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PO Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Extra 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Origin</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">HUB 1</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">HUB 2</Th>
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DG/UN Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Pcs</Th>
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Files</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PIC</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SO Status</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel Dest</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel ETA</Th>
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
                                            bg={useColorModeValue("gray.100", "gray.700")}
                                            color={inputText}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.slCreateDate || ""}
                                            isReadOnly
                                            size="sm"
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
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Textarea
                                            value={row.vesselsProspects || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "vesselsProspects", e.target.value)}
                                            placeholder="ETB&#10;ETA&#10;ETD"
                                            size="sm"
                                            rows={3}
                                            resize="vertical"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.origin}
                                            onChange={(value) => handleInputChange(rowIndex, "origin", value)}
                                            options={countries.filter(c => c && (c.id || c.country_id)).map(c => {
                                                const countryId = c.id || c.country_id;
                                                return {
                                                    id: String(countryId),
                                                    name: c.name || c.code || `Country ${countryId}`
                                                };
                                            })}
                                            placeholder="Select Origin"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Country ${option.id}`}
                                            isLoading={isLoadingCountries}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.viaHub1 || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub1", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.viaHub2 || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub2", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.apDestination || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "apDestination", e.target.value)}
                                            placeholder="Enter AP Destination"
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
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
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Textarea
                                            value={row.warehouseId || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "warehouseId", e.target.value)}
                                            placeholder="Enter Warehouse ID"
                                            size="sm"
                                            rows={2}
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
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
                                        <NumberInput
                                            value={row.items || 0}
                                            onChange={(value) => handleInputChange(rowIndex, "items", value)}
                                            min={0}
                                            precision={0}
                                            size="sm"
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
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
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
                                        />
                                    </Td>
                                    <Td {...cellProps}>
                                        <Checkbox
                                            isChecked={row.clientAccess}
                                            onChange={(e) => handleInputChange(rowIndex, "clientAccess", e.target.checked)}
                                            size="sm"
                                        />
                                    </Td>
                                    {/* Files - Upload/Download button */}
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
                                                            aria-label="Download file"
                                                            icon={<Icon as={MdDownload} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="blue"
                                                            onClick={() => handleDownloadFile(att)}
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
                                                            aria-label="Download file"
                                                            icon={<Icon as={MdDownload} />}
                                                            size="xs"
                                                            variant="ghost"
                                                            colorScheme="blue"
                                                            onClick={() => handleDownloadFile(att)}
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
                                        />
                                    </Td>
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.vesselDest || row.vesselDestination || ""}
                                            onChange={(e) => {
                                                handleInputChange(rowIndex, "vesselDest", e.target.value);
                                                handleInputChange(rowIndex, "vesselDestination", e.target.value);
                                            }}
                                            placeholder="Enter Vessel Destination"
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td {...cellProps}>
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
                                    <Td {...cellProps}>
                                        <Input
                                            value={row.blank || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "blank", e.target.value)}
                                            placeholder=""
                                            size="sm"
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

