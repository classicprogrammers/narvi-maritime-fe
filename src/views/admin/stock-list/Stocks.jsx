import React, { useState, useEffect, useRef } from "react";
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
    FormControl,
    FormLabel,
    Select,
    Textarea,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { MdRefresh, MdEdit, MdAdd, MdClose, MdCheck, MdCancel, MdVisibility, MdDownload } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { updateStockItemApi } from "../../../api/stock";
import { useHistory, useLocation } from "react-router-dom";
import { getCustomersForSelect, getVesselsForSelect } from "../../../api/entitySelects";
import api from "../../../api/axios";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";
import destinationsAPI from "../../../api/destinations";
import countriesAPI from "../../../api/countries";
import { getShippingOrders } from "../../../api/shippingOrders";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

// Status definitions matching backend status keys exactly
// Colors tuned per business requirements
const STATUS_CONFIG = {
    //blank
    blank: {
        label: "Blank",
    },
    // Pending = Cornflower Blue (approximated with Chakra blue scale)
    pending: {
        label: "Pending",
        color: "blue",
        bgColor: "blue.200",
        textColor: "blue.900",
        lightBg: "blue.50"
    },
    // Stock = Grey
    in_stock: {
        label: "In Stock",
        color: "gray",
        bgColor: "gray.200",
        textColor: "gray.800",
        lightBg: "gray.100"
    },
    // On a Shipping Instr = Orange
    on_shipping: {
        label: "On Shipping Instr",
        color: "orange",
        bgColor: "orange.200",
        textColor: "orange.800",
        lightBg: "orange.50"
    },
    // On a Delivery Instr = Theme color (closer to blue 11)
    // Using blue scheme to stay aligned with app theme
    on_delivery: {
        label: "On Delivery Instr",
        color: "blue",
        bgColor: "blue.300",
        textColor: "blue.900",
        lightBg: "blue.100"
    },
    // In Transit = Light Green 1
    in_transit: {
        label: "In Transit",
        color: "green",
        bgColor: "green.100",
        textColor: "green.800",
        lightBg: "green.50"
    },
    // Arrived Destination = Dark Grey 2
    arrived: {
        label: "Arrived Dest",
        color: "gray",
        bgColor: "gray.500",
        textColor: "white",
        lightBg: "gray.300"
    },
    // Shipped = Light Orange 3
    shipped: {
        label: "Shipped",
        color: "orange",
        bgColor: "orange.100",
        textColor: "orange.800",
        lightBg: "orange.50"
    },
    // Delivered = Light Red 3
    delivered: {
        label: "Delivered",
        color: "red",
        bgColor: "red.200",
        textColor: "red.800",
        lightBg: "red.50"
    },
    // Irregularities = Red
    irregular: {
        label: "Irregularities",
        color: "red",
        bgColor: "red.400",
        textColor: "red.900",
        lightBg: "red.300"
    },
    // Cancelled = Light Purple 2
    cancelled: {
        label: "Cancelled",
        color: "purple",
        bgColor: "purple.200",
        textColor: "purple.900",
        lightBg: "purple.100"
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

    const [clients, setClients] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);

    // Lookup data for IDs -> Names
    const [vessels, setVessels] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [countries, setCountries] = useState([]);
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
    };
    const cellProps = {
        borderRight: "1px",
        borderColor: tableBorderColor,
        py: "12px",
        px: "16px",
        minW: "130px",
        maxW: "200px",
    };
    const cellText = {
        color: tableTextColor,
        fontSize: "sm",
    };

    // Ensure we only auto-fetch once (avoids double calls in StrictMode)
    const hasFetchedInitialData = useRef(false);
    const hasFetchedLookupData = useRef(false);

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
                setIsLoadingClients(true);
                setIsLoadingVessels(true);

                // Fetch all lookup data in parallel (excluding users if not needed)
                // Users are only needed for PIC field display
                setIsLoadingShippingOrders(true);
                const promises = [
                    getCustomersForSelect().catch(() => []).then(data => ({ type: 'clients', data })),
                    getVesselsForSelect().catch(() => []).then(data => ({ type: 'vessels', data })),
                    // Use supplier API instead of agents/vendors
                    api.get("/api/suppliers").catch(() => ({ data: [] })).then(response => ({ type: 'vendors', data: Array.isArray(response.data) ? response.data : (response.data?.suppliers || response.data?.vendors || response.data?.result?.suppliers || []) })),
                    // Use destinations API for destinations
                    destinationsAPI.getDestinations().catch(() => ({ destinations: [] })).then(data => ({ type: 'destinations', data: Array.isArray(data) ? data : (data?.destinations || data?.result?.destinations || []) })),
                    currenciesAPI.getCurrencies().catch(() => ({ currencies: [] })).then(data => ({ type: 'currencies', data })),
                    locationsAPI.getLocations().catch(() => ({ locations: [] })).then(data => ({ type: 'locations', data })),
                    // Fetch countries for origin field
                    countriesAPI.getCountries().catch(() => ({ countries: [] })).then(data => ({ type: 'countries', data: Array.isArray(data) ? data : (data?.countries || data?.result?.countries || []) })),
                    // Fetch shipping orders for SO number dropdown
                    getShippingOrders().catch(() => ({ orders: [] })).then(data => {
                        // Handle different response structures
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
                    // Users API removed - PIC is now a free text field, no need to fetch users
                ];

                const results = await Promise.all(promises);

                results.forEach(({ type, data }) => {
                    switch (type) {
                        case 'clients':
                            setClients(data || []);
                            break;
                        case 'vessels':
                            setVessels(data || []);
                            break;
                        case 'vendors':
                            // Data from supplier API
                            setVendors(Array.isArray(data) ? data : []);
                            break;
                        case 'destinations':
                            setDestinations(data || []);
                            break;
                        case 'currencies':
                            setCurrencies(data?.currencies || data || []);
                            break;
                        case 'locations':
                            setLocations(data?.locations || data || []);
                            break;
                        case 'countries':
                            setCountries(data || []);
                            break;
                        case 'shippingOrders':
                            setShippingOrders(data || []);
                            break;
                        // Users case removed - PIC is now free text, no need to fetch users
                    }
                });
            } catch (error) {
                console.error('Failed to fetch lookup data:', error);
                hasFetchedLookupData.current = false; // Reset on error to allow retry
            } finally {
                setIsLoadingClients(false);
                setIsLoadingVessels(false);
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
            if (filterState.clientViewStatuses !== undefined) setClientViewStatuses(new Set(filterState.clientViewStatuses)); // Convert Array back to Set
            // Clear location.state to prevent restoring on subsequent renders
            history.replace(location.pathname, {});
        }
    }, [location.state, history, location.pathname]);

    // Persist state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stocksSelectedRows', JSON.stringify(Array.from(selectedRows)));
    }, [selectedRows]);

    useEffect(() => {
        sessionStorage.setItem('stocksActiveTab', activeTab.toString());
    }, [activeTab]);

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
        return vessel ? vessel.name : `Vessel ${vesselId}`;
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
            clientViewStatuses: Array.from(clientViewStatuses) // Convert Set to Array for serialization
        };
        history.push({
            pathname: '/admin/stock-list/main-db-edit',
            state: { selectedItems: [item], isBulkEdit: false, filterState }
        });
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
                clientViewStatuses: Array.from(clientViewStatuses) // Convert Set to Array for serialization
            };
            history.push({
                pathname: '/admin/stock-list/main-db-edit',
                state: { selectedItems: selectedItemsData, isBulkEdit: selectedItemsData.length > 1, filterState }
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

    // Filter stock list by status checkboxes only
    const getFilteredStockByStatus = () => {
        let filtered = [...stockList];

        // Filter by selected statuses using the matchesStatus helper
        filtered = filtered.filter((item) => matchesStatus(item.stock_status, vesselViewStatuses));

        return filtered;
    };

    // Filter stock list for By Vessel view (kept for commented out tabs)
    const getFilteredStockByVessel = () => {
        let filtered = [...stockList];

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

        // Apply client filter
        if (clientViewClient) {
            filtered = filtered.filter((item) => {
                const clientId = item.client_id || item.client;
                return String(clientId) === String(clientViewClient);
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
            const allIds = filteredAndSortedStock.map(item => item.id);
            setSelectedRows(new Set(allIds));
        } else {
            setSelectedRows(new Set());
        }
    };

    // Check if all items are selected
    const allItemsSelected = filteredAndSortedStock.length > 0 && filteredAndSortedStock.every(item => selectedRows.has(item.id));
    const someItemsSelected = filteredAndSortedStock.some(item => selectedRows.has(item.id));


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
            so_number_id: getFieldValue("so_number_id", "so_number", "stock_so_number"),
            shipping_instruction_id: getFieldValue("shipping_instruction_id", "si_number", "stock_shipping_instruction"),
            delivery_instruction_id: getFieldValue("delivery_instruction_id", "di_number", "stock_delivery_instruction"),
            origin_id: (() => {
                // For inline editing, convert origin_id to country name text if possible
                // Check origin_text first (new field), then origin (backward compatibility), then origin_id
                const originValue = getFieldValue("origin_text") || getFieldValue("origin") || getFieldValue("origin_id");
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
            si_combined: item.si_combined || "",
            details: item.details || item.item_desc || "",
            remarks: item.remarks || "",
            via_hub: item.via_hub || "",
            via_hub2: item.via_hub2 || "",
            shipping_doc: item.shipping_doc || "",
            export_doc: item.export_doc || "",
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
            { backend: "origin_text", original: ["origin_id", "origin", "origin_text"], edited: ["origin_id", "origin_text"], transform: (v) => v ? String(v) : "" },
            { backend: "ap_destination_new", original: ["ap_destination_new", "ap_destination_id", "ap_destination"], edited: ["ap_destination_new", "ap_destination"], transform: (v) => v || "" }, // Free text field
            { backend: "via_hub", original: ["via_hub"], edited: ["via_hub"], transform: (v) => v || "" },
            { backend: "via_hub2", original: ["via_hub2"], edited: ["via_hub2"], transform: (v) => v || "" },
            { backend: "client_access", original: ["client_access"], edited: ["client_access"], transform: (v) => Boolean(v !== undefined ? v : false) },
            { backend: "remarks", original: ["remarks"], edited: ["remarks"], transform: (v) => v || "" },
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
            { backend: "cw_freight", original: ["cw_freight", "cw_airfreight"], edited: ["cw_freight"], transform: (v) => toNumber(v) },
            { backend: "value", original: ["value"], edited: ["value"], transform: (v) => toNumber(v) },
            { backend: "shipment_type", original: ["shipment_type"], edited: ["shipment_type"], transform: (v) => v || "" },
            { backend: "extra", original: ["extra", "extra2"], edited: ["extra"], transform: (v) => v || "" },
            { backend: "destination_new", original: ["destination_new", "destination_id", "destination", "stock_destination"], edited: ["destination_new", "destination"], transform: (v) => v || "" }, // Free text field
            { backend: "warehouse_new", original: ["warehouse_new", "warehouse_id", "stock_warehouse"], edited: ["warehouse_new", "warehouse_id"], transform: (v) => v || "" }, // Free text field
            { backend: "shipping_doc", original: ["shipping_doc"], edited: ["shipping_doc"], transform: (v) => v || "" },
            { backend: "export_doc", original: ["export_doc"], edited: ["export_doc"], transform: (v) => v || "" },
            { backend: "date_on_stock", original: ["date_on_stock"], edited: ["date_on_stock"], transform: (v) => toValue(v, false) },
            { backend: "exp_ready_in_stock", original: ["exp_ready_in_stock", "ready_ex_supplier"], edited: ["exp_ready_in_stock"], transform: (v) => toValue(v, false) },
            { backend: "shipped_date", original: ["shipped_date"], edited: ["shipped_date"], transform: (v) => toValue(v, false) },
            { backend: "delivered_date", original: ["delivered_date"], edited: ["delivered_date"], transform: (v) => toValue(v, false) },
            { backend: "details", original: ["details", "item_desc"], edited: ["details"], transform: (v) => v || "" },
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
            { backend: "stock_so_number", original: ["so_number_id", "so_number", "stock_so_number"], edited: ["so_number_id", "stock_so_number"], transform: (v) => toValue(toId(v), false) },
            { backend: "stock_shipping_instruction", original: ["shipping_instruction_id", "si_number", "stock_shipping_instruction"], edited: ["shipping_instruction_id", "stock_shipping_instruction"], transform: (v) => toValue(toId(v), false) },
            { backend: "stock_delivery_instruction", original: ["delivery_instruction_id", "di_number", "stock_delivery_instruction"], edited: ["delivery_instruction_id", "stock_delivery_instruction"], transform: (v) => toValue(toId(v), false) },
            { backend: "vessel_destination_text", original: ["vessel_destination", "vessel_destination_text"], edited: ["vessel_destination", "vessel_destination_text"], transform: (v) => v || "" },
            { backend: "si_combined", original: ["si_combined"], edited: ["si_combined"], transform: (v) => v || "" },
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

    const isInitialLoading = isLoading && stockList.length === 0;

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
        if (field.includes("origin_id") || field === "origin" || field === "origin_text") {
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
                return (
                    <Input
                        size="sm"
                        value={currentValue || ""}
                        onChange={(e) => handleChange(e.target.value)}
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
                            {isEditing ? renderEditableCell(item, "so_number_id", item.so_number_id || item.so_number || item.stock_so_number, "so_number") : <Text {...cellText}>{item.so_number_id ? getSoNumberName(item.so_number_id) : renderText(item.so_number || item.stock_so_number)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_instruction_id", item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction) : <Text {...cellText}>{renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "si_combined", item.si_combined) : <Text {...cellText}>{renderText(item.si_combined)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivery_instruction_id", item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction) : <Text {...cellText}>{renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction)}</Text>}
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
                            {isEditing ? renderEditableCell(item, "origin_id", item.origin_text || item.origin || item.origin_id, "text") : <Text {...cellText}>{item.origin_text || item.origin || getCountryName(item.origin_id) || "-"}</Text>}
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
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipped_date", item.shipped_date, "date") : <Text {...cellText}>{formatDate(item.shipped_date)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivered_date", item.delivered_date, "date") : <Text {...cellText}>{formatDate(item.delivered_date)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_doc", item.shipping_doc, "textarea") : <Text {...cellText}>{renderText(item.shipping_doc)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "export_doc", item.export_doc, "textarea") : <Text {...cellText}>{renderText(item.export_doc)}</Text>}
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
                            {isEditing ? renderEditableCell(item, "length_cm", item.length_cm, "number") : <Text {...cellText}>{renderText(item.length_cm)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "width_cm", item.width_cm, "number") : <Text {...cellText}>{renderText(item.width_cm)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "height_cm", item.height_cm, "number") : <Text {...cellText}>{renderText(item.height_cm)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "volume_no_dim", item.volume_no_dim || item.volume_dim, "number") : <Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "lwh_text", item.lwh_text, "textarea") : <Text {...cellText}>{renderText(item.lwh_text)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "volume_cbm", item.volume_cbm, "number") : <Text {...cellText}>{renderText(item.volume_cbm)}</Text>}
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
                            {isEditing ? renderEditableCell(item, "internal_remarks", item.internal_remarks || item.remarks, "textarea") : <Text {...cellText}>{renderText(item.internal_remarks || item.remarks)}</Text>}
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
                                                onClick={() => handleViewFile(att)}
                                            />
                                            <IconButton
                                                icon={<Icon as={MdDownload} />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="blue"
                                                aria-label="Download file"
                                                onClick={() => handleDownloadFile(att)}
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
                            {isEditing ? renderEditableCell(item, "origin_id", item.origin_text || item.origin || item.origin_id, "text") : <Text {...cellText}>{item.origin_text || item.origin || getCountryName(item.origin_id) || "-"}</Text>}
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
                            {isEditing ? renderEditableCell(item, "remarks", item.remarks) : <Text {...cellText}>{renderText(item.remarks)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "vessel_id", item.vessel_id || item.vessel, "select", vessels.map(v => ({ value: v.id, label: v.name }))) : <Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "so_number_id", item.so_number_id || item.so_number || item.stock_so_number, "so_number") : <Text {...cellText}>{item.so_number_id ? getSoNumberName(item.so_number_id) : renderText(item.so_number || item.stock_so_number)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "shipping_instruction_id", item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction) : <Text {...cellText}>{renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "si_combined", item.si_combined) : <Text {...cellText}>{renderText(item.si_combined)}</Text>}
                        </Td>
                        <Td {...cellProps}>
                            {isEditing ? renderEditableCell(item, "delivery_instruction_id", item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction) : <Text {...cellText}>{renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction)}</Text>}
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
                                                onClick={() => handleViewFile(att)}
                                            />
                                            <IconButton
                                                icon={<Icon as={MdDownload} />}
                                                size="xs"
                                                variant="ghost"
                                                colorScheme="blue"
                                                aria-label="Download file"
                                                onClick={() => handleDownloadFile(att)}
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
                                                                formatOption={(option) => option.name || `Vessel ${option.id}`}
                                                                isLoading={isLoadingVessels}
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
                                                                isLoading={isLoadingClients}
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
                                    {/* Filters for By Client View */}
                                    <Box mb="20px">
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
                                                            isLoading={isLoadingClients}
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
                                    </Box>
                                </TabPanel>

                            </TabPanels>
                        </Tabs>
                    </Box>
                )}

                {/* Tabs for Stock View and Client View */}
                <Box px="25px" mb="20px">
                    <Tabs index={activeTab} onChange={setActiveTab} variant="enclosed" colorScheme="blue">
                        <TabList>
                            <Tab>Stock View / Edit</Tab>
                            <Tab>Stocklist view for clients</Tab>
                        </TabList>

                        <TabPanels>
                            {/* Tab 1: Stock View / Edit */}
                            <TabPanel px="0" pt="20px">
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

                                {/* Bulk Action Buttons */}
                                {selectedRows.size > 0 && (
                                    <Flex px="25px" mb="20px" align="center" gap="3">
                                        <Text fontSize="sm" color={textColor} fontWeight="600">
                                            {selectedRows.size} item(s) selected
                                        </Text>
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
                                            onClick={() => setSelectedRows(new Set())}
                                        >
                                            Clear Selection
                                        </Button>
                                    </Flex>
                                )}

                                {/* Table with fields in exact order from image */}
                                <Box overflowX="auto">
                                    <Table size="sm" minW="6000px">
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
                                                <Th {...headerProps}>READY EX SUPPLIER</Th>
                                                <Th {...headerProps}>DATE ON STOCK</Th>
                                                <Th {...headerProps}>SHIPPED DATE</Th>
                                                <Th {...headerProps}>DELIVERED DATE</Th>
                                                <Th {...headerProps}>SHIPPING DOCS</Th>
                                                <Th {...headerProps}>EXPORT DOCS</Th>
                                                <Th {...headerProps}>REMARKS</Th>
                                                <Th {...headerProps}>ITEMS</Th>
                                                <Th {...headerProps}>WEIGHT KGS</Th>
                                                <Th {...headerProps}>LENGTH CM</Th>
                                                <Th {...headerProps}>WIDTH CM</Th>
                                                <Th {...headerProps}>HEIGHT CM</Th>
                                                <Th {...headerProps}>VOLUME NO DIM</Th>
                                                <Th {...headerProps}>LWH TEXT</Th>
                                                <Th {...headerProps}>VOLUME CBM</Th>
                                                <Th {...headerProps}>CURRENCY</Th>
                                                <Th {...headerProps}>VALUE</Th>
                                                <Th {...headerProps}>CLIENT</Th>
                                                <Th {...headerProps}>INTERNAL REMARKS</Th>
                                                <Th {...headerProps}>FILES</Th>
                                                <Th {...headerProps}>ACTIONS</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {getFilteredStockByStatus().map((item, index) => {
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
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.po_text || item.po_number)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : renderText(item.so_number))}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.si_combined || item.shipping_instruction_id || item.stock_shipping_instruction)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction)}</Text></Td>
                                                        <Td {...cellProps}>
                                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                                {renderText(item.stock_status)}
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
                                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.length_cm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.width_cm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.height_cm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.lwh_text)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_cbm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.internal_remarks || item.remarks)}</Text></Td>
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
                                                                                onClick={() => handleViewFile(att)}
                                                                            />
                                                                            <IconButton
                                                                                icon={<Icon as={MdDownload} />}
                                                                                size="xs"
                                                                                variant="ghost"
                                                                                colorScheme="blue"
                                                                                aria-label="Download file"
                                                                                onClick={() => handleDownloadFile(att)}
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
                                            })}
                                        </Tbody>
                                    </Table>
                                </Box>
                            </TabPanel>

                            {/* Tab 2: Stocklist view for clients */}
                            <TabPanel px="0" pt="20px">
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

                                {/* Table with fields for client view only */}
                                <Box overflowX="auto">
                                    <Table variant="striped" size="sm" minW="5000px">
                                        <Thead bg={tableHeaderBg}>
                                            <Tr>
                                                <Th {...headerProps}>VESSEL</Th>
                                                <Th {...headerProps}>SUPPLIER</Th>
                                                <Th {...headerProps}>PO NUMBER</Th>
                                                <Th {...headerProps}>STOCK STATUS</Th>
                                                <Th {...headerProps}>ORIGIN</Th>
                                                <Th {...headerProps}>VIA HUB 1</Th>
                                                <Th {...headerProps}>VIA HUB 2</Th>
                                                <Th {...headerProps}>AP DESTINATION</Th>
                                                <Th {...headerProps}>DESTINATION</Th>
                                                <Th {...headerProps}>WAREHOUSE ID</Th>
                                                <Th {...headerProps}>READY EX SUPPLIER</Th>
                                                <Th {...headerProps}>DATE ON STOCK</Th>
                                                <Th {...headerProps}>SHIPPED DATE</Th>
                                                <Th {...headerProps}>DELIVERED DATE</Th>
                                                <Th {...headerProps}>SHIPPING DOCS</Th>
                                                <Th {...headerProps}>EXPORT DOCS</Th>
                                                <Th {...headerProps}>REMARKS</Th>
                                                <Th {...headerProps}>ITEMS</Th>
                                                <Th {...headerProps}>WEIGHT KGS</Th>
                                                <Th {...headerProps}>LENGTH CM</Th>
                                                <Th {...headerProps}>WIDTH CM</Th>
                                                <Th {...headerProps}>HEIGHT CM</Th>
                                                <Th {...headerProps}>VOLUME NO DIM</Th>
                                                <Th {...headerProps}>LWH TEXT</Th>
                                                <Th {...headerProps}>VOLUME CBM</Th>
                                                <Th {...headerProps}>CURRENCY</Th>
                                                <Th {...headerProps}>VALUE</Th>
                                                <Th {...headerProps}>FILES</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {getFilteredStockByStatus().map((item, index) => {
                                                const statusStyle = getStatusStyle(item.stock_status);
                                                const rowBg = statusStyle.bgColor || statusStyle.lightBg || tableRowBg;
                                                return (
                                                    <Tr key={item.id} bg={rowBg}>
                                                        <Td {...cellProps}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.po_text || item.po_number)}</Text></Td>
                                                        <Td {...cellProps}>
                                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                                {renderText(item.stock_status)}
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
                                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.length_cm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.width_cm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.height_cm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.lwh_text)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_cbm)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text></Td>
                                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
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
                                                                                onClick={() => handleViewFile(att)}
                                                                            />
                                                                            <IconButton
                                                                                icon={<Icon as={MdDownload} />}
                                                                                size="xs"
                                                                                variant="ghost"
                                                                                colorScheme="blue"
                                                                                aria-label="Download file"
                                                                                onClick={() => handleDownloadFile(att)}
                                                                            />
                                                                        </HStack>
                                                                    ))}
                                                                </VStack>
                                                            ) : (
                                                                <Text fontSize="xs" color="gray.500">No files</Text>
                                                            )}
                                                        </Td>
                                                    </Tr>
                                                );
                                            })}
                                        </Tbody>
                                    </Table>
                                </Box>
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
                                        <Text fontSize="sm" color={textColor} fontWeight="600">
                                            {selectedRows.size} item(s) selected
                                        </Text>
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
                                            onClick={() => setSelectedRows(new Set())}
                                        >
                                            Clear Selection
                                        </Button>
                                    </>
                                )}
                            </Flex>
                        )}

                        {/* Table Container */}
                        <Box pr="25px" overflowX="auto">
                            {(paginatedStock.length > 0 || isInitialLoading) && (
                                <Table variant="unstyled" size="sm" ml="25px">
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
                                                    <Th {...headerProps}>READY EX SUPPLIER</Th>
                                                    <Th {...headerProps}>FILES</Th>
                                                    <Th {...headerProps}>ACTIONS</Th>
                                                </>
                                            ) : (
                                                <>
                                                    <Th {...headerProps}>STOCK_ID</Th>
                                                    <Th {...headerProps}>STOCK STATUS</Th>
                                                    <Th {...headerProps}>EXPECTED READY</Th>
                                                    <Th {...headerProps}>DATE ON STOCK</Th>
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
                                                    <Th {...headerProps}>EXPORT DOC</Th>
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
                                    <Tbody>
                                        {isInitialLoading ? (
                                            <Tr>
                                                <Td colSpan={activeTab === 0 ? 19 : 32}>
                                                    <Center py="10">
                                                        <HStack spacing="4">
                                                            <Spinner size="lg" color="#1c4a95" />
                                                            <Text color={tableTextColor}>Loading stock list...</Text>
                                                        </HStack>
                                                    </Center>
                                                </Td>
                                            </Tr>
                                        ) : (
                                            renderTableRows(paginatedStock)
                                        )}
                                    </Tbody>
                                </Table>
                            )}

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
                                                    return (clientViewClient || clientViewStatuses.size > 0)
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
                                                return (vesselViewVessel || vesselViewClient || vesselViewStatuses.size > 0) ? " (filtered)" : "";
                                            } else {
                                                return (clientViewClient || clientViewStatuses.size > 0) ? " (filtered)" : "";
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
        </Box>
    );
}

