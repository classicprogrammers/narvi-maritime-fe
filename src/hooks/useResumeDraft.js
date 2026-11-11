import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectDraftById } from "redux/slices/draftsSlice";

/**
 * Returns the draft opened via Resume (`location.state.draftId`) once the form's own data
 * has loaded (`ready`), so fetched data does not overwrite the draft values.
 * `draftId` is returned as soon as it is known, to pass as `sourceDraftId` to saveWithDraft.
 */
export function useResumeDraft(moduleKeys, { ready = false } = {}) {
  const location = useLocation();
  const draftId = location.state?.draftId ?? null;
  const found = useSelector(draftId ? selectDraftById(draftId) : () => null);
  const keysSignature = (moduleKeys || []).join("|");

  const draft = useMemo(() => {
    if (!ready || !found) return null;
    return keysSignature.split("|").includes(found.module) ? found : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, found, keysSignature]);

  return { draft, draftId: draft ? draftId : null };
}

export default useResumeDraft;
