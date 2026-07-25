/** Keep the current selection visible when it is not in the latest API search results. */
export function mergeSelectedIntoOptions(options, selectedId, masterFallback = []) {
  const list = Array.isArray(options) ? options : [];
  const fallback = Array.isArray(masterFallback) ? masterFallback : [];
  if (selectedId == null || selectedId === "" || selectedId === false) {
    return list.length > 0 ? list : fallback;
  }
  const sid = String(selectedId);
  if (list.some((o) => o && String(o.id) === sid)) {
    return list.length > 0 ? list : fallback;
  }
  const fromMaster = fallback.find((o) => o && String(o.id) === sid);
  if (fromMaster) {
    return [fromMaster, ...list];
  }
  if (list.length > 0) {
    return [{ id: selectedId, name: `#${selectedId}` }, ...list];
  }
  return [{ id: selectedId, name: `#${selectedId}` }];
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
