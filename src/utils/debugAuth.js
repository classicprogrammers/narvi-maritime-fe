import {
  AUTH_CONTEXTS,
  clearStoredAuth,
  getCurrentStoredAuth,
  getCurrentStoredToken,
  getStoredAuth,
} from "./authStorage";

export const debugAuth = {
  checkAuthState: () => {
    const current = getCurrentStoredAuth();
    const admin = getStoredAuth(AUTH_CONTEXTS.ADMIN);
    const client = getStoredAuth(AUTH_CONTEXTS.CLIENT);

    return { current, admin, client };
  },

  testApiCall: async (url, method = "GET") => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCurrentStoredToken() || ""}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API call failed:", {
          status: response.status,
          statusText: response.statusText,
          data,
        });
      }

      return { success: response.ok, status: response.status, data };
    } catch (error) {
      console.error("API call error:", error);
      return { success: false, error: error.message };
    }
  },

  clearAuth: () => {
    clearStoredAuth(AUTH_CONTEXTS.ADMIN);
    clearStoredAuth(AUTH_CONTEXTS.CLIENT);
    console.log("Auth state cleared");
  },
};

if (typeof window !== "undefined") {
  window.debugAuth = debugAuth;
}
