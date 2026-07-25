import { useCallback, useEffect, useRef, useState } from "react";
import { getCustomersApi } from "../api/customer";
import { getSuppliers } from "../api/suppliers";
import vesselsAPI from "../api/vessels";
import { getShippingOrders } from "../api/shippingOrders";
import { mergeSelectedIntoOptions, mergeShippingOrderLists } from "../utils/stockFormSelectUtils";

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
  const initialPrefetchDoneRef = useRef(false);

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
      scheduleClientSearch(q);
    },
    [scheduleClientSearch]
  );

  const ensureClientOptionsLoaded = useCallback(() => {
    if (clientSearchOptions === null) {
      fetchClients("");
    }
  }, [clientSearchOptions, fetchClients]);

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
      scheduleSupplierSearch(q);
    },
    [scheduleSupplierSearch]
  );

  const ensureSupplierOptionsLoaded = useCallback(() => {
    if (supplierSearchOptions === null) {
      fetchSuppliers("");
    }
  }, [supplierSearchOptions, fetchSuppliers]);

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
      } catch (error) {
        if (gen !== soRequestGenRef.current) return;
        console.error("Stock form SO search failed:", error);
        applyShippingOrderResults([]);
      } finally {
        if (gen === soRequestGenRef.current) {
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
      scheduleShippingOrderSearch(q);
    },
    [scheduleShippingOrderSearch]
  );

  const ensureShippingOrderOptionsLoaded = useCallback(() => {
    if (shippingOrders.length === 0 && !isLoadingShippingOrders) {
      fetchShippingOrders("");
    }
  }, [shippingOrders.length, isLoadingShippingOrders, fetchShippingOrders]);

  const pinShippingOrder = useCallback(
    (order) => {
      if (!order || order.id == null) return;
      pinnedOrdersRef.current = mergeShippingOrderLists(pinnedOrdersRef.current, [order]);
      setShippingOrders((prev) => mergeShippingOrderLists(pinnedOrdersRef.current, prev));
    },
    []
  );

  const ensureShippingOrderForSelection = useCallback(
    async (soId) => {
      if (soId == null || soId === "" || soId === false) return;
      const sid = String(soId);
      const inList = (list) =>
        (Array.isArray(list) ? list : []).some((o) => String(o.id) === sid);
      if (inList(shippingOrders) || inList(pinnedOrdersRef.current)) {
        return;
      }
      try {
        const byId = await getShippingOrders({ so_id: soId, page_size: 10 });
        let list = Array.isArray(byId?.orders) ? byId.orders : [];
        if (!list.length) {
          const bySearch = await getShippingOrders({ search: sid, page_size: PAGE_SIZE });
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
      const requestKey = `${cacheKey}:${String(search ?? "").trim()}`;
      if (vesselFetchKeyRef.current[cacheKey] === requestKey && vesselOptionsByClientId[cacheKey]) {
        return;
      }
      vesselFetchKeyRef.current[cacheKey] = requestKey;
      try {
        setIsLoadingVesselByClient((prev) => ({ ...prev, [cacheKey]: true }));
        const params = {
          page_size: PAGE_SIZE,
          search: String(search ?? "").trim(),
          is_client: true,
        };
        if (normalizedClientId) {
          params.client_id = normalizedClientId;
        }
        const response = await vesselsAPI.getVessels(params);
        const clientVessels = Array.isArray(response?.vessels) ? response.vessels : [];
        setVesselOptionsByClientId((prev) => ({ ...prev, [cacheKey]: clientVessels }));
        if (typeof onVesselsLoaded === "function" && clientVessels.length) {
          onVesselsLoaded(clientVessels);
        }
      } catch (error) {
        console.error("Stock form vessel search failed:", normalizedClientId, error);
        setVesselOptionsByClientId((prev) => ({ ...prev, [cacheKey]: [] }));
      } finally {
        setIsLoadingVesselByClient((prev) => ({ ...prev, [cacheKey]: false }));
      }
    },
    [vesselOptionsByClientId, onVesselsLoaded]
  );

  const scheduleVesselSearch = useDebouncedFn((clientId, q) => {
    fetchVesselsForClient(clientId, q);
  });

  const handleVesselSearchChange = useCallback(
    (clientId, q) => {
      scheduleVesselSearch(clientId, q);
    },
    [scheduleVesselSearch]
  );

  const ensureVesselsLoadedForClient = useCallback(
    (clientId) => {
      const cacheKey = clientId == null || clientId === "" ? "__all__" : String(clientId);
      if (!Array.isArray(vesselOptionsByClientId[cacheKey])) {
        fetchVesselsForClient(clientId, "");
      }
    },
    [vesselOptionsByClientId, fetchVesselsForClient]
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
