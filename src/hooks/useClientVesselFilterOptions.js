import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getVessels } from "../api/vessels";
import {
  getVesselsForClient,
  mergeSelectedVesselOption,
  resolveRelationId,
} from "../views/admin/shipping-order/shippingOrderUtils";

/**
 * Vessel dropdown options scoped to a selected client (falls back to all vessels when no client).
 */
export function useClientVesselFilterOptions(client, selectedVessel, allVessels = []) {
  const clientId = resolveRelationId(client);
  const [clientVessels, setClientVessels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const timerRef = useRef(null);
  const onSearchChange = useCallback((text) => {
    clearTimeout(timerRef.current);
    const next = String(text ?? "").trim();
    timerRef.current = setTimeout(() => setQuery(next), 400);
  }, []);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => setQuery(""), [clientId]);

  useEffect(() => {
    if (!clientId) {
      setClientVessels([]);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const response = await getVessels({
          client_id: clientId,
          ...(query ? { search: query } : {}),
          page_size: 500,
          sort_by: "name",
          sort_order: "asc",
        });
        if (!cancelled) {
          setClientVessels(Array.isArray(response?.vessels) ? response.vessels : []);
        }
      } catch (_error) {
        if (!cancelled) {
          setClientVessels(
            getVesselsForClient(allVessels, clientId).filter(
              (v) => !query || String(v.name || "").toLowerCase().includes(query.toLowerCase())
            )
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, allVessels, query]);

  const vesselOptions = useMemo(() => {
    if (!clientId) return Array.isArray(allVessels) ? allVessels : [];
    const baseList =
      clientVessels.length > 0 || !isLoading
        ? clientVessels
        : getVesselsForClient(allVessels, clientId);
    return mergeSelectedVesselOption(baseList, selectedVessel, allVessels);
  }, [allVessels, clientId, clientVessels, isLoading, selectedVessel]);

  return {
    vesselOptions,
    isLoadingVessels: Boolean(clientId && isLoading),
    onVesselSearchChange: onSearchChange,
  };
}
