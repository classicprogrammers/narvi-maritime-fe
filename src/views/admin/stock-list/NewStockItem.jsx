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
    Badge,
} from "@chakra-ui/react";
import {
    MdSave,
    MdAdd,
    MdContentCopy,
    MdDelete,
    MdClose,
} from "react-icons/md";
import { createStockItemApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import { getCustomersForSelect, getVesselsForSelect } from "../../../api/entitySelects";
import currenciesAPI from "../../../api/currencies";
import countriesAPI from "../../../api/countries";
import api from "../../../api/axios";
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
    const [isLoading, setIsLoading] = useState(isEditing);
    const [selectedItems, setSelectedItems] = useState([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [clients, setClients] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);

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
        pic: "",
        stockStatus: "",
        supplier: "",
        poNumbers: [], // Array of PO numbers - one item can have multiple PO numbers
        warehouseId: "",
        shippingDoc: "",
        items: "",
        weightKgs: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        volumeNoDim: "",
        lwhText: "",
        details: "",
        value: "",
        currency: "",
        origin: "",
        viaHub: "", // Free text field
        expReadyInStock: "", // Date field
        remarks: "",
        clientAccess: false,
        // Internal fields for API payload (auto-filled or calculated)
        vesselDestination: "", // Auto-filled from vessel
        vesselEta: "", // Auto-filled from vessel
        destination: "", // Auto-filled from vessel (destination field)
        apDestination: "", // Auto-filled from vessel destination
        itemId: "",
        item: 1,
        volumeCbm: "",
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

                    console.log("Loading stock items for bulk edit:", items);
                    setSelectedItems(items);
                    // Load all selected items as separate rows for bulk edit
                    const rows = items.map((item) => {
                        const rowData = loadFormDataFromStock(item, true);
                        console.log("Mapped row data:", rowData);
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

                    console.log("Loading stock item for edit:", match);
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

    // Fetch clients and vessels on component mount
    useEffect(() => {
        const fetchClientsAndVessels = async () => {
            try {
                setIsLoadingClients(true);
                const clientsData = await getCustomersForSelect();
                setClients(clientsData || []);
            } catch (error) {
                console.error('Failed to fetch clients:', error);
                toast({
                    title: 'Warning',
                    description: 'Failed to load clients',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingClients(false);
            }

            try {
                setIsLoadingVessels(true);
                const vesselsData = await getVesselsForSelect();
                setVessels(vesselsData || []);
            } catch (error) {
                console.error('Failed to fetch vessels:', error);
                toast({
                    title: 'Warning',
                    description: 'Failed to load vessels',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
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
                toast({
                    title: 'Warning',
                    description: 'Failed to load suppliers',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingSuppliers(false);
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

            try {
                setIsLoadingCountries(true);
                const countriesResponse = await countriesAPI.getCountries();
                const countriesData = (countriesResponse && Array.isArray(countriesResponse.countries))
                    ? countriesResponse.countries
                    : (Array.isArray(countriesResponse) ? countriesResponse : []);
                setCountries(countriesData || []);
            } catch (error) {
                console.error('Failed to fetch countries:', error);
                toast({
                    title: 'Warning',
                    description: 'Failed to load countries',
                    status: 'warning',
                    duration: 3000,
                    isClosable: true,
                });
            } finally {
                setIsLoadingCountries(false);
            }
        };

        fetchClientsAndVessels();
    }, [toast]);

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

    useEffect(() => {
        if (!countries.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.origin) {
                    return row;
                }
                const normalizedValue = String(row.origin);
                // Try exact ID match first
                const exactMatch = countries.find((country) => String(country.id) === normalizedValue);
                if (exactMatch) {
                    return { ...row, origin: String(exactMatch.id) };
                }
                // Try fallback matching by name/code
                const fallbackMatch = countries.find(
                    (country) =>
                        String(country.name)?.toLowerCase() === normalizedValue.toLowerCase() ||
                        String(country.code)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                return fallbackMatch ? { ...row, origin: String(fallbackMatch.id) } : row;
            })
        );
    }, [countries]);

    // Normalize client IDs when clients are loaded
    useEffect(() => {
        if (!clients.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.client || row.client === "" || row.client === false) {
                    return row;
                }
                const normalizedValue = String(row.client);
                // Try exact ID match first
                const exactMatch = clients.find((client) => String(client.id) === normalizedValue);
                if (exactMatch) {
                    console.log("Found client match:", exactMatch.id, "for value:", normalizedValue);
                    return { ...row, client: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = clients.find(
                    (client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    console.log("Found client fallback match:", fallbackMatch.id, "for value:", normalizedValue);
                    return { ...row, client: String(fallbackMatch.id) };
                }
                console.log("No client match found for value:", normalizedValue, "Available clients:", clients.map(c => ({ id: c.id, name: c.name })));
                return row;
            })
        );
    }, [clients]);

    // Normalize vessel IDs when vessels are loaded and auto-fill vessel_destination and vessel_eta
    useEffect(() => {
        if (!vessels.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.vessel || row.vessel === "" || row.vessel === false) {
                    return row;
                }
                const normalizedValue = String(row.vessel);
                // Try exact ID match first
                const exactMatch = vessels.find((vessel) => String(vessel.id) === normalizedValue);
                if (exactMatch) {
                    console.log("Found vessel match:", exactMatch.id, "for value:", normalizedValue);
                    const updatedRow = { ...row, vessel: String(exactMatch.id) };
                    // Auto-fill destination, vessel_destination, and ap_destination from vessel data
                    const vesselDestId = exactMatch.destination_id || exactMatch.destination;
                    if (vesselDestId) {
                        const destId = String(vesselDestId);
                        updatedRow.destination = destId;
                        updatedRow.vesselDestination = destId;
                        updatedRow.apDestination = destId;
                    }
                    // Auto-fill vessel_eta from vessel data
                    if (exactMatch.eta || exactMatch.eta_date) {
                        const etaDate = exactMatch.eta_date || exactMatch.eta;
                        updatedRow.vesselEta = etaDate instanceof Date
                            ? etaDate.toISOString().split('T')[0]
                            : (typeof etaDate === 'string' ? etaDate.split(' ')[0] : "");
                    }
                    return updatedRow;
                }
                // Try fallback matching by name
                const fallbackMatch = vessels.find(
                    (vessel) => String(vessel.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    console.log("Found vessel fallback match:", fallbackMatch.id, "for value:", normalizedValue);
                    const updatedRow = { ...row, vessel: String(fallbackMatch.id) };
                    // Auto-fill destination, vessel_destination, and ap_destination from vessel data
                    const vesselDestId = fallbackMatch.destination_id || fallbackMatch.destination;
                    if (vesselDestId) {
                        const destId = String(vesselDestId);
                        updatedRow.destination = destId;
                        updatedRow.vesselDestination = destId;
                        updatedRow.apDestination = destId;
                    }
                    // Auto-fill vessel_eta from vessel data
                    if (fallbackMatch.eta || fallbackMatch.eta_date) {
                        const etaDate = fallbackMatch.eta_date || fallbackMatch.eta;
                        updatedRow.vesselEta = etaDate instanceof Date
                            ? etaDate.toISOString().split('T')[0]
                            : (typeof etaDate === 'string' ? etaDate.split(' ')[0] : "");
                    }
                    return updatedRow;
                }
                console.log("No vessel match found for value:", normalizedValue);
                return row;
            })
        );
    }, [vessels]);

    // Normalize supplier IDs when suppliers are loaded
    useEffect(() => {
        if (!suppliers.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.supplier || row.supplier === "" || row.supplier === false) {
                    return row;
                }
                const normalizedValue = String(row.supplier);
                // Try exact ID match first
                const exactMatch = suppliers.find((supplier) => String(supplier.id) === normalizedValue);
                if (exactMatch) {
                    console.log("Found supplier match:", exactMatch.id, "for value:", normalizedValue);
                    return { ...row, supplier: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = suppliers.find(
                    (supplier) => String(supplier.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    console.log("Found supplier fallback match:", fallbackMatch.id, "for value:", normalizedValue);
                    return { ...row, supplier: String(fallbackMatch.id) };
                }
                console.log("No supplier match found for value:", normalizedValue, "Available suppliers:", suppliers.map(s => ({ id: s.id, name: s.name })));
                return row;
            })
        );
    }, [suppliers]);

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
            pic: getFieldValue(stock.pic_id) || getFieldValue(stock.pic) || "", // PIC is now free text
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            // Parse PO numbers from comma-separated or newline-separated string
            poNumbers: (() => {
                const poValue = getFieldValue(stock.po_text) || getFieldValue(stock.po_number) || "";
                if (!poValue) return [];
                // Split by comma or newline, trim each, and filter out empty strings
                return poValue.split(/[,\n]/).map(p => p.trim()).filter(p => p.length > 0);
            })(),
            warehouseId: getFieldValue(stock.warehouse_id),
            shippingDoc: getFieldValue(stock.shipping_doc),
            items: getFieldValue(stock.items) || getFieldValue(stock.item_desc),
            weightKgs: getFieldValue(stock.weight_kg ?? stock.weight_kgs, ""),
            lengthCm: getFieldValue(stock.length_cm, ""),
            widthCm: getFieldValue(stock.width_cm, ""),
            heightCm: getFieldValue(stock.height_cm, ""),
            volumeNoDim: getFieldValue(
                stock.volume_no_dim ?? stock.volume_dim ?? stock.volume_cbm,
                ""
            ),
            lwhText: getFieldValue(stock.lwh_text),
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc),
            value: getFieldValue(stock.value, ""),
            currency: normalizeId(stock.currency_id) || normalizeId(stock.currency) || "",
            origin: normalizeId(stock.origin_id) || normalizeId(stock.origin) || "",
            viaHub: getFieldValue(stock.via_hub, ""), // Free text field
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            remarks: getFieldValue(stock.remarks),
            clientAccess: Boolean(stock.client_access),
            // Internal fields for API payload (auto-filled or from data)
            vesselDestination: normalizeId(stock.vessel_destination) || normalizeId(stock.destination) || "",
            vesselEta: getFieldValue(stock.vessel_eta),
            destination: normalizeId(stock.destination_id) || normalizeId(stock.destination) || "",
            apDestination: normalizeId(stock.ap_destination_id) || normalizeId(stock.ap_destination) || "",
            itemId: normalizeId(stock.item_id) || "",
            item: toNumber(stock.item) || 1,
            volumeCbm: getFieldValue(stock.volume_cbm, ""),
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
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

            // Calculate volume_cbm from dimensions if available
            if (field === "lengthCm" || field === "widthCm" || field === "heightCm" || field === "volumeNoDim") {
                const length = toNumber(updatedRow.lengthCm || 0);
                const width = toNumber(updatedRow.widthCm || 0);
                const height = toNumber(updatedRow.heightCm || 0);
                if (length > 0 && width > 0 && height > 0) {
                    // Convert cm to meters and calculate CBM: (L * W * H) / 1,000,000
                    updatedRow.volumeCbm = ((length * width * height) / 1000000).toFixed(2);
                } else if (updatedRow.volumeNoDim) {
                    updatedRow.volumeCbm = updatedRow.volumeNoDim;
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
                stockId: null, // Clear stockId so it's treated as a new record
                stockItemId: "", // Clear stockItemId for new record
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
        // Payload matching the API structure exactly - only use keys that exist in the UI
        const payload = {
            stock_status: rowData.stockStatus || "",
            client_id: rowData.client ? String(rowData.client) : "",
            supplier_id: rowData.supplier ? String(rowData.supplier) : "",
            vessel_id: rowData.vessel ? String(rowData.vessel) : "",
            // Send PO numbers as comma-separated string
            po_text: Array.isArray(rowData.poNumbers) && rowData.poNumbers.length > 0
                ? rowData.poNumbers.join(", ")
                : "",
            pic: rowData.pic || "", // PIC is free text
            item_id: rowData.itemId ? String(rowData.itemId) : "",
            item: toNumber(rowData.item) || 1,
            currency_id: rowData.currency ? String(rowData.currency) : "",
            origin: rowData.origin ? String(rowData.origin) : "",
            ap_destination: rowData.apDestination ? String(rowData.apDestination) : "",
            via_hub: rowData.viaHub || "", // Free text field
            client_access: Boolean(rowData.clientAccess),
            remarks: rowData.remarks || "",
            weight_kg: toNumber(rowData.weightKgs) || 0,
            width_cm: toNumber(rowData.widthCm) || 0,
            length_cm: toNumber(rowData.lengthCm) || 0,
            height_cm: toNumber(rowData.heightCm) || 0,
            volume_dim: toNumber(rowData.volumeNoDim) || 0,
            volume_cbm: toNumber(rowData.volumeCbm) || 0, // Calculate from dimensions or use provided value
            lwh_text: rowData.lwhText || "",
            cw_freight: 0, // Not in UI, set to 0
            value: toNumber(rowData.value) || 0,
            sl_create_datetime: new Date().toISOString().replace('T', ' ').slice(0, 19),
            extra: "", // Not in UI, set to empty
            destination: rowData.destination ? String(rowData.destination) : "",
            warehouse_id: rowData.warehouseId ? String(rowData.warehouseId) : "",
            shipping_doc: rowData.shippingDoc || "",
            export_doc: "", // Not in UI, set to empty
            // date_on_stock: not in UI, will be auto-generated on backend
            exp_ready_in_stock: rowData.expReadyInStock || "",
            shipped_date: null, // Not in UI, set to null
            delivered_date: "", // Not in UI, set to empty
            details: rowData.details || "",
            vessel_destination: rowData.vesselDestination ? String(rowData.vesselDestination) : "",
            vessel_eta: rowData.vesselEta || "",
            // shipment_type: not in UI, omit from payload
        };

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
                // Create new - save all rows (one record per row)
                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }

                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                // Create a record for each row in the form
                for (let i = 0; i < formRows.length; i++) {
                    const row = formRows[i];
                    try {
                        // Ensure row doesn't have stockId (should be new record)
                        const rowData = {
                            ...row,
                            stockId: null, // Ensure it's a new record
                            stockItemId: row.stockItemId || "", // Clear for new records
                        };
                        const payload = getPayload(rowData);
                        const result = await createStockItemApi(payload);

                        if (result && result.result && result.result.status === 'success') {
                            successCount++;
                        } else {
                            errorCount++;
                            const errorMsg = result?.result?.message || result?.message || 'Unknown error';
                            errors.push(`Row ${i + 1}: ${errorMsg}`);
                            console.error(`Failed to create stock item for row ${i + 1}:`, result);
                        }
                    } catch (err) {
                        errorCount++;
                        const errorMsg = err?.response?.data?.result?.message || err?.response?.data?.message || err?.message || 'Unknown error';
                        errors.push(`Row ${i + 1}: ${errorMsg}`);
                        console.error(`Failed to create stock item for row ${i + 1}:`, err);
                    }
                }

                if (successCount > 0) {
                    toast({
                        title: 'Success',
                        description: `${successCount} stock item(s) created successfully${errorCount > 0 ? `. ${errorCount} failed. ${errors.join('; ')}` : ''}`,
                        status: 'success',
                        duration: 5000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/stocks");
                } else {
                    const errorMsg = errors.length > 0 ? errors.join('; ') : 'Failed to create stock items';
                    toast({
                        title: 'Error',
                        description: `Failed to create stock items: ${errorMsg}`,
                        status: 'error',
                        duration: 5000,
                        isClosable: true,
                    });
                    throw new Error(errorMsg);
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PO Numbers</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Warehouse ID</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipping Doc</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Items</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Weight kgs</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Length cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Width cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Height cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume no dim</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">LWH Text</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Details</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Value</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Currency</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Origin</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Via HUB</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Ready ex Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Remarks</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client Access</Th>
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <VStack spacing="2" align="stretch">
                                            <Textarea
                                                value={Array.isArray(row.poNumbers) ? row.poNumbers.join(", ") : row.poNumbers || ""}
                                                onChange={(e) => {
                                                    // Parse input: split by comma or newline, trim, filter empty
                                                    const inputValue = e.target.value;
                                                    const parsed = inputValue.split(/[,\n]/)
                                                        .map(p => p.trim())
                                                        .filter(p => p.length > 0);
                                                    handleInputChange(rowIndex, "poNumbers", parsed);
                                                }}
                                                placeholder="Enter PO numbers (comma or newline separated)"
                                                size="sm"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                                rows={Math.max(2, Math.min(Array.isArray(row.poNumbers) ? row.poNumbers.length + 1 : 2, 4))}
                                                resize="vertical"
                                            />
                                            {Array.isArray(row.poNumbers) && row.poNumbers.length > 0 && (
                                                <HStack spacing="1" flexWrap="wrap">
                                                    {row.poNumbers.map((po, poIndex) => (
                                                        <HStack
                                                            key={poIndex}
                                                            spacing="1"
                                                            bg={useColorModeValue("blue.100", "blue.800")}
                                                            px="2"
                                                            py="1"
                                                            borderRadius="md"
                                                        >
                                                            <Text fontSize="xs" color={useColorModeValue("blue.800", "blue.100")}>
                                                                {po}
                                                            </Text>
                                                            <IconButton
                                                                icon={<Icon as={MdClose} />}
                                                                size="xs"
                                                                variant="ghost"
                                                                aria-label={`Remove PO ${po}`}
                                                                onClick={() => {
                                                                    const updated = [...row.poNumbers];
                                                                    updated.splice(poIndex, 1);
                                                                    handleInputChange(rowIndex, "poNumbers", updated);
                                                                }}
                                                                _hover={{ bg: useColorModeValue("blue.200", "blue.700") }}
                                                            />
                                                        </HStack>
                                                    ))}
                                                </HStack>
                                            )}
                                        </VStack>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.warehouseId}
                                            onChange={(e) => handleInputChange(rowIndex, "warehouseId", e.target.value)}
                                            placeholder=""
                                            size="sm"
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
                                        <Input
                                            value={row.items}
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.origin}
                                            onChange={(value) => handleInputChange(rowIndex, "origin", value)}
                                            options={countries}
                                            placeholder="Select Country"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => {
                                                const name = option.name || `Country ${option.id}`;
                                                return option.code ? `${name} (${option.code})` : name;
                                            }}
                                            isLoading={isLoadingCountries}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            value={row.viaHub || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub", e.target.value)}
                                            placeholder="Enter Via HUB"
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
