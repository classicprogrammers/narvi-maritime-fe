/**
 * Link a save to the draft its form was resumed from (single-record forms and modals).
 * Reusing the draft key means a failed save updates the same draft; success removes it.
 */
export function resolveDraftSource(resumedDraft, mode) {
  if (!resumedDraft || resumedDraft.mode !== mode) return {};
  return { draftKey: resumedDraft.key, sourceDraftId: resumedDraft.id };
}

export default resolveDraftSource;
