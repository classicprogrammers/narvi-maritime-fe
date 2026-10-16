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
  const lengthsMatch = currentList.length === originalList.length;

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

    // Match by index only when the list length is unchanged (no insert/duplicate).
    // Index matching after a duplicate would overwrite the next existing dimension.
    const originalAtIndex = lengthsMatch ? originalList[index] : null;
    if (originalAtIndex) {
      const originalIdAtIndex = resolveDimensionId(originalAtIndex);
      if (originalIdAtIndex != null && keptIds.has(String(originalIdAtIndex))) {
        // Already claimed by another row; treat this as a new dimension.
      } else {
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
    }

    // Same content may already exist — reuse that original only once.
    // Extra identical rows (duplicates) must still be created.
    const contentMatch = originalList.find((original) => {
      const matchedId = resolveDimensionId(original);
      if (matchedId != null && keptIds.has(String(matchedId))) return false;
      return dimensionFieldsEqual(dim, original);
    });
    if (contentMatch) {
      const matchedId = resolveDimensionId(contentMatch);
      if (matchedId != null) keptIds.add(String(matchedId));
      return;
    }

    // Dim already has a server id that wasn't in original list — update, don't create
    if (id != null) {
      keptIds.add(String(id));
      ops.push({
        op: "update",
        id,
        ...mapDimensionBody(dim),
      });
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

const warehouseName = (wh) => {
  if (wh == null || wh === false) return "";
  if (typeof wh === "string") return wh.trim();
  return String(wh.name ?? "").trim();
};

const resolveWarehouseId = (wh) => {
  if (!wh || typeof wh !== "object" || wh.id == null || wh.id === "" || wh.id === false) return null;
  const id = Number(wh.id);
  return Number.isFinite(id) ? id : null;
};

/**
 * Form rows for warehouses from an API stock record.
 * Uses `warehouses` [{id, name}]; falls back to splitting `warehouse_text` by line.
 */
export function normalizeWarehousesFromStock(stock) {
  if (Array.isArray(stock?.warehouses) && stock.warehouses.length > 0) {
    // Newest first: ids grow as warehouses are added, so highest id goes on top.
    return stock.warehouses
      .map((wh) => ({ id: resolveWarehouseId(wh), name: warehouseName(wh) }))
      .filter((wh) => wh.name || wh.id != null)
      .sort((a, b) => (b.id ?? Infinity) - (a.id ?? Infinity));
  }
  // Same sources the list column falls back to, so what the list shows is never lost in the form.
  const legacy = [
    stock?.warehouse_text,
    stock?.warehouse_new,
    stock?.warehouse_id,
    stock?.stock_warehouse,
    stock?.warehouse,
  ]
    .map((v) => (Array.isArray(v) ? v[1] : v && typeof v === "object" ? v.name : v))
    .find((v) => typeof v === "string" && v.trim() !== "");
  const text = legacy || "";
  return text
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean)
    .reverse() // newest first (text lists oldest first)
    .map((name) => ({ id: null, name }));
}

/**
 * Warehouse text for the stock list view, newest first (one name per line).
 * Prefers server rows (by id desc); `warehouse_text` lists oldest first, so it is reversed.
 */
export function getWarehouseDisplayText(item) {
  const rows = Array.isArray(item?.warehouses) ? item.warehouses : [];
  if (rows.length > 0) {
    return [...rows]
      .sort((a, b) => (Number(b?.id) || 0) - (Number(a?.id) || 0))
      .map((wh) => warehouseName(wh))
      .filter(Boolean)
      .join("\n");
  }
  const text = typeof item?.warehouse_text === "string" ? item.warehouse_text : "";
  if (text.includes("\n")) return text.split(/\r?\n/).reverse().join("\n");
  return text || item?.warehouse_new || item?.warehouse_id || item?.stock_warehouse || "";
}

/**
 * Warehouse rows that really exist on the server. Never the warehouse_text fallback:
 * legacy text rows must diff as "new" so they are sent as create ops on save.
 */
export function getServerWarehouses(stock) {
  return Array.isArray(stock?.warehouses) ? stock.warehouses : [];
}

/** Warehouses for create payloads: non-blank names only. */
export function mapCreateWarehouses(warehouses) {
  if (!Array.isArray(warehouses)) return undefined;
  // The form lists newest first; send oldest first so server ids grow chronologically.
  const mapped = [...warehouses]
    .reverse()
    .map((wh) => warehouseName(wh))
    .filter(Boolean)
    .map((name) => ({ name }));
  return mapped.length > 0 ? mapped : undefined;
}

/**
 * Build warehouses ops for stock update: create / update / delete.
 * Only changed rows are returned (backend leaves omitted rows untouched).
 * @returns {Array|undefined} ops array, or undefined when nothing changed
 */
export function buildStockUpdateWarehousesOps(currentList = [], originalList = []) {
  const current = Array.isArray(currentList) ? currentList : [];
  const original = Array.isArray(originalList) ? originalList : [];
  const originalById = new Map();
  original.forEach((wh) => {
    const id = resolveWarehouseId(wh);
    if (id != null) originalById.set(String(id), wh);
  });

  const ops = [];
  const keptIds = new Set();

  // Form order is newest first; process oldest first so new rows are created in chronological order.
  [...current].reverse().forEach((wh) => {
    const name = warehouseName(wh);
    const id = resolveWarehouseId(wh);
    if (id != null && originalById.has(String(id))) {
      keptIds.add(String(id));
      if (name !== warehouseName(originalById.get(String(id)))) {
        // Blank name on an existing row means the user cleared it — remove it.
        ops.push(name ? { op: "update", id, name } : { op: "delete", id });
      }
      return;
    }
    if (!name) return;

    // Same name already persisted (e.g. post-create baseline without ids) — don't re-create.
    const contentMatch = original.find((o) => {
      const oid = resolveWarehouseId(o);
      if (oid != null && keptIds.has(String(oid))) return false;
      return warehouseName(o) === name;
    });
    if (contentMatch) {
      const oid = resolveWarehouseId(contentMatch);
      if (oid != null) keptIds.add(String(oid));
      return;
    }
    ops.push({ op: "create", name });
  });

  originalById.forEach((_wh, idStr) => {
    if (!keptIds.has(idStr)) ops.push({ op: "delete", id: Number(idStr) });
  });

  return ops.length > 0 ? ops : undefined;
}

/** Prefer a warehouse list that still has server ids (mirrors resolveDimensionsBaseline). */
export function resolveWarehousesBaseline(stockWarehouses, baselineWarehouses) {
  const stock = Array.isArray(stockWarehouses) ? stockWarehouses : null;
  const baseline = Array.isArray(baselineWarehouses) ? baselineWarehouses : null;
  if (stock?.some((w) => resolveWarehouseId(w) != null)) return stock;
  if (baseline?.some((w) => resolveWarehouseId(w) != null)) return baseline;
  if (stock && stock.length > 0) return stock;
  return baseline || stock || [];
}

/**
 * Prefer dimension lists that still have server ids / real rows.
 * Important: `[]` is truthy in JS, so callers must not use `stock.dimensions || baseline`.
 */
export function resolveDimensionsBaseline(stockDimensions, baselineDimensions) {
  const stock = Array.isArray(stockDimensions) ? stockDimensions : null;
  const baseline = Array.isArray(baselineDimensions) ? baselineDimensions : null;
  const stockHasIds = Boolean(stock?.some((d) => resolveDimensionId(d) != null));
  const baselineHasIds = Boolean(baseline?.some((d) => resolveDimensionId(d) != null));

  if (stockHasIds) return stock;
  if (baselineHasIds) return baseline;
  if (stock && stock.length > 0) return stock;
  if (baseline && baseline.length > 0) return baseline;
  // Post-create snapshot may be [] — still prefer it over a missing stock list payload
  if (baseline) return baseline;
  if (stock) return stock;
  return [];
}

/** Stable fingerprint for a pending attachment (avoids re-uploading the same file). */
export function attachmentFingerprint(att) {
  if (!att || typeof att !== "object") return "";
  const name = String(att.filename || att.name || "")
    .trim()
    .toLowerCase();
  const mime = String(att.mimetype || "")
    .trim()
    .toLowerCase();
  const datas = typeof att.datas === "string" ? att.datas : "";
  return `${name}|${mime}|${datas.length}|${datas.slice(0, 24)}|${datas.slice(-24)}`;
}

/** Baseline snapshot of pending uploads (fingerprints only — no base64 retained). */
export function normalizeAttachmentsForBaseline(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .filter((att) => att && typeof att === "object")
    .map((att) => {
      const fp = att._fp || attachmentFingerprint(att);
      return {
        filename: att.filename || att.name || "",
        mimetype: att.mimetype || "",
        _fp: fp,
      };
    })
    .filter((att) => att._fp);
}

/**
 * Pending attachments that are not already in the baseline (already uploaded / accounted for).
 * Skips rows that already have a server id.
 */
export function filterNewPendingAttachments(current = [], baseline = []) {
  const baselineFps = new Set(
    (Array.isArray(baseline) ? baseline : [])
      .map((att) => att?._fp || attachmentFingerprint(att))
      .filter(Boolean)
  );
  return (Array.isArray(current) ? current : []).filter((att) => {
    if (!att || typeof att !== "object") return false;
    if (att.id != null && att.id !== false && String(att.id).trim() !== "") return false;
    if (!att.datas) return false;
    const fp = att._fp || attachmentFingerprint(att);
    if (!fp) return false;
    return !baselineFps.has(fp);
  });
}

/** Attachment delete ids not already recorded in the baseline. */
export function filterNewAttachmentDeletes(current = [], baseline = []) {
  const baselineSet = new Set((Array.isArray(baseline) ? baseline : []).map((id) => String(id)));
  return (Array.isArray(current) ? current : []).filter((id) => {
    if (id == null || id === false || id === "") return false;
    return !baselineSet.has(String(id));
  });
}

function dedupeAttachmentFingerprints(list = []) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((att) => {
    const fp = att?._fp || attachmentFingerprint(att);
    if (!fp || seen.has(fp)) return;
    seen.add(fp);
    out.push(att._fp ? att : { ...att, _fp: fp });
  });
  return out;
}

