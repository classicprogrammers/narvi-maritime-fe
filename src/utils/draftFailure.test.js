import { isExplicitFailure } from "./draftFailure";

describe("isExplicitFailure", () => {
  it("detects explicit errors", () => {
    expect(isExplicitFailure({ status: "error" })).toBe(true);
    expect(isExplicitFailure({ result: { status: "error" } })).toBe(true);
    expect(isExplicitFailure({ success: false })).toBe(true);
    expect(isExplicitFailure({ result: { errors: [{}] } })).toBe(true);
  });

  it("detects JSON-RPC errors, false results and failed statuses", () => {
    expect(isExplicitFailure({ jsonrpc: "2.0", id: 1, error: { code: 200, message: "x" } })).toBe(true);
    expect(isExplicitFailure({ result: { error: "boom" } })).toBe(true);
    expect(isExplicitFailure({ error: "boom" })).toBe(true);
    expect(isExplicitFailure({ result: false })).toBe(true);
    expect(isExplicitFailure(false)).toBe(true);
    expect(isExplicitFailure({ status: "failed" })).toBe(true);
    expect(isExplicitFailure({ result: { status: "fail" } })).toBe(true);
    expect(isExplicitFailure({ result: { success: false } })).toBe(true);
  });

  it("does not flag results without a status", () => {
    expect(isExplicitFailure({ id: 1 })).toBe(false);
    expect(isExplicitFailure({ result: { status: "success" } })).toBe(false);
    expect(isExplicitFailure(null)).toBe(false);
    expect(isExplicitFailure(undefined)).toBe(false);
    expect(isExplicitFailure("ok")).toBe(false);
  });
});
