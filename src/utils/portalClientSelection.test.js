import {
  attachPortalClientId,
  clearSelectedPortalClientId,
  getSelectedPortalClientId,
  isPortalClientContextRequest,
  isPortalClientRequest,
  setSelectedPortalClientId,
} from "./portalClientSelection";

describe("portalClientSelection", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test("stores an integer client id in session storage", () => {
    expect(setSelectedPortalClientId("310")).toBe(310);
    expect(getSelectedPortalClientId()).toBe(310);
    expect(setSelectedPortalClientId("nope")).toBeNull();
    expect(getSelectedPortalClientId()).toBe(310);
    clearSelectedPortalClientId();
    expect(getSelectedPortalClientId()).toBeNull();
  });

  test("recognizes portal urls and leaves other client routes alone", () => {
    expect(isPortalClientRequest("/api/client/stock")).toBe(true);
    expect(isPortalClientRequest("/api/client/stock/456/attachments")).toBe(true);
    expect(isPortalClientRequest("/api/client/shipping/order")).toBe(true);
    expect(isPortalClientRequest("/api/client/dashboard")).toBe(true);
    expect(isPortalClientRequest("/api/client/hub")).toBe(true);
    expect(isPortalClientRequest("/api/client/vessel")).toBe(true);
    expect(isPortalClientContextRequest("/api/client/context")).toBe(true);
    expect(isPortalClientRequest("/api/client/tariff")).toBe(false);
    expect(isPortalClientRequest("/api/client_login/list")).toBe(false);
  });

  test("adds client_id without replacing existing filters", () => {
    const config = attachPortalClientId(
      {
        url: "/api/client/stock",
        params: { page: 1, page_size: 50, search: "box" },
      },
      310
    );
    expect(config.params).toEqual({ page: 1, page_size: 50, search: "box", client_id: 310 });

    const detail = attachPortalClientId(
      { url: "/api/client/shipping/order", params: { id: 123 } },
      310
    );
    expect(detail.params).toEqual({ id: 123, client_id: 310 });

    const download = attachPortalClientId(
      { url: "/api/client/stock/456/attachment/9/download?download=true" },
      310
    );
    expect(download.params).toEqual({ client_id: 310 });

    const existing = attachPortalClientId(
      { url: "/api/client/vessel", params: { client_id: 262, search: "a" } },
      310
    );
    expect(existing.params).toEqual({ client_id: 262, search: "a" });

    const tariff = attachPortalClientId({ url: "/api/client/tariff", params: {} }, 310);
    expect(tariff.params).toEqual({});
  });
});
