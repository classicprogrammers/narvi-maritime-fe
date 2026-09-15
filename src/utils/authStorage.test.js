import {
  AUTH_CONTEXTS,
  clearStoredAuth,
  getAuthContextFromPath,
  getAuthContextFromUserType,
  getStoredAuth,
  persistScopedAuthOnBoot,
  setStoredAuth,
} from "./authStorage";

describe("authStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("stores admin and client sessions separately", () => {
    setStoredAuth(AUTH_CONTEXTS.ADMIN, {
      token: "admin-token",
      user: { id: 1, user_type: "admin" },
    });
    setStoredAuth(AUTH_CONTEXTS.CLIENT, {
      token: "client-token",
      user: { id: 2, user_type: "client" },
    });

    expect(getStoredAuth(AUTH_CONTEXTS.ADMIN).token).toBe("admin-token");
    expect(getStoredAuth(AUTH_CONTEXTS.CLIENT).token).toBe("client-token");

    clearStoredAuth(AUTH_CONTEXTS.ADMIN);

    expect(getStoredAuth(AUTH_CONTEXTS.ADMIN).token).toBeNull();
    expect(getStoredAuth(AUTH_CONTEXTS.CLIENT).token).toBe("client-token");
  });

  test("maps routes to the matching auth context", () => {
    expect(getAuthContextFromPath("/admin/default")).toBe(AUTH_CONTEXTS.ADMIN);
    expect(getAuthContextFromPath("/auth/sign-in")).toBe(AUTH_CONTEXTS.ADMIN);
    expect(getAuthContextFromPath("/Client/Vessels")).toBe(AUTH_CONTEXTS.CLIENT);
    expect(getAuthContextFromPath("/Client/login")).toBe(AUTH_CONTEXTS.CLIENT);
  });

  test("places users into the slot that matches user_type", () => {
    expect(getAuthContextFromUserType("admin")).toBe(AUTH_CONTEXTS.ADMIN);
    expect(getAuthContextFromUserType("user")).toBe(AUTH_CONTEXTS.ADMIN);
    expect(getAuthContextFromUserType("client")).toBe(AUTH_CONTEXTS.CLIENT);
    expect(getAuthContextFromUserType(false)).toBe(AUTH_CONTEXTS.CLIENT);
  });

  test("migrates a legacy shared session into the matching slot", () => {
    localStorage.setItem("token", "legacy-token");
    localStorage.setItem(
      "user",
      JSON.stringify({ id: 9, user_type: "client" })
    );
    localStorage.setItem("unrelated", "drop-me");

    persistScopedAuthOnBoot();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBeNull();
    expect(getStoredAuth(AUTH_CONTEXTS.CLIENT).token).toBe("legacy-token");
    expect(getStoredAuth(AUTH_CONTEXTS.ADMIN).token).toBeNull();
  });
});
