const hasId = (value) => value !== null && value !== undefined && value !== "";

const keepStoredAttachments = (row) => ({
  ...row,
  // uploads (base64) are never stored; only attachments that already exist on the server are kept
  attachments: Array.isArray(row?.attachments) ? row.attachments.filter((att) => hasId(att?.id)) : [],
  attachment_to_delete: Array.isArray(row?.attachment_to_delete) ? row.attachment_to_delete : [],
});

/** Record id for a vessel draft: the vessel id(s) being updated, or undefined for creates. */
export function getVesselDraftRecordId(rows) {
  const ids = (rows || []).filter((row) => hasId(row?.vessel_id)).map((row) => row.vessel_id);
  if (ids.length === 0) return undefined;
  return ids.length === 1 ? ids[0] : ids;
}

export function buildVesselDraftLabel(rows) {
  const list = rows || [];
  if (list.length === 1) return list[0]?.name ? String(list[0].name) : "1 vessel";
  return `${list.length} vessels`;
}

/**
 * Overlay draft rows on the freshly loaded rows. Rows with a vessel id replace the loaded row with
 * the same id (the loaded baseline stays untouched, so the diff is against fresh data); a vessel that
 * no longer loads is skipped. Rows without an id are appended.
 */
export function applyVesselDraftRows(loadedRows, draftRows) {
  const base = Array.isArray(loadedRows) ? loadedRows : [];
  const draft = Array.isArray(draftRows) ? draftRows : [];
  if (draft.length === 0) return base;
  const byId = new Map(
    draft.filter((row) => hasId(row?.vessel_id)).map((row) => [String(row.vessel_id), row])
  );
  const merged = base.map((row) => {
    const match = hasId(row.vessel_id) ? byId.get(String(row.vessel_id)) : null;
    return match ? { ...row, ...keepStoredAttachments(match), key: row.key } : row;
  });
  const added = draft.filter((row) => !hasId(row?.vessel_id)).map(keepStoredAttachments);
  return [...merged, ...added];
}

/** Draft rows for a create screen (no loaded rows): upload-free copies. */
export function toCreateDraftRows(draftRows) {
  return (Array.isArray(draftRows) ? draftRows : []).map(keepStoredAttachments);
}
