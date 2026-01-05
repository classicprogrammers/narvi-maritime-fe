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
} from "@chakra-ui/react";
import { MdRefresh, MdEdit, MdFilterList, MdClose, MdVisibility, MdDownload } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { Checkbox, Input, Select } from "@chakra-ui/react";
import { useHistory, useLocation } from "react-router-dom";
import { useUser } from "../../../redux/hooks/useUser";
import { getCustomersForSelect, getVesselsForSelect, getDestinationsForSelect } from "../../../api/entitySelects";
import { getVendorsApi } from "../../../api/vendor";
import currenciesAPI from "../../../api/currencies";
import locationsAPI from "../../../api/locations";
import countriesAPI from "../../../api/countries";
import { getShippingOrders } from "../../../api/shippingOrders";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";

export default function StockList() {
    const history = useHistory();
    const location = useLocation();
    const [selectedRows, setSelectedRows] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedRows');
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    const toast = useToast();

    const {
        stockList,
        isLoading,
        error,
        updateLoading,
        getStockList,
    } = useStock();

    const { user } = useUser();

    // Check if current user is authorized to edit (Igor or Martin only)
    const isAuthorizedToEdit = React.useMemo(() => {
        if (!user) return false;

        const userEmail = (user.email || "").toLowerCase().trim();
        const userName = (user.name || "").toLowerCase().trim();

        // Check by email
        const allowedEmails = [
            "igor@narvimaritime.com",
            "martin@narvimaritime.com"
        ];

        // Check by name (case-insensitive)
        const allowedNames = ["igor", "martin"];

        const emailMatch = allowedEmails.includes(userEmail);
        const nameMatch = allowedNames.some(name => userName.includes(name));

        return emailMatch || nameMatch;
    }, [user]);

    // Track if we're refreshing after an update
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Lookup data for IDs -> Names
    const [clients, setClients] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [locations, setLocations] = useState([]);
    const [countries, setCountries] = useState([]);
    const [shippingOrders, setShippingOrders] = useState([]);

    // Filters state - initialize from sessionStorage
    const [selectedClient, setSelectedClient] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedClient');
        return stored && stored !== 'null' ? stored : null;
    });
    const [selectedVessel, setSelectedVessel] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedVessel');
        return stored && stored !== 'null' ? stored : null;
    });
    const [selectedSupplier, setSelectedSupplier] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedSupplier');
        return stored && stored !== 'null' ? stored : null;
    });
    const [selectedStatus, setSelectedStatus] = useState(() => {
        return sessionStorage.getItem('stockListMainSelectedStatus') || "";
    });
    const [selectedWarehouse, setSelectedWarehouse] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedWarehouse');
        return stored && stored !== 'null' ? stored : null;
    });
    const [selectedCurrency, setSelectedCurrency] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedCurrency');
        return stored && stored !== 'null' ? stored : null;
    });
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [isLoadingVessels, setIsLoadingVessels] = useState(false);
    const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
    const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
    const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);

    // Sorting state - initialize from sessionStorage
    const [sortField, setSortField] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSortField');
        return stored && stored !== 'null' ? stored : null;
    });
    const [sortDirection, setSortDirection] = useState(() => {
        return sessionStorage.getItem('stockListMainSortDirection') || "asc";
    });


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
    };
    const cellText = {
        color: tableTextColor,
        fontSize: "sm",
    };

    // Fetch stock list on component mount
    useEffect(() => {
        getStockList();
    }, [getStockList]);

    // Restore filter state from location.state when returning from edit mode
    useEffect(() => {
        if (location.state && location.state.filterState) {
            const { filterState } = location.state;
            if (filterState.selectedClient !== undefined) setSelectedClient(filterState.selectedClient);
            if (filterState.selectedVessel !== undefined) setSelectedVessel(filterState.selectedVessel);
            if (filterState.selectedSupplier !== undefined) setSelectedSupplier(filterState.selectedSupplier);
            if (filterState.selectedStatus !== undefined) setSelectedStatus(filterState.selectedStatus);
            if (filterState.selectedWarehouse !== undefined) setSelectedWarehouse(filterState.selectedWarehouse);
            if (filterState.selectedCurrency !== undefined) setSelectedCurrency(filterState.selectedCurrency);
            // Clear location.state to prevent restoring on subsequent renders
            history.replace(location.pathname, {});
        }
    }, [location.state, history, location.pathname]);

    // Track refresh state after updates
    useEffect(() => {
        if (isLoading && stockList.length > 0) {
            setIsRefreshing(true);
        } else {
            setIsRefreshing(false);
        }
    }, [isLoading, stockList.length]);

    // Persist filter states to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedClient', selectedClient || 'null');
    }, [selectedClient]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedVessel', selectedVessel || 'null');
    }, [selectedVessel]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedSupplier', selectedSupplier || 'null');
    }, [selectedSupplier]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedStatus', selectedStatus || '');
    }, [selectedStatus]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedWarehouse', selectedWarehouse || 'null');
    }, [selectedWarehouse]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedCurrency', selectedCurrency || 'null');
    }, [selectedCurrency]);

    // Persist sorting state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stockListMainSortField', sortField || 'null');
    }, [sortField]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSortDirection', sortDirection || 'asc');
    }, [sortDirection]);

    // Persist selected rows to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedRows', JSON.stringify(Array.from(selectedRows)));
    }, [selectedRows]);

    // Track if lookup data has been fetched
    const hasFetchedLookupData = useRef(false);

    // Fetch all lookup data for IDs -> Names (only once per component mount)
    useEffect(() => {
        // Only fetch if we haven't already fetched lookup data
        if (hasFetchedLookupData.current) {
            return;
        }

        const fetchLookupData = async () => {
            try {
                hasFetchedLookupData.current = true;

                // Fetch all lookup data in parallel
                const promises = [
                    getCustomersForSelect().catch(() => []).then(data => ({ type: 'clients', data })),
                    getVesselsForSelect().catch(() => []).then(data => ({ type: 'vessels', data })),
                    getVendorsApi().catch(() => []).then(data => ({ type: 'vendors', data })),
                    getDestinationsForSelect().catch(() => []).then(data => ({ type: 'destinations', data })),
                    currenciesAPI.getCurrencies().catch(() => ({ currencies: [] })).then(data => ({ type: 'currencies', data })),
                    locationsAPI.getLocations().catch(() => ({ locations: [] })).then(data => ({ type: 'locations', data })),
                    countriesAPI.getCountries().catch(() => ({ countries: [] })).then(data => ({ type: 'countries', data })),
                    getShippingOrders().catch(() => ({ orders: [] })).then(data => ({ type: 'shippingOrders', data }))
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
                            setVendors(Array.isArray(data) ? data : data?.vendors || data?.agents || []);
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
                            setCountries(data?.countries || data || []);
                            break;
                        case 'shippingOrders':
                            setShippingOrders(data?.orders || data || []);
                            break;
                    }
                });
            } catch (error) {
                console.error('Failed to fetch lookup data:', error);
                hasFetchedLookupData.current = false; // Reset on error to allow retry
            }
        };
        fetchLookupData();
    }, []); // Empty dependency array - only fetch once on mount

    // Filter and sort stock list
    const filteredAndSortedStock = useMemo(() => {
        let filtered = [...stockList];

        // Apply filters
        if (selectedClient) {
            filtered = filtered.filter(item =>
                String(item.client_id || item.client) === String(selectedClient)
            );
        }
        if (selectedVessel) {
            filtered = filtered.filter(item =>
                String(item.vessel_id || item.vessel) === String(selectedVessel)
            );
        }
        if (selectedSupplier) {
            filtered = filtered.filter(item =>
                String(item.supplier_id || item.supplier) === String(selectedSupplier)
            );
        }
        if (selectedStatus) {
            filtered = filtered.filter(item =>
                String(item.stock_status) === String(selectedStatus)
            );
        }
        if (selectedWarehouse) {
            filtered = filtered.filter(item =>
                String(item.warehouse_id) === String(selectedWarehouse)
            );
        }
        if (selectedCurrency) {
            filtered = filtered.filter(item =>
                String(item.currency_id || item.currency) === String(selectedCurrency)
            );
        }

        // Apply sorting
        if (sortField) {
            filtered.sort((a, b) => {
                let aVal = a[sortField];
                let bVal = b[sortField];

                // Handle ID fields by converting to names
                if (sortField === 'client_id' || sortField === 'client') {
                    aVal = getClientName(a.client_id || a.client);
                    bVal = getClientName(b.client_id || b.client);
                } else if (sortField === 'vessel_id' || sortField === 'vessel') {
                    aVal = getVesselName(a.vessel_id || a.vessel);
                    bVal = getVesselName(b.vessel_id || b.vessel);
                } else if (sortField === 'supplier_id' || sortField === 'supplier') {
                    aVal = getSupplierName(a.supplier_id || a.supplier);
                    bVal = getSupplierName(b.supplier_id || b.supplier);
                } else if (sortField === 'warehouse_id') {
                    aVal = String(a.warehouse_id || a.stock_warehouse || "");
                    bVal = String(b.warehouse_id || b.stock_warehouse || "");
                } else if (sortField === 'currency_id' || sortField === 'currency') {
                    aVal = getCurrencyName(a.currency_id || a.currency);
                    bVal = getCurrencyName(b.currency_id || b.currency);
                } else if (sortField === 'so_number_id' || sortField === 'so_number') {
                    aVal = a.so_number_id ? getSoNumberName(a.so_number_id) : (a.so_number || a.stock_so_number || "");
                    bVal = b.so_number_id ? getSoNumberName(b.so_number_id) : (b.so_number || b.stock_so_number || "");
                } else if (sortField === 'origin_id' || sortField === 'origin') {
                    aVal = getCountryName(a.origin_id || a.origin);
                    bVal = getCountryName(b.origin_id || b.origin);
                } else if (sortField === 'ap_destination_id' || sortField === 'ap_destination') {
                    aVal = String(a.ap_destination_id || a.ap_destination || "");
                    bVal = String(b.ap_destination_id || b.ap_destination || "");
                }

                // Convert to strings for comparison
                aVal = aVal ?? "";
                bVal = bVal ?? "";
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();

                if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
                if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [stockList, selectedClient, selectedVessel, selectedSupplier, selectedStatus, selectedWarehouse, selectedCurrency, sortField, sortDirection, clients, vessels, vendors, locations, currencies, countries, shippingOrders, destinations]);

    // Handle column sorting
    const handleSort = (field) => {
        if (sortField === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            // Set new field with ascending direction
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Handle bulk edit - navigate to StockDB Main edit page with selected items' full data
    const handleBulkEdit = () => {
        const selectedIds = Array.from(selectedRows);
        if (selectedIds.length > 0) {
            // Filter the full data objects from stockList for selected items
            const selectedItemsData = stockList.filter(item => selectedIds.includes(item.id));
            // Pass current filter state so it can be restored when navigating back
            const filterState = {
                selectedClient,
                selectedVessel,
                selectedSupplier,
                selectedStatus,
                selectedWarehouse,
                selectedCurrency
            };
            history.push({
                pathname: '/admin/stock-list/main-db-edit',
                state: { selectedItems: selectedItemsData, isBulkEdit: true, filterState }
            });
        }
    };

    // Handle single item edit - navigate to StockDB Main edit page with item's full data
    const handleEditItem = (item) => {
        // Pass current filter state so it can be restored when navigating back
        const filterState = {
            selectedClient,
            selectedVessel,
            selectedSupplier,
            selectedStatus,
            selectedWarehouse,
            selectedCurrency
        };
        history.push({
            pathname: '/admin/stock-list/main-db-edit',
            state: { selectedItems: [item], isBulkEdit: false, filterState }
        });
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

    // Helper functions to get names from IDs
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

    const getVesselDestination = (vesselId, item) => {
        if (!vesselId) {
            // If no vessel_id, check item's vessel_destination field
            return item.vessel_destination ? getDestinationName(item.vessel_destination) : "-";
        }
        const vessel = vessels.find(v => String(v.id) === String(vesselId));
        if (vessel && vessel.destination) {
            // If vessel has destination, try to get its name
            return getDestinationName(vessel.destination);
        }
        // Fall back to item's vessel_destination field
        if (item.vessel_destination) {
            return getDestinationName(item.vessel_destination);
        }
        return "-";
    };

    const getVesselEta = (vesselId, item) => {
        if (!vesselId) {
            // If no vessel_id, check item's vessel_eta field
            return item.vessel_eta ? formatDate(item.vessel_eta) : "-";
        }
        const vessel = vessels.find(v => String(v.id) === String(vesselId));
        if (vessel && vessel.eta) {
            return formatDate(vessel.eta);
        }
        // Fall back to item's vessel_eta field
        if (item.vessel_eta) {
            return formatDate(item.vessel_eta);
        }
        return "-";
    };

    const getSupplierName = (supplierId) => {
        if (!supplierId) return "-";
        const vendor = vendors.find(v => String(v.id) === String(supplierId));
        return vendor ? vendor.name : `Supplier ${supplierId}`;
    };

    const getDestinationName = (destId) => {
        if (!destId) return "-";
        const destination = destinations.find(d => String(d.id) === String(destId));
        if (destination) return destination.name;
        const destByName = destinations.find(d =>
            String(d.name).toLowerCase() === String(destId).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(destId).toLowerCase()
        );
        if (destByName) return destByName.name;
        return `Dest ${destId}`;
    };

    const getCurrencyName = (currencyId) => {
        if (!currencyId) return "-";
        const currency = currencies.find(c => String(c.id) === String(currencyId) || String(c.currency_id) === String(currencyId));
        if (currency) return currency.name || currency.code || `Currency ${currencyId}`;
        if (typeof currencyId === 'string' && currencyId.length <= 5) return currencyId;
        return `Currency ${currencyId}`;
    };

    const getLocationName = (locationId) => {
        if (!locationId) return "-";
        const location = locations.find(l => String(l.id) === String(locationId) || String(l.location_id) === String(locationId));
        if (location) return location.name || location.code || `Location ${locationId}`;
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

    const getSoStatus = (item) => {
        // First try to get from shipping order if we have so_number_id
        if (item.so_number_id) {
            const so = shippingOrders.find(s => String(s.id) === String(item.so_number_id));
            if (so && so.done) {
                return so.done === "active" ? "Active" : so.done === "pending" ? "Pending POD" : so.done;
            }
        }
        // Try to get from stock_so_number
        if (item.stock_so_number) {
            const so = shippingOrders.find(s =>
                String(s.so_number || s.name || "") === String(item.stock_so_number) ||
                String(s.id) === String(item.stock_so_number)
            );
            if (so && so.done) {
                return so.done === "active" ? "Active" : so.done === "pending" ? "Pending POD" : so.done;
            }
        }
        // Fall back to item's so_status field
        return item.so_status || "-";
    };

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
            return country.name || country.code || `Country ${countryId}`;
        }

        return `Country ${countryId}`;
    };

    const getLocationOrDestinationName = (value) => {
        if (!value) return "-";
        const dest = destinations.find(d =>
            String(d.id) === String(value) ||
            String(d.name).toLowerCase() === String(value).toLowerCase() ||
            String(d.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (dest) return dest.name;
        const loc = locations.find(l =>
            String(l.id) === String(value) ||
            String(l.location_id) === String(value) ||
            String(l.name || "").toLowerCase() === String(value).toLowerCase() ||
            String(l.code || "").toLowerCase() === String(value).toLowerCase()
        );
        if (loc) return loc.name || loc.code || `Loc ${value}`;
        if (typeof value === 'string' && value.length <= 10) return value;
        return value;
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

    // Handle viewing attachments - convert base64 to blob URL to avoid navigation errors
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

    // Get status color for small badges in this summary view
    const getStatusColor = (status) => {
        switch (status) {
            case "pending":
                return "blue";      // Cornflower-style blue
            case "in_stock":
            case "stock":
                return "gray";      // Stock = Grey
            case "on_shipping":
                return "orange";    // On a Shipping Instr = Orange
            case "on_delivery":
                return "blue";      // On a Delivery Instr = theme blue
            case "in_transit":
                return "green";     // In Transit = Light Green
            case "arrived":
            case "arrived_dest":
                return "gray";      // Arrived Destination = Dark Grey
            case "shipped":
                return "orange";    // Shipped = Light Orange
            case "delivered":
                return "red";       // Delivered = Light Red
            case "irregular":
            case "irregularities":
                return "red";       // Irregularities = Red
            case "cancelled":
                return "purple";    // Cancelled = Light Purple
            default:
                return "gray";
        }
    };

    // Show loading state
    if (isLoading && stockList.length === 0) {
        return (
            <Box pt={{ base: "130px", md: "80px", xl: "80px" }} p="6">
                <Flex justify="center" align="center" h="200px">
                    <HStack spacing="4">
                        <Spinner size="xl" color="#1c4a95" />
                        <Text>Loading stock list...</Text>
                    </HStack>
                </Flex>
            </Box>
        );
    }

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

                {/* Filters and Sorting Section */}
                <Box px="25px" mb="20px">
                    <Card bg={cardBg} p="4" border="1px" borderColor={borderColor}>
                        <VStack spacing="4" align="stretch">
                            {/* Basic Filters */}
                            <Box>
                                <HStack mb="2">
                                    <Icon as={MdFilterList} color={textColor} />
                                    <Text fontSize="sm" fontWeight="600" color={textColor}>Basic Filters</Text>
                                </HStack>
                                <Flex direction={{ base: "column", md: "row" }} gap="3" wrap="wrap">
                                    {/* Client Filter */}
                                    <Box flex="1" minW="200px">
                                        <SimpleSearchableSelect
                                            value={selectedClient}
                                            onChange={(value) => setSelectedClient(value)}
                                            options={clients}
                                            placeholder="Filter by Client"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Client ${option.id}`}
                                            isLoading={isLoadingClients}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                        {selectedClient && (
                                            <Button
                                                size="xs"
                                                mt="1"
                                                leftIcon={<Icon as={MdClose} />}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setSelectedClient(null)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Vessel Filter */}
                                    <Box flex="1" minW="200px">
                                        <SimpleSearchableSelect
                                            value={selectedVessel}
                                            onChange={(value) => setSelectedVessel(value)}
                                            options={vessels}
                                            placeholder="Filter by Vessel"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Vessel ${option.id}`}
                                            isLoading={isLoadingVessels}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                        {selectedVessel && (
                                            <Button
                                                size="xs"
                                                mt="1"
                                                leftIcon={<Icon as={MdClose} />}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setSelectedVessel(null)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Supplier Filter */}
                                    <Box flex="1" minW="200px">
                                        <SimpleSearchableSelect
                                            value={selectedSupplier}
                                            onChange={(value) => setSelectedSupplier(value)}
                                            options={vendors}
                                            placeholder="Filter by Supplier"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || `Supplier ${option.id}`}
                                            isLoading={isLoadingSuppliers}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                        {selectedSupplier && (
                                            <Button
                                                size="xs"
                                                mt="1"
                                                leftIcon={<Icon as={MdClose} />}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setSelectedSupplier(null)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Status Filter */}
                                    <Box flex="1" minW="200px">
                                        <Select
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                            placeholder="Filter by Status"
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        >
                                            <option value="">All Statuses</option>
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
                                        {selectedStatus && (
                                            <Button
                                                size="xs"
                                                mt="1"
                                                leftIcon={<Icon as={MdClose} />}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setSelectedStatus("")}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Warehouse Filter */}
                                    <Box flex="1" minW="200px">
                                        <SimpleSearchableSelect
                                            value={selectedWarehouse}
                                            onChange={(value) => setSelectedWarehouse(value)}
                                            options={locations}
                                            placeholder="Filter by Warehouse"
                                            displayKey="name"
                                            valueKey="id"
                                            formatOption={(option) => option.name || option.code || `Warehouse ${option.id}`}
                                            isLoading={isLoadingWarehouses}
                                            bg={inputBg}
                                            color={inputText}
                                            borderColor={borderColor}
                                        />
                                        {selectedWarehouse && (
                                            <Button
                                                size="xs"
                                                mt="1"
                                                leftIcon={<Icon as={MdClose} />}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setSelectedWarehouse(null)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </Box>

                                    {/* Currency Filter */}
                                    <Box flex="1" minW="200px">
                                        <SimpleSearchableSelect
                                            value={selectedCurrency}
                                            onChange={(value) => setSelectedCurrency(value)}
                                            options={currencies}
                                            placeholder="Filter by Currency"
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
                                        {selectedCurrency && (
                                            <Button
                                                size="xs"
                                                mt="1"
                                                leftIcon={<Icon as={MdClose} />}
                                                colorScheme="red"
                                                variant="ghost"
                                                onClick={() => setSelectedCurrency(null)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </Box>
                                </Flex>

                                {/* Clear All Filters Button */}
                                {(selectedClient || selectedVessel || selectedSupplier || selectedStatus || selectedWarehouse || selectedCurrency) && (
                                    <Button
                                        size="sm"
                                        mt="3"
                                        leftIcon={<Icon as={MdClose} />}
                                        colorScheme="red"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedClient(null);
                                            setSelectedVessel(null);
                                            setSelectedSupplier(null);
                                            setSelectedStatus("");
                                            setSelectedWarehouse(null);
                                            setSelectedCurrency(null);
                                        }}
                                    >
                                        Clear All Filters
                                    </Button>
                                )}
                            </Box>

                            {/* Results Count */}
                            <Text fontSize="sm" color={tableTextColorSecondary}>
                                Showing {filteredAndSortedStock.length} of {stockList.length} stock items
                                {(selectedClient || selectedVessel || selectedSupplier || selectedStatus || selectedWarehouse || selectedCurrency) && " (filtered)"}
                            </Text>
                        </VStack>
                    </Card>
                </Box>

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
                            onClick={handleBulkEdit}
                            isDisabled={!isAuthorizedToEdit}
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

                {/* Table Container */}
                <Box pr="25px" overflowX="auto">
                    {filteredAndSortedStock.length > 0 && (
                        <Table
                            variant="unstyled"
                            size="sm"
                            minW="5000px"
                            ml="25px"
                        >
                            <Thead bg={tableHeaderBg}>
                                <Tr>
                                    <Th borderRight="1px" borderColor={tableBorderColor} py="12px" px="8px" fontSize="12px" fontWeight="600" color={tableTextColor} textTransform="uppercase" width="40px" minW="40px" maxW="40px">
                                        <Checkbox
                                            isChecked={filteredAndSortedStock.length > 0 && filteredAndSortedStock.every(item => selectedRows.has(item.id))}
                                            isIndeterminate={filteredAndSortedStock.some(item => selectedRows.has(item.id)) && !filteredAndSortedStock.every(item => selectedRows.has(item.id))}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            size="sm"
                                            isDisabled={!isAuthorizedToEdit}
                                        />
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("stock_item_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        STOCKITEMID {sortField === "stock_item_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("sl_create_date")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SL CREATE DATE {sortField === "sl_create_date" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("client_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        CLIENT {sortField === "client_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("vessel_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        VESSEL {sortField === "vessel_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("so_number_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SO NUMBER {sortField === "so_number_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("si_number")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SI NUMBER {sortField === "si_number" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("si_combined")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SI COMBINED {sortField === "si_combined" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("di_number")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        DI NUMBER {sortField === "di_number" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("stock_status")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        STOCK STATUS {sortField === "stock_status" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("supplier_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SUPPLIER {sortField === "supplier_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("po_number")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        PO NUMBER {sortField === "po_number" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>EXTRA 2</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("origin_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        ORIGIN {sortField === "origin_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>HUB 1</Th>
                                    <Th {...headerProps}>HUB 2</Th>
                                    <Th {...headerProps}>AP DESTINATION</Th>
                                    <Th {...headerProps}>DESTINATION</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("warehouse_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        WAREHOUSE ID {sortField === "warehouse_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>SHIPPING DOC</Th>
                                    <Th {...headerProps}>EXPORT DOC</Th>
                                    <Th {...headerProps}>REMARKS</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("date_on_stock")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        DATE ON STOCK {sortField === "date_on_stock" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("exp_ready_in_stock")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        EXP READY IN STOCK {sortField === "exp_ready_in_stock" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("shipped_date")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SHIPPED DATE {sortField === "shipped_date" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("delivered_date")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        DELIVERED DATE {sortField === "delivered_date" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>DG/UN NUMBER</Th>
                                    <Th {...headerProps}>ITEMS</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("weight_kg")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        WEIGHT KG {sortField === "weight_kg" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("length_cm")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        LENGTH CM {sortField === "length_cm" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("width_cm")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        WIDTH CM {sortField === "width_cm" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("height_cm")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        HEIGHT CM {sortField === "height_cm" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>VOLUME NO DIM</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("volume_cbm")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        VOLUME CBM {sortField === "volume_cbm" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>LWH TEXT</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("cw_freight")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        CW AIRFREIGHT {sortField === "cw_freight" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("value")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        VALUE {sortField === "value" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("currency_id")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        CURRENCY {sortField === "currency_id" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>CLIENT ACCESS</Th>
                                    <Th {...headerProps}>PIC</Th>
                                    <Th {...headerProps}>SO STATUS</Th>
                                    <Th {...headerProps}>VESSEL DEST</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("vessel_eta")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        VESSEL ETA {sortField === "vessel_eta" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("sl_create_datetime")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SL CREATE DATE TIMESTAMP {sortField === "sl_create_datetime" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>FILES</Th>
                                    <Th {...headerProps}>ACTIONS</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {filteredAndSortedStock.map((item, index) => (
                                    <Tr
                                        key={item.id}
                                        bg={index % 2 === 0 ? tableRowBg : tableRowBgAlt}
                                        borderBottom="1px"
                                        borderColor={tableBorderColor}
                                    >
                                        <Td borderRight="1px" borderColor={tableBorderColor} py="12px" px="8px" width="40px" minW="40px" maxW="40px">
                                            <Checkbox
                                                isChecked={selectedRows.has(item.id)}
                                                onChange={(e) => handleRowSelect(item.id, e.target.checked)}
                                                size="sm"
                                                isDisabled={!isAuthorizedToEdit}
                                            />
                                        </Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.stock_item_id)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.sl_create_date || item.sl_create_datetime)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getClientName(item.client_id || item.client)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getVesselName(item.vessel_id || item.vessel)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : renderText(item.so_number))}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.si_combined || item.shipping_instruction_id || item.stock_shipping_instruction)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction)}</Text></Td>
                                        <Td {...cellProps}>
                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                {renderText(item.stock_status)}
                                            </Badge>
                                        </Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.po_text || item.po_number)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.extra_2 || item.extra)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getCountryName(item.origin_id || item.origin)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub2)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.ap_destination_id || item.ap_destination || "-"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.destination_id || item.destination || item.stock_destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.warehouse_id || item.stock_warehouse || "-"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.date_on_stock)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.exp_ready_in_stock)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.details || item.item_desc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.weight_kg ?? item.weight_kgs)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.length_cm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.width_cm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.height_cm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_no_dim || item.volume_dim)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.volume_cbm)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.lwh_text)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.cw_freight || item.cw_airfreight)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.value)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.client_access ? "Yes" : "No"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.pic)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getSoStatus(item)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getVesselDestination(item.vessel_id || item.vessel, item)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getVesselEta(item.vessel_id || item.vessel, item)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDateTime(item.sl_create_datetime)}</Text></Td>
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
                                                aria-label="Edit"
                                                onClick={() => handleEditItem(item)}
                                                isDisabled={!isAuthorizedToEdit}
                                                title={!isAuthorizedToEdit ? "Only Igor and Martin can edit" : "Edit item"}
                                            />
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    )}

                    {!isLoading && filteredAndSortedStock.length === 0 && (
                        <Box textAlign="center" py="16" px="25px">
                            <VStack spacing="4">
                                <Text color={tableTextColor} fontSize="lg" fontWeight="600">
                                    No stock items available yet
                                </Text>
                                <Text color={tableTextColorSecondary} fontSize="sm" maxW="520px">
                                    No stock items found.
                                </Text>
                            </VStack>
                        </Box>
                    )}
                </Box>

            </Card>
        </Box>
    );
} 
