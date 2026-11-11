export const DRAFT_STORAGE_PREFIX = "drafts:";
export const DRAFT_STORAGE_VERSION = 1;

export function draftStorageKey(userId) {
  return `${DRAFT_STORAGE_PREFIX}${userId}`;
}

export function isDraftStorageKey(key) {
  return typeof key === "string" && key.startsWith(DRAFT_STORAGE_PREFIX);
}

/** Corrupt JSON, a wrong shape or an unknown version all load as zero drafts. */
export function parseDraftsEnvelope(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    if (parsed.version !== DRAFT_STORAGE_VERSION) return [];
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items.filter((item) => item && typeof item === "object" && item.id && item.key);
  } catch {
    return [];
  }
}

function hasUserId(userId) {
  return userId !== undefined && userId !== null && userId !== "";
}

export function readDrafts(userId) {
  try {
    if (!hasUserId(userId) || typeof localStorage === "undefined") return [];
    return parseDraftsEnvelope(localStorage.getItem(draftStorageKey(userId)));
  } catch {
    return [];
  }
}

function isQuotaError(error) {
  return (
    error?.name === "QuotaExceededError" ||
    error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

/** Returns `{ ok: true }` or `{ ok: false, reason }` (`no-user`, `unavailable`, `quota`, `error`). */
export function writeDrafts(userId, items) {
  if (!hasUserId(userId)) return { ok: false, reason: "no-user" };
  try {
    if (typeof localStorage === "undefined") return { ok: false, reason: "unavailable" };
    localStorage.setItem(
      draftStorageKey(userId),
      JSON.stringify({ version: DRAFT_STORAGE_VERSION, items: Array.isArray(items) ? items : [] })
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "error" };
  }
}
