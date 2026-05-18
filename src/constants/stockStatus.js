/** Inactive/archive statuses — records have active = false on the backend */
export const ARCHIVE_STOCK_STATUSES = ["released", "shipped", "delivered", "cancelled"];

export const isArchiveStockStatus = (status) => {
  if (status == null || status === "") return false;
  const key = String(status).trim().toLowerCase();
  if (key === "blank") return true;
  return ARCHIVE_STOCK_STATUSES.includes(key);
};

/** Normalize legacy blank → released and unify key format */
export const normalizeStockStatusKey = (status) => {
  if (status == null || status === "") return "";
  let key = String(status).trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (key === "blank") return "released";
  return key;
};

const FALLBACK_LABELS = {
  released: "Released",
  pending: "Pending",
  stock: "Stock",
  on_shipping: "On Shipping Instr",
  on_delivery: "On Delivery Instr",
  in_transit: "In Transit",
  arrived: "Arrived Dest",
  shipped: "Shipped",
  delivered: "Delivered",
  irregular: "Irregularities",
  cancelled: "Cancelled",
};

export const formatStockStatusLabel = (status, options = []) => {
  const key = normalizeStockStatusKey(status);
  if (!key) return "-";
  const fromApi = options.find(
    (o) => normalizeStockStatusKey(o.value) === key || String(o.value).toLowerCase() === key
  );
  if (fromApi?.label) return fromApi.label;
  return FALLBACK_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Fallback filter dropdown options when API has not returned stock_status_options yet */
export const FALLBACK_ACTIVE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "stock", label: "Stock" },
  { value: "on_shipping", label: "On Shipping Instr" },
  { value: "on_delivery", label: "On Delivery Instr" },
  { value: "in_transit", label: "In Transit" },
  { value: "arrived", label: "Arrived Dest" },
  { value: "irregular", label: "Irregularities" },
];

export const FALLBACK_ARCHIVE_STATUS_OPTIONS = [
  { value: "released", label: "Released" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export const getStatusOptionsForActiveFilter = (stockStatusOptions, activeFilter) => {
  const showArchive = activeFilter === "false";
  if (Array.isArray(stockStatusOptions) && stockStatusOptions.length > 0) {
    const filtered = stockStatusOptions.filter((opt) =>
      showArchive ? isArchiveStockStatus(opt.value) : !isArchiveStockStatus(opt.value)
    );
    if (filtered.length > 0) return filtered;
  }
  return showArchive ? FALLBACK_ARCHIVE_STATUS_OPTIONS : FALLBACK_ACTIVE_STATUS_OPTIONS;
};

/** Always pass active explicitly when calling the stock list API */
export const resolveStockListActiveParam = (activeFilter) => {
  if (activeFilter === "false") return "false";
  if (activeFilter === "all") return "all";
  return "true";
};
