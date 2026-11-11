import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import {
  upsertDraft,
  removeDraft,
  removeDraftByKey,
  selectDrafts,
  selectDraftCount,
} from "../slices/draftsSlice";

export const useDrafts = () => {
  const dispatch = useDispatch();
  const drafts = useSelector(selectDrafts);
  const draftCount = useSelector(selectDraftCount);
  const hydrated = useSelector((state) => state.drafts.hydrated);

  const saveDraft = useCallback((draft) => {
    dispatch(upsertDraft(draft));
  }, [dispatch]);

  const deleteDraft = useCallback((id) => {
    dispatch(removeDraft(id));
  }, [dispatch]);

  const deleteDraftByKey = useCallback((key) => {
    dispatch(removeDraftByKey(key));
  }, [dispatch]);

  return {
    // State
    drafts,
    draftCount,
    hydrated,

    // Actions
    upsertDraft: saveDraft,
    removeDraft: deleteDraft,
    removeDraftByKey: deleteDraftByKey,
  };
};
