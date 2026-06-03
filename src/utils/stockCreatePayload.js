/**
 * Build and sanitize payloads for POST /api/stock/list/create
 * (lines[].* fields only — no internal/UI keys).
 */

import { buildStockSoIdPayloadValue } from "./shippingOrderListState";

/** Keys accepted by the stock create API (line object). */
export const STOCK_CREATE_LINE_KEYS = new Set([
  "stock_status",
  "client_id",
  "supplier_id",
  "vessel_id",
  "pic_new",
  "item_id",
  "currency_id",
  "item",
  "stock_items_quantity",
  "origin_text",
  "state_id",
  "airport_code",
  "destination",
  "destination_new",
  "destination_ids",
  "ap_destination",
  "ap_destination_new",
  "ap_destination_ids",
  "via_hub",
  "via_hub2",
  "warehouse_id",
  "warehouse_new",
  "warehouse_text",
  "po_text",
  "po_id",
  "so_id",
  "shipping_instruction_id",
  "delivery_instruction_id",
  "shipment_type",
  "di_no",
  "si_number",
  "si_combined",
  "stock_shipping_instruction",
  "stock_delivery_instruction",
  "stock_destination",
  "stock_warehouse",
  "vessel_destination_text",
  "vessel_destination",
  "vessel_eta",
  "date_on_stock",
  "exp_ready_in_stock",
  "shipped_date",
  "delivered_date",
  "dg_un",
  "remarks",
  "internal_remark",
  "extra",
  "client_access",
  "blank",
  "weight_kg",
  "width_cm",
  "length_cm",
  "height_cm",
  "volume_dim",
  "volume_cbm",
  "lwh_text",
  "cw_air_freight_new",
  "cw_freight",
  "value",
  "shipping_doc",
  "export_doc",
  "export_doc_2",
  "dimensions",
  "attachments",
]);

const DIMENSION_KEYS = new Set([
  "calculation_method",
  "length_cm",
  "width_cm",
  "height_cm",
  "volume_dim",
]);

const ATTACHMENT_KEYS = new Set(["filename", "mimetype", "datas"]);

const resolveNameFromList = (id, list = []) => {
  if (id == null || id === "" || !Array.isArray(list)) return "";
  const match = list.find((o) => String(o.id) === String(id));
  return match?.name != null ? String(match.name) : "";
};

/** Build { id, name } for M2O fields; omit when empty. */
export const buildStockM2OField = (idValue, nameValue, options = []) => {
  const id =
    idValue != null && idValue !== "" && Number.isFinite(Number(idValue))
      ? Number(idValue)
      : null;
  let name = String(nameValue ?? "").trim();
  if (!name && id != null) {
    name = resolveNameFromList(id, options);
  }
  if (id == null && !name) return undefined;
  if (id != null) {
    return { id, name: name || `ID ${id}` };
  }
  return { name };
};

/** destination_ids — M2O object per API spec */
export const buildStockDestinationIdsM2O = (optionId, selectName, options = []) => {
  const name = String(selectName ?? "").trim();
  const id =
    optionId != null && optionId !== "" && Number.isFinite(Number(optionId))
      ? Number(optionId)
      : null;

  if (!name && id == null) return undefined;

  if (id != null) {
    return { id, name: name || resolveNameFromList(id, options) || `ID ${id}` };
  }

  const match = Array.isArray(options)
    ? options.find((opt) => String(opt.name || "").toLowerCase() === name.toLowerCase())
    : null;
  if (match?.id != null && Number.isFinite(Number(match.id))) {
    return { id: Number(match.id), name: String(match.name || name) };
  }

  return name ? { name } : undefined;
};

/** ap_destination_ids — string name or M2O when id is known */
export const buildStockApDestinationIds = (optionId, selectName, options = []) => {
  const name = String(selectName ?? "").trim();
  const id =
    optionId != null && optionId !== "" && Number.isFinite(Number(optionId))
      ? Number(optionId)
      : null;

  if (!name && id == null) return undefined;
  if (id != null) {
    const resolved = name || resolveNameFromList(id, options);
    return resolved || `ID ${id}`;
  }
  return name;
};

const toNumber = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const num = Number(v);
  return Number.isNaN(num) ? 0 : num;
};