/**
 * After a successful create/update that included pending files, drop their base64
 * (so they cannot be re-uploaded) and remember fingerprints in the update baseline.
 * Filenames stay on the row for UI until the user navigates away / reloads.
 */
export function clearUploadedPendingAttachmentsFromRow(row, uploadedAttachments = null) {
  if (!row || typeof row !== "object") return row;
  const uploaded = Array.isArray(uploadedAttachments) ? uploadedAttachments : row.attachments;
  const uploadedNormalized = normalizeAttachmentsForBaseline(uploaded);
  const uploadedFps = new Set(uploadedNormalized.map((att) => att._fp).filter(Boolean));

  const nextAttachments = (Array.isArray(row.attachments) ? row.attachments : []).map((att) => {
    const fp = attachmentFingerprint(att);
    if (!fp || !uploadedFps.has(fp)) return att;
    // Keep metadata for display; strip datas so filterNewPendingAttachments skips it
    const { datas, ...rest } = att || {};
    return { ...rest, _fp: fp };
  });

  const next = {
    ...row,
    attachments: nextAttachments,
    // Deletes that were already sent should not be resent
    attachmentsToDelete: [],
  };
  const baseline = captureFormRowUpdateBaseline(next);
  baseline.attachments = dedupeAttachmentFingerprints([
    ...(Array.isArray(row.updateBaselineRow?.attachments) ? row.updateBaselineRow.attachments : []),
    ...uploadedNormalized,
    ...normalizeAttachmentsForBaseline(nextAttachments),
  ]);
  baseline.attachmentsToDelete = [
    ...(Array.isArray(row.updateBaselineRow?.attachmentsToDelete)
      ? row.updateBaselineRow.attachmentsToDelete
      : []),
    ...(Array.isArray(row.attachmentsToDelete) ? row.attachmentsToDelete : []),
  ].filter((id, idx, arr) => id != null && id !== false && id !== "" && arr.indexOf(id) === idx);
  next.updateBaselineRow = baseline;
  return next;
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
    warning: row.warning || "",
    t1: row.t1 || "",
    internalRemark: row.internalRemark || "",
    cancelText: row.cancelText || "",
    weightKgs: row.weightKgs,
    widthCm: row.widthCm,
    lengthCm: row.lengthCm,
    heightCm: row.heightCm,
    lwhText: row.lwhText || "",
    cwAirfreight: row.cwAirfreight,
    value: row.value,
    extra2: row.extra2 || "",
    destinationId: row.destinationId,
    warehouses: Array.isArray(row.warehouses)
      ? row.warehouses.map((wh) => ({ ...(wh || {}) }))
      : [],
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
    // Fingerprints of pending uploads already accounted for (prevents re-upload)
    attachments: normalizeAttachmentsForBaseline(row.attachments),
    attachmentsToDelete: Array.isArray(row.attachmentsToDelete)
      ? [...row.attachmentsToDelete]
      : [],
  };
}
