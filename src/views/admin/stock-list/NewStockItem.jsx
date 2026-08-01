import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
    MdSave,
    MdChevronLeft,
    MdAdd,
    MdContentCopy,
    MdDelete,
    MdClose,
    MdAttachFile,
    MdClose as MdRemove,
    MdVisibility,
} from "react-icons/md";
import { normalizeStockStatusKey, shouldGenerateStockReportForStatusChange } from "../../../constants/stockStatus";
import { useStock } from "../../../redux/hooks/useStock";
import { useUser } from "../../../redux/hooks/useUser";
import { useMasterData } from "../../../hooks/useMasterData";
import { getCached, MASTER_KEYS } from "../../../utils/masterDataCache";
import api from "../../../api/axios";
import { createStockItemApi, updateStockItemApi } from "../../../api/stock";
import { AssignToRowsBelowMenu, CellWithAssignMenu } from "../../../components/forms/AssignToRowsBelowMenu";
import RemoteSearchableSelect from "../../../components/forms/RemoteSearchableSelect";
import StockOriginCountrySelect from "../../../components/forms/StockOriginCountrySelect";
import StockIdNameSearchableSelect from "../../../components/forms/StockIdNameSearchableSelect";
import StockValueInput from "../../../components/forms/StockValueInput";
import useStockDestinationOptions from "../../../hooks/useStockDestinationOptions";
import useStockFormRemoteSelects from "../../../hooks/useStockFormRemoteSelects";
import useStockListOptionPins from "../../../hooks/useStockListOptionPins";
import { mergeSelectedIntoOptions } from "../../../utils/stockFormSelectUtils";
import {
    buildStockDestinationNewPayload,
    formatStockDestinationDisplay,
    getStockM2OId,
    getStockM2OName,
} from "../../../utils/stockDestinationOptions";
import { buildStockCreateLinePayload } from "../../../utils/stockCreatePayload";
import { pickStockUpdateChangedFields, buildStockUpdateDimensionsOps } from "../../../utils/stockUpdatePayload";
import {
    filterItemsWithBulkSaveFailures,
    filterRowsWithBulkSaveFailures,
    getStockBulkSaveResultData,
    hasStockBulkSaveErrors,
    showStockBulkSaveToasts,
} from "../../../utils/stockBulkSaveResult";
import {
    createAppendStockReportPdfOnStatusChange,
    createSaveRowBeforeStockReportPdf,
    createStockPdfRowHelpers,
} from "../../../utils/stockReportPdf";
import { partitionAttachmentsRow, collectRowAttachmentsForPreview } from "../../../utils/stockReportAttachmentsUi";
import StockReportHistoryModal from "../../../components/stock-list/StockReportHistoryModal";
import { useStockAttachmentsGallery } from "../../../hooks/useStockAttachmentsGallery";
import { calculateVolumeCbmFromLwhCm, formatVolumeCbm, resolveDisplayVolumeCbm } from "../../../utils/stockVolume";
import { StockSoNumberOpenButton } from "../../../components/stock-list/StockSoNumberLink";
import {
  resolveStockSoIdForForm,
  buildStockSoIdM2O,
  buildShippingOrderSelectOptions,
  normalizeStockFormSoId,
  buildStockSoIdPayloadValue,
} from "../../../utils/shippingOrderListState";
import { isStockOriginHubFormField, normalizeStockOriginHubText } from "../../../utils/stockOriginHubText";
import {
    getStockLocationOptionName,
    getStockViaHub1Display,
    getStockViaHub2Display,
    mergeStockIdNameOptions,
    resolveStockLocationOptionId,
    toStockLocationPayloadId,
} from "../../../utils/stockLocationOptions";
import { normalizeStockValueForForm, normalizeStockValueForSave } from "../../../utils/stockValue";

