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
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
} from "@chakra-ui/react";
import {
    MdSave,
    MdAdd,
    MdContentCopy,
    MdDelete,
    MdClose,
    MdAttachFile,
    MdClose as MdRemove,
    MdMoreVert,
} from "react-icons/md";
import { createStockItemApi, updateStockItemApi } from "../../../api/stock";
import { useStock } from "../../../redux/hooks/useStock";
import { getCustomersForSelect, getVesselsForSelect } from "../../../api/entitySelects";
import countriesAPI from "../../../api/countries";
import currenciesAPI from "../../../api/currencies";
import api from "../../../api/axios";
import picAPI from "../../../api/pic";
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
    const [countries, setCountries] = useState([]);
    const [isLoadingCountries, setIsLoadingCountries] = useState(false);
    const [currencies, setCurrencies] = useState([]);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
    const [pics, setPics] = useState([]);
    const [isLoadingPICs, setIsLoadingPICs] = useState(false);

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
        poNumber: "", // Free text + textarea
        expReadyInStock: "", // Ready ex Supplier - date field
        warehouseId: "", // Free text + textarea
        dateOnStock: "", // Date field
        item: "", // PCS - numbers
        weightKgs: "", // Weight kgs - numbers
        lengthCm: "", // Length cm - numbers
        widthCm: "", // Width cm - numbers
        heightCm: "", // Height cm - numbers
        volumeNoDim: "", // Volume no dim - numbers
        lwhText: "", // LWH Text Details - Free text + textarea
        dgUn: "", // DG/UN Number - Free text
        value: "", // Value - numbers
        currency: null, // Currency ID
        origin_text: "", // Origin - Airport code or Country
        viaHub: "", // Via HUB 1 - Airport code
        viaHub2: "", // Via HUB 2 - Airport code
        apDestination: "", // AP Destination - Free text
        destination: "", // Destination - Free text
        shippingDoc: "", // Shipping Docs - Free text + textarea
        exportDoc: "", // Export doc 1 - Free text + textarea
        exportDoc2: "", // Export doc 2 - Free text + textarea
        remarks: "", // Remarks - Free text + textarea
        internalRemark: "", // Internal Remark - Free text + textarea
        soNumber: "", // SO - STRING type (preserves spaces, e.g., "00021 1.1")
        siNumber: "", // SI Number - STRING type (preserves spaces, e.g., "00021 1.1")
        siCombined: "", // SI Combined - STRING type (preserves spaces, e.g., "00021 1.1")
        diNumber: "", // DI Number - STRING type (preserves spaces, e.g., "00021 1.1")
        clientAccess: false, // Client Access - Yes or No
        // Internal fields for API payload (auto-filled or calculated)
        vesselDestination: "", // Auto-filled from vessel
        vesselEta: "", // Auto-filled from vessel
        itemId: "",
        volumeCbm: "",
        blank: "", // Keep for backward compatibility
        details: "", // Keep for backward compatibility
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

            // Fetch currencies
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

        fetchClientsAndVessels();
    }, [toast]);

    // Normalize currency values when currencies are loaded
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


    // PIC is now free text - no normalization needed

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
                    return { ...row, client: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = clients.find(
                    (client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    return { ...row, client: String(fallbackMatch.id) };
                }
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
                    return { ...row, supplier: String(exactMatch.id) };
                }
                // Try fallback matching by name
                const fallbackMatch = suppliers.find(
                    (supplier) => String(supplier.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    return { ...row, supplier: String(fallbackMatch.id) };
                }
                return row;
            })
        );
    }, [suppliers]);

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
            pic: normalizeId(stock.pic_new) || normalizeId(stock.pic_id) || normalizeId(stock.pic) || null, // PIC ID
            stockStatus: getFieldValue(stock.stock_status),
            supplier: normalizeId(stock.supplier_id) || normalizeId(stock.supplier) || "",
            poNumber: getFieldValue(stock.po_text) || getFieldValue(stock.po_number) || "",
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            warehouseId: getFieldValue(stock.warehouse_new) || getFieldValue(stock.warehouse_id) || "",
            dateOnStock: getFieldValue(stock.date_on_stock) || "",
            item: stock.item || stock.items || stock.item_id || stock.stock_items_quantity || "",
            weightKgs: getFieldValue(stock.weight_kg ?? stock.weight_kgs, ""),
            lengthCm: getFieldValue(stock.length_cm, ""),
            widthCm: getFieldValue(stock.width_cm, ""),
            heightCm: getFieldValue(stock.height_cm, ""),
            volumeNoDim: getFieldValue(stock.volume_no_dim ?? stock.volume_dim ?? stock.volume_cbm, ""),
            lwhText: getFieldValue(stock.lwh_text),
            dgUn: getFieldValue(stock.dg_un) || "",
            value: getFieldValue(stock.value, ""),
            currency: normalizeId(stock.currency_id) || normalizeId(stock.currency) || null, // Currency ID
            origin_text: (() => {
                // If origin_text is already text (from previous saves), use it directly
                if (stock.origin_text && typeof stock.origin_text === 'string' && !/^\d+$/.test(stock.origin_text)) {
                    return stock.origin_text;
                }
                // Backward compatibility: check origin field
                if (stock.origin && typeof stock.origin === 'string' && !/^\d+$/.test(stock.origin)) {
                    return stock.origin;
                }
                // Otherwise, keep as ID - will be converted to name in useEffect
                return normalizeId(stock.origin_id) || normalizeId(stock.origin) || "";
            })(),
            viaHub: getFieldValue(stock.via_hub, ""),
            viaHub2: getFieldValue(stock.via_hub2, ""),
            apDestination: getFieldValue(stock.ap_destination_new) || getFieldValue(stock.ap_destination) || "",
            destination: getFieldValue(stock.destination_new) || getFieldValue(stock.destination) || "",
            shippingDoc: getFieldValue(stock.shipping_doc),
            exportDoc: getFieldValue(stock.export_doc),
            exportDoc2: getFieldValue(stock.export_doc_2),
            remarks: getFieldValue(stock.remarks),
            internalRemark: getFieldValue(stock.internal_remark),
            soNumber: addSOPrefix(getFieldValue(stock.so_number) || getFieldValue(stock.stock_so_number) || ""),
            siNumber: addSIPrefix(getFieldValue(stock.si_number) || getFieldValue(stock.stock_shipping_instruction) || ""),
            siCombined: addSICombinedPrefix(stock.si_combined === false ? "" : (getFieldValue(stock.si_combined) || "")),
            diNumber: addDIPrefix(getFieldValue(stock.di_number) || getFieldValue(stock.stock_delivery_instruction) || ""),
            clientAccess: Boolean(stock.client_access),
            // Internal fields for API payload (auto-filled or from data)
            vesselDestination: getFieldValue(stock.vessel_destination) || "",
            vesselEta: getFieldValue(stock.vessel_eta),
            itemId: normalizeId(stock.item_id) || "",
            volumeCbm: getFieldValue(stock.volume_cbm, ""),
            blank: getFieldValue(stock.blank, ""),
            details: getFieldValue(stock.details) || getFieldValue(stock.item_desc),
            attachments: [], // New uploads will be added here
            attachmentsToDelete: [], // IDs of attachments to delete
            existingAttachments: Array.isArray(stock.attachments) ? stock.attachments : [], // Existing attachments from API
        };

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    };

    // Copy value to rows below
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
            
            const updatedRow = {
                ...newRows[rowIndex],
                [field]: processedValue
            };

            // Auto-fill vessel-related fields when vessel is selected
            if (field === "vessel" && value) {
                const selectedVessel = vessels.find(v => String(v.id) === String(value));
                if (selectedVessel) {
                    // Auto-fill destination from vessel
                    const vesselDestinationId = selectedVessel.destination_id || selectedVessel.destination;
                    const vesselDestinationName = selectedVessel.destination_name || selectedVessel.destination; // Try to get name
                    if (vesselDestinationId) {
                        const destId = String(vesselDestinationId);
                        updatedRow.destination = destId; // For destination field
                        updatedRow.apDestination = destId; // For ap_destination field
                    }
                    // vessel_destination is now free text - fill with name if available, or leave empty
                    if (vesselDestinationName && typeof vesselDestinationName === 'string') {
                        updatedRow.vesselDestination = vesselDestinationName; // Free text field
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
        const splitLines = (val) =>
            (val || "")
                .split(/\r?\n/)
                .map((v) => v.trim())
                .filter(Boolean);

        const poArray = splitLines(rowData.poNumber);
        const lwhArray = splitLines(rowData.lwhText);

        // Payload matching the API structure exactly - match the lines array format
        const payload = {
            stock_status: rowData.stockStatus || "",
            client_id: rowData.client ? String(rowData.client) : "",
            supplier_id: rowData.supplier ? String(rowData.supplier) : "",
            vessel_id: rowData.vessel ? String(rowData.vessel) : "",
            // PO numbers: raw text + array of lines
            po_text: rowData.poNumber || "",
            pic_new: rowData.pic ? String(rowData.pic) : false,
            item_id: rowData.itemId ? String(rowData.itemId) : "", // Keep item_id for lines format
            stock_items_quantity: rowData.itemId ? String(rowData.itemId) : "", // Also include stock_items_quantity
            item: rowData.item !== "" && rowData.item !== null && rowData.item !== undefined ? toNumber(rowData.item) || 0 : 0,
            currency_id: rowData.currency ? String(rowData.currency) : "",
            origin_text: rowData.origin_text ? String(rowData.origin_text) : "",
            ap_destination_new: rowData.apDestination || "",
            via_hub: rowData.viaHub || "", // Free text field
            via_hub2: rowData.viaHub2 || "", // Free text field
            client_access: Boolean(rowData.clientAccess),
            remarks: rowData.remarks || "",
            internal_remark: rowData.internalRemark || "",
            weight_kg: toNumber(rowData.weightKgs) || 0,
            width_cm: toNumber(rowData.widthCm) || 0,
            length_cm: toNumber(rowData.lengthCm) || 0,
            height_cm: toNumber(rowData.heightCm) || 0,
            volume_dim: toNumber(rowData.volumeNoDim) || 0,
            volume_cbm: toNumber(rowData.volumeCbm) || 0,
            // LWH text: raw text + array of lines
            lwh_text: rowData.lwhText || "",
            cw_air_freight_new: toNumber(rowData.cwAirfreight) || 0,
            value: toNumber(rowData.value) || 0,
            shipment_type: "", // Include shipment_type as empty string
            extra: rowData.extra2 || "",
            destination_new: rowData.destination || "", // Destination - Free text
            warehouse_new: rowData.warehouseId || "", // Warehouse - Free text
            shipping_doc: rowData.shippingDoc || "",
            export_doc: rowData.exportDoc || "",
            export_doc_2: rowData.exportDoc2 || "",
            date_on_stock: rowData.dateOnStock || "",
            exp_ready_in_stock: rowData.expReadyInStock || "",
            shipped_date: rowData.shippedDate || null,
            delivered_date: rowData.deliveredDate || "",
            details: rowData.details || "",
            dg_un: rowData.dgUn || "", // DG/UN Number - Free text
            attachments: rowData.attachments || [], // Include attachments in payload
            attachment_to_delete: rowData.attachmentsToDelete || [], // Include attachment IDs to delete
            vessel_destination: rowData.vesselDestination ? String(rowData.vesselDestination) : "", // Free text field
            vessel_eta: rowData.vesselEta || "",
            // SO, SI, SI Combined, DI Number are STRING types - preserve spaces (e.g., "00021 1.1")
            // Ensure prefix exists before removing it (in case user typed without prefix)
            stock_so_number: rowData.soNumber ? (() => {
                let value = String(rowData.soNumber);
                // Add prefix if missing (preserves spaces)
                if (value && !value.startsWith("SO-")) {
                    value = `SO-${value}`;
                }
                return String(removeSOPrefix(value));
            })() : "",
            stock_shipping_instruction: rowData.siNumber ? (() => {
                let value = String(rowData.siNumber);
                // Add prefix if missing (preserves spaces)
                if (value && !value.startsWith("SI-")) {
                    value = `SI-${value}`;
                }
                return String(removeSIPrefix(value));
            })() : "",
            si_combined: rowData.siCombined ? (() => {
                let value = String(rowData.siCombined);
                // Add prefix if missing (preserves spaces)
                if (value && !value.startsWith("SIC-") && !value.startsWith("SI-C-") && !value.startsWith("SI-")) {
                    value = `SIC-${value}`;
                }
                const cleaned = String(removeSICombinedPrefix(value));
                return cleaned === "" ? false : cleaned;
            })() : false, // SI Combined - Free text (STRING type, can be false if empty)
            stock_delivery_instruction: rowData.diNumber ? (() => {
                let value = String(rowData.diNumber);
                // Add prefix if missing (preserves spaces)
                if (value && !value.startsWith("DI-")) {
                    value = `DI-${value}`;
                }
                return String(removeDIPrefix(value));
            })() : "",
            vessel_destination_text: rowData.vesselDestination || "", // Include vessel_destination_text
        };

        // Also send parsed arrays so backend can use them as needed
        payload.po_text_array = poArray;
        payload.lwh_text_array = lwhArray;

        // Only include stock_item_id if it exists (for updates)
        if (rowData.stockItemId) {
            payload.stock_item_id = rowData.stockItemId;
        }

        // Include stock_id for update operations ONLY (not id field)
        if (includeStockId && rowData.stockId) {
            payload.stock_id = rowData.stockId;
            // DO NOT include id field - only stock_id is needed for update
        }

        return payload;
    };

    const handleSaveStockItem = async () => {
        try {
            if (isBulkEdit && selectedItems.length > 0) {
                // Bulk update - send all rows in a single payload with lines array
                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }

                // Build lines array from all form rows
                const lines = formRows.map((row) => {
                    if (!row.stockId) {
                        throw new Error(`Row missing stockId: ${JSON.stringify(row)}`);
                    }
                    return getPayload(row, true); // Include stock_id
                });

                // Send all lines in a single payload
                const payload = { lines };
                const result = await updateStockItemApi(id || formRows[0]?.stockId, payload);
                
                if (result && result.result && result.result.status === 'success') {
                    toast({
                        title: 'Success',
                        description: `${lines.length} stock item(s) updated successfully`,
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/main-db");
                } else {
                    throw new Error(result?.result?.message || result?.message || 'Failed to update stock items');
                }
            } else if (isEditing && id) {
                // Update existing single item - use first row, wrap in lines array
                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }
                const linePayload = getPayload(formRows[0], true); // Include stock_id
                const payload = { lines: [linePayload] };
                const result = await updateStockItemApi(id, payload);
                if (result && result.result && result.result.status === 'success') {
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
                    throw new Error(result?.result?.message || result?.message || 'Failed to update stock item');
                }
            } else {
                // Create new - save all rows (one record per row)
                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }

                let successCount = 0;
                let errorCount = 0;
                const errors = [];

                // Build lines array from all form rows
                const lines = formRows.map((row) => {
                    // Ensure row doesn't have stockId (should be new record)
                    const rowData = {
                        ...row,
                        stockId: null, // Ensure it's a new record
                        stockItemId: row.stockItemId || "", // Clear for new records
                    };
                    return getPayload(rowData);
                });

                // Send all lines in a single payload
                const payload = { lines };
                const result = await createStockItemApi(payload);

                if (result && result.result) {
                    const resultData = result.result;

                    // Check for errors even if status is "success"
                    if ((resultData.error_count && resultData.error_count > 0) ||
                        (resultData.errors && Array.isArray(resultData.errors) && resultData.errors.length > 0)) {

                        // Extract error messages from errors array
                        const errorMessages = resultData.errors
                            ? resultData.errors.map(err => err.message || `${err.field}: ${err.message || 'Unknown error'}`).join('; ')
                            : resultData.message || 'Failed to create stock items';

                        toast({
                            title: 'Error',
                            description: errorMessages,
                            status: 'error',
                            duration: 8000,
                            isClosable: true,
                        });
                        throw new Error(errorMessages);
                    }

                    // Success case - no errors
                    if (resultData.status === 'success') {
                        const successCount = resultData.created_count || lines.length;
                    toast({
                        title: 'Success',
                        description: `${successCount} stock item(s) created successfully`,
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                    });
                    getStockList();
                    history.push("/admin/stock-list/stocks");
                    } else {
                        const errorMsg = resultData.message || result?.message || 'Failed to create stock items';
                        toast({
                            title: 'Error',
                            description: errorMsg,
                            status: 'error',
                            duration: 5000,
                            isClosable: true,
                        });
                        throw new Error(errorMsg);
                    }
                } else {
                    const errorMsg = result?.result?.message || result?.message || 'Failed to create stock items';
                    toast({
                        title: 'Error',
                        description: errorMsg,
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
            <Box bg={cardBg} p={{ base: "4", md: "6" }} overflowX="auto">
                {/* Make table body scrollable with frozen header (Excel-style) */}
                <Card w="100%" p="0" overflow="hidden">
                    <Box maxH="60vh" overflowY="auto">
                        <Table variant="striped" size="sm" colorScheme="gray" minW="5000px">
                            <Thead position="sticky" top={0} zIndex={444}>
                            <Tr>
                                {isEditing && (
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="80px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">ID</Th>
                                )}
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Vessel</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PIC</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Stock Status</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PO Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Ready ex Supplier</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Warehouse ID</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Date on Stock</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PCS</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Weight kgs</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Length cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Width cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Height cm</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Volume no dim</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">LWH Text Details</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DG/UN Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Value</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Currency</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Origin</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Via HUB 1</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Via HUB 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">AP Destination</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Destination</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipping Docs</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Export Doc 1</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Export Doc 2</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Remarks</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Internal Remark</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SO</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SI Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">SI Combined</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">DI Number</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Client Access</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Files</Th>
                                <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {formRows.map((row, rowIndex) => (
                                <Tr key={row.id}>
                                    {isEditing && (
                                            <Td {...cellProps}>
                                <Input
                                                value={row.stockItemId || ""}
                                                isReadOnly
                                    size="sm"
                                                bg={useColorModeValue("gray.100", "gray.700")}
                                                color={inputText}
                                            />
                                        </Td>
                                    )}
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
                                    {/* Single PO Number field, but allow multiple lines for clarity */}
                                        <Td {...cellProps}>
                                        <Textarea
                                            value={row.poNumber || ""}
                                            onChange={(e) => handleInputChange(rowIndex, "poNumber", e.target.value)}
                                            placeholder="Enter PO Number(s) - one per line"
                                            size="sm"
                                            rows={3}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                        {/* Ready ex Supplier - date field */}
                                        <Td {...cellProps}>
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
                                        {/* Warehouse ID - Free text + textarea */}
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
                                        {/* Date on Stock - date field */}
                                        <Td {...cellProps}>
                                        <Input
                                                type="date"
                                                value={row.dateOnStock || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "dateOnStock", e.target.value)}
                                            size="sm"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                        <Td {...cellProps}>
                                        <NumberInput
                                            value={row.item || ""}
                                            onChange={(value) => handleInputChange(rowIndex, "item", value)}
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
                                        <Textarea
                                            value={row.lwhText}
                                            onChange={(e) => handleInputChange(rowIndex, "lwhText", e.target.value)}
                                            placeholder="LWH Text (one set per line)"
                                            size="sm"
                                            rows={3}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                        <Td {...cellProps}>
                                            <Textarea
                                                value={row.dgUn || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "dgUn", e.target.value)}
                                                placeholder="Enter DG/UN Number"
                                                size="sm"
                                                rows={3}
                                                resize="vertical"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
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
                                        <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Box position="relative" flex="1">
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
                                                value={row.viaHub || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "viaHub", e.target.value)}
                                                placeholder="Enter HUB 1"
                                                size="sm"
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
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "viaHub", false)}>
                                                            Assign to below row
                                                        </MenuItem>
                                                        <MenuItem onClick={() => copyValueToRowsBelow(rowIndex, "viaHub", true)}>
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
                                                placeholder="Enter HUB 2"
                                                size="sm"
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
                                                placeholder="AP Destination"
                                                size="sm"
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
                                        {/* Destination - Free text */}
                                        <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                value={row.destination || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "destination", e.target.value)}
                                                placeholder="Enter Destination"
                                                size="sm"
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
                                        {/* Shipping Docs - Free text + textarea */}
                                        <Td {...cellProps}>
                                            <Textarea
                                                value={row.shippingDoc || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "shippingDoc", e.target.value)}
                                                placeholder="Enter Shipping Docs"
                                            size="sm"
                                                rows={3}
                                                resize="vertical"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                    </Td>
                                        {/* Export docs - Free text + textarea */}
                                        <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Textarea
                                                value={row.exportDoc || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "exportDoc", e.target.value)}
                                                placeholder="Enter Export docs"
                                                size="sm"
                                                rows={3}
                                                resize="vertical"
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
                                        {/* Export doc 2 - Free text + textarea */}
                                        <Td {...cellProps} position="relative">
                                            <Flex gap="1" align="center">
                                                <Textarea
                                                    value={row.exportDoc2 || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "exportDoc2", e.target.value)}
                                                    placeholder="Enter Export Doc 2"
                                                    size="sm"
                                                    rows={3}
                                                    resize="vertical"
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
                                        {/* Remarks - Free text + textarea */}
                                        <Td {...cellProps} position="relative">
                                            <Flex gap="1" align="center">
                                                <Textarea
                                                    value={row.remarks || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "remarks", e.target.value)}
                                                    placeholder="Enter Remarks"
                                                    size="sm"
                                                    rows={3}
                                                    resize="vertical"
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
                                        {/* Internal Remark - Free text + textarea */}
                                        <Td {...cellProps}>
                                            <Textarea
                                                value={row.internalRemark || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "internalRemark", e.target.value)}
                                                placeholder="Enter Internal Remark"
                                                size="sm"
                                                rows={3}
                                                resize="vertical"
                                                bg={inputBg}
                                                color={inputText}
                                                borderColor={borderColor}
                                            />
                                        </Td>
                                        {/* SO - Free text */}
                                        <Td {...cellProps} position="relative">
                                        <Flex gap="1" align="center">
                                            <Input
                                                type="text"
                                                inputMode="text"
                                                value={row.soNumber || ""}
                                                onChange={(e) => handleInputChange(rowIndex, "soNumber", e.target.value)}
                                                placeholder="Enter SO (e.g., 00021 1.1)"
                                                size="sm"
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
                                        {/* SI Number - Free text */}
                                        <Td {...cellProps} position="relative">
                                            <Flex gap="1" align="center">
                                                <Input
                                                    type="text"
                                                    inputMode="text"
                                                    value={row.siNumber || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "siNumber", e.target.value)}
                                                    placeholder="Enter SI Number (e.g., SI-00021 1.1)"
                                                    size="sm"
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
                                        {/* SI Combined - Free text */}
                                        <Td {...cellProps} position="relative">
                                            <Flex gap="1" align="center">
                                                <Input
                                                    type="text"
                                                    inputMode="text"
                                                    value={row.siCombined || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "siCombined", e.target.value)}
                                                    placeholder="Enter SI Combined (e.g., SIC-00021 1.1)"
                                                    size="sm"
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
                                        {/* DI Number - Free text */}
                                        <Td {...cellProps} position="relative">
                                            <Flex gap="1" align="center">
                                                <Input
                                                    type="text"
                                                    inputMode="text"
                                                    value={row.diNumber || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "diNumber", e.target.value)}
                                                    placeholder="Enter DI Number (e.g., DI-00021 1.1)"
                                                    size="sm"
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
                                        {/* Client Access - Yes or No */}
                                        <Td {...cellProps}>
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
                                                    id={`file-upload-${rowIndex}`}
                                                    style={{ display: 'none' }}
                                                />
                                                <label htmlFor={`file-upload-${rowIndex}`}>
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
                    </Box>
                </Card>
            </Box>
        </Box>
    );
} 
