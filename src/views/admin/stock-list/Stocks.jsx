import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Box,
    Flex,
    Text,
    Button,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Badge,
    Icon,
    HStack,
    IconButton,
    useColorModeValue,
    Spinner,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
    Card,
    VStack,
    useToast,
    Checkbox,
    Center,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
    Input,
    InputGroup,
    InputLeftElement,
    FormControl,
    FormLabel,
    Select,
    Textarea,
    Divider,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Collapse,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Tooltip,
    Grid,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdRefresh, MdEdit, MdAdd, MdClose, MdCheck, MdCancel, MdVisibility, MdFilterList, MdSearch, MdNumbers, MdSort, MdCheckBox, MdCheckBoxOutlineBlank, MdDownload, MdViewModule, MdViewList, MdContentCopy, MdPrint } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { updateStockItemApi, getStockItemAttachmentsApi, downloadStockItemAttachmentApi } from "../../../api/stock";
import { useHistory, useLocation } from "react-router-dom";
import api from "../../../api/axios";
import locationsAPI from "../../../api/locations";
import { getShippingOrders } from "../../../api/shippingOrders";
import { useMasterData } from "../../../hooks/useMasterData";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

// Status definitions matching backend status keys exactly
// Colors matched to status filter UI design with exact hex colors
const STATUS_CONFIG = {
    //blank
    blank: {
        label: "Blank",
    },
    // Pending = #c9daf7
    pending: {
        label: "Pending",
        color: "blue",
        bgColor: "#c9daf7",
        textColor: "blue.900",
        lightBg: "#c9daf7"
    },
    // Stock = #d8d8d8
    in_stock: {
        label: "Stock",
        color: "gray",
        bgColor: "#d8d8d8",
        textColor: "gray.800",
        lightBg: "#d8d8d8"
    },
    // On a Shipping Instr = #fec02e
    on_shipping: {
        label: "On Shipping Instr",
        color: "orange",
        bgColor: "#fec02e",
        textColor: "orange.900",
        lightBg: "#fec02e"
    },
    // On a Delivery Instr = #b7e1cd
    on_delivery: {
        label: "On Delivery Instr",
        color: "teal",
        bgColor: "#b7e1cd",
        textColor: "teal.900",
        lightBg: "#b7e1cd"
    },
    // In Transit = #92d059
    in_transit: {
        label: "In Transit",
        color: "green",
        bgColor: "#92d059",
        textColor: "green.800",
        lightBg: "#92d059"
    },
    // Arrived Destination = #a5a5a5
    arrived: {
        label: "Arrived Dest",
        color: "gray",
        bgColor: "#a5a5a5",
        textColor: "white",
        lightBg: "#a5a5a5"
    },
    // Shipped = #fce5ce
    shipped: {
        label: "Shipped",
        color: "orange",
        bgColor: "#fce5ce",
        textColor: "orange.800",
        lightBg: "#fce5ce"
    },
    // Delivered = #f4cccd
    delivered: {
        label: "Delivered",
        color: "pink",
        bgColor: "#f4cccd",
        textColor: "pink.900",
        lightBg: "#f4cccd"
    },
    // Irregularities = #fe001b
    irregular: {
        label: "Irregularities",
        color: "red",
        bgColor: "#fe001b",
        textColor: "white",
        lightBg: "#fe001b"
    },
    // Cancelled = #9a00fb82 (with alpha converted to rgba)
    cancelled: {
        label: "Cancelled",
        color: "purple",
        bgColor: "#9a00fb82",
        textColor: "white",
        lightBg: "#9a00fb82"
    },
};

// Status mapping for backward compatibility with old status keys
const STATUS_VARIATIONS = {
    "stock": "in_stock",
    "on_a_shipping_instr": "on_shipping",
    "on_a_delivery_instr": "on_delivery",
    "arrived_dest": "arrived",
    "irregularities": "irregular",
    "shipping_instr": "on_shipping",
    "delivery_instr": "on_delivery",
};

