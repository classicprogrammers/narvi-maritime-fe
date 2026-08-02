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
  return field === "origin_text" || field === "origin_id" || field === "via_hub" || field === "via_hub2";
}

export function normalizeStockOriginHubFieldValue(field, value) {
  if (!isStockOriginHubFormField(field) && !isStockOriginHubBackendField(field)) {
    return value;
  }
  return normalizeStockOriginHubText(value);
}