const mapCreateDimensions = (dimensions) => {
  if (!Array.isArray(dimensions) || dimensions.length === 0) return undefined;
  const mapped = dimensions
    .map((dim) => {
      const method = dim.calculation_method || "lwh";
      if (method === "volume") {
        const volumeDim = toNumber(dim.volume_dim);
        if (volumeDim <= 0) return null;
        return {
          calculation_method: "volume",
          length_cm: toNumber(dim.length_cm),
          width_cm: toNumber(dim.width_cm),
          height_cm: toNumber(dim.height_cm),
          volume_dim: volumeDim,
        };
      }
      const length = toNumber(dim.length_cm);
      const width = toNumber(dim.width_cm);
      const height = toNumber(dim.height_cm);
      if (length <= 0 && width <= 0 && height <= 0) return null;
      return {
        calculation_method: "lwh",
        length_cm: length,
        width_cm: width,
        height_cm: height,
        volume_dim: toNumber(dim.volume_dim) || toNumber(dim.volume_cbm) || 0,
      };
    })
    .filter(Boolean);
  return mapped.length > 0 ? mapped : undefined;
};

const mapCreateAttachments = (attachments) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
  const mapped = attachments
    .map((att) => {
      if (!att || typeof att !== "object") return null;
      const row = {};
      ATTACHMENT_KEYS.forEach((key) => {
        if (att[key] != null && att[key] !== "") row[key] = att[key];
      });
      return row.filename && row.datas ? row : null;
    })
    .filter(Boolean);
  return mapped.length > 0 ? mapped : undefined;
};

const firstDimension = (dimensions, method) => {
  if (!Array.isArray(dimensions)) return null;
  return dimensions.find((d) => (d.calculation_method || "lwh") === method) || null;
};

/**
 * Build a single line payload for stock create from a standard form row.
 */
export const buildStockCreateLinePayload = (rowData, context = {}) => {
  const {
    clients = [],
    vessels = [],
    suppliers = [],
    currencies = [],
    pics = [],
    destinationOptions = [],
    apDestinationOptions = [],
    shippingOrders = [],
    normalizeStockStatusKey = (v) => v,
    removeSIPrefix = (v) => v,
    removeDIPrefix = (v) => v,
    removeSICombinedPrefix = (v) => v,
  } = context;

  const itemQty =
    rowData.item !== "" && rowData.item !== null && rowData.item !== undefined
      ? toNumber(rowData.item)
      : 0;

  const dims = Array.isArray(rowData.dimensions) ? rowData.dimensions : [];
  const lwhDim = firstDimension(dims, "lwh");
  const volDim = firstDimension(dims, "volume");

  const formatSi = (raw) => {
    if (!raw) return "";
    let value = String(raw);
    if (value && !value.startsWith("SI-")) value = `SI-${value}`;
    return String(removeSIPrefix(value));
  };

  const formatSiCombined = (raw) => {
    if (!raw) return false;
    let value = String(raw);
    if (
      value &&
      !value.startsWith("SIC-") &&
      !value.startsWith("SI-C-") &&
      !value.startsWith("SI-")
    ) {
      value = `SIC-${value}`;
    }
    const cleaned = String(removeSICombinedPrefix(value));
    return cleaned === "" ? false : cleaned;
  };

  const formatDi = (raw) => {
    if (!raw) return "";
    let value = String(raw);
    if (value && !value.startsWith("DI-")) value = `DI-${value}`;
    return String(removeDIPrefix(value));
  };

  const destinationIds = buildStockDestinationIdsM2O(
    rowData.destinationId,
    rowData.destinationSelect || rowData.destination,
    destinationOptions
  );

  const apDestName =
    rowData.apDestinationSelect || rowData.apDestination || "";

  const soIdValue = buildStockSoIdPayloadValue(rowData.soId, shippingOrders);

  const line = {
    stock_status: normalizeStockStatusKey(rowData.stockStatus) || "",
    client_id: buildStockM2OField(rowData.client, null, clients),
    supplier_id: buildStockM2OField(rowData.supplier, null, suppliers),
    vessel_id: buildStockM2OField(rowData.vessel, null, vessels),
    pic_new: buildStockM2OField(rowData.pic, null, pics),
    item_id: rowData.itemId
      ? buildStockM2OField(rowData.itemId, null, [])
      : undefined,
    currency_id: buildStockM2OField(rowData.currency, null, currencies),
    item: itemQty,
    stock_items_quantity: itemQty,
    origin_text: rowData.origin_text ? String(rowData.origin_text) : "",
    via_hub: rowData.viaHub || "",
    via_hub2: rowData.viaHub2 || "",
    client_access: Boolean(rowData.clientAccess),
    remarks: rowData.remarks || "",
    internal_remark: rowData.internalRemark || "",
    weight_kg: toNumber(rowData.weightKgs),
    width_cm: lwhDim ? toNumber(lwhDim.width_cm) : toNumber(rowData.widthCm),
    length_cm: lwhDim ? toNumber(lwhDim.length_cm) : toNumber(rowData.lengthCm),
    height_cm: lwhDim ? toNumber(lwhDim.height_cm) : toNumber(rowData.heightCm),
    volume_dim: volDim ? toNumber(volDim.volume_dim) : 0,
    volume_cbm: toNumber(rowData.volumeCbm),
    lwh_text: rowData.lwhText || "",
    cw_air_freight_new: toNumber(rowData.cwAirfreight),
    value: toNumber(rowData.value),
    destination_ids: destinationIds,
    destination_new: rowData.destinationSelect || rowData.destination || "",
    ap_destination_ids: buildStockApDestinationIds(
      rowData.apDestinationId,
      apDestName,
      apDestinationOptions
    ),
    ap_destination_new: apDestName,
    warehouse_new: rowData.warehouseId || "",
    po_text: rowData.poNumber || "",
    shipping_doc: rowData.shippingDoc || "",
    export_doc: rowData.exportDoc || "",
    export_doc_2: rowData.exportDoc2 || "",
    date_on_stock: rowData.dateOnStock || "",
    exp_ready_in_stock: rowData.expReadyInStock || "",
    shipped_date: rowData.shippedDate || null,
    delivered_date: rowData.deliveredDate || "",
    dg_un: rowData.dgUn || "",
    extra: rowData.extra2 || "",
    vessel_destination: rowData.vesselDestination
      ? buildStockM2OField(rowData.vesselDestination, rowData.vesselDestination, vessels)
      : undefined,
    vessel_destination_text: rowData.vesselDestination || "",
    vessel_eta: rowData.vesselEta || "",
    ...(soIdValue !== false ? { so_id: soIdValue } : {}),
    si_number: formatSi(rowData.siNumber),
    si_combined: formatSiCombined(rowData.siCombined),
    di_no: formatDi(rowData.diNumber),
    dimensions: mapCreateDimensions(dims),
    attachments: mapCreateAttachments(rowData.attachments),
  };

  return sanitizeStockCreateLine(line);
};

