import { describeDraftError } from "./drafts";

/**
 * Runs `draft.requests` one after another through `moduleDef.apis`.
 * `defaultIsFailure` is injected so this file stays free of API imports.
 * Returns `{ ok, succeeded, error }`. `succeeded` is the number of leading requests that passed.
 */
export async function runDraftRequests(draft, moduleDef, defaultIsFailure) {
  const requests = Array.isArray(draft?.requests) ? draft.requests : [];
  let succeeded = 0;
  for (const req of requests) {
    let result;
    try {
      result = await moduleDef.apis[req.api](...(Array.isArray(req.args) ? req.args : []));
    } catch (err) {
      return { ok: false, succeeded, error: describeDraftError(err, "Retry failed") };
    }
    const failed =
      typeof moduleDef.isFailure === "function"
        ? moduleDef.isFailure(req.api, result, req.args)
        : defaultIsFailure(result);
    if (failed) {
      return { ok: false, succeeded, error: describeDraftError(result, "Retry failed") };
    }
    succeeded += 1;
  }
  return { ok: true, succeeded, error: null };
}

/** Draft after a failed Retry: succeeded requests dropped, error and updatedAt refreshed. */
export function applyRetryFailure(draft, outcome, now = new Date()) {
  return {
    ...draft,
    requests: (draft.requests || []).slice(outcome.succeeded || 0),
    error: outcome.error || draft.error || null,
    updatedAt: now.toISOString(),
  };
}

export function formatDraftDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
