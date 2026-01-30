import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
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
    Collapse,
} from "@chakra-ui/react";
import { MdRefresh, MdEdit, MdFilterList, MdClose, MdVisibility, MdSearch, MdNumbers, MdDescription, MdSort, MdDownload, MdClear } from "react-icons/md";
import { useStock } from "../../../redux/hooks/useStock";
import { Checkbox, Input, Select, InputGroup, InputLeftElement, InputRightElement, Divider } from "@chakra-ui/react";
import { useHistory, useLocation } from "react-router-dom";
import { useUser } from "../../../redux/hooks/useUser";
import locationsAPI from "../../../api/locations";
import { getShippingOrders } from "../../../api/shippingOrders";
import { useMasterData } from "../../../hooks/useMasterData";
import SimpleSearchableSelect from "../../../components/forms/SimpleSearchableSelect";
import { getStockItemAttachmentsApi, downloadStockItemAttachmentApi } from "../../../api/stock";

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
        count,
        total_count: reduxTotalCount,
        page: reduxPage,
        page_size: reduxPageSize,
        total_pages: reduxTotalPages,
        has_next: reduxHasNext,
        has_previous: reduxHasPrevious,
    } = useStock();

    const { user } = useUser();
    const { clients, vessels, agents: vendors, countries, destinations, currencies } = useMasterData();

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

    // Dimensions modal state
    const { isOpen: isDimensionsModalOpen, onOpen: onDimensionsModalOpen, onClose: onDimensionsModalClose } = useDisclosure();
    const [selectedDimensions, setSelectedDimensions] = useState([]);

    // View selected items modal state (legacy - currently using filter table instead)
    const { isOpen: isViewModalOpen, onOpen: onViewModalOpen, onClose: onViewModalClose } = useDisclosure();

    // View selected items - filter table instead of modal
    const [isViewingSelected, setIsViewingSelected] = useState(false);

    // Filter section visibility - default to open
    const [isFiltersOpen, setIsFiltersOpen] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainFiltersOpen');
        return stored !== null ? stored === 'true' : true; // Default to true (open)
    });
    const [isLoadingAttachment, setIsLoadingAttachment] = useState(false);

    // Lookup data for IDs -> Names (clients, vessels, vendors, countries, destinations, currencies from master cache)
    const [locations, setLocations] = useState([]);
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
    const [selectedHub, setSelectedHub] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSelectedHub');
        return stored && stored !== 'null' ? stored : null;
    });
    const [filterSO, setFilterSO] = useState(() => {
        return sessionStorage.getItem('stockListMainFilterSO') || "";
    });
    const [filterSI, setFilterSI] = useState(() => {
        return sessionStorage.getItem('stockListMainFilterSI') || "";
    });
    const [filterSICombined, setFilterSICombined] = useState(() => {
        return sessionStorage.getItem('stockListMainFilterSICombined') || "";
    });
    const [filterDI, setFilterDI] = useState(() => {
        return sessionStorage.getItem('stockListMainFilterDI') || "";
    });
    // Search state
    const [searchFilter, setSearchFilter] = useState(() => {
        return sessionStorage.getItem('stockListMainSearchFilter') || "";
    });
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [hasNext, setHasNext] = useState(false);
    const [hasPrevious, setHasPrevious] = useState(false);
    const [sortBy, setSortBy] = useState("id");
    const [sortOrder, setSortOrder] = useState("desc");
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
    const [sortOption, setSortOption] = useState(() => {
        const stored = sessionStorage.getItem('stockListMainSortOption');
        return stored || 'none'; // 'none', 'via_hub', 'status', 'via_hub_status', 'via_vessel', 'via_vessel_status'
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

    // Save filter visibility state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stockListMainFiltersOpen', String(isFiltersOpen));
    }, [isFiltersOpen]);

    // Fetch stock list with pagination and search
    const fetchStockList = useCallback(() => {
        return getStockList({
            page,
            page_size: pageSize,
            sort_by: sortBy,
            sort_order: sortOrder,
            search: searchQuery,
        });
    }, [getStockList, page, pageSize, sortBy, sortOrder, searchQuery]);

    // Fetch stock list on component mount and when pagination/search changes
    useEffect(() => {
        fetchStockList().then((result) => {
            if (result?.success && result?.data) {
                setTotalCount(result.data.total_count || 0);
                setTotalPages(result.data.total_pages || 0);
                setHasNext(result.data.has_next || false);
                setHasPrevious(result.data.has_previous || false);
            }
        });
    }, [fetchStockList]);

    // Sync pagination state from Redux (as fallback)
    useEffect(() => {
        if (reduxTotalCount > 0 && totalCount === 0) {
            setTotalCount(reduxTotalCount);
        }
        if (reduxTotalPages > 0 && totalPages === 0) {
            setTotalPages(reduxTotalPages);
        }
        if (reduxHasNext !== undefined) {
            setHasNext(reduxHasNext);
        }
        if (reduxHasPrevious !== undefined) {
            setHasPrevious(reduxHasPrevious);
        }
    }, [reduxTotalCount, reduxTotalPages, reduxHasNext, reduxHasPrevious, totalCount, totalPages]);

    // Reset to first page when page size or search changes
    useEffect(() => {
        setPage(1);
    }, [pageSize, searchQuery]);

    // Handle search button click
    const handleSearch = () => {
        setSearchQuery(searchFilter.trim());
        setPage(1); // Reset to first page when searching
    };

    // Handle Enter key in search input
    const handleSearchKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    // Handle clear search
    const handleClearSearch = () => {
        setSearchFilter("");
        setSearchQuery("");
        setPage(1);
    };

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
            if (filterState.filterSO !== undefined) setFilterSO(filterState.filterSO);
            if (filterState.filterSI !== undefined) setFilterSI(filterState.filterSI);
            if (filterState.filterSICombined !== undefined) setFilterSICombined(filterState.filterSICombined);
            if (filterState.filterDI !== undefined) setFilterDI(filterState.filterDI);
            if (filterState.searchFilter !== undefined) setSearchFilter(filterState.searchFilter);
            // Clear location.state to prevent restoring on subsequent renders
            history.replace(location.pathname, {});
        }
    }, [location.state, history, location.pathname]);

    // Restore edit page when returning to this page from another tab
    useEffect(() => {
        // Only restore if we're on the main-db list page (not edit page) and not coming from edit page
        const isOnMainDbPage = location.pathname === '/admin/stock-list/main-db' || location.pathname === '/admin/stock-list/main-db/';
        const isComingFromEdit = location.state?.fromEdit === true;

        if (isOnMainDbPage && !isComingFromEdit) {
            const savedEditState = sessionStorage.getItem('stockEditState');
            if (savedEditState) {
                try {
                    const editState = JSON.parse(savedEditState);
                    // Only restore if the saved state is for 'main-db' source page
                    if (editState.sourcePage === 'main-db') {
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

    useEffect(() => {
        sessionStorage.setItem('stockListMainSelectedHub', selectedHub || 'null');
    }, [selectedHub]);

    // Persist sorting state to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('stockListMainSortField', sortField || 'null');
    }, [sortField]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSortDirection', sortDirection || 'asc');
    }, [sortDirection]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSortOption', sortOption || 'none');
    }, [sortOption]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainFilterSO', filterSO || '');
    }, [filterSO]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainFilterSI', filterSI || '');
    }, [filterSI]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainFilterSICombined', filterSICombined || '');
    }, [filterSICombined]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainFilterDI', filterDI || '');
    }, [filterDI]);

    useEffect(() => {
        sessionStorage.setItem('stockListMainSearchFilter', searchFilter || '');
    }, [searchFilter]);

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

                // Destinations and currencies come from master cache; only fetch locations and shipping orders
                const promises = [
                    locationsAPI.getLocations().catch(() => ({ locations: [] })).then(data => ({ type: 'locations', data })),
                    getShippingOrders().catch(() => ({ orders: [] })).then(data => ({ type: 'shippingOrders', data }))
                ];

                const results = await Promise.all(promises);

                results.forEach(({ type, data }) => {
                    switch (type) {
                        case 'locations':
                            setLocations(data?.locations || data || []);
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

    const addSIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("SI-")) return str;
        const withoutPrefix = str.startsWith("SI-") ? str.substring(3) : str;
        return `SI-${withoutPrefix}`;
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

    const addDIPrefix = (value) => {
        if (!value || value === "" || value === "-") return "";
        const str = String(value).trim();
        if (str === "-") return "";
        if (str.startsWith("DI-")) return str;
        const withoutPrefix = str.startsWith("DI-") ? str.substring(3) : str;
        return `DI-${withoutPrefix}`;
    };

    const getSoNumberNameFromNumber = (soNumber) => {
        if (!soNumber) return "-";
        // Try to find by so_number field
        const so = shippingOrders.find(s =>
            String(s.so_number || s.name || "") === String(soNumber) ||
            String(s.id) === String(soNumber)
        );
        return so ? (so.name || so.so_number || `SO ${soNumber}`) : `SO ${soNumber}`;
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
        return vessel ? vessel.name : String(vesselId);
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

    // Filter and sort stock list
    const filteredAndSortedStock = useMemo(() => {
        let filtered = [...stockList];

        // If viewing selected items, filter to only show selected items
        if (isViewingSelected && selectedRows.size > 0) {
            const selectedIds = Array.from(selectedRows);
            filtered = filtered.filter(item => selectedIds.includes(item.id));
        }

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
        if (selectedHub) {
            const hubLower = selectedHub.toLowerCase();
            filtered = filtered.filter(item => {
                const hub1 = String(item.via_hub || "").toLowerCase();
                const hub2 = String(item.via_hub2 || "").toLowerCase();
                return hub1 === hubLower || hub2 === hubLower;
            });
        }

        // Filter by SO Number
        if (filterSO) {
            const searchTerm = filterSO.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const soValue = item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : (item.so_number || ""));
                const prefixed = addSOPrefix(soValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by SI Number
        if (filterSI) {
            const searchTerm = filterSI.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const siValue = item.shipping_instruction_id || item.si_number || item.stock_shipping_instruction || "";
                const prefixed = addSIPrefix(siValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by SI Combined
        if (filterSICombined) {
            const searchTerm = filterSICombined.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const sicValue = item.si_combined || item.shipping_instruction_id || item.stock_shipping_instruction || "";
                const prefixed = addSICombinedPrefix(sicValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Filter by DI Number
        if (filterDI) {
            const searchTerm = filterDI.toLowerCase().trim();
            filtered = filtered.filter(item => {
                const diValue = item.delivery_instruction_id || item.di_number || item.stock_delivery_instruction || "";
                const prefixed = addDIPrefix(diValue);
                return String(prefixed || "").toLowerCase().includes(searchTerm);
            });
        }

        // Note: General search is now handled server-side via searchQuery
        // Client-side search (searchFilter) is removed since we use server-side search
        // Keeping this commented for reference:
        /*
        if (searchFilter) {
            const searchTerm = searchFilter.toLowerCase().trim();
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
        */

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
                } else if (sortField === 'origin_id' || sortField === 'origin_text') {
                    aVal = a.origin_text || getCountryName(a.origin_id);
                    bVal = b.origin_text || getCountryName(b.origin_id);
                } else if (sortField === 'ap_destination_id' || sortField === 'ap_destination') {
                    aVal = String(a.ap_destination_id || a.ap_destination || "");
                    bVal = String(b.ap_destination_id || b.ap_destination || "");
                } else if (sortField === 'days_on_stock') {
                    // Handle numeric sorting for days_on_stock
                    aVal = Number(a.days_on_stock) || 0;
                    bVal = Number(b.days_on_stock) || 0;
                    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
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

        // Apply sorting based on selected option
        if (sortOption !== 'none') {
            // Helper function to normalize status for sorting
            const normalizeStatus = (status) => {
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
                        const normalized = normalizeStatus(status);
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
                        const normalizedA = normalizeStatus(a.stock_status);
                        const normalizedB = normalizeStatus(b.stock_status);

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
    }, [stockList, selectedClient, selectedVessel, selectedSupplier, selectedStatus, selectedWarehouse, selectedCurrency, filterSO, filterSI, filterSICombined, filterDI, sortField, sortDirection, sortOption, clients, vessels, vendors, locations, currencies, countries, shippingOrders, destinations, isViewingSelected, selectedRows]);

    // Get selected items for the view modal
    const viewSelectedItems = useMemo(() => {
        if (selectedRows.size === 0) return [];
        const selectedIds = Array.from(selectedRows);
        return stockList.filter(item => selectedIds.includes(item.id));
    }, [stockList, selectedRows]);

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
                selectedCurrency,
                filterSO,
                filterSI,
                filterSICombined,
                filterDI,
                searchFilter
            };
            const editState = { selectedItems: selectedItemsData, isBulkEdit: true, filterState, sourcePage: 'main-db' };
            // Save edit state to sessionStorage for restoration when switching tabs
            sessionStorage.setItem('stockEditState', JSON.stringify(editState));
            history.push({
                pathname: '/admin/stock-list/edit-stock',
                state: editState
            });
        }
    };

    // Handle bulk view - open modal with selected items
    const handleBulkView = () => {
        // Toggle view mode - filter table to show only selected items
        setIsViewingSelected(prev => !prev);
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
        const editState = { selectedItems: [item], isBulkEdit: false, filterState, sourcePage: 'main-db' };
        // Save edit state to sessionStorage for restoration when switching tabs
        sessionStorage.setItem('stockEditState', JSON.stringify(editState));
        history.push({
            pathname: '/admin/stock-list/edit-stock',
            state: editState
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

    // Helper functions to get names from IDs (continued - functions used in table rendering)
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

    // Note: Loading state is now shown inside the table instead of blocking the entire page

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
                <Button mt="4" onClick={() => fetchStockList()} leftIcon={<Icon as={MdRefresh} />}>
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
                            onClick={() => fetchStockList()}
                            isLoading={isLoading}
                        />
                    </HStack>
                </Flex>

                {/* Filters and Sorting Section */}
                <Box px="25px" mb="20px">
                    <Card bg={cardBg} p="4" border="1px" borderColor={borderColor}>
                        <VStack spacing="4" align="stretch">
                            {/* Filter Header with Toggle Button */}
                            <HStack justify="space-between">
                                <HStack>
                                    <Icon as={MdFilterList} color="blue.500" />
                                    <Text fontSize="md" fontWeight="700" color={textColor}>Filters</Text>
                                </HStack>
                                <Button
                                    size="sm"
                                    leftIcon={<Icon as={MdFilterList} />}
                                    variant="outline"
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                >
                                    {isFiltersOpen ? "Hide Filters" : "Show Filters"}
                                </Button>
                            </HStack>

                            {/* Collapsible Filter Content */}
                            <Collapse in={isFiltersOpen} animateOpacity>
                                <VStack spacing="4" align="stretch">
                                    {/* Basic Filters */}
                                    <Box>
                                        <HStack mb="3" justify="space-between">
                                            <HStack>
                                                <Text fontSize="sm" fontWeight="600" color={textColor}>Basic Filters</Text>
                                            </HStack>
                                            <HStack>
                                                {(selectedClient || selectedVessel || selectedSupplier || selectedStatus || selectedWarehouse || selectedCurrency || selectedHub || filterSO || filterSI || filterSICombined || filterDI || searchFilter) && (
                                                    <Button
                                                        size="xs"
                                                        leftIcon={<Icon as={MdClose} />}
                                                        colorScheme="red"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedClient(null);
                                                            setSelectedVessel(null);
                                                            setSelectedSupplier(null);
                                                            setSelectedStatus("");
                                                            setSelectedWarehouse(null);
                                                            setSelectedCurrency(null);
                                                            setSelectedHub(null);
                                                            setFilterSO("");
                                                            setFilterSI("");
                                                            setFilterSICombined("");
                                                            setFilterDI("");
                                                            setSearchFilter("");
                                                        }}
                                                    >
                                                        Clear All
                                                    </Button>
                                                )}

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
                                            </HStack>

                                        </HStack>
                                        <Flex direction={{ base: "column", md: "row" }} gap="3" wrap="wrap">
                                            {/* Client Filter */}
                                            <Box w="220px">
                                                <HStack spacing="1">
                                                    <Box flex="1">
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
                                                    </Box>
                                                    {selectedClient && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedClient(null)}
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
                                                            value={selectedVessel}
                                                            onChange={(value) => setSelectedVessel(value)}
                                                            options={vessels}
                                                            placeholder="Filter by Vessel"
                                                            displayKey="name"
                                                            valueKey="id"
                                                            formatOption={(option) => option.name || String(option.id ?? "")}
                                                            isLoading={isLoadingVessels}
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                        />
                                                    </Box>
                                                    {selectedVessel && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedVessel(null)}
                                                            aria-label="Clear vessel filter"
                                                        />
                                                    )}
                                                </HStack>
                                            </Box>

                                            {/* Supplier Filter */}
                                            <Box w="220px">
                                                <HStack spacing="1">
                                                    <Box flex="1">
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
                                                    </Box>
                                                    {selectedSupplier && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedSupplier(null)}
                                                            aria-label="Clear supplier filter"
                                                        />
                                                    )}
                                                </HStack>
                                            </Box>

                                            {/* Status Filter */}
                                            <Box w="220px">
                                                <HStack spacing="1">
                                                    <Box flex="1">
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
                                                    {selectedStatus && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedStatus("")}
                                                            aria-label="Clear status filter"
                                                        />
                                                    )}
                                                </HStack>
                                            </Box>

                                            {/* Warehouse Filter */}
                                            <Box w="220px">
                                                <HStack spacing="1">
                                                    <Box flex="1">
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
                                                    </Box>
                                                    {selectedWarehouse && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedWarehouse(null)}
                                                            aria-label="Clear warehouse filter"
                                                        />
                                                    )}
                                                </HStack>
                                            </Box>

                                            {/* Currency Filter */}
                                            <Box w="220px">
                                                <HStack spacing="1">
                                                    <Box flex="1">
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
                                                    </Box>
                                                    {selectedCurrency && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedCurrency(null)}
                                                            aria-label="Clear currency filter"
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
                                                            value={filterSO}
                                                            onChange={(e) => setFilterSO(e.target.value)}
                                                            placeholder="Filter by SO Number"
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            pl="8"
                                                        />
                                                    </InputGroup>
                                                    {filterSO && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setFilterSO("")}
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
                                                            value={filterSI}
                                                            onChange={(e) => setFilterSI(e.target.value)}
                                                            placeholder="Filter by SI Number"
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            pl="8"
                                                        />
                                                    </InputGroup>
                                                    {filterSI && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setFilterSI("")}
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
                                                            value={filterSICombined}
                                                            onChange={(e) => setFilterSICombined(e.target.value)}
                                                            placeholder="Filter by SI Combined"
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            pl="8"
                                                        />
                                                    </InputGroup>
                                                    {filterSICombined && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setFilterSICombined("")}
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
                                                            value={filterDI}
                                                            onChange={(e) => setFilterDI(e.target.value)}
                                                            placeholder="Filter by DI Number"
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            pl="8"
                                                        />
                                                    </InputGroup>
                                                    {filterDI && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setFilterDI("")}
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
                                                            value={selectedHub}
                                                            onChange={(value) => setSelectedHub(value)}
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
                                                    {selectedHub && (
                                                        <IconButton
                                                            size="sm"
                                                            icon={<Icon as={MdClose} />}
                                                            colorScheme="red"
                                                            variant="ghost"
                                                            onClick={() => setSelectedHub(null)}
                                                            aria-label="Clear hub filter"
                                                        />
                                                    )}
                                                </HStack>
                                            </Box>
                                            <Box w="220px">
                                                <HStack spacing="1">
                                                    <InputGroup size="sm">
                                                        <InputLeftElement pointerEvents="none">
                                                            <Icon as={MdSearch} color="gray.400" />
                                                        </InputLeftElement>
                                                        <Input
                                                            value={searchFilter}
                                                            onChange={(e) => setSearchFilter(e.target.value)}
                                                            onKeyPress={handleSearchKeyPress}
                                                            placeholder="Search all fields..."
                                                            bg={inputBg}
                                                            color={inputText}
                                                            borderColor={borderColor}
                                                            pl="8"
                                                        />
                                                        {searchFilter && (
                                                            <InputRightElement>
                                                                <IconButton
                                                                    aria-label="Clear search"
                                                                    icon={<Icon as={MdClear} />}
                                                                    size="xs"
                                                                    variant="ghost"
                                                                    onClick={handleClearSearch}
                                                                    h="1.5rem"
                                                                    w="1.5rem"
                                                                />
                                                            </InputRightElement>
                                                        )}
                                                    </InputGroup>
                                                    <Button
                                                        size="sm"
                                                        px="10"
                                                        leftIcon={<Icon as={MdSearch} />}
                                                        colorScheme="blue"
                                                        onClick={handleSearch}
                                                        isLoading={isLoading}
                                                    >
                                                        Search
                                                    </Button>
                                                    {searchQuery && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleClearSearch}
                                                        >
                                                            Clear
                                                        </Button>
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
                                        Showing {filteredAndSortedStock.length} of {totalCount || stockList.length} stock items
                                        {(selectedClient || selectedVessel || selectedSupplier || selectedStatus || selectedWarehouse || selectedCurrency || filterSO || filterSI || filterSICombined || filterDI || searchQuery || isViewingSelected) && " (filtered)"}
                                    </Text>
                                </VStack>
                            </Collapse>
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
                            isDisabled={!isAuthorizedToEdit}
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
                    <Table
                        variant="unstyled"
                        size="sm"
                        minW="5000px"
                        ml="25px"
                    >
                        {!isLoading && (
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
                                    <Th {...headerProps}>EXPORT DOC 1</Th>
                                    <Th {...headerProps}>EXPORT DOC 2</Th>
                                    <Th {...headerProps}>REMARKS</Th>
                                    <Th {...headerProps}>INTERNAL REMARK</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("date_on_stock")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        DATE ON STOCK {sortField === "date_on_stock" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("days_on_stock")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }} textAlign="center">
                                        DAYS ON STOCK {sortField === "days_on_stock" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("exp_ready_in_stock")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        EXP READY FROM SUPPLIER {sortField === "exp_ready_in_stock" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("shipped_date")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        SHIPPED DATE {sortField === "shipped_date" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("delivered_date")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        DELIVERED DATE {sortField === "delivered_date" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>DG/UN NUMBER</Th>
                                    <Th {...headerProps}>BOXES</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("weight_kg")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        WEIGHT KG {sortField === "weight_kg" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps}>VOLUME NO DIM</Th>
                                    <Th {...headerProps}>LWH TEXT</Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("total_volume_cbm")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        TOTAL VOLUME CBM {sortField === "total_volume_cbm" && (sortDirection === "asc" ? "↑" : "↓")}
                                    </Th>
                                    <Th {...headerProps} cursor="pointer" onClick={() => handleSort("total_cw_air_freight")} _hover={{ bg: useColorModeValue("gray.100", "gray.600") }}>
                                        TOTAL CW AIR FREIGHT {sortField === "total_cw_air_freight" && (sortDirection === "asc" ? "↑" : "↓")}
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
                        )}
                        <Tbody>
                            {isLoading ? (
                                <Tr>
                                    <Td colSpan={46} textAlign="center" py="40px">
                                        <Box visibility="hidden" h="100px">
                                            {/* Placeholder to maintain table structure */}
                                        </Box>
                                    </Td>
                                </Tr>
                            ) : filteredAndSortedStock.length === 0 ? (
                                <Tr>
                                    <Td colSpan={46} textAlign="center" py="40px">
                                        <Text color={tableTextColorSecondary}>
                                            {stockList.length === 0
                                                ? "No stock items available."
                                                : "No stock items match your filter criteria."}
                                        </Text>
                                    </Td>
                                </Tr>
                            ) : (
                                filteredAndSortedStock.map((item, index) => (
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
                                        <Td {...cellProps}><Text {...cellText}>{(() => {
                                            const soValue = item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : renderText(item.so_number));
                                            const prefixed = addSOPrefix(soValue);
                                            return prefixed || "-";
                                        })()}</Text></Td>
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
                                            <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px="3" py="1">
                                                {renderText(item.stock_status)}
                                            </Badge>
                                        </Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}</Text></Td>
                                        <Td {...cellProps}>{renderMultiLineLabels(item.po_text || item.po_number)}</Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.extra_2 || item.extra)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.origin_text || getCountryName(item.origin_id) || "-"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.via_hub2)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.ap_destination_id || item.ap_destination || "-"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{getLocationOrDestinationName(item.destination_id || item.destination || item.stock_destination)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{item.warehouse_id || item.stock_warehouse || "-"}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.shipping_doc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.export_doc_2)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.remarks)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.internal_remark)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.date_on_stock)}</Text></Td>
                                        <Td {...cellProps} textAlign="center"><Text {...cellText}>{renderText(item.days_on_stock)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.exp_ready_in_stock)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.shipped_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{formatDate(item.delivered_date)}</Text></Td>
                                        <Td {...cellProps}><Text {...cellText}>{renderText(item.dg_un)}</Text></Td>
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
                                ))
                            )}
                        </Tbody>
                    </Table>

                    {/* Pagination Controls */}
                    {(totalPages > 0 || totalCount > pageSize || stockList.length >= pageSize) && (
                        <Box px="25px" mt={4}>
                            <Flex justify="space-between" align="center" py={4} flexWrap="wrap" gap={4}>
                                {/* Page Size Selector and Info */}
                                <HStack spacing={3}>
                                    <Text fontSize="sm" color="gray.600">
                                        Show
                                    </Text>
                                    <Select
                                        size="sm"
                                        w="80px"
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                    >
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={80}>80</option>
                                        <option value={100}>100</option>
                                    </Select>
                                    <Text fontSize="sm" color="gray.600">
                                        per page
                                    </Text>
                                    <Text fontSize="sm" color="gray.600" ml={2}>
                                        Showing {stockList.length} of {totalCount || stockList.length} records
                                    </Text>
                                </HStack>

                                {/* Pagination buttons */}
                                <HStack spacing={2}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPage(1)}
                                        isDisabled={!hasPrevious || page === 1}
                                    >
                                        First
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPage(page - 1)}
                                        isDisabled={!hasPrevious || page === 1}
                                    >
                                        Previous
                                    </Button>

                                    {/* Page numbers */}
                                    {totalPages > 0 && (
                                        <HStack spacing={1}>
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (page <= 3) {
                                                    pageNum = i + 1;
                                                } else if (page >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = page - 2 + i;
                                                }

                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        size="sm"
                                                        variant={page === pageNum ? "solid" : "outline"}
                                                        colorScheme={page === pageNum ? "blue" : "gray"}
                                                        onClick={() => setPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </HStack>
                                    )}

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPage(page + 1)}
                                        isDisabled={!hasNext || (totalPages > 0 && page >= totalPages)}
                                    >
                                        Next
                                    </Button>
                                    {totalPages > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setPage(totalPages)}
                                            isDisabled={!hasNext || page === totalPages}
                                        >
                                            Last
                                        </Button>
                                    )}
                                </HStack>
                            </Flex>
                        </Box>
                    )}
                </Box>

            </Card>

            {/* View Selected Items Modal */}
            <Modal isOpen={isViewModalOpen} onClose={onViewModalClose} size="6xl" scrollBehavior="inside">
                <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
                <ModalContent maxH="90vh">
                    <ModalHeader
                        fontSize="xl"
                        fontWeight="bold"
                        pb={3}
                        borderBottom="1px"
                        borderColor={useColorModeValue("gray.200", "gray.700")}
                    >
                        <HStack spacing={2}>
                            <Icon as={MdVisibility} color="green.500" />
                            <Text>View Selected Stock Items</Text>
                            {viewSelectedItems && viewSelectedItems.length > 0 && (
                                <Badge colorScheme="green" fontSize="sm" px={2} py={1} borderRadius="full">
                                    {viewSelectedItems.length} {viewSelectedItems.length === 1 ? 'Item' : 'Items'}
                                </Badge>
                            )}
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody py={6}>
                        {viewSelectedItems && viewSelectedItems.length > 0 ? (
                            <VStack spacing={4} align="stretch">
                                {viewSelectedItems.map((item, index) => (
                                    <Box
                                        key={item.id || index}
                                        p={4}
                                        border="1px"
                                        borderColor={useColorModeValue("gray.200", "gray.700")}
                                        borderRadius="lg"
                                        bg={useColorModeValue("gray.50", "gray.800")}
                                    >
                                        <HStack justify="space-between" mb={3} pb={3} borderBottom="1px" borderColor={useColorModeValue("gray.200", "gray.700")}>
                                            <HStack spacing={2}>
                                                <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                                                    Item {index + 1}
                                                </Badge>
                                                {item.stock_item_id && (
                                                    <Text fontSize="sm" fontWeight="600" color={textColor}>
                                                        Stock ID: {item.stock_item_id}
                                                    </Text>
                                                )}
                                            </HStack>
                                            {item.stock_status && (
                                                <Badge colorScheme={getStatusColor(item.stock_status)} size="sm" borderRadius="full" px={3} py={1}>
                                                    {renderText(item.stock_status)}
                                                </Badge>
                                            )}
                                        </HStack>
                                        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Client
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {getClientName(item.client_id || item.client)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Vessel
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {getVesselName(item.vessel_id || item.vessel)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Supplier
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {item.supplier_id ? getSupplierName(item.supplier_id) : renderText(item.supplier)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    SO Number
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {item.so_number_id ? getSoNumberName(item.so_number_id) : (item.stock_so_number ? getSoNumberNameFromNumber(item.stock_so_number) : renderText(item.so_number))}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    PO Number
                                                </Text>
                                                <Box>
                                                    {renderMultiLineLabels(item.po_text || item.po_number)}
                                                </Box>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Warehouse
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {item.warehouse_id || item.stock_warehouse || "-"}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Items
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {renderText(item.item || item.items || item.item_id || item.stock_items_quantity)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Weight (KG)
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {renderText(item.weight_kg ?? item.weight_kgs)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Total Volume (CBM)
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color="blue.500">
                                                    {renderText(item.total_volume_cbm)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Total CW Air Freight
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color="green.500">
                                                    {renderText(item.total_cw_air_freight)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Value
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {renderText(item.value)} {item.currency_id ? getCurrencyName(item.currency_id) : renderText(item.currency)}
                                                </Text>
                                            </Box>
                                            <Box>
                                                <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                    Date on Stock
                                                </Text>
                                                <Text fontSize="sm" fontWeight="medium" color={textColor}>
                                                    {formatDate(item.date_on_stock)}
                                                </Text>
                                            </Box>
                                            {item.remarks && (
                                                <Box gridColumn={{ base: "1", md: "1 / -1" }}>
                                                    <Text fontSize="xs" color={useColorModeValue("gray.600", "gray.400")} mb={1}>
                                                        Remarks
                                                    </Text>
                                                    <Text fontSize="sm" color={textColor} whiteSpace="pre-wrap">
                                                        {renderText(item.remarks)}
                                                    </Text>
                                                </Box>
                                            )}
                                        </Grid>
                                    </Box>
                                ))}
                            </VStack>
                        ) : (
                            <VStack spacing={4} py={8}>
                                <Icon as={MdVisibility} boxSize={12} color={useColorModeValue("gray.400", "gray.600")} />
                                <Text fontSize="lg" fontWeight="medium" color={useColorModeValue("gray.600", "gray.400")}>
                                    No items selected
                                </Text>
                            </VStack>
                        )}
                    </ModalBody>
                    <ModalFooter borderTop="1px" borderColor={useColorModeValue("gray.200", "gray.700")}>
                        <Button onClick={onViewModalClose} colorScheme="blue">
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

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
                                            </HStack>
                                        </Flex>
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
