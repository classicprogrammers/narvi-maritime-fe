/** Calculate CBM from L/W/H in centimeters (up to 3 decimal places). */
export const calculateVolumeCbmFromLwhCm = (lengthCm, widthCm, heightCm) => {
  const length = Number(lengthCm) || 0;
  const width = Number(widthCm) || 0;
  const height = Number(heightCm) || 0;
  if (length <= 0 || width <= 0 || height <= 0) return 0;
  return Number(((length * width * height) / 1000000).toFixed(3));
};

/** Display volume CBM with up to 3 decimal places (e.g. 0.384). */
export const formatVolumeCbm = (value) => {
  if (value === null || value === undefined || value === "" || value === false) {
    return "-";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return parseFloat(num.toFixed(3)).toString();
};

/** Numeric CBM for one dimension row (LWH calc, volume method, or stored value). */
export const getDimensionVolumeCbm = (dim = {}) => {
  if (!dim || typeof dim !== "object") return 0;
  const method = dim.calculation_method || "lwh";
  if (method === "volume") {
    const volumeDim = Number(dim.volume_dim);
    if (Number.isFinite(volumeDim) && volumeDim > 0) {
      return Number(Number(volumeDim).toFixed(3));
    }
  }
  const fromLwh = calculateVolumeCbmFromLwhCm(dim.length_cm, dim.width_cm, dim.height_cm);
  if (fromLwh > 0) return fromLwh;
  const stored = Number(dim.volume_cbm);
  if (Number.isFinite(stored) && stored > 0) return stored;
  return 0;
};

/** Sum CBM across all dimension rows (for edit-stock total column preview). */
export const sumDimensionsVolumeCbm = (dimensions = []) => {
  if (!Array.isArray(dimensions) || dimensions.length === 0) return 0;
  const total = dimensions.reduce((sum, dim) => sum + getDimensionVolumeCbm(dim), 0);
  return Number(total.toFixed(3));
};

/** Total volume for a stock row: sum dimensions when present, else backend value. */
export const formatRowTotalVolumeCbm = (dimensions = [], backendTotal = null) => {
  const sum = sumDimensionsVolumeCbm(dimensions);
  if (sum > 0) return formatVolumeCbm(sum);
  if (backendTotal != null && backendTotal !== "" && backendTotal !== false) {
    const backend = Number(backendTotal);
    if (Number.isFinite(backend) && backend > 0) return formatVolumeCbm(backend);
  }
  return "-";
};

/** Preview CBM from a single dimension row (LWH, volume method, or stored backend value). */
export const resolveDisplayVolumeCbm = (dim = {}) => {
  const value = getDimensionVolumeCbm(dim);
  return value > 0 ? formatVolumeCbm(value) : formatVolumeCbm(dim.volume_cbm);
};
