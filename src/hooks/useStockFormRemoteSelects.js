import { useCallback, useEffect, useRef, useState } from "react";
import { getCustomersApi } from "../api/customer";
import { getSuppliers } from "../api/suppliers";
import vesselsAPI from "../api/vessels";
import { getShippingOrders } from "../api/shippingOrders";
import { mergeSelectedIntoOptions, mergeShippingOrderLists } from "../utils/stockFormSelectUtils";
import { resolveShippingOrderSoIdApiParam, getSoNumberSearchKeyFromField } from "../utils/shippingOrderListState";

const PAGE_SIZE = 50;
const DEBOUNCE_MS = 300;

function useDebouncedFn(fn, delayMs = DEBOUNCE_MS) {
  const timerRef = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  return useCallback(
    (...args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs]
  );
}

/**
 * Server-side search for stock add/edit form dropdowns (client, vessel, supplier, SO).
 * Master cache lists are used as fallbacks for labels and pre-selected values.
 */
export default function useStockFormRemoteSelects({
  masterClients = [],
  masterSuppliers = [],
  masterVessels = [],
  onVesselsLoaded,
} = {}) {
  const [clientSearchOptions, setClientSearchOptions] = useState(null);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const [supplierSearchOptions, setSupplierSearchOptions] = useState(null);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  const [shippingOrders, setShippingOrders] = useState([]);
  const [isLoadingShippingOrders, setIsLoadingShippingOrders] = useState(false);
  const soRequestGenRef = useRef(0);
  const pinnedOrdersRef = useRef([]);

  const [vesselOptionsByClientId, setVesselOptionsByClientId] = useState({});
  const [isLoadingVesselByClient, setIsLoadingVesselByClient] = useState({});
  const vesselFetchKeyRef = useRef({});
  const vesselRequestGenRef = useRef({});
  const initialPrefetchDoneRef = useRef(false);

  const clientsReadyRef = useRef(false);
  const suppliersReadyRef = useRef(false);
  const shippingOrdersReadyRef = useRef(false);
  const lastClientSearchRef = useRef("");
  const lastSupplierSearchRef = useRef("");
  const lastSoSearchRef = useRef("");
  const lastVesselSearchByKeyRef = useRef({});
  const vesselReadyKeysRef = useRef(new Set());

  const shouldFetchForSearch = useCallback((trimmed, readyRef, lastSearchRef) => {
    if (trimmed !== "") {
      lastSearchRef.current = trimmed;
      return true;
    }
    if (readyRef.current && lastSearchRef.current === "") {
      return false;
    }
    lastSearchRef.current = "";
    return true;
  }, []);

  const fetchClients = useCallback(async (search = "") => {
    setIsLoadingClients(true);
    try {
      const result = await getCustomersApi({
        search: String(search ?? "").trim(),
        page: 1,
        page_size: PAGE_SIZE,
      });
      const list = Array.isArray(result?.customers) ? result.customers : [];
      setClientSearchOptions(list);
      clientsReadyRef.current = true;
    } catch (error) {
      console.error("Stock form client search failed:", error);
      setClientSearchOptions([]);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  const scheduleClientSearch = useDebouncedFn((q) => {
    fetchClients(q);
  });

  const handleClientSearchChange = useCallback(
    (q) => {
      const trimmed = String(q ?? "").trim();
      if (!shouldFetchForSearch(trimmed, clientsReadyRef, lastClientSearchRef)) {
        return;
      }
      scheduleClientSearch(q);
    },
    [scheduleClientSearch, shouldFetchForSearch]
  );

  const ensureClientOptionsLoaded = useCallback(() => {
    if (!clientsReadyRef.current) {
      fetchClients("");
    }
  }, [fetchClients]);

  const getClientOptionsForValue = useCallback(
    (selectedId) => {
      const base = clientSearchOptions !== null ? clientSearchOptions : masterClients;
      return mergeSelectedIntoOptions(base, selectedId, masterClients);
    },
    [clientSearchOptions, masterClients]
  );

  const fetchSuppliers = useCallback(async (search = "") => {
    setIsLoadingSuppliers(true);
    try {
      const result = await getSuppliers({
        search: String(search ?? "").trim(),
        page: 1,
        page_size: PAGE_SIZE,
      });
      const list = Array.isArray(result?.suppliers) ? result.suppliers : [];
      setSupplierSearchOptions(list);
      suppliersReadyRef.current = true;
    } catch (error) {
      console.error("Stock form supplier search failed:", error);
      setSupplierSearchOptions([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  const scheduleSupplierSearch = useDebouncedFn((q) => {
    fetchSuppliers(q);
  });

  const handleSupplierSearchChange = useCallback(
    (q) => {
      const trimmed = String(q ?? "").trim();
      if (!shouldFetchForSearch(trimmed, suppliersReadyRef, lastSupplierSearchRef)) {
        return;
      }
      scheduleSupplierSearch(q);
    },
    [scheduleSupplierSearch, shouldFetchForSearch]
  );

  const ensureSupplierOptionsLoaded = useCallback(() => {
    if (!suppliersReadyRef.current) {
      fetchSuppliers("");
    }
  }, [fetchSuppliers]);

  const getSupplierOptionsForValue = useCallback(
    (selectedId) => {
      const base = supplierSearchOptions !== null ? supplierSearchOptions : masterSuppliers;
      return mergeSelectedIntoOptions(base, selectedId, masterSuppliers);
    },
    [supplierSearchOptions, masterSuppliers]
  );

  const applyShippingOrderResults = useCallback((list) => {
    const merged = mergeShippingOrderLists(pinnedOrdersRef.current, list);
    setShippingOrders(merged);
  }, []);

  const fetchShippingOrders = useCallback(
    async (search = "") => {
      const gen = ++soRequestGenRef.current;
      setIsLoadingShippingOrders(true);
      try {
        const response = await getShippingOrders({
          page: 1,
          page_size: PAGE_SIZE,
          search: String(search ?? "").trim(),
        });
        if (gen !== soRequestGenRef.current) return;
        const list = Array.isArray(response?.orders) ? response.orders : [];
        applyShippingOrderResults(list);
        shippingOrdersReadyRef.current = true;
      } catch (error) {
        if (gen !== soRequestGenRef.current) return;
        console.error("Stock form SO search failed:", error);
        applyShippingOrderResults([]);
      } finally {
        if (gen === soRequestGenRef.current) {
          shippingOrdersReadyRef.current = true;
          setIsLoadingShippingOrders(false);
        }
      }
    },
    [applyShippingOrderResults]
  );

  const scheduleShippingOrderSearch = useDebouncedFn((q) => {
    fetchShippingOrders(q);
  });

  const handleShippingOrderSearchChange = useCallback(
    (q) => {
      const trimmed = String(q ?? "").trim();
      if (!shouldFetchForSearch(trimmed, shippingOrdersReadyRef, lastSoSearchRef)) {
        return;
      }
      scheduleShippingOrderSearch(q);
    },
    [scheduleShippingOrderSearch, shouldFetchForSearch]
  );

  const ensureShippingOrderOptionsLoaded = useCallback(() => {
    if (!shippingOrdersReadyRef.current && !isLoadingShippingOrders) {
      fetchShippingOrders("");
    }
  }, [isLoadingShippingOrders, fetchShippingOrders]);

  const pinShippingOrder = useCallback(
    (order) => {
      if (!order || order.id == null) return;
      pinnedOrdersRef.current = mergeShippingOrderLists(pinnedOrdersRef.current, [order]);
      setShippingOrders((prev) => mergeShippingOrderLists(pinnedOrdersRef.current, prev));
    },
    []
  );

  const ensureShippingOrderForSelection = useCallback(
    async (recordId, { soField = null } = {}) => {
      if (recordId == null || recordId === "" || recordId === false) return;
      const sid = String(recordId);
      const inList = (list) =>
        (Array.isArray(list) ? list : []).some((o) => String(o.id) === sid);
      if (inList(shippingOrders) || inList(pinnedOrdersRef.current)) {
        return;
      }
      const knownOrders = mergeShippingOrderLists(
        pinnedOrdersRef.current,
        shippingOrders
      );
      const apiSoId = resolveShippingOrderSoIdApiParam(recordId, {
        shippingOrders: knownOrders,
        soField,
      });
      try {
        let list = [];
        if (apiSoId) {
          const bySoId = await getShippingOrders({ so_id: apiSoId, page_size: 10 });
          list = Array.isArray(bySoId?.orders) ? bySoId.orders : [];
        }
        if (!list.length) {
          const searchTerm = apiSoId || getSoNumberSearchKeyFromField(soField) || sid;
          const bySearch = await getShippingOrders({
            search: String(searchTerm),
            page_size: PAGE_SIZE,
          });
          list = Array.isArray(bySearch?.orders) ? bySearch.orders : [];
        }
        const match = list.find((o) => String(o.id) === sid) || list[0];
        if (match) {
          pinShippingOrder(match);
        }
      } catch (error) {
        console.error("Stock form resolve SO failed:", error);
      }
    },
    [shippingOrders, pinShippingOrder]
  );

  const fetchVesselsForClient = useCallback(
    async (clientId, search = "") => {
      const normalizedClientId = clientId == null || clientId === "" ? "" : String(clientId);
      const cacheKey = normalizedClientId || "__all__";
      const trimmedSearch = String(search ?? "").trim();
      const activeSearch = (lastVesselSearchByKeyRef.current[cacheKey] ?? "").trim();
      if (trimmedSearch === "" && activeSearch !== "") {
        return;
      }
      const requestKey = `${cacheKey}:${trimmedSearch}`;
      if (vesselFetchKeyRef.current[cacheKey] === requestKey) {
        return;
      }
      vesselFetchKeyRef.current[cacheKey] = requestKey;
      const gen = (vesselRequestGenRef.current[cacheKey] = (vesselRequestGenRef.current[cacheKey] || 0) + 1);
      try {
        setIsLoadingVesselByClient((prev) => ({ ...prev, [cacheKey]: true }));
        const params = {
          page_size: PAGE_SIZE,
          search: trimmedSearch,
          is_client: true,
        };
        if (normalizedClientId) {
          params.client_id = normalizedClientId;
        }
        const response = await vesselsAPI.getVessels(params);
        if (gen !== vesselRequestGenRef.current[cacheKey]) {
          return;
        }
        const clientVessels = Array.isArray(response?.vessels) ? response.vessels : [];
        setVesselOptionsByClientId((prev) => ({ ...prev, [cacheKey]: clientVessels }));
        vesselReadyKeysRef.current.add(cacheKey);
        if (typeof onVesselsLoaded === "function" && clientVessels.length) {
          onVesselsLoaded(clientVessels);
        }
      } catch (error) {
        if (gen !== vesselRequestGenRef.current[cacheKey]) {
          return;
        }
        console.error("Stock form vessel search failed:", normalizedClientId, error);
        setVesselOptionsByClientId((prev) => ({ ...prev, [cacheKey]: [] }));
      } finally {
        if (gen === vesselRequestGenRef.current[cacheKey]) {
          setIsLoadingVesselByClient((prev) => ({ ...prev, [cacheKey]: false }));
        }
      }
    },
    [onVesselsLoaded]
  );

  const scheduleVesselSearch = useDebouncedFn((clientId, q) => {
    fetchVesselsForClient(clientId, q);
  });

  const handleVesselSearchChange = useCallback(
    (clientId, q) => {
      const cacheKey = clientId == null || clientId === "" ? "__all__" : String(clientId);
      const trimmed = String(q ?? "").trim();
      const last = lastVesselSearchByKeyRef.current[cacheKey] ?? "";
      if (trimmed !== "") {
        lastVesselSearchByKeyRef.current[cacheKey] = trimmed;
        scheduleVesselSearch(clientId, q);
        return;
      }
      if (last !== "") {
        lastVesselSearchByKeyRef.current[cacheKey] = "";
        return;
      }
      if (vesselReadyKeysRef.current.has(cacheKey)) {
        return;
      }
      lastVesselSearchByKeyRef.current[cacheKey] = "";
      scheduleVesselSearch(clientId, q);
    },
    [scheduleVesselSearch]
  );

  const ensureVesselsLoadedForClient = useCallback(
    (clientId) => {
      const cacheKey = clientId == null || clientId === "" ? "__all__" : String(clientId);
      if (!vesselReadyKeysRef.current.has(cacheKey)) {
        fetchVesselsForClient(clientId, "");
      }
    },
    [fetchVesselsForClient]
  );

  const getVesselOptionsForClient = useCallback(
    (clientId, selectedVesselId) => {
      const normalizedClientId = clientId == null || clientId === "" ? "" : String(clientId);
      const cacheKey = normalizedClientId || "__all__";
      const cached = vesselOptionsByClientId[cacheKey];
      let base;
      if (Array.isArray(cached)) {
        base = cached;
      } else if (normalizedClientId) {
        base = masterVessels.filter(
          (vessel) => String(vessel.client_id ?? vessel.client ?? "") === normalizedClientId
        );
      } else {
        base = masterVessels;
      }
      return mergeSelectedIntoOptions(base, selectedVesselId, masterVessels);
    },
    [vesselOptionsByClientId, masterVessels]
  );

  const stockFormSelectDropdownProps = {
    prefillOnFocus: false,
    clearOnEmptySearch: false,
    serverSideSearch: true,
  };

  // First page on mount; typing in a field still triggers debounced search requests.
  useEffect(() => {
    if (initialPrefetchDoneRef.current) return;
    initialPrefetchDoneRef.current = true;
    fetchClients("");
    fetchSuppliers("");
    fetchShippingOrders("");
    fetchVesselsForClient("", "");
  }, [fetchClients, fetchSuppliers, fetchShippingOrders, fetchVesselsForClient]);

  return {
    shippingOrders,
    isLoadingShippingOrders,
    handleShippingOrderSearchChange,
    ensureShippingOrderOptionsLoaded,
    ensureShippingOrderForSelection,
    pinShippingOrder,
    fetchClients,
    getClientOptionsForValue,
    handleClientSearchChange,
    ensureClientOptionsLoaded,
    isLoadingClients,
    getSupplierOptionsForValue,
    handleSupplierSearchChange,
    ensureSupplierOptionsLoaded,
    isLoadingSuppliers,
    fetchVesselsForClient,
    getVesselOptionsForClient,
    handleVesselSearchChange,
    ensureVesselsLoadedForClient,
    isLoadingVesselByClient,
    stockFormSelectDropdownProps,
  };
}
