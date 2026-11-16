import { FILTERS_KEY_PREFIX, getCurrentStoredUserId } from "./authStorage";

/**
 * Per-user, per-screen saved list filters. They live in localStorage under the
 * `filters:` prefix, which the boot-time wipe keeps, so they survive navigation,
 * refreshes and new tabs until the user clears them.
 */
export const persistedFiltersKey = (screen) =>
  `${FILTERS_KEY_PREFIX}${screen}:${getCurrentStoredUserId() ?? "anon"}`;

/** Returns `build(savedValue)` or null when nothing valid is saved. */
export function readPersistedFilters(screen, build) {
  try {
    const raw = localStorage.getItem(persistedFiltersKey(screen));
    return raw ? build(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writePersistedFilters(screen, state) {
  try {
    localStorage.setItem(persistedFiltersKey(screen), JSON.stringify(state));
  } catch {
    // ignore
  }
}
