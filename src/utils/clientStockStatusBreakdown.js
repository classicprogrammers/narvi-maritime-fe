import {
  CLIENT_PORTAL_ACTIVE_STATUS_OPTIONS,
  CLIENT_PORTAL_ARCHIVE_STATUS_OPTIONS,
  formatStockStatusLabel,
  normalizeStockStatusKey,
} from "../constants/stockStatus";

const STATUS_OPTIONS = [...CLIENT_PORTAL_ACTIVE_STATUS_OPTIONS, ...CLIENT_PORTAL_ARCHIVE_STATUS_OPTIONS];
const STATUS_ORDER = STATUS_OPTIONS.map((opt) => opt.value);

/** Backend status variants merged into the client portal status keys. */
const STATUS_ALIASES = {
  arrived_dest: "arrived",
  arrived_destination: "arrived",
  irregularities: "irregular",
  on_a_shipping_instr: "on_shipping",
  on_a_shipping_instruction: "on_shipping",
  on_shipping_instr: "on_shipping",
  on_shipping_instruction: "on_shipping",
  shipping_instr: "on_shipping",
  on_a_delivery_instr: "on_delivery",
  on_a_delivery_instruction: "on_delivery",
  on_delivery_instr: "on_delivery",
  on_delivery_instruction: "on_delivery",
  delivery_instr: "on_delivery",
};

const toClientStatusKey = (status) => {
  const key = normalizeStockStatusKey(status);
  return STATUS_ALIASES[key] || key;
};

/**
 * Count client stock rows per status for the dashboard "Jobs by Status" pie.
 * Mirrors the client Stock Report: cancelled rows are excluded and status
 * variants (e.g. arrived_dest) are merged. Returns [{ key, label, count }]
 * in client portal status order, only for statuses that occur.
 */
export function buildClientStockStatusBreakdown(stockList) {
  const counts = new Map();
  (Array.isArray(stockList) ? stockList : []).forEach((item) => {
    const key = toClientStatusKey(item?.stock_status);
    if (!key || key === "cancelled") return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const rank = (key) => {
    const index = STATUS_ORDER.indexOf(key);
    return index === -1 ? STATUS_ORDER.length : index;
  };

  return Array.from(counts.entries())
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, count]) => ({ key, label: formatStockStatusLabel(key, STATUS_OPTIONS), count }));
}
