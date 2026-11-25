import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createLatestGuard } from "utils/searchableSelect";

// The page provides a callback; any loaded response carrying `available_fy` reports it (no per-tab wiring).
export const DashboardMetaContext = createContext(null);

// Loads one dashboard. Only the latest response is applied (changing params quickly never shows an older result).
// fetcher: (params) => Promise<normalised data>. Params are compared by JSON.stringify key.
export default function useLedgerDashboard(fetcher, params, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, isLoading: false, error: null });
  const [reloadTick, setReloadTick] = useState(0);
  const onAvailableFy = useContext(DashboardMetaContext);
  const onAvailableFyRef = useRef(onAvailableFy);
  onAvailableFyRef.current = onAvailableFy;
  const guardRef = useRef(null);
  if (!guardRef.current) guardRef.current = createLatestGuard();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const paramsKey = useMemo(() => JSON.stringify(params ?? null), [params]);

  useEffect(() => {
    const guard = guardRef.current;
    if (!enabled) {
      guard.invalidate();
      setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
      return;
    }
    const token = guard.next();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    Promise.resolve()
      .then(() => fetcherRef.current(paramsRef.current))
      .then((data) => {
        if (!guard.isLatest(token)) return;
        setState({ data, isLoading: false, error: null });
        if (data?.available_fy) onAvailableFyRef.current?.(data.available_fy);
      })
      .catch((error) => {
        if (!guard.isLatest(token)) return;
        setState((prev) => ({ ...prev, isLoading: false, error }));
      });
    // paramsKey stands in for params; reloadTick re-runs the same request
  }, [paramsKey, enabled, reloadTick]);

  // Ignore late responses once the owning tab unmounts
  useEffect(() => {
    const guard = guardRef.current;
    return () => guard.invalidate();
  }, []);

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), []);

  return { data: state.data, isLoading: state.isLoading, error: state.error, reload };
}
