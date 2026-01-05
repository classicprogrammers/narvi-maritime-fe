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
} from "@chakra-ui/react";
import {
    MdChevronLeft,
    MdSave,
    MdDelete,
    MdAttachFile,
    MdClose as MdRemove,
    MdVisibility,
    MdDownload,
    MdFullscreen,
} from "react-icons/md";
import { updateStockItemApi, deleteStockItemApi } from "../../../api/stock";
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
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastAutoSaveTime, setLastAutoSaveTime] = useState(null);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [isSavingBeforeNavigation, setIsSavingBeforeNavigation] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState(null);
    const autoSaveTimeoutRef = React.useRef(null);

    // Modal state for LWH Text field
    const { isOpen: isLWHModalOpen, onOpen: onLWHModalOpen, onClose: onLWHModalClose } = useDisclosure();
    const [lwhModalRowIndex, setLwhModalRowIndex] = useState(null);
    const [lwhModalValue, setLwhModalValue] = useState("");
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
        soNumber: "",
        siNumber: "",
        siCombined: "",
        diNumber: "",
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
        attachments: [], // Array of { filename, mimetype, datas } for new uploads
        attachmentsToDelete: [], // Array of attachment IDs to delete (for updates)
        existingAttachments: [], // Array of existing attachments from API { id, filename, mimetype }
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
            soNumber: normalizeId(stock.so_number_id) || normalizeId(stock.so_number) || normalizeId(stock.stock_so_number) || "",
            siNumber: normalizeId(stock.shipping_instruction_id) || normalizeId(stock.si_number) || normalizeId(stock.stock_shipping_instruction) || "",
            siCombined: getFieldValue(stock.si_combined) || "",
            diNumber: normalizeId(stock.delivery_instruction_id) || normalizeId(stock.di_number) || normalizeId(stock.stock_delivery_instruction) || "",
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
            remarks: getFieldValue(stock.remarks) || "",
            dateOnStock: getFieldValue(stock.date_on_stock) || "",
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            shippedDate: getFieldValue(stock.shipped_date) || "",
            deliveredDate: getFieldValue(stock.delivered_date) || "",
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc) || "",
            items: getFieldValue(stock.items) || getFieldValue(stock.item_id) || getFieldValue(stock.stock_items_quantity) || "",
            item: stock.item || stock.items || stock.item_id || stock.stock_items_quantity || "",
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
            blank: getFieldValue(stock.blank, ""),
            // Internal fields
            vesselDestination: getFieldValue(stock.vessel_destination) || getFieldValue(stock.vessel_destination_text) || "",
            itemId: normalizeId(stock.item_id) || "",
            attachments: [], // New uploads will be added here
            attachmentsToDelete: [], // IDs of attachments to delete
            existingAttachments: Array.isArray(stock.attachments) ? stock.attachments : [], // Existing attachments from API
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    }, []);

    // Load selected items into form
    useEffect(() => {
        if (selectedItemsFromState.length > 0) {
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

    // Handle viewing attachments - simplified like vessel attachments
    const handleViewFile = (attachment) => {
        try {
            let fileUrl = null;

            // Case 1: actual uploaded file (File or Blob)
            if (attachment instanceof File || attachment instanceof Blob) {
                fileUrl = URL.createObjectURL(attachment);
                window.open(fileUrl, '_blank');
                return;
            }
            // Case 2: backend URL
            else if (attachment.url) {
                fileUrl = attachment.url;
                window.open(fileUrl, '_blank');
                return;
            }
            // Case 3: base64 data (most common for attachments) - convert to blob
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
                    // Fall back to download if viewing fails
                    handleDownloadFile(attachment);
                    return;
                }
            }
            // Case 4: construct URL from attachment ID
            else if (attachment.id) {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
                fileUrl = `${baseUrl}/web/content/${attachment.id}`;
                window.open(fileUrl, '_blank');
                return;
            }
            // Case 5: file path
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

    // Handle downloading attachments - simplified like vessel attachments
    const handleDownloadFile = (attachment) => {
        try {
            let fileUrl = null;
            let fileName = attachment.filename || attachment.name || 'download';

            // Case 1: actual uploaded file (File or Blob)
            if (attachment instanceof File || attachment instanceof Blob) {
                fileUrl = URL.createObjectURL(attachment);
            }
            // Case 2: backend URL
            else if (attachment.url) {
                fileUrl = attachment.url;
            }
            // Case 3: base64 data (most common for attachments)
            else if (attachment.datas) {
                const mimeType = attachment.mimetype || "application/octet-stream";
                fileUrl = `data:${mimeType};base64,${attachment.datas}`;
            }
            // Case 4: construct URL from attachment ID
            else if (attachment.id) {
                const baseUrl = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL || "";
                fileUrl = `${baseUrl}/web/content/${attachment.id}?download=true`;
            }
            // Case 5: file path
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
            ["poNumber", "po_text", (v) => v || ""],
            ["pic", "pic_new", (v) => v ? String(v) : false],
            ["itemId", "item_id", (v) => v ? String(v) : ""],
            ["itemId", "stock_items_quantity", (v) => v ? String(v) : ""],
            ["currency", "currency_id", (v) => v ? String(v) : ""],
            ["origin_text", "origin_text", (v) => v ? String(v) : ""],
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
            ["item", "item", (v) => v !== "" && v !== null && v !== undefined ? toNumber(v) || 0 : 0],
            ["vesselDestination", "vessel_destination", (v) => v || ""],
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

    // Check if there are unsaved changes
    const hasUnsavedChanges = useCallback(() => {
        if (formRows.length === 0 || originalRows.length === 0) {
            return false;
        }
        return formRows.some((row, index) => {
            if (!row.stockId) return false;
            const originalRow = originalRows[index] || {};
            const payload = getPayload(row, originalRow, true);
            return Object.keys(payload).filter(key =>
                key !== 'stock_id' && key !== 'stock_item_id'
            ).length > 0;
        });
    }, [formRows, originalRows]);

    // Auto-save function (saves without navigation)
    const handleAutoSave = useCallback(async (silent = false) => {
        if (formRows.length === 0) {
            return;
        }

        // Check if there are any changes
        const lines = formRows.map((row, index) => {
            if (!row.stockId) {
                return null;
            }
            const originalRow = originalRows[index] || {};
            const payload = getPayload(row, originalRow, true);
            const hasChanges = Object.keys(payload).filter(key =>
                key !== 'stock_id' && key !== 'stock_item_id'
            ).length > 0;
            return hasChanges ? payload : null;
        }).filter(line => line !== null);

        if (lines.length === 0) {
            return; // No changes to save
        }

        setIsAutoSaving(true);
        try {
            const payload = { lines };
            const result = await updateStockItemApi(formRows[0]?.stockId, payload);

            if (result && result.result && result.result.status === 'success') {
                // Update originalRows to reflect saved state
                setOriginalRows(formRows.map(row => ({ ...row })));
                setLastAutoSaveTime(new Date());

                if (!silent) {
                    toast({
                        title: 'Auto-saved',
                        description: `Your changes have been automatically saved`,
                        status: 'success',
                        duration: 2000,
                        isClosable: true,
                    });
                }
            } else {
                throw new Error(result?.result?.message || result?.message || "Failed to auto-save");
            }
        } catch (error) {
            console.error("Failed to auto-save stock items:", error);
            if (!silent) {
                toast({
                    title: "Auto-save failed",
                    description: error.message || "Failed to auto-save changes. Please save manually.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                });
            }
        } finally {
            setIsAutoSaving(false);
        }
    }, [formRows, originalRows, updateStockItemApi, toast]);

    // Save before navigation (blocking save with modal)
    const saveBeforeNavigation = useCallback(async (navigationCallback) => {
        if (!hasUnsavedChanges()) {
            // No changes, proceed with navigation
            if (navigationCallback) navigationCallback();
            return;
        }

        setIsSavingBeforeNavigation(true);
        try {
            const lines = formRows.map((row, index) => {
                if (!row.stockId) {
                    return null;
                }
                const originalRow = originalRows[index] || {};
                const payload = getPayload(row, originalRow, true);
                const hasChanges = Object.keys(payload).filter(key =>
                    key !== 'stock_id' && key !== 'stock_item_id'
                ).length > 0;
                return hasChanges ? payload : null;
            }).filter(line => line !== null);

            if (lines.length > 0) {
                const payload = { lines };
                const result = await updateStockItemApi(formRows[0]?.stockId, payload);

                if (result && result.result && result.result.status === 'success') {
                    setOriginalRows(formRows.map(row => ({ ...row })));
                    setLastAutoSaveTime(new Date());
                    toast({
                        title: 'Saved',
                        description: 'Your changes have been saved before leaving the page',
                        status: 'success',
                        duration: 2000,
                        isClosable: true,
                    });
                    // Proceed with navigation after successful save
                    if (navigationCallback) navigationCallback();
                } else {
                    throw new Error(result?.result?.message || result?.message || "Failed to save");
                }
            } else {
                // No changes to save, proceed with navigation
                if (navigationCallback) navigationCallback();
            }
        } catch (error) {
            console.error("Failed to save before navigation:", error);
            toast({
                title: "Save failed",
                description: error.message || "Failed to save changes. Please try again.",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
            // Don't navigate if save failed
        } finally {
            setIsSavingBeforeNavigation(false);
        }
    }, [formRows, originalRows, hasUnsavedChanges, updateStockItemApi, toast]);

    // Auto-save on form changes (debounced)
    useEffect(() => {
        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        // Only auto-save if there are changes and formRows are loaded
        if (formRows.length === 0 || originalRows.length === 0) {
            return;
        }

        // Check if there are any changes
        const hasChanges = formRows.some((row, index) => {
            if (!row.stockId) return false;
            const originalRow = originalRows[index] || {};
            const payload = getPayload(row, originalRow, true);
            return Object.keys(payload).filter(key =>
                key !== 'stock_id' && key !== 'stock_item_id'
            ).length > 0;
        });

        if (!hasChanges) {
            return;
        }

        // Debounce auto-save: wait 3 seconds after last change
        autoSaveTimeoutRef.current = setTimeout(() => {
            // Show toast notification when auto-saving
            toast({
                title: 'Auto-saving...',
                description: 'Your changes are being saved automatically',
                status: 'info',
                duration: 2000,
                isClosable: true,
            });
            handleAutoSave(false); // Show toast on success
        }, 3000);

        // Cleanup timeout on unmount or when formRows change
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [formRows, originalRows, handleAutoSave]);

    // Auto-save on page unload/beforeunload (show warning and attempt to save)
    useEffect(() => {
        const handleBeforeUnload = async (e) => {
            if (hasUnsavedChanges()) {
                // Show browser warning
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. They will be saved automatically.';

                // Attempt to save synchronously (limited by browser, but we try)
                // Note: Modern browsers limit what can be done in beforeunload
                // The actual save will happen via the visibility change handler if possible
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    // Auto-save when page becomes hidden (user switches tabs, minimizes, etc.)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && hasUnsavedChanges()) {
                // Show toast and trigger auto-save when page becomes hidden
                toast({
                    title: 'Saving changes...',
                    description: 'Your changes are being saved automatically',
                    status: 'info',
                    duration: 2000,
                    isClosable: true,
                });
                handleAutoSave(true);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [hasUnsavedChanges, handleAutoSave, toast]);


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
            {/* Saving Modal Overlay */}
            {isSavingBeforeNavigation && (
                <Modal isOpen={true} onClose={() => { }} closeOnOverlayClick={false} closeOnEsc={false} isCentered>
                    <ModalOverlay bg="blackAlpha.600" />
                    <ModalContent>
                        <ModalBody py={6} textAlign="center">
                            <Spinner size="xl" color="blue.500" mb={4} />
                            <Text fontSize="lg" fontWeight="600" color={textColor} mb={2}>
                                Saving your changes...
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                                Please wait while we save your data to prevent any loss.
                            </Text>
                        </ModalBody>
                    </ModalContent>
                </Modal>
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
                            saveBeforeNavigation(() => {
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
                            });
                        }}
                        isDisabled={isSavingBeforeNavigation}
                    />
                    <VStack align="start" spacing={0}>
                        <Text fontSize="xl" fontWeight="600" color={textColor}>
                            {isBulkEdit
                                ? `Edit Stock Items (${currentItemIndex + 1} of ${formRows.length})`
                                : "Edit Stock Item"}
                        </Text>
                        {isAutoSaving && (
                            <Text fontSize="xs" color="blue.500" mt={1}>
                                Auto-saving...
                            </Text>
                        )}
                        {lastAutoSaveTime && !isAutoSaving && (
                            <Text fontSize="xs" color="green.500" mt={1}>
                                Last saved: {lastAutoSaveTime.toLocaleTimeString()}
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Exp ready from supplier</Th>
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
                                            options={suppliers}
                                            placeholder="Select Supplier"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Supplier ${option.id}`}
                                            isLoading={isLoadingSuppliers}
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
                                        <Box position="relative">
                                            <Input
                                                list={`origin-countries-${rowIndex}`}
                                                value={row.origin_text || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "origin_text", e.target.value)}
                                                placeholder="Type or select country..."
                                                size="sm"
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
                                            value={row.items || ""}
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
        </Box>
    );
}

