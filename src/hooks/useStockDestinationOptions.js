import { useCallback, useEffect, useRef, useState } from "react";
import { getStockListOptionsApi } from "../api/stock";
import { normalizeStockDestinationOptions } from "../utils/stockDestinationOptions";

export default function useStockDestinationOptions() {
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [apDestinationOptions, setApDestinationOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qDestination, setQDestination] = useState("");
  const [qApDestination, setQApDestination] = useState("");
  const requestIdRef = useRef(0);

  const loadOptions = useCallback(async ({ q_destination, q_ap_destination, page = 1, page_size = 50 } = {}) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const result = await getStockListOptionsApi({
        q_destination,
        q_ap_destination,
        page,
        page_size,
      });
      if (requestId !== requestIdRef.current) return;
      setDestinationOptions(normalizeStockDestinationOptions(result.destination_options));
      setApDestinationOptions(normalizeStockDestinationOptions(result.ap_destination_options));
    } catch (e) {
      if (requestId === requestIdRef.current) {
        console.error("Failed to load stock destination options:", e);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadOptions({
        q_destination: qDestination,
        q_ap_destination: qApDestination,
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [qDestination, qApDestination, loadOptions]);

  return {
    destinationOptions,
    apDestinationOptions,
    isLoading,
    qDestination,
    qApDestination,
    setQDestination,
    setQApDestination,
    reloadOptions: loadOptions,
  };
}
