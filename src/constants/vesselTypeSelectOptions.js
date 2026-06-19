/** Structured vessel type options (mirrors backend vessel_type_selec). */
export const VESSEL_TYPE_SELEC_OPTIONS = [
  { value: "bulk_carriers", label: "Bulk Carriers" },
  { value: "general_cargo_ship", label: "General Cargo Ship" },
  { value: "container_ship", label: "Container Ship" },
  { value: "ro_ro", label: "Ro-Ro (Roll on/Roll off)" },
  { value: "car_carrier_pctc", label: "Car Carrier (PCTC)" },
  { value: "multipurpose_vessel_mpp", label: "Multipurpose Vessel (MPP)" },
  { value: "reefer_vessel", label: "Reefer Vessel" },
  { value: "heavy_lift_vessel", label: "Heavy Lift Vessel" },
  { value: "chemical_tanker", label: "Chemical Tanker" },
  { value: "crude_oil_tanker", label: "Crude Oil Tanker" },
  { value: "product_tanker", label: "Product Tanker" },
  { value: "lpg_carrier", label: "LPG Carrier" },
  { value: "lpn_carrier", label: "LPN Carrier" },
  { value: "livestock_carrier", label: "Livestock Carrier" },
  { value: "offshore_supply_vessel", label: "Offshore Supply Vessel" },
];

export const normalizeVesselTypeSelec = (value) => {
  if (value == null || value === false || value === "") return "";
  return String(value);
};

export const getVesselTypeSelecLabel = (value, options = VESSEL_TYPE_SELEC_OPTIONS) => {
  const key = normalizeVesselTypeSelec(value);
  if (!key) return "";
  const match = options.find((opt) => opt.value === key);
  return match?.label || key;
};
