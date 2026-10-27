import {
  isMsoOrder,
  getMsoId,
  getMsoName,
  getShippingOrderNumber,
  buildMsoLinkPayload,
  getMsoApiError,
  filterLinkableOrders,
} from "./shippingOrderMso";

describe("isMsoOrder", () => {
  it("accepts truthy flag shapes", () => {
    expect(isMsoOrder({ is_mso: true })).toBe(true);
    expect(isMsoOrder({ is_mso: 1 })).toBe(true);
    expect(isMsoOrder({ is_mso: "true" })).toBe(true);
  });
  it("rejects missing or false flags", () => {
    expect(isMsoOrder({})).toBe(false);
    expect(isMsoOrder({ is_mso: false })).toBe(false);
    expect(isMsoOrder(null)).toBe(false);
  });
});

describe("getMsoId", () => {
  it("reads plain, pair and object shapes", () => {
    expect(getMsoId({ mso_id: 12 })).toBe(12);
    expect(getMsoId({ mso_id: "12" })).toBe(12);
    expect(getMsoId({ mso_id: [12, "MSO 1"] })).toBe(12);
    expect(getMsoId({ mso_id: { id: 12, name: "MSO 1" } })).toBe(12);
  });
  it("returns null for empty values", () => {
    expect(getMsoId({ mso_id: false })).toBeNull();
    expect(getMsoId({ mso_id: "" })).toBeNull();
    expect(getMsoId({ mso_id: [] })).toBeNull();
    expect(getMsoId({})).toBeNull();
  });
});

describe("getMsoName", () => {
  it("prefers names from the payload", () => {
    expect(getMsoName({ mso_id: [12, "SO 100"] })).toBe("SO 100");
    expect(getMsoName({ mso_id: { id: 12, name: "SO 100" } })).toBe("SO 100");
    expect(getMsoName({ mso_id: 12, mso_name: "SO 100" })).toBe("SO 100");
  });
  it("falls back to the id or empty", () => {
    expect(getMsoName({ mso_id: 12 })).toBe("MSO #12");
    expect(getMsoName({ mso_id: false })).toBe("");
  });
});

describe("getShippingOrderNumber", () => {
  it("uses so_number, then name, then id", () => {
    expect(getShippingOrderNumber({ so_number: "SO 1", id: 3 })).toBe("SO 1");
    expect(getShippingOrderNumber({ name: "SO 2", id: 3 })).toBe("SO 2");
    expect(getShippingOrderNumber({ id: 3 })).toBe("SO-3");
    expect(getShippingOrderNumber({})).toBe("-");
  });
});

describe("buildMsoLinkPayload", () => {
  it("links with a numeric id", () => {
    expect(buildMsoLinkPayload("45")).toEqual({ mso_id: 45 });
  });
  it("unlinks with null", () => {
    expect(buildMsoLinkPayload(null)).toEqual({ mso_id: null });
    expect(buildMsoLinkPayload("")).toEqual({ mso_id: null });
  });
});

describe("getMsoApiError", () => {
  it("reads top-level and result errors", () => {
    expect(getMsoApiError({ status: "error", message: "mso_id must be an MSO" })).toBe("mso_id must be an MSO");
    expect(getMsoApiError({ result: { status: "error", message: "Nope" } })).toBe("Nope");
  });
  it("returns empty for success", () => {
    expect(getMsoApiError({ status: "success" })).toBe("");
    expect(getMsoApiError(undefined)).toBe("");
  });
});

describe("filterLinkableOrders", () => {
  it("drops MSOs, the MSO itself and SOs already linked to it", () => {
    const orders = [
      { id: 1, is_mso: true },
      { id: 5 },
      { id: 6, mso_id: 5 },
      { id: 7, mso_id: 9 },
      { id: 8 },
    ];
    expect(filterLinkableOrders(orders, 5).map((o) => o.id)).toEqual([7, 8]);
  });
});
