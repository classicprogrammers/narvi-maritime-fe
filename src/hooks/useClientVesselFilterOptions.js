import { useEffect, useMemo, useState } from "react";
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
          page_size: 500,
          sort_by: "name",
          sort_order: "asc",
        });
        if (!cancelled) {
          setClientVessels(Array.isArray(response?.vessels) ? response.vessels : []);
        }
      } catch (_error) {
        if (!cancelled) {
          setClientVessels(getVesselsForClient(allVessels, clientId));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, allVessels]);

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
  };
}
