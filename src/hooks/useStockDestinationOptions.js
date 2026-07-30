import { useCallback, useEffect, useRef, useState } from "react";
import { getStockListOptionsApi } from "../api/stock";
import { normalizeStockDestinationOptions } from "../utils/stockDestinationOptions";
import { normalizeStockIdNameOptions } from "../utils/stockLocationOptions";

export default function useStockDestinationOptions() {
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [viaHub1Options, setViaHub1Options] = useState([]);
  const [viaHub2Options, setViaHub2Options] = useState([]);
  const [narviApDestinationOptions, setNarviApDestinationOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qDestination, setQDestination] = useState("");
  const [qViaHub1, setQViaHub1] = useState("");
  const [qViaHub2, setQViaHub2] = useState("");
  const [qNarviApDestination, setQNarviApDestination] = useState("");
  const requestIdRef = useRef(0);

  const loadOptions = useCallback(
    async ({
      q_destination,
      q_narvi_stock_via_hub1,
      q_narvi_stock_via_hub2,
      q_narvi_stock_ap_destination,
      page = 1,
      page_size = 50,
    } = {}) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      try {
        const result = await getStockListOptionsApi({
          q_destination,
          q_narvi_stock_via_hub1,
          q_narvi_stock_via_hub2,
          q_narvi_stock_ap_destination,
          page,
          page_size,
        });
        if (requestId !== requestIdRef.current) return;
        setDestinationOptions(normalizeStockDestinationOptions(result.destination_options));
        setViaHub1Options(normalizeStockIdNameOptions(result.narvi_stock_via_hub1_options));
        setViaHub2Options(normalizeStockIdNameOptions(result.narvi_stock_via_hub2_options));
        setNarviApDestinationOptions(normalizeStockIdNameOptions(result.narvi_stock_ap_destination_options));
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOptions({
        q_destination: qDestination,
        q_narvi_stock_via_hub1: qViaHub1,
        q_narvi_stock_via_hub2: qViaHub2,
        q_narvi_stock_ap_destination: qNarviApDestination,
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [qDestination, qViaHub1, qViaHub2, qNarviApDestination, loadOptions]);

  return {
    destinationOptions,
    viaHub1Options,
    viaHub2Options,
    narviApDestinationOptions,
    isLoading,
    qDestination,
    qViaHub1,
    qViaHub2,
    qNarviApDestination,
    setQDestination,
    setQViaHub1,
    setQViaHub2,
    setQNarviApDestination,
    reloadOptions: loadOptions,
  };
}
