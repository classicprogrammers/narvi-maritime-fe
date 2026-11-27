import { readPersistedFilters, writePersistedFilters } from "./persistedFilters";

export const LEDGER_EDIT_MAX_ROWS = 50;

const VIEW_SCREEN_KEYS = {
  cost: "ledgerCostEditView",
  invoice: "ledgerInvoiceEditView",
};

export const LEDGER_EDIT_EMPTY_MESSAGE = "Select at least one record to edit.";
export const LEDGER_EDIT_LIMIT_MESSAGE = `Edit supports up to ${LEDGER_EDIT_MAX_ROWS} records. Clear some rows.`;

/**
 * Parses `?ids=1,2,3` into unique numeric ids (first occurrence order), capped at
 * LEDGER_EDIT_MAX_ROWS. `truncated` is true when more valid ids were dropped.
 */
export function parseEditIds(search) {
  const raw = new URLSearchParams(search || "").get("ids") || "";
  const seen = new Set();
  const all = [];
  raw.split(",").forEach((part) => {
    const token = part.trim();
    if (!/^\d+$/.test(token)) return;
    const n = Number(token);
    if (n < 1) return;
    if (seen.has(n)) return;
    seen.add(n);
    all.push(n);
  });
  return {
    ids: all.slice(0, LEDGER_EDIT_MAX_ROWS),
    truncated: all.length > LEDGER_EDIT_MAX_ROWS,
  };
}

/**
 * Table view: `${base}/edit?ids=...` (ids, or just `id`).
 * Form view: `${base}/form/:id` (id, or first id) plus `?ids=` when several ids.
 */
export function buildLedgerEditPath({ base, view, ids = [], id }) {
  const list = Array.isArray(ids) ? ids : [];
  if (view === "table") {
    const tableIds = list.length ? list : id != null ? [id] : [];
    return `${base}/edit?ids=${tableIds.join(",")}`;
  }
  const target = id != null ? id : list[0];
  const query = list.length > 1 ? `?ids=${list.join(",")}` : "";
  return `${base}/form/${target}${query}`;
}

const normalizeView = (value) => (value === "table" ? "table" : "form");

export function readLedgerEditView(entity) {
  const screen = VIEW_SCREEN_KEYS[entity];
  if (!screen) return "form";
  return readPersistedFilters(screen, normalizeView) || "form";
}

export function writeLedgerEditView(entity, view) {
  const screen = VIEW_SCREEN_KEYS[entity];
  if (!screen) return;
  writePersistedFilters(screen, normalizeView(view));
}

/** Returns an error message, or null when the selection can be edited. */
export function validateEditSelection(ids) {
  const count = Array.isArray(ids) ? ids.length : 0;
  if (count === 0) return LEDGER_EDIT_EMPTY_MESSAGE;
  if (count > LEDGER_EDIT_MAX_ROWS) return LEDGER_EDIT_LIMIT_MESSAGE;
  return null;
}
