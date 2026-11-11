import { useCallback } from "react";
import { useSelector, useStore } from "react-redux";
import { useToast } from "@chakra-ui/react";
import { useDrafts } from "redux/hooks/useDrafts";
import { buildDraft } from "utils/drafts";
import { saveWithDraftCore, saveManualDraftCore, flushDraftsToStorage } from "utils/saveWithDraftCore";
import { writeDrafts } from "utils/draftStorage";
import { defaultIsFailure } from "config/draftModules";

/**
 * Wraps an existing create/update call so the user's input is kept as a draft when it fails.
 * See docs/specs/001-drafts.md ("State & API changes").
 */
export function useSaveWithDraft() {
  const toast = useToast();
  const store = useStore();
  const userId = useSelector((state) => state.user?.user?.id ?? null);
  const { upsertDraft, removeDraft, removeDraftByKey } = useDrafts();
  const hasUser = userId !== null && userId !== undefined && userId !== "";

  const getDeps = useCallback(() => {
    const notify = ({ id, title, status }) => {
      if (toast.isActive(id)) return;
      toast({ id, title, status, duration: 4000, isClosable: true });
    };
    // Write to localStorage right away (a 401 redirect can unload the page before
    // useDraftsSync's effect runs). The effect later writes the same content, which is harmless.
    const withFlush =
      (fn) =>
      (...args) => {
        fn(...args);
        flushDraftsToStorage({ userId, draftsState: store.getState().drafts, write: writeDrafts, notify });
      };
    return {
      hasUser,
      buildDraftFn: buildDraft,
      upsert: withFlush(upsertDraft),
      removeByKey: withFlush(removeDraftByKey),
      removeById: withFlush(removeDraft),
      notify,
    };
  }, [hasUser, userId, store, upsertDraft, removeDraft, removeDraftByKey, toast]);

  const saveWithDraft = useCallback(
    (options) =>
      saveWithDraftCore({ ...options, isFailure: options.isFailure || defaultIsFailure }, getDeps()),
    [getDeps]
  );

  const saveManualDraft = useCallback(
    (options) => saveManualDraftCore(options, getDeps()),
    [getDeps]
  );

  return { saveWithDraft, saveManualDraft };
}

export default useSaveWithDraft;
