export const PORTAL_SELECTED_CLIENT_KEY = "portal_selected_client_id";

export const PORTAL_CLIENT_ACCESS_DENIED_EVENT = "portal-client-access-denied";

export const PORTAL_CLIENT_ACCESS_DENIED_MESSAGE = "You do not have access to this client.";
export const PORTAL_CLIENT_BAD_ID_MESSAGE = "client_id must be an integer.";
export const PORTAL_CLIENT_MISSING_MESSAGE =
  "Client information was not found for logged in user.";

const PORTAL_API_PREFIXES = [
  "/api/client/stock",
  "/api/client/vessel",
  "/api/client/shipping",
  "/api/client/dashboard",
  "/api/client/hub",
  "/api/client/context",
];

const toIntegerId = (value) => {
  if (value == null || value === false || value === "") return null;
  if (typeof value === "boolean") return null;
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
};

export function getSelectedPortalClientId() {
  if (typeof sessionStorage === "undefined") return null;
  return toIntegerId(sessionStorage.getItem(PORTAL_SELECTED_CLIENT_KEY));
}

export function setSelectedPortalClientId(value) {
  const id = toIntegerId(value);
  if (id == null || typeof sessionStorage === "undefined") return null;
  sessionStorage.setItem(PORTAL_SELECTED_CLIENT_KEY, String(id));
  return id;
}

export function clearSelectedPortalClientId() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(PORTAL_SELECTED_CLIENT_KEY);
}

export function isPortalClientSelectionError(message) {
  const text = String(message || "").trim();
  return (
    text === PORTAL_CLIENT_ACCESS_DENIED_MESSAGE || text === PORTAL_CLIENT_BAD_ID_MESSAGE
  );
}

export function getPortalApiErrorMessage(error, fallback = "Request failed.") {
  const data = error?.response?.data;
  if (data && typeof data === "object" && !(typeof Blob !== "undefined" && data instanceof Blob)) {
    return data.message || data.result?.message || error?.message || fallback;
  }
  return error?.message || fallback;
}

export function getPortalRequestPath(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname || "";
    } catch {
      return raw.split("?")[0];
    }
  }
  return raw.split("?")[0];
}

export function isPortalClientRequest(url) {
  const path = getPortalRequestPath(url);
  return PORTAL_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)
  );
}

export function isPortalClientContextRequest(url) {
  const path = getPortalRequestPath(url);
  return path === "/api/client/context" || path.startsWith("/api/client/context/");
}

function paramsHaveClientId(params) {
  if (!params || typeof params !== "object") return false;
  if (typeof URLSearchParams !== "undefined" && params instanceof URLSearchParams) {
    return params.has("client_id") && String(params.get("client_id") || "").trim() !== "";
  }
  return params.client_id != null && params.client_id !== "";
}

export function requestAlreadyHasClientId(config) {
  const url = String(config?.url || "");
  if (/[?&]client_id=/.test(url)) return true;
  return paramsHaveClientId(config?.params);
}

export function attachPortalClientId(config, clientId = getSelectedPortalClientId()) {
  if (!config || config.skipPortalClientId) return config;
  if (!isPortalClientRequest(config.url)) return config;
  const id = toIntegerId(clientId);
  if (id == null || requestAlreadyHasClientId(config)) return config;

  if (typeof URLSearchParams !== "undefined" && config.params instanceof URLSearchParams) {
    config.params.set("client_id", String(id));
    return config;
  }

  config.params = {
    ...(config.params && typeof config.params === "object" ? config.params : {}),
    client_id: id,
  };
  return config;
}

export function notifyPortalClientAccessDenied() {
  const clientId = getSelectedPortalClientId();
  clearSelectedPortalClientId();
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PORTAL_CLIENT_ACCESS_DENIED_EVENT, {
      detail: { clientId },
    })
  );
}
