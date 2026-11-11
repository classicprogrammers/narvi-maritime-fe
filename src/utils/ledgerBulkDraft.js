/** Ids from a bulk-update payload that the backend did not confirm in `result.ids` (partial failure). */
export function getFailedBulkIds(payload, result) {
  const ids = Array.isArray(payload?.ids) ? payload.ids : [];
  if (!Array.isArray(result?.ids)) return [];
  const done = new Set(result.ids.map(String));
  return ids.filter((id) => !done.has(String(id)));
}

/** True when some selected ids were not updated although the call did not throw. */
export function isLedgerBulkPartialFailure(payload, result) {
  return getFailedBulkIds(payload, result).length > 0;
}

/** Retry request for a bulk edit: same values, only the given ids (all of them when omitted). */
export function buildLedgerBulkRetryRequests(api, payload, ids) {
  return [{ api, args: [{ ...payload, ids: ids ?? payload.ids }] }];
}

/** Stable draft record id for a bulk edit (same selection gives the same draft). */
export function ledgerBulkRecordId(ids) {
  return (Array.isArray(ids) ? ids : []).map(String).sort().join(",");
}