export default function StockForm() {
    const history = useHistory();
    const location = useLocation();
    const { id } = useParams();
    const searchParams = new URLSearchParams(location.search);
    const bulkIds = searchParams.get('ids');
    const stateData = location.state || {};
    const selectedItemsFromState = stateData.selectedItems || [];
    const filterState = stateData.filterState || null;
    const sourcePage = stateData.sourcePage || null;
    const isEditFromList = selectedItemsFromState.length > 0;
    const isBulkEdit = !!bulkIds || (isEditFromList && (stateData.isBulkEdit || selectedItemsFromState.length > 1));
    const isEditing = !!id || isBulkEdit || isEditFromList;
    const toast = useToast();
    const { user } = useUser();
    const { updateStockItem, getStockList, updateLoading, stockList } = useStock();
    const { clients, vessels, suppliers, pics, currencies, refreshClients, refreshVessels } = useMasterData();
    const {
        destinationOptions,
        viaHub1Options,
        viaHub2Options,
        narviApDestinationOptions,
        originTextOptions,
        isLoading: isLoadingDestinationOptions,
        setQDestination,
        setQViaHub1,
        setQViaHub2,
        setQNarviApDestination,
        setQOriginText,
    } = useStockDestinationOptions();
    const { pinOption, seedOption, getOptionsForValue, findOptionById } = useStockListOptionPins();
    const {
        shippingOrders,
        isLoadingShippingOrders,
        handleShippingOrderSearchChange,
        ensureShippingOrderForSelection,
        getClientOptionsForValue,
        handleClientSearchChange,
        isLoadingClients,
        getSupplierOptionsForValue,
        handleSupplierSearchChange,
        isLoadingSuppliers,
        getVesselOptionsForClient,
        handleVesselSearchChange,
        ensureVesselsLoadedForClient,
        isLoadingVesselByClient,
    } = useStockFormRemoteSelects({
        masterClients: clients,
        masterSuppliers: suppliers,
        masterVessels: vessels,
    });
    const [isLoading, setIsLoading] = useState(isEditing && !isEditFromList);
    const [selectedItems, setSelectedItems] = useState([]);
    const hasFetchedCurrenciesRef = React.useRef(false);
    const hasPatchedLegacySoIdRef = React.useRef(false);
    const hasInitializedFromListRef = useRef(false);

    // Dimensions modal state
    const { isOpen: isDimensionsModalOpen, onOpen: onDimensionsModalOpen, onClose: onDimensionsModalClose } = useDisclosure();
    const [currentRowIndexForDimensions, setCurrentRowIndexForDimensions] = useState(0);
    const [dimensionsList, setDimensionsList] = useState([]);

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
        // maxW: "200px",
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
        reqNo: "", // Free text + textarea (API: req_no)
        expReadyInStock: "", // Ready ex Supplier - date field
        warehouseId: "", // Free text + textarea
        dateOnStock: "", // Date field
        shippedDate: "", // Shipped date
        deliveredDate: "", // Delivered date
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
        originId: null,
        origin_text: "",
        narviStockViaHub1: null,
        narviStockViaHub1Name: "",
        narviStockViaHub2: null,
        narviStockViaHub2Name: "",
        narviStockApDestination: null,
        narviStockApDestinationName: "",
        destinationId: null,
        destinationName: "",
        shippingDoc: "", // Shipping Docs - Free text + textarea
        exportDoc: "", // Export doc 1 - Free text + textarea
        exportDoc2: "", // Export doc 2 - Free text + textarea
        remarks: "", // Remarks - Free text + textarea
        internalRemark: "", // Internal Remark - Free text + textarea
        soId: null, // Shipping order M2O (so_id.id)
        soIdApiHint: null, // stock.so_id M2O or stock_so_number for API so_id lookup
        siNumber: "", // SI Number - STRING type (preserves spaces, e.g., "00021 1.1")
        siCombined: "", // SI Combined - STRING type (preserves spaces, e.g., "00021 1.1")
        diNumber: "", // DI Number - STRING type (preserves spaces, e.g., "00021 1.1")
        clientAccess: true, // Client Access - Yes or No (default Yes)
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
        dimensions: [], // Array of dimension objects { id, length_cm, width_cm, height_cm, volume_cbm, cw_air_freight }
        stockStatusChangedBy: "",
        stockStatusPreviousForPayload: "",
    });

    // Form state - array of rows
    const [formRows, setFormRows] = useState([getEmptyRow()]);
    const formRowsRef = useRef(formRows);
    const getPayloadRef = useRef(() => ({}));
    const [stockReportPdfLoadingRowIndex, setStockReportPdfLoadingRowIndex] = useState(null);
    const [stockReportHistoryRowIndex, setStockReportHistoryRowIndex] = useState(null);
    const { openGallery, galleryModal } = useStockAttachmentsGallery();
    const statusPdfScheduleDedupeRef = useRef(null);

    useEffect(() => {
        formRowsRef.current = formRows;
    }, [formRows]);

    const shippingOrderOptions = useMemo(
        () => buildShippingOrderSelectOptions(shippingOrders),
        [shippingOrders]
    );

    const stockReportPdfHelpers = useMemo(
        () =>
            createStockPdfRowHelpers({
                clients,
                vessels,
                suppliers,
                currencies,
                shippingOrders,
            }),
        [clients, vessels, suppliers, currencies, shippingOrders]
    );

    const statusChangeActorName = useMemo(
        () =>
            (user?.name && String(user.name).trim()) ||
            (user?.email && String(user.email).trim()) ||
            "",
        [user?.name, user?.email]
    );

    const getVesselLoadingKey = useCallback((clientId) => {
        const normalized = clientId == null || clientId === "" ? "__all__" : String(clientId);
        return normalized;
    }, []);

    // Load stock items for bulk edit or single edit
    const ADD_STOCK_HAS_DATA_KEY = "addStockHasData";
    const ADD_STOCK_HAS_DATA_EVENT = "addStockHasDataChange";

    const setAddStockHasDataFlag = useCallback((hasData) => {
        try {
            if (hasData) {
                sessionStorage.setItem(ADD_STOCK_HAS_DATA_KEY, "1");
            } else {
                sessionStorage.removeItem(ADD_STOCK_HAS_DATA_KEY);
            }
            window.dispatchEvent(new CustomEvent(ADD_STOCK_HAS_DATA_EVENT));
        } catch (e) {
            // ignore
        }
    }, []);

    const hasFormData = useCallback((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return false;
        const emptyRow = getEmptyRow();
        for (const row of rows) {
            for (const key of Object.keys(emptyRow)) {
                if (key === "id" || key === "attachmentsToDelete") continue;
                const v = row[key];
                const empty = emptyRow[key];
                if (v === empty) continue;
                if (Array.isArray(v) && Array.isArray(empty) && v.length === 0) continue;
                if (v != null && v !== "" && String(v).trim() !== "") return true;
                if (Array.isArray(v) && v.length > 0) return true;
            }
        }
        return false;
    }, []);

    useEffect(() => {
        if (!isEditing) {
            const hasData = hasFormData(formRows);
            setAddStockHasDataFlag(hasData);
        } else {
            setAddStockHasDataFlag(false);
        }
        return () => setAddStockHasDataFlag(false);
    }, [isEditing, formRows, hasFormData, setAddStockHasDataFlag]);

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
            if (isEditFromList) return;
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
        isEditFromList,
        bulkIds,
        history,
        toast,
        ensureStockData,
    ]);

    // Currencies and PICs come from cache (useMasterData). Ensure clients/vessels cache on mount.
    useEffect(() => {
        if (hasFetchedCurrenciesRef.current) return;
        hasFetchedCurrenciesRef.current = true;
        refreshClients();
        refreshVessels();
    }, [refreshClients, refreshVessels]);

    useEffect(() => {
        formRows.forEach((row) => {
            if (!row.soId) return;
            ensureShippingOrderForSelection(row.soId, { soField: row.soIdApiHint ?? null });
        });
    }, [formRows, ensureShippingOrderForSelection]);

    useEffect(() => {
        if (!shippingOrders.length || hasPatchedLegacySoIdRef.current || !isEditing) return;
        hasPatchedLegacySoIdRef.current = true;

        setFormRows((prev) => {
            let changed = false;
            const next = prev.map((row) => {
                if (row.soId != null || !row.stockId) return row;
                const stock =
                    stockList?.find((s) => String(s.id) === String(row.stockId)) ||
                    selectedItemsFromState.find((s) => String(s.id) === String(row.stockId));
                if (!stock) return row;
                const soId = normalizeStockFormSoId(resolveStockSoIdForForm(stock, shippingOrders));
                if (!soId) return row;
                changed = true;
                return { ...row, soId };
            });
            return changed ? next : prev;
        });
    }, [shippingOrders, isEditing, stockList, selectedItemsFromState]);

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

    // Sync form rows from cache (read getCached inside effect + refs to avoid infinite loop from useMasterData refs)
    const hasSyncedClientsRef = React.useRef(false);
    const hasSyncedVesselsRef = React.useRef(false);
    const hasSyncedSuppliersRef = React.useRef(false);

    const resolveOriginOptionId = useCallback((stock) => {
        // Prefer explicit origin id (same pattern as vessel/supplier), then name match.
        const fromId =
            resolveStockLocationOptionId(stock?.origin_id) ??
            resolveStockLocationOptionId(stock?.origin);
        if (fromId != null) return fromId;

        const rawText = stock?.origin_text;
        if (rawText == null || rawText === false || rawText === "") return null;

        // origin_text may itself be a numeric id or an {id,name}/[id,name] value
        const asId = resolveStockLocationOptionId(rawText);
        if (asId != null) return asId;

        const text = normalizeStockOriginHubText(
            getStockLocationOptionName(rawText) || String(rawText)
        );
        if (!text) return null;

        const match = originTextOptions.find(
            (o) => normalizeStockOriginHubText(o.name || "") === text
        );
        return match ? match.id : null;
    }, [originTextOptions]);

    const resolveOriginDisplayName = useCallback((stock, originId = null) => {
        const fromField =
            getStockLocationOptionName(stock?.origin_id) ||
            getStockLocationOptionName(stock?.origin) ||
            getStockLocationOptionName(stock?.origin_text);
        if (fromField) return normalizeStockOriginHubText(fromField);

        if (
            typeof stock?.origin_text === "string" &&
            stock.origin_text &&
            !/^\d+$/.test(stock.origin_text.trim())
        ) {
            return normalizeStockOriginHubText(stock.origin_text);
        }

        if (originId != null) {
            const match = originTextOptions.find((o) => String(o.id) === String(originId));
            if (match?.name) return normalizeStockOriginHubText(match.name);
        }
        return "";
    }, [originTextOptions]);

    const cleanLocationDisplay = useCallback((value) => {
        const text = value == null || value === false ? "" : String(value).trim();
        return !text || text === "-" ? "" : text;
    }, []);

    const seedLocationPinsFromStock = useCallback((stock, rowData) => {
        seedOption("viaHub1", rowData.narviStockViaHub1, rowData.narviStockViaHub1Name);
        seedOption("viaHub2", rowData.narviStockViaHub2, rowData.narviStockViaHub2Name);
        seedOption(
            "apDestination",
            rowData.narviStockApDestination,
            rowData.narviStockApDestinationName
        );
        seedOption("destination", rowData.destinationId, rowData.destinationName);
        seedOption(
            "origin",
            rowData.originId,
            rowData.origin_text || resolveOriginDisplayName(stock, rowData.originId)
        );
    }, [seedOption, resolveOriginDisplayName]);

    // Resolve originId / origin_text from options when they load (select is name-bound)
    useEffect(() => {
        if (!originTextOptions.length) return;
        setFormRows((prevRows) => {
            let changed = false;
            const next = prevRows.map((row) => {
                if (row.originId) {
                    const pinned = findOptionById("origin", originTextOptions, row.originId);
                    if (pinned) {
                        seedOption("origin", pinned.id, pinned.name);
                        const resolvedText = normalizeStockOriginHubText(pinned.name || "");
                        if (resolvedText && resolvedText !== normalizeStockOriginHubText(row.origin_text || "")) {
                            changed = true;
                            return { ...row, origin_text: resolvedText };
                        }
                        return row;
                    }
                    if (row.origin_text) seedOption("origin", row.originId, row.origin_text);
                    return row;
                }
                const text = normalizeStockOriginHubText(row.origin_text || "");
                if (!text) return row;
                const match = originTextOptions.find((o) => {
                    const name = normalizeStockOriginHubText(o.name || "");
                    return name === text || String(o.id) === text;
                });
                if (!match) return row;
                changed = true;
                seedOption("origin", match.id, match.name);
                return {
                    ...row,
                    originId: match.id,
                    origin_text: normalizeStockOriginHubText(match.name || text),
                };
            });
            return changed ? next : prevRows;
        });
    }, [originTextOptions, seedOption, findOptionById]);

    // Fill hub/destination display names + pins once option lists load
    useEffect(() => {
        if (
            !viaHub1Options.length &&
            !viaHub2Options.length &&
            !narviApDestinationOptions.length &&
            !destinationOptions.length
        ) {
            return;
        }
        setFormRows((prevRows) => {
            let changed = false;
            const next = prevRows.map((row) => {
                let updated = row;

                const applyName = (id, currentName, poolKey, pool, nameKey) => {
                    if (id == null || id === "") return;
                    const match = findOptionById(poolKey, pool, id);
                    const label = (match?.name || currentName || "").trim();
                    seedOption(poolKey, id, label || `#${id}`);
                    if (match?.name && String(currentName || "").trim() !== String(match.name).trim()) {
                        changed = true;
                        updated = { ...updated, [nameKey]: match.name };
                    }
                };

                applyName(
                    updated.narviStockViaHub1,
                    updated.narviStockViaHub1Name,
                    "viaHub1",
                    viaHub1Options,
                    "narviStockViaHub1Name"
                );
                applyName(
                    updated.narviStockViaHub2,
                    updated.narviStockViaHub2Name,
                    "viaHub2",
                    viaHub2Options,
                    "narviStockViaHub2Name"
                );
                applyName(
                    updated.narviStockApDestination,
                    updated.narviStockApDestinationName,
                    "apDestination",
                    narviApDestinationOptions,
                    "narviStockApDestinationName"
                );
                applyName(
                    updated.destinationId,
                    updated.destinationName,
                    "destination",
                    destinationOptions,
                    "destinationName"
                );
                return updated;
            });
            return changed ? next : prevRows;
        });
    }, [
        formRows,
        viaHub1Options,
        viaHub2Options,
        narviApDestinationOptions,
        destinationOptions,
        findOptionById,
        seedOption,
    ]);

    // Prefetch option lists by current labels so remote search can resolve selected values
    const hasPrefetchedLocationOptionsRef = React.useRef(false);
    useEffect(() => {
        if (!isEditing || hasPrefetchedLocationOptionsRef.current || !formRows.length) return;
        const row = formRows[0];
        const hasAnyLabel = Boolean(
            row?.origin_text ||
            row?.narviStockViaHub1Name ||
            row?.narviStockViaHub2Name ||
            row?.narviStockApDestinationName ||
            row?.destinationName
        );
        if (!row || !hasAnyLabel) return;
        hasPrefetchedLocationOptionsRef.current = true;
        if (row.origin_text) setQOriginText(String(row.origin_text));
        if (row.narviStockViaHub1Name) setQViaHub1(String(row.narviStockViaHub1Name));
        if (row.narviStockViaHub2Name) setQViaHub2(String(row.narviStockViaHub2Name));
        if (row.narviStockApDestinationName) setQNarviApDestination(String(row.narviStockApDestinationName));
        if (row.destinationName) setQDestination(String(row.destinationName));
    }, [isEditing, formRows, setQOriginText, setQViaHub1, setQViaHub2, setQNarviApDestination, setQDestination]);

    useEffect(() => {
        const uniqueClientIds = [...new Set(formRows.map((row) => row.client).filter(Boolean).map((clientId) => String(clientId)))];
        uniqueClientIds.forEach((clientId) => {
            ensureVesselsLoadedForClient(clientId);
        });
    }, [formRows, ensureVesselsLoadedForClient]);

    // Normalize client IDs when formRows load
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
                const fallbackMatch = clientsList.find(
                    (client) => String(client.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) return { ...row, client: String(fallbackMatch.id) };
                return row;
            })
        );
    }, [formRows]);

    // Normalize vessel IDs when formRows load and auto-fill vessel_destination and vessel_eta
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
                        updatedRow.destinationId = Number.isFinite(Number(destId)) ? Number(destId) : null;
                        updatedRow.vesselDestination = destId;
                        if (Number.isFinite(Number(destId))) {
                            updatedRow.narviStockApDestination = Number(destId);
                        }
                    }
                    if (exactMatch.eta || exactMatch.eta_date) {
                        const etaDate = exactMatch.eta_date || exactMatch.eta;
                        updatedRow.vesselEta = etaDate instanceof Date
                            ? etaDate.toISOString().split('T')[0]
                            : (typeof etaDate === 'string' ? etaDate.split(' ')[0] : "");
                    }
                    return updatedRow;
                }
                const fallbackMatch = vesselsList.find(
                    (vessel) => String(vessel.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) {
                    const updatedRow = { ...row, vessel: String(fallbackMatch.id) };
                    const vesselDestId = fallbackMatch.destination_id || fallbackMatch.destination;
                    if (vesselDestId) {
                        const destId = String(vesselDestId);
                        updatedRow.destinationId = Number.isFinite(Number(destId)) ? Number(destId) : null;
                        updatedRow.vesselDestination = destId;
                        if (Number.isFinite(Number(destId))) {
                            updatedRow.narviStockApDestination = Number(destId);
                        }
                    }
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
    }, [formRows]);

    // Normalize supplier IDs when formRows load
    useEffect(() => {
        if (!formRows.length) return;
        const suppliersList = getCached(MASTER_KEYS.SUPPLIERS) ?? [];
        if (!suppliersList.length || hasSyncedSuppliersRef.current) return;
        hasSyncedSuppliersRef.current = true;
        setFormRows((prevRows) =>
            prevRows.map((row) => {
                if (!row.supplier || row.supplier === "" || row.supplier === false) return row;
                const normalizedValue = String(row.supplier);
                const exactMatch = suppliersList.find((supplier) => String(supplier.id) === normalizedValue);
                if (exactMatch) return { ...row, supplier: String(exactMatch.id) };
                const fallbackMatch = suppliersList.find(
                    (supplier) => String(supplier.name)?.toLowerCase() === normalizedValue.toLowerCase()
                );
                if (fallbackMatch) return { ...row, supplier: String(fallbackMatch.id) };
                return row;
            })
        );
    }, [formRows]);

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
            if (typeof value === "object" && value !== null) {
                if (value.id !== undefined && value.id !== null && value.id !== false && value.id !== "") {
                    return String(value.id);
                }
                return "";
            }
            return String(value);
        };

        const resolveRelationId = (...candidates) => {
            for (const candidate of candidates) {
                const id = normalizeId(candidate);
                if (id) return id;
            }
            return "";
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
            client: resolveRelationId(stock.client_id, stock.client),
            vessel: resolveRelationId(stock.vessel_id, stock.vessel),
            pic: resolveRelationId(stock.pic_new, stock.pic_id, stock.pic) || null,
            stockStatus: normalizeStockStatusKey(getFieldValue(stock.stock_status)),
            supplier: resolveRelationId(stock.supplier_id, stock.supplier),
            poNumber: getFieldValue(stock.po_text) || "",
            reqNo: getFieldValue(stock.req_no) || "",
            expReadyInStock: getFieldValue(stock.exp_ready_in_stock) || "",
            warehouseId: getFieldValue(stock.warehouse_new) || getFieldValue(stock.warehouse_id) || "",
            dateOnStock: getFieldValue(stock.date_on_stock) || "",
            shippedDate: getFieldValue(stock.shipped_date) || "",
            deliveredDate: getFieldValue(stock.delivered_date) || "",
            item: stock.item || stock.items || stock.item_id || stock.stock_items_quantity || "",
            weightKgs: getFieldValue(stock.weight_kg ?? stock.weight_kgs, ""),
            lengthCm: getFieldValue(stock.length_cm, ""),
            widthCm: getFieldValue(stock.width_cm, ""),
            heightCm: getFieldValue(stock.height_cm, ""),
            volumeNoDim: getFieldValue(stock.volume_no_dim ?? stock.volume_dim ?? stock.volume_cbm, ""),
            lwhText: getFieldValue(stock.lwh_text),
            dgUn: getFieldValue(stock.dg_un) || "",
            value: normalizeStockValueForForm(getFieldValue(stock.value, "")),
            currency: resolveRelationId(stock.currency_id, stock.currency) || null,
            originId: (() => {
                const oid = resolveOriginOptionId(stock);
                return oid != null ? oid : null;
            })(),
            origin_text: (() => {
                const oid = resolveOriginOptionId(stock);
                return resolveOriginDisplayName(stock, oid);
            })(),
            narviStockViaHub1: resolveStockLocationOptionId(stock.narvi_stock_via_hub1),
            narviStockViaHub1Name: (() => {
                const fromM2O = getStockLocationOptionName(stock.narvi_stock_via_hub1);
                if (fromM2O) return fromM2O;
                const id = resolveStockLocationOptionId(stock.narvi_stock_via_hub1);
                const display = cleanLocationDisplay(getStockViaHub1Display(stock));
                // Avoid treating bare numeric ids as labels (select already binds by id)
                if (display && id != null && display === String(id)) return "";
                return display ? normalizeStockOriginHubText(display) : "";
            })(),
            narviStockViaHub2: resolveStockLocationOptionId(stock.narvi_stock_via_hub2),
            narviStockViaHub2Name: (() => {
                const fromM2O = getStockLocationOptionName(stock.narvi_stock_via_hub2);
                if (fromM2O) return fromM2O;
                const id = resolveStockLocationOptionId(stock.narvi_stock_via_hub2);
                const display = cleanLocationDisplay(getStockViaHub2Display(stock));
                if (display && id != null && display === String(id)) return "";
                return display ? normalizeStockOriginHubText(display) : "";
            })(),
            narviStockApDestination:
                resolveStockLocationOptionId(stock.narvi_stock_ap_destination) ??
                getStockM2OId(stock.ap_destination_ids),
            narviStockApDestinationName: (() => {
                const fromM2O =
                    getStockLocationOptionName(stock.narvi_stock_ap_destination) ||
                    getStockM2OName(stock.ap_destination_ids);
                if (fromM2O) return fromM2O;
                const id =
                    resolveStockLocationOptionId(stock.narvi_stock_ap_destination) ??
                    getStockM2OId(stock.ap_destination_ids);
                const display = cleanLocationDisplay(formatStockDestinationDisplay(stock, "ap"));
                if (display && id != null && display === String(id)) return "";
                return display;
            })(),
            destinationId:
                getStockM2OId(stock.destination_ids) ??
                resolveStockLocationOptionId(stock.destination_ids) ??
                resolveStockLocationOptionId(stock.destination_id) ??
                resolveStockLocationOptionId(stock.destination),
            destinationName: (() => {
                const fromM2O = getStockM2OName(stock.destination_ids);
                if (fromM2O) return fromM2O;
                const text =
                    getFieldValue(stock.destination_new) ||
                    getFieldValue(stock.destination) ||
                    "";
                const id =
                    getStockM2OId(stock.destination_ids) ??
                    resolveStockLocationOptionId(stock.destination_ids) ??
                    resolveStockLocationOptionId(stock.destination_id) ??
                    resolveStockLocationOptionId(stock.destination);
                if (text && id != null && String(text).trim() === String(id)) return "";
                return text;
            })(),
            shippingDoc: getFieldValue(stock.shipping_doc),
            exportDoc: getFieldValue(stock.export_doc),
            exportDoc2: getFieldValue(stock.export_doc_2),
            remarks: getFieldValue(stock.remarks),
            internalRemark: getFieldValue(stock.internal_remark),
            soId: normalizeStockFormSoId(resolveStockSoIdForForm(stock, shippingOrders)),
            soIdApiHint: stock.so_id ?? stock.stock_so_number ?? null,
            siNumber: addSIPrefix(getFieldValue(stock.si_number) || ""),
            siCombined: addSICombinedPrefix(stock.si_combined === false ? "" : (getFieldValue(stock.si_combined) || "")),
            diNumber: addDIPrefix(getFieldValue(stock.di_no) || ""),
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
            stockStatusChangedBy: "",
            stockStatusPreviousForPayload: "",
            existingAttachments: Array.isArray(stock.attachments) ? stock.attachments : [], // Existing attachments from API
            dimensions: Array.isArray(stock.dimensions) ? stock.dimensions.map(dim => ({
                id: dim.id || null,
                calculation_method: dim.calculation_method || "lwh",
                length_cm: dim.length_cm || "",
                width_cm: dim.width_cm || "",
                height_cm: dim.height_cm || "",
                volume_dim: dim.volume_dim || "",
                volume_cbm: dim.volume_cbm || "",
                cw_air_freight: dim.cw_air_freight || "",
                weight_kg: dim.weight_kg || "",
            })) : [],
        };

        seedLocationPinsFromStock(stock, rowData);

        if (returnData) {
            return rowData;
        }
        setFormRows([rowData]);
    };

    // Load items passed from stock list (edit via add-stock route)
    useEffect(() => {
        if (!isEditFromList) return;
        if (hasInitializedFromListRef.current) return;
        hasInitializedFromListRef.current = true;

        const rows = selectedItemsFromState.map((item) => loadFormDataFromStock(item, true));
        setSelectedItems(selectedItemsFromState);
        setFormRows(rows.length > 0 ? rows : [getEmptyRow()]);
        setIsLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditFromList, selectedItemsFromState]);

    const navigateBackFromEdit = useCallback(() => {
        if (filterState) {
            const backPath = sourcePage === "stocks"
                ? "/admin/stock-list/stocks"
                : "/admin/stock-list/main-db";
            history.push({
                pathname: backPath,
                state: { filterState, fromEdit: true },
            });
        } else {
            history.goBack();
        }
    }, [filterState, sourcePage, history]);

    // Copy value(s) to row(s) below
    const copyValueToRowsBelow = (rowIndex, fields, copyToAll = false) => {
        const fieldList = Array.isArray(fields) ? fields : [fields];

        setFormRows((prev) => {
            const newRows = [...prev];
            const sourceValues = {};
            fieldList.forEach((field) => {
                sourceValues[field] = newRows[rowIndex][field];
            });

            const applyCopy = (targetIndex) => {
                newRows[targetIndex] = {
                    ...newRows[targetIndex],
                    ...sourceValues,
                };
            };

            if (copyToAll) {
                for (let i = rowIndex + 1; i < newRows.length; i++) {
                    applyCopy(i);
                }
            } else if (rowIndex + 1 < newRows.length) {
                applyCopy(rowIndex + 1);
            }

            return newRows;
        });
    };

    const assignCell = (rowIndex, fields, children, align = "center") => (
        <CellWithAssignMenu
            rowIndex={rowIndex}
            fields={fields}
            onCopy={copyValueToRowsBelow}
            totalRows={formRows.length}
            align={align}
        >
            {children}
        </CellWithAssignMenu>
    );

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
        if (field === "client" && value) {
            ensureVesselsLoadedForClient(value);
        }
        setFormRows(prev => {
            const newRows = [...prev];
            const oldStatus = prev[rowIndex]?.stockStatus ?? "";
            const previousClient = prev[rowIndex]?.client == null ? "" : String(prev[rowIndex].client);
            let processedValue = value;

            if (field === "soId") {
                processedValue = normalizeStockFormSoId(value);
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
            } else if (isStockOriginHubFormField(field)) {
                processedValue = normalizeStockOriginHubText(value);
            }

            const updatedRow = {
                ...newRows[rowIndex],
                [field]: processedValue
            };

            if (field === "client") {
                const nextClient = processedValue == null ? "" : String(processedValue);
                if (previousClient !== nextClient) {
                    updatedRow.vessel = "";
                    updatedRow.destinationId = null;
                    updatedRow.vesselDestination = "";
                    updatedRow.vesselEta = "";
                    updatedRow.narviStockApDestination = null;
                }
            }

            // Auto-fill vessel-related fields when vessel is selected
            if (field === "vessel" && value) {
                const selectedVessel =
                    getVesselOptionsForClient(updatedRow.client).find((v) => String(v.id) === String(value)) ||
                    vessels.find((v) => String(v.id) === String(value));
                if (selectedVessel) {
                    // Auto-fill destination from vessel
                    const vesselDestinationId = selectedVessel.destination_id || selectedVessel.destination;
                    const vesselDestinationName = selectedVessel.destination_name || selectedVessel.destination; // Try to get name
                    if (vesselDestinationId) {
                        const destId = String(vesselDestinationId);
                        updatedRow.destinationId = Number.isFinite(Number(destId)) ? Number(destId) : null;
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

            // Calculate volume_cbm from dimensions if available (LWH)
            if (field === "lengthCm" || field === "widthCm" || field === "heightCm") {
                const length = toNumber(updatedRow.lengthCm || 0);
                const width = toNumber(updatedRow.widthCm || 0);
                const height = toNumber(updatedRow.heightCm || 0);
                if (length > 0 && width > 0 && height > 0) {
                    // Convert cm to meters and calculate CBM: (L * W * H) / 1,000,000
                    updatedRow.volumeCbm = calculateVolumeCbmFromLwhCm(length, width, height);
                }
            }

            if (field === "stockStatus") {
                const newStatus = processedValue ?? "";
                if (String(oldStatus) !== String(newStatus) && String(newStatus).trim() !== "") {
                    updatedRow.stockStatusChangedBy = statusChangeActorName;
                    updatedRow.stockStatusPreviousForPayload = oldStatus;
                    if (shouldGenerateStockReportForStatusChange(oldStatus, newStatus)) {
                        const snapshot = { ...updatedRow };
                        const dedupeKey = `${rowIndex}|${String(oldStatus)}|${String(newStatus)}`;
                        if (statusPdfScheduleDedupeRef.current !== dedupeKey) {
                            statusPdfScheduleDedupeRef.current = dedupeKey;
                            queueMicrotask(() => {
                                statusPdfScheduleDedupeRef.current = null;
                                appendStockReportPdfOnStatusChange(rowIndex, snapshot, oldStatus, newStatus);
                            });
                        }
                    }
                }
            }

            if (field === "soId") {
                const order = shippingOrders.find((o) => String(o.id) === String(processedValue));
                updatedRow.soIdApiHint = order
                    ? { id: order.id, name: order.name, so_id: order.so_id }
                    : processedValue
                        ? updatedRow.soIdApiHint
                        : null;
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

    // Discard: clear all form data and navigate to stocklist view/edit page (add-stock only)
    const handleDiscard = () => {
        setFormRows([getEmptyRow()]);
        try {
            sessionStorage.removeItem(ADD_STOCK_HAS_DATA_KEY);
            window.dispatchEvent(new CustomEvent(ADD_STOCK_HAS_DATA_EVENT));
        } catch (e) {
            // ignore
        }
        history.push("/admin/stock-list/stocks");
    };

    const stockCreatePayloadContext = useMemo(
        () => ({
            clients,
            vessels,
            suppliers,
            currencies,
            pics,
            destinationOptions,
            shippingOrders,
            normalizeStockStatusKey,
            removeSIPrefix,
            removeDIPrefix,
            removeSICombinedPrefix,
        }),
        [
            clients,
            vessels,
            suppliers,
            currencies,
            pics,
            destinationOptions,
            shippingOrders,
        ]
    );

    const getPayload = (rowData, includeStockId = false) => {
        if (!includeStockId) {
            return buildStockCreateLinePayload(rowData, stockCreatePayloadContext);
        }

        const splitLines = (val) =>
            (val || "")
                .split(/\r?\n/)
                .map((v) => v.trim())
                .filter(Boolean);

        const poArray = splitLines(rowData.poNumber);
        const reqArray = splitLines(rowData.reqNo);
        const lwhArray = splitLines(rowData.lwhText);

        // Update payload (partial/changed fields) — create uses buildStockCreateLinePayload
        const payload = {
            stock_status: normalizeStockStatusKey(rowData.stockStatus) || "",
            stock_status_changed_by: rowData.stockStatusChangedBy || "",
            stock_status_previous: rowData.stockStatusPreviousForPayload ?? "",
            client_id: rowData.client ? String(rowData.client) : "",
            supplier_id: rowData.supplier ? String(rowData.supplier) : "",
            vessel_id: rowData.vessel ? String(rowData.vessel) : "",
            // PO numbers: raw text + array of lines
            po_text: rowData.poNumber || "",
            req_no: rowData.reqNo || "",
            pic_new: rowData.pic ? String(rowData.pic) : false,
            item_id: rowData.itemId ? String(rowData.itemId) : "", // Keep item_id for lines format
            stock_items_quantity: rowData.itemId ? String(rowData.itemId) : "", // Also include stock_items_quantity
            item: rowData.item !== "" && rowData.item !== null && rowData.item !== undefined ? toNumber(rowData.item) || 0 : 0,
            currency_id: rowData.currency ? String(rowData.currency) : "",
            origin_text: (() => {
                const match = findOptionById("origin", originTextOptions, rowData.originId);
                if (match) return normalizeStockOriginHubText(match.name || "");
                return normalizeStockOriginHubText(rowData.origin_text);
            })(),
            narvi_stock_via_hub1: toStockLocationPayloadId(rowData.narviStockViaHub1),
            narvi_stock_via_hub2: toStockLocationPayloadId(rowData.narviStockViaHub2),
            narvi_stock_ap_destination: toStockLocationPayloadId(rowData.narviStockApDestination),
            client_access: Boolean(rowData.clientAccess),
            remarks: rowData.remarks || "",
            internal_remark: rowData.internalRemark || "",
            weight_kg: toNumber(rowData.weightKgs) || 0,
            width_cm: toNumber(rowData.widthCm) || 0,
            length_cm: toNumber(rowData.lengthCm) || 0,
            height_cm: toNumber(rowData.heightCm) || 0,
            volume_dim: rowData.dimensions?.[0]?.calculation_method === "volume" ? (toNumber(rowData.dimensions[0].volume_dim) || 0) : 0,
            // volume_cbm calculated by backend from dimensions
            // LWH text: raw text + array of lines
            lwh_text: rowData.lwhText || "",
            cw_air_freight_new: toNumber(rowData.cwAirfreight) || 0,
            value: normalizeStockValueForSave(rowData.value),
            shipment_type: "", // Include shipment_type as empty string
            extra: rowData.extra2 || "",
            destination_new: buildStockDestinationNewPayload(
                rowData.destinationId,
                findOptionById("destination", destinationOptions, rowData.destinationId)?.name || "",
                destinationOptions
            ),
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
            dimensions: undefined, // filled below with create/update/delete ops
            vessel_destination: rowData.vesselDestination ? String(rowData.vesselDestination) : "", // Free text field
            vessel_eta: rowData.vesselEta || "",
            so_id: buildStockSoIdPayloadValue(rowData.soId, shippingOrders),
            si_number: rowData.siNumber ? (() => {
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
            di_no: rowData.diNumber ? (() => {
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
        payload.req_no_array = reqArray;
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

        // Diff against original stock — API only needs stock_id + changed fields
        const originalStock =
            selectedItems.find((s) => String(s.id) === String(rowData.stockId)) ||
            selectedItemsFromState.find((s) => String(s.id) === String(rowData.stockId)) ||
            (Array.isArray(stockList)
                ? stockList.find((s) => String(s.id) === String(rowData.stockId))
                : null);

        // Dimensions: create / update / delete ops (never re-create existing rows as create)
        const dimensionOps = buildStockUpdateDimensionsOps(
            rowData.dimensions,
            originalStock?.dimensions || []
        );
        if (dimensionOps) {
            payload.dimensions = dimensionOps;
        } else {
            delete payload.dimensions;
        }

        if (!originalStock) {
            return payload;
        }

        const baselineRow = loadFormDataFromStock(originalStock, true);
        const baselinePayload = {
            stock_id: originalStock.id,
            stock_status: normalizeStockStatusKey(baselineRow.stockStatus) || "",
            stock_status_changed_by: "",
            stock_status_previous: "",
            client_id: baselineRow.client ? String(baselineRow.client) : "",
            supplier_id: baselineRow.supplier ? String(baselineRow.supplier) : "",
            vessel_id: baselineRow.vessel ? String(baselineRow.vessel) : "",
            po_text: baselineRow.poNumber || "",
            req_no: baselineRow.reqNo || "",
            pic_new: baselineRow.pic ? String(baselineRow.pic) : false,
            item_id: baselineRow.itemId ? String(baselineRow.itemId) : "",
            stock_items_quantity: baselineRow.itemId ? String(baselineRow.itemId) : "",
            item: baselineRow.item !== "" && baselineRow.item !== null && baselineRow.item !== undefined
                ? toNumber(baselineRow.item) || 0
                : 0,
            currency_id: baselineRow.currency ? String(baselineRow.currency) : "",
            origin_text: (() => {
                const match = findOptionById("origin", originTextOptions, baselineRow.originId);
                if (match) return normalizeStockOriginHubText(match.name || "");
                return normalizeStockOriginHubText(baselineRow.origin_text);
            })(),
            narvi_stock_via_hub1: toStockLocationPayloadId(baselineRow.narviStockViaHub1),
            narvi_stock_via_hub2: toStockLocationPayloadId(baselineRow.narviStockViaHub2),
            narvi_stock_ap_destination: toStockLocationPayloadId(baselineRow.narviStockApDestination),
            client_access: Boolean(baselineRow.clientAccess),
            remarks: baselineRow.remarks || "",
            internal_remark: baselineRow.internalRemark || "",
            weight_kg: toNumber(baselineRow.weightKgs) || 0,
            width_cm: toNumber(baselineRow.widthCm) || 0,
            length_cm: toNumber(baselineRow.lengthCm) || 0,
            height_cm: toNumber(baselineRow.heightCm) || 0,
            volume_dim: baselineRow.dimensions?.[0]?.calculation_method === "volume"
                ? (toNumber(baselineRow.dimensions[0].volume_dim) || 0)
                : 0,
            lwh_text: baselineRow.lwhText || "",
            cw_air_freight_new: toNumber(baselineRow.cwAirfreight) || 0,
            value: normalizeStockValueForSave(baselineRow.value),
            shipment_type: "",
            extra: baselineRow.extra2 || "",
            destination_new: buildStockDestinationNewPayload(
                baselineRow.destinationId,
                findOptionById("destination", destinationOptions, baselineRow.destinationId)?.name || "",
                destinationOptions
            ),
            warehouse_new: baselineRow.warehouseId || "",
            shipping_doc: baselineRow.shippingDoc || "",
            export_doc: baselineRow.exportDoc || "",
            export_doc_2: baselineRow.exportDoc2 || "",
            date_on_stock: baselineRow.dateOnStock || "",
            exp_ready_in_stock: baselineRow.expReadyInStock || "",
            shipped_date: baselineRow.shippedDate || null,
            delivered_date: baselineRow.deliveredDate || "",
            details: baselineRow.details || "",
            dg_un: baselineRow.dgUn || "",
            attachments: [],
            attachment_to_delete: [],
            // No dimension ops on baseline — candidate already holds only changed ops
            dimensions: undefined,
            vessel_destination: baselineRow.vesselDestination ? String(baselineRow.vesselDestination) : "",
            vessel_eta: baselineRow.vesselEta || "",
            so_id: buildStockSoIdPayloadValue(baselineRow.soId, shippingOrders),
            si_number: baselineRow.siNumber
                ? String(removeSIPrefix(
                    String(baselineRow.siNumber).startsWith("SI-")
                        ? String(baselineRow.siNumber)
                        : `SI-${baselineRow.siNumber}`
                ))
                : "",
            si_combined: baselineRow.siCombined
                ? (() => {
                    let value = String(baselineRow.siCombined);
                    if (value && !value.startsWith("SIC-") && !value.startsWith("SI-C-") && !value.startsWith("SI-")) {
                        value = `SIC-${value}`;
                    }
                    const cleaned = String(removeSICombinedPrefix(value));
                    return cleaned === "" ? false : cleaned;
                })()
                : false,
            di_no: baselineRow.diNumber
                ? String(removeDIPrefix(
                    String(baselineRow.diNumber).startsWith("DI-")
                        ? String(baselineRow.diNumber)
                        : `DI-${baselineRow.diNumber}`
                ))
                : "",
            vessel_destination_text: baselineRow.vesselDestination || "",
            po_text_array: splitLines(baselineRow.poNumber),
            req_no_array: splitLines(baselineRow.reqNo),
            lwh_text_array: splitLines(baselineRow.lwhText),
        };

        if (baselineRow.stockItemId) {
            baselinePayload.stock_item_id = baselineRow.stockItemId;
        }

        return pickStockUpdateChangedFields(payload, baselinePayload);
    };
    getPayloadRef.current = getPayload;

    const saveRowBeforeStockReportPdf = useMemo(
        () =>
            createSaveRowBeforeStockReportPdf({
                formRowsRef,
                getLinePayload: (row, { isUpdate }) => getPayloadRef.current(row, isUpdate),
            }),
        []
    );

    const appendStockReportPdfOnStatusChange = useCallback(
        createAppendStockReportPdfOnStatusChange({
            formRowsRef,
            setFormRows,
            setStockReportPdfLoadingRowIndex,
            stockReportPdfHelpers,
            statusChangeActorName,
            toast,
            shippingOrders,
            saveRowBeforePdf: saveRowBeforeStockReportPdf,
        }),
        [stockReportPdfHelpers, statusChangeActorName, toast, shippingOrders, saveRowBeforeStockReportPdf]
    );

    const handleSaveStockItem = async () => {
        try {
            if ((isBulkEdit || isEditFromList) && (selectedItems.length > 0 || isEditFromList)) {
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
                const resultData = getStockBulkSaveResultData(result);

                if (resultData?.status === "success") {
                    showStockBulkSaveToasts(resultData, toast, {
                        fallbackSummary: `${lines.length} stock item(s) updated successfully`,
                    });
                    getStockList();
                    if (!hasStockBulkSaveErrors(resultData)) {
                        if (isEditFromList) {
                            navigateBackFromEdit();
                        } else {
                            history.push("/admin/stock-list/main-db");
                        }
                    } else {
                        const failedRows = filterRowsWithBulkSaveFailures(formRows, resultData);
                        if (failedRows.length > 0) {
                            setFormRows(failedRows);
                            const sourceItems = selectedItems.length > 0 ? selectedItems : selectedItemsFromState;
                            const failedItems = filterItemsWithBulkSaveFailures(sourceItems, resultData);
                            if (failedItems.length > 0) {
                                setSelectedItems(failedItems);
                            }
                        }
                    }
                } else {
                    throw new Error(resultData?.message || result?.message || "Failed to update stock items");
                }
            } else if (isEditing && id) {
                // Update existing single item - use first row, wrap in lines array
                if (formRows.length === 0) {
                    throw new Error('No data to save');
                }
                const linePayload = getPayload(formRows[0], true); // Include stock_id
                const payload = { lines: [linePayload] };
                const result = await updateStockItemApi(id, payload);
                const resultData = getStockBulkSaveResultData(result);

                if (resultData?.status === "success") {
                    showStockBulkSaveToasts(resultData, toast, {
                        fallbackSummary: "Stock item updated successfully",
                    });
                    getStockList();
                    if (!hasStockBulkSaveErrors(resultData)) {
                        if (isEditFromList) {
                            navigateBackFromEdit();
                        } else {
                            history.push("/admin/stock-list/main-db");
                        }
                    }
                } else {
                    throw new Error(resultData?.message || result?.message || "Failed to update stock item");
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

                    if (resultData.status === "success") {
                        showStockBulkSaveToasts(resultData, toast, {
                            fallbackSummary: "Stock items created successfully",
                        });
                        if (!hasStockBulkSaveErrors(resultData)) {
                            setAddStockHasDataFlag(false);
                            getStockList();
                            history.push("/admin/stock-list/stocks");
                        } else {
                            getStockList();
                            const failedRows = filterRowsWithBulkSaveFailures(formRows, resultData, {
                                getRowId: () => null,
                            });
                            if (failedRows.length > 0) {
                                setFormRows(failedRows);
                            }
                        }
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
                    {isEditFromList && (
                        <IconButton
                            icon={<Icon as={MdChevronLeft} />}
                            size="sm"
                            variant="ghost"
                            aria-label="Back"
                            onClick={navigateBackFromEdit}
                        />
                    )}
                    <Text fontSize={{ base: "sm", md: "md" }} fontWeight="bold" color={textColor}>
                        {isBulkEdit
                            ? `Bulk Edit Stock Items (${selectedItems.length || formRows.length})`
                            : isEditing
                                ? isEditFromList
                                    ? `Edit Stock Item${formRows.length > 1 ? `s (${formRows.length})` : ""}`
                                    : "Edit Stock Item"
                                : "Create New Stock Item"}
                    </Text>
                </HStack>

                <HStack spacing="3">
                    {!isEditing && (
                        <>
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
                            <Button
                                variant="outline"
                                size="sm"
                                px="6"
                                py="3"
                                borderRadius="md"
                                borderColor={borderColor}
                                color={textColor}
                                _hover={{ bg: inputBg }}
                                onClick={handleDiscard}
                            >
                                Discard
                            </Button>
                        </>
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
                        {isBulkEdit || isEditFromList
                            ? `Update All (${selectedItems.length || formRows.length} items)`
                            : isEditing
                                ? "Update Stock Item"
                                : `Save ${formRows.length} Item(s)`}
                    </Button>
                </HStack>
            </Flex>

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
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Supplier</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Req No</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PO Number</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Ready ex Supplier</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="200px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Warehouse ID</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Date on Stock</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Shipped Date</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="140px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Delivered Date</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">PCS</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="100px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Weight kgs</Th>
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="150px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Dimension</Th>
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
                                    <Th bg={useColorModeValue("gray.600", "gray.700")} color="white" borderRight="1px" borderColor={useColorModeValue("gray.500", "gray.600")} minW="120px" px="8px" py="12px" fontSize="11px" fontWeight="600" textTransform="uppercase">Stock Status</Th>
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
                                                    w="auto"
                                                    htmlSize={getAutoHtmlSize(row.stockItemId, "", { min: 12, max: 40 })}
                                                    bg={useColorModeValue("gray.100", "gray.700")}
                                                    color={inputText}
                                                    title={row.stockItemId ? String(row.stockItemId) : undefined}
                                                />
                                            </Td>
                                        )}
                                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                            {assignCell(rowIndex, "client",
                                                <RemoteSearchableSelect
                                                    value={row.client}
                                                    onChange={(value) => handleInputChange(rowIndex, "client", value)}
                                                    options={getClientOptionsForValue(row.client)}
                                                    placeholder="Select Client"
                                                    displayKey="name"
                                                    valueKey="id"
                                                    formatOption={(option) => option.name || `Client ${option.id}`}
                                                    isLoading={isLoadingClients}
                                                    onSearchChange={handleClientSearchChange}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                            {assignCell(rowIndex, "vessel",
                                                <RemoteSearchableSelect
                                                    value={row.vessel}
                                                    onChange={(value) => handleInputChange(rowIndex, "vessel", value)}
                                                    options={getVesselOptionsForClient(row.client, row.vessel)}
                                                    placeholder="Select Vessel"
                                                    displayKey="name"
                                                    valueKey="id"
                                                    formatOption={(option) => option.name || String(option.id ?? "")}
                                                    isLoading={Boolean(isLoadingVesselByClient[getVesselLoadingKey(row.client)])}
                                                    onSearchChange={(q) => handleVesselSearchChange(row.client, q)}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                            {assignCell(rowIndex, "pic",
                                                <RemoteSearchableSelect
                                                    value={row.pic ? String(row.pic) : null}
                                                    onChange={(value) => {
                                                        handleInputChange(rowIndex, "pic", value ? String(value) : null);
                                                    }}
                                                    options={pics}
                                                    placeholder="Select PIC"
                                                    displayKey="name"
                                                    valueKey="id"
                                                    formatOption={(option) => option.name || `PIC ${option.id}`}
                                                    isLoading={false}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    size="sm"
                                                    autoWidth
                                                    autoWidthMin={16}
                                                    autoWidthMax={40}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                            {assignCell(rowIndex, "supplier",
                                                <RemoteSearchableSelect
                                                    value={row.supplier}
                                                    onChange={(value) => handleInputChange(rowIndex, "supplier", value)}
                                                    options={getSupplierOptionsForValue(row.supplier)}
                                                    placeholder="Select Supplier"
                                                    displayKey="name"
                                                    valueKey="id"
                                                    formatOption={(option) => option.name || `Supplier ${option.id}`}
                                                    isLoading={isLoadingSuppliers}
                                                    onSearchChange={handleSupplierSearchChange}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={55}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "reqNo",
                                                <Textarea
                                                    value={row.reqNo || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "reqNo", e.target.value)}
                                                    placeholder="Enter Req No(s) - one per line"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.reqNo, "Enter Req No(s) - one per line", { min: 24, max: 90 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.reqNo ? String(row.reqNo) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "poNumber",
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
                                                    title={row.poNumber ? String(row.poNumber) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "expReadyInStock",
                                                <Input
                                                    type="date"
                                                    value={row.expReadyInStock || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "expReadyInStock", e.target.value)}
                                                    size="sm"
                                                    w="auto"
                                                    htmlSize={getAutoHtmlSize(row.expReadyInStock, "", { min: 12, max: 12 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.expReadyInStock ? String(row.expReadyInStock) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "warehouseId",
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
                                                    title={row.warehouseId ? String(row.warehouseId) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "dateOnStock",
                                                <Input
                                                    type="date"
                                                    value={row.dateOnStock || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "dateOnStock", e.target.value)}
                                                    size="sm"
                                                    w="auto"
                                                    htmlSize={getAutoHtmlSize(row.dateOnStock, "", { min: 12, max: 12 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.dateOnStock ? String(row.dateOnStock) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "shippedDate",
                                                <Input
                                                    type="date"
                                                    value={row.shippedDate || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "shippedDate", e.target.value)}
                                                    size="sm"
                                                    w="auto"
                                                    htmlSize={getAutoHtmlSize(row.shippedDate, "", { min: 12, max: 12 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.shippedDate ? String(row.shippedDate) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "deliveredDate",
                                                <Input
                                                    type="date"
                                                    value={row.deliveredDate || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "deliveredDate", e.target.value)}
                                                    size="sm"
                                                    w="auto"
                                                    htmlSize={getAutoHtmlSize(row.deliveredDate, "", { min: 12, max: 12 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.deliveredDate ? String(row.deliveredDate) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "item",
                                                <NumberInput
                                                    value={row.item || ""}
                                                    onChange={(value) => handleInputChange(rowIndex, "item", value)}
                                                    min={0}
                                                    precision={0}
                                                    size="sm"
                                                    minW="200px"
                                                    w="100%"
                                                >
                                                    <NumberInputField bg={inputBg} color={inputText} borderColor={borderColor} />
                                                </NumberInput>
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "weightKgs",
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
                                            )}
                                        </Td>
                                        <Td {...cellProps}>
                                            <HStack spacing={2}>
                                                <Button
                                                    size="sm"
                                                    leftIcon={<Icon as={MdAdd} />}
                                                    onClick={() => {
                                                        setCurrentRowIndexForDimensions(rowIndex);
                                                        setDimensionsList(row.dimensions || []);
                                                        onDimensionsModalOpen();
                                                    }}
                                                    colorScheme="blue"
                                                    variant="outline"
                                                >
                                                    Dimensions ({row.dimensions?.length || 0})
                                                </Button>
                                            </HStack>
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "lwhText",
                                                <Textarea
                                                    value={row.lwhText}
                                                    onChange={(e) => handleInputChange(rowIndex, "lwhText", e.target.value)}
                                                    placeholder="LWH Text (one set per line)"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.lwhText, "LWH Text (one set per line)", { min: 24, max: 90 })}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.lwhText ? String(row.lwhText) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "dgUn",
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
                                                    title={row.dgUn ? String(row.dgUn) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "value",
                                                <StockValueInput
                                                    value={row.value}
                                                    onChange={(value) => handleInputChange(rowIndex, "value", value)}
                                                    minW="200px"
                                                    w="100%"
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                                            {assignCell(rowIndex, "currency",
                                                <RemoteSearchableSelect
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
                                                    isLoading={false}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={16}
                                                    autoWidthMax={55}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "originId",
                                                <StockOriginCountrySelect
                                                    value={row.origin_text || ""}
                                                    selectedId={row.originId}
                                                    onChange={(name) => {
                                                        const text = normalizeStockOriginHubText(name || "");
                                                        const match = originTextOptions.find(
                                                            (o) => normalizeStockOriginHubText(o.name || "") === text
                                                        );
                                                        if (match) pinOption("origin", match);
                                                        handleInputChange(rowIndex, "origin_text", text);
                                                        handleInputChange(rowIndex, "originId", match?.id ?? null);
                                                    }}
                                                    options={getOptionsForValue(
                                                        "origin",
                                                        mergeStockIdNameOptions(
                                                            originTextOptions,
                                                            row.originId,
                                                            row.origin_text
                                                        ),
                                                        row.originId
                                                    )}
                                                    onSearchChange={setQOriginText}
                                                    isLoading={isLoadingDestinationOptions}
                                                    placeholder="Select origin..."
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "narviStockViaHub1",
                                                <StockIdNameSearchableSelect
                                                    value={row.narviStockViaHub1}
                                                    selectedName={row.narviStockViaHub1Name}
                                                    onChange={(id, name) => {
                                                        if (id != null && name) {
                                                            pinOption("viaHub1", { id, name });
                                                        }
                                                        handleInputChange(rowIndex, "narviStockViaHub1", id);
                                                        handleInputChange(rowIndex, "narviStockViaHub1Name", name || "");
                                                    }}
                                                    onSearchChange={setQViaHub1}
                                                    options={getOptionsForValue(
                                                        "viaHub1",
                                                        mergeStockIdNameOptions(
                                                            viaHub1Options,
                                                            row.narviStockViaHub1,
                                                            row.narviStockViaHub1Name
                                                        ),
                                                        row.narviStockViaHub1
                                                    )}
                                                    placeholder="Select Via HUB 1..."
                                                    isLoading={isLoadingDestinationOptions}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "narviStockViaHub2",
                                                <StockIdNameSearchableSelect
                                                    value={row.narviStockViaHub2}
                                                    selectedName={row.narviStockViaHub2Name}
                                                    onChange={(id, name) => {
                                                        if (id != null && name) {
                                                            pinOption("viaHub2", { id, name });
                                                        }
                                                        handleInputChange(rowIndex, "narviStockViaHub2", id);
                                                        handleInputChange(rowIndex, "narviStockViaHub2Name", name || "");
                                                    }}
                                                    onSearchChange={setQViaHub2}
                                                    options={getOptionsForValue(
                                                        "viaHub2",
                                                        mergeStockIdNameOptions(
                                                            viaHub2Options,
                                                            row.narviStockViaHub2,
                                                            row.narviStockViaHub2Name
                                                        ),
                                                        row.narviStockViaHub2
                                                    )}
                                                    placeholder="Select Via HUB 2..."
                                                    isLoading={isLoadingDestinationOptions}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible" zIndex={1}>
                                            {assignCell(rowIndex, "narviStockApDestination",
                                                <StockIdNameSearchableSelect
                                                    value={row.narviStockApDestination}
                                                    selectedName={row.narviStockApDestinationName}
                                                    onChange={(id, name) => {
                                                        if (id != null && name) {
                                                            pinOption("apDestination", { id, name });
                                                        }
                                                        handleInputChange(rowIndex, "narviStockApDestination", id);
                                                        handleInputChange(rowIndex, "narviStockApDestinationName", name || "");
                                                    }}
                                                    onSearchChange={setQNarviApDestination}
                                                    options={getOptionsForValue(
                                                        "apDestination",
                                                        mergeStockIdNameOptions(
                                                            narviApDestinationOptions,
                                                            row.narviStockApDestination,
                                                            row.narviStockApDestinationName
                                                        ),
                                                        row.narviStockApDestination
                                                    )}
                                                    placeholder="Select AP destination..."
                                                    isLoading={isLoadingDestinationOptions}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible" zIndex={1}>
                                            {assignCell(rowIndex, "destinationId",
                                                <StockIdNameSearchableSelect
                                                    value={row.destinationId}
                                                    selectedName={row.destinationName}
                                                    onChange={(id, name) => {
                                                        if (id != null && name) {
                                                            pinOption("destination", { id, name });
                                                        }
                                                        handleInputChange(rowIndex, "destinationId", id);
                                                        handleInputChange(rowIndex, "destinationName", name || "");
                                                    }}
                                                    onSearchChange={setQDestination}
                                                    options={getOptionsForValue(
                                                        "destination",
                                                        mergeStockIdNameOptions(
                                                            destinationOptions,
                                                            row.destinationId,
                                                            row.destinationName
                                                        ),
                                                        row.destinationId
                                                    )}
                                                    placeholder="Select destination..."
                                                    isLoading={isLoadingDestinationOptions}
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    autoWidth
                                                    autoWidthMin={18}
                                                    autoWidthMax={50}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "shippingDoc",
                                                <Textarea
                                                    value={row.shippingDoc || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "shippingDoc", e.target.value)}
                                                    placeholder="Enter Shipping Docs"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.shippingDoc, "Enter Shipping Docs", { min: 24, max: 90 })}
                                                    resize="vertical"
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.shippingDoc ? String(row.shippingDoc) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "exportDoc",
                                                <Textarea
                                                    value={row.exportDoc || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "exportDoc", e.target.value)}
                                                    placeholder="Enter Export docs"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.exportDoc, "Enter Export docs", { min: 24, max: 90 })}
                                                    resize="vertical"
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    flex="0 0 auto"
                                                    title={row.exportDoc ? String(row.exportDoc) : undefined}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "exportDoc2",
                                                <Textarea
                                                    value={row.exportDoc2 || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "exportDoc2", e.target.value)}
                                                    placeholder="Enter Export Doc 2"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.exportDoc2, "Enter Export Doc 2", { min: 24, max: 90 })}
                                                    resize="vertical"
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    flex="0 0 auto"
                                                    title={row.exportDoc2 ? String(row.exportDoc2) : undefined}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "remarks",
                                                <Textarea
                                                    value={row.remarks || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "remarks", e.target.value)}
                                                    placeholder="Enter Remarks"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.remarks, "Enter Remarks", { min: 24, max: 90 })}
                                                    resize="vertical"
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    flex="0 0 auto"
                                                    title={row.remarks ? String(row.remarks) : undefined}
                                                />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "internalRemark",
                                                <Textarea
                                                    value={row.internalRemark || ""}
                                                    onChange={(e) => handleInputChange(rowIndex, "internalRemark", e.target.value)}
                                                    placeholder="Enter Internal Remark"
                                                    size="sm"
                                                    rows={3}
                                                    w="auto"
                                                    minW="24ch"
                                                    maxW="90ch"
                                                    cols={getAutoCols(row.internalRemark, "Enter Internal Remark", { min: 24, max: 90 })}
                                                    resize="vertical"
                                                    bg={inputBg}
                                                    color={inputText}
                                                    borderColor={borderColor}
                                                    title={row.internalRemark ? String(row.internalRemark) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            <Flex gap="1" align="center" w="100%">
                                                <Box flex="1" minW="0">
                                                    <RemoteSearchableSelect
                                                        value={row.soId || null}
                                                        onChange={(val) => handleInputChange(rowIndex, "soId", val)}
                                                        options={shippingOrderOptions}
                                                        placeholder={
                                                            isLoadingShippingOrders
                                                                ? "Loading SO numbers..."
                                                                : "Search SO number..."
                                                        }
                                                        displayKey="name"
                                                        valueKey="id"
                                                        isLoading={isLoadingShippingOrders}
                                                        onSearchChange={handleShippingOrderSearchChange}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                        autoWidth
                                                        autoWidthMin={18}
                                                        autoWidthMax={50}
                                                    />
                                                </Box>
                                                <StockSoNumberOpenButton
                                                    item={{
                                                        so_id: buildStockSoIdM2O(row.soId, shippingOrders),
                                                    }}
                                                />
                                                <AssignToRowsBelowMenu
                                                    rowIndex={rowIndex}
                                                    fields="soId"
                                                    onCopy={copyValueToRowsBelow}
                                                    totalRows={formRows.length}
                                                />
                                            </Flex>
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "siNumber",
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
                                                    title={row.siNumber ? String(row.siNumber) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "siCombined",
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
                                                    title={row.siCombined ? String(row.siCombined) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} position="relative" overflow="visible">
                                            {assignCell(rowIndex, "diNumber",
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
                                                    title={row.diNumber ? String(row.diNumber) : undefined}
                                                    />
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "clientAccess",
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
                                            )}
                                        </Td>
                                        <Td {...cellProps} overflow="visible">
                                            {assignCell(rowIndex, "stockStatus",
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
                                                    <option value="released">Released</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="stock">Stock</option>
                                                    <option value="on_shipping">On Shipping Instr</option>
                                                    <option value="on_delivery">On Delivery Instr</option>
                                                    <option value="in_transit">In Transit</option>
                                                    <option value="arrived">Arrived Dest</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="irregular">Irregularities</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </Select>
                                            )}
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

                                                {stockReportPdfLoadingRowIndex === rowIndex && (
                                                    <Text fontSize="xs" color="gray.500" textAlign="center">
                                                        Saving and generating stock report PDF…
                                                    </Text>
                                                )}

                                                {(() => {
                                                    const { nonReportExisting, nonReportPending, reportEntries } =
                                                        partitionAttachmentsRow(row);
                                                    const latestReport = reportEntries[0];
                                                    const olderReports = reportEntries.slice(1);
                                                    const previewAttachments = collectRowAttachmentsForPreview(row);
                                                    return (
                                                        <>
                                                            {previewAttachments.length > 0 && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="outline"
                                                                    colorScheme="blue"
                                                                    leftIcon={<Icon as={MdVisibility} />}
                                                                    w="100%"
                                                                    onClick={() =>
                                                                        openGallery(
                                                                            previewAttachments,
                                                                            row.stockId ?? null,
                                                                            0
                                                                        )
                                                                    }
                                                                >
                                                                    View all documents ({previewAttachments.length})
                                                                </Button>
                                                            )}
                                                            {nonReportExisting.map((att, attIdx) => (
                                                                <Flex
                                                                    key={`existing-${att.id || attIdx}`}
                                                                    align="center"
                                                                    justify="space-between"
                                                                    fontSize="xs"
                                                                >
                                                                    <Text isTruncated flex={1} title={att.filename}>
                                                                        {att.filename}
                                                                    </Text>
                                                                    <IconButton
                                                                        aria-label="Delete attachment"
                                                                        icon={<MdRemove />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() =>
                                                                            handleDeleteExistingAttachment(
                                                                                rowIndex,
                                                                                att.id
                                                                            )
                                                                        }
                                                                    />
                                                                </Flex>
                                                            ))}
                                                            {latestReport && (
                                                                <Flex
                                                                    key={`latest-report-${
                                                                        latestReport.source === "existing"
                                                                            ? latestReport.id
                                                                            : `new-${latestReport.newIndex}`
                                                                    }`}
                                                                    align="center"
                                                                    justify="space-between"
                                                                    fontSize="xs"
                                                                >
                                                                    <Text
                                                                        isTruncated
                                                                        flex={1}
                                                                        title={latestReport.att.filename}
                                                                    >
                                                                        {latestReport.att.filename}
                                                                    </Text>
                                                                    <IconButton
                                                                        aria-label="Delete latest status report"
                                                                        icon={<MdRemove />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() =>
                                                                            latestReport.source === "existing"
                                                                                ? handleDeleteExistingAttachment(
                                                                                      rowIndex,
                                                                                      latestReport.id
                                                                                  )
                                                                                : handleDeleteAttachment(
                                                                                      rowIndex,
                                                                                      latestReport.newIndex
                                                                                  )
                                                                        }
                                                                    />
                                                                </Flex>
                                                            )}
                                                            {olderReports.length > 0 && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="link"
                                                                    colorScheme="blue"
                                                                    fontWeight="normal"
                                                                    onClick={() =>
                                                                        setStockReportHistoryRowIndex(rowIndex)
                                                                    }
                                                                >
                                                                    Previous status reports ({olderReports.length})
                                                                </Button>
                                                            )}
                                                            {nonReportPending.map(({ att, newIndex }) => (
                                                                <Flex
                                                                    key={`new-${newIndex}`}
                                                                    align="center"
                                                                    justify="space-between"
                                                                    fontSize="xs"
                                                                >
                                                                    <Text isTruncated flex={1} title={att.filename}>
                                                                        {att.filename}
                                                                    </Text>
                                                                    <IconButton
                                                                        aria-label="Remove attachment"
                                                                        icon={<MdRemove />}
                                                                        size="xs"
                                                                        variant="ghost"
                                                                        colorScheme="red"
                                                                        onClick={() =>
                                                                            handleDeleteAttachment(rowIndex, newIndex)
                                                                        }
                                                                    />
                                                                </Flex>
                                                            ))}
                                                        </>
                                                    );
                                                })()}
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

            {/* Dimensions Modal */}
            <Modal isOpen={isDimensionsModalOpen} onClose={onDimensionsModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Manage Dimensions</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            {dimensionsList.map((dim, index) => (
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
                                            <Text fontSize="sm" color={inputText} py={2}>
                                                {resolveDisplayVolumeCbm(dim)}
                                            </Text>
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
                                        <FormControl flex="1" minW="150px">
                                            <FormLabel fontSize="sm">Weight (kg)</FormLabel>
                                            <NumberInput
                                                value={dim.weight_kg || ""}
                                                onChange={(value) => {
                                                    const updated = [...dimensionsList];
                                                    updated[index] = {
                                                        ...updated[index],
                                                        weight_kg: value,
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
                            ))}
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
                                        weight_kg: 0.0,
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
                                const updatedRows = [...formRows];
                                updatedRows[currentRowIndexForDimensions] = {
                                    ...updatedRows[currentRowIndexForDimensions],
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
                                                const calculatedCbm = calculateVolumeCbmFromLwhCm(length, width, height);
                                                updatedRows[currentRowIndexForDimensions].volumeCbm = calculatedCbm;
                                            }
                                        } else if (dim.calculation_method === "volume" && dim.volume_dim) {
                                            updatedRows[currentRowIndexForDimensions].volumeCbm = Number(Number(dim.volume_dim).toFixed(3)) || 0;
                                    }
                                }
                                setFormRows(updatedRows);
                                onDimensionsModalClose();
                            }}
                        >
                            Save Dimensions
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <StockReportHistoryModal
                isOpen={stockReportHistoryRowIndex !== null}
                onClose={() => setStockReportHistoryRowIndex(null)}
                entries={
                    stockReportHistoryRowIndex !== null
                        ? partitionAttachmentsRow(formRows[stockReportHistoryRowIndex]).reportEntries.slice(1)
                        : []
                }
                rowIndex={stockReportHistoryRowIndex ?? 0}
                stockItemId={
                    stockReportHistoryRowIndex !== null
                        ? formRows[stockReportHistoryRowIndex]?.stockId ?? null
                        : null
                }
                showFileActions
                onPreviewAll={openGallery}
                onDeleteExisting={handleDeleteExistingAttachment}
                onDeletePending={handleDeleteAttachment}
            />
            {galleryModal}
        </Box>
    );
} 
