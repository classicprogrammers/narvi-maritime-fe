import { buildRateCreatePayload } from "./rateListForm";

/** True when the rate update/create result reports a failure without throwing (errors[] or status error). */
export function isRateSaveFailure(result) {
  if (result == null || typeof result !== "object") return false;
  const inner = result.result && typeof result.result === "object" ? result.result : null;
  if (result.status === "error" || inner?.status === "error") return true;
  return Array.isArray(result.errors) && result.errors.length > 0;
}

/** Ids of the update lines the backend rejected (errors carry `id` and/or the line `index`). */
export function getFailedRateLineIds(updateErrors, changedLines) {
  const ids = new Set();
  (Array.isArray(updateErrors) ? updateErrors : []).forEach((err) => {
    const id = err?.id ?? changedLines?.[err?.index]?.id;
    if (id != null) ids.add(String(id));
  });
  return ids;
}

/**
 * Indices of formRows still unsaved after a (partial) save.
 * Existing rows are kept only when they had changes and their line failed (or the update never completed);
 * new rows are kept unless they were already created.
 */
export function getRemainingRateRowIndices({
  formRows,
  changedLines,
  updateDone,
  updateErrors,
  createdKeys,
}) {
  const changedIds = new Set((changedLines || []).map((line) => String(line.id)));
  const failedIds = getFailedRateLineIds(updateErrors, changedLines);
  const created = new Set(createdKeys || []);
  const indices = [];
  (formRows || []).forEach((row, index) => {
    if (row.id) {
      const id = String(row.id);
      if (changedIds.has(id) && (!updateDone || failedIds.has(id))) indices.push(index);
      return;
    }
    if (!created.has(row._key)) indices.push(index);
  });
  return indices;
}

/**
 * Draft formState for the given row indices: rows, their baseline rows, remapped option pins and the
 * route state the form needs to reopen in the same mode (selectedItems limited to the kept rows).
 */
export function buildRateDraftFormState({
  formRows,
  originalRows,
  pins,
  indices,
  selectedItems,
  isBulkEdit,
}) {
  const rows = indices.map((index) => formRows[index]);
  const keptIds = new Set(rows.filter((row) => row.id).map((row) => String(row.id)));
  const remap = (source) =>
    indices.reduce((acc, oldIndex, newIndex) => {
      if (source?.[oldIndex]) acc[newIndex] = source[oldIndex];
      return acc;
    }, {});
  const items = (selectedItems || []).filter((item) => keptIds.has(String(item.id)));
  return {
    formRows: rows,
    originalRows: (originalRows || []).filter((row) => row.id && keptIds.has(String(row.id))),
    agentOptionPins: remap(pins?.agent),
    clientOptionPins: remap(pins?.client),
    currencyOptionPins: remap(pins?.currency),
    routeState: items.length ? { selectedItems: items, isBulkEdit: Boolean(isBulkEdit) } : {},
  };
}

/** Retry requests in order: remaining failed update lines first, then remaining new rows. */
export function buildRateRetryRequests({ formRows, changedLines, indices }) {
  const requests = [];
  const keptRows = indices.map((index) => formRows[index]);
  const keptIds = new Set(keptRows.filter((row) => row.id).map((row) => String(row.id)));
  const lines = (changedLines || []).filter((line) => keptIds.has(String(line.id)));
  if (lines.length) requests.push({ api: "updateRateListApi", args: [{ lines }] });
  keptRows
    .filter((row) => !row.id)
    .forEach((row) => requests.push({ api: "createRateListApi", args: [buildRateCreatePayload(row)] }));
  return requests;
}

/** Retry requests for CopyTariffModal: one create per rate that was not copied. */
export function buildRateCopyRetryRequests(failedPayloads) {
  return (failedPayloads || []).map((payload) => ({ api: "createRateListApi", args: [payload] }));
}