export default function Stocks() {
    const history = useHistory();
    const location = useLocation();
    const [selectedRows, setSelectedRows] = useState(() => {
        const stored = sessionStorage.getItem('stocksSelectedRows');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [activeTab, setActiveTab] = useState(() => {
        const stored = sessionStorage.getItem('stocksActiveTab');
        return stored ? Number(stored) : 0;
    });

    // Pagination state for Stock View / Edit tab (activeTab === 0)
    const [stockViewPage, setStockViewPage] = useState(() => {
        const stored = sessionStorage.getItem('stocksStockViewPage');
        return stored ? Number(stored) : 1;
    });
    const [stockViewPageSize, setStockViewPageSize] = useState(() => {
        const stored = sessionStorage.getItem('stocksStockViewPageSize');
        return stored ? Number(stored) : 50;
    });

    // Pagination state for Client View tab (activeTab === 1)
    const [clientViewPage, setClientViewPage] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewPage');
        return stored ? Number(stored) : 1;
    });
    const [clientViewPageSize, setClientViewPageSize] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewPageSize');
        return stored ? Number(stored) : 50;
    });
    const [editingRowIds, setEditingRowIds] = useState(() => {
        const stored = sessionStorage.getItem('stocksEditingRowIds');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [editingRowData, setEditingRowData] = useState(() => {
        const stored = sessionStorage.getItem('stocksEditingRowData');
        return stored ? JSON.parse(stored) : {};
    });

    const toast = useToast();

    const {
        stockList,
        isLoading,
        error,
        updateLoading,
        getStockList,
    } = useStock();

    // Track if we're refreshing after an update
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filters - separate for each view - initialize from sessionStorage
    // By Vessel view filters
    const [vesselViewClient, setVesselViewClient] = useState(() => {
        const stored = sessionStorage.getItem('stocksVesselViewClient');
        return stored && stored !== 'null' ? stored : null;
    });
    const [vesselViewVessel, setVesselViewVessel] = useState(() => {
        const stored = sessionStorage.getItem('stocksVesselViewVessel');
        return stored && stored !== 'null' ? stored : null;
    });
    const [vesselViewStatuses, setVesselViewStatuses] = useState(() => {
        const stored = sessionStorage.getItem('stocksVesselViewStatuses');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    // By Client view filters
    const [clientViewClient, setClientViewClient] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewClient');
        return stored && stored !== 'null' ? stored : null;
    });
    const [clientViewStatuses, setClientViewStatuses] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewStatuses');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [clientViewFilterType, setClientViewFilterType] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewFilterType');
        return stored || 'filter1'; // Default to filter1
    });
    const [clientViewSelectedRows, setClientViewSelectedRows] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewSelectedRows');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [clientViewSearchClient, setClientViewSearchClient] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewSearchClient');
        return stored || '';
    });
    const [clientViewSearchVessel, setClientViewSearchVessel] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewSearchVessel');
        return stored || '';
    });
    const [clientViewVesselFilter, setClientViewVesselFilter] = useState(() => {
        const stored = sessionStorage.getItem('stocksClientViewVesselFilter');
        return stored && stored !== 'null' ? stored : null;
    });

    // State to control filters section visibility - default to open
    const [showFilters, setShowFilters] = useState(() => {
        const stored = sessionStorage.getItem('stocksShowFilters');
        return stored !== null ? stored === 'true' : true; // Default to true (open)
    });

    // Stock View / Edit tab filters (similar to index.jsx)
    const [stockViewClient, setStockViewClient] = useState(() => {
        const stored = sessionStorage.getItem('stocksStockViewClient');
        return stored && stored !== 'null' ? stored : null;
    });
    const [stockViewVessel, setStockViewVessel] = useState(() => {
        const stored = sessionStorage.getItem('stocksStockViewVessel');
        return stored && stored !== 'null' ? stored : null;
    });
    const [stockViewStatus, setStockViewStatus] = useState(() => {
        return sessionStorage.getItem('stocksStockViewStatus') || "";
    });
    const [stockViewStockItemId, setStockViewStockItemId] = useState(() => {
        return sessionStorage.getItem('stocksStockViewStockItemId') || "";
    });
    const [stockViewDateOnStock, setStockViewDateOnStock] = useState(() => {
        return sessionStorage.getItem('stocksStockViewDateOnStock') || "";
    });
    const [stockViewDaysOnStock, setStockViewDaysOnStock] = useState(() => {
        return sessionStorage.getItem('stocksStockViewDaysOnStock') || "";
    });
    const [stockViewFilterSO, setStockViewFilterSO] = useState(() => {
        return sessionStorage.getItem('stocksStockViewFilterSO') || "";
    });
    const [stockViewFilterSI, setStockViewFilterSI] = useState(() => {
        return sessionStorage.getItem('stocksStockViewFilterSI') || "";
    });
    const [stockViewFilterSICombined, setStockViewFilterSICombined] = useState(() => {
        return sessionStorage.getItem('stocksStockViewFilterSICombined') || "";
    });
    const [stockViewFilterDI, setStockViewFilterDI] = useState(() => {
        return sessionStorage.getItem('stocksStockViewFilterDI') || "";
    });
    const [stockViewSearchFilter, setStockViewSearchFilter] = useState(() => {
        return sessionStorage.getItem('stocksStockViewSearchFilter') || "";
    });
    const [stockViewHub, setStockViewHub] = useState(() => {
        const stored = sessionStorage.getItem('stocksStockViewHub');
        return stored && stored !== 'null' ? stored : null;
    });
    const [sortOption, setSortOption] = useState(() => {
        const stored = sessionStorage.getItem('stocksSortOption');
        return stored || 'none'; // 'none', 'via_hub', 'status', 'via_hub_status', 'via_vessel', 'via_vessel_status'
    });

    // Dimensions modal state
    const { isOpen: isDimensionsModalOpen, onOpen: onDimensionsModalOpen, onClose: onDimensionsModalClose } = useDisclosure();
    const [selectedDimensions, setSelectedDimensions] = useState([]);
    const [isLoadingAttachment, setIsLoadingAttachment] = useState(false);

    // View selected items - filter table instead of modal
    const [isViewingSelected, setIsViewingSelected] = useState(false);

    const { clients, vessels, suppliers: vendors, countries, destinations, currencies } = useMasterData();
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

    // Lookup data for IDs -> Names (destinations, currencies from master cache)
    const [locations, setLocations] = useState([]);
    const [shippingOrders, setShippingOrders] = useState([]);
    const [isLoadingShippingOrders, setIsLoadingShippingOrders] = useState(false);
    // Users state removed - PIC is now a free text field, no need to fetch users


    const textColor = useColorModeValue("gray.700", "white");
    const tableHeaderBg = useColorModeValue("gray.50", "gray.700");
    const tableRowBg = useColorModeValue("white", "gray.800");
    const tableRowBgAlt = useColorModeValue("gray.50", "gray.700");
    const tableBorderColor = useColorModeValue("gray.200", "whiteAlpha.200");
    const tableTextColor = useColorModeValue("gray.600", "gray.300");
    const tableTextColorSecondary = useColorModeValue("gray.500", "gray.400");
    const inputBg = useColorModeValue("gray.100", "gray.800");
    const inputText = useColorModeValue("gray.700", "gray.100");
    const borderColor = useColorModeValue("gray.200", "gray.700");
    const cardBg = useColorModeValue("white", "navy.800");

    const headerProps = {
        borderRight: "1px",
        borderColor: tableBorderColor,
        py: "12px",
        px: "16px",
        fontSize: "12px",
        fontWeight: "600",
        color: tableTextColor,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
    };
    const cellProps = {
        borderRight: "1px",
        borderColor: tableBorderColor,
        py: "12px",
        px: "16px",
        whiteSpace: "nowrap",
    };
    const cellText = {
        color: tableTextColor,
        fontSize: "sm",
    };

    // Ensure we only auto-fetch once (avoids double calls in StrictMode)
    const hasFetchedInitialData = useRef(false);
    const hasFetchedLookupData = useRef(false);

    // Save filter visibility state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stocksShowFilters', String(showFilters));
    }, [showFilters]);

    // Fetch stock list on component mount
    useEffect(() => {
        if (!hasFetchedInitialData.current && stockList.length === 0 && !isLoading) {
            hasFetchedInitialData.current = true;
            getStockList();
        }
    }, [getStockList, stockList.length, isLoading]);

    // Fetch all lookup data for IDs -> Names (only once per component mount)
    useEffect(() => {
        // Only fetch if we haven't already fetched lookup data
        if (hasFetchedLookupData.current) {
            return;
        }

        const fetchLookupData = async () => {
            try {
                hasFetchedLookupData.current = true;
                setIsLoadingWarehouses(true);
                setIsLoadingShippingOrders(true);

                // Destinations and currencies from master cache; fetch locations and shipping orders
                const promises = [
                    locationsAPI.getLocations().catch(() => ({ locations: [] })).then(data => ({ type: 'locations', data })),
                    getShippingOrders().catch(() => ({ orders: [] })).then(data => {
                        let orders = [];
                        if (Array.isArray(data)) {
                            orders = data;
                        } else if (data?.orders && Array.isArray(data.orders)) {
                            orders = data.orders;
                        } else if (data?.result?.orders && Array.isArray(data.result.orders)) {
                            orders = data.result.orders;
                        } else if (data?.data?.orders && Array.isArray(data.data.orders)) {
                            orders = data.data.orders;
                        }
                        return { type: 'shippingOrders', data: orders };
                    })
                ];

                const results = await Promise.all(promises);

                results.forEach(({ type, data }) => {
                    switch (type) {
                        case 'locations':
                            setLocations(data?.locations || data || []);
                            break;
                        case 'shippingOrders':
                            setShippingOrders(data || []);
                            break;
                    }
                });
            } catch (error) {
                console.error('Failed to fetch lookup data:', error);
                hasFetchedLookupData.current = false; // Reset on error to allow retry
            } finally {
                setIsLoadingWarehouses(false);
                setIsLoadingShippingOrders(false);
            }
        };
        fetchLookupData();
    }, []); // Empty dependency array - only fetch once on mount

    // Restore filter state from location.state when returning from edit mode
    useEffect(() => {
        if (location.state && location.state.filterState) {
            const { filterState } = location.state;
            if (filterState.activeTab !== undefined) setActiveTab(filterState.activeTab);
            if (filterState.vesselViewClient !== undefined) setVesselViewClient(filterState.vesselViewClient);
            if (filterState.vesselViewVessel !== undefined) setVesselViewVessel(filterState.vesselViewVessel);
            if (filterState.vesselViewStatuses !== undefined) setVesselViewStatuses(new Set(filterState.vesselViewStatuses)); // Convert Array back to Set
            if (filterState.clientViewClient !== undefined) setClientViewClient(filterState.clientViewClient);
            if (filterState.clientViewSearchClient !== undefined) setClientViewSearchClient(filterState.clientViewSearchClient);
            if (filterState.clientViewSearchVessel !== undefined) setClientViewSearchVessel(filterState.clientViewSearchVessel);
            if (filterState.clientViewVesselFilter !== undefined) setClientViewVesselFilter(filterState.clientViewVesselFilter);
            if (filterState.clientViewStatuses !== undefined) setClientViewStatuses(new Set(filterState.clientViewStatuses)); // Convert Set to Array for serialization
            // Restore Stock View / Edit filters
            if (filterState.stockViewClient !== undefined) setStockViewClient(filterState.stockViewClient);
            if (filterState.stockViewVessel !== undefined) setStockViewVessel(filterState.stockViewVessel);
            if (filterState.stockViewStatus !== undefined) setStockViewStatus(filterState.stockViewStatus);
            if (filterState.stockViewStockItemId !== undefined) setStockViewStockItemId(filterState.stockViewStockItemId);
            if (filterState.stockViewDateOnStock !== undefined) setStockViewDateOnStock(filterState.stockViewDateOnStock);
            if (filterState.stockViewDaysOnStock !== undefined) setStockViewDaysOnStock(filterState.stockViewDaysOnStock);
            if (filterState.stockViewFilterSO !== undefined) setStockViewFilterSO(filterState.stockViewFilterSO);
            if (filterState.stockViewFilterSI !== undefined) setStockViewFilterSI(filterState.stockViewFilterSI);
            if (filterState.stockViewFilterSICombined !== undefined) setStockViewFilterSICombined(filterState.stockViewFilterSICombined);
            if (filterState.stockViewFilterDI !== undefined) setStockViewFilterDI(filterState.stockViewFilterDI);
            if (filterState.stockViewSearchFilter !== undefined) setStockViewSearchFilter(filterState.stockViewSearchFilter);
            // Clear location.state to prevent restoring on subsequent renders
            history.replace(location.pathname, {});
        }
    }, [location.state, history, location.pathname]);

    // Restore edit page when returning to this page from another tab
    useEffect(() => {
        // Only restore if we're on the stocks list page (not edit page) and not coming from edit page
        const isOnStocksPage = location.pathname === '/admin/stock-list/stocks' || location.pathname === '/admin/stock-list/stocks/';
        const isComingFromEdit = location.state?.fromEdit === true;

        if (isOnStocksPage && !isComingFromEdit) {
            const savedEditState = sessionStorage.getItem('stockEditState');
            if (savedEditState) {
                try {
                    const editState = JSON.parse(savedEditState);
                    // Only restore if the saved state is for 'stocks' source page
                    if (editState.sourcePage === 'stocks') {
                        // Navigate to edit page with saved state
                        history.replace({
                            pathname: '/admin/stock-list/edit-stock',
                            state: editState
                        });
                    }
                } catch (error) {
                    console.error('Failed to parse saved edit state:', error);
                    sessionStorage.removeItem('stockEditState');
                }
            }
        }
    }, [location.pathname, location.state, history]);

    // Persist state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stocksSelectedRows', JSON.stringify(Array.from(selectedRows)));
    }, [selectedRows]);

    useEffect(() => {
        sessionStorage.setItem('stocksActiveTab', activeTab.toString());
    }, [activeTab]);

    // Persist pagination state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stocksStockViewPage', stockViewPage.toString());
    }, [stockViewPage]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewPageSize', stockViewPageSize.toString());
    }, [stockViewPageSize]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewPage', clientViewPage.toString());
    }, [clientViewPage]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewPageSize', clientViewPageSize.toString());
    }, [clientViewPageSize]);

    useEffect(() => {
        sessionStorage.setItem('stocksEditingRowIds', JSON.stringify(Array.from(editingRowIds)));
    }, [editingRowIds]);

    useEffect(() => {
        sessionStorage.setItem('stocksEditingRowData', JSON.stringify(editingRowData));
    }, [editingRowData]);

    useEffect(() => {
        sessionStorage.setItem('stocksVesselViewClient', vesselViewClient || 'null');
    }, [vesselViewClient]);

    useEffect(() => {
        sessionStorage.setItem('stocksVesselViewVessel', vesselViewVessel || 'null');
    }, [vesselViewVessel]);

    useEffect(() => {
        sessionStorage.setItem('stocksVesselViewStatuses', JSON.stringify(Array.from(vesselViewStatuses)));
    }, [vesselViewStatuses]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewClient', clientViewClient || 'null');
    }, [clientViewClient]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewStatuses', JSON.stringify(Array.from(clientViewStatuses)));
    }, [clientViewStatuses]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewFilterType', clientViewFilterType);
    }, [clientViewFilterType]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewSelectedRows', JSON.stringify(Array.from(clientViewSelectedRows)));
    }, [clientViewSelectedRows]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewSearchClient', clientViewSearchClient || '');
    }, [clientViewSearchClient]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewSearchVessel', clientViewSearchVessel || '');
    }, [clientViewSearchVessel]);

    useEffect(() => {
        sessionStorage.setItem('stocksClientViewVesselFilter', clientViewVesselFilter || 'null');
    }, [clientViewVesselFilter]);

    // Persist Stock View / Edit filter states to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stocksStockViewClient', stockViewClient || 'null');
    }, [stockViewClient]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewVessel', stockViewVessel || 'null');
    }, [stockViewVessel]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewStatus', stockViewStatus || '');
    }, [stockViewStatus]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewStockItemId', stockViewStockItemId || '');
    }, [stockViewStockItemId]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewDateOnStock', stockViewDateOnStock || '');
    }, [stockViewDateOnStock]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewDaysOnStock', stockViewDaysOnStock || '');
    }, [stockViewDaysOnStock]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewFilterSO', stockViewFilterSO || '');
    }, [stockViewFilterSO]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewFilterSI', stockViewFilterSI || '');
    }, [stockViewFilterSI]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewFilterSICombined', stockViewFilterSICombined || '');
    }, [stockViewFilterSICombined]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewFilterDI', stockViewFilterDI || '');
    }, [stockViewFilterDI]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewSearchFilter', stockViewSearchFilter || '');
    }, [stockViewSearchFilter]);

    useEffect(() => {
        sessionStorage.setItem('stocksStockViewHub', stockViewHub || 'null');
    }, [stockViewHub]);

    useEffect(() => {
        sessionStorage.setItem('stocksSortOption', sortOption || 'none');
    }, [sortOption]);

    // Track refresh state after updates
    useEffect(() => {
        if (isLoading && stockList.length > 0) {
            setIsRefreshing(true);
        } else {
            setIsRefreshing(false);
        }
    }, [isLoading, stockList.length]);

    // Helper functions to get names from IDs - defined early so they can be used in filtering/sorting
    const getClientName = (clientId) => {
        if (!clientId) return "-";
        const client = clients.find(c => String(c.id) === String(clientId));
        return client ? client.name : `Client ${clientId}`;
    };

    const getVesselName = (vesselId) => {
        if (!vesselId) return "-";
        const vessel = vessels.find(v => String(v.id) === String(vesselId));
        return vessel ? vessel.name : String(vesselId);
    };

    const getSupplierName = (supplierId) => {
        if (!supplierId) return "-";
        const vendor = vendors.find(v => String(v.id) === String(supplierId));
        return vendor ? vendor.name : `Supplier ${supplierId}`;
    };

    const getDestinationName = (destId) => {
        if (!destId) return "-";
        // Try to find by ID first
        const destination = destinations.find(d => String(d.id) === String(destId));
        if (destination) return destination.name || destination.code || `Dest ${destId}`;
        // Try to find by code/name (for cases where it's stored as code)
        const destByName = destinations.find(d =>
            String(d.name || "").toLowerCase() === String(destId).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(destId).toLowerCase()
        );
        if (destByName) return destByName.name || destByName.code || `Dest ${destId}`;
        return `Dest ${destId}`;
    };

    const getCurrencyName = (currencyId) => {
        if (!currencyId) return "-";
        const currency = currencies.find(c => String(c.id) === String(currencyId) || String(c.currency_id) === String(currencyId));
        if (currency) return currency.name || currency.code || `Currency ${currencyId}`;
        // If it's already a code/name, return as is
        if (typeof currencyId === 'string' && currencyId.length <= 5) return currencyId;
        return `Currency ${currencyId}`;
    };

    const getLocationName = (locationId) => {
        if (!locationId) return "-";
        const location = locations.find(l => String(l.id) === String(locationId) || String(l.location_id) === String(locationId));
        if (location) return location.name || location.code || `Location ${locationId}`;
        // If it's already a code/name, return as is
        if (typeof locationId === 'string' && locationId.length <= 10) return locationId;
        return `Location ${locationId}`;
    };

    const getSoNumberName = (soId) => {
        if (!soId) return "-";
        const so = shippingOrders.find(s => String(s.id) === String(soId));
        return so ? (so.so_number || so.name || `SO-${so.id}`) : `SO-${soId}`;
    };

    const getSoNumberNameFromNumber = (soNumber) => {
        if (!soNumber) return "-";
        // Try to find by so_number field
        const so = shippingOrders.find(s =>
            String(s.so_number || s.name || "") === String(soNumber) ||
            String(s.id) === String(soNumber)
        );
        return so ? (so.so_number || so.name || `SO-${so.id}`) : `SO-${soNumber}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "blue";
            case "in_stock":
            case "stock":
                return "gray";
            case "on_shipping":
                return "orange";
            case "on_delivery":
                return "blue";
            case "in_transit":
                return "green";
            case "arrived":
            case "arrived_dest":
                return "gray";
            case "shipped":
                return "orange";
            case "delivered":
                return "red";
            case "irregular":
            case "irregularities":
                return "red";
            case "cancelled":
                return "purple";
            default:
                return "gray";
        }
    };

    const handleEditItem = (item) => {
        // Pass current filter state so it can be restored when navigating back
        const filterState = {
            activeTab,
            vesselViewClient,
            vesselViewVessel,
            vesselViewStatuses: Array.from(vesselViewStatuses), // Convert Set to Array for serialization
            clientViewClient,
            clientViewSearchClient,
            clientViewSearchVessel,
            clientViewVesselFilter,
            clientViewStatuses: Array.from(clientViewStatuses), // Convert Set to Array for serialization
            stockViewClient,
            stockViewVessel,
            stockViewStatus,
            stockViewStockItemId,
            stockViewDateOnStock,
            stockViewDaysOnStock,
            stockViewFilterSO,
            stockViewFilterSI,
            stockViewFilterSICombined,
            stockViewFilterDI,
            stockViewSearchFilter
        };
        const editState = { selectedItems: [item], isBulkEdit: false, filterState, sourcePage: 'stocks' };
        // Save edit state to sessionStorage for restoration when switching tabs
        sessionStorage.setItem('stockEditState', JSON.stringify(editState));
        history.push({
            pathname: '/admin/stock-list/edit-stock',
            state: editState
        });
    };

    const handleBulkView = () => {
        // Toggle view mode - filter table to show only selected items
        setIsViewingSelected(prev => !prev);
    };

    // Handle navigate to edit page with selected items
    const handleNavigateToEdit = () => {
        const selectedIds = Array.from(selectedRows);
        if (selectedIds.length > 0) {
            // Filter the full data objects from filtered stock for selected items
            const selectedItemsData = getFilteredStockByStatus().filter(item => selectedIds.includes(item.id));
            // Pass current filter state so it can be restored when navigating back
            const filterState = {
                activeTab,
                vesselViewClient,
                vesselViewVessel,
                vesselViewStatuses: Array.from(vesselViewStatuses), // Convert Set to Array for serialization
                clientViewClient,
                clientViewStatuses: Array.from(clientViewStatuses), // Convert Set to Array for serialization
                stockViewClient,
                stockViewVessel,
                stockViewStatus,
                stockViewStockItemId,
                stockViewDateOnStock,
                stockViewDaysOnStock
            };
            const editState = { selectedItems: selectedItemsData, isBulkEdit: selectedItemsData.length > 1, filterState, sourcePage: 'stocks' };
            // Save edit state to sessionStorage for restoration when switching tabs
            sessionStorage.setItem('stockEditState', JSON.stringify(editState));
            history.push({
                pathname: '/admin/stock-list/edit-stock',
                state: editState
            });
        }
    };

    // getUserName removed - PIC is now a free text field, display directly

    // Helper to get country name for origin field (with airport/state codes if available)
    const getCountryName = (countryId) => {
        if (!countryId) return "-";

        // Convert to string and number for comparison
        const countryIdStr = String(countryId);
        const countryIdNum = Number(countryId);

        // Try to find by ID (handle different field names)
        const country = countries.find(c => {
            if (!c) return false;
            // Check various ID field names
            const cId = c.id || c.country_id;
            return (
                String(cId) === countryIdStr ||
                Number(cId) === countryIdNum
            );
        });

        if (country) {
            const name = country.name || country.code || `Country ${countryId}`;
            const code = country.code || "";
            const stateCodes = Array.isArray(country.states)
                ? country.states
                    .map((s) => s.code)
                    .filter(Boolean)
                    .join(", ")
                : "";
            const base = code ? `${name} (${code})` : name;
            return stateCodes ? `${base} - ${stateCodes}` : base;
        }


        return `Country ${countryId}`;
    };

    // Helper to get name for via_hub/ap_destination/destination (uses destinations and locations)
    const getLocationOrDestinationName = (value) => {
        if (!value) return "-";
        // Try destination first
        const dest = destinations.find(d =>
            String(d.id) === String(value) ||
            String(d.name || "").toLowerCase() === String(value).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (dest) return dest.name || dest.code || `Dest ${value}`;
        // Try location
        const loc = locations.find(l =>
            String(l.id) === String(value) ||
            String(l.location_id) === String(value) ||
            String(l.name || "").toLowerCase() === String(value).toLowerCase() ||
            String(l.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (loc) return loc.name || loc.code || `Loc ${value}`;
        // If it's already a short string, might be a code or free text - return as is
        if (typeof value === 'string' && value.length <= 50) return value;
        return value;
    };

    // Helper function to normalize status
    const normalizeStatus = (status) => {
        if (!status) return "";
        let normalized = status.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
        if (STATUS_VARIATIONS[normalized]) {
            normalized = STATUS_VARIATIONS[normalized];
        }
        return normalized;
    };

    // Helper function to check if status matches selected statuses
    const matchesStatus = (itemStatus, selectedStatusesSet) => {
        if (selectedStatusesSet.size === 0) return true;
        const normalized = normalizeStatus(itemStatus);
        return Array.from(selectedStatusesSet).some(selectedStatus => {
            const normalizedSelected = selectedStatus.toLowerCase();
            return normalized === normalizedSelected ||
                normalized.includes(normalizedSelected) ||
                normalizedSelected.includes(normalized);
        });
    };

    // Get status style configuration
    const getStatusStyle = (status) => {
        if (!status) {
            return {
                bgColor: tableRowBg,
                textColor: tableTextColor,
                color: "gray",
                label: "-"
            };
        }

        let statusKey = status.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");

        // Map variations to filter keys (old keys -> new keys)
        if (STATUS_VARIATIONS[statusKey]) {
            statusKey = STATUS_VARIATIONS[statusKey];
        }

        // Try exact match first
        let config = STATUS_CONFIG[statusKey];
        // If no exact match, try to find a partial match
        if (!config) {
            const matchingKey = Object.keys(STATUS_CONFIG).find(key => {
                const normalizedKey = key.toLowerCase();
                const normalizedStatus = statusKey.toLowerCase();
                return normalizedStatus.includes(normalizedKey) ||
                    normalizedKey.includes(normalizedStatus) ||
                    normalizedStatus === normalizedKey;
            });
            config = matchingKey ? STATUS_CONFIG[matchingKey] : null;
        }
        return config || {
            bgColor: tableRowBg,
            textColor: tableTextColor,
            color: "gray",
            label: status || "-"
        };
    };

    // Get status label
    const getStatusLabel = (status) => {
        const style = getStatusStyle(status);
        return style.label || status || "-";
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
                        duration: 50000,
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
                        duration: 50000,
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
                        duration: 50000,
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
                duration: 50000,
                isClosable: true,
            });
        } catch (error) {
            console.error('Error viewing file:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to view file',
                status: 'error',
                duration: 50000,
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
                    duration: 50000,
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
                    duration: 50000,
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
                duration: 50000,
                isClosable: true,
            });
        }
    };


    // Shared sorting function - used by both By Vessel and By Client tabs
    // Sort by: AP Dest > Via Hub > Stock Status > Date on Stock
    const sortStockItems = (items) => {
        return [...items].sort((a, b) => {
            // 1. Sort by AP Destination
            const apDestA = String(a.ap_destination_new || a.ap_destination_id || a.ap_destination || "").toLowerCase();
            const apDestB = String(b.ap_destination_new || b.ap_destination_id || b.ap_destination || "").toLowerCase();
            if (apDestA !== apDestB) {
                return apDestA.localeCompare(apDestB);
            }

            // 2. Sort by Via Hub
            const viaHubA = String(a.via_hub || "").toLowerCase();
            const viaHubB = String(b.via_hub || "").toLowerCase();
            if (viaHubA !== viaHubB) {
                return viaHubA.localeCompare(viaHubB);
            }

            // 3. Sort by Stock Status
            const statusA = getStatusLabel(a.stock_status) || "";
            const statusB = getStatusLabel(b.stock_status) || "";
            if (statusA !== statusB) {
                return statusA.localeCompare(statusB);
            }

            // 4. Sort by Date on Stock
            const dateA = new Date(a.date_on_stock || 0);
            const dateB = new Date(b.date_on_stock || 0);
            return dateA - dateB;
        });
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
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("SI-")) return str;
        const withoutPrefix = str.startsWith("SI-") ? str.substring(3) : str;
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
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("DI-")) return str;
        const withoutPrefix = str.startsWith("DI-") ? str.substring(3) : str;
        return `DI-${withoutPrefix}`;
    };

    const removeDIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str.startsWith("DI-")) return str.substring(3);
        return str;
    };

    // Get unique hub options from stock list
    const hubOptions = useMemo(() => {
        const hubSet = new Set();
        stockList.forEach(item => {
            if (item.via_hub) hubSet.add(item.via_hub.trim());
            if (item.via_hub2) hubSet.add(item.via_hub2.trim());
        });
        return Array.from(hubSet)
            .filter(h => h)
            .sort()
            .map(hub => ({ id: hub, name: hub }));
    }, [stockList]);

    // Filter stock list by status checkboxes and basic filters for Stock View / Edit tab
    const getFilteredStockByStatus = () => {
        let filtered = [...stockList];

        // If viewing selected items, filter to only show selected items
        if (isViewingSelected && selectedRows.size > 0) {
            const selectedIds = Array.from(selectedRows);
            filtered = filtered.filter(item => selectedIds.includes(item.id));
        }

        // Apply basic filters (same as index.jsx)
        if (stockViewClient) {
            filtered = filtered.filter(item =>
                String(item.client_id || item.client) === String(stockViewClient)
            );
        }

        if (stockViewVessel) {
            filtered = filtered.filter(item =>
                String(item.vessel_id || item.vessel) === String(stockViewVessel)
            );
        }

        if (stockViewStatus) {
            filtered = filtered.filter(item => {
                const normalized = normalizeStatus(item.stock_status);
                return normalized === stockViewStatus.toLowerCase() ||
                    normalized.includes(stockViewStatus.toLowerCase()) ||
                    stockViewStatus.toLowerCase().includes(normalized);
            });
        }

        if (stockViewStockItemId) {
            filtered = filtered.filter(item => {
                const stockItemId = item.stock_item_id || item.stock_id || "";
                return String(stockItemId).toLowerCase().includes(String(stockViewStockItemId).toLowerCase());
            });
        }

        if (stockViewDateOnStock) {
            filtered = filtered.filter(item => {
                if (!item.date_on_stock) return false;
                const itemDate = new Date(item.date_on_stock).toISOString().split('T')[0];
                return itemDate === stockViewDateOnStock;
            });
        }

        if (stockViewDaysOnStock) {
            filtered = filtered.filter(item => {
                const daysOnStock = item.days_on_stock || 0;
                return String(daysOnStock) === String(stockViewDaysOnStock);
            });
        }

        // Filter by SO Number
        if (stockViewFilterSO) {
            const searchTerm = stockViewFilterSO.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const soValue = item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : (item.so_number || ""));
                const prefixed = addSOPrefix(soValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by SI Number
        if (stockViewFilterSI) {
            const searchTerm = stockViewFilterSI.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const siValue = item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction || "";
                const prefixed = addSIPrefix(siValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by SI Combined
        if (stockViewFilterSICombined) {
            const searchTerm = stockViewFilterSICombined.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const sicValue = item.si_combined || item.shipping_instruction_id || item.stock_shipping_instruction || "";
                const prefixed = addSICombinedPrefix(sicValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by DI Number
        if (stockViewFilterDI) {
            const searchTerm = stockViewFilterDI.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const diValue = item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction || "";
                const prefixed = addDIPrefix(diValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by Hub
        if (stockViewHub) {
            const hubLower = stockViewHub.toLowerCase();
            filtered = filtered.filter(item => {
                const hub1 = String(item.via_hub || "").toLowerCase();
                const hub2 = String(item.via_hub2 || "").toLowerCase();
                return hub1 === hubLower || hub2 === hubLower;
            });
        }

        // General search filter - searches across multiple fields
        if (stockViewSearchFilter) {
            const searchTerm = stockViewSearchFilter.toLowerCase().trim();
            filtered = filtered.filter(item => {
                // Get SO, SI, SI Combined, DI with prefixes for search
                const soValue = item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : (item.so_number || ""));
                const soPrefixed = addSOPrefix(soValue);
                const siValue = item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction || "";
                const siPrefixed = addSIPrefix(siValue);
                const sicValue = item.si_combined || item.shipping_instruction_id || item.stock_shipping_instruction || "";
                const sicPrefixed = addSICombinedPrefix(sicValue);
                const diValue = item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction || "";
                const diPrefixed = addDIPrefix(diValue);

                // Search across multiple fields including lookup names
                const searchableFields = [
                    String(item.stock_item_id || ""),
                    String(getClientName(item.client_id || item.client) || ""),
                    String(getVesselName(item.vessel_id || item.vessel) || ""),
                    String(soPrefixed || ""),
                    String(siPrefixed || ""),
                    String(sicPrefixed || ""),
                    String(diPrefixed || ""),
                    String(item.stock_status || ""),
                    String(item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || "")),
                    String(item.po_text || item.po_number || ""),
                    String(item.warehouse_id || item.stock_warehouse || ""),
                    String(item.shipping_doc || ""),
                    String(item.export_doc || ""),
                    String(item.export_doc_2 || ""),
                    String(item.remarks || ""),
                    String(item.internal_remark || ""),
                    String(item.dg_un || ""),
                    String(item.lwh_text || ""),
                    String(item.origin_text || getCountryName(item.origin_id) || ""),
                    String(item.ap_destination_id || item.ap_destination || ""),
                    String(getLocationOrDestinationName(item.destination_id || item.destination || item.stock_destination) || ""),
                    String(item.via_hub || ""),
                    String(item.via_hub2 || ""),
                    String(item.details || item.item_desc || ""),
                    String(item.currency_id ? getCurrencyName(item.currency_id) : (item.currency || "")),
                ].join(" ").toLowerCase();
                return searchableFields.includes(searchTerm);
            });
        }

        // Filter by selected statuses using the matchesStatus helper
        filtered = filtered.filter((item) => matchesStatus(item.stock_status, vesselViewStatuses));

        // Apply sorting based on selected option
        if (sortOption !== 'none') {
            // Helper function to normalize status for sorting (different from the filter normalizeStatus)
            const normalizeStatusForSort = (status) => {
                if (!status) return "";
                let normalized = String(status).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
                // Map status variations
                const statusVariations = {
                    "stock": "in_stock",
                    "on_a_shipping_instr": "on_shipping",
                    "on_a_delivery_instr": "on_delivery",
                    "arrived_dest": "arrived",
                    "arrived_destination": "arrived",
                    "irregularities": "irregular",
                    "shipping_instr": "on_shipping",
                    "delivery_instr": "on_delivery",
                };
                if (statusVariations[normalized]) {
                    normalized = statusVariations[normalized];
                }
                return normalized;
            };

            filtered = filtered.sort((a, b) => {
                // Sort by VIA HUB (alphabetically)
                // VIA HUB 2 overwrites VIA HUB 1 if exists
                // Sorted alphabetically: VIA HUB 1, VIA HUB 2, etc.
                if (sortOption === 'via_hub' || sortOption === 'via_hub_status') {
                    const viaHubA = (a.via_hub2 || a.via_hub || "").toLowerCase().trim();
                    const viaHubB = (b.via_hub2 || b.via_hub || "").toLowerCase().trim();

                    if (viaHubA !== viaHubB) {
                        return viaHubA.localeCompare(viaHubB);
                    }
                }

                // Sort by Vessel (alphabetically by vessel name)
                if (sortOption === 'via_vessel' || sortOption === 'via_vessel_status') {
                    const vesselNameA = getVesselName(a.vessel_id || a.vessel || "").toLowerCase().trim();
                    const vesselNameB = getVesselName(b.vessel_id || b.vessel || "").toLowerCase().trim();

                    if (vesselNameA !== vesselNameB) {
                        return vesselNameA.localeCompare(vesselNameB);
                    }
                }

                // Sort by Stock Status in specific order:
                // 1. "Pending"
                // 2. "Stock"
                // 3. "In Transit"
                // 4. "Arrived Destination"
                // 5. "On a Shipping Instruction"
                // 6. "On a Delivery Instruction"
                if (sortOption === 'status' || sortOption === 'via_hub_status' || sortOption === 'via_vessel_status') {
                    const statusOrder = [
                        "pending",        // "Pending"
                        "in_stock",       // "Stock"
                        "in_transit",     // "In Transit"
                        "arrived",        // "Arrived Destination"
                        "on_shipping",    // "On a Shipping Instruction"
                        "on_delivery"     // "On a Delivery Instruction"
                    ];

                    const getStatusOrder = (status) => {
                        if (!status) return 999; // Unknown status goes to end
                        const normalized = normalizeStatusForSort(status);
                        const index = statusOrder.indexOf(normalized);
                        return index >= 0 ? index : 999;
                    };

                    const statusOrderA = getStatusOrder(a.stock_status);
                    const statusOrderB = getStatusOrder(b.stock_status);

                    if (statusOrderA !== statusOrderB) {
                        return statusOrderA - statusOrderB;
                    }

                    // Special case for via_hub_status: If same hub and both have "Stock" status, sort by Date on Stock
                    if (sortOption === 'via_hub_status') {
                        const viaHubA = (a.via_hub2 || a.via_hub || "").toLowerCase().trim();
                        const viaHubB = (b.via_hub2 || b.via_hub || "").toLowerCase().trim();
                        const normalizedA = normalizeStatusForSort(a.stock_status);
                        const normalizedB = normalizeStatusForSort(b.stock_status);

                        // If same hub and both are "in_stock", sort by date_on_stock
                        if (viaHubA === viaHubB && viaHubA !== "" && normalizedA === "in_stock" && normalizedB === "in_stock") {
                            const dateA = a.date_on_stock ? new Date(a.date_on_stock) : new Date(0);
                            const dateB = b.date_on_stock ? new Date(b.date_on_stock) : new Date(0);
                            if (dateA.getTime() !== dateB.getTime()) {
                                return dateA.getTime() - dateB.getTime(); // Ascending order (older dates first)
                            }
                        }
                    }
                }

                // If everything is equal, maintain original order
                return 0;
            });
        }

        return filtered;
    };

    // Filter stock list for By Vessel view (kept for commented out tabs)
    const getFilteredStockByVessel = () => {
        let filtered = [...stockList];

        // If viewing selected items, filter to only show selected items
        if (isViewingSelected && selectedRows.size > 0) {
            const selectedIds = Array.from(selectedRows);
            filtered = filtered.filter(item => selectedIds.includes(item.id));
        }

        // Apply vessel filter
        if (vesselViewVessel) {
            filtered = filtered.filter((item) => {
                const vesselId = item.vessel_id || item.vessel;
                return String(vesselId) === String(vesselViewVessel);
            });
        }

        // Apply client filter
        if (vesselViewClient) {
            filtered = filtered.filter((item) => {
                const clientId = item.client_id || item.client;
                return String(clientId) === String(vesselViewClient);
            });
        }

        // Apply status filter
        filtered = filtered.filter((item) => matchesStatus(item.stock_status, vesselViewStatuses));

        // Sort items using the shared sorting function
        filtered = sortStockItems(filtered);

        // For By Vessel tab, we need to group but maintain the sorted order
        // Instead of grouping into an object, we'll return the sorted array directly
        // The grouping is handled in the render function, but for pagination we need a flat array
        return filtered; // Return sorted array directly instead of grouped object
    };

    // Filter stock list for By Client view
    const getFilteredStockByClient = () => {
        let filtered = [...stockList];

        // If viewing selected items, filter to only show selected items
        if (isViewingSelected && selectedRows.size > 0) {
            const selectedIds = Array.from(selectedRows);
            filtered = filtered.filter(item => selectedIds.includes(item.id));
        }

        // Apply client filter
        if (clientViewClient) {
            filtered = filtered.filter((item) => {
                const clientId = item.client_id || item.client;
                return String(clientId) === String(clientViewClient);
            });
        }

        // Apply client text search filter
        if (clientViewSearchClient) {
            const searchTerm = clientViewSearchClient.toLowerCase().trim();
            filtered = filtered.filter((item) => {
                const clientName = getClientName(item.client_id || item.client).toLowerCase();
                return clientName.includes(searchTerm);
            });
        }

        // Apply vessel dropdown filter
        if (clientViewVesselFilter) {
            filtered = filtered.filter((item) => {
                const vesselId = item.vessel_id || item.vessel;
                return String(vesselId) === String(clientViewVesselFilter);
            });
        }

        // Apply vessel text search filter
        if (clientViewSearchVessel) {
            const searchTerm = clientViewSearchVessel.toLowerCase().trim();
            filtered = filtered.filter((item) => {
                const vesselName = getVesselName(item.vessel_id || item.vessel).toLowerCase();
                return vesselName.includes(searchTerm);
            });
        }

        // Apply status filter
        filtered = filtered.filter((item) => matchesStatus(item.stock_status, clientViewStatuses));

        // Sort using the shared sorting function - same order as By Vessel tab
        filtered = sortStockItems(filtered);

        return filtered;
    };


    // Get filtered and grouped stock based on active tab
    const getFilteredStock = () => {
        if (activeTab === 0) {
            // By Vessel
            return getFilteredStockByVessel();
        } else {
            // By Client
            return getFilteredStockByClient();
        }
    };

    // Flatten grouped data for pagination
    const getFlattenedStock = () => {
        const filtered = getFilteredStock();
        // Both tabs now return sorted arrays directly
        // Return the array as-is to maintain sort order
        return Array.isArray(filtered) ? filtered : [];
    };

    const filteredAndSortedStock = getFlattenedStock();

    // Handle status checkbox toggle for By Vessel view
    const handleVesselViewStatusToggle = (status) => {
        setVesselViewStatuses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return newSet;
        });
    };

    // Handle status checkbox toggle for By Client view
    const handleClientViewStatusToggle = (status) => {
        setClientViewStatuses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return newSet;
        });
    };

    // Handle row selection toggle for client view
    const handleClientViewRowToggle = (itemId) => {
        setClientViewSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Handle select all for client view (selects all items on current page)
    const handleClientViewSelectAll = () => {
        if (activeTab === 1) {
            const currentPageItems = displayedItems.map(item => item.id || item.stock_item_id);
            const allCurrentPageSelected = currentPageItems.every(id => clientViewSelectedRows.has(id));

            if (allCurrentPageSelected) {
                // Deselect all items on current page
                setClientViewSelectedRows(prev => {
                    const newSet = new Set(prev);
                    currentPageItems.forEach(id => newSet.delete(id));
                    return newSet;
                });
            } else {
                // Select all items on current page
                setClientViewSelectedRows(prev => {
                    const newSet = new Set(prev);
                    currentPageItems.forEach(id => newSet.add(id));
                    return newSet;
                });
            }
        }
    };

    // Handle select all button (selects all items on current page)
    const handleClientViewSelectAllClick = () => {
        if (activeTab === 1) {
            const currentPageItems = displayedItems.map(item => item.id || item.stock_item_id);
            setClientViewSelectedRows(prev => {
                const newSet = new Set(prev);
                currentPageItems.forEach(id => newSet.add(id));
                return newSet;
            });
        }
    };

    // Handle clear selection button
    const handleClientViewClearSelection = () => {
        setClientViewSelectedRows(new Set());
    };

    // Copy selected rows as HTML table
    const handleCopySelectedRows = async () => {
        if (clientViewSelectedRows.size === 0) return;

        const selectedItems = filteredAndSortedStock.filter(item =>
            clientViewSelectedRows.has(item.id || item.stock_item_id)
        );

        // Build HTML table with headers
        let htmlTable = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;"><thead><tr>';

        // Add header row based on filter type
        if (clientViewFilterType === 'filter1') {
            htmlTable += '<th>SUPPLIER</th>';
            htmlTable += '<th>PO NUMBER</th>';
            htmlTable += '<th>BOXES</th>';
            htmlTable += '<th>WEIGHT KGS</th>';
            htmlTable += '<th>STOCK STATUS</th>';
            htmlTable += '<th>DESTINATION</th>';
        } else {
            htmlTable += '<th>SUPPLIER</th>';
            htmlTable += '<th>PO NUMBER</th>';
            htmlTable += '<th>STOCK STATUS</th>';
            htmlTable += '<th>ORIGIN</th>';
            htmlTable += '<th>DESTINATION</th>';
            htmlTable += '<th>SHIPPING DOCS</th>';
            htmlTable += '<th>EXPORT DOC 1</th>';
            htmlTable += '<th>EXPORT DOC 2</th>';
            htmlTable += '<th>BOXES</th>';
            htmlTable += '<th>WEIGHT KGS</th>';
        }

        htmlTable += '</tr></thead><tbody>';

        // Add data rows
        selectedItems.forEach(item => {
            const statusStyle = getStatusStyle(item.stock_status);
            htmlTable += '<tr>';

            if (clientViewFilterType === 'filter1') {
                const supplier = item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || '-');
                const poNumber = (item.po_text || item.po_number || '-').replace(/\n/g, '<br>');
                const boxes = item.item || item.items || item.item_id || item.stock_items_quantity || '-';
                const weight = (item.weight_kg ?? item.weight_kgs) || '-';
                const status = getStatusLabel(item.stock_status);
                const destination = item.destination_new || item.destination_id || item.destination || item.stock_destination || '-';

                htmlTable += `<td>${supplier}</td>`;
                htmlTable += `<td>${poNumber}</td>`;
                htmlTable += `<td>${boxes}</td>`;
                htmlTable += `<td>${weight}</td>`;
                htmlTable += `<td style="background-color: ${statusStyle.bgColor}; color: ${statusStyle.textColor}; padding: 4px 8px; border-radius: 12px; display: inline-block;">${status}</td>`;
                htmlTable += `<td>${destination}</td>`;
            } else {
                const supplier = item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || '-');
                const poNumber = (item.po_text || item.po_number || '-').replace(/\n/g, '<br>');
                const status = getStatusLabel(item.stock_status);
                const origin = item.origin_text || item.origin || getCountryName(item.origin_id) || '-';
                const destination = item.destination_new || item.destination_id || item.destination || item.stock_destination || '-';
                const shippingDoc = item.shipping_doc || '-';
                const exportDoc = item.export_doc || '-';
                const exportDoc2 = item.export_doc_2 || '-';
                const boxes = item.item || item.items || item.item_id || item.stock_items_quantity || '-';
                const weight = (item.weight_kg ?? item.weight_kgs) || '-';

                htmlTable += `<td>${supplier}</td>`;
                htmlTable += `<td>${poNumber}</td>`;
                htmlTable += `<td style="background-color: ${statusStyle.bgColor}; color: ${statusStyle.textColor}; padding: 4px 8px; border-radius: 12px; display: inline-block;">${status}</td>`;
                htmlTable += `<td>${origin}</td>`;
                htmlTable += `<td>${destination}</td>`;
                htmlTable += `<td>${shippingDoc}</td>`;
                htmlTable += `<td>${exportDoc}</td>`;
                htmlTable += `<td>${exportDoc2}</td>`;
                htmlTable += `<td>${boxes}</td>`;
                htmlTable += `<td>${weight}</td>`;
            }

            htmlTable += '</tr>';
        });

        htmlTable += '</tbody></table>';

        // Generate plain text version with headers and proper formatting
        const generatePlainText = () => {
            let plainText = '';

            // Add header row
            if (clientViewFilterType === 'filter1') {
                plainText += 'SUPPLIER\tPO NUMBER\tBOXES\tWEIGHT KGS\tSTOCK STATUS\tDESTINATION\n';
            } else {
                plainText += 'SUPPLIER\tPO NUMBER\tSTOCK STATUS\tORIGIN\tDESTINATION\tSHIPPING DOCS\tEXPORT DOC 1\tEXPORT DOC 2\tBOXES\tWEIGHT KGS\n';
            }

            // Add data rows
            selectedItems.forEach(item => {
                if (clientViewFilterType === 'filter1') {
                    const supplier = item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || '-');
                    const poNumber = (item.po_text || item.po_number || '-').replace(/\n/g, ' ');
                    const boxes = item.item || item.items || item.item_id || item.stock_items_quantity || '-';
                    const weight = (item.weight_kg ?? item.weight_kgs) || '-';
                    const status = getStatusLabel(item.stock_status);
                    const destination = item.destination_new || item.destination_id || item.destination || item.stock_destination || '-';

                    plainText += `${supplier}\t${poNumber}\t${boxes}\t${weight}\t${status}\t${destination}\n`;
                } else {
                    const supplier = item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || '-');
                    const poNumber = (item.po_text || item.po_number || '-').replace(/\n/g, ' ');
                    const status = getStatusLabel(item.stock_status);
                    const origin = item.origin_text || item.origin || getCountryName(item.origin_id) || '-';
                    const destination = item.destination_new || item.destination_id || item.destination || item.stock_destination || '-';
                    const shippingDoc = item.shipping_doc || '-';
                    const exportDoc = item.export_doc || '-';
                    const exportDoc2 = item.export_doc_2 || '-';
                    const boxes = item.item || item.items || item.item_id || item.stock_items_quantity || '-';
                    const weight = (item.weight_kg ?? item.weight_kgs) || '-';

                    plainText += `${supplier}\t${poNumber}\t${status}\t${origin}\t${destination}\t${shippingDoc}\t${exportDoc}\t${exportDoc2}\t${boxes}\t${weight}\n`;
                }
            });

            return plainText;
        };

        try {
            // Try modern Clipboard API with HTML support
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([htmlTable], { type: 'text/html' }),
                        'text/plain': new Blob([generatePlainText()], { type: 'text/plain' })
                    })
                ]);
            } else {
                // Fallback: Create a temporary element and copy
                const textarea = document.createElement('textarea');
                textarea.value = generatePlainText();
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);

                // Also try to copy HTML using execCommand
                const div = document.createElement('div');
                div.innerHTML = htmlTable;
                div.style.position = 'fixed';
                div.style.left = '-9999px';
                document.body.appendChild(div);
                const range = document.createRange();
                range.selectNodeContents(div);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
                document.body.removeChild(div);
            }

            toast({
                title: "Copied!",
                description: `${clientViewSelectedRows.size} row(s) copied to clipboard`,
                status: "success",
                duration: 2000,
                isClosable: true,
            });
        } catch (err) {
            console.error('Failed to copy:', err);
            toast({
                title: "Error",
                description: "Failed to copy to clipboard",
                status: "error",
                duration: 2000,
                isClosable: true,
            });
        }
    };

    // Build print/PDF document HTML for client view items
    const buildClientViewPrintHtml = (items) => {
        if (!items || items.length === 0) return "";

        let headerRow = "<tr>";
        if (clientViewFilterType === "filter1") {
            ["SUPPLIER", "PO NUMBER", "BOXES", "WEIGHT KGS", "STOCK STATUS", "DESTINATION"].forEach(h => {
                headerRow += `<th style="border:1px solid #333;padding:6px 8px;text-align:left;background:#f0f0f0;">${h}</th>`;
            });
        } else {
            ["SUPPLIER", "PO NUMBER", "STOCK STATUS", "ORIGIN", "DESTINATION", "SHIPPING DOCS", "EXPORT DOC 1", "EXPORT DOC 2", "BOXES", "WEIGHT KGS"].forEach(h => {
                headerRow += `<th style="border:1px solid #333;padding:6px 8px;text-align:left;background:#f0f0f0;">${h}</th>`;
            });
        }
        headerRow += "</tr>";

        let bodyRows = "";
        items.forEach(item => {
            const statusStyle = getStatusStyle(item.stock_status);
            bodyRows += "<tr>";
            if (clientViewFilterType === "filter1") {
                const supplier = item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || "-");
                const poNumber = (item.po_text || item.po_number || "-").replace(/\n/g, "<br/>");
                const boxes = item.item ?? item.items ?? item.item_id ?? item.stock_items_quantity ?? "-";
                const weight = item.weight_kg ?? item.weight_kgs ?? "-";
                const status = getStatusLabel(item.stock_status);
                const destination = item.destination_new || item.destination_id || item.destination || item.stock_destination || "-";
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${supplier}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${poNumber}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${boxes}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${weight}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${status}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${destination}</td>`;
            } else {
                const supplier = item.supplier_id ? getSupplierName(item.supplier_id) : (item.supplier || "-");
                const poNumber = (item.po_text || item.po_number || "-").replace(/\n/g, "<br/>");
                const status = getStatusLabel(item.stock_status);
                const origin = item.origin_text || item.origin || getCountryName(item.origin_id) || "-";
                const destination = item.destination_new || item.destination_id || item.destination || item.stock_destination || "-";
                const shippingDoc = item.shipping_doc || "-";
                const exportDoc = item.export_doc || "-";
                const exportDoc2 = item.export_doc_2 || "-";
                const boxes = item.item ?? item.items ?? item.item_id ?? item.stock_items_quantity ?? "-";
                const weight = item.weight_kg ?? item.weight_kgs ?? "-";
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${supplier}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${poNumber}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${status}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${origin}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${destination}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${shippingDoc}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${exportDoc}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${exportDoc2}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${boxes}</td>`;
                bodyRows += `<td style="border:1px solid #333;padding:6px 8px;">${weight}</td>`;
            }
            bodyRows += "</tr>";
        });

        return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stocklist - Client View</title>
<style>body{font-family:Arial,sans-serif;margin:12px;} table{border-collapse:collapse;width:100%;} @media print{body{margin:0;} .no-print{display:none;}}</style></head>
<body><h2 style="margin-bottom:12px;">Stocklist – Client View</h2>
<p class="no-print" style="margin-bottom:8px;">Use browser Print (Ctrl+P) and choose "Save as PDF" to export as PDF.</p>
<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>
<script>window.onload=function(){window.print();}</script></body></html>`;
    };

    // Print single row (client view) – opens print window for one item
    const handlePrintClientViewRow = (item) => {
        const printHtml = buildClientViewPrintHtml([item]);
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast({ title: "Blocked", description: "Please allow popups to print.", status: "warning", duration: 3000, isClosable: true });
            return;
        }
        printWindow.document.write(printHtml);
        printWindow.document.close();
        toast({ title: "Print", description: "Print dialog opened. Choose 'Save as PDF' to export.", status: "info", duration: 2000, isClosable: true });
    };

    // Print selected rows (client view) – opens print window for selected items as PDF-ready table
    const handlePrintClientViewSelected = () => {
        if (clientViewSelectedRows.size === 0) {
            toast({ title: "No selection", description: "Select one or more rows first.", status: "warning", duration: 2000, isClosable: true });
            return;
        }
        const selectedItems = filteredAndSortedStock.filter(item =>
            clientViewSelectedRows.has(item.id || item.stock_item_id)
        );
        const printHtml = buildClientViewPrintHtml(selectedItems);
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast({ title: "Blocked", description: "Please allow popups to print.", status: "warning", duration: 3000, isClosable: true });
            return;
        }
        printWindow.document.write(printHtml);
        printWindow.document.close();
        toast({ title: "Print", description: `${selectedItems.length} row(s). Use Print → Save as PDF to export.`, status: "info", duration: 2500, isClosable: true });
    };

    // Handle create new - navigate to form page
    const handleCreateNew = () => {
        history.push("/admin/stock-list/form");
    };

    // Handle row selection
    const handleRowSelect = (itemId, isSelected) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(itemId);
            } else {
                newSet.delete(itemId);
            }
            return newSet;
        });
    };

    // Handle select all
    const handleSelectAll = (isSelected) => {
        if (isSelected) {
            // Select all items on current page
            const allIds = displayedItems.map(item => item.id);
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                allIds.forEach(id => newSet.add(id));
                return newSet;
            });
        } else {
            // Deselect all items on current page
            const allIds = displayedItems.map(item => item.id);
            setSelectedRows(prev => {
                const newSet = new Set(prev);
                allIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
    };

    // Get paginated items for display
    const getPaginatedItems = (items, page, pageSize) => {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return items.slice(startIndex, endIndex);
    };

    // Check if all items are selected - use the same filtered data that's displayed in the table
    const getDisplayedItems = () => {
        const allItems = activeTab === 0 ? getFilteredStockByStatus() : filteredAndSortedStock;
        // Return paginated items for display
        if (activeTab === 0) {
            return getPaginatedItems(allItems, stockViewPage, stockViewPageSize);
        } else {
            return getPaginatedItems(allItems, clientViewPage, clientViewPageSize);
        }
    };
    const displayedItems = getDisplayedItems();

    // Get all filtered items (for selection and counts)
    const getAllFilteredItems = () => {
        return activeTab === 0 ? getFilteredStockByStatus() : filteredAndSortedStock;
    };
    const allFilteredItems = getAllFilteredItems();
    const allItemsSelected = displayedItems.length > 0 && displayedItems.every(item => selectedRows.has(item.id));
    const someItemsSelected = displayedItems.some(item => selectedRows.has(item.id));

    // For Stock View tab - check if all items on current page are selected
    const allPageItemsSelected = activeTab === 0
        ? displayedItems.length > 0 && displayedItems.every(item => selectedRows.has(item.id))
        : allItemsSelected;
    const somePageItemsSelected = activeTab === 0
        ? displayedItems.some(item => selectedRows.has(item.id))
        : someItemsSelected;

    // Handle inline edit start - for single row
    // Helper to extract ID value (handles false, null, undefined, objects, and primitives)
    const extractId = (value, fallback = "") => {
        // If value is false/null/undefined/empty string, return fallback
        if (value === false || value === null || value === undefined || value === "") return fallback;
        // If value is 0, it's valid, return it as string
        if (value === 0) return "0";
        // If it's an object with id property
        if (typeof value === 'object' && value !== null && value.id !== undefined) return String(value.id);
        // If it's a number or string, return as string
        if (typeof value === 'number' || typeof value === 'string') return String(value);
        return fallback;
    };

    // Normalize item data for editing - ensures all field names match what renderEditableCell expects
    const normalizeItemForEditing = (item) => {
        // Helper to get the actual ID value, handling false/null/undefined
        // Checks primaryField first, then fallbackFields in order
        const getFieldValue = (primaryField, ...fallbackFields) => {
            // Check primary field first
            const primaryValue = item[primaryField];
            if (primaryValue !== undefined && primaryValue !== null && primaryValue !== false && primaryValue !== "") {
                return extractId(primaryValue, "");
            }
            // Check fallback fields
            for (const field of fallbackFields) {
                const value = item[field];
                if (value !== undefined && value !== null && value !== false && value !== "") {
                    return extractId(value, "");
                }
            }
            return "";
        };

        return {
            ...item,
            // Normalize field names to match what renderEditableCell uses - convert IDs to strings for Select compatibility
            vessel_id: getFieldValue("vessel_id", "vessel"),
            supplier_id: getFieldValue("supplier_id", "supplier"),
            client_id: getFieldValue("client_id", "client"),
            // Keep raw PO text (can contain multiple lines)
            po_text: item.po_text || item.po_number || "",
            so_number_id: addSOPrefix(getFieldValue("so_number_id", "so_number", "stock_so_number")),
            shipping_instruction_id: addSIPrefix(getFieldValue("shipping_instruction_id", "si_number", "stock_shipping_instruction")),
            delivery_instruction_id: addDIPrefix(getFieldValue("delivery_instruction_id", "di_number", "stock_delivery_instruction")),
            origin_id: (() => {
                // For inline editing, convert origin_id to country name text if possible
                // Check origin_text first (new field), then origin_id
                const originValue = getFieldValue("origin_text") || getFieldValue("origin_id");
                // If it's already text (not a pure number), keep it
                if (originValue && !/^\d+$/.test(String(originValue))) {
                    return originValue;
                }
                // If we have countries loaded and it's an ID, convert to name
                if (originValue && countries.length > 0) {
                    const country = countries.find(c => {
                        const cId = c.id || c.country_id;
                        return String(cId) === String(originValue);
                    });
                    if (country) {
                        return country.name || country.code || originValue;
                    }
                }
                // Otherwise keep as-is (will be handled when countries load)
                return originValue;
            })(),
            ap_destination_id: getFieldValue("ap_destination_id", "ap_destination"),
            destination_id: getFieldValue("destination_id", "destination", "stock_destination"),
            warehouse_id: getFieldValue("warehouse_id", "stock_warehouse"),
            currency_id: getFieldValue("currency_id", "currency"),
            // Ensure numeric fields are preserved as strings for input compatibility
            item: item.item || item.items || item.item_id || item.stock_items_quantity || "", // BOXES field
            items: item.items || item.item_id || item.stock_items_quantity || "",
            weight_kg: item.weight_kg !== undefined && item.weight_kg !== null ? String(item.weight_kg || item.weight_kgs || "") : "",
            volume_cbm: item.volume_cbm !== undefined && item.volume_cbm !== null ? String(item.volume_cbm) : "",
            value: item.value !== undefined && item.value !== null ? String(item.value) : "",
            // Preserve date fields (handle false as empty string)
            date_on_stock: item.date_on_stock && item.date_on_stock !== false ? item.date_on_stock : "",
            exp_ready_in_stock: item.exp_ready_in_stock && item.exp_ready_in_stock !== false ? (item.exp_ready_in_stock || item.ready_ex_supplier || "") : "",
            shipped_date: item.shipped_date && item.shipped_date !== false ? item.shipped_date : "",
            delivered_date: item.delivered_date && item.delivered_date !== false ? item.delivered_date : "",
            vessel_eta: item.vessel_eta && item.vessel_eta !== false ? item.vessel_eta : "",
            // Text fields
            si_combined: addSICombinedPrefix(item.si_combined === false ? "" : (item.si_combined || "")),
            details: item.details || item.item_desc || "",
            dg_un: item.dg_un || "",
            remarks: item.remarks || "",
            via_hub: item.via_hub || "",
            via_hub2: item.via_hub2 || "",
            shipping_doc: item.shipping_doc || "",
            export_doc: item.export_doc || "",
            export_doc_2: item.export_doc_2 || "",
            vessel_destination: item.vessel_destination || item.vessel_destination_text || "",
            stock_status: item.stock_status || "",
        };
    };

    const handleEditStart = (item) => {
        const normalizedItem = normalizeItemForEditing(item);
        setEditingRowIds(new Set([item.id]));
        setEditingRowData({ [item.id]: normalizedItem });
    };

    // Handle bulk edit - make all selected rows editable
    const handleBulkEdit = () => {
        const selectedIds = Array.from(selectedRows);
        if (selectedIds.length > 0) {
            const selectedItems = filteredAndSortedStock.filter(item => selectedIds.includes(item.id));
            const newEditingData = {};
            selectedItems.forEach(item => {
                newEditingData[item.id] = normalizeItemForEditing(item);
            });
            setEditingRowIds(new Set(selectedIds));
            setEditingRowData(newEditingData);
        }
    };

    // Handle inline edit cancel - cancel all editing
    const handleEditCancel = () => {
        setEditingRowIds(new Set());
        setEditingRowData({});
    };

    // Handle inline edit cancel for single row
    const handleEditCancelRow = (itemId) => {
        setEditingRowIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
        });
        setEditingRowData(prev => {
            const newData = { ...prev };
            delete newData[itemId];
            return newData;
        });
    };

    // Helper to normalize a value for comparison (handles different field name variations)
    const getNormalizedValue = (item, fieldVariations) => {
        for (const field of fieldVariations) {
            if (item[field] !== undefined && item[field] !== null && item[field] !== false && item[field] !== "") {
                return item[field];
            }
        }
        return null;
    };

    // Helper to compare values (handles different data types)
    const valuesAreEqual = (val1, val2) => {
        // Handle null/undefined/empty
        if ((!val1 || val1 === false || val1 === "") && (!val2 || val2 === false || val2 === "")) return true;
        // Handle numbers - compare as numbers
        if (typeof val1 === "number" && typeof val2 === "number") return val1 === val2;
        // Convert both to strings for comparison
        return String(val1 || "") === String(val2 || "");
    };

    // Map frontend editingRowData to backend API payload structure - only include changed fields
    const buildPayload = (originalItem, editedData = null) => {
        // If no editedData, return payload with only stock_id (not id)
        if (!editedData) {
            return {
                stock_id: originalItem.id,
            };
        }

        // Helper to convert value to appropriate type
        const toValue = (val, defaultVal = false) => {
            if (val === null || val === undefined || val === "") return defaultVal;
            if (typeof val === "boolean") return val;
            if (typeof val === "number") return val;
            if (typeof val === "string" && val.trim() === "") return defaultVal;
            return val;
        };

        // Helper to convert number
        const toNumber = (val) => {
            if (!val && val !== 0) return 0;
            const num = typeof val === "string" ? parseFloat(val) : val;
            return isNaN(num) ? 0 : num;
        };

        // Helper to convert ID (can be string or number)
        const toId = (val) => {
            if (!val && val !== 0) return false;
            if (typeof val === "string" && val.trim() === "") return false;
            return String(val);
        };

        // Helper to get original value (handles field variations)
        const getOriginalValue = (fieldVariations) => {
            for (const field of fieldVariations) {
                const val = originalItem[field];
                if (val !== undefined && val !== null) return val;
            }
            return null;
        };

        // Helper to get edited value (handles field variations)
        const getEditedValue = (fieldVariations) => {
            for (const field of fieldVariations) {
                const val = editedData[field];
                if (val !== undefined && val !== null) return val;
            }
            return null;
        };

        // Start with stock_id for update operations (DO NOT include id field)
        const payload = {
            stock_id: originalItem.id,
        };

        // Compare each field and only include changed ones
        const fieldMappings = [
            { backend: "stock_item_id", original: ["stock_item_id", "stock_id"], edited: ["stock_item_id"], transform: (v) => v || "" },
            { backend: "stock_status", original: ["stock_status"], edited: ["stock_status"], transform: (v) => v || "" },
            { backend: "client_id", original: ["client_id", "client"], edited: ["client_id"], transform: (v) => toValue(toId(v), false) },
            { backend: "supplier_id", original: ["supplier_id", "supplier"], edited: ["supplier_id"], transform: (v) => toValue(toId(v), false) },
            { backend: "vessel_id", original: ["vessel_id", "vessel"], edited: ["vessel_id"], transform: (v) => toValue(toId(v), false) },
            { backend: "pic_new", original: ["pic_new", "pic", "pic_id"], edited: ["pic_new"], transform: (v) => v ? String(v) : false },
            { backend: "item", original: ["item"], edited: ["item"], transform: (v) => v !== "" && v !== null && v !== undefined ? toNumber(v) || 0 : 0 }, // BOXES field - item count
            { backend: "item_id", original: ["item_id", "stock_items_quantity", "items"], edited: ["item_id", "stock_items_quantity", "items"], transform: (v) => toValue(toId(v), false) }, // Keep item_id for lines format
            { backend: "stock_items_quantity", original: ["stock_items_quantity", "items", "item_id"], edited: ["stock_items_quantity", "items"], transform: (v) => toValue(toId(v), false) },
            { backend: "currency_id", original: ["currency_id", "currency"], edited: ["currency_id"], transform: (v) => toValue(toId(v), false) },
            { backend: "origin_text", original: ["origin_id", "origin_text"], edited: ["origin_id", "origin_text"], transform: (v) => v ? String(v) : "" },
            { backend: "ap_destination_new", original: ["ap_destination_new", "ap_destination_id", "ap_destination"], edited: ["ap_destination_new", "ap_destination"], transform: (v) => v || "" }, // Free text field
            { backend: "via_hub", original: ["via_hub"], edited: ["via_hub"], transform: (v) => v || "" },
            { backend: "via_hub2", original: ["via_hub2"], edited: ["via_hub2"], transform: (v) => v || "" },
            { backend: "client_access", original: ["client_access"], edited: ["client_access"], transform: (v) => Boolean(v !== undefined ? v : false) },
            { backend: "remarks", original: ["remarks"], edited: ["remarks"], transform: (v) => v || "" },
            { backend: "internal_remark", original: ["internal_remark"], edited: ["internal_remark"], transform: (v) => v || "" },
            { backend: "weight_kg", original: ["weight_kg", "weight_kgs"], edited: ["weight_kg"], transform: (v) => toNumber(v) },
            { backend: "width_cm", original: ["width_cm"], edited: ["width_cm"], transform: (v) => toNumber(v) },
            { backend: "length_cm", original: ["length_cm"], edited: ["length_cm"], transform: (v) => toNumber(v) },
            { backend: "height_cm", original: ["height_cm"], edited: ["height_cm"], transform: (v) => toNumber(v) },
            { backend: "volume_dim", original: ["volume_dim", "volume_no_dim"], edited: ["volume_dim"], transform: (v) => toNumber(v) },
            { backend: "volume_cbm", original: ["volume_cbm"], edited: ["volume_cbm"], transform: (v) => toNumber(v) },
            { backend: "po_text", original: ["po_text", "po_number"], edited: ["po_text"], transform: (v) => v || "" },
            // Arrays of PO numbers and LWH lines (derived from text, one per line)
            {
                backend: "po_text_array", original: ["po_text_array"], edited: ["po_text"], transform: (v) => {
                    const val = Array.isArray(v) ? v.join("\n") : (v || "");
                    return splitLines(val);
                }
            },
            { backend: "cw_air_freight_new", original: ["cw_air_freight_new", "cw_freight", "cw_airfreight"], edited: ["cw_air_freight_new"], transform: (v) => toNumber(v) },
            { backend: "value", original: ["value"], edited: ["value"], transform: (v) => toNumber(v) },
            { backend: "shipment_type", original: ["shipment_type"], edited: ["shipment_type"], transform: (v) => v || "" },
            { backend: "extra", original: ["extra", "extra2"], edited: ["extra"], transform: (v) => v || "" },
            { backend: "destination_new", original: ["destination_new", "destination_id", "destination", "stock_destination"], edited: ["destination_new", "destination"], transform: (v) => v || "" }, // Free text field
            { backend: "warehouse_new", original: ["warehouse_new", "warehouse_id", "stock_warehouse"], edited: ["warehouse_new", "warehouse_id"], transform: (v) => v || "" }, // Free text field
            { backend: "shipping_doc", original: ["shipping_doc"], edited: ["shipping_doc"], transform: (v) => v || "" },
            { backend: "export_doc", original: ["export_doc"], edited: ["export_doc"], transform: (v) => v || "" },
            { backend: "export_doc_2", original: ["export_doc_2"], edited: ["export_doc_2"], transform: (v) => v || "" },
            { backend: "date_on_stock", original: ["date_on_stock"], edited: ["date_on_stock"], transform: (v) => toValue(v, false) },
            { backend: "exp_ready_in_stock", original: ["exp_ready_in_stock", "ready_ex_supplier"], edited: ["exp_ready_in_stock"], transform: (v) => toValue(v, false) },
            { backend: "shipped_date", original: ["shipped_date"], edited: ["shipped_date"], transform: (v) => toValue(v, false) },
            { backend: "delivered_date", original: ["delivered_date"], edited: ["delivered_date"], transform: (v) => toValue(v, false) },
            { backend: "details", original: ["details", "item_desc"], edited: ["details"], transform: (v) => v || "" },
            { backend: "dg_un", original: ["dg_un"], edited: ["dg_un"], transform: (v) => v || "" },
            { backend: "item", original: ["item", "items"], edited: ["item", "items"], transform: (v) => v !== "" && v !== null && v !== undefined ? toNumber(v) || 0 : 0 },
            { backend: "lwh_text", original: ["lwh_text"], edited: ["lwh_text"], transform: (v) => v || "" },
            {
                backend: "lwh_text_array", original: ["lwh_text_array"], edited: ["lwh_text"], transform: (v) => {
                    const val = Array.isArray(v) ? v.join("\n") : (v || "");
                    return splitLines(val);
                }
            },
            { backend: "vessel_destination", original: ["vessel_destination", "vessel_destination_text"], edited: ["vessel_destination"], transform: (v) => v || "" },
            { backend: "vessel_eta", original: ["vessel_eta"], edited: ["vessel_eta"], transform: (v) => toValue(v, false) },
            { backend: "stock_so_number", original: ["so_number_id", "so_number", "stock_so_number"], edited: ["so_number_id", "stock_so_number"], transform: (v) => v ? removeSOPrefix(String(v)) : "" },
            { backend: "stock_shipping_instruction", original: ["shipping_instruction_id", "si_number", "stock_shipping_instruction"], edited: ["shipping_instruction_id", "stock_shipping_instruction"], transform: (v) => v ? removeSIPrefix(String(v)) : "" },
            { backend: "stock_delivery_instruction", original: ["delivery_instruction_id", "di_number", "stock_delivery_instruction"], edited: ["delivery_instruction_id", "stock_delivery_instruction"], transform: (v) => v ? removeDIPrefix(String(v)) : "" },
            { backend: "vessel_destination_text", original: ["vessel_destination", "vessel_destination_text"], edited: ["vessel_destination", "vessel_destination_text"], transform: (v) => v || "" },
            {
                backend: "si_combined", original: ["si_combined"], edited: ["si_combined"], transform: (v) => {
                    const cleaned = v ? removeSICombinedPrefix(String(v)) : "";
                    return cleaned === "" ? false : cleaned;
                }
            },
        ];

        // Check each field for changes
        fieldMappings.forEach(({ backend, original, edited, transform }) => {
            const originalVal = transform(getOriginalValue(original));
            const editedVal = transform(getEditedValue(edited));

            // Only include if the value has changed
            if (!valuesAreEqual(originalVal, editedVal)) {
                payload[backend] = editedVal;
            }
        });

        return payload;
    };

    // Handle inline edit save - for single row
    const handleEditSave = async (item) => {
        try {
            const editedData = editingRowData[item.id];
            const linePayload = buildPayload(item, editedData);

            // Wrap in lines array format
            const payload = { lines: [linePayload] };

            const result = await updateStockItemApi(item.id, payload);
            if (result && result.result && result.result.status === 'success') {
                toast({
                    title: 'Success',
                    description: `Stock item updated successfully`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });

                // Remove this row from editing
                setEditingRowIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(item.id);
                    return newSet;
                });
                setEditingRowData(prev => {
                    const newData = { ...prev };
                    delete newData[item.id];
                    return newData;
                });

                getStockList();
            } else {
                throw new Error(result?.result?.message || 'Failed to update stock item');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update stock item',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handle bulk save - save all rows being edited in a single API call with lines array
    const handleBulkSave = async () => {
        const editingIds = Array.from(editingRowIds);
        if (editingIds.length === 0) return;

        try {
            // Build lines array from all edited items
            const lines = editingIds.map((itemId) => {
                const item = filteredAndSortedStock.find(i => i.id === itemId);
                if (!item) {
                    throw new Error(`Item with id ${itemId} not found`);
                }
                const editedData = editingRowData[itemId];
                return buildPayload(item, editedData);
            });

            // Send all lines in a single payload
            const payload = { lines };
            const result = await updateStockItemApi(editingIds[0], payload);

            if (result && result.result && result.result.status === 'success') {
                toast({
                    title: 'Success',
                    description: `${lines.length} stock item(s) updated successfully`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
                setEditingRowIds(new Set());
                setEditingRowData({});
                getStockList();
            } else {
                throw new Error(result?.result?.message || result?.message || 'Failed to update stock items');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update stock items',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };


    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return "-";
        const parsed = new Date(dateString);
        return Number.isNaN(parsed.getTime()) ? dateString : parsed.toLocaleDateString();
    };

    const formatDateTime = (value) => {
        if (!value) return "-";
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    };

    const renderText = (value) => {
        if (value === null || value === undefined || value === "" || value === false) {
            return "-";
        }
        return value;
    };

    // Note: Loading state is now shown inside the tables instead of blocking the entire page

    // Show error state
    if (error && stockList.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Alert status="error">
                    <AlertIcon />
                    <Box>
                        <AlertTitle>Error loading stock list!</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Box>
                </Alert>
                <Button mt="4" onClick={() => getStockList()} leftIcon={<Icon as={MdRefresh} />}>
                    Retry
                </Button>
            </Box>
        );
    }

    // Get selected data for each view
    const vesselViewClientData = vesselViewClient ? clients.find(c => String(c.id) === String(vesselViewClient)) : null;
    const vesselViewVesselData = vesselViewVessel ? vessels.find(v => String(v.id) === String(vesselViewVessel)) : null;
    const clientViewClientData = clientViewClient ? clients.find(c => String(c.id) === String(clientViewClient)) : null;

    const splitLines = (val) =>
        (val || "")
            .split(/\r?\n/)
            .map((v) => v.trim())
            .filter(Boolean);

    const renderMultiLineLabels = (value) => {
        const lines = splitLines(value);
        if (!lines.length) {
            return <Text {...cellText}>-</Text>;
        }
        return (
            <VStack align="start" spacing={1}>
                {lines.map((line, idx) => (
                    <Badge key={idx} colorScheme="blue" variant="subtle">
                        {line}
                    </Badge>
                ))}
            </VStack>
        );
    };

    // Helper function to render editable cell
    const renderEditableCell = (item, field, value, type = "text", options = null) => {
        const isEditing = editingRowIds.has(item.id);
        const rowEditingData = editingRowData[item.id] || {};
        const currentValue = rowEditingData[field] !== undefined ? rowEditingData[field] : value;

        if (!isEditing) {
            return <Text {...cellText}>{value || "-"}</Text>;
        }

        const handleChange = (newValue) => {
            setEditingRowData(prev => {
                const currentRowData = prev[item.id] || normalizeItemForEditing(item);
                return {
                    ...prev,
                    [item.id]: {
                        ...currentRowData,
                        [field]: newValue
                    }
                };
            });
        };

        // Handle searchable select for SO number field
        if (type === "so_number" || field.includes("so_number")) {
            const soOptions = shippingOrders
                .filter(so => so && so.id) // Filter out invalid entries
                .map(so => ({
                    value: String(so.id),
                    label: so.so_number || so.name || `SO-${so.id}`
                }));

            // Debug logging
            if (soOptions.length === 0 && !isLoadingShippingOrders) {
                console.log('No SO options found. Shipping orders:', shippingOrders);
            }

            return (
                <Box position="relative" zIndex={10}>
                    <SimpleSearchableSelect
                        value={currentValue ? String(currentValue) : ""}
                        onChange={(val) => handleChange(val)}
                        options={soOptions}
                        placeholder={isLoadingShippingOrders ? "Loading SO numbers..." : (soOptions.length === 0 ? "No SO numbers available" : "Select SO Number...")}
                        displayKey="label"
                        valueKey="value"
                        formatOption={(option) => option.label || `SO-${option.value}`}
                        isLoading={isLoadingShippingOrders}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    />
                </Box>
            );
        }

        if (type === "textarea") {
            return (
                <Textarea
                    value={currentValue || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    size="sm"
                    rows={3}
                    bg={inputBg}
                    color={inputText}
                    borderColor={borderColor}
                />
            );
        }

        // Handle origin field as free text input with country suggestions
        if (field.includes("origin_id") || field === "origin_text") {
            return (
                <Box position="relative">
                    <Input
                        list={`origin-countries-${item.id}`}
                        value={currentValue || ""}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder="Type or select country..."
                        size="sm"
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    />
                    <datalist id={`origin-countries-${item.id}`}>
                        {countries.map((country) => (
                            <option key={country.id || country.country_id} value={country.name || country.code || ""} />
                        ))}
                    </datalist>
                </Box>
            );
        }

        // Handle searchable select for destination fields (but NOT ap_destination - that's free text)
        if (type === "searchable" || (field.includes("destination") && !field.includes("ap_destination"))) {
            // Use destinations for destination fields
            const destinationOptions = destinations.map(d => ({
                value: String(d.id),
                label: d.name || d.code || `Dest ${d.id}`
            }));

            return (
                <Box position="relative" zIndex={10}>
                    <SimpleSearchableSelect
                        value={currentValue ? String(currentValue) : ""}
                        onChange={(val) => handleChange(val)}
                        options={destinationOptions}
                        placeholder="Select Destination..."
                        displayKey="label"
                        valueKey="value"
                        formatOption={(option) => option.label || `Dest ${option.value}`}
                        isLoading={false}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    />
                </Box>
            );
        }

        // Handle warehouse_id as free text textarea (not linked to warehouses)
        if (field === "warehouse_id" || field === "stock_warehouse") {
            return (
                <Textarea
                    value={currentValue || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    size="sm"
                    rows={2}
                    resize="vertical"
                    bg={inputBg}
                    color={inputText}
                    borderColor={borderColor}
                    placeholder="Enter Warehouse ID"
                />
            );
        }

        switch (type) {
            case "select":
                return (
                    <Select
                        size="sm"
                        value={currentValue || ""}
                        onChange={(e) => handleChange(e.target.value)}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    >
                        <option value="">Select...</option>
                        {options && options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Select>
                );
            case "date":
                return (
                    <Input
                        type="date"
                        size="sm"
                        value={currentValue ? new Date(currentValue).toISOString().split('T')[0] : ""}
                        onChange={(e) => handleChange(e.target.value)}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    />
                );
            case "number":
                return (
                    <Input
                        type="number"
                        size="sm"
                        value={currentValue || ""}
                        onChange={(e) => handleChange(e.target.value)}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    />
                );
            default:
                // Handle prefixes for SI NUMBER, SI COMBINED, and DI NUMBER fields
                let displayValue = currentValue || "";
                let onChangeHandler = (e) => {
                    let processedValue = e.target.value;
                    if (field === "shipping_instruction_id") {
                        if (processedValue && processedValue !== "") {
                            processedValue = addSIPrefix(processedValue);
                        } else {
                            processedValue = "";
                        }
                    } else if (field === "si_combined") {
                        if (processedValue && processedValue !== "") {
                            processedValue = addSICombinedPrefix(processedValue);
                        } else {
                            processedValue = "";
                        }
                    } else if (field === "delivery_instruction_id") {
                        if (processedValue && processedValue !== "") {
                            processedValue = addDIPrefix(processedValue);
                        } else {
                            processedValue = "";
                        }
                    }
                    handleChange(processedValue);
                };

                return (
                    <Input
                        size="sm"
                        value={displayValue}
                        onChange={onChangeHandler}
                        bg={inputBg}
                        color={inputText}
                        borderColor={borderColor}
                    />
                );
        }
    };

    // Render table rows for a given stock list - columns vary by active tab
    const renderTableRows = (stockItems) => {
        return stockItems.map((item, index) => {
            const statusStyle = getStatusStyle(item.stock_status);
            const rowBg = statusStyle.bgColor || tableRowBg;
            const isEditing = editingRowIds.has(item.id);

            // Render cells based on active tab
            if (activeTab === 0) {
                // By Vessel view - match the image columns exactly
                return (
                    <Tr
                        key={item.id}
                        bg={rowBg}
                        borderBottom="1px"
                        borderColor={tableBorderColor}
                        _hover={{ opacity: 0.9 }}
                    >
                        <Td
                            borderRight="1px"
                            borderColor={tableBorderColor}
                            py="12px"
                            px="8px"
                            width="40px"
                            minW="40px"
                            maxW="40px"
                        >
                            <Checkbox
                                isChecked={selectedRows.has(item.id)}
                                onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                size="sm"
                                borderColor="gray.600"
                                sx={{
                                    "& .chakra-checkbox__control": {
                                        borderColor: "gray.600",
                                        _checked: {
                                            borderColor: "blue.500",
                                            bg: "blue.500",
                                        },
                                    },
                                }}
                            />
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "vessel_id", item.vessel_id || item.vessel, "select", vessels.map(v => ({ value: v.id, label: v.name }))) : <Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "stock_item_id", item.stock_item_id || item.stock_id) : <Text {...cellText}>{renderText(item.stock_item_id || item.stock_id)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "supplier_id", item.supplier_id, "select", vendors.map(v => ({ value: v.id, label: v.name }))) : <Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing
                                ? renderEditableCell(item, "po_text", item.po_text || item.po_number, "textarea")
                                : renderMultiLineLabels(item.po_text || item.po_number)}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "so_number_id", item.so_number_id || item.so_number || item.stock_so_number, "so_number") : <Text {...cellText}>{(() => {
                                const soValue = item.so_number_id ? getSoNumberName(item.so_number_id) : renderText(item.so_number || item.stock_so_number);
                                const prefixed = addSOPrefix(soValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_instruction_id", item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction) : <Text {...cellText}>{(() => {
                                const siValue = renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction);
                                const prefixed = addSIPrefix(siValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "si_combined", item.si_combined) : <Text {...cellText}>{(() => {
                                const sicValue = renderText(item.si_combined);
                                const prefixed = addSICombinedPrefix(sicValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivery_instruction_id", item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction) : <Text {...cellText}>{(() => {
                                const diValue = renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction);
                                const prefixed = addDIPrefix(diValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? (
                                <Select
                                    size="sm"
                                    value={editingRowData.stock_status || item.stock_status || ""}
                                    onChange={(e) => setEditingRowData(prev => ({ ...prev, stock_status: e.target.value }))}
                                    bg={inputBg}
                                    color={inputText}
                                    borderColor={borderColor}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                        <option key={statusKey} value={statusKey}>{config.label}</option>
                                    ))}
                                </Select>
                            ) : (
                                <Badge colorScheme={statusStyle.color} size="sm" borderRadius="full" px="3" py="1">
                                    {getStatusLabel(item.stock_status)}
                                </Badge>
                            )}
                        </Td>
                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                            {isEditing ? renderEditableCell(item, "origin_id", item.origin_text || item.origin_id, "text") : <Text {...cellText}>{item.origin_text || getCountryName(item.origin_id) || "-"}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "via_hub", item.via_hub) : <Text {...cellText}>{renderText(item.via_hub)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "ap_destination_new", item.ap_destination_new || item.ap_destination_id || item.ap_destination) : <Text {...cellText}>{renderText(item.ap_destination_new || item.ap_destination_id || item.ap_destination || "-")}</Text>}
                        </Td>
                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                            {isEditing ? renderEditableCell(item, "destination_new", item.destination_new || item.destination_id || item.destination || item.stock_destination) : <Text {...cellText}>{renderText(item.destination_new || item.destination_id || item.destination || item.stock_destination || "-")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "warehouse_new", item.warehouse_new || item.warehouse_id || item.stock_warehouse) : <Text {...cellText}>{renderText(item.warehouse_new || item.warehouse_id || item.stock_warehouse || "-")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "exp_ready_in_stock", item.exp_ready_in_stock || item.ready_ex_supplier, "date") : <Text {...cellText}>{formatDate(item.exp_ready_in_stock || item.ready_ex_supplier)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "date_on_stock", item.date_on_stock, "date") : <Text {...cellText}>{formatDate(item.date_on_stock)}</Text>}
                        </Td>
                        <Td {...cellProps} textAlign="center">
                            <Text {...cellText}>{renderText(item.days_on_stock)}</Text>
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipped_date", item.shipped_date, "date") : <Text {...cellText}>{formatDate(item.shipped_date)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivered_date", item.delivered_date, "date") : <Text {...cellText}>{formatDate(item.delivered_date)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "dg_un", item.dg_un) : <Text {...cellText}>{renderText(item.dg_un)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_doc", item.shipping_doc, "textarea") : <Text {...cellText}>{renderText(item.shipping_doc)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "export_doc", item.export_doc, "textarea") : <Text {...cellText}>{renderText(item.export_doc)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "export_doc_2", item.export_doc_2, "textarea") : <Text {...cellText}>{renderText(item.export_doc_2)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "remarks", item.remarks, "textarea") : <Text {...cellText}>{renderText(item.remarks)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "item", item.item || item.items || item.item_id || item.stock_items_quantity || "", "number") : <Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity || "-")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "weight_kg", item.weight_kg ?? item.weight_kgs, "number") : <Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "volume_no_dim", item.volume_no_dim || item.volume_dim, "number") : <Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "lwh_text", item.lwh_text, "textarea") : <Text {...cellText}>{renderText(item.lwh_text)}</Text>}
                        </Td>
                        <Td
                            {...cellProps}
                            cursor={!isEditing ? "pointer" : "default"}
                            onClick={!isEditing ? () => {
                                setSelectedDimensions(item.dimensions || []);
                                onDimensionsModalOpen();
                            } : undefined}
                            _hover={!isEditing ? { bg: useColorModeValue("gray.100", "gray.700") } : {}}
                        >
                            {isEditing ? (
                                renderEditableCell(item, "total_volume_cbm", item.total_volume_cbm, "number")
                            ) : (
                                <HStack spacing={2} align="center" justify="flex-start">
                                    <Text {...cellText} color="blue.500" _hover={{ textDecoration: "underline" }}>
                                        {renderText(item.total_volume_cbm)}
                                    </Text>
                                    <Tooltip label="View dimensions" hasArrow>
                                        <Icon as={MdVisibility} color="blue.500" boxSize={4} cursor="pointer" />
                                    </Tooltip>
                                </HStack>
                            )}
                        </Td>
                        <Td
                            {...cellProps}
                            cursor={!isEditing ? "pointer" : "default"}
                            onClick={!isEditing ? () => {
                                setSelectedDimensions(item.dimensions || []);
                                onDimensionsModalOpen();
                            } : undefined}
                            _hover={!isEditing ? { bg: useColorModeValue("gray.100", "gray.700") } : {}}
                        >
                            {isEditing ? (
                                renderEditableCell(item, "total_cw_air_freight", item.total_cw_air_freight, "number")
                            ) : (
                                <HStack spacing={2} align="center" justify="flex-start">
                                    <Text {...cellText} color="blue.500" _hover={{ textDecoration: "underline" }}>
                                        {renderText(item.total_cw_air_freight)}
                                    </Text>
                                    <Tooltip label="View dimensions" hasArrow>
                                        <Icon as={MdVisibility} color="blue.500" boxSize={4} cursor="pointer" />
                                    </Tooltip>
                                </HStack>
                            )}
                        </Td>
                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                            {isEditing ? renderEditableCell(item, "currency_id", item.currency_id || item.currency, "searchable") : <Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "value", item.value, "number") : <Text {...cellText}>{renderText(item.value)}</Text>}
                        </Td>
                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                            {isEditing ? renderEditableCell(item, "client_id", item.client_id || item.client, "searchable") : <Text {...cellText}>{getClientName(item.client_id || item.client)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "internal_remark", item.internal_remark || "", "textarea") : <Text {...cellText}>{renderText(item.internal_remark || "")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                                <VStack spacing={1} align="stretch">
                                    {item.attachments.map((att, idx) => (
                                        <HStack key={idx} spacing={1} align="center">
                                            <Text
                                                fontSize="xs"
                                                isTruncated
                                                flex={1}
                                                title={att.filename || att.name}
                                                cursor="pointer"
                                                color="blue.500"
                                                _hover={{ textDecoration: "underline" }}
                                                onClick={() => handleViewFile(att, item.id || item.stock_item_id)}
                                            >
                                                {att.filename || att.name || `File ${idx + 1}`}
                                            </Text>
                                            <IconButton
                                                icon={<Icon as={MdVisibility} />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="blue"
                                                aria-label="View file"
                                                onClick={() => handleViewFile(att, item.id || item.stock_item_id)}
                                            />
                                            <IconButton
                                                icon={<Icon as={MdDownload} />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="green"
                                                aria-label="Download file"
                                                onClick={() => handleDownloadFile(att, item.id || item.stock_item_id)}
                                            />
                                        </HStack>
                                    ))}
                                </VStack>
                            ) : (
                                <Text fontSize="xs" color="gray.500">No files</Text>
                            )}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? (
                                <HStack spacing="2">
                                    <IconButton
                                        icon={<Icon as={MdCheck} />}
                                        size="sm"
                                        colorScheme="green"
                                        variant="ghost"
                                        aria-label="Save"
                                        onClick={() => handleEditSave(item)}
                                    />
                                    <IconButton
                                        icon={<Icon as={MdCancel} />}
                                        size="sm"
                                        colorScheme="red"
                                        variant="ghost"
                                        aria-label="Cancel"
                                        onClick={() => handleEditCancelRow(item.id)}
                                    />
                                </HStack>
                            ) : (
                                <HStack spacing="2">
                                    <IconButton
                                        icon={<Icon as={MdEdit} />}
                                        size="sm"
                                        colorScheme="blue"
                                        variant="ghost"
                                        aria-label="Edit"
                                        onClick={() => handleEditStart(item)}
                                    />
                                </HStack>
                            )}
                        </Td>
                    </Tr>
                );
            } else if (activeTab === 1) {
                // By Client view columns - match the image exactly
                return (
                    <Tr
                        key={item.id}
                        bg={rowBg}
                        borderBottom="1px"
                        borderColor={tableBorderColor}
                        _hover={{ opacity: 0.9 }}
                    >
                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="8px" width="40px" minW="40px" maxW="40px">
                            <Checkbox
                                isChecked={selectedRows.has(item.id)}
                                onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                size="sm"
                                borderColor="gray.600"
                                sx={{
                                    "& .chakra-checkbox__control": {
                                        borderColor: "gray.600",
                                        _checked: {
                                            borderColor: "blue.500",
                                        },
                                    },
                                }}
                            />
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "stock_item_id", item.stock_item_id || item.stock_id) : <Text {...cellText}>{renderText(item.stock_item_id || item.stock_id)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? (
                                <Select
                                    size="sm"
                                    value={editingRowData.stock_status || item.stock_status || ""}
                                    onChange={(e) => setEditingRowData(prev => ({ ...prev, stock_status: e.target.value }))}
                                    bg={inputBg}
                                    color={inputText}
                                    borderColor={borderColor}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                        <option key={statusKey} value={statusKey}>{config.label}</option>
                                    ))}
                                </Select>
                            ) : (
                                <Badge colorScheme={statusStyle.color} size="sm" borderRadius="full" px="3" py="1">
                                    {getStatusLabel(item.stock_status)}
                                </Badge>
                            )}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "exp_ready_in_stock", item.exp_ready_in_stock, "date") : <Text {...cellText}>{formatDate(item.exp_ready_in_stock)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "date_on_stock", item.date_on_stock, "date") : <Text {...cellText}>{formatDate(item.date_on_stock)}</Text>}
                        </Td>
                        <Td {...cellProps} textAlign="center">
                            <Text {...cellText}>{renderText(item.days_on_stock)}</Text>
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipped_date", item.shipped_date, "date") : <Text {...cellText}>{formatDate(item.shipped_date)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivered_date", item.delivered_date, "date") : <Text {...cellText}>{formatDate(item.delivered_date)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "warehouse_new", item.warehouse_new || item.warehouse_id || item.stock_warehouse) : <Text {...cellText}>{renderText(item.warehouse_new || item.warehouse_id || item.stock_warehouse || "-")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "supplier_id", item.supplier_id, "select", vendors.map(v => ({ value: v.id, label: v.name }))) : <Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing
                                ? renderEditableCell(item, "po_text", item.po_text || item.po_number, "textarea")
                                : renderMultiLineLabels(item.po_text || item.po_number)}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "details", item.details || item.item_desc) : <Text {...cellText}>{renderText(item.details || item.item_desc)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "dg_un", item.dg_un) : <Text {...cellText}>{renderText(item.dg_un)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "item", item.item || item.items || item.item_id || item.stock_items_quantity || "", "number") : <Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity || "-")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "weight_kg", item.weight_kg ?? item.weight_kgs, "number") : <Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "volume_cbm", item.volume_cbm, "number") : <Text {...cellText}>{renderText(item.volume_cbm)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "currency_id", item.currency_id, "select", currencies.map(c => ({ value: c.id, label: c.name }))) : <Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "value", item.value, "number") : <Text {...cellText}>{renderText(item.value)}</Text>}
                        </Td>
                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                            {isEditing ? renderEditableCell(item, "origin_id", item.origin_text || item.origin_id, "text") : <Text {...cellText}>{item.origin_text || getCountryName(item.origin_id) || "-"}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "via_hub", item.via_hub) : <Text {...cellText}>{renderText(item.via_hub)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "via_hub2", item.via_hub2) : <Text {...cellText}>{renderText(item.via_hub2)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "ap_destination_new", item.ap_destination_new || item.ap_destination_id || item.ap_destination) : <Text {...cellText}>{renderText(item.ap_destination_new || item.ap_destination_id || item.ap_destination || "-")}</Text>}
                        </Td>
                        <Td {...cellProps} overflow="visible" position="relative" zIndex={1}>
                            {isEditing ? renderEditableCell(item, "destination_new", item.destination_new || item.destination_id || item.destination || item.stock_destination) : <Text {...cellText}>{renderText(item.destination_new || item.destination_id || item.destination || item.stock_destination || "-")}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_doc", item.shipping_doc) : <Text {...cellText}>{renderText(item.shipping_doc)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "export_doc", item.export_doc) : <Text {...cellText}>{renderText(item.export_doc)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "export_doc_2", item.export_doc_2) : <Text {...cellText}>{renderText(item.export_doc_2)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "remarks", item.remarks) : <Text {...cellText}>{renderText(item.remarks)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "vessel_id", item.vessel_id || item.vessel, "select", vessels.map(v => ({ value: v.id, label: v.name }))) : <Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "so_number_id", item.so_number_id || item.so_number || item.stock_so_number, "so_number") : <Text {...cellText}>{(() => {
                                const soValue = item.so_number_id ? getSoNumberName(item.so_number_id) : renderText(item.so_number || item.stock_so_number);
                                const prefixed = addSOPrefix(soValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_instruction_id", item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction) : <Text {...cellText}>{(() => {
                                const siValue = renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction);
                                const prefixed = addSIPrefix(siValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "si_combined", item.si_combined) : <Text {...cellText}>{(() => {
                                const sicValue = renderText(item.si_combined);
                                const prefixed = addSICombinedPrefix(sicValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivery_instruction_id", item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction) : <Text {...cellText}>{(() => {
                                const diValue = renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction);
                                const prefixed = addDIPrefix(diValue);
                                return prefixed || "-";
                            })()}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                                <VStack spacing={1} align="stretch">
                                    {item.attachments.map((att, idx) => (
                                        <HStack key={idx} spacing={1} align="center">
                                            <Text
                                                fontSize="xs"
                                                isTruncated
                                                flex={1}
                                                title={att.filename || att.name}
                                                cursor="pointer"
                                                color="blue.500"
                                                _hover={{ textDecoration: "underline" }}
                                                onClick={() => handleViewFile(att, item.id || item.stock_item_id)}
                                            >
                                                {att.filename || att.name || `File ${idx + 1}`}
                                            </Text>
                                            <IconButton
                                                icon={<Icon as={MdVisibility} />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="blue"
                                                aria-label="View file"
                                                onClick={() => handleViewFile(att, item.id || item.stock_item_id)}
                                            />
                                            <IconButton
                                                icon={<Icon as={MdDownload} />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="green"
                                                aria-label="Download file"
                                                onClick={() => handleDownloadFile(att, item.id || item.stock_item_id)}
                                            />
                                        </HStack>
                                    ))}
                                </VStack>
                            ) : (
                                <Text fontSize="xs" color="gray.500">No files</Text>
                            )}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? (
                                <HStack spacing="2">
                                    <IconButton
                                        icon={<Icon as={MdCheck} />}
                                        size="sm"
                                        colorScheme="green"
                                        variant="ghost"
                                        aria-label="Save"
                                        onClick={() => handleEditSave(item)}
                                    />
                                    <IconButton
                                        icon={<Icon as={MdCancel} />}
                                        size="sm"
                                        colorScheme="red"
                                        variant="ghost"
                                        aria-label="Cancel"
                                        onClick={() => handleEditCancelRow(item.id)}
                                    />
                                </HStack>
                            ) : (
                                <HStack spacing="2">
                                    <IconButton
                                        icon={<Icon as={MdEdit} />}
                                        size="sm"
                                        colorScheme="blue"
                                        variant="ghost"
                                        aria-label="Edit"
                                        onClick={() => handleEditStart(item)}
                                    />
                                </HStack>
                            )}
                        </Td>
                    </Tr>
                );
            }
        });
    };

    return (
        <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
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
            <Card
                direction="column"
                w="100%"
                px="0px"
                overflowX={{ sm: "scroll", lg: "hidden" }}
            >
                {/* Header */}
                <Flex px="25px" justify="space-between" mt="20px" mb="20px" align="center">
                    <HStack spacing="3">
                        <Text
                            color={textColor}
                            fontSize="22px"
                            fontWeight="700"
                            lineHeight="100%"
                        >
                            Stock List Management
                        </Text>
                        {isRefreshing && (
                            <HStack spacing="2">
                                <Spinner size="sm" color="blue.500" />
                                <Text fontSize="sm" color="blue.500">
                                    Refreshing...
                                </Text>
                            </HStack>
                        )}
                    </HStack>
                    <HStack spacing="3">
                        {activeTab === 0 && (
                            <>
                                <Button
                                    leftIcon={<Icon as={MdFilterList} />}
                                    onClick={() => setShowFilters(!showFilters)}
                                    colorScheme="blue"
                                    variant={showFilters ? "solid" : "outline"}
                                    size="sm"
                                >
                                    {showFilters ? "Hide Filters" : "Filters"}
                                </Button>
                                <Menu>
                                    <MenuButton
                                        as={Button}
                                        size="sm"
                                        leftIcon={<Icon as={MdSort} />}
                                        colorScheme={sortOption !== 'none' ? "blue" : "gray"}
                                        variant={sortOption !== 'none' ? "solid" : "outline"}
                                    >
                                        {sortOption === 'none' ? "Select Sort Option" :
                                            sortOption === 'via_hub' ? "Sort: VIA HUB" :
                                                sortOption === 'via_vessel' ? "Sort: VIA VESSEL" :
                                                    sortOption === 'status' ? "Sort: Stock Status" :
                                                        sortOption === 'via_hub_status' ? "Sort: VIA HUB + Status" :
                                                            "Sort: VIA VESSEL + Status"}
                                    </MenuButton>
                                    <MenuList>
                                        <MenuItem onClick={() => setSortOption('via_hub')}>
                                            Sort by VIA HUB (Alphabetically)
                                        </MenuItem>
                                        <MenuItem onClick={() => setSortOption('via_vessel')}>
                                            Sort by VIA VESSEL (Alphabetically)
                                        </MenuItem>
                                        <MenuItem onClick={() => setSortOption('status')}>
                                            Sort by Stock Status
                                        </MenuItem>
                                        <MenuItem onClick={() => setSortOption('via_hub_status')}>
                                            Sort by VIA HUB + Status
                                        </MenuItem>
                                        <MenuItem onClick={() => setSortOption('via_vessel_status')}>
                                            Sort by VIA VESSEL + Status
                                        </MenuItem>
                                        <MenuItem onClick={() => setSortOption('none')}>
                                            No Sort
                                        </MenuItem>
                                    </MenuList>
                                </Menu>
                            </>
                        )}
                        <IconButton
                            size="sm"
                            icon={<Icon as={MdRefresh} />}
                            variant="ghost"
                            aria-label="Refresh"
                            onClick={() => getStockList()}
                            isLoading={isLoading}
                        />
                    </HStack>
                </Flex>

                {/* Tabs Section - COMMENTED OUT FOR NOW */}
                {false && (
                    <Box px="25px" mb="20px">
                        <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
                            <TabList>
                                <Tab>Stocklist By Vessel</Tab>
                                <Tab>Stocklist By Client</Tab>
                            </TabList>

                            <TabPanels>
                                {/* Tab 1: Stocklist By Vessel */}
                                <TabPanel px="0" pt="20px">
                                    {/* Filters for By Vessel View */}
                                    <Box mb="20px">

                                        {/* Filters Box - Side by Side */}
                                        {(!vesselViewVesselData || !vesselViewClientData) && (
                                            <Box mb="20px" p="4" bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                                                <Flex direction={{ base: "column", md: "row" }} gap="4" align="flex-start">
                                                    {/* Vessel Filter */}
                                                    {!vesselViewVesselData && (
                                                        <Box flex="1" minW="0">
                                                            <Flex justify="space-between" align="center" mb="12px">
                                                                <Text fontSize="sm" fontWeight="600" color={textColor}>
                                                                    Filter by Vessel
                                                                </Text>
                                                            </Flex>
                                                            <SimpleSearchableSelect
                                                                value={vesselViewVessel}
                                                                onChange={(value) => setVesselViewVessel(value)}
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
                                                        </Box>
                                                    )}

                                                    {/* Client Filter */}
                                                    {!vesselViewClientData && (
                                                        <Box flex="1" minW="0">
                                                            <Flex justify="space-between" align="center" mb="12px">
                                                                <Text fontSize="sm" fontWeight="600" color={textColor}>
                                                                    Filter by Client
                                                                </Text>
                                                            </Flex>
                                                            <SimpleSearchableSelect
                                                                value={vesselViewClient}
                                                                onChange={(value) => setVesselViewClient(value)}
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
                                                        </Box>
                                                    )}
                                                </Flex>
                                            </Box>
                                        )}

                                        {/* Orange Bar - Vessel Name and Client Name */}
                                        {(vesselViewVesselData || vesselViewClientData) && (
                                            <Box mb="20px" p="4" bg={useColorModeValue("orange.400", "orange.600")} borderRadius="md">
                                                <VStack spacing="2" align="stretch">
                                                    {vesselViewVesselData && (
                                                        <HStack justify="space-between" align="center">
                                                            <Text fontSize="sm" fontWeight="700" color="white">
                                                                Vessel Name: {vesselViewVesselData.name}
                                                            </Text>
                                                            <Button
                                                                size="xs"
                                                                leftIcon={<Icon as={MdClose} />}
                                                                colorScheme="whiteAlpha"
                                                                variant="solid"
                                                                onClick={() => setVesselViewVessel(null)}
                                                            >
                                                                Clear
                                                            </Button>
                                                        </HStack>
                                                    )}
                                                    {vesselViewClientData && (
                                                        <HStack justify="space-between" align="center">
                                                            <Text fontSize="sm" fontWeight="700" color="white">
                                                                Client Name: {vesselViewClientData.name}
                                                            </Text>
                                                            <Button
                                                                size="xs"
                                                                leftIcon={<Icon as={MdClose} />}
                                                                colorScheme="whiteAlpha"
                                                                variant="solid"
                                                                onClick={() => setVesselViewClient(null)}
                                                            >
                                                                Clear
                                                            </Button>
                                                        </HStack>
                                                    )}
                                                </VStack>
                                            </Box>
                                        )}


                                        {/* Right Side: Status Filter Boxes */}
                                        <Box flex="1" minW="0">
                                            <Box mb="20px" p="4" bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                                                <Text fontSize="sm" fontWeight="700" color={textColor} mb="12px">
                                                    CHECK THE BOX BELOW TO SELECT WHICH ITEMS TO SHOW
                                                </Text>
                                                <Flex flexWrap="wrap" gap="3" pb="2">
                                                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                                        <Box
                                                            key={statusKey}
                                                            p="4"
                                                            minW="130px"
                                                            flex="0 0 auto"
                                                            bg={config.bgColor}
                                                            borderRadius="md"
                                                            border="1px"
                                                            borderColor={borderColor}
                                                        >
                                                            <Text
                                                                fontSize="xs"
                                                                fontWeight="600"
                                                                color={config.textColor}
                                                                mb="8px"
                                                            >
                                                                {config.label}
                                                            </Text>
                                                            <Checkbox
                                                                isChecked={vesselViewStatuses.has(statusKey)}
                                                                onChange={() => handleVesselViewStatusToggle(statusKey)}
                                                                size="md"
                                                                colorScheme={config.color}
                                                                borderColor="gray.600"
                                                                sx={{
                                                                    "& .chakra-checkbox__control": {
                                                                        borderColor: "gray.600",
                                                                        _checked: {
                                                                            borderColor: `${config.color}.500`,
                                                                        },
                                                                    },
                                                                }}
                                                            />
                                                        </Box>
                                                    ))}
                                                </Flex>
                                            </Box>
                                        </Box>
                                    </Box>
                                </TabPanel>

                                {/* Tab 2: Stocklist By Client */}
                                <TabPanel px="0" pt="20px">
                                    {/* Basic Filters Section - Similar to Stock View / Edit */}
                                    <Box px="25px" mb="20px">
                                        <Card bg={cardBg} p="4" border="1px" borderColor={borderColor}>
                                            <VStack spacing="4" align="stretch">
                                                {/* Basic Filters */}
                                                <Box>
                                                    <HStack mb="3" justify="space-between">
                                                        <HStack>
                                                            <Icon as={MdFilterList} color="blue.500" />
                                                            <Text fontSize="md" fontWeight="700" color={textColor}>Basic Filters</Text>
                                                        </HStack>
                                                        <HStack>
                                                            {(clientViewClient || clientViewVesselFilter || clientViewSearchClient || clientViewSearchVessel) && (
                                                                <Button
                                                                    size="xs"
                                                                    leftIcon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setClientViewClient(null);
                                                                        setClientViewVesselFilter(null);
                                                                        setClientViewSearchClient("");
                                                                        setClientViewSearchVessel("");
                                                                    }}
                                                                >
                                                                    Clear All
                                                                </Button>
                                                            )}
                                                        </HStack>
                                                    </HStack>
                                                    <Flex direction={{ base: "column", md: "row" }} gap="3" wrap="wrap">
                                                        {/* Client Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Box flex="1">
                                                                    <SimpleSearchableSelect
                                                                        value={clientViewClient}
                                                                        onChange={(value) => setClientViewClient(value)}
                                                                        options={clients}
                                                                        placeholder="Filter by Client"
                                                                        displayKey="name"
                                                                        valueKey="id"
                                                                        formatOption={(option) => option.name || `Client ${option.id}`}
                                                                        isLoading={false}
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                    />
                                                                </Box>
                                                                {clientViewClient && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setClientViewClient(null)}
                                                                        aria-label="Clear client filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Vessel Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Box flex="1">
                                                                    <SimpleSearchableSelect
                                                                        value={clientViewVesselFilter}
                                                                        onChange={(value) => setClientViewVesselFilter(value)}
                                                                        options={vessels}
                                                                        placeholder="Filter by Vessel"
                                                                        displayKey="name"
                                                                        valueKey="id"
                                                                        formatOption={(option) => option.name || String(option.id ?? "")}
                                                                        isLoading={false}
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                    />
                                                                </Box>
                                                                {clientViewVesselFilter && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setClientViewVesselFilter(null)}
                                                                        aria-label="Clear vessel filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>
                                                    </Flex>
                                                </Box>
                                            </VStack>
                                        </Card>
                                    </Box>

                                    {/* Filters for By Client View */}
                                    <Flex direction={{ base: "column", lg: "row" }} gap="4" mb="20px" align="flex-start">
                                        <Box flex="0 0 auto" minW={{ base: "100%", lg: "400px" }}>
                                            {/* Client Filter - Two Input Fields */}
                                            <Box mb="20px" p="4" bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>

                                                <Flex direction="row" gap="4" align="stretch">
                                                    {/* Client ID Input */}
                                                    <FormControl>
                                                        <Flex justify="space-between" align="center" >
                                                            <FormLabel fontSize="xs" fontWeight="600" color={textColor} mb="8px">
                                                                Filter by Client ID
                                                            </FormLabel>
                                                            {clientViewClient && (
                                                                <Button
                                                                    size="xs"
                                                                    leftIcon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => setClientViewClient(null)}
                                                                >
                                                                    Clear Filter
                                                                </Button>
                                                            )}
                                                        </Flex>
                                                        <SimpleSearchableSelect
                                                            value={clientViewClient}
                                                            onChange={(value) => {
                                                                setClientViewClient(value);
                                                                // Client name will auto-fill via clientViewClientData
                                                            }}
                                                            options={clients}
                                                            placeholder="Select Client ID"
                                                            displayKey="id"
                                                            valueKey="id"
                                                            formatOption={(option) => `${option.id}`}
                                                            isLoading={false}
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            padding="18px"
                                                        />
                                                    </FormControl>

                                                    {/* Client Name Input (Auto-filled, Read-only) */}
                                                    <FormControl>
                                                        <FormLabel fontSize="xs" fontWeight="600" color={textColor} mb="8px">
                                                            Client Name
                                                        </FormLabel>
                                                        <Input
                                                            value={clientViewClientData ? clientViewClientData.name : ""}
                                                            placeholder="Client name will auto-fill when ID is selected"
                                                            isReadOnly
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            _focus={{ borderColor: borderColor }}
                                                        />
                                                    </FormControl>
                                                </Flex>
                                            </Box>

                                            {/* Client and Vessel Text Search Filters */}
                                            <Box mb="20px" p="4" bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                                                <Text fontSize="sm" fontWeight="700" color={textColor} mb="12px">
                                                    SEARCH BY CLIENT OR VESSEL NAME
                                                </Text>
                                                <Flex direction="row" gap="4" align="stretch">
                                                    {/* Client Name Search */}
                                                    <FormControl flex="1">
                                                        <FormLabel fontSize="xs" fontWeight="600" color={textColor} mb="8px">
                                                            Search by Client Name
                                                        </FormLabel>
                                                        <HStack spacing="1">
                                                            <InputGroup size="md">
                                                                <InputLeftElement pointerEvents="none">
                                                                    <Icon as={MdSearch} color="gray.400" />
                                                                </InputLeftElement>
                                                                <Input
                                                                    value={clientViewSearchClient}
                                                                    onChange={(e) => setClientViewSearchClient(e.target.value)}
                                                                    placeholder="Type client name to search..."
                                                                    bg={inputBg}
                                                                    color={inputText}
                                                                    borderColor={borderColor}
                                                                    pl="10"
                                                                />
                                                            </InputGroup>
                                                            {clientViewSearchClient && (
                                                                <IconButton
                                                                    size="sm"
                                                                    icon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => setClientViewSearchClient("")}
                                                                    aria-label="Clear client search"
                                                                />
                                                            )}
                                                        </HStack>
                                                    </FormControl>

                                                    {/* Vessel Name Search */}
                                                    <FormControl flex="1">
                                                        <FormLabel fontSize="xs" fontWeight="600" color={textColor} mb="8px">
                                                            Search by Vessel Name
                                                        </FormLabel>
                                                        <HStack spacing="1">
                                                            <InputGroup size="md">
                                                                <InputLeftElement pointerEvents="none">
                                                                    <Icon as={MdSearch} color="gray.400" />
                                                                </InputLeftElement>
                                                                <Input
                                                                    value={clientViewSearchVessel}
                                                                    onChange={(e) => setClientViewSearchVessel(e.target.value)}
                                                                    placeholder="Type vessel name to search..."
                                                                    bg={inputBg}
                                                                    color={inputText}
                                                                    borderColor={borderColor}
                                                                    pl="10"
                                                                />
                                                            </InputGroup>
                                                            {clientViewSearchVessel && (
                                                                <IconButton
                                                                    size="sm"
                                                                    icon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => setClientViewSearchVessel("")}
                                                                    aria-label="Clear vessel search"
                                                                />
                                                            )}
                                                        </HStack>
                                                    </FormControl>
                                                </Flex>
                                            </Box>
                                        </Box>
                                        {/* Right Side: Status Filter Boxes */}
                                        <Box flex="1" minW="0">
                                            <Box mb="20px" p="4" bg={cardBg} borderRadius="md" border="1px" borderColor={borderColor}>
                                                <Text fontSize="sm" fontWeight="700" color={textColor} mb="12px">
                                                    CHECK THE BOX BELOW TO SELECT WHICH ITEMS TO SHOW
                                                </Text>
                                                <Flex direction="row" flexWrap="wrap" gap="3" pb="2">
                                                    {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                                        <Box
                                                            key={statusKey}
                                                            p="4"
                                                            minW="130px"
                                                            flex="0 0 auto"
                                                            bg={config.bgColor}
                                                            borderRadius="md"
                                                            border="1px"
                                                            borderColor={borderColor}
                                                        >
                                                            <Text
                                                                fontSize="xs"
                                                                fontWeight="600"
                                                                color={config.textColor}
                                                                mb="8px"
                                                            >
                                                                {config.label}
                                                            </Text>
                                                            <Checkbox
                                                                isChecked={clientViewStatuses.has(statusKey)}
                                                                onChange={() => handleClientViewStatusToggle(statusKey)}
                                                                size="md"
                                                                colorScheme={config.color}
                                                                borderColor="gray.600"
                                                                sx={{
                                                                    "& .chakra-checkbox__control": {
                                                                        borderColor: "gray.600",
                                                                        _checked: {
                                                                            borderColor: `${config.color}.500`,
                                                                        },
                                                                    },
                                                                }}
                                                            />
                                                        </Box>
                                                    ))}
                                                </Flex>
                                                {/* Sorting Order Text */}
                                                <Text fontSize="xs" color={textColor} mt="12px" opacity={0.7}>
                                                    Sorting order: AP Dest &gt; Via Hub &gt; Stock Status &gt; Date on Stock
                                                </Text>
                                            </Box>
                                        </Box>
                                    </Flex>
                                </TabPanel>

                            </TabPanels>
                        </Tabs>
                    </Box>
                )}

                {/* Tabs for Stock View and Client View */}
                <Box px="25px" mb="20px">
                    <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
                        <Flex justify="space-between" align="center" mb="4">
                            <TabList flex="1">
                                <Tab>Stock View / Edit</Tab>
                                <Tab>Stocklist view for clients</Tab>
                            </TabList>
                            {activeTab === 1 && (
                                <HStack spacing="3" ml="4">
                                    <Button
                                        size="md"
                                        leftIcon={<Icon as={MdViewModule} />}
                                        colorScheme={clientViewFilterType === 'filter1' ? 'blue' : 'gray'}
                                        variant={clientViewFilterType === 'filter1' ? 'solid' : 'outline'}
                                        onClick={() => setClientViewFilterType('filter1')}
                                        fontWeight="600"
                                        _hover={{
                                            transform: 'translateY(-2px)',
                                            boxShadow: 'md'
                                        }}
                                        transition="all 0.2s"
                                    >
                                        Filter 1
                                    </Button>
                                    <Button
                                        size="md"
                                        leftIcon={<Icon as={MdViewList} />}
                                        colorScheme={clientViewFilterType === 'filter2' ? 'blue' : 'gray'}
                                        variant={clientViewFilterType === 'filter2' ? 'solid' : 'outline'}
                                        onClick={() => setClientViewFilterType('filter2')}
                                        fontWeight="600"
                                        _hover={{
                                            transform: 'translateY(-2px)',
                                            boxShadow: 'md'
                                        }}
                                        transition="all 0.2s"
                                    >
                                        Filter 2
                                    </Button>
                                    {clientViewSelectedRows.size > 0 && (
                                        <Button
                                            size="md"
                                            leftIcon={<Icon as={MdContentCopy} />}
                                            colorScheme="green"
                                            variant="solid"
                                            onClick={handleCopySelectedRows}
                                            fontWeight="600"
                                            _hover={{
                                                transform: 'translateY(-2px)',
                                                boxShadow: 'md'
                                            }}
                                            transition="all 0.2s"
                                        >
                                            Copy Selected ({clientViewSelectedRows.size})
                                        </Button>
                                    )}
                                </HStack>
                            )}
                        </Flex>

                        <TabPanels>
                            {/* Tab 1: Stock View / Edit */}
                            <TabPanel px="0" pt="20px">
                                {/* Basic Filters Section */}
                                <Collapse in={showFilters} animateOpacity>
                                    <Box px="25px" mb="20px">
                                        <Card bg={cardBg} p="4" border="1px" borderColor={borderColor}>
                                            <VStack spacing="4" align="stretch">
                                                {/* Basic Filters */}
                                                <Box>
                                                    <HStack mb="3" justify="space-between">
                                                        <HStack>
                                                            <Icon as={MdFilterList} color="blue.500" />
                                                            <Text fontSize="md" fontWeight="700" color={textColor}>Basic Filters</Text>
                                                        </HStack>
                                                        <HStack>
                                                            {(stockViewStockItemId || stockViewClient || stockViewVessel || stockViewStatus || stockViewDateOnStock || stockViewDaysOnStock || stockViewHub || stockViewFilterSO || stockViewFilterSI || stockViewFilterSICombined || stockViewFilterDI || stockViewSearchFilter) && (
                                                                <Button
                                                                    size="xs"
                                                                    leftIcon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setStockViewStockItemId("");
                                                                        setStockViewClient(null);
                                                                        setStockViewVessel(null);
                                                                        setStockViewStatus("");
                                                                        setStockViewDateOnStock("");
                                                                        setStockViewDaysOnStock("");
                                                                        setStockViewHub(null);
                                                                        setStockViewFilterSO("");
                                                                        setStockViewFilterSI("");
                                                                        setStockViewFilterSICombined("");
                                                                        setStockViewFilterDI("");
                                                                        setStockViewSearchFilter("");
                                                                    }}
                                                                >
                                                                    Clear All
                                                                </Button>
                                                            )}
                                                        </HStack>
                                                    </HStack>
                                                    <Flex direction={{ base: "column", md: "row" }} gap="3" wrap="wrap">
                                                        {/* Stock Item ID Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        value={stockViewStockItemId}
                                                                        onChange={(e) => setStockViewStockItemId(e.target.value)}
                                                                        placeholder="Filter by Stock Item ID"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewStockItemId && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewStockItemId("")}
                                                                        aria-label="Clear stock item ID filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Client Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Box flex="1">
                                                                    <SimpleSearchableSelect
                                                                        value={stockViewClient}
                                                                        onChange={(value) => setStockViewClient(value)}
                                                                        options={clients}
                                                                        placeholder="Filter by Client"
                                                                        displayKey="name"
                                                                        valueKey="id"
                                                                        formatOption={(option) => option.name || `Client ${option.id}`}
                                                                        isLoading={false}
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                    />
                                                                </Box>
                                                                {stockViewClient && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewClient(null)}
                                                                        aria-label="Clear client filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Vessel Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Box flex="1">
                                                                    <SimpleSearchableSelect
                                                                        value={stockViewVessel}
                                                                        onChange={(value) => setStockViewVessel(value)}
                                                                        options={vessels}
                                                                        placeholder="Filter by Vessel"
                                                                        displayKey="name"
                                                                        valueKey="id"
                                                                        formatOption={(option) => option.name || String(option.id ?? "")}
                                                                        isLoading={false}
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                    />
                                                                </Box>
                                                                {stockViewVessel && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewVessel(null)}
                                                                        aria-label="Clear vessel filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Status Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Box flex="1">
                                                                    <Select
                                                                        value={stockViewStatus}
                                                                        onChange={(e) => setStockViewStatus(e.target.value)}
                                                                        placeholder="Filter by Status"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                    >
                                                                        <option value="">All Statuses</option>
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
                                                                </Box>
                                                                {stockViewStatus && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewStatus("")}
                                                                        aria-label="Clear status filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Date on Stock Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Input
                                                                    type="date"
                                                                    value={stockViewDateOnStock}
                                                                    onChange={(e) => setStockViewDateOnStock(e.target.value)}
                                                                    bg={inputBg}
                                                                    color={inputText}
                                                                    borderColor={borderColor}
                                                                    size="sm"
                                                                />
                                                                {stockViewDateOnStock && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewDateOnStock("")}
                                                                        aria-label="Clear date filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Days on Stock Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        type="number"
                                                                        value={stockViewDaysOnStock}
                                                                        onChange={(e) => setStockViewDaysOnStock(e.target.value)}
                                                                        placeholder="Filter by Days on Stock"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewDaysOnStock && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewDaysOnStock("")}
                                                                        aria-label="Clear days filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                    </Flex>
                                                </Box>

                                                {/* Reference Number Filters */}
                                                <Box>
                                                    <Flex direction={{ base: "column", md: "row" }} gap="3" wrap="wrap">
                                                        {/* SO Number Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        value={stockViewFilterSO}
                                                                        onChange={(e) => setStockViewFilterSO(e.target.value)}
                                                                        placeholder="Filter by SO Number"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewFilterSO && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewFilterSO("")}
                                                                        aria-label="Clear SO filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* SI Number Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        value={stockViewFilterSI}
                                                                        onChange={(e) => setStockViewFilterSI(e.target.value)}
                                                                        placeholder="Filter by SI Number"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewFilterSI && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewFilterSI("")}
                                                                        aria-label="Clear SI filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* SI Combined Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        value={stockViewFilterSICombined}
                                                                        onChange={(e) => setStockViewFilterSICombined(e.target.value)}
                                                                        placeholder="Filter by SI Combined"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewFilterSICombined && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewFilterSICombined("")}
                                                                        aria-label="Clear SI Combined filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* DI Number Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        value={stockViewFilterDI}
                                                                        onChange={(e) => setStockViewFilterDI(e.target.value)}
                                                                        placeholder="Filter by DI Number"
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewFilterDI && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewFilterDI("")}
                                                                        aria-label="Clear DI filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>

                                                        {/* Hub Filter */}
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <Box flex="1">
                                                                    <SimpleSearchableSelect
                                                                        value={stockViewHub}
                                                                        onChange={(value) => setStockViewHub(value)}
                                                                        options={hubOptions}
                                                                        placeholder="Filter by Hub"
                                                                        displayKey="name"
                                                                        valueKey="id"
                                                                        formatOption={(option) => option.name || option.id}
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                    />
                                                                </Box>
                                                                {stockViewHub && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewHub(null)}
                                                                        aria-label="Clear hub filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>
                                                        <Box w="220px">
                                                            <HStack spacing="1">
                                                                <InputGroup size="sm">
                                                                    <Input
                                                                        value={stockViewSearchFilter}
                                                                        onChange={(e) => setStockViewSearchFilter(e.target.value)}
                                                                        placeholder="Search all fields..."
                                                                        bg={inputBg}
                                                                        color={inputText}
                                                                        borderColor={borderColor}
                                                                        pl="8"
                                                                    />
                                                                </InputGroup>
                                                                {stockViewSearchFilter && (
                                                                    <IconButton
                                                                        size="sm"
                                                                        icon={<Icon as={MdClose} />}
                                                                        colorScheme="red"
                                                                        variant="ghost"
                                                                        onClick={() => setStockViewSearchFilter("")}
                                                                        aria-label="Clear search filter"
                                                                    />
                                                                )}
                                                            </HStack>
                                                        </Box>
                                                    </Flex>
                                                </Box>

                                                {/* Sorting Info Box */}
                                                {sortOption !== 'none' && (
                                                    <Box mt="2" p="3" bg={useColorModeValue("blue.50", "blue.900")} borderRadius="md" border="1px" borderColor={useColorModeValue("blue.200", "blue.700")}>
                                                        <Text fontSize="xs" color={textColor} fontWeight="600" mb="1">Sorting Order:</Text>
                                                        <Text fontSize="xs" color={textColor} opacity={0.8}>
                                                            {sortOption === 'via_hub' && (
                                                                <>VIA HUB (alphabetically) - VIA HUB 2 overwrites VIA HUB 1 if exists</>
                                                            )}
                                                            {sortOption === 'via_vessel' && (
                                                                <>VIA VESSEL (alphabetically by vessel name)</>
                                                            )}
                                                            {sortOption === 'status' && (
                                                                <>Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction</>
                                                            )}
                                                            {sortOption === 'via_hub_status' && (
                                                                <>
                                                                    1st: VIA HUB (alphabetically) - VIA HUB 2 overwrites VIA HUB 1 if exists<br />
                                                                    2nd: Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction
                                                                </>
                                                            )}
                                                            {sortOption === 'via_vessel_status' && (
                                                                <>
                                                                    1st: VIA VESSEL (alphabetically by vessel name)<br />
                                                                    2nd: Stock Status - Pending → Stock → In Transit → Arrived Destination → On a Shipping Instruction → On a Delivery Instruction
                                                                </>
                                                            )}
                                                        </Text>
                                                    </Box>
                                                )}

                                                {/* Results Count */}
                                                <Text fontSize="sm" color={tableTextColorSecondary}>
                                                    {allFilteredItems.length} of {stockList.length} stock items
                                                    {(stockViewClient || stockViewVessel || stockViewStatus || stockViewStockItemId || stockViewDateOnStock || stockViewDaysOnStock || stockViewHub || stockViewFilterSO || stockViewFilterSI || stockViewFilterSICombined || stockViewFilterDI || stockViewSearchFilter || vesselViewStatuses.size > 0 || isViewingSelected) && " (filtered)"}
                                                </Text>
                                            </VStack>
                                        </Card>
                                    </Box>
                                </Collapse>

                                {/* Status Filter Checkboxes Section */}
                                <Card bg={cardBg} p="4" border="1px" borderColor={borderColor} mb="20px">
                                    <Text fontSize="sm" fontWeight="700" color={textColor} mb="12px">
                                        CHECK THE BOX BELOW TO SELECT WHICH ITEMS TO SHOW
                                    </Text>
                                    <Flex flexWrap="wrap" gap="3" pb="2">
                                        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                            <Box
                                                key={statusKey}
                                                p="4"
                                                minW="130px"
                                                flex="0 0 auto"
                                                bg={config.bgColor}
                                                borderRadius="md"
                                                border="1px"
                                                borderColor={borderColor}
                                            >
                                                <Text
                                                    fontSize="xs"
                                                    fontWeight="600"
                                                    color={config.textColor}
                                                    mb="8px"
                                                >
                                                    {config.label}
                                                </Text>
                                                <Checkbox
                                                    isChecked={vesselViewStatuses.has(statusKey)}
                                                    onChange={() => handleVesselViewStatusToggle(statusKey)}
                                                    size="md"
                                                    colorScheme={config.color}
                                                    borderColor="gray.600"
                                                    sx={{
                                                        "& .chakra-checkbox__control": {
                                                            borderColor: "gray.600",
                                                            _checked: {
                                                                borderColor: `${config.color}.500`,
                                                            },
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Flex>
                                </Card>

                                {/* Select All and Bulk Action Buttons */}
                                <Flex px="25px" mb="20px" align="center" gap="3" flexWrap="wrap">
                                    {allFilteredItems.length > 0 && (
                                        <Button
                                            leftIcon={<Icon as={allPageItemsSelected ? MdCheckBox : MdCheckBoxOutlineBlank} />}
                                            colorScheme="blue"
                                            size="sm"
                                            variant={allPageItemsSelected ? "solid" : "outline"}
                                            onClick={() => handleSelectAll(!allPageItemsSelected)}
                                        >
                                            {allPageItemsSelected ? "Deselect Page" : `Select Page (${displayedItems.length})`}
                                        </Button>
                                    )}
                                    {selectedRows.size > 0 && (
                                        <>
                                            <Text fontSize="sm" color={textColor} fontWeight="600">
                                                {selectedRows.size} item(s) selected
                                            </Text>
                                            <Button
                                                leftIcon={<Icon as={MdVisibility} />}
                                                colorScheme={isViewingSelected ? "blue" : "green"}
                                                size="sm"
                                                onClick={handleBulkView}
                                            >
                                                {isViewingSelected ? "Show All" : "View Selected"}
                                            </Button>
                                            <Button
                                                leftIcon={<Icon as={MdEdit} />}
                                                colorScheme="blue"
                                                size="sm"
                                                onClick={handleNavigateToEdit}
                                            >
                                                Edit Selected
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setSelectedRows(new Set());
                                                    setIsViewingSelected(false);
                                                }}
                                            >
                                                Clear Selection
                                            </Button>
                                        </>
                                    )}
                                </Flex>

                                {/* Table with fields in exact order from image */}
                                <Box overflowX="auto" position="relative" minH="400px">
                                    {isLoading && (
                                        <Box
                                            position="fixed"
                                            top="50%"
                                            left="50%"
                                            transform="translate(-50%, -50%)"
                                            zIndex={1000}
                                            bg={useColorModeValue("white", "gray.800")}
                                            p={6}
                                            borderRadius="md"
                                            boxShadow="lg"
                                        >
                                            <VStack spacing="4">
                                                <Spinner size="xl" color="#1c4a95" />
                                                <Text color={tableTextColorSecondary}>Loading stock list...</Text>
                                            </VStack>
                                        </Box>
                                    )}
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
                                                <Text color={tableTextColorSecondary}>Loading...</Text>
                                            </VStack>
                                        </Box>
                                    )}
                                    <Table size="sm" minW="6000px">
                                        {!isLoading && (
                                            <Thead bg={tableHeaderBg}>
                                                <Tr>
                                                    <Th
                                                        borderRight="1px"
                                                        borderColor={tableBorderColor}
                                                        py="12px"
                                                        px="8px"
                                                        fontSize="12px"
                                                        fontWeight="600"
                                                        textTransform="uppercase"
                                                        width="40px"
                                                        minW="40px"
                                                        maxW="40px"
                                                        color={tableTextColor}
                                                    >
                                                        <Checkbox
                                                            isChecked={allItemsSelected}
                                                            isIndeterminate={someItemsSelected && !allItemsSelected}
                                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                                            size="sm"
                                                            borderColor="gray.600"
                                                            colorScheme="blue"
                                                            sx={{
                                                                "& .chakra-checkbox__control": {
                                                                    borderColor: "gray.600",
                                                                    _checked: {
                                                                        borderColor: "blue.500",
                                                                        bg: "blue.500",
                                                                    },
                                                                },
                                                            }}
                                                        />
                                                    </Th>
                                                    <Th {...headerProps}>VESSEL</Th>
                                                    <Th {...headerProps}>STOCKITEMID</Th>
                                                    <Th {...headerProps}>SUPPLIER</Th>
                                                    <Th {...headerProps}>PO NUMBER</Th>
                                                    <Th {...headerProps}>SO NUMBER</Th>
                                                    <Th {...headerProps}>SI NUMBER</Th>
                                                    <Th {...headerProps}>SI COMBINED</Th>
                                                    <Th {...headerProps}>DI NUMBER</Th>
                                                    <Th {...headerProps}>STOCK STATUS</Th>
                                                    <Th {...headerProps}>ORIGIN</Th>
                                                    <Th {...headerProps}>VIA HUB 1</Th>
                                                    <Th {...headerProps}>VIA HUB 2</Th>
                                                    <Th {...headerProps}>AP DESTINATION</Th>
                                                    <Th {...headerProps}>DESTINATION</Th>
                                                    <Th {...headerProps}>WAREHOUSE ID</Th>
                                                    <Th {...headerProps}>EXP READY FROM SUPPLIER</Th>
                                                    <Th {...headerProps}>DATE ON STOCK</Th>
                                                    <Th {...headerProps} textAlign="center">DAYS ON STOCK</Th>
                                                    <Th {...headerProps}>SHIPPED DATE</Th>
                                                    <Th {...headerProps}>DELIVERED DATE</Th>
                                                    <Th {...headerProps}>DG/UN NUMBER</Th>
                                                    <Th {...headerProps}>SHIPPING DOCS</Th>
                                                    <Th {...headerProps}>EXPORT DOC 1</Th>
                                                    <Th {...headerProps}>EXPORT DOC 2</Th>
                                                    <Th {...headerProps}>REMARKS</Th>
                                                    <Th {...headerProps}>BOXES</Th>
                                                    <Th {...headerProps}>WEIGHT KGS</Th>
                                                    <Th {...headerProps}>VOLUME NO DIM</Th>
                                                    <Th {...headerProps}>LWH TEXT</Th>
                                                    <Th {...headerProps}>TOTAL VOLUME CBM</Th>
                                                    <Th {...headerProps}>TOTAL CW AIR FREIGHT</Th>
                                                    <Th {...headerProps}>CURRENCY</Th>
                                                    <Th {...headerProps}>VALUE</Th>
                                                    <Th {...headerProps}>CLIENT</Th>
                                                    <Th {...headerProps}>INTERNAL REMARKS</Th>
                                                    <Th {...headerProps}>FILES</Th>
                                                    <Th {...headerProps}>ACTIONS</Th>
                                                </Tr>
                                            </Thead>
                                        )}
                                        <Tbody>
                                            {isLoading ? (
                                                <Tr>
                                                    <Td colSpan={21} textAlign="center" py="40px">
                                                        <Box visibility="hidden" h="100px">
                                                            {/* Placeholder to maintain table structure */}
                                                        </Box>
                                                    </Td>
                                                </Tr>
                                            ) : getFilteredStockByStatus().length === 0 ? (
                                                <Tr>
                                                    <Td colSpan={21} textAlign="center" py="40px">
                                                        <Text color={tableTextColorSecondary}>
                                                            {stockList.length === 0
                                                                ? "No stock items available."
                                                                : "No stock items match your filter criteria."}
                                                        </Text>
                                                    </Td>
                                                </Tr>
                                            ) : (
                                                displayedItems.map((item, index) => {
                                                    const statusStyle = getStatusStyle(item.stock_status);
                                                    const rowBg = statusStyle.bgColor || statusStyle.lightBg || tableRowBg;
                                                    return (
                                                        <Tr key={item.id} bg={rowBg}>
                                                            <Td
                                                                borderRight="1px"
                                                                borderColor={tableBorderColor}
                                                                py="12px"
                                                                px="8px"
                                                                width="40px"
                                                                minW="40px"
                                                                maxW="40px"
                                                            >
                                                                <Checkbox
                                                                    isChecked={selectedRows.has(item.id)}
                                                                    onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                                                    size="sm"
                                                                    borderColor="gray.600"
                                                                    sx={{
                                                                        "& .chakra-checkbox__control": {
                                                                            borderColor: "gray.600",
                                                                            _checked: {
                                                                                borderColor: "blue.500",
                                                                                bg: "blue.500",
                                                                            },
                                                                        },
                                                                    }}
                                                                />
                                                            </Td>
                                                            <Td {...cellProps}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.stock_item_id)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                                            <Td {...cellProps}>{renderMultiLineLabels(item.po_text || item.po_number)}</Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : renderText(item.so_number))}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{(() => {
                                                                const siValue = renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction);
                                                                const prefixed = addSIPrefix(siValue);
                                                                return prefixed || "-";
                                                            })()}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{(() => {
                                                                const sicValue = renderText(item.si_combined || item.shipping_instruction_id || item.stock_shipping_instruction);
                                                                const prefixed = addSICombinedPrefix(sicValue);
                                                                return prefixed || "-";
                                                            })()}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{(() => {
                                                                const diValue = renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction);
                                                                const prefixed = addDIPrefix(diValue);
                                                                return prefixed || "-";
                                                            })()}</Text></Td>
                                                            <Td {...cellProps}>
                                                                <Badge
                                                                    colorScheme={statusStyle.color}
                                                                    size="sm"
                                                                    borderRadius="full"
                                                                    px="3"
                                                                    py="1"
                                                                    bg={statusStyle.bgColor}
                                                                    color={statusStyle.textColor}
                                                                >
                                                                    {getStatusLabel(item.stock_status)}
                                                                </Badge>
                                                            </Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.origin_text || item.origin || getCountryName(item.origin_id) || "-"}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub2)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.ap_destination_new || item.ap_destination_id || item.ap_destination || "-"}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.destination_new || item.destination_id || item.destination || item.stock_destination || "-"}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.warehouse_new || item.warehouse_id || item.stock_warehouse || "-"}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.exp_ready_in_stock)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.date_on_stock)}</Text></Td>
                                                            <Td {...cellProps} textAlign="center"><Text {...cellText}>{renderText(item.days_on_stock)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.dg_un)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc_2)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.lwh_text)}</Text></Td>
                                                            <Td
                                                                {...cellProps}
                                                                cursor="pointer"
                                                                onClick={() => {
                                                                    setSelectedDimensions(item.dimensions || []);
                                                                    onDimensionsModalOpen();
                                                                }}
                                                                _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
                                                            >
                                                                <HStack spacing={2} align="center" justify="flex-start">
                                                                    <Text {...cellText} color="blue.500" _hover={{ textDecoration: "underline" }}>
                                                                        {renderText(item.total_volume_cbm)}
                                                                    </Text>
                                                                    <Tooltip label="View dimensions" hasArrow>
                                                                        <Icon as={MdVisibility} color="blue.500" boxSize={4} cursor="pointer" />
                                                                    </Tooltip>
                                                                </HStack>
                                                            </Td>
                                                            <Td
                                                                {...cellProps}
                                                                cursor="pointer"
                                                                onClick={() => {
                                                                    setSelectedDimensions(item.dimensions || []);
                                                                    onDimensionsModalOpen();
                                                                }}
                                                                _hover={{ bg: useColorModeValue("gray.100", "gray.700") }}
                                                            >
                                                                <HStack spacing={2} align="center" justify="flex-start">
                                                                    <Text {...cellText} color="blue.500" _hover={{ textDecoration: "underline" }}>
                                                                        {renderText(item.total_cw_air_freight)}
                                                                    </Text>
                                                                    <Tooltip label="View dimensions" hasArrow>
                                                                        <Icon as={MdVisibility} color="blue.500" boxSize={4} cursor="pointer" />
                                                                    </Tooltip>
                                                                </HStack>
                                                            </Td>
                                                            <Td {...cellProps}><Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                                            <Td {...cellProps}><Text {...cellText}>{renderText(item.internal_remark || "")}</Text></Td>
                                                            <Td {...cellProps}>
                                                                {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 ? (
                                                                    <VStack spacing={1} align="stretch">
                                                                        {item.attachments.map((att, idx) => (
                                                                            <HStack key={idx} spacing={1} align="center">
                                                                                <Text
                                                                                    fontSize="xs"
                                                                                    isTruncated
                                                                                    flex={1}
                                                                                    title={att.filename || att.name}
                                                                                    cursor="pointer"
                                                                                    color="blue.500"
                                                                                    _hover={{ textDecoration: "underline" }}
                                                                                    onClick={() => handleViewFile(att)}
                                                                                >
                                                                                    {att.filename || att.name || `File ${idx + 1}`}
                                                                                </Text>
                                                                                <IconButton
                                                                                    icon={<Icon as={MdVisibility} />}
                                                                                    size="xs"
                                                                                    variant="ghost"
                                                                                    colorScheme="blue"
                                                                                    aria-label="View file"
                                                                                    onClick={() => handleViewFile(att, item.id || item.stock_item_id)}
                                                                                />
                                                                                <IconButton
                                                                                    icon={<Icon as={MdDownload} />}
                                                                                    size="xs"
                                                                                    variant="ghost"
                                                                                    colorScheme="green"
                                                                                    aria-label="Download file"
                                                                                    onClick={() => handleDownloadFile(att, item.id || item.stock_item_id)}
                                                                                />
                                                                            </HStack>
                                                                        ))}
                                                                    </VStack>
                                                                ) : (
                                                                    <Text fontSize="xs" color="gray.500">No files</Text>
                                                                )}
                                                            </Td>
                                                            <Td {...cellProps}>
                                                                <IconButton
                                                                    icon={<Icon as={MdEdit} />}
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    colorScheme="blue"
                                                                    onClick={() => handleEditItem(item)}
                                                                    aria-label="Edit"
                                                                />
                                                            </Td>
                                                        </Tr>
                                                    );
                                                })
                                            )}
                                        </Tbody>
                                    </Table>
                                </Box>

                                {/* Pagination Controls for Stock View / Edit */}
                                {allFilteredItems.length > 0 && (() => {
                                    const totalRows = allFilteredItems.length;
                                    const totalPages = Math.ceil(totalRows / stockViewPageSize);
                                    const hasNext = stockViewPage < totalPages;
                                    const hasPrevious = stockViewPage > 1;
                                    const startRow = (stockViewPage - 1) * stockViewPageSize + 1;
                                    const endRow = Math.min(stockViewPage * stockViewPageSize, totalRows);

                                    return (
                                        <Box px="25px" py={4}>
                                            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                                                {/* Page Size Selector and Info */}
                                                <HStack spacing={3}>
                                                    <Text fontSize="sm" color={textColor}>
                                                        Show
                                                    </Text>
                                                    <Select
                                                        size="sm"
                                                        w="80px"
                                                        value={stockViewPageSize}
                                                        onChange={(e) => {
                                                            setStockViewPageSize(Number(e.target.value));
                                                            setStockViewPage(1); // Reset to first page when changing page size
                                                        }}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                        <option value={100}>100</option>
                                                        <option value={200}>200</option>
                                                    </Select>
                                                    <Text fontSize="sm" color={textColor}>
                                                        per page
                                                    </Text>
                                                    <Text fontSize="sm" color={textColor} ml={2}>
                                                        Showing {startRow}-{endRow} of {totalRows} items
                                                    </Text>
                                                </HStack>

                                                {/* Pagination buttons */}
                                                <HStack spacing={2}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setStockViewPage(1)}
                                                        isDisabled={!hasPrevious || stockViewPage === 1}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        First
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setStockViewPage(stockViewPage - 1)}
                                                        isDisabled={!hasPrevious}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        Previous
                                                    </Button>

                                                    {/* Page numbers */}
                                                    <HStack spacing={1}>
                                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                            let pageNum;
                                                            if (totalPages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (stockViewPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (stockViewPage >= totalPages - 2) {
                                                                pageNum = totalPages - 4 + i;
                                                            } else {
                                                                pageNum = stockViewPage - 2 + i;
                                                            }

                                                            return (
                                                                <Button
                                                                    key={pageNum}
                                                                    size="sm"
                                                                    variant={stockViewPage === pageNum ? "solid" : "outline"}
                                                                    colorScheme={stockViewPage === pageNum ? "blue" : "gray"}
                                                                    onClick={() => setStockViewPage(pageNum)}
                                                                    bg={stockViewPage === pageNum ? undefined : inputBg}
                                                                    color={stockViewPage === pageNum ? undefined : inputText}
                                                                    borderColor={borderColor}
                                                                >
                                                                    {pageNum}
                                                                </Button>
                                                            );
                                                        })}
                                                    </HStack>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setStockViewPage(stockViewPage + 1)}
                                                        isDisabled={!hasNext}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        Next
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setStockViewPage(totalPages)}
                                                        isDisabled={!hasNext || stockViewPage === totalPages}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        Last
                                                    </Button>
                                                </HStack>
                                            </Flex>
                                        </Box>
                                    );
                                })()}
                            </TabPanel>

                            {/* Tab 2: Stocklist view for clients */}
                            <TabPanel px="0" pt="20px">
                                {/* Basic Filters Section - Similar to Stock View / Edit */}
                                <Box px="25px" mb="20px">
                                    <Card bg={cardBg} p="4" border="1px" borderColor={borderColor}>
                                        <VStack spacing="4" align="stretch">
                                            {/* Basic Filters */}
                                            <Box>
                                                <HStack mb="3" justify="space-between">
                                                    <HStack>
                                                        <Icon as={MdFilterList} color="blue.500" />
                                                        <Text fontSize="md" fontWeight="700" color={textColor}>Basic Filters</Text>
                                                    </HStack>
                                                    <HStack>
                                                        {(clientViewClient || clientViewVesselFilter || clientViewSearchClient || clientViewSearchVessel) && (
                                                            <Button
                                                                size="xs"
                                                                leftIcon={<Icon as={MdClose} />}
                                                                colorScheme="red"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setClientViewClient(null);
                                                                    setClientViewVesselFilter(null);
                                                                    setClientViewSearchClient("");
                                                                    setClientViewSearchVessel("");
                                                                }}
                                                            >
                                                                Clear All
                                                            </Button>
                                                        )}
                                                    </HStack>
                                                </HStack>
                                                <Flex direction={{ base: "column", md: "row" }} gap="3" wrap="wrap">
                                                    {/* Client Filter */}
                                                    <Box w="220px">
                                                        <HStack spacing="1">
                                                            <Box flex="1">
                                                                <SimpleSearchableSelect
                                                                    value={clientViewClient}
                                                                    onChange={(value) => setClientViewClient(value)}
                                                                    options={clients}
                                                                    placeholder="Filter by Client"
                                                                    displayKey="name"
                                                                    valueKey="id"
                                                                    formatOption={(option) => option.name || `Client ${option.id}`}
                                                                    isLoading={false}
                                                                    bg={inputBg}
                                                                    color={inputText}
                                                                    borderColor={borderColor}
                                                                />
                                                            </Box>
                                                            {clientViewClient && (
                                                                <IconButton
                                                                    size="sm"
                                                                    icon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => setClientViewClient(null)}
                                                                    aria-label="Clear client filter"
                                                                />
                                                            )}
                                                        </HStack>
                                                    </Box>

                                                    {/* Vessel Filter */}
                                                    <Box w="220px">
                                                        <HStack spacing="1">
                                                            <Box flex="1">
                                                                <SimpleSearchableSelect
                                                                    value={clientViewVesselFilter}
                                                                    onChange={(value) => setClientViewVesselFilter(value)}
                                                                    options={vessels}
                                                                    placeholder="Filter by Vessel"
                                                                    displayKey="name"
                                                                    valueKey="id"
                                                                    formatOption={(option) => option.name || String(option.id ?? "")}
                                                                    isLoading={false}
                                                                    bg={inputBg}
                                                                    color={inputText}
                                                                    borderColor={borderColor}
                                                                />
                                                            </Box>
                                                            {clientViewVesselFilter && (
                                                                <IconButton
                                                                    size="sm"
                                                                    icon={<Icon as={MdClose} />}
                                                                    colorScheme="red"
                                                                    variant="ghost"
                                                                    onClick={() => setClientViewVesselFilter(null)}
                                                                    aria-label="Clear vessel filter"
                                                                />
                                                            )}
                                                        </HStack>
                                                    </Box>
                                                </Flex>
                                            </Box>
                                        </VStack>
                                    </Card>
                                </Box>

                                {/* Status Filter Checkboxes Section for Client View */}
                                <Card bg={cardBg} p="4" border="1px" borderColor={borderColor} mb="20px">
                                    <Text fontSize="sm" fontWeight="700" color={textColor} mb="12px">
                                        CHECK THE BOX BELOW TO SELECT WHICH ITEMS TO SHOW
                                    </Text>
                                    <Flex flexWrap="wrap" gap="3" pb="2">
                                        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                                            <Box
                                                key={statusKey}
                                                p="4"
                                                minW="130px"
                                                flex="0 0 auto"
                                                bg={config.bgColor}
                                                borderRadius="md"
                                                border="1px"
                                                borderColor={borderColor}
                                            >
                                                <Text
                                                    fontSize="xs"
                                                    fontWeight="600"
                                                    color={config.textColor}
                                                    mb="8px"
                                                >
                                                    {config.label}
                                                </Text>
                                                <Checkbox
                                                    isChecked={clientViewStatuses.has(statusKey)}
                                                    onChange={() => handleClientViewStatusToggle(statusKey)}
                                                    size="md"
                                                    colorScheme={config.color}
                                                    borderColor="gray.600"
                                                    sx={{
                                                        "& .chakra-checkbox__control": {
                                                            borderColor: "gray.600",
                                                            _checked: {
                                                                borderColor: `${config.color}.500`,
                                                            },
                                                        },
                                                    }}
                                                />
                                            </Box>
                                        ))}
                                    </Flex>
                                </Card>

                                {/* Selection Controls */}
                                <Box px="25px" mb="4">
                                    <Flex justify="space-between" align="center">
                                        <HStack spacing={3}>
                                            <Button
                                                size="sm"
                                                leftIcon={<Icon as={MdCheckBox} />}
                                                colorScheme="blue"
                                                variant="outline"
                                                onClick={handleClientViewSelectAllClick}
                                                isDisabled={filteredAndSortedStock.length === 0}
                                            >
                                                Select All
                                            </Button>
                                            <Button
                                                size="sm"
                                                leftIcon={<Icon as={MdCheckBoxOutlineBlank} />}
                                                colorScheme="gray"
                                                variant="outline"
                                                onClick={handleClientViewClearSelection}
                                                isDisabled={clientViewSelectedRows.size === 0}
                                            >
                                                Clear Selection
                                            </Button>
                                            {clientViewSelectedRows.size > 0 && (
                                                <>
                                                    <Text fontSize="sm" color={tableTextColorSecondary}>
                                                        {clientViewSelectedRows.size} item(s) selected
                                                    </Text>
                                                    <Button
                                                        size="sm"
                                                        leftIcon={<Icon as={MdPrint} />}
                                                        colorScheme="blue"
                                                        variant="outline"
                                                        onClick={handlePrintClientViewSelected}
                                                    >
                                                        Print Selected
                                                    </Button>
                                                </>
                                            )}
                                        </HStack>
                                    </Flex>
                                </Box>

                                {/* Table with fields for client view only */}
                                <Box overflowX="auto" position="relative" minH="400px">
                                    {isLoading && (
                                        <Box
                                            position="fixed"
                                            top="50%"
                                            left="50%"
                                            transform="translate(-50%, -50%)"
                                            zIndex={1000}
                                            bg={useColorModeValue("white", "gray.800")}
                                            p={6}
                                            borderRadius="md"
                                            boxShadow="lg"
                                        >
                                            <VStack spacing="4">
                                                <Spinner size="xl" color="#1c4a95" />
                                                <Text color={tableTextColorSecondary}>Loading stock list...</Text>
                                            </VStack>
                                        </Box>
                                    )}
                                    <Table variant="unstyled" size="sm" layout="auto">
                                        {!isLoading && (
                                            <Thead bg={tableHeaderBg}>
                                                <Tr>
                                                    <Th {...headerProps} w="40px">
                                                        <Checkbox
                                                            isChecked={displayedItems.length > 0 && displayedItems.every(item => clientViewSelectedRows.has(item.id || item.stock_item_id))}
                                                            isIndeterminate={displayedItems.some(item => clientViewSelectedRows.has(item.id || item.stock_item_id)) && !displayedItems.every(item => clientViewSelectedRows.has(item.id || item.stock_item_id))}
                                                            onChange={handleClientViewSelectAll}
                                                            colorScheme="blue"
                                                        />
                                                    </Th>
                                                    {clientViewFilterType === 'filter1' ? (
                                                        <>
                                                            <Th {...headerProps}>CLIENT</Th>
                                                            <Th {...headerProps}>VESSEL</Th>
                                                            <Th {...headerProps}>SUPPLIER</Th>
                                                            <Th {...headerProps}>PO NUMBER</Th>
                                                            <Th {...headerProps}>BOXES</Th>
                                                            <Th {...headerProps}>WEIGHT KGS</Th>
                                                            <Th {...headerProps}>STOCK STATUS</Th>
                                                            <Th {...headerProps}>DESTINATION</Th>
                                                            <Th {...headerProps}>ACTION</Th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Th {...headerProps}>CLIENT</Th>
                                                            <Th {...headerProps}>VESSEL</Th>
                                                            <Th {...headerProps}>SUPPLIER</Th>
                                                            <Th {...headerProps}>PO NUMBER</Th>
                                                            <Th {...headerProps}>STOCK STATUS</Th>
                                                            <Th {...headerProps}>ORIGIN</Th>
                                                            <Th {...headerProps}>DESTINATION</Th>
                                                            <Th {...headerProps}>SHIPPING DOCS</Th>
                                                            <Th {...headerProps}>EXPORT DOC 1</Th>
                                                            <Th {...headerProps}>EXPORT DOC 2</Th>
                                                            <Th {...headerProps}>BOXES</Th>
                                                            <Th {...headerProps}>WEIGHT KGS</Th>
                                                            <Th {...headerProps}>ACTION</Th>
                                                        </>
                                                    )}
                                                </Tr>
                                            </Thead>
                                        )}
                                        <Tbody>
                                            {isLoading ? (
                                                <Tr>
                                                    <Td colSpan={clientViewFilterType === 'filter1' ? 10 : 14} textAlign="center" py="40px">
                                                        <Box visibility="hidden" h="100px">
                                                            {/* Placeholder to maintain table structure */}
                                                        </Box>
                                                    </Td>
                                                </Tr>
                                            ) : filteredAndSortedStock.length === 0 ? (
                                                <Tr>
                                                    <Td colSpan={clientViewFilterType === 'filter1' ? 10 : 14} textAlign="center" py="40px">
                                                        <Text color={tableTextColorSecondary}>
                                                            {stockList.length === 0
                                                                ? "No stock items available."
                                                                : "No stock items match your filter criteria."}
                                                        </Text>
                                                    </Td>
                                                </Tr>
                                            ) : (
                                                displayedItems.map((item, index) => {
                                                    const statusStyle = getStatusStyle(item.stock_status);
                                                    const rowBg = statusStyle.bgColor || statusStyle.lightBg || tableRowBg;
                                                    const itemId = item.id || item.stock_item_id;
                                                    return (
                                                        <Tr key={itemId} bg={rowBg}>
                                                            <Td {...cellProps} bg={rowBg} w="40px">
                                                                <Checkbox
                                                                    isChecked={clientViewSelectedRows.has(itemId)}
                                                                    onChange={() => handleClientViewRowToggle(itemId)}
                                                                    colorScheme="blue"
                                                                />
                                                            </Td>
                                                            {clientViewFilterType === 'filter1' ? (
                                                                <>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}>{renderMultiLineLabels(item.po_text || item.po_number)}</Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}>
                                                                        <Badge
                                                                            colorScheme={statusStyle.color}
                                                                            size="sm"
                                                                            borderRadius="full"
                                                                            px="3"
                                                                            py="1"
                                                                            bg={statusStyle.bgColor}
                                                                            color={statusStyle.textColor}
                                                                        >
                                                                            {getStatusLabel(item.stock_status)}
                                                                        </Badge>
                                                                    </Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{item.destination_new || item.destination_id || item.destination || item.stock_destination || "-"}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}>
                                                                        <IconButton
                                                                            aria-label="Print row"
                                                                            icon={<MdPrint />}
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            colorScheme="blue"
                                                                            onClick={() => handlePrintClientViewRow(item)}
                                                                        />
                                                                    </Td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}>{renderMultiLineLabels(item.po_text || item.po_number)}</Td>
                                                                    <Td {...cellProps} bg={rowBg}>
                                                                        <Badge
                                                                            colorScheme={statusStyle.color}
                                                                            size="sm"
                                                                            borderRadius="full"
                                                                            px="3"
                                                                            py="1"
                                                                            bg={statusStyle.bgColor}
                                                                            color={statusStyle.textColor}
                                                                        >
                                                                            {getStatusLabel(item.stock_status)}
                                                                        </Badge>
                                                                    </Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{item.origin_text || item.origin || getCountryName(item.origin_id) || "-"}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{item.destination_new || item.destination_id || item.destination || item.stock_destination || "-"}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.export_doc_2)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                                                    <Td {...cellProps} bg={rowBg}>
                                                                        <IconButton
                                                                            aria-label="Print row"
                                                                            icon={<MdPrint />}
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            colorScheme="blue"
                                                                            onClick={() => handlePrintClientViewRow(item)}
                                                                        />
                                                                    </Td>
                                                                </>
                                                            )}
                                                        </Tr>
                                                    );
                                                })
                                            )}
                                        </Tbody>
                                    </Table>
                                </Box>

                                {/* Pagination Controls for Client View */}
                                {allFilteredItems.length > 0 && (() => {
                                    const totalRows = allFilteredItems.length;
                                    const totalPages = Math.ceil(totalRows / clientViewPageSize);
                                    const hasNext = clientViewPage < totalPages;
                                    const hasPrevious = clientViewPage > 1;
                                    const startRow = (clientViewPage - 1) * clientViewPageSize + 1;
                                    const endRow = Math.min(clientViewPage * clientViewPageSize, totalRows);

                                    return (
                                        <Box px="25px" py={4}>
                                            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                                                {/* Page Size Selector and Info */}
                                                <HStack spacing={3}>
                                                    <Text fontSize="sm" color={textColor}>
                                                        Show
                                                    </Text>
                                                    <Select
                                                        size="sm"
                                                        w="80px"
                                                        value={clientViewPageSize}
                                                        onChange={(e) => {
                                                            setClientViewPageSize(Number(e.target.value));
                                                            setClientViewPage(1); // Reset to first page when changing page size
                                                        }}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                        <option value={100}>100</option>
                                                        <option value={200}>200</option>
                                                    </Select>
                                                    <Text fontSize="sm" color={textColor}>
                                                        per page
                                                    </Text>
                                                    <Text fontSize="sm" color={textColor} ml={2}>
                                                        Showing {startRow}-{endRow} of {totalRows} items
                                                    </Text>
                                                </HStack>

                                                {/* Pagination buttons */}
                                                <HStack spacing={2}>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setClientViewPage(1)}
                                                        isDisabled={!hasPrevious || clientViewPage === 1}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        First
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setClientViewPage(clientViewPage - 1)}
                                                        isDisabled={!hasPrevious}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        Previous
                                                    </Button>

                                                    {/* Page numbers */}
                                                    <HStack spacing={1}>
                                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                            let pageNum;
                                                            if (totalPages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (clientViewPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (clientViewPage >= totalPages - 2) {
                                                                pageNum = totalPages - 4 + i;
                                                            } else {
                                                                pageNum = clientViewPage - 2 + i;
                                                            }

                                                            return (
                                                                <Button
                                                                    key={pageNum}
                                                                    size="sm"
                                                                    variant={clientViewPage === pageNum ? "solid" : "outline"}
                                                                    colorScheme={clientViewPage === pageNum ? "blue" : "gray"}
                                                                    onClick={() => setClientViewPage(pageNum)}
                                                                    bg={clientViewPage === pageNum ? undefined : inputBg}
                                                                    color={clientViewPage === pageNum ? undefined : inputText}
                                                                    borderColor={borderColor}
                                                                >
                                                                    {pageNum}
                                                                </Button>
                                                            );
                                                        })}
                                                    </HStack>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setClientViewPage(clientViewPage + 1)}
                                                        isDisabled={!hasNext}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        Next
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setClientViewPage(totalPages)}
                                                        isDisabled={!hasNext || clientViewPage === totalPages}
                                                        bg={inputBg}
                                                        color={inputText}
                                                        borderColor={borderColor}
                                                    >
                                                        Last
                                                    </Button>
                                                </HStack>
                                            </Flex>
                                        </Box>
                                    );
                                })()}
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </Box>

                {/* Remove bulk actions and old table - keeping only status filter and new table above */}
                {false && (
                    <>
                        {/* Bulk Action Buttons - Show one set at a time */}
                        {(selectedRows.size > 0 || editingRowIds.size > 0) && (
                            <Flex px="25px" mb="20px" align="center" gap="3">
                                {editingRowIds.size > 0 ? (
                                    <>
                                        <Text fontSize="sm" color={textColor} fontWeight="600">
                                            {editingRowIds.size} item(s) being edited
                                        </Text>
                                        <Button
                                            leftIcon={<Icon as={MdCheck} />}
                                            colorScheme="green"
                                            size="sm"
                                            onClick={handleBulkSave}
                                        >
                                            Save All ({editingRowIds.size})
                                        </Button>
                                        <Button
                                            leftIcon={<Icon as={MdCancel} />}
                                            colorScheme="red"
                                            size="sm"
                                            onClick={handleEditCancel}
                                        >
                                            Cancel All
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {selectedRows.size > 0 && (
                                            <>
                                                <Text fontSize="sm" color={textColor} fontWeight="600">
                                                    {selectedRows.size} item(s) selected
                                                </Text>
                                                <Button
                                                    leftIcon={<Icon as={MdVisibility} />}
                                                    colorScheme={isViewingSelected ? "blue" : "green"}
                                                    size="sm"
                                                    onClick={handleBulkView}
                                                >
                                                    {isViewingSelected ? "Show All" : "View Selected"}
                                                </Button>
                                                <Button
                                                    leftIcon={<Icon as={MdEdit} />}
                                                    colorScheme="blue"
                                                    size="sm"
                                                    onClick={handleBulkEdit}
                                                >
                                                    Edit Selected
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setSelectedRows(new Set());
                                                        setIsViewingSelected(false);
                                                    }}
                                                >
                                                    Clear Selection
                                                </Button>
                                            </>
                                        )}
                                    </>
                                )}
                            </Flex>
                        )}

                        {/* Table Container */}
                        <Box pr="25px" overflowX="auto" position="relative" minH="400px">
                            {isLoading && (
                                <Box
                                    position="fixed"
                                    top="50%"
                                    left="50%"
                                    transform="translate(-50%, -50%)"
                                    zIndex={1000}
                                    bg={useColorModeValue("white", "gray.800")}
                                    p={6}
                                    borderRadius="md"
                                    boxShadow="lg"
                                >
                                    <VStack spacing="4">
                                        <Spinner size="xl" color="#1c4a95" />
                                        <Text color={tableTextColorSecondary}>Loading stock list...</Text>
                                    </VStack>
                                </Box>
                            )}
                            <Table variant="unstyled" size="sm" ml="25px">
                                {!isLoading && (
                                    <Thead bg={tableHeaderBg}>
                                        <Tr>
                                            <Th
                                                borderRight="1px"
                                                borderColor={tableBorderColor}
                                                py="12px"
                                                px="8px"
                                                fontSize="12px"
                                                fontWeight="600"
                                                textTransform="uppercase"
                                                width="40px"
                                                minW="40px"
                                                maxW="40px"
                                                color={tableTextColor}
                                            >
                                                <Checkbox
                                                    isChecked={allPageItemsSelected}
                                                    isIndeterminate={somePageItemsSelected && !allPageItemsSelected}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                    size="sm"
                                                    borderColor="gray.600"
                                                    colorScheme="blue"
                                                    sx={{
                                                        "& .chakra-checkbox__control": {
                                                            borderColor: "gray.600",
                                                            _checked: {
                                                                borderColor: "blue.500",
                                                                bg: "blue.500",
                                                            },
                                                        },
                                                    }}
                                                />
                                            </Th>
                                            {activeTab === 0 ? (
                                                <>
                                                    <Th {...headerProps}>VESSEL</Th>
                                                    <Th {...headerProps}>STOCKITEMID</Th>
                                                    <Th {...headerProps}>SUPPLIER</Th>
                                                    <Th {...headerProps}>PO NUMBER</Th>
                                                    <Th {...headerProps}>SO NUMBER</Th>
                                                    <Th {...headerProps}>SI NUMBER</Th>
                                                    <Th {...headerProps}>SI COMBINED</Th>
                                                    <Th {...headerProps}>DI NUMBER</Th>
                                                    <Th {...headerProps}>STOCK STATUS</Th>
                                                    <Th {...headerProps}>ORIGIN</Th>
                                                    <Th {...headerProps}>HUB 1</Th>
                                                    <Th {...headerProps}>HUB 2</Th>
                                                    <Th {...headerProps}>AP DESTINATION</Th>
                                                    <Th {...headerProps}>DESTINATION</Th>
                                                    <Th {...headerProps}>WAREHOUSE ID</Th>
                                                    <Th {...headerProps}>EXP READY FROM SUPPLIER</Th>
                                                    <Th {...headerProps}>DATE ON STOCK</Th>
                                                    <Th {...headerProps} textAlign="center">DAYS ON STOCK</Th>
                                                    <Th {...headerProps}>SHIPPED DATE</Th>
                                                    <Th {...headerProps}>DELIVERED DATE</Th>
                                                    <Th {...headerProps}>DG/UN NUMBER</Th>
                                                    <Th {...headerProps}>SHIPPING DOCS</Th>
                                                    <Th {...headerProps}>EXPORT DOC 1</Th>
                                                    <Th {...headerProps}>EXPORT DOC 2</Th>
                                                    <Th {...headerProps}>REMARKS</Th>
                                                    <Th {...headerProps}>BOXES</Th>
                                                    <Th {...headerProps}>WEIGHT KGS</Th>
                                                    <Th {...headerProps}>VOLUME NO DIM</Th>
                                                    <Th {...headerProps}>LWH TEXT</Th>
                                                    <Th {...headerProps}>TOTAL VOLUME CBM</Th>
                                                    <Th {...headerProps}>TOTAL CW AIR FREIGHT</Th>
                                                    <Th {...headerProps}>CURRENCY</Th>
                                                    <Th {...headerProps}>VALUE</Th>
                                                    <Th {...headerProps}>CLIENT</Th>
                                                    <Th {...headerProps}>INTERNAL REMARKS</Th>
                                                    <Th {...headerProps}>FILES</Th>
                                                    <Th {...headerProps}>ACTIONS</Th>
                                                </>
                                            ) : (
                                                <>
                                                    <Th {...headerProps}>STOCK_ID</Th>
                                                    <Th {...headerProps}>STOCK STATUS</Th>
                                                    <Th {...headerProps}>EXPECTED READY</Th>
                                                    <Th {...headerProps}>DATE ON STOCK</Th>
                                                    <Th {...headerProps} textAlign="center">DAYS ON STOCK</Th>
                                                    <Th {...headerProps}>SHIPPED DATE</Th>
                                                    <Th {...headerProps}>DELIVERED DATE</Th>
                                                    <Th {...headerProps}>WAREHOUSE ID</Th>
                                                    <Th {...headerProps}>SUPPLIER</Th>
                                                    <Th {...headerProps}>PO#</Th>
                                                    <Th {...headerProps}>DG/UN NUMBER</Th>
                                                    <Th {...headerProps}>BOXES</Th>
                                                    <Th {...headerProps}>KG</Th>
                                                    <Th {...headerProps}>CBM</Th>
                                                    <Th {...headerProps}>CUR</Th>
                                                    <Th {...headerProps}>VALUE</Th>
                                                    <Th {...headerProps}>ORIGIN</Th>
                                                    <Th {...headerProps}>HUB 1</Th>
                                                    <Th {...headerProps}>HUB 2</Th>
                                                    <Th {...headerProps}>AP DEST</Th>
                                                    <Th {...headerProps}>DESTINATION</Th>
                                                    <Th {...headerProps}>SHIPPING DOC</Th>
                                                    <Th {...headerProps}>EXPORT DOC 1</Th>
                                                    <Th {...headerProps}>EXPORT DOC 2</Th>
                                                    <Th {...headerProps}>REMARKS</Th>
                                                    <Th {...headerProps}>VESSEL</Th>
                                                    <Th {...headerProps}>SO NUMBER</Th>
                                                    <Th {...headerProps}>SI NUMBER</Th>
                                                    <Th {...headerProps}>SIC NUMBER</Th>
                                                    <Th {...headerProps}>DI NUMBER</Th>
                                                    <Th {...headerProps}>FILES</Th>
                                                    <Th {...headerProps}>ACTIONS</Th>
                                                </>
                                            )}
                                        </Tr>
                                    </Thead>
                                )}
                                <Tbody>
                                    {isLoading ? (
                                        <Tr>
                                            <Td colSpan={activeTab === 0 ? 21 : 33} textAlign="center" py="40px">
                                                <Box visibility="hidden" h="100px">
                                                    {/* Placeholder to maintain table structure */}
                                                </Box>
                                            </Td>
                                        </Tr>
                                    ) : paginatedStock.length === 0 ? (
                                        <Tr>
                                            <Td colSpan={activeTab === 0 ? 21 : 33} textAlign="center" py="40px">
                                                <Text color={tableTextColorSecondary}>
                                                    {stockList.length === 0
                                                        ? "No stock items available."
                                                        : "No stock items match your filter criteria."}
                                                </Text>
                                            </Td>
                                        </Tr>
                                    ) : (
                                        renderTableRows(paginatedStock)
                                    )}
                                </Tbody>
                            </Table>

                            {!isLoading && filteredAndSortedStock.length === 0 && (
                                <Box textAlign="center" py="16" px="25px">
                                    <VStack spacing="4">
                                        <Text color={tableTextColor} fontSize="lg" fontWeight="600">
                                            No stock items found
                                        </Text>
                                        <Text color={tableTextColorSecondary} fontSize="sm" maxW="520px">
                                            {(() => {
                                                if (activeTab === 0) {
                                                    return (vesselViewVessel || vesselViewClient || vesselViewStatuses.size > 0)
                                                        ? "Try adjusting your filters to see more results."
                                                        : "No stock items found.";
                                                } else {
                                                    return (clientViewClient || clientViewVesselFilter || clientViewSearchClient || clientViewSearchVessel || clientViewStatuses.size > 0)
                                                        ? "Try adjusting your filters to see more results."
                                                        : "No stock items found.";
                                                }
                                            })()}
                                        </Text>
                                    </VStack>
                                </Box>
                            )}
                        </Box>

                        {/* Results Summary and Pagination */}
                        {filteredAndSortedStock.length > 0 && (
                            <Flex px="25px" justify="space-between" align="center" py="20px" wrap="wrap" gap="4">
                                {/* Records per page selector and info */}
                                <HStack spacing={3}>
                                    <Text fontSize="sm" color={tableTextColorSecondary}>
                                        Records per page:
                                    </Text>
                                    <Select
                                        size="sm"
                                        w="80px"
                                        value={itemsPerPage}
                                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                        bg={inputBg}
                                        color={inputText}
                                        borderColor={borderColor}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </Select>
                                    <Text fontSize="sm" color={tableTextColorSecondary}>
                                        Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedStock.length)} of {filteredAndSortedStock.length} stock items
                                        {(() => {
                                            if (activeTab === 0) {
                                                return (vesselViewVessel || vesselViewClient || vesselViewStatuses.size > 0 || isViewingSelected) ? " (filtered)" : "";
                                            } else {
                                                return (clientViewClient || clientViewVesselFilter || clientViewSearchClient || clientViewSearchVessel || clientViewStatuses.size > 0 || isViewingSelected) ? " (filtered)" : "";
                                            }
                                        })()}
                                        {filteredAndSortedStock.length !== stockList.length && ` of ${stockList.length} total`}
                                    </Text>
                                </HStack>

                                {/* Pagination buttons */}
                                <HStack spacing={2}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCurrentPage(1)}
                                        isDisabled={currentPage === 1}
                                    >
                                        First
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        isDisabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>

                                    {/* Page numbers */}
                                    <HStack spacing={1}>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }

                                            return (
                                                <Button
                                                    key={pageNum}
                                                    size="sm"
                                                    variant={currentPage === pageNum ? "solid" : "outline"}
                                                    colorScheme={currentPage === pageNum ? "blue" : "gray"}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </Button>
                                            );
                                        })}
                                    </HStack>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        isDisabled={currentPage >= totalPages}
                                    >
                                        Next
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setCurrentPage(totalPages)}
                                        isDisabled={currentPage === totalPages}
                                    >
                                        Last
                                    </Button>
                                </HStack>
                            </Flex>
                        )}
                    </>
                )}
            </Card>

            {/* Dimensions View Modal */}
            <Modal isOpen={isDimensionsModalOpen} onClose={onDimensionsModalClose} size="2xl">
                <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <ModalContent>
                    <ModalHeader
                        fontSize="xl"
                        fontWeight="bold"
                        pb={3}
                        borderBottom="1px"
                        borderColor={useColorModeValue("gray.200", "gray.700")}
                    >
                        <HStack spacing={2}>
                            <Icon as={MdVisibility} color="blue.500" />
                            <Text>Dimensions Details</Text>
                            {selectedDimensions && selectedDimensions.length > 0 && (
                                <Badge colorScheme="blue" fontSize="sm" px={2} py={1} borderRadius="full">
                                    {selectedDimensions.length} {selectedDimensions.length === 1 ? 'Dimension' : 'Dimensions'}
                                </Badge>
                            )}
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody py={6}>
                        {selectedDimensions && selectedDimensions.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                                {selectedDimensions.map((dim, index) => (
                                    <Box
                                        key={dim.id || index}
                                        p={4}
                                        border="1px"
                                        borderColor={useColorModeValue("gray.200", "gray.700")}
                                        borderRadius="lg"
                                        bg={useColorModeValue("gray.50", "gray.800")}
                                        _hover={{
                                            borderColor: useColorModeValue("blue.300", "blue.500"),
                                            boxShadow: "md",
                                            transform: "translateY(-2px)",
                                            transition: "all 0.2s"
                                        }}
                                    >
                                        <Flex justify="space-between" align="center" mb={3}>
                                            <HStack spacing={2}>
                                                <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                                                    Dimension {index + 1}
                                                </Badge>
                                                {dim.id && (
                                                    <Badge colorScheme="gray" fontSize="xs" px={2} py={1}>
                                                        ID: {dim.id}
                                                    </Badge>
                                                )}
                                                {/* Calculation Method Badge */}
                                                <Badge 
                                                    colorScheme={dim.calculation_method === "volume" ? "purple" : "blue"} 
                                                    fontSize="xs" 
                                                    px={2} 
                                                    py={1}
                                                >
                                                    Method: {dim.calculation_method === "volume" ? "Volume" : "LWH"}
                                                </Badge>
                                            </HStack>
                                        </Flex>
                                        {/* Conditional display based on calculation_method */}
                                        {dim.calculation_method === "lwh" || !dim.calculation_method ? (
                                            <Grid templateColumns="repeat(3, 1fr)" gap={4} mb={3}>
                                                <Box>
                                                    <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                        Length
                                                    </Text>
                                                    <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                                                        {renderText(dim.length_cm)} <Text as="span" fontSize="sm" color={useColorModeValue("gray.500", "gray.400")}>cm</Text>
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                        Width
                                                    </Text>
                                                    <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                                                        {renderText(dim.width_cm)} <Text as="span" fontSize="sm" color={useColorModeValue("gray.500", "gray.400")}>cm</Text>
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                        Height
                                                    </Text>
                                                    <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                                                        {renderText(dim.height_cm)} <Text as="span" fontSize="sm" color={useColorModeValue("gray.500", "gray.400")}>cm</Text>
                                                    </Text>
                                                </Box>
                                            </Grid>
                                        ) : (
                                            <Box mb={3}>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Volume Dimension
                                                </Text>
                                                <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                                                    {renderText(dim.volume_dim) || "-"}
                                                </Text>
                                            </Box>
                                        )}
                                        <Divider my={3} />
                                        <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Volume (CBM)
                                                </Text>
                                                <Text fontSize="md" fontWeight="semibold" color="blue.500">
                                                    {renderText(dim.volume_cbm) || "-"}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    CW Air Freight
                                                </Text>
                                                <Text fontSize="md" fontWeight="semibold" color="green.500">
                                                    {renderText(dim.cw_air_freight) || "-"}
                                                </Text>
                                            </Box>
                                        </Grid>
                                    </Box>
                                ))}
                                {/* Summary Section */}
                                {selectedDimensions.length > 1 && (
                                    <>
                                        <Divider />
                                        <Box
                                            p={4}
                                            bg={useColorModeValue("blue.50", "blue.900")}
                                            borderRadius="lg"
                                            border="1px"
                                            borderColor={useColorModeValue("blue.200", "blue.700")}
                                        >
                                            <Text fontSize="sm" fontWeight="bold" color={useColorModeValue("blue.700", "blue.200")} mb={3}>
                                                Total Summary
                                            </Text>
                                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                                <Box>
                                                    <Text fontSize="xs" color={useColorModeValue("blue.600", "blue.300")} mb={1}>
                                                        Total Volume (CBM)
                                                    </Text>
                                                    <Text fontSize="lg" fontWeight="bold" color={useColorModeValue("blue.700", "blue.200")}>
                                                        {selectedDimensions.reduce((sum, dim) => sum + (parseFloat(dim.volume_cbm) || 0), 0).toFixed(3)}
                                                    </Text>
                                                </Box>
                                                <Box>
                                                    <Text fontSize="xs" color={useColorModeValue("blue.600", "blue.300")} mb={1}>
                                                        Total CW Air Freight
                                                    </Text>
                                                    <Text fontSize="lg" fontWeight="bold" color={useColorModeValue("blue.700", "blue.200")}>
                                                        {selectedDimensions.reduce((sum, dim) => sum + (parseFloat(dim.cw_air_freight) || 0), 0).toFixed(1)}
                                                    </Text>
                                                </Box>
                                            </Grid>
                                        </Box>
                                    </>
                                )}
                            </VStack>
                        ) : (
                            <VStack spacing={4} py={8}>
                                <Icon as={MdVisibility} boxSize={12} color={useColorModeValue("gray.400", "gray.600")} />
                                <Text fontSize="lg" fontWeight="medium" color={useColorModeValue("gray.600", "gray.400")}>
                                    No dimensions available
                                </Text>
                                <Text fontSize="sm" color={useColorModeValue("gray.500", "gray.500")} textAlign="center">
                                    This stock item does not have any dimensions recorded.
                                </Text>
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter borderTop="1px" borderColor={useColorModeValue("gray.200", "gray.700")}>
                        <Button onClick={onDimensionsModalClose} colorScheme="blue">
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>


        </Box>
    );
}


