// Pure helpers for the CI/PL "Manual" tab (a CI/PL without SI/SIC/DI number).
// Totals are authoritative on the backend (strings like "125.00", zero comes back as false):
// manualLinesTotals / manualLineValue are only a display fallback or live preview.

export const CIPL_FORM_TYPE = {
  SIMPLE: "simple",
  MANUAL: "manual",
  ALL: "all",
};

const isBlank = (value) => value == null || value === false || String(value).trim() === "";

const toText = (value) => (isBlank(value) ? "" : String(value));

/** Backend number (string, number or false) -> finite number, else 0. */
export function parseManualNumber(value) {
  if (isBlank(value)) return 0;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : 0;
}

/** Input text -> number, null when empty, NaN when not a valid number (comma is invalid). */
function toNumberOrNull(value) {
  if (isBlank(value)) return null;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return NaN;
  return Number(text);
}

const isValidOptionalNumber = (value) => {
  const n = toNumberOrNull(value);
  return n === null || (Number.isFinite(n) && n >= 0);
};

const idOf = (value) => {
  if (value && typeof value === "object") return idOf(value.id);
  if (isBlank(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// ---------- T2: parsing ----------

export function isManualCiplForm(form) {
  return form?.form_type === CIPL_FORM_TYPE.MANUAL;
}

export function ciplFormTypeLabel(form) {
  return isManualCiplForm(form) ? "Manual" : "Simple";
}

/** vessel_id is {id, name} or null/false. */
export function parseCiplVessel(form) {
  const vessel = form?.vessel_id;
  if (vessel && typeof vessel === "object") {
    return { id: idOf(vessel.id), name: toText(vessel.name) };
  }
  if (vessel != null && vessel !== false && vessel !== "" && Number.isFinite(Number(vessel))) {
    return { id: Number(vessel), name: toText(form?.vessel_name) };
  }
  return { id: null, name: "" };
}

function lineDescription(line) {
  if (!isBlank(line.description)) return String(line.description);
  if (!isBlank(line.details)) return String(line.details);
  const entries = Array.isArray(line.entries) ? line.entries : [];
  const first = entries.find((e) => e && !e.delete && !isBlank(e.description));
  return first ? String(first.description) : "";
}

export function parseManualLinesFromApi(stockList) {
  if (!Array.isArray(stockList)) return [];
  return stockList
    .filter((line) => line && typeof line === "object")
    .map((line, index) => {
      const id = idOf(line.id);
      const stockListId = idOf(line.stock_list_id);
      const stockItemId = toText(
        line.stock_item_id && typeof line.stock_item_id === "object"
          ? line.stock_item_id.name ?? line.stock_item_id.id
          : line.stock_item_id
      );
      return {
        key: id != null ? `l-${id}` : `l-new-${index}`,
        id,
        stockListId,
        stockItemId,
        isStockLine: stockListId != null || stockItemId !== "",
        description: lineDescription(line),
        hsCode: toText(line.hs_code),
        quantity: toText(line.quantity ?? line.quantity_pcs),
        unitPrice: toText(line.unit_price),
        box: toText(line.box),
        weight: toText(line.weight),
        valueUsd: toText(line.value_in_usd),
      };
    });
}

// ---------- T3: math (display only) ----------

/** quantity x unit_price rounded to 2 dp; null when either is empty or not numeric. */
export function manualLineValue(row) {
  const qty = toNumberOrNull(row?.quantity);
  const price = toNumberOrNull(row?.unitPrice);
  if (qty === null || price === null || !Number.isFinite(qty) || !Number.isFinite(price)) {
    return null;
  }
  return Math.round((qty * price + Number.EPSILON) * 100) / 100;
}

/** "-" for empty/invalid, else 2 dp text. Accepts numbers and backend strings; false -> "-". */
export function formatManualValue(value) {
  if (isBlank(value)) return "-";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "-";
}

/** Fallback/preview totals; bad numbers count as 0. Value uses the line value (qty x price), else value_in_usd. */
export function manualLinesTotals(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const sum = (fn) => Math.round(list.reduce((acc, row) => acc + fn(row), 0) * 100) / 100;
  return {
    box: sum((r) => parseManualNumber(r?.box)),
    weight: sum((r) => parseManualNumber(r?.weight)),
    quantity: sum((r) => parseManualNumber(r?.quantity)),
    value: sum((r) => {
      const v = manualLineValue(r);
      return v === null ? parseManualNumber(r?.valueUsd) : v;
    }),
  };
}

/** Authoritative totals from the backend response (false/missing -> 0). */
export function readManualTotals(form) {
  const totals = form?.totals && typeof form.totals === "object" ? form.totals : {};
  const pick = (key) => parseManualNumber(form?.[key] ?? totals[key]);
  const packed = form?.packed_as && typeof form.packed_as === "object" ? form.packed_as : {};
  return {
    box: pick("total_box"),
    weight: pick("total_weight"),
    value: pick("total_value_in_usd"),
    packedBoxes: parseManualNumber(packed.boxes),
    packedKg: parseManualNumber(packed.kg),
  };
}

// ---------- T4: payloads ----------

/** Error text or null. Only free-text (unsaved/non-stock) lines need a description. */
export function validateManualLine(row) {
  if (!row) return "Line is empty";
  if (!row.isStockLine && isBlank(row.description)) return "Description is required";
  if (!isValidOptionalNumber(row.quantity)) return "Quantity must be a number >= 0";
  if (!isValidOptionalNumber(row.unitPrice)) return "Unit price must be a number >= 0";
  if (!isValidOptionalNumber(row.box)) return "Box must be a number >= 0";
  if (!isValidOptionalNumber(row.weight)) return "Weight must be a number >= 0";
  return null;
}

/** [{stock_list_id}] for ids not yet on the form; deduped, invalid ids skipped. */
export function buildManualAddStockLines(ids, rows) {
  const existing = new Set(
    (Array.isArray(rows) ? rows : []).map((r) => r?.stockListId).filter((v) => v != null)
  );
  const seen = new Set();
  const out = [];
  (Array.isArray(ids) ? ids : []).forEach((raw) => {
    const id = idOf(raw);
    if (id == null || existing.has(id) || seen.has(id)) return;
    seen.add(id);
    out.push({ stock_list_id: id });
  });
  return out;
}

const numOrNull = (value) => {
  const n = toNumberOrNull(value);
  return Number.isFinite(n) ? n : null;
};

export function buildManualFreeTextLine(row) {
  return {
    description: toText(row?.description).trim(),
    hs_code: toText(row?.hsCode).trim() || null,
    quantity: numOrNull(row?.quantity),
    unit_price: numOrNull(row?.unitPrice),
    box: numOrNull(row?.box),
    weight: numOrNull(row?.weight),
  };
}

const EDIT_FIELDS = [
  { prop: "description", key: "description", text: true },
  { prop: "hsCode", key: "hs_code", text: true },
  { prop: "quantity", key: "quantity" },
  { prop: "unitPrice", key: "unit_price" },
  { prop: "box", key: "box" },
  { prop: "weight", key: "weight" },
  { prop: "valueUsd", key: "value_in_usd", stockOnly: true },
];

const sameField = (field, a, b) => {
  if (field.text) return toText(a).trim() === toText(b).trim();
  const x = toNumberOrNull(a);
  const y = toNumberOrNull(b);
  if (Number.isNaN(x) || Number.isNaN(y)) return toText(a).trim() === toText(b).trim();
  return x === y;
};

/** {id, ...changed} or null when nothing changed / no id. Never contains stock_list_id. Invalid numbers are skipped. */
export function buildManualLineEdit(row, baseline) {
  if (!row || row.id == null) return null;
  const base = baseline || {};
  const payload = { id: row.id };
  EDIT_FIELDS.forEach((field) => {
    if (field.stockOnly && !row.isStockLine) return;
    if (sameField(field, row[field.prop], base[field.prop])) return;
    if (field.text) {
      payload[field.key] = toText(row[field.prop]).trim();
      return;
    }
    const n = toNumberOrNull(row[field.prop]);
    if (Number.isNaN(n)) return;
    payload[field.key] = n;
  });
  return Object.keys(payload).length > 1 ? payload : null;
}

export function buildManualLineDelete(row) {
  if (!row || row.id == null) return null;
  return { id: row.id, delete: true };
}

/** Delete payload for every saved line (unsaved rows have no id and are skipped). */
export function buildManualResetLines(rows) {
  return (Array.isArray(rows) ? rows : []).map(buildManualLineDelete).filter(Boolean);
}

/** Packed totals must go in a separate update: any update sending stock_list resets them. */
export function buildManualPackedPayload(id, packed) {
  const boxes = parseManualNumber(packed?.boxes);
  const kg = parseManualNumber(packed?.kg);
  return {
    id,
    total_packed_quantity: boxes,
    total_packed_weight: kg,
    packed_as: { boxes, kg },
  };
}

// ---------- T5: header + PDF ----------

/** Header fields to save: job_no (string) and vessel_id (id or null). vessel_id accepts {id,name}. */
export function buildManualHeaderFields(data) {
  const vessel = data?.vesselId !== undefined ? data.vesselId : data?.vessel_id;
  return {
    job_no: toText(data?.jobNo !== undefined ? data.jobNo : data?.job_no).trim(),
    vessel_id: idOf(vessel),
  };
}

/** Same shape as buildManualHeaderFields, read back from an API form (for diffing). */
export function manualHeaderSnapshot(form) {
  return {
    job_no: toText(form?.job_no).trim(),
    vessel_id: parseCiplVessel(form).id,
  };
}

/**
 * labels: { description, hsCode, quantity, unitPrice, box, weight, value, total, packedAs, remarks }
 * totals: output of readManualTotals (or manualLinesTotals for the quantity column).
 * Returns { head: [[...]], body: [[...]], total: [...] } (string cells).
 */
export function buildManualPdfRows(rows, totals, labels = {}) {
  const l = {
    description: "DESCRIPTION",
    hsCode: "HS CODE",
    quantity: "QTY",
    unitPrice: "UNIT PRICE",
    box: "BOX",
    weight: "WEIGHT",
    value: "VALUE",
    total: "TOTAL",
    ...labels,
  };
  const list = Array.isArray(rows) ? rows : [];
  const fallback = manualLinesTotals(list);
  const t = totals || {};
  const pickTotal = (key) => (t[key] != null ? parseManualNumber(t[key]) : fallback[key]);
  const cell = (value) => (isBlank(value) ? "" : String(value));
  const body = list.map((row) => {
    const description = row.isStockLine && row.stockItemId
      ? `${row.stockItemId}${row.description ? ` - ${row.description}` : ""}`
      : cell(row.description);
    const lineValue = manualLineValue(row);
    return [
      description,
      cell(row.hsCode),
      cell(row.quantity),
      cell(row.unitPrice),
      cell(row.box),
      cell(row.weight),
      lineValue !== null ? formatManualValue(lineValue) : formatManualValue(row.valueUsd),
    ];
  });
  return {
    head: [[l.description, l.hsCode, l.quantity, l.unitPrice, l.box, l.weight, l.value]],
    body,
    total: [
      l.total,
      "",
      String(fallback.quantity),
      "",
      String(pickTotal("box")),
      String(pickTotal("weight")),
      formatManualValue(pickTotal("value")),
    ],
  };
}
