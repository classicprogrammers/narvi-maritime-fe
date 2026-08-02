/** Origin + HUB text fields — keep API/option casing as-is (trim only). */
export function normalizeStockOriginHubText(value) {
  if (value == null || value === "" || value === false) return "";
  return String(value).trim();
}

export function isStockOriginHubFormField(field) {
  return (
    field === "origin_text" ||
    field === "viaHub" ||
    field === "viaHub1" ||
    field === "viaHub2" ||
    field === "narviStockViaHub1Name" ||
    field === "narviStockViaHub2Name"
  );
}

export function isStockOriginHubBackendField(field) {
  return (
    field === "origin_text" ||
    field === "narvi_stock_via_hub1" ||
    field === "narvi_stock_via_hub2" ||
    field === "narvi_stock_ap_destination" ||
    field === "narvi_stock_destination"
  );
}

export function normalizeStockOriginHubFieldValue(field, value) {
  if (!isStockOriginHubFormField(field) && !isStockOriginHubBackendField(field)) {
    return value;
  }
  return normalizeStockOriginHubText(value);
}
