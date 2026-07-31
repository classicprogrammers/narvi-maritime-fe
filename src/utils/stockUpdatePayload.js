/**
 * Stock list update payloads only need stock_id + changed fields.
 * POST /api/stock/list/update
 */

function normalizeStockUpdateCompareValue(value) {
  if (value === null || value === undefined || value === false) return null;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") return value;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function stockUpdateValuesEqual(a, b) {
  return normalizeStockUpdateCompareValue(a) === normalizeStockUpdateCompareValue(b);
}

/**
 * Keep stock_id and only keys whose values differ from the baseline line payload.
 * @param {object} candidate - full update line (including stock_id)
 * @param {object} baseline - full update line from the original/unedited row
 */
export function pickStockUpdateChangedFields(candidate = {}, baseline = {}) {
  const stockId = candidate.stock_id ?? baseline.stock_id;
  const result = {};
  if (stockId != null && stockId !== "") {
    result.stock_id = stockId;
  }

  Object.keys(candidate).forEach((key) => {
    if (key === "stock_id" || key === "id") return;
    if (!stockUpdateValuesEqual(candidate[key], baseline[key])) {
      result[key] = candidate[key];
    }
  });

  return result;
}

const toDimNumber = (val) => {
  if (val === "" || val === null || val === undefined || val === false) return 0;
  const num = typeof val === "string" ? parseFloat(val) : Number(val);
  return Number.isFinite(num) ? num : 0;
};

const resolveDimensionId = (dim) => {
  if (!dim || dim.id == null || dim.id === "" || dim.id === false) return null;
  const id = Number(dim.id);
  return Number.isFinite(id) ? id : null;
};

const hasDimensionData = (dim) => {
  if (!dim || typeof dim !== "object") return false;
  const method = dim.calculation_method || "lwh";
  if (method === "volume") return toDimNumber(dim.volume_dim) > 0;
  return (
    toDimNumber(dim.length_cm) > 0 ||
    toDimNumber(dim.width_cm) > 0 ||
    toDimNumber(dim.height_cm) > 0 ||
    toDimNumber(dim.weight_kg) > 0
  );
};

const dimensionFieldsEqual = (a, b) => {
  const methodA = a?.calculation_method || "lwh";
  const methodB = b?.calculation_method || "lwh";
  if (methodA !== methodB) return false;
  if (toDimNumber(a?.length_cm) !== toDimNumber(b?.length_cm)) return false;
  if (toDimNumber(a?.width_cm) !== toDimNumber(b?.width_cm)) return false;
  if (toDimNumber(a?.height_cm) !== toDimNumber(b?.height_cm)) return false;
  if (toDimNumber(a?.volume_dim) !== toDimNumber(b?.volume_dim)) return false;
  if (toDimNumber(a?.weight_kg) !== toDimNumber(b?.weight_kg)) return false;
  if (toDimNumber(a?.cw_air_freight) !== toDimNumber(b?.cw_air_freight)) return false;
  return true;
};

const mapDimensionBody = (dim) => {
  const method = dim.calculation_method || "lwh";
  if (method === "volume") {
    return {
      calculation_method: "volume",
      length_cm: 0,
      width_cm: 0,
      height_cm: 0,
      volume_dim: toDimNumber(dim.volume_dim) || false,
      weight_kg: toDimNumber(dim.weight_kg),
      cw_air_freight: toDimNumber(dim.cw_air_freight),
    };
  }
  return {
    calculation_method: "lwh",
    length_cm: toDimNumber(dim.length_cm),
    width_cm: toDimNumber(dim.width_cm),
    height_cm: toDimNumber(dim.height_cm),
    volume_dim: false,
    weight_kg: toDimNumber(dim.weight_kg),
    cw_air_freight: toDimNumber(dim.cw_air_freight),
  };
};

/**
 * Build dimensions ops for stock update: create / update / delete.
 * Compare current form dimensions against original API dimensions.
 * @returns {Array|undefined} ops array, or undefined when nothing changed
 */
export function buildStockUpdateDimensionsOps(currentDims = [], originalDims = []) {
  const originalList = Array.isArray(originalDims) ? originalDims : [];
  const currentList = Array.isArray(currentDims) ? currentDims : [];
  const originalById = new Map();

  originalList.forEach((dim) => {
    const id = resolveDimensionId(dim);
    if (id != null) originalById.set(String(id), dim);
  });

  const ops = [];
  const keptIds = new Set();

  currentList.forEach((dim) => {
    const id = resolveDimensionId(dim);
    if (id != null && originalById.has(String(id))) {
      keptIds.add(String(id));
      const original = originalById.get(String(id));
      if (!dimensionFieldsEqual(dim, original)) {
        ops.push({
          op: "update",
          id,
          ...mapDimensionBody(dim),
        });
      }
      return;
    }

    // New dimension (no persisted id)
    if (hasDimensionData(dim)) {
      ops.push({
        op: "create",
        ...mapDimensionBody(dim),
      });
    }
  });

  originalById.forEach((_dim, idStr) => {
    if (!keptIds.has(idStr)) {
      ops.push({
        op: "delete",
        id: Number(idStr),
      });
    }
  });

  return ops.length > 0 ? ops : undefined;
}
