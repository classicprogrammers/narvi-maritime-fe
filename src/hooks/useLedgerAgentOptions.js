import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLedgerAgentOptions } from "api/ledgerShared";

const DEBOUNCE_MS = 300;

// Agent picker data for the ledger screens. Use with SimpleSearchableSelect serverSideSearch.
// pin(option): keep the current value in the list even when a search does not return it.
export default function useLedgerAgentOptions({ limit = 30 } = {}) {
  const [fetched, setFetched] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await getLedgerAgentOptions({ q: query.trim(), limit });
        if (requestId !== requestIdRef.current) return;
        setFetched(list);
        setError(null);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e?.message || "Could not load agents.");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, limit, retryTick]);

  const onSearchChange = useCallback((text) => setQuery(String(text ?? "")), []);
  const retry = useCallback(() => setRetryTick((n) => n + 1), []);

  const pin = useCallback((option) => {
    if (!option || option.id == null) return;
    setPinned((prev) =>
      prev.some((o) => String(o.id) === String(option.id)) ? prev : [...prev, option]
    );
  }, []);

  const options = useMemo(() => {
    const ids = new Set(fetched.map((o) => String(o.id)));
    return [...fetched, ...pinned.filter((o) => !ids.has(String(o.id)))];
  }, [fetched, pinned]);

  return { options, isLoading, error, onSearchChange, pin, retry };
}
