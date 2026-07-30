/** Coerce a form/select value to a string id (handles { id, name } API objects). */
function coerceStockFormSelectId(value) {
  if (value == null || value === "" || value === false) return null;
  if (typeof value === "object" && value !== null && value.id != null && value.id !== false && value.id !== "") {
    return String(value.id);
  }
  return String(value);
}

/** Keep the current selection visible when it is not in the latest API search results. */
export function mergeSelectedIntoOptions(options, selectedId, masterFallback = []) {
  const list = Array.isArray(options) ? options : [];
  const fallback = Array.isArray(masterFallback) ? masterFallback : [];
  const sid = coerceStockFormSelectId(selectedId);
  if (!sid) {
    return list.length > 0 ? list : fallback;
  }
  if (list.some((o) => o && String(o.id) === sid)) {
    return list.length > 0 ? list : fallback;
  }
  const fromMaster = fallback.find((o) => o && String(o.id) === sid);
  if (fromMaster) {
    return [fromMaster, ...list];
  }
  if (list.length > 0) {
    return [{ id: sid, name: `#${sid}` }, ...list];
  }
  return [{ id: sid, name: `#${sid}` }];
}

/** Merge shipping order records so payload helpers can resolve the selected SO. */
export function mergeShippingOrderLists(...lists) {
  const merged = [];
  const seen = new Set();
  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((order) => {
      if (!order || order.id == null) return;
      const key = String(order.id);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(order);
    });
  });
  return merged;
}
