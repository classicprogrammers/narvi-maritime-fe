import { makeDraftKey, describeDraftError } from "./drafts";

export const DRAFT_SAVED_MESSAGE = "Your input was saved to Drafts";
export const DRAFT_MANUAL_MESSAGE = "Saved to Drafts";
export const DRAFT_NO_USER_MESSAGE = "Draft not saved: no user session";

const resolveKey = ({ draftKey, module, mode, recordId, sessionKey }) =>
  draftKey || makeDraftKey(module, mode, recordId ?? sessionKey);

/**
 * Pure core of useSaveWithDraft. All side effects are injected:
 * deps = { hasUser, buildDraftFn, upsert, removeByKey, removeById, notify }.
 * Only `call` is guarded; errors from code that runs before it are never seen here.
 */
export async function saveWithDraftCore(options, deps) {
  const { call, isFailure, failedFormState, sourceDraftId, formState, requests, module, mode, recordId, label } =
    options;
  const key = resolveKey(options);

  const persistFailure = (errOrResult, state) => {
    if (!deps.hasUser) {
      deps.notify({ id: "draft-not-saved-no-user", title: DRAFT_NO_USER_MESSAGE, status: "warning" });
      return;
    }
    deps.upsert(
      deps.buildDraftFn({
        key,
        module,
        mode,
        recordId: recordId ?? null,
        label,
        source: "failure",
        formState: state,
        requests,
        error: describeDraftError(errOrResult, "Save failed"),
      })
    );
    deps.notify({ id: `draft-saved-${key}`, title: DRAFT_SAVED_MESSAGE, status: "info" });
  };

  let result;
  try {
    result = await call();
  } catch (err) {
    persistFailure(err, formState);
    throw err;
  }

  if (isFailure(result)) {
    persistFailure(result, failedFormState ? failedFormState(result) : formState);
    return result;
  }

  if (sourceDraftId) deps.removeById(sourceDraftId);
  deps.removeByKey(key);
  return result;
}

/** Manual "Save as draft": no API call, no validation. Same key updates the same draft. */
export function saveManualDraftCore(options, deps) {
  const { module, mode, recordId, label, formState } = options;
  const key = resolveKey(options);
  if (!deps.hasUser) {
    deps.notify({ id: "draft-not-saved-no-user", title: DRAFT_NO_USER_MESSAGE, status: "warning" });
    return false;
  }
  deps.upsert(
    deps.buildDraftFn({
      key,
      module,
      mode,
      recordId: recordId ?? null,
      label,
      source: "manual",
      formState,
      requests: [],
      error: null,
    })
  );
  deps.notify({ id: `draft-manual-${key}`, title: DRAFT_MANUAL_MESSAGE, status: "success" });
  return true;
}

/**
 * Synchronous storage write after a draft mutation, so a 401 redirect cannot unload the page
 * before useDraftsSync's effect runs. `draftsState` is the latest `state.drafts`.
 * Skipped until the slice is hydrated for this user (would overwrite stored drafts).
 */
export function flushDraftsToStorage({ userId, draftsState, write, notify }) {
  if (userId === null || userId === undefined || userId === "") return false;
  if (!draftsState?.hydrated || draftsState.userId !== userId) return false;
  const result = write(userId, draftsState.items);
  if (!result.ok) {
    notify({
      id: "draft-storage-full",
      title: "Draft could not be stored (browser storage full)",
      status: "warning",
    });
  }
  return result.ok;
}
