import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads the cascading filter dropdowns of a tariff screen. The backend narrows every
 * dropdown to the currently selected filters, so we refetch whenever `payload` changes.
 * Typeahead queries (q_*) are debounced and sent alongside the selected filters.
 */
export default function useTariffOptions({ fetchOptions, payload, parse, initial }) {
  const [options, setOptions] = useState(initial);
  const [loading, setLoading] = useState(false);
  const queriesRef = useRef({});
  const requestIdRef = useRef(0);
  const timerRef = useRef(null);
  const payloadRef = useRef(payload);
  const parseRef = useRef(parse);
  payloadRef.current = payload;
  parseRef.current = parse;
  const payloadKey = JSON.stringify(payload);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const body = { ...payloadRef.current };
      Object.entries(queriesRef.current).forEach(([key, value]) => {
        if (value) body[key] = value;
      });
      const result = await fetchOptions(body);
      if (requestId !== requestIdRef.current) return;
      setOptions(parseRef.current(result || {}));
    } catch (error) {
      // Keep the previous options; the list itself still works without them.
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [fetchOptions]);

  useEffect(() => {
    queriesRef.current = {};
    load();
  }, [payloadKey, load]);

  const onSearch = useCallback(
    (queryKey, query) => {
      queriesRef.current = { ...queriesRef.current, [queryKey]: (query || "").trim() };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(load, 300);
    },
    [load]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { options, loading, onSearch };
}