/** Strip keys not in the API contract and empty dimension/attachment entries. */
export const sanitizeStockCreateLine = (line) => {
  if (!line || typeof line !== "object") return {};

  const out = {};

  Object.keys(line).forEach((key) => {
    if (!STOCK_CREATE_LINE_KEYS.has(key)) return;
    const value = line[key];
    if (value === undefined) return;
    out[key] = value;
  });

  if (Array.isArray(out.dimensions)) {
    out.dimensions = out.dimensions
      .map((dim) => {
        const row = {};
        DIMENSION_KEYS.forEach((k) => {
          if (dim[k] !== undefined) row[k] = dim[k];
        });
        return row;
      })
      .filter((dim) => Object.keys(dim).length > 0);
    if (out.dimensions.length === 0) delete out.dimensions;
  }

  if (Array.isArray(out.attachments)) {
    out.attachments = out.attachments
      .map((att) => {
        const row = {};
        ATTACHMENT_KEYS.forEach((k) => {
          if (att[k] != null && att[k] !== "") row[k] = att[k];
        });
        return row.filename && row.datas ? row : null;
      })
      .filter(Boolean);
    if (out.attachments.length === 0) delete out.attachments;
  }

  return out;
};

/** Sanitize { lines: [...] } or a single line before POST create. */
export const sanitizeStockCreatePayload = (stockData) => {
  if (stockData?.lines && Array.isArray(stockData.lines)) {
    return {
      lines: stockData.lines.map((line) => sanitizeStockCreateLine(line)),
    };
  }
  return sanitizeStockCreateLine(stockData);
};

/** Read id from form value or existing API M2O field */
export const stockFormId = (value) => {
  if (value == null || value === false || value === "") return null;
  return getM2OId(value) ?? (Number.isFinite(Number(value)) ? Number(value) : null);
};

export const stockFormName = (value, fallback = "") => {
  const name = getM2OName(value);
  return name || fallback;
};
