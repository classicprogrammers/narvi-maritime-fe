import { useEffect, useRef, useState } from "react";
import { previewLedgerRoe, previewLedgerDueDate } from "api/ledgerShared";
import { getLocalTodayIso } from "components/forms/DmyDateInput";

const DEBOUNCE_MS = 300;

// Debounced preview call; stale responses are ignored. Returns { data, isLoading, error }.
const useDebouncedPreview = (enabled, depsKey, run) => {
  const [state, setState] = useState({ data: null, isLoading: false, error: null });
  const requestIdRef = useRef(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    if (!enabled) {
      setState({ data: null, isLoading: false, error: null });
      return undefined;
    }
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const data = await runRef.current();
        if (requestId !== requestIdRef.current) return;
        setState({ data, isLoading: false, error: null });
      } catch (e) {
        if (requestId !== requestIdRef.current) return;
        setState({ data: null, isLoading: false, error: e?.message || "Preview failed" });
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, depsKey]);

  return state;
};

// kind: "cost" | "invoice". Date falls back to today. enabled should be true only while ROE is auto.
export const useLedgerRoePreview = ({ kind, currencyId, date, enabled = true }) => {
  const on = Boolean(enabled && currencyId);
  const day = date || getLocalTodayIso();
  return useDebouncedPreview(on, `${kind}|${currencyId}|${day}`, () =>
    previewLedgerRoe({ kind, currency_id: Number(currencyId), date: day })
  );
};

export const useLedgerDueDatePreview = ({ partnerId, date, enabled = true }) => {
  const on = Boolean(enabled && partnerId && date);
  return useDebouncedPreview(on, `${partnerId}|${date}`, () =>
    previewLedgerDueDate({ partner_id: Number(partnerId), date })
  );
};
