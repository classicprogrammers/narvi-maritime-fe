import { isClientUserType } from "./userType";

export const AUTH_CONTEXTS = {
  ADMIN: "admin",
  CLIENT: "client",
};

export const AUTH_STORAGE_KEYS = {
  [AUTH_CONTEXTS.ADMIN]: {
    token: "admin_token",
    user: "admin_user",
  },
  [AUTH_CONTEXTS.CLIENT]: {
    token: "client_token",
    user: "client_user",
  },
};

const LEGACY_TOKEN_KEY = "token";
const LEGACY_USER_KEY = "user";

export const getAuthContextFromPath = (pathname) => {
  const path = String(
    pathname || (typeof window !== "undefined" ? window.location.pathname : "")
  ).toLowerCase();

  if (path.startsWith("/client")) {
    return AUTH_CONTEXTS.CLIENT;
  }

  return AUTH_CONTEXTS.ADMIN;
};

export const getAuthContextFromUserType = (userType) =>
  isClientUserType(userType) ? AUTH_CONTEXTS.CLIENT : AUTH_CONTEXTS.ADMIN;

export const getLoginPathForContext = (context) =>
  context === AUTH_CONTEXTS.CLIENT ? "/Client/login" : "/auth/sign-in";

export const getStoredAuth = (context) => {
  const keys = AUTH_STORAGE_KEYS[context];
  if (!keys) {
    return { token: null, user: null };
  }

  const token = localStorage.getItem(keys.token);
  const rawUser = localStorage.getItem(keys.user);
  if (!rawUser) {
    return { token: token || null, user: null };
  }

  try {
    return { token: token || null, user: JSON.parse(rawUser) };
  } catch (_) {
    return { token: token || null, user: null };
  }
};

export const setStoredAuth = (context, { token, user } = {}) => {
  const keys = AUTH_STORAGE_KEYS[context];
  if (!keys) return;

  if (token) {
    localStorage.setItem(keys.token, token);
  }
  if (user) {
    localStorage.setItem(keys.user, JSON.stringify(user));
  }
};

export const clearStoredAuth = (context) => {
  const keys = AUTH_STORAGE_KEYS[context];
  if (!keys) return;

  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.user);
};

export const getCurrentStoredAuth = (pathname) =>
  getStoredAuth(getAuthContextFromPath(pathname));

export const getCurrentStoredToken = (pathname) =>
  getCurrentStoredAuth(pathname).token;

export const getCurrentStoredUser = (pathname) =>
  getCurrentStoredAuth(pathname).user;

export const getCurrentStoredUserId = (pathname) =>
  getCurrentStoredUser(pathname)?.id ?? null;

const migrateLegacyAuthIfNeeded = () => {
  const hasScopedAuth =
    localStorage.getItem(AUTH_STORAGE_KEYS[AUTH_CONTEXTS.ADMIN].token) ||
    localStorage.getItem(AUTH_STORAGE_KEYS[AUTH_CONTEXTS.CLIENT].token);

  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  const legacyUserRaw = localStorage.getItem(LEGACY_USER_KEY);

  if (!hasScopedAuth && legacyToken && legacyUserRaw) {
    try {
      const user = JSON.parse(legacyUserRaw);
      setStoredAuth(getAuthContextFromUserType(user?.user_type), {
        token: legacyToken,
        user,
      });
    } catch (_) {
      // Ignore invalid legacy user JSON.
    }
  }

  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
};

export const persistScopedAuthOnBoot = () => {
  migrateLegacyAuthIfNeeded();

  const preserved = {};
  Object.values(AUTH_STORAGE_KEYS).forEach(({ token, user }) => {
    const tokenValue = localStorage.getItem(token);
    const userValue = localStorage.getItem(user);
    if (tokenValue) preserved[token] = tokenValue;
    if (userValue) preserved[user] = userValue;
  });

  localStorage.clear();

  Object.entries(preserved).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
};
