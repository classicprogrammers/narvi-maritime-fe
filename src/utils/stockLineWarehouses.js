/**
 * Stock line items return `warehouses: [{ id, name }]` (id is `false` for legacy text-only records)
 * and `warehouse_new` (all names joined by ", "). These helpers normalize both shapes.
 */

const isPresent = (v) => v != null && v !== false && String(v).trim() !== "";

export function normalizeLineWarehouses(it) {
  if (Array.isArray(it?.warehouses)) {
    const list = it.warehouses
      .filter((w) => w && isPresent(w.name))
      .map((w) => ({ id: w.id ?? false, name: String(w.name).trim() }));
    if (list.length > 0) return list;
  }
  const raw = isPresent(it?.warehouse_new) ? it.warehouse_new : it?.warehouse_id;
  if (!isPresent(raw)) return [];
  return [{ id: false, name: String(raw) }];
}

/** Names joined by ", " — used for exports/PDF and fields that expect a single string. */
export function warehousesToJoinedText(warehouses) {
  return (warehouses || []).map((w) => w.name).join(", ");
}

/** Names one per line — for table cells (use with whiteSpace="pre-line"). */
export function warehousesToLines(warehouses, fallback = "") {
  const list = warehouses || [];
  return list.length > 0 ? list.map((w) => w.name).join("\n") : fallback;
}

/** Warehouse ids as an array of numbers (legacy text-only entries are skipped). */
export function warehouseIdsFromList(warehouses) {
  return (warehouses || [])
    .map((w) => w.id)
    .filter((id) => id !== false && id != null && Number.isFinite(Number(id)))
    .map(Number);
}
