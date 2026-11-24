// Pure helpers for the merged-PDF endpoints (client portal item, live stock list).

export const MERGE_PDF_MAX_ITEMS = 100;

// preset: cipl (default, no Stock Report / MSDS) | client (no MSDS) | all
export const MERGE_PRESETS = {
  cipl: { value: "cipl", label: "CIPL PDF" },
  all: { value: "all", label: "Merge PDF" },
};

// Request body for POST /api/stock/list/merge-pdf. Empty optional fields are left out.
export const buildMergeRequestBody = ({ ids, preset, excludeTypes, attachmentIds, preview, download } = {}) => {
  const body = { ids: (ids || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)) };
  if (preset) body.preset = preset;
  if (Array.isArray(excludeTypes) && excludeTypes.length) body.exclude_types = excludeTypes;
  if (Array.isArray(attachmentIds) && attachmentIds.length) body.attachment_ids = attachmentIds;
  if (preview) body.preview = true;
  if (download) body.download = true;
  return body;
};

// Returns an error message or null
export const validateMergeIds = (ids) => {
  const count = (ids || []).length;
  if (count === 0) return "Select at least one stock item.";
  if (count > MERGE_PDF_MAX_ITEMS) return `Merge supports up to ${MERGE_PDF_MAX_ITEMS} items at once. Clear some rows.`;
  return null;
};

// Preview JSON -> { fileCount, pageCount, included, skipped }
export const normalizeMergePreview = (data) => {
  const payload = data?.result && typeof data.result === "object" && data.result.included ? data.result : data || {};
  const included = Array.isArray(payload.included) ? payload.included : [];
  const skipped = Array.isArray(payload.skipped) ? payload.skipped : [];
  return {
    fileCount: Number(payload.file_count) || included.length,
    pageCount: Number(payload.page_count) || included.reduce((sum, f) => sum + (Number(f.pages) || 0), 0),
    included,
    skipped,
  };
};

// Which attachment ids to send: null (= merge everything the preset includes) when all are ticked
export const pickAttachmentIds = (included, ticked) => {
  const all = (included || []).map((f) => f.attachment_id);
  const chosen = all.filter((id) => ticked.has(id));
  return chosen.length === all.length ? null : chosen;
};

export const mergeFilename = (prefix = "merged") => `${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`;
