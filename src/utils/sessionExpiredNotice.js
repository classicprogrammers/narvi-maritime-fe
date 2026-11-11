import { DRAFT_STORAGE_PREFIX, parseDraftsEnvelope } from "./draftStorage";

// Boot (`bootstrapAuthStorage.js`) clears sessionStorage and every localStorage key except auth keys and
// keys starting with "drafts:". The redirect after a 401 is a full page load, so the flag must live under
// the preserved "drafts:" prefix to reach the login page.
export const SESSION_EXPIRED_NOTICE_KEY = "drafts:session_expired_notice";
export const SESSION_EXPIRED_MESSAGE = "Session expired, please sign in again.";
export const SESSION_EXPIRED_WITH_DRAFTS_MESSAGE =
  "Session expired, please sign in again. Your data was saved to Drafts.";

/** True when any stored draft list (auth is already cleared here, so the user is unknown) is not empty. */
function hasStoredDrafts() {
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key !== SESSION_EXPIRED_NOTICE_KEY && key.startsWith(DRAFT_STORAGE_PREFIX)) {
      if (parseDraftsEnvelope(localStorage.getItem(key)).length > 0) return true;
    }
  }
  return false;
}

export function markSessionExpired() {
  try {
    localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, "1");
  } catch (_) {}
}

/** Returns the message to show once (then clears the flag), or null when the user was not logged out by a 401. */
export function consumeSessionExpired() {
  try {
    const flag = localStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);
    if (!flag) return null;
    localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
    // decided here: the failing save's draft is stored after the flag is set
    return hasStoredDrafts() ? SESSION_EXPIRED_WITH_DRAFTS_MESSAGE : SESSION_EXPIRED_MESSAGE;
  } catch (_) {
    return null;
  }
}
