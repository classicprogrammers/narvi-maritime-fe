export const SHIPMENT_TYPE_OPTIONS = [
  { id: "export", name: "Export" },
  { id: "import_dob", name: "Import / DOB" },
  { id: "both", name: "Both" },
];

/** Options of the tariff filters: "Both" is not a choice there, no filter already means everything. */
export const TARIFF_SHIPMENT_TYPE_OPTIONS = SHIPMENT_TYPE_OPTIONS.filter((option) => option.id !== "both");

/** Normalises `shipment_type_options` ([{value, label}]) and falls back to the fixed list. */
export function normalizeShipmentTypeOptions(raw) {
  if (!Array.isArray(raw) || !raw.length) return SHIPMENT_TYPE_OPTIONS;
  return raw
    .map((option) => ({
      id: String(option?.value ?? option?.id ?? ""),
      name: option?.label ?? option?.name ?? "",
    }))
    .filter((option) => option.id);
}

export function shipmentTypeLabel(value, label) {
  if (label) return label;
  return SHIPMENT_TYPE_OPTIONS.find((option) => option.id === value)?.name || "";
}

/** Same tag without characters Excel does not allow in a sheet name (: \ / ? * [ ]). */
export function shipmentTypeSheetLabel(value) {
  return shipmentTypeScope(value).replace(/\s*[:\\/?*[\]]\s*/g, "-");
}

/** Short tag for exports and titles: "Export", "Import / DOB" or "" when no type is selected. */
export function shipmentTypeScope(value) {
  return TARIFF_SHIPMENT_TYPE_OPTIONS.find((option) => option.id === value)?.name || "";
}
