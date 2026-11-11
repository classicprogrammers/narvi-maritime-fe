import { runDraftRequests, applyRetryFailure, formatDraftDate } from "./draftRetry";
import { isLedgerBulkPartialFailure } from "./ledgerBulkDraft";

const isFail = (r) => r?.status === "error";

describe("runDraftRequests", () => {
  it("runs requests in order and reports success", async () => {
    const calls = [];
    const moduleDef = {
      apis: {
        a: async (x) => { calls.push(["a", x]); return { status: "success" }; },
        b: async (x, y) => { calls.push(["b", x, y]); return { status: "success" }; },
      },
    };
    const draft = { requests: [{ api: "a", args: [1] }, { api: "b", args: [2, 3] }] };
    const out = await runDraftRequests(draft, moduleDef, isFail);
    expect(out).toEqual({ ok: true, succeeded: 2, error: null });
    expect(calls).toEqual([["a", 1], ["b", 2, 3]]);
  });

  it("stops at an isFailure result and counts earlier successes", async () => {
    const b = jest.fn();
    const moduleDef = {
      apis: {
        a: async () => ({ status: "success" }),
        bad: async () => ({ status: "error", message: "nope" }),
        b,
      },
    };
    const draft = { requests: [{ api: "a", args: [] }, { api: "bad", args: [] }, { api: "b", args: [] }] };
    const out = await runDraftRequests(draft, moduleDef, isFail);
    expect(out.ok).toBe(false);
    expect(out.succeeded).toBe(1);
    expect(out.error.message).toBe("nope");
    expect(b).not.toHaveBeenCalled();
  });

  it("catches thrown errors and uses the module isFailure override", async () => {
    const thrower = {
      apis: { a: async () => { throw Object.assign(new Error("boom"), { response: { status: 500 } }); } },
    };
    const out = await runDraftRequests({ requests: [{ api: "a", args: [] }] }, thrower, isFail);
    expect(out).toMatchObject({ ok: false, succeeded: 0, error: { message: "boom", status: 500 } });

    const custom = { apis: { a: async () => ({ ok: 1 }) }, isFailure: () => false };
    const ok = await runDraftRequests({ requests: [{ api: "a", args: [] }] }, custom, () => true);
    expect(ok.ok).toBe(true);
  });
});

describe("applyRetryFailure", () => {
  it("drops succeeded requests and updates error and updatedAt", () => {
    const draft = { requests: [{ api: "a" }, { api: "b" }], error: null, createdAt: "c" };
    const now = new Date("2026-01-02T03:04:05.000Z");
    const next = applyRetryFailure(draft, { succeeded: 1, error: { message: "x", status: 400 } }, now);
    expect(next.requests).toEqual([{ api: "b" }]);
    expect(next.error).toEqual({ message: "x", status: 400 });
    expect(next.updatedAt).toBe(now.toISOString());
    expect(next.createdAt).toBe("c");
  });
});

describe("formatDraftDate", () => {
  it("returns a dash for invalid input", () => {
    expect(formatDraftDate("nope")).toBe("-");
    expect(formatDraftDate("2026-01-02T03:04:05.000Z")).not.toBe("-");
  });
});

describe("runDraftRequests passes request args to isFailure", () => {
  it("treats a ledger bulk result with only some ids as a failure", async () => {
    const run = (ids) =>
      runDraftRequests(
        { requests: [{ api: "bulkUpdateLedgerCosts", args: [{ ids: [1, 2, 3] }] }] },
        {
          apis: { bulkUpdateLedgerCosts: async () => ({ ids }) },
          isFailure: (api, r, args) => isLedgerBulkPartialFailure(args?.[0], r),
        },
        () => false
      );
    expect((await run([1, 2])).ok).toBe(false);
    expect((await run([1, 2, 3])).ok).toBe(true);
  });
});
