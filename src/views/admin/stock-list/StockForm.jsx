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
} from "react-icons/md";
import { createStockItemApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import { getCustomersForSelect, getVesselsForSelect } from "../../../api/entitySelects";
import currenciesAPI from "../../../api/currencies";
import countriesAPI from "../../../api/countries";
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
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [countries, setCountries] = useState([]);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);

    const textColor = useColorModeValue("gray.700", "white");
    const inputBg = useColorModeValue("gray.100", "gray.800");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");

    // Default empty row template
    const getEmptyRow = () => ({
        id: Date.now() + Math.random(), // Unique ID for each row
        stockId: null, // Store the original stock ID for updates
        stockItemId: "",
        client: "",
        vessel: "",
        pic: "",
        stockStatus: "",
        supplier: "",
        poNumber: "",
        warehouseId: "",
        shippingDoc: "",
        exportDoc: "",
        items: "",
        itemId: "",
        item: "",
        weightKgs: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        volumeNoDim: "",
        volumeCbm: "",
        lwhText: "",
        details: "",
        value: "",
        cwFreight: "",
        currency: "",
        origin: "",
        apDestination: "",
        destination: "",
        viaHub: "",
        readyAsSupplier: false,
        expReadyInStock: "",
        dateOnStock: "",
        shippedDate: "",
        deliveredDate: "",
        remarks: "",
        clientAccess: false,
        soNumber: "",
        shippingInstruction: "",
        shipmentType: "",
        deliveryInstruction: "",
        extra: "",
        vesselDestination: "",
        vesselEta: "",
        notes: "",
        // Additional fields from the image
        name: "",
        type: "",
        priority: "",
        assignedTo: "",
        dueDate: "",
        createdBy: "",
        createdDate: "",
        lastModifiedBy: "",
        lastModifiedDate: "",
        description: "",
        comments: "",
        attachments: "",
        tags: "",
        progress: "",
        category: "",
        subcategory: "",
        relatedItems: "",
        startDate: "",
        endDate: "",
        effort: "",
        cost: "",
        risk: "",
        impact: "",
        resolution: "",
        feedback: "",
        version: "",
        owner: "",
        department: "",
        project: "",
        milestone: "",
        dependencies: "",
        url: "",
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

    // Normalize vessel IDs when vessels are loaded
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
                    return { ...row, vessel: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = vessels.find(
                    (vessel) => String(vessel.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    console.log("Found vessel fallback match:", fallbackMatch.id, "for value:", normalizedValue);
                    return { ...row, vessel: String(fallbackMatch.id) };
                }
                console.log("No vessel match found for value:", normalizedValue);
                return row;
            })
        );
    }, [vessels]);

    // Normalize supplier IDs when clients are loaded (suppliers use clients array)
    useEffect(() => {
        if (!clients.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.supplier || row.supplier === "" || row.supplier === false) {
                    return row;
                }
                const normalizedValue = String(row.supplier);
                // Try exact ID match first
                const exactMatch = clients.find((client) => String(client.id) === normalizedValue);
                if (exactMatch) {
                    console.log("Found supplier match:", exactMatch.id, "for value:", normalizedValue);
                    return { ...row, supplier: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = clients.find(
                    (client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    console.log("Found supplier fallback match:", fallbackMatch.id, "for value:", normalizedValue);
                    return { ...row, supplier: String(fallbackMatch.id) };
                }
                console.log("No supplier match found for value:", normalizedValue, "Available clients:", clients.map(c => ({ id: c.id, name: c.name })));
                return row;
            })
        );
    }, [clients]);

    // Normalize PIC IDs when clients are loaded (PIC uses clients array)
    useEffect(() => {
        if (!clients.length) return;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.pic || row.pic === "" || row.pic === false) {
                    return row;
                }
                const normalizedValue = String(row.pic);
                // Try exact ID match first
                const exactMatch = clients.find((client) => String(client.id) === normalizedValue);
                if (exactMatch) {
                    console.log("Found PIC match:", exactMatch.id, "for value:", normalizedValue);
                    return { ...row, pic: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = clients.find(
                    (client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    console.log("Found PIC fallback match:", fallbackMatch.id, "for value:", normalizedValue);
                    return { ...row, pic: String(fallbackMatch.id) };
                }
                console.log("No PIC match found for value:", normalizedValue, "Available clients:", clients.map(c => ({ id: c.id, name: c.name })));
                return row;
            })
        );
    }, [clients]);

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
            // Prioritize _id fields and convert to string for dropdown matching
            // If client_id is 40, normalizeId(40) returns "40", which is truthy, so use it
            client: normalizeId(stock.client_id) || normalizeId(stock.client) || "",
            vessel: normalizeId(stock.vessel_id) || normalizeId(stock.vessel) || "",
            pic: normalizeId(stock.pic_id) || normalizeId(stock.pic) || "",
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            poNumber: getFieldValue(stock.po_text) || getFieldValue(stock.po_number),
            warehouseId: getFieldValue(stock.warehouse_id),
            shippingDoc: getFieldValue(stock.shipping_doc),
            exportDoc: getFieldValue(stock.export_doc),
            items: getFieldValue(stock.items) || getFieldValue(stock.item_desc),
            itemId: getFieldValue(stock.item_id),
            item: getFieldValue(stock.item, 0),
            weightKgs: stock.weight_kg ?? stock.weight_kgs ?? "",
            lengthCm: getFieldValue(stock.length_cm, 0),
            widthCm: getFieldValue(stock.width_cm, 0),
            heightCm: getFieldValue(stock.height_cm, 0),
            volumeNoDim: getFieldValue(stock.volume_dim, 0) || getFieldValue(stock.volume_no_dim, 0),
            volumeCbm: getFieldValue(stock.volume_cbm, 0),
            lwhText: getFieldValue(stock.lwh_text),
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc),
            value: getFieldValue(stock.value, 0),
            currency: normalizeId(stock.currency_id) || normalizeId(stock.currency) || "",
            origin: normalizeId(stock.origin_id) || normalizeId(stock.origin) || "",
            apDestination: getFieldValue(stock.ap_destination),
            destination: getFieldValue(stock.destination) || getFieldValue(stock.vessel_destination),
            viaHub: getFieldValue(stock.via_hub),
            readyAsSupplier: stock.ready_as_supplier || false,
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock),
            dateOnStock: getFieldValue(stock.date_on_stock),
            shippedDate: getFieldValue(stock.shipped_date),
            deliveredDate: getFieldValue(stock.delivered_date),
            remarks: getFieldValue(stock.remarks),
            clientAccess: Boolean(stock.client_access),
            soNumber: getFieldValue(stock.so_number_id),
            shippingInstruction: getFieldValue(stock.shipping_instruction_id),
            shipmentType: getFieldValue(stock.shipment_type),
            deliveryInstruction: getFieldValue(stock.delivery_instruction_id),
            extra: getFieldValue(stock.extra),
            vesselDestination: getFieldValue(stock.vessel_destination),
            vesselEta: getFieldValue(stock.vessel_eta),
            cwFreight: getFieldValue(stock.cw_freight, 0),
            notes: getFieldValue(stock.notes) || getFieldValue(stock.remarks),
            // Additional fields retained
            name: stock.name || stock.stock_item_id || "",
            type: stock.type || "",
            priority: stock.priority || "",
            assignedTo: stock.assigned_to || "",
            dueDate: stock.due_date || "",
            createdBy: stock.created_by || "",
            createdDate: stock.sl_create_datetime || stock.created_date || "",
            lastModifiedBy: stock.last_modified_by || "",
            lastModifiedDate: stock.last_modified_date || "",
            description: stock.description || stock.details || "",
            comments: stock.comments || "",
            attachments: stock.attachments || "",
            tags: stock.tags || "",
            progress: stock.progress || "",
            category: stock.category || "",
            subcategory: stock.subcategory || "",
            relatedItems: stock.related_items || "",
            startDate: stock.start_date || "",
            endDate: stock.end_date || "",
            effort: stock.effort || "",
            cost: stock.cost || "",
            risk: stock.risk || "",
            impact: stock.impact || "",
            resolution: stock.resolution || "",
            feedback: stock.feedback || "",
            version: stock.version || "",
            owner: stock.owner || "",
            department: stock.department || "",
            project: stock.project || "",
            milestone: stock.milestone || "",
            dependencies: stock.dependencies || "",
            url: stock.url || "",
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    };

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

    const toNumber = (value) => {
        if (value === "" || value === null || value === undefined) {
            return 0;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const getPayload = (rowData, includeStockId = false) => {
        const payload = {
            stock_item_id: rowData.stockItemId || rowData.name || "",
            stock_status: rowData.stockStatus || "",
            client_id: rowData.client || "",
            supplier_id: rowData.supplier || "",
            vessel_id: rowData.vessel || "",
            po_text: rowData.poNumber || "",
            pic_id: rowData.pic || "",
            item_id: rowData.itemId || "",
            item: rowData.item || 0,
            currency_id: rowData.currency || "",
            origin: rowData.origin || "",
            ap_destination: rowData.apDestination || "",
            destination: rowData.destination || "",
            via_hub: rowData.viaHub || "",
            client_access: Boolean(rowData.clientAccess),
            remarks: rowData.remarks || rowData.notes || "",
            weight_kg: toNumber(rowData.weightKgs),
            width_cm: toNumber(rowData.widthCm),
            length_cm: toNumber(rowData.lengthCm),
            height_cm: toNumber(rowData.heightCm),
            volume_dim: toNumber(rowData.volumeNoDim),
            volume_no_dim: toNumber(rowData.volumeNoDim),
            volume_cbm: toNumber(rowData.volumeCbm || rowData.volumeNoDim),
            lwh_text: rowData.lwhText || "",
            cw_freight: toNumber(rowData.cwFreight),
            value: toNumber(rowData.value),
            so_number_id: rowData.soNumber || "",
            shipping_instruction_id: rowData.shippingInstruction || "",
            shipment_type: rowData.shipmentType || "",
            delivery_instruction_id: rowData.deliveryInstruction || "",
            extra: rowData.extra || "",
            warehouse_id: rowData.warehouseId || "",
            shipping_doc: rowData.shippingDoc || "",
            export_doc: rowData.exportDoc || "",
            date_on_stock: rowData.dateOnStock || "",
            exp_ready_in_stock: rowData.expReadyInStock ?? rowData.readyAsSupplier ?? false,
            shipped_date: rowData.shippedDate || "",
            delivered_date: rowData.deliveredDate || "",
            details: rowData.details || "",
            vessel_destination: rowData.vesselDestination || "",
            vessel_eta: rowData.vesselEta || "",
            sl_create_datetime: rowData.createdDate || "",
            sl_create_date: rowData.createdDate ? rowData.createdDate.split(" ")[0] : "",
        };

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
                        if (result && result.result && result.result.status === 'success') {
                            successCount++;
                        } else {
                            errorCount++;
                        }
                    } catch (err) {
                        errorCount++;
                        console.error('Failed to create stock item:', err);
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
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Date on stock</Th>
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
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px" overflow="visible" position="relative" zIndex={1}>
                                        <SimpleSearchableSelect
                                            value={row.pic}
                                            onChange={(value) => handleInputChange(rowIndex, "pic", value)}
                                            options={clients}
                                            placeholder="Select PIC"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `PIC ${option.id}`}
                                            isLoading={isLoadingClients}
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
                                            <option value="pending">PENDING</option>
                                            <option value="stock">STOCK</option>
                                            <option value="in_stock">IN STOCK</option>
                                            <option value="on_a_shipping_instr">ON A SHIPPING INSTR</option>
                                            <option value="on_a_delivery_instr">ON A DELIVERY INSTR</option>
                                            <option value="in_transit">IN TRANSIT</option>
                                            <option value="arrived_dest">ARRIVED DEST</option>
                                            <option value="shipped">SHIPPED</option>
                                            <option value="delivered">DELIVERED</option>
                                            <option value="irregularities">IRREGULARITIES</option>
                                            <option value="cancelled">CANCELLED</option>
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
                                            isLoading={isLoadingClients}
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
                                            value={row.viaHub}
                                            onChange={(e) => handleInputChange(rowIndex, "viaHub", e.target.value)}
                                            placeholder=""
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Select
                                            value={row.readyAsSupplier ? "true" : "false"}
                                            onChange={(e) => handleInputChange(rowIndex, "readyAsSupplier", e.target.value === "true")}
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        >
                                            <option value="false">No</option>
                                            <option value="true">Yes</option>
                                        </Select>
                                    </Td>
                                    <Td borderRight="1px" borderColor={useColorModeValue("gray.200", "gray.600")} px="8px" py="8px">
                                        <Input
                                            type="date"
                                            value={row.dateOnStock}
                                            onChange={(e) => handleInputChange(rowIndex, "dateOnStock", e.target.value)}
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
