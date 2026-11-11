import { getApiErrorMessage } from "./formApiErrors";
import { sanitizeDraftValue } from "./draftSanitize";

const SECRET_PATH_KEYS = ["password", "confirm_password", "new_password", "newPassword"];

export function makeDraftId(now = Date.now(), random = Math.random) {
  return `d_${now}_${random().toString(36).slice(2, 8)}`;
}

export function makeDraftKey(module, mode, recordIdOrSessionKey) {
  return `${module}:${mode}:${recordIdOrSessionKey ?? "new"}`;
}

export function describeDraftError(errOrResult, fallback) {
  if (!errOrResult) return null;
  const rawStatus = errOrResult.response?.status ?? errOrResult.status;
  const status = typeof rawStatus === "number" ? rawStatus : null;
  const resultMessage =
    errOrResult.result && typeof errOrResult.result.message === "string"
      ? errOrResult.result.message
      : null;
  const message =
    resultMessage && !errOrResult.message
      ? resultMessage
      : getApiErrorMessage(errOrResult, fallback);
  return { message, status };
}

export function buildDraft({
  id,
  key,
  module,
  mode,
  recordId = null,
  label = "",
  source = "failure",
  formState = null,
  requests = [],
  error = null,
  now = new Date(),
}) {
  const form = formState == null ? { value: null, stripped: [] } : sanitizeDraftValue(formState);
  const reqs = sanitizeDraftValue(Array.isArray(requests) ? requests : []);
  const iso = now.toISOString();
  return {
    id: id || makeDraftId(now.getTime()),
    key: key || makeDraftKey(module, mode, recordId),
    module,
    mode,
    recordId,
    label,
    source,
    formState: form.value,
    requests: Array.isArray(reqs.value) ? reqs.value : [],
    error: error || null,
    stripped: [
      ...form.stripped.map((p) => `formState.${p}`),
      ...reqs.stripped.map((p) => `requests${p.startsWith("[") ? "" : "."}${p}`),
    ],
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Matches on `key`. The existing draft keeps its `id` and `createdAt`. */
export function upsertDraftInList(list, draft) {
  const items = Array.isArray(list) ? list : [];
  const existing = items.find((item) => item.key === draft.key);
  if (!existing) return [...items, draft];
  const merged = { ...draft, id: existing.id, createdAt: existing.createdAt };
  return items.map((item) => (item.key === draft.key ? merged : item));
}

export function removeDraftFromList(list, id) {
  return (Array.isArray(list) ? list : []).filter((item) => item.id !== id);
}

export function sortDraftsNewestFirst(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

function secretWasStripped(draft) {
  return (draft.stripped || []).some((path) => {
    const last = String(path).split(".").pop();
    return SECRET_PATH_KEYS.includes(last);
  });
}

/** Retry needs stored requests, known API functions and (for Users/Client-login) the stripped secret. */
export function canRetryDraft(draft, moduleDef) {
  if (!draft || !moduleDef) return false;
  if (!Array.isArray(draft.requests) || draft.requests.length === 0) return false;
  if (!draft.requests.every((req) => typeof moduleDef.apis?.[req.api] === "function")) return false;
  if (moduleDef.requiresSecrets && secretWasStripped(draft)) return false;
  return true;
}

/** Category D (inline/bulk/derived) has no Resume. */
export function canResumeDraft(draft, moduleDef) {
  if (!draft || !moduleDef) return false;
  if (moduleDef.category === "D") return false;
  if (typeof moduleDef.resumeTo !== "function") return false;
  return draft.formState != null;
}
