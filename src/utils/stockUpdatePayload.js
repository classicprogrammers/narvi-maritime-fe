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
 * Compare current form dimensions against original API dimensions
 * (or a post-create form baseline when server dimension ids are not loaded yet).
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

  currentList.forEach((dim, index) => {
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

    // Match by index against baseline/original when form dims lack server ids
    // (common right after create-before-PDF on the add-stock form).
    const originalAtIndex = originalList[index];
    if (originalAtIndex) {
      const originalIdAtIndex = resolveDimensionId(originalAtIndex);
      if (originalIdAtIndex != null) keptIds.add(String(originalIdAtIndex));

      if (dimensionFieldsEqual(dim, originalAtIndex)) {
        return;
      }

      if (originalIdAtIndex != null) {
        ops.push({
          op: "update",
          id: originalIdAtIndex,
          ...mapDimensionBody(dim),
        });
        return;
      }

      // Already persisted via create but no server id in form — do not re-create.
      // Dimension value edits in this state need a refetch to get ids.
      return;
    }

    // Truly new dimension row beyond the baseline
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

/**
 * Snapshot a form row after a successful create/update so later updates
 * can send only changed fields (avoids re-creating dimensions/attachments).
 */
export function captureFormRowUpdateBaseline(row) {
  if (!row || typeof row !== "object") return null;
  return {
    stockId: row.stockId ?? null,
    stockItemId: row.stockItemId || "",
    stockStatus: row.stockStatus || "",
    stockStatusChangedBy: row.stockStatusChangedBy || "",
    stockStatusPreviousForPayload: row.stockStatusPreviousForPayload ?? "",
    client: row.client,
    supplier: row.supplier,
    vessel: row.vessel,
    poNumber: row.poNumber || "",
    reqNo: row.reqNo || "",
    pic: row.pic,
    itemId: row.itemId,
    item: row.item,
    currency: row.currency,
    origin_text: row.origin_text || "",
    narviStockViaHub1: row.narviStockViaHub1,
    narviStockViaHub2: row.narviStockViaHub2,
    narviStockApDestination: row.narviStockApDestination,
    clientAccess: row.clientAccess,
    remarks: row.remarks || "",
    internalRemark: row.internalRemark || "",
    weightKgs: row.weightKgs,
    widthCm: row.widthCm,
    lengthCm: row.lengthCm,
    heightCm: row.heightCm,
    lwhText: row.lwhText || "",
    cwAirfreight: row.cwAirfreight,
    value: row.value,
    extra2: row.extra2 || "",
    destinationId: row.destinationId,
    warehouseId: row.warehouseId || "",
    shippingDoc: row.shippingDoc || "",
    exportDoc: row.exportDoc || "",
    exportDoc2: row.exportDoc2 || "",
    dateOnStock: row.dateOnStock,
    expReadyInStock: row.expReadyInStock,
    shippedDate: row.shippedDate,
    deliveredDate: row.deliveredDate,
    details: row.details || "",
    dgUn: row.dgUn || "",
    vesselDestination: row.vesselDestination || "",
    vesselEta: row.vesselEta,
    soId: row.soId,
    siNumber: row.siNumber || "",
    siCombined: row.siCombined || "",
    diNumber: row.diNumber || "",
    dimensions: Array.isArray(row.dimensions)
      ? row.dimensions.map((dim) => ({ ...(dim || {}) }))
      : [],
    attachments: [],
    attachmentsToDelete: [],
  };
}
