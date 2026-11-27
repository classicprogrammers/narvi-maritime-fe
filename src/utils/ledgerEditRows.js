// Row logic for the Ledger table edit screens (Cost DB / Invoice DB).
// Entity-agnostic: every function takes an adapter
// { recordToForm, buildUpdatePayload, getSignature, applyComputedFromRecord, validate, isCancelled }.
// Row: { key, id, record, baseline, values, status, message, acceptedOtherAgentKey }
// Statuses: no_changes, edited, saving, saved, missing, duplicate, check_invoice, error, cancelled, load_error.

export const EDIT_ROW_STATUS = {
  NO_CHANGES: "no_changes",
  EDITED: "edited",
  SAVING: "saving",
  SAVED: "saved",
  MISSING: "missing",
  DUPLICATE: "duplicate",
  CHECK_INVOICE: "check_invoice",
  ERROR: "error",
  CANCELLED: "cancelled",
  LOAD_ERROR: "load_error",
};

// Statuses a save run counts as "needs attention"
const ATTENTION_STATUSES = [
  EDIT_ROW_STATUS.MISSING,
  EDIT_ROW_STATUS.DUPLICATE,
  EDIT_ROW_STATUS.CHECK_INVOICE,
  EDIT_ROW_STATUS.ERROR,
];

// Rows that can never be edited or saved
const LOCKED_STATUSES = [
  EDIT_ROW_STATUS.CANCELLED,
  EDIT_ROW_STATUS.LOAD_ERROR,
  EDIT_ROW_STATUS.SAVING,
];

export const recordToEditRow = (adapter, record, key) => {
  const baseline = adapter.recordToForm(record);
  const cancelled = Boolean(adapter.isCancelled(record));
  return {
    key: key ?? String(record?.id),
    id: record?.id,
    record,
    baseline,
    values: { ...baseline },
    status: cancelled ? EDIT_ROW_STATUS.CANCELLED : EDIT_ROW_STATUS.NO_CHANGES,
    message: "",
    acceptedOtherAgentKey: "",
  };
};

export const isRowDirty = (adapter, row) =>
  adapter.getSignature(row.values) !== adapter.getSignature(row.baseline);

// Merge a cell edit. Cancelled / load-error / saving rows are returned untouched.
// Status goes back to "edited" (and the message clears); "no_changes" if the edit restored the baseline.
export const patchEditRow = (adapter, row, patch) => {
  if (LOCKED_STATUSES.includes(row.status)) return row;
  const next = { ...row, values: { ...row.values, ...patch }, message: "" };
  next.status = isRowDirty(adapter, next)
    ? EDIT_ROW_STATUS.EDITED
    : EDIT_ROW_STATUS.NO_CHANGES;
  return next;
};

// Dirty rows that may be sent (cancelled / load-error / saving are excluded)
export const rowsToSave = (adapter, rows) =>
  (rows || []).filter(
    (row) => !LOCKED_STATUSES.includes(row.status) && isRowDirty(adapter, row)
  );

// { skip: true } when the diff payload is only { id } (nothing to send), else { payload }
export const buildRowUpdate = (adapter, row) => {
  const payload = adapter.buildUpdatePayload(row.values, row.baseline, row.id);
  if (Object.keys(payload).length <= 1) return { skip: true };
  return { payload };
};

// After a successful update + refetch: the refetched record becomes the baseline
export const applySavedRecord = (adapter, row, record) => {
  const values = adapter.applyComputedFromRecord(row.values, record);
  return {
    ...row,
    record: record || row.record,
    baseline: values,
    values: { ...values },
    status: adapter.isCancelled(record)
      ? EDIT_ROW_STATUS.CANCELLED
      : EDIT_ROW_STATUS.SAVED,
    message: "",
    acceptedOtherAgentKey: "",
  };
};

// "x saved, y need attention"; pass `keys` to count only the rows of this save run
export const saveSummary = (rows, keys) => {
  const scope = keys ? (rows || []).filter((row) => keys.includes(row.key)) : rows || [];
  const saved = scope.filter((row) => row.status === EDIT_ROW_STATUS.SAVED).length;
  const attention = scope.filter((row) => ATTENTION_STATUSES.includes(row.status)).length;
  return { saved, attention, text: `${saved} saved, ${attention} need attention` };
};

// ROE / due: keep a stored automatic value as is; preview only when empty or its inputs changed.
// Manual values are never previewed over.
export const shouldPreviewAuto = ({ manual, value, inputsChanged }) => {
  if (manual) return false;
  const empty = value == null || value === false || String(value).trim() === "";
  return empty || Boolean(inputsChanged);
};

// Cost other-agent check (AC13). The key is the normalized invoice number text.
export const otherAgentKey = (form) => String(form?.invoices ?? "").trim();

export const otherAgentCheckNeeded = (row) => {
  const key = otherAgentKey(row.values);
  if (!key) return false;
  if (key === otherAgentKey(row.baseline)) return false;
  return key !== row.acceptedOtherAgentKey;
};

// Warning found: the row waits in "check_invoice"; the same numbers are accepted on the next Save
export const markOtherAgentWarning = (row, message) => ({
  ...row,
  status: EDIT_ROW_STATUS.CHECK_INVOICE,
  message: message || "",
  acceptedOtherAgentKey: otherAgentKey(row.values),
});

// Batch load result -> one record (or null when missing) per requested id, in the requested order
export const pickRecordsByIds = (ids, records) => {
  const byId = new Map((Array.isArray(records) ? records : []).map((record) => [String(record?.id), record]));
  return (Array.isArray(ids) ? ids : []).map((id) => byId.get(String(id)) || null);
};
