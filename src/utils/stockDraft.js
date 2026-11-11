import {
  filterRowsWithBulkSaveFailures,
  getStockBulkSaveFailedIndices,
  getStockBulkSaveResultData,
  hasStockBulkSaveErrors,
} from "./stockBulkSaveResult";

const hasValue = (value) => value != null && value !== false && String(value).trim() !== "";

/** Stock create/update result is a failure unless status is "success" with no per-line errors. */
export function isStockSaveFailure(result) {
  const data = getStockBulkSaveResultData(result);
  return !data || data.status !== "success" || hasStockBulkSaveErrors(data);
}

/** Redux `updateStockItem` action result: `{ success, data | error }`, plus per-line errors in `data`. */
export function isStockActionFailure(result) {
  if (result?.success !== true) return true;
  return hasStockBulkSaveErrors(getStockBulkSaveResultData(result.data));
}

/** The action swallows errors into `{ error }`; expose it as `message` so the draft shows the reason. */
export function withActionErrorMessage(result) {
  if (result && result.success === false && result.error && !result.message) {
    return { ...result, message: String(result.error) };
  }
  return result;
}

export function getStockDraftMode(rows) {
  return (rows || []).some((row) => hasValue(row?.stockId)) ? "update" : "create";
}

export function buildStockDraftLabel(rows) {
  const list = rows || [];
  if (list.length === 1) {
    const name = hasValue(list[0]?.stockItemId) ? String(list[0].stockItemId) : "";
    return name || "1 stock item";
  }
  return `${list.length} stock items`;
}

/** formState for Resume: rows plus the route state that reopens the form in the same mode. */
export function buildStockFormState({ rows, selectedItems, isBulkEdit, sourcePage }) {
  const list = rows || [];
  const ids = new Set(list.filter((row) => hasValue(row?.stockId)).map((row) => String(row.stockId)));
  const items = (selectedItems || []).filter((item) => ids.has(String(item?.id ?? item?.stock_id)));
  return {
    formRows: list,
    routeState: { selectedItems: items, isBulkEdit: Boolean(isBulkEdit), sourcePage: sourcePage ?? null },
  };
}

/** `failedFormState` for saveWithDraft: on partial success keep only the failed rows. */
export function buildFailedStockFormState({ rows, getRowId, unsentRows, ...context }) {
  return (result) => {
    const data = getStockBulkSaveResultData(result);
    const partial = data?.status === "success" && hasStockBulkSaveErrors(data);
    const failedRows = partial
      ? filterRowsWithBulkSaveFailures(rows, data, getRowId ? { getRowId } : undefined)
      : [...rows, ...(unsentRows || [])]; // a non-partial failure stops the save, so unsent rows are kept too
    return buildStockFormState({ rows: failedRows, ...context });
  };
}

/**
 * Link a save to the draft the form was resumed from. A manual draft holds every row, so any
 * success removes it. A failure draft is reused (same key) and removed only by its own call.
 */
export function resolveStockDraftSource(resumedDraft, mode) {
  if (!resumedDraft) return {};
  if (resumedDraft.source === "manual") return { sourceDraftId: resumedDraft.id };
  if (resumedDraft.mode === mode) return { draftKey: resumedDraft.key, sourceDraftId: resumedDraft.id };
  return {};
}

/**
 * StockForm saves one row per call, each with its own draft. A resumed failure draft is reused
 * (same key) and removed on success only for the row it holds (matched by stockId, or row id for creates).
 */
export function resolveStockRowDraftSource(resumedDraft, mode, row) {
  if (!resumedDraft || resumedDraft.source === "manual" || resumedDraft.mode !== mode) return {};
  const draftRow = resumedDraft.formState?.formRows?.[0];
  const same =
    mode === "update"
      ? hasValue(row?.stockId) && String(draftRow?.stockId) === String(row.stockId)
      : hasValue(row?.id) && String(draftRow?.id) === String(row.id);
  return same ? { draftKey: resumedDraft.key, sourceDraftId: resumedDraft.id } : {};
}

/**
 * Inline stock saves keep Retry requests only. After a partial success, narrow the stored
 * `[stockId, { lines }]` request (in place) to the lines that failed, so Retry never resends saved lines.
 */
export function narrowRequestsToFailedLines(requests, result) {
  const data = getStockBulkSaveResultData(result);
  if (!data || data.status !== "success" || !hasStockBulkSaveErrors(data)) return;
  requests.forEach((req) => {
    const payload = req?.args?.[1];
    if (!payload || !Array.isArray(payload.lines)) return;
    const lines = filterRowsWithBulkSaveFailures(payload.lines, data, { getRowId: (line) => line?.stock_id });
    req.args = [req.args[0], { ...payload, lines }];
  });
}

/**
 * Stock create sends `{ lines }` with no ids, so failures are matched by line index. After a partial
 * success, narrow the stored create request (in place) to the failed lines. When the failures cannot be
 * matched to lines, empty `requests` (Resume only) so Retry never recreates saved lines.
 */
export function narrowCreateRequestsToFailedLines(requests, result) {
  const data = getStockBulkSaveResultData(result);
  if (!data || data.status !== "success" || !hasStockBulkSaveErrors(data)) return;
  const failedIndices = getStockBulkSaveFailedIndices(data);
  if (failedIndices.size === 0) {
    requests.length = 0;
    return;
  }
  requests.forEach((req) => {
    const payload = req?.args?.[0];
    if (!payload || !Array.isArray(payload.lines)) return;
    const lines = payload.lines.filter((_, index) => failedIndices.has(index));
    req.args = [{ ...payload, lines }];
  });
}
