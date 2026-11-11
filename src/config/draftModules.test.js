import DRAFT_MODULES, { defaultIsFailure } from "./draftModules";

// api/stock pulls in a Chakra modal that jest cannot resolve; the registry only needs the API functions.
jest.mock("components/ApiModal", () => ({ __esModule: true, default: () => null }));

const EXCLUDED = [
  "quotation",
  "ledgerCost",
  "ledgerInvoice",
  "siForm",
  "saForm",
  "diForm",
  "dcForm",
  "ciplSimple",
  "ciplPerUnit",
  "invoiceManifest",
];

describe("draftModules registry", () => {
  const entries = Object.entries(DRAFT_MODULES);
  const sampleDraft = { id: "d1", mode: "create", recordId: null, formState: {} };

  it("has a function for every apis entry", () => {
    entries.forEach(([, def]) => {
      expect(Object.keys(def.apis).length).toBeGreaterThan(0);
      Object.values(def.apis).forEach((fn) => expect(typeof fn).toBe("function"));
    });
  });

  it("requires resumeTo for A/C and none for D", () => {
    entries.forEach(([, def]) => {
      expect(["A", "C", "D"]).toContain(def.category);
      expect(typeof def.label).toBe("string");
    });
    entries
      .filter(([, def]) => def.category === "D")
      .forEach(([, def]) => expect(def.resumeTo).toBeUndefined());
    entries
      .filter(([, def]) => def.category !== "D")
      .forEach(([, def]) => {
        const target = def.resumeTo(sampleDraft);
        expect(target.pathname.startsWith("/admin/")).toBe(true);
        expect(target.state.draftId).toBe("d1");
      });
  });

  it("flags secrets modules", () => {
    expect(DRAFT_MODULES.user.requiresSecrets).toBe(true);
    expect(DRAFT_MODULES.clientLogin.requiresSecrets).toBe(true);
  });

  it("omits excluded modules", () => {
    EXCLUDED.forEach((key) => expect(DRAFT_MODULES[key]).toBeUndefined());
  });

  it("builds record paths for update drafts", () => {
    const update = { id: "d2", mode: "update", recordId: 7, formState: {} };
    expect(DRAFT_MODULES.shippingOrder.resumeTo(update).pathname).toBe(
      "/admin/shipping-orders/edit/7"
    );
    expect(DRAFT_MODULES.shippingOrder.resumeTo(sampleDraft).pathname).toBe(
      "/admin/shipping-orders/create"
    );
    const mso = { id: "d3", mode: "create", formState: { isMso: true } };
    expect(DRAFT_MODULES.shippingOrder.resumeTo(mso).search).toBe("?is_mso=1");
    expect(DRAFT_MODULES.shippingOrder.resumeTo(sampleDraft).search).toBeUndefined();
  });
});

describe("registry isFailure (matches the screens)", () => {
  const ledgerOk = { updated_count: 2, ids: [1, 2], updated_fields: ["a"] };
  const rpcError = { jsonrpc: "2.0", id: 1, error: { message: "x" } };
  const check = (key, api, ok, bad) => {
    const fn = DRAFT_MODULES[key].isFailure;
    expect(typeof fn).toBe("function");
    ok.forEach((r) => expect([key, fn(api, r)]).toEqual([key, false]));
    bad.forEach((r) => expect([key, fn(api, r)]).toEqual([key, true]));
  };

  it("has an isFailure for every module", () => {
    Object.entries(DRAFT_MODULES).forEach(([, def]) => expect(typeof def.isFailure).toBe("function"));
  });

  it("ledger, quotation and charge category accept status-less successes", () => {
    check("ledgerCostBulk", "bulkUpdateLedgerCosts", [ledgerOk], [rpcError, { status: "error" }]);
    check("ledgerInvoiceBulk", "bulkUpdateLedgerInvoices", [ledgerOk], [rpcError, { result: { error: "x" } }]);
    ["quotationDetail", "quotationWizard", "chargeCategory"].forEach((key) =>
      check(key, "api", [{ id: 5 }, { result: { id: 5 } }], [rpcError, { result: false }, { status: "failed" }])
    );
  });

  it("rate modules use isRateSaveFailure", () => {
    ["rate", "rateCopy"].forEach((key) =>
      check(key, "createRateListApi", [{ id: 9 }, { result: { id: 9 } }], [{ status: "error" }, { errors: [{}] }])
    );
  });

  it("stock modules use isStockSaveFailure", () => {
    ["stock", "stockLegacyForm", "stockInline"].forEach((key) =>
      check(
        key,
        "updateStockItemApi",
        [{ result: { status: "success" } }],
        [{ result: { status: "error" } }, { result: { status: "success", errors: [{ index: 0 }] } }]
      )
    );
  });

  it("shipping order modules use getMsoApiError", () => {
    ["shippingOrder", "shippingOrderRemark"].forEach((key) =>
      check(key, "updateShippingOrder", [{ result: { id: 1 } }, { status: "success" }], [{ result: { status: "error", message: "x" } }])
    );
  });

  it("customer and vendor modules require a success status", () => {
    ["customer", "customerInline"].forEach((key) =>
      check(key, "registerCustomerApi", [{ result: { status: "success" } }], [{ result: { status: "error" } }, {}])
    );
    check("vendor", "registerVendorApi", [{ result: { status: "success" } }, { success: true }], [{ result: { status: "error" } }, {}]);
  });
});

describe("defaultIsFailure", () => {
  it("detects failures", () => {
    expect(defaultIsFailure({ status: "error" })).toBe(true);
    expect(defaultIsFailure({ result: { status: "error" } })).toBe(true);
    expect(defaultIsFailure({ status: "success", errors: [{}] })).toBe(true);
    expect(defaultIsFailure({ foo: 1 })).toBe(true);
  });

  it("accepts successes", () => {
    expect(defaultIsFailure({ status: "success" })).toBe(false);
    expect(defaultIsFailure({ result: { status: "success" } })).toBe(false);
    expect(defaultIsFailure({ status: "success", errors: [] })).toBe(false);
    expect(defaultIsFailure(null)).toBe(false);
  });
});

describe("ledger bulk isFailure with request args", () => {
  it("fails when res.ids is a strict subset of the payload ids", () => {
    ["ledgerCostBulk", "ledgerInvoiceBulk"].forEach((key) => {
      const fn = DRAFT_MODULES[key].isFailure;
      expect(fn("api", { ids: [1] }, [{ ids: [1, 2] }])).toBe(true);
      expect(fn("api", { ids: [1, 2] }, [{ ids: [1, 2] }])).toBe(false);
    });
  });
});
