const FAILED_STATUSES = ["error", "failed", "fail"];

/**
 * Failure check for APIs whose success response has no documented shape (config lists, users, ...):
 * only an explicit error counts (error status, `error` field, false result, success: false, errors[]).
 * A thrown error is handled by the caller (saveWithDraft / Retry).
 */
export function isExplicitFailure(result) {
  if (result === false) return true;
  if (result == null || typeof result !== "object") return false;
  if (result.result === false || result.error) return true;
  const inner = result.result && typeof result.result === "object" ? result.result : null;
  if (inner?.error) return true;
  if (FAILED_STATUSES.includes(result.status) || FAILED_STATUSES.includes(inner?.status)) return true;
  if (result.success === false || inner?.success === false) return true;
  if (Array.isArray(result.errors) && result.errors.length > 0) return true;
  if (Array.isArray(inner?.errors) && inner.errors.length > 0) return true;
  return false;
}

export default isExplicitFailure;
