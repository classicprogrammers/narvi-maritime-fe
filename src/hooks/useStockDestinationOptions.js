import { useCallback, useEffect, useRef, useState } from "react";
import { getStockListOptionsApi } from "../api/stock";
import { normalizeStockDestinationOptions } from "../utils/stockDestinationOptions";
import { normalizeStockIdNameOptions } from "../utils/stockLocationOptions";
import {
  normalizeIdNameFilterOptions,
  normalizeOriginFilterOptions,
  normalizeSoFilterOptions,
  normalizeValueFilterOptions,
  normalizeWarehouseFilterOptions,
  stockListOptionsFilterKey,
} from "../utils/stockListOptionFilters";

const EMPTY_EXTRA_SEARCH = {
  q_client: "",
  q_vessel: "",
  q_so: "",
  q_si_number: "",
  q_si_combined: "",
  q_di_no: "",
  q_po_text: "",
  q_req_no: "",
  q_stock_item_id: "",
  q_warehouse: "",
};

/**
 * Loads POST /api/stock/list/options.
 * Pass `filters` (the currently selected stock list filters, same names as /api/stock/list)
 * so every option list only holds values valid for the other selected filters. The endpoint is
 * called again whenever the filters or a search text change.
 */
export default function useStockDestinationOptions(filters = null) {
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [viaHub1Options, setViaHub1Options] = useState([]);
  const [viaHub2Options, setViaHub2Options] = useState([]);
  const [narviApDestinationOptions, setNarviApDestinationOptions] = useState([]);
  const [originTextOptions, setOriginTextOptions] = useState([]);
  const [clientFilterOptions, setClientFilterOptions] = useState([]);
  const [vesselFilterOptions, setVesselFilterOptions] = useState([]);
  const [soFilterOptions, setSoFilterOptions] = useState([]);
  const [siNumberFilterOptions, setSiNumberFilterOptions] = useState([]);
  const [siCombinedFilterOptions, setSiCombinedFilterOptions] = useState([]);
  const [diNoFilterOptions, setDiNoFilterOptions] = useState([]);
  const [poTextFilterOptions, setPoTextFilterOptions] = useState([]);
  const [reqNoFilterOptions, setReqNoFilterOptions] = useState([]);
  const [stockItemIdFilterOptions, setStockItemIdFilterOptions] = useState([]);
  const [warehouseFilterOptions, setWarehouseFilterOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qDestination, setQDestination] = useState("");
  const [qViaHub1, setQViaHub1] = useState("");
  const [qViaHub2, setQViaHub2] = useState("");
  const [qNarviApDestination, setQNarviApDestination] = useState("");
  const [qOriginText, setQOriginText] = useState("");
  const [extraSearch, setExtraSearch] = useState(EMPTY_EXTRA_SEARCH);
  const requestIdRef = useRef(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const filtersKey = stockListOptionsFilterKey(filters || {});

  const loadOptions = useCallback(
    async ({
      q_destination,
      q_narvi_stock_via_hub1,
      q_narvi_stock_via_hub2,
      q_narvi_stock_ap_destination,
      q_origin_text,
      page = 1,
      page_size = 50,
      ...rest
    } = {}) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const result = await getStockListOptionsApi({
          ...(filtersRef.current || {}),
          ...rest,
          q_destination,
          q_narvi_stock_via_hub1,
          q_narvi_stock_via_hub2,
          q_narvi_stock_ap_destination,
          q_origin_text,
          page,
          page_size,
        });
        if (requestId !== requestIdRef.current) return;
        setDestinationOptions(normalizeStockDestinationOptions(result.destination_options));
        setViaHub1Options(normalizeStockIdNameOptions(result.narvi_stock_via_hub1_options));
        setViaHub2Options(normalizeStockIdNameOptions(result.narvi_stock_via_hub2_options));
        setNarviApDestinationOptions(normalizeStockIdNameOptions(result.narvi_stock_ap_destination_options));
        setOriginTextOptions(normalizeOriginFilterOptions(result.origin_text_options));
        setClientFilterOptions(normalizeIdNameFilterOptions(result.client_options));
        setVesselFilterOptions(normalizeIdNameFilterOptions(result.vessel_options));
        setSoFilterOptions(normalizeSoFilterOptions(result.so_options));
        setSiNumberFilterOptions(normalizeValueFilterOptions(result.si_number_options));
        setSiCombinedFilterOptions(normalizeValueFilterOptions(result.si_combined_options));
        setDiNoFilterOptions(normalizeValueFilterOptions(result.di_no_options));
        setPoTextFilterOptions(normalizeValueFilterOptions(result.po_text_options));
        setReqNoFilterOptions(normalizeValueFilterOptions(result.req_no_options));
        setStockItemIdFilterOptions(normalizeValueFilterOptions(result.stock_item_id_options));
        setWarehouseFilterOptions(normalizeWarehouseFilterOptions(result.warehouse_options));
      } catch (e) {
        if (requestId === requestIdRef.current) {
          console.error("Failed to load stock list options:", e);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const setExtraQuery = useCallback((key, text) => {
    const value = text == null ? "" : String(text);
    setExtraSearch((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOptions({
        q_destination: qDestination,
        q_narvi_stock_via_hub1: qViaHub1,
        q_narvi_stock_via_hub2: qViaHub2,
        q_narvi_stock_ap_destination: qNarviApDestination,
        q_origin_text: qOriginText,
        ...extraSearch,
      });
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [
    qDestination,
    qViaHub1,
    qViaHub2,
    qNarviApDestination,
    qOriginText,
    extraSearch,
    filtersKey,
    loadOptions,
  ]);

  return {
    destinationOptions,
    viaHub1Options,
    viaHub2Options,
    narviApDestinationOptions,
    originTextOptions,
    clientFilterOptions,
    vesselFilterOptions,
    soFilterOptions,
    siNumberFilterOptions,
    siCombinedFilterOptions,
    diNoFilterOptions,
    poTextFilterOptions,
    reqNoFilterOptions,
    stockItemIdFilterOptions,
    warehouseFilterOptions,
    isLoading,
    qDestination,
    qViaHub1,
    qViaHub2,
    qNarviApDestination,
    qOriginText,
    setQDestination,
    setQViaHub1,
    setQViaHub2,
    setQNarviApDestination,
    setQOriginText,
    setExtraQuery,
    reloadOptions: loadOptions,
  };
}
