import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLedgerInvoiceIssuers } from "api/ledgerInvoice";

const DEBOUNCE_MS = 400;

// Invoice "Issued By" picker data. Use with SearchableSelect serverSideSearch.
// pin(option): keep the current value in the list even when a search does not return it.
export default function useLedgerIssuerOptions() {
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
        const list = await getLedgerInvoiceIssuers({ q: query.trim() });
        if (requestId !== requestIdRef.current) return;
        setFetched(list);
        setError(null);
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setError(e?.message || "Could not load issuers.");
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, retryTick]);

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
