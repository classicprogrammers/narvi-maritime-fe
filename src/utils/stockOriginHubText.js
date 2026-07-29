/** Origin + HUB free-text fields (airport codes) — always stored/displayed in uppercase. */
export function normalizeStockOriginHubText(value) {
  if (value == null || value === "") return "";
  return String(value).toUpperCase();
}

export function isStockOriginHubFormField(field) {
  return (
    field === "origin_text" ||
    field === "viaHub" ||
    field === "viaHub1" ||
    field === "viaHub2"
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
