/**
 * Client portal two-way shipping order updates: edit payload, date rules and
 * the "news from Narvi" / "awaiting Narvi" flags read from the raw order.
 */

export const CLIENT_ORDER_DATE_FIELDS = ["eta_date", "etb", "etd"];
export const CLIENT_ORDER_TEXT_FIELDS = ["vsls_agent_dtls", "client_case_invoice_ref"];

const isBlank = (value) => value == null || value === false || String(value).trim() === "";

/** Backend dates may come as "YYYY-MM-DD", "YYYY-MM-DD HH:MM:SS" or ISO; inputs need YYYY-MM-DD. */
export function toDateInputValue(value) {
  if (isBlank(value)) return "";
  const match = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

const toText = (value) => (isBlank(value) ? "" : String(value));

const toRemark = (value) => {
  if (!value || typeof value !== "object" || isBlank(value.text)) return null;
  return {
    id: value.id ?? null,
    text: String(value.text),
    author: toText(value.author),
    created_at: value.created_at || null,
    direction: value.direction || null,
  };
};

const toTimestamp = (value) => (isBlank(value) ? null : value);

/** Two-way fields from a raw list/detail order. Detail-only arrays default to []. */
export function getClientOrderTwoWayState(raw) {
  const order = raw && typeof raw === "object" ? raw : {};
  return {
    isEditable: order.is_editable === true,
    remarkToNm: toRemark(order.remark_to_nm),
    remarkToClient: toRemark(order.remark_to_client),
    hasNewFromNarvi: order.has_new_from_narvi === true,
    narviUpdatedAt: toTimestamp(order.narvi_updated_at),
    clientUpdatePending: order.client_update_pending === true,
    clientUpdatedAt: toTimestamp(order.client_updated_at),
    seenByNarviAt: toTimestamp(order.seen_by_narvi_at),
    remarks: (Array.isArray(order.remarks) ? order.remarks : []).map(toRemark).filter(Boolean),
    changes: (Array.isArray(order.changes) ? order.changes : []).filter(
      (change) => change && typeof change === "object"
    ),
  };
}

/** Initial edit form values. remark_to_nm is a new message, so it always starts empty. */
export function buildClientOrderEditForm(raw) {
  const order = raw && typeof raw === "object" ? raw : {};
  return {
    eta_date: toDateInputValue(order.eta_date),
    etb: toDateInputValue(order.etb),
    etd: toDateInputValue(order.etd),
    vsls_agent_dtls: toText(order.vsls_agent_dtls || order.vsls_agent_details),
    client_case_invoice_ref: toText(order.client_case_invoice_ref),
    remark_to_nm: "",
  };
}

/** ETA <= ETB <= ETD, comparing only the dates that are set. Returns a message or null. */
export function validateClientOrderDates({ eta_date, etb, etd } = {}) {
  const eta = toDateInputValue(eta_date);
  const berth = toDateInputValue(etb);
  const departure = toDateInputValue(etd);
  if (eta && berth && eta > berth) return "ETA must be on or before ETB.";
  if (berth && departure && berth > departure) return "ETB must be on or before ETD.";
  if (eta && departure && eta > departure) return "ETA must be on or before ETD.";
  return null;
}

/**
 * Body for POST /api/client/shipping/order/update with only the changed keys.
 * Cleared dates are sent as null. Returns null when nothing changed.
 */
export function buildClientOrderUpdatePayload(id, initial = {}, form = {}, clientId = null) {
  const changes = {};

  CLIENT_ORDER_DATE_FIELDS.forEach((key) => {
    const before = toDateInputValue(initial[key]);
    const after = toDateInputValue(form[key]);
    if (before !== after) changes[key] = after || null;
  });

  CLIENT_ORDER_TEXT_FIELDS.forEach((key) => {
    const before = toText(initial[key]).trim();
    const after = toText(form[key]).trim();
    if (before !== after) changes[key] = after;
  });

  const remark = toText(form.remark_to_nm).trim();
  if (remark) changes.remark_to_nm = remark;

  if (!Object.keys(changes).length) return null;

  const payload = { id: Number.isNaN(Number(id)) ? id : Number(id), ...changes };
  if (clientId != null && clientId !== "") payload.client_id = clientId;
  return payload;
}

/** Only an explicit open of a flagged order marks it seen; list loading never does. */
export function shouldMarkClientOrderSeen(raw) {
  return Boolean(raw && raw.id != null && raw.has_new_from_narvi === true);
}

export function formatChangeValue(value) {
  if (isBlank(value)) return "—";
  if (typeof value === "object") return value.name || value.label || JSON.stringify(value);
  return String(value);
}
