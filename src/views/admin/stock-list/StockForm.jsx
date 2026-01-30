import React, { useState, useEffect, useCallback } from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
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
} from "@chakra-ui/react";
import {
    MdChevronLeft,
    MdSave,
    MdAdd,
    MdContentCopy,
    MdDelete,
    MdAttachFile,
    MdClose as MdRemove,
} from "react-icons/md";
import { createStockItemApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import currenciesAPI from "../../../api/currencies";
import picAPI from "../../../api/pic";
import { useMasterData } from "../../../hooks/useMasterData";
import { getCached, MASTER_KEYS } from "../../../utils/masterDataCache";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

export default function StockForm() {
    const history = useHistory();
    const location = useLocation();
    const { id } = useParams();
    const searchParams = new URLSearchParams(location.search);
    const bulkIds = searchParams.get('ids');
    const isBulkEdit = !!bulkIds;
    const isEditing = !!id || isBulkEdit;
    const toast = useToast();
    const { updateStockItem, getStockList, updateLoading, stockList } = useStock();
    const { clients, vessels, countries, refreshClients, refreshVessels } = useMasterData();
    const [isLoading, setIsLoading] = useState(isEditing);
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [currencies, setCurrencies] = useState([]);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);

    const textColor = useColorModeValue("gray.700", "white");
    const inputBg = useColorModeValue("gray.100", "gray.800");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");

    // Default empty row template – only keep fields that exist in the UI
    const getEmptyRow = () => ({
        id: Date.now() + Math.random(), // Unique ID for each row
        stockId: null, // Store the original stock ID for updates
        stockItemId: "",
        client: "",
        vessel: "",
        pic: null, // PIC ID
        stockStatus: "",
        supplier: "",
        // Allow multiple PO numbers via multi-line text (one per line)
        poNumber: "",
        warehouseId: "",
        shippingDoc: "",
        items: "",
        weightKgs: "",
        // Dimensions array structure
        dimensions: [{
            id: null,
            calculation_method: "lwh", // "lwh" or "volume"
            length_cm: "",
            width_cm: "",
            height_cm: "",
            volume_dim: "",
            volume_cbm: 0.0,
            cw_air_freight: 0.0,
        }],
        // Allow multiple LWH entries via multi-line text (one per line)
        lwhText: "",
        details: "",
        value: "",
        currency: "",
        origin_text: "",
        viaHub: "", // Free text field
        viaHub2: "", // Free text field
        expReadyInStock: "", // Date field
        remarks: "",
        blank: "",
        clientAccess: false,
        // Internal fields for API payload (auto-filled or calculated)
        vesselDestination: "", // Auto-filled from vessel
        vesselEta: "", // Auto-filled from vessel
        destination: "", // Auto-filled from vessel (destination field)
        apDestination: "", // AP Destination - Free text
        itemId: "",
        item: "",
        volumeCbm: "",
        attachments: [], // Array of { filename, mimetype, datas } for new uploads
        attachmentsToDelete: [], // Array of attachment IDs to delete (for updates)
        existingAttachments: [], // Array of existing attachments from API { id, filename, mimetype }
    });

    // Form state - array of rows
    const [formRows, setFormRows] = useState([getEmptyRow()]);

    // Load stock items for bulk edit or single edit
    const ensureStockData = useCallback(async () => {
        if (stockList && stockList.length > 0) {
            return stockList;
        }

        const response = await getStockList();
        if (response?.data?.stock_list) return response.data.stock_list;
        if (response?.stock_list) return response.stock_list;
        return [];
    }, [stockList, getStockList]);

    useEffect(() => {
        const loadStockItems = async () => {
            if (!(isBulkEdit && bulkIds) && !(isEditing && id)) {
                return;
            }

            setIsLoading(true);
            try {
                const availableStock = await ensureStockData();

                if (isBulkEdit && bulkIds) {
                    const ids = bulkIds
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean);

                    const items = ids
                        .map((itemId) => {
                            const match = availableStock.find(
                                (stock) => String(stock.id) === String(itemId)
                            );
                            return match ? { ...match } : null;
                        })
                        .filter(Boolean);

                    if (items.length === 0) {
                        throw new Error("Selected stock items were not found.");
                    }

                    setSelectedItems(items);
                    // Load all selected items as separate rows for bulk edit
                    const rows = items.map((item) => {
                        const rowData = loadFormDataFromStock(item, true);
                        return rowData;
                    });
                    setFormRows(rows.length > 0 ? rows : [getEmptyRow()]);
                } else if (isEditing && id) {
                    const match = availableStock.find(
                        (stock) => String(stock.id) === String(id)
                    );

                    if (!match) {
                        throw new Error("Stock item could not be found.");
                    }

                    loadFormDataFromStock(match);
                }
            } catch (error) {
                console.error("Failed to load stock items:", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to load stock items",
                    status: "error",
                    duration: 5000,
                    isClosable: true,
                });
                history.push("/admin/stock-list/main-db");
            } finally {
                setIsLoading(false);
            }
        };

        loadStockItems();
    }, [
        id,
        isEditing,
        isBulkEdit,
        bulkIds,
        history,
        toast,
        ensureStockData,
    ]);

    // Fetch currencies and PICs on mount (clients, vessels, countries from master cache)
    useEffect(() => {
        const fetchCurrenciesAndPICs = async () => {
            try {
                setIsLoadingCurrencies(true);
                const currenciesResponse = await currenciesAPI.getCurrencies();
                const currenciesData = (currenciesResponse && Array.isArray(currenciesResponse.currencies))
                    ? currenciesResponse.currencies
                    : (Array.isArray(currenciesResponse) ? currenciesResponse : []);
                setCurrencies(currenciesData || []);
            } catch (error) {
                console.error('Failed to fetch currencies:', error);
                toast({
                    title: 'Warning',
                    description: 'Failed to load currencies',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingCurrencies(false);
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
                toast({
                    title: 'Warning',
                    description: 'Failed to load PICs',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingPICs(false);
            }
        };

        refreshClients();
        refreshVessels();
        fetchCurrenciesAndPICs();
    }, [toast, refreshClients, refreshVessels]);

    useEffect(() => {
        if (!currencies.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.currency) {
                    return row;
                }
                const normalizedValue = String(row.currency);
                // Try exact ID match first
                const exactMatch = currencies.find((currency) => String(currency.id) === normalizedValue);
                if (exactMatch) {
                    return { ...row, currency: String(exactMatch.id) };
                }
                // Try fallback matching by name/code/symbol
                const fallbackMatch = currencies.find(
                    (currency) =>
                        String(currency.name)?.toLowerCase() === normalizedValue.toLowerCase() ||
                        String(currency.full_name)?.toLowerCase() === normalizedValue.toLowerCase() ||
                        String(currency.symbol)?.toLowerCase() === normalizedValue.toLowerCase() ||
                        String(currency.code)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                return fallbackMatch ? { ...row, currency: String(fallbackMatch.id) } : row;
            })
        );
    }, [currencies]);

    // Sync form rows from cache (read getCached inside effect + refs to avoid infinite loop from useMasterData refs)
    const hasSyncedCountriesRef = React.useRef(false);
    const hasSyncedClientsRef = React.useRef(false);
    const hasSyncedVesselsRef = React.useRef(false);

    useEffect(() => {
        if (!formRows.length) return;
        const countriesList = getCached(MASTER_KEYS.COUNTRIES) ?? [];
        if (!countriesList.length || hasSyncedCountriesRef.current) return;
        hasSyncedCountriesRef.current = true;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.origin_text) return row;
                const normalizedValue = String(row.origin_text);
                if (!/^\d+$/.test(normalizedValue)) return row;
                const country = countriesList.find((c) => String(c.id || c.country_id) === normalizedValue);
                if (country) return { ...row, origin_text: country.name || country.code || normalizedValue };
                return row;
            })
        );
    }, [formRows]);

    useEffect(() => {
        if (!formRows.length) return;
        const clientsList = getCached(MASTER_KEYS.CLIENTS) ?? [];
        if (!clientsList.length || hasSyncedClientsRef.current) return;
        hasSyncedClientsRef.current = true;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.client || row.client === "" || row.client === false) return row;
                const normalizedValue = String(row.client);
                const exactMatch = clientsList.find((client) => String(client.id) === normalizedValue);
                if (exactMatch) return { ...row, client: String(exactMatch.id) };
                const fallbackMatch = clientsList.find((client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase());
                if (fallbackMatch) return { ...row, client: String(fallbackMatch.id) };
                return row;
            })
        );
    }, [formRows]);

    useEffect(() => {
        if (!formRows.length) return;
        const vesselsList = getCached(MASTER_KEYS.VESSELS) ?? [];
        if (!vesselsList.length || hasSyncedVesselsRef.current) return;
        hasSyncedVesselsRef.current = true;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.vessel || row.vessel === "" || row.vessel === false) return row;
                const normalizedValue = String(row.vessel);
                const exactMatch = vesselsList.find((vessel) => String(vessel.id) === normalizedValue);
                if (exactMatch) {
                    const updatedRow = { ...row, vessel: String(exactMatch.id) };
                    const vesselDestId = exactMatch.destination_id || exactMatch.destination;
                    if (vesselDestId) {
                        const destId = String(vesselDestId);
                        updatedRow.destination = destId;
                        updatedRow.vesselDestination = destId;
                        updatedRow.apDestination = destId;
                    }
                    if (exactMatch.eta || exactMatch.eta_date) {
                        const etaDate = exactMatch.eta_date || exactMatch.eta;
                        updatedRow.vesselEta = etaDate instanceof Date ? etaDate.toISOString().split('T')[0] : (typeof etaDate === 'string' ? etaDate.split(' ')[0] : "");
                    }
                    return updatedRow;
                }
                const fallbackMatch = vesselsList.find((vessel) => String(vessel.name)?.toLowerCase() === normalizedValue.toLowerCase());
                if (fallbackMatch) {
                    const updatedRow = { ...row, vessel: String(fallbackMatch.id) };
                    const vesselDestId = fallbackMatch.destination_id || fallbackMatch.destination;
                    if (vesselDestId) {
                        const destId = String(vesselDestId);
                        updatedRow.destination = destId;
                        updatedRow.vesselDestination = destId;
                        updatedRow.apDestination = destId;
                    }
                    if (fallbackMatch.eta || fallbackMatch.eta_date) {
                        const etaDate = fallbackMatch.eta_date || fallbackMatch.eta;
                        updatedRow.vesselEta = etaDate instanceof Date ? etaDate.toISOString().split('T')[0] : (typeof etaDate === 'string' ? etaDate.split(' ')[0] : "");
                    }
                    return updatedRow;
                }
                return row;
            })
        );
    }, [formRows]);

    // Normalize supplier IDs when clients are loaded (run once after clients sync)
    useEffect(() => {
        if (!formRows.length || !hasSyncedClientsRef.current) return;
        const clientsList = getCached(MASTER_KEYS.CLIENTS) ?? [];
        if (!clientsList.length) return;
        const hasSyncedSupplierRef = React.useRef(false);
        if (hasSyncedSupplierRef.current) return;
        hasSyncedSupplierRef.current = true;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.supplier || row.supplier === "" || row.supplier === false) return row;
                const normalizedValue = String(row.supplier);
                const exactMatch = clientsList.find((client) => String(client.id) === normalizedValue);
                if (exactMatch) return { ...row, supplier: String(exactMatch.id) };
                const fallbackMatch = clientsList.find((client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase());
                if (fallbackMatch) return { ...row, supplier: String(fallbackMatch.id) };
                return row;
            })
        );
    }, [formRows]);

    const toNumber = (value) => {
        if (value === "" || value === null || value === undefined) {
            return 0;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const loadFormDataFromStock = (stock, returnData = false) => {
        // Convert IDs to strings for consistent comparison, but preserve empty strings
        // Handle false, null, undefined, and empty strings as empty
        const normalizeId = (value) => {
            if (value === null || value === undefined || value === "" || value === false) return "";
            return String(value);
        };

        // Helper to get field value, treating false as empty
        const getFieldValue = (value, fallback = "") => {
            if (value === null || value === undefined || value === false) return fallback;
            return value || fallback;
        };

        const rowData = {
            id: stock.id || Date.now() + Math.random(),
            stockId: stock.id || null, // Store the original stock ID for updates
            stockItemId: getFieldValue(stock.stock_item_id),
            client: normalizeId(stock.client_id) || normalizeId(stock.client) || "",
            vessel: normalizeId(stock.vessel_id) || normalizeId(stock.vessel) || "",
            pic: normalizeId(stock.pic_new) || normalizeId(stock.pic_id) || normalizeId(stock.pic) || null,
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            poNumber: getFieldValue(stock.po_text) || getFieldValue(stock.po_number),
            warehouseId: getFieldValue(stock.warehouse_new) || getFieldValue(stock.warehouse_id) || "",
            shippingDoc: getFieldValue(stock.shipping_doc),
            items: getFieldValue(stock.items) || getFieldValue(stock.item_desc),
            weightKgs: getFieldValue(stock.weight_kg ?? stock.weight_kgs, ""),
            // Load dimensions from API or create default
            dimensions: Array.isArray(stock.dimensions) && stock.dimensions.length > 0
                ? stock.dimensions.map(dim => ({
                    id: dim.id || null,
                    calculation_method: dim.calculation_method || "lwh",
                    length_cm: dim.length_cm || "",
                    width_cm: dim.width_cm || "",
                    height_cm: dim.height_cm || "",
                    volume_dim: dim.volume_dim || "",
                    volume_cbm: dim.volume_cbm || 0.0,
                    cw_air_freight: dim.cw_air_freight || 0.0,
                }))
                : [{
                    id: null,
                    calculation_method: (stock.length_cm || stock.width_cm || stock.height_cm) ? "lwh" : "volume",
                    length_cm: getFieldValue(stock.length_cm, ""),
                    width_cm: getFieldValue(stock.width_cm, ""),
                    height_cm: getFieldValue(stock.height_cm, ""),
                    volume_dim: getFieldValue(
                        stock.volume_no_dim ?? stock.volume_dim ?? stock.volume_cbm,
                        ""
                    ),
                    volume_cbm: getFieldValue(stock.volume_cbm, 0.0),
                    cw_air_freight: 0.0,
                }],
            lwhText: getFieldValue(stock.lwh_text),
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc),
            value: getFieldValue(stock.value, ""),
            currency: normalizeId(stock.currency_id) || normalizeId(stock.currency) || "",
            origin_text: (() => {
                // If origin_text is already text (from previous saves), use it directly
                if (stock.origin_text && typeof stock.origin_text === 'string' && !/^\d+$/.test(stock.origin_text)) {
                    return stock.origin_text;
                }
                // Backward compatibility: check origin field
                if (stock.origin && typeof stock.origin === 'string' && !/^\d+$/.test(stock.origin)) {
                    return stock.origin;
                }
                // Otherwise, keep as ID - will be converted to name in useEffect after countries load
                return normalizeId(stock.origin_id) || normalizeId(stock.origin) || "";
            })(),
            viaHub: getFieldValue(stock.via_hub, ""),
            attachments: [], // New uploads will be added here
            attachmentsToDelete: [], // IDs of attachments to delete
            existingAttachments: Array.isArray(stock.attachments) ? stock.attachments : [], // Existing attachments from API // Free text field
            viaHub2: getFieldValue(stock.via_hub2, ""), // Free text field
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            remarks: getFieldValue(stock.remarks),
            blank: getFieldValue(stock.blank, ""),
            clientAccess: Boolean(stock.client_access),
            // Internal fields for API payload (auto-filled or from data)
            vesselDestination: normalizeId(stock.vessel_destination) || normalizeId(stock.destination) || "",
            vesselEta: getFieldValue(stock.vessel_eta),
            destination: getFieldValue(stock.destination_new) || getFieldValue(stock.destination) || "",
            apDestination: getFieldValue(stock.ap_destination_new) || getFieldValue(stock.ap_destination) || "",
            itemId: normalizeId(stock.item_id) || "",
            item: stock.item || stock.items || stock.item_id || stock.stock_items_quantity || "",
            volumeCbm: getFieldValue(stock.volume_cbm, ""),
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    };

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

    const handleInputChange = (rowIndex, field, value) => {
        setFormRows(prev => {
            const newRows = [...prev];
            const updatedRow = {
                ...newRows[rowIndex],
                [field]: value
            };

            // Auto-fill vessel-related fields when vessel is selected
            if (field === "vessel" && value) {
                const selectedVessel = vessels.find(v => String(v.id) === String(value));
                if (selectedVessel) {
                    // Auto-fill destination and vessel_destination from vessel
                    const vesselDestinationId = selectedVessel.destination_id || selectedVessel.destination;
                    if (vesselDestinationId) {
                        const destId = String(vesselDestinationId);
                        updatedRow.destination = destId; // For destination field
                        updatedRow.vesselDestination = destId; // For vessel_destination field
                        updatedRow.apDestination = destId; // For ap_destination field
                    }
                    // Auto-fill vessel_eta from vessel
                    if (selectedVessel.eta || selectedVessel.eta_date) {
                        const etaDate = selectedVessel.eta_date || selectedVessel.eta;
                        updatedRow.vesselEta = etaDate instanceof Date
                            ? etaDate.toISOString().split('T')[0]
                            : (typeof etaDate === 'string' ? etaDate.split(' ')[0] : "");
                    }
                }
            }

            // Calculate volume_cbm from dimensions if available - with strict method conditions
            if (field === "dimensions" && updatedRow.dimensions && updatedRow.dimensions[0]) {
                const dim = updatedRow.dimensions[0];
                const method = dim.calculation_method || "lwh";
                
                if (method === "lwh") {
                    // Only calculate from LWH if method is lwh
                    const length = toNumber(dim.length_cm || 0);
                    const width = toNumber(dim.width_cm || 0);
                    const height = toNumber(dim.height_cm || 0);
                    if (length > 0 && width > 0 && height > 0) {
                        // Convert cm to meters and calculate CBM: (L * W * H) / 1,000,000
                        const calculatedCbm = ((length * width * height) / 1000000).toFixed(2);
                        updatedRow.dimensions[0].volume_cbm = calculatedCbm;
                        updatedRow.volumeCbm = calculatedCbm;
                    } else {
                        // Reset to 0 if any dimension is missing
                        updatedRow.dimensions[0].volume_cbm = 0.0;
                        updatedRow.volumeCbm = 0.0;
                    }
                } else if (method === "volume") {
                    // Only use volume_dim if method is volume
                    if (dim.volume_dim) {
                        const volumeValue = toNumber(dim.volume_dim);
                        updatedRow.dimensions[0].volume_cbm = volumeValue;
                        updatedRow.volumeCbm = volumeValue;
                    } else {
                        updatedRow.dimensions[0].volume_cbm = 0.0;
                        updatedRow.volumeCbm = 0.0;
                    }
                }
            }

            newRows[rowIndex] = updatedRow;
            return newRows;
        });
    };

    // Add new row
    const handleAddRow = () => {
        setFormRows(prev => [...prev, getEmptyRow()]);
    };

    // Copy/Repeat row
    const handleCopyRow = (rowIndex) => {
        setFormRows(prev => {
            const rowToCopy = prev[rowIndex];
            const newRow = {
                ...rowToCopy,
                id: Date.now() + Math.random(), // New unique ID
            };
            const newRows = [...prev];
            newRows.splice(rowIndex + 1, 0, newRow); // Insert after current row
            return newRows;
        });
    };

    // Delete row
    const handleDeleteRow = (rowIndex) => {
        if (formRows.length > 1) {
            setFormRows(prev => prev.filter((_, index) => index !== rowIndex));
        } else {
            toast({
                title: 'Warning',
                description: 'At least one row is required',
                status: 'warning',
                duration: 3000,
                isClosable: true,
            });
        }
    };

    const getPayload = (rowData, includeStockId = false) => {
        const splitLines = (val) =>
            (val || "")
                .split(/\r?\n/)
                .map((v) => v.trim())
                .filter(Boolean);

        const poArray = splitLines(rowData.poNumber);
        const lwhArray = splitLines(rowData.lwhText);

        // Payload matching the API structure exactly
        const payload = {
            stock_status: rowData.stockStatus || "",
            client_id: rowData.client ? String(rowData.client) : "",
            supplier_id: rowData.supplier ? String(rowData.supplier) : "",
            vessel_id: rowData.vessel ? String(rowData.vessel) : "",
            // Send raw text plus parsed array of PO numbers (one per line)
            // PO numbers: raw text + array of lines
            po_text: rowData.poNumber || "",
            pic_new: rowData.pic ? String(rowData.pic) : false,
            item_id: rowData.itemId ? String(rowData.itemId) : "",
            item: rowData.item !== "" && rowData.item !== null && rowData.item !== undefined ? toNumber(rowData.item) || 0 : 0,
            currency_id: rowData.currency ? String(rowData.currency) : "",
            origin_text: rowData.origin_text ? String(rowData.origin_text) : "",
            ap_destination_new: rowData.apDestination || "",
            via_hub: rowData.viaHub || "", // Free text field
            attachments: rowData.attachments || [], // Include attachments in payload
            attachment_to_delete: rowData.attachmentsToDelete || [], // Include attachment IDs to delete
            via_hub2: rowData.viaHub2 || "", // Free text field
            client_access: Boolean(rowData.clientAccess),
            remarks: rowData.remarks || "",
            weight_kg: toNumber(rowData.weightKgs) || 0,
            // Include dimensions array if present - with strict conditions based on calculation_method
            dimensions: Array.isArray(rowData.dimensions) && rowData.dimensions.length > 0
                ? rowData.dimensions.map(dim => {
                    const method = dim.calculation_method || "lwh";
                    // Strict conditions: only include relevant fields based on method
                    if (method === "lwh") {
                        return {
                            id: dim.id || undefined,
                            calculation_method: "lwh",
                            length_cm: dim.length_cm ? parseFloat(dim.length_cm) : 0.0,
                            width_cm: dim.width_cm ? parseFloat(dim.width_cm) : 0.0,
                            height_cm: dim.height_cm ? parseFloat(dim.height_cm) : 0.0,
                            volume_dim: false, // Always false for lwh method
                            volume_cbm: dim.volume_cbm ? parseFloat(dim.volume_cbm) : 0.0,
                            cw_air_freight: dim.cw_air_freight ? parseFloat(dim.cw_air_freight) : 0.0,
                        };
                    } else {
                        // method === "volume"
                        return {
                            id: dim.id || undefined,
                            calculation_method: "volume",
                            length_cm: 0.0, // Always 0.0 for volume method
                            width_cm: 0.0, // Always 0.0 for volume method
                            height_cm: 0.0, // Always 0.0 for volume method
                            volume_dim: dim.volume_dim ? parseFloat(dim.volume_dim) : false,
                            volume_cbm: dim.volume_cbm ? parseFloat(dim.volume_cbm) : 0.0,
                            cw_air_freight: dim.cw_air_freight ? parseFloat(dim.cw_air_freight) : 0.0,
                        };
                    }
                })
                : undefined,
            // Legacy fields for backward compatibility (use first dimension if available)
            width_cm: rowData.dimensions?.[0]?.calculation_method === "lwh" ? (toNumber(rowData.dimensions[0].width_cm) || 0) : 0,
            length_cm: rowData.dimensions?.[0]?.calculation_method === "lwh" ? (toNumber(rowData.dimensions[0].length_cm) || 0) : 0,
            height_cm: rowData.dimensions?.[0]?.calculation_method === "lwh" ? (toNumber(rowData.dimensions[0].height_cm) || 0) : 0,
            volume_dim: rowData.dimensions?.[0]?.calculation_method === "volume" ? (toNumber(rowData.dimensions[0].volume_dim) || 0) : 0,
            volume_no_dim: rowData.dimensions?.[0]?.calculation_method === "volume" ? (toNumber(rowData.dimensions[0].volume_dim) || 0) : 0,
            volume_cbm: rowData.dimensions?.[0]?.volume_cbm ? (toNumber(rowData.dimensions[0].volume_cbm) || 0) : (toNumber(rowData.volumeCbm) || 0),
            // Send raw text plus parsed array of LWH entries (one per line)
            // LWH text: raw text + array of lines
            lwh_text: rowData.lwhText || "",
            cw_freight: 0,
            value: toNumber(rowData.value) || 0,
            sl_create_datetime: new Date().toISOString().replace('T', ' ').slice(0, 19),
            extra: "",
            destination_new: rowData.destination || "",
            warehouse_new: rowData.warehouseId || "",
            shipping_doc: rowData.shippingDoc || "",
            export_doc: "",
            exp_ready_in_stock: rowData.expReadyInStock || "",
            shipped_date: null,
            delivered_date: "",
            details: rowData.details || "",
            vessel_destination: rowData.vesselDestination ? String(rowData.vesselDestination) : "",
            vessel_eta: rowData.vesselEta || "",
        };

        // Also send parsed arrays so backend can use them as needed
        payload.po_text_array = poArray;
        payload.lwh_text_array = lwhArray;

        // Only include stock_item_id if it exists (for updates)
        if (rowData.stockItemId) {
            payload.stock_item_id = rowData.stockItemId;
        }

        // Include stock_id for update/delete operations
        if (includeStockId && rowData.stockId) {
            payload.stock_id = rowData.stockId;
            payload.id = rowData.stockId;
        }

        return payload;
    };

    const handleSaveStockItem = async () => {
        try {
            if (isBulkEdit && selectedItems.length > 0) {
                // Bulk update - update each row separately with its own data
                let successCount = 0;
                let errorCount = 0;

                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }

                // Update each row with its own stock_id
                for (const row of formRows) {
                    if (!row.stockId) {
                        console.warn('Row missing stockId, skipping:', row);
                        errorCount++;
                        continue;
                    }

                    try {
                        const payload = getPayload(row, true); // Include stock_id
                        const result = await updateStockItem(row.stockId, payload, {});
                        if (result && result.success) {
                            successCount++;
                        } else {
                            errorCount++;
                            console.error(`Failed to update item ${row.stockId}:`, result?.error);
                        }
                    } catch (err) {
                        errorCount++;
                        console.error(`Failed to update item ${row.stockId}:`, err);
                    }
                }

                if (successCount > 0) {
                    toast({
                        title: 'Success',
                        description: `${successCount} stock item(s) updated successfully${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/main-db");
                } else {
                    throw new Error('Failed to update stock items');
                }
            } else if (isEditing && id) {
                // Update existing single item - use first row
                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }
                const payload = getPayload(formRows[0], true); // Include stock_id
                const result = await updateStockItem(id, payload, {});
                if (result && result.success) {
                    toast({
                        title: 'Success',
                        description: 'Stock item updated successfully',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/main-db");
                } else {
                    throw new Error(result?.error || 'Failed to update stock item');
                }
            } else {
                // Create new - save all rows
                let successCount = 0;
                let errorCount = 0;

                for (const row of formRows) {
                    try {
                        const payload = getPayload(row);
                        const result = await createStockItemApi(payload);
                        if (result && result.result) {
                            const resultData = result.result;

                            // Check for errors even if status is "success"
                            if ((resultData.error_count && resultData.error_count > 0) ||
                                (resultData.errors && Array.isArray(resultData.errors) && resultData.errors.length > 0)) {
                                errorCount++;
                                // Extract error messages for logging
                                const errorMessages = resultData.errors
                                    ? resultData.errors.map(err => err.message || `${err.field}: ${err.message || 'Unknown error'}`).join('; ')
                                    : resultData.message || 'Failed to create stock item';
                                console.error('Failed to create stock item:', errorMessages);
                            } else if (resultData.status === 'success') {
                                successCount++;
                            } else {
                                errorCount++;
                                console.error('Failed to create stock item:', resultData.message || 'Unknown error');
                            }
                        } else {
                            errorCount++;
                            console.error('Failed to create stock item: Invalid response');
                        }
                    } catch (err) {
                        errorCount++;
                        console.error('Failed to create stock item:', err.message || err);
                    }
                }

                if (successCount > 0) {
                    toast({
                        title: 'Success',
                        description: `${successCount} stock item(s) created successfully${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/main-db");
                } else {
                    throw new Error(result?.result?.message || 'Failed to create stock item');
                }
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save stock item',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    const handleBackToStockList = () => {
        history.push("/admin/stock-list/main-db");
    };

    if (isLoading) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Flex justify="center" align="center" h="200px">
                    <VStack spacing="4">
                        <Spinner size="xl" color="#1c4a95" />
                        <Text>Loading stock item...</Text>
                    </VStack>
                </Flex>
            </Box>
        );
    }

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }} overflow="hidden" position="relative" zIndex="122222">
            {/* Header */}
            <Flex
                bg={cardBg}
                px={{ base: "4", md: "6" }}
                py="3"
                justify="space-between"
                align="center"
                borderBottom="1px"
                borderColor={borderColor}
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
                    <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                        {isBulkEdit
                            ? `Bulk Edit Stock Items (${currentItemIndex + 1} of ${selectedItems.length})`
                            : isEditing
                                ? "Edit Stock Item"
                                : "Create New Stock Item"}
                    </Text>
                </HStack>

                <HStack spacing="3">
                    {!isEditing && (
                        <Button
                            leftIcon={<Icon as={MdAdd} />}
                            bg="blue.500"
                            color="white"
                            size="sm"
                            px="6"
                            py="3"
                            borderRadius="md"
                            _hover={{ bg: "blue.600" }}
                            onClick={handleAddRow}
                        >
                            Add Row
                        </Button>
                    )}
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
                        isLoading={updateLoading}
                        loadingText="Saving..."
                    >
                        {isBulkEdit
                            ? `Update All (${selectedItems.length} items)`
                            : isEditing
                                ? "Update Stock Item"
                                : `Save ${formRows.length} Item(s)`}
                    </Button>
                </HStack>
            </Flex>

            {/* Bulk Edit Navigation */}
            {isBulkEdit && selectedItems.length > 1 && (
                <Flex
                    bg={cardBg}
                    px={{ base: "4", md: "6" }}
                    py="2"
                    justify="space-between"
                    align="center"
                    borderBottom="1px"
                    borderColor={borderColor}
                >
                    <HStack spacing="2">
                        <Button
                            size="xs"
                            onClick={() => {
                                if (currentItemIndex > 0) {
                                    const newIndex = currentItemIndex - 1;
                                    setCurrentItemIndex(newIndex);
                                    loadFormDataFromStock(selectedItems[newIndex]);
                                }
                            }}
                            isDisabled={currentItemIndex === 0}
                        >
                            Previous
                        </Button>
                        <Text fontSize="sm" color={textColor}>
                            Item {currentItemIndex + 1} of {selectedItems.length}
                        </Text>
                        <Button
                            size="xs"
                            onClick={() => {
                                if (currentItemIndex < selectedItems.length - 1) {
                                    const newIndex = currentItemIndex + 1;
                                    setCurrentItemIndex(newIndex);
                                    loadFormDataFromStock(selectedItems[newIndex]);
                                }
                            }}
                            isDisabled={currentItemIndex === selectedItems.length - 1}
                        >
                            Next
                        </Button>
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                        Changes will apply to all {selectedItems.length} selected items
                    </Text>
                </Flex>
            )}

            {/* Main Content Area - Horizontal Table Form */}
            <Box bg={cardBg} p={{ base: "4", md: "6" }} overflowX="auto" overflowY="visible">
                <Card w="100%" p="0" overflow="visible">
                    <Table variant="striped" size="sm" colorScheme="gray" minW="5000px">
                        <Thead>
                            <Tr>
                                {isEditing && (
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="80px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">ID</Th>
                                )}
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PIC</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Stock Status</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PO Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Warehouse ID</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipping Doc</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Pcs</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Weight kgs</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Method</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Length cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Width cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Height cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume dim</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume CBM</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">CW Air Freight</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">LWH Text</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DG/UN Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Value</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Currency</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Origin</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">HUB 1</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">HUB 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Ready ex Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Remarks</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase"></Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client Access</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Files</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {formRows.map((row, rowIndex) => (
                                <Tr key={row.id}>
                                    {isEditing && (
                                        <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                            <Input
                                                value={row.stockItemId || ""}
                                                isReadOnly
                                                size="sm"
                                                bg={useColorModeValue("gray.100", "gray.700")}
                                                color={inputText}
                                            />
                                        </Td>
                                    )}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.client}
                                            onChange={(value) => handleInputChange(rowIndex, "client", value)}
                                            options={clients}
                                            placeholder="Select Client"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Client ${option.id}`}
                                            isLoading={false}
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
                                            formatOption={(option) => option.name || String(option.id ?? "")}
                                            isLoading={false}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
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
                                            <option value="blank">Blank</option>
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.supplier}
                                            onChange={(value) => handleInputChange(rowIndex, "supplier", value)}
                                            options={clients}
                                            placeholder="Select Supplier"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Supplier ${option.id}`}
                                            isLoading={false}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.poNumber}
                                            onChange={(e) => handleInputChange(rowIndex, "poNumber", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.shippingDoc}
                                            onChange={(e) => handleInputChange(rowIndex, "shippingDoc", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
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
                                    {/* Dimensions - Method */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Select
                                            value={row.dimensions?.[0]?.calculation_method || "lwh"}
                                            onChange={(e) => {
                                                const newDimensions = [...(row.dimensions || [{
                                                    id: null,
                                                    calculation_method: "lwh",
                                                    length_cm: "",
                                                    width_cm: "",
                                                    height_cm: "",
                                                    volume_dim: "",
                                                    volume_cbm: 0.0,
                                                    cw_air_freight: 0.0,
                                                }])];
                                                // Strict conditions: clear irrelevant fields when switching methods
                                                if (e.target.value === "lwh") {
                                                    newDimensions[0] = {
                                                        ...newDimensions[0],
                                                        calculation_method: "lwh",
                                                        volume_dim: "", // Clear volume_dim when switching to lwh
                                                        // Keep existing LWH values or initialize to empty
                                                        length_cm: newDimensions[0].length_cm || "",
                                                        width_cm: newDimensions[0].width_cm || "",
                                                        height_cm: newDimensions[0].height_cm || "",
                                                    };
                                                } else {
                                                    // Switching to "volume"
                                                    newDimensions[0] = {
                                                        ...newDimensions[0],
                                                        calculation_method: "volume",
                                                        length_cm: "", // Clear LWH fields when switching to volume
                                                        width_cm: "",
                                                        height_cm: "",
                                                        // Keep existing volume_dim or initialize to empty
                                                        volume_dim: newDimensions[0].volume_dim || "",
                                                    };
                                                }
                                                handleInputChange(rowIndex, "dimensions", newDimensions);
                                            }}
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        >
                                            <option value="lwh">LWH</option>
                                            <option value="volume">Volume</option>
                                        </Select>
                                    </Td>
                                    {/* Dimensions - Length (shown ONLY when method is lwh) */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        {row.dimensions?.[0]?.calculation_method === "lwh" ? (
                                            <NumberInput
                                                value={row.dimensions[0].length_cm || ""}
                                                onChange={(value) => {
                                                    const newDimensions = [...(row.dimensions || [])];
                                                    if (!newDimensions[0]) {
                                                        newDimensions[0] = {
                                                            id: null,
                                                            calculation_method: "lwh",
                                                            length_cm: "",
                                                            width_cm: "",
                                                            height_cm: "",
                                                            volume_dim: "",
                                                            volume_cbm: 0.0,
                                                            cw_air_freight: 0.0,
                                                        };
                                                    }
                                                    // Strict condition: only update length_cm when method is lwh
                                                    newDimensions[0].calculation_method = "lwh";
                                                    newDimensions[0].length_cm = value;
                                                    // Ensure volume_dim is cleared for lwh method
                                                    newDimensions[0].volume_dim = "";
                                                    handleInputChange(rowIndex, "dimensions", newDimensions);
                                                }}
                                                min={0}
                                                precision={2}
                                                size="sm"
                                            >
                                                <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                            </NumberInput>
                                        ) : (
                                            <Text fontSize="xs" color="gray.400">-</Text>
                                        )}
                                    </Td>
                                    {/* Dimensions - Width (shown ONLY when method is lwh) */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        {row.dimensions?.[0]?.calculation_method === "lwh" ? (
                                            <NumberInput
                                                value={row.dimensions[0].width_cm || ""}
                                                onChange={(value) => {
                                                    const newDimensions = [...(row.dimensions || [])];
                                                    if (!newDimensions[0]) {
                                                        newDimensions[0] = {
                                                            id: null,
                                                            calculation_method: "lwh",
                                                            length_cm: "",
                                                            width_cm: "",
                                                            height_cm: "",
                                                            volume_dim: "",
                                                            volume_cbm: 0.0,
                                                            cw_air_freight: 0.0,
                                                        };
                                                    }
                                                    // Strict condition: only update width_cm when method is lwh
                                                    newDimensions[0].calculation_method = "lwh";
                                                    newDimensions[0].width_cm = value;
                                                    // Ensure volume_dim is cleared for lwh method
                                                    newDimensions[0].volume_dim = "";
                                                    handleInputChange(rowIndex, "dimensions", newDimensions);
                                                }}
                                                min={0}
                                                precision={2}
                                                size="sm"
                                            >
                                                <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                            </NumberInput>
                                        ) : (
                                            <Text fontSize="xs" color="gray.400">-</Text>
                                        )}
                                    </Td>
                                    {/* Dimensions - Height (shown ONLY when method is lwh) */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        {row.dimensions?.[0]?.calculation_method === "lwh" ? (
                                            <NumberInput
                                                value={row.dimensions[0].height_cm || ""}
                                                onChange={(value) => {
                                                    const newDimensions = [...(row.dimensions || [])];
                                                    if (!newDimensions[0]) {
                                                        newDimensions[0] = {
                                                            id: null,
                                                            calculation_method: "lwh",
                                                            length_cm: "",
                                                            width_cm: "",
                                                            height_cm: "",
                                                            volume_dim: "",
                                                            volume_cbm: 0.0,
                                                            cw_air_freight: 0.0,
                                                        };
                                                    }
                                                    // Strict condition: only update height_cm when method is lwh
                                                    newDimensions[0].calculation_method = "lwh";
                                                    newDimensions[0].height_cm = value;
                                                    // Ensure volume_dim is cleared for lwh method
                                                    newDimensions[0].volume_dim = "";
                                                    handleInputChange(rowIndex, "dimensions", newDimensions);
                                                }}
                                                min={0}
                                                precision={2}
                                                size="sm"
                                            >
                                                <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                            </NumberInput>
                                        ) : (
                                            <Text fontSize="xs" color="gray.400">-</Text>
                                        )}
                                    </Td>
                                    {/* Dimensions - Volume dim (shown ONLY when method is volume) */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        {row.dimensions?.[0]?.calculation_method === "volume" ? (
                                            <NumberInput
                                                value={row.dimensions[0].volume_dim || ""}
                                                onChange={(value) => {
                                                    const newDimensions = [...(row.dimensions || [])];
                                                    if (!newDimensions[0]) {
                                                        newDimensions[0] = {
                                                            id: null,
                                                            calculation_method: "volume",
                                                            length_cm: "",
                                                            width_cm: "",
                                                            height_cm: "",
                                                            volume_dim: "",
                                                            volume_cbm: 0.0,
                                                            cw_air_freight: 0.0,
                                                        };
                                                    }
                                                    // Strict condition: only update volume_dim when method is volume
                                                    newDimensions[0].calculation_method = "volume";
                                                    newDimensions[0].volume_dim = value;
                                                    // Ensure LWH fields are cleared for volume method
                                                    newDimensions[0].length_cm = "";
                                                    newDimensions[0].width_cm = "";
                                                    newDimensions[0].height_cm = "";
                                                    handleInputChange(rowIndex, "dimensions", newDimensions);
                                                }}
                                                min={0}
                                                precision={2}
                                                size="sm"
                                            >
                                                <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                            </NumberInput>
                                        ) : (
                                            <Text fontSize="xs" color="gray.400">-</Text>
                                        )}
                                    </Td>
                                    {/* Dimensions - Volume CBM */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.dimensions?.[0]?.volume_cbm || row.volumeCbm || ""}
                                            onChange={(value) => {
                                                const newDimensions = [...(row.dimensions || [])];
                                                if (!newDimensions[0]) {
                                                    newDimensions[0] = {
                                                        id: null,
                                                        calculation_method: row.dimensions?.[0]?.calculation_method || "lwh",
                                                        length_cm: "",
                                                        width_cm: "",
                                                        height_cm: "",
                                                        volume_dim: "",
                                                        volume_cbm: 0.0,
                                                        cw_air_freight: 0.0,
                                                    };
                                                }
                                                newDimensions[0].volume_cbm = value;
                                                handleInputChange(rowIndex, "dimensions", newDimensions);
                                                handleInputChange(rowIndex, "volumeCbm", value);
                                            }}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    {/* Dimensions - CW Air Freight */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <NumberInput
                                            value={row.dimensions?.[0]?.cw_air_freight || ""}
                                            onChange={(value) => {
                                                const newDimensions = [...(row.dimensions || [])];
                                                if (!newDimensions[0]) {
                                                    newDimensions[0] = {
                                                        id: null,
                                                        calculation_method: row.dimensions?.[0]?.calculation_method || "lwh",
                                                        length_cm: "",
                                                        width_cm: "",
                                                        height_cm: "",
                                                        volume_dim: "",
                                                        volume_cbm: 0.0,
                                                        cw_air_freight: 0.0,
                                                    };
                                                }
                                                newDimensions[0].cw_air_freight = value;
                                                handleInputChange(rowIndex, "dimensions", newDimensions);
                                            }}
                                            min={0}
                                            precision={2}
                                            size="sm"
                                        >
                                            <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                        </NumberInput>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.lwhText}
                                            onChange={(e) => handleInputChange(rowIndex, "lwhText", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.details}
                                            onChange={(e) => handleInputChange(rowIndex, "details", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.viaHub || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub", e.target.value)}
                                            placeholder="Enter HUB 1"
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.viaHub2 || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub2", e.target.value)}
                                            placeholder="Enter HUB 2"
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
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Textarea
                                            value={row.remarks}
                                            onChange={(e) => handleInputChange(rowIndex, "remarks", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            rows={2}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Select
                                            value={row.clientAccess ? "true" : "false"}
                                            onChange={(e) => handleInputChange(rowIndex, "clientAccess", e.target.value === "true")}
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        >
                                            <option value="false">No</option>
                                            <option value="true">Yes</option>
                                        </Select>
                                    </Td>
                                    {/* Files - Upload/Download button */}
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <VStack spacing={2} align="stretch">
                                            {/* File Upload Input */}
                                            <Input
                                                type="file"
                                                multiple
                                                size="sm"
                                                onChange={(e) => handleFileUpload(rowIndex, e.target.files)}
                                                accept="application/pdf,image/*,.doc,.docx"
                                                display="none"
                                                id={`file-upload-form-${rowIndex}`}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor={`file-upload-form-${rowIndex}`}>
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
                                                <Flex key={`existing-${att.id || attIdx}`} align="center" justify="space-between" fontSize="xs">
                                                    <Text isTruncated flex={1} title={att.filename}>
                                                        {att.filename}
                                                    </Text>
                                                    <IconButton
                                                        aria-label="Delete attachment"
                                                        icon={<MdRemove />}
                                                        size="xs"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        onClick={() => handleDeleteExistingAttachment(rowIndex, att.id)}
                                                    />
                                                </Flex>
                                            ))}
                                            
                                            {/* Display newly uploaded attachments */}
                                            {(row.attachments || []).map((att, attIdx) => (
                                                <Flex key={`new-${attIdx}`} align="center" justify="space-between" fontSize="xs">
                                                    <Text isTruncated flex={1} title={att.filename}>
                                                        {att.filename}
                                                    </Text>
                                                    <IconButton
                                                        aria-label="Remove attachment"
                                                        icon={<MdRemove />}
                                                        size="xs"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        onClick={() => handleDeleteAttachment(rowIndex, attIdx)}
                                                    />
                                                </Flex>
                                            ))}
                                        </VStack>
                                    </Td>
                                    <Td px="8px" py="8px">
                                        <HStack spacing="2">
                                            <IconButton
                                                icon={<Icon as={MdContentCopy} />}
                                                size="sm"
                                                colorScheme="green"
                                                variant="ghost"
                                                onClick={() => handleCopyRow(rowIndex)}
                                                aria-label="Copy row"
                                                title="Copy/Repeat row"
                                            />
                                            <IconButton
                                                icon={<Icon as={MdDelete} />}
                                                size="sm"
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => handleDeleteRow(rowIndex)}
                                                aria-label="Delete row"
                                                title="Delete row"
                                                isDisabled={formRows.length === 1}
                                            />
                                        </HStack>
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
