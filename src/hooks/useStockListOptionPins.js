import { useCallback, useRef } from "react";
import { mergeSelectedIntoOptions } from "../utils/stockFormSelectUtils";

const PIN_KEYS = ["viaHub1", "viaHub2", "apDestination", "destination", "origin"];

function emptyPinStore() {
  return PIN_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

/**
 * Keep selected stock list options visible (with names) after server search clears,
 * same pattern as client/vessel selects.
 */
export default function useStockListOptionPins() {
  const pinnedRef = useRef(emptyPinStore());

  const pinOption = useCallback((key, option) => {
    if (!option || option.id == null || option.id === "") return;
    const id = String(option.id);
    const name = String(option.name ?? option.label ?? "").trim();
    if (!name) return;
    const list = pinnedRef.current[key] || [];
    if (!list.some((o) => o && String(o.id) === id)) {
      pinnedRef.current[key] = [{ id: option.id, name }, ...list];
    }
  }, []);

  const seedOption = useCallback(
    (key, id, name) => {
      if (id == null || id === "" || id === false) return;
      pinOption(key, { id, name: String(name ?? "").trim() || `#${id}` });
    },
    [pinOption]
  );

  const getOptionsForValue = useCallback((key, searchOptions, selectedId) => {
    return mergeSelectedIntoOptions(searchOptions, selectedId, pinnedRef.current[key] || []);
  }, []);

  const findOptionById = useCallback((key, searchOptions, id) => {
    if (id == null || id === "") return null;
    const sid = String(id);
    const pools = [
      ...(Array.isArray(searchOptions) ? searchOptions : []),
      ...(pinnedRef.current[key] || []),
    ];
    return pools.find((o) => o && String(o.id) === sid) || null;
  }, []);

  return {
    pinOption,
    seedOption,
    getOptionsForValue,
    findOptionById,
  };
}
