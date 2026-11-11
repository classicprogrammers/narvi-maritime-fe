import {
  isStockSaveFailure,
  isStockActionFailure,
  getStockDraftMode,
  buildStockDraftLabel,
  buildStockFormState,
  buildFailedStockFormState,
  resolveStockDraftSource,
  resolveStockRowDraftSource,
  withActionErrorMessage,
  narrowRequestsToFailedLines,
  narrowCreateRequestsToFailedLines,
} from "./stockDraft";

describe("isStockSaveFailure", () => {
  it("is false on clean success", () => {
    expect(isStockSaveFailure({ result: { status: "success" } })).toBe(false);
  });
  it("is true on non-success, missing result or line errors", () => {
    expect(isStockSaveFailure({ result: { status: "error" } })).toBe(true);
    expect(isStockSaveFailure(undefined)).toBe(true);
    expect(isStockSaveFailure({ result: { status: "success", errors: [{ stock_id: 1 }] } })).toBe(true);
    expect(isStockSaveFailure({ result: { status: "success", error_count: 2 } })).toBe(true);
  });
});

describe("isStockActionFailure", () => {
  it("checks the success flag", () => {
    expect(isStockActionFailure({ success: true })).toBe(false);
    expect(isStockActionFailure({ success: false, error: "x" })).toBe(true);
  });
  it("flags per-line errors inside a successful action", () => {
    expect(isStockActionFailure({ success: true, data: { result: { status: "success", errors: [{}] } } })).toBe(true);
    expect(isStockActionFailure({ success: true, data: { result: { status: "success" } } })).toBe(false);
  });
  it("copies the action error into message", () => {
    expect(withActionErrorMessage({ success: false, error: "boom" }).message).toBe("boom");
    const ok = { success: true };
    expect(withActionErrorMessage(ok)).toBe(ok);
  });
});

describe("mode and label", () => {
  it("uses update when any row has a stockId", () => {
    expect(getStockDraftMode([{ stockId: null }, { stockId: 5 }])).toBe("update");
    expect(getStockDraftMode([{ stockId: "" }])).toBe("create");
  });
  it("labels one or many rows", () => {
    expect(buildStockDraftLabel([{ stockItemId: "STK-1" }])).toBe("STK-1");
    expect(buildStockDraftLabel([{ stockItemId: "" }])).toBe("1 stock item");
    expect(buildStockDraftLabel([{}, {}, {}])).toBe("3 stock items");
  });
});

describe("buildStockFormState", () => {
  it("keeps route state items that match row stock ids", () => {
    const state = buildStockFormState({
      rows: [{ stockId: 2 }, { stockId: null, stockItemId: "S-9" }],
      selectedItems: [{ id: 1 }, { id: 2 }],
      isBulkEdit: true,
      sourcePage: "stocks",
    });
    expect(state.formRows).toHaveLength(2);
    expect(state.routeState).toEqual({ selectedItems: [{ id: 2 }], isBulkEdit: true, sourcePage: "stocks" });
  });
});

describe("buildFailedStockFormState", () => {
  const rows = [{ stockId: 1 }, { stockId: 2 }];
  const ctx = { rows, selectedItems: [{ id: 1 }, { id: 2 }], isBulkEdit: true, sourcePage: null };
  it("keeps only failed rows on partial success", () => {
    const state = buildFailedStockFormState(ctx)({
      result: { status: "success", errors: [{ stock_id: 2, message: "bad" }] },
    });
    expect(state.formRows).toEqual([{ stockId: 2 }]);
    expect(state.routeState.selectedItems).toEqual([{ id: 2 }]);
  });
  it("keeps every row when the whole call failed", () => {
    const state = buildFailedStockFormState(ctx)({ result: { status: "error" } });
    expect(state.formRows).toHaveLength(2);
  });
  it("supports a custom getRowId for create rows", () => {
    const state = buildFailedStockFormState({ ...ctx, rows: [{}, {}], getRowId: () => null })({
      result: { status: "success", errors: [{ index: 1, message: "bad" }] },
    });
    expect(state.formRows).toHaveLength(1);
  });
});

describe("resolveStockDraftSource", () => {
  it("returns nothing without a resumed draft", () => {
    expect(resolveStockDraftSource(null, "update")).toEqual({});
  });
  it("manual drafts are removed on any success", () => {
    expect(resolveStockDraftSource({ id: "d1", source: "manual", key: "k", mode: "create" }, "update")).toEqual({
      sourceDraftId: "d1",
    });
  });
  it("failure drafts only link to the call with the same mode", () => {
    const draft = { id: "d1", source: "failure", key: "stock:update:1", mode: "update" };
    expect(resolveStockDraftSource(draft, "update")).toEqual({ draftKey: "stock:update:1", sourceDraftId: "d1" });
    expect(resolveStockDraftSource(draft, "create")).toEqual({});
  });
});

describe("resolveStockRowDraftSource", () => {
  const draft = (mode, row) => ({ id: "d1", source: "failure", key: "k", mode, formState: { formRows: [row] } });
  it("matches update rows by stockId", () => {
    expect(resolveStockRowDraftSource(draft("update", { stockId: 4 }), "update", { stockId: "4" })).toEqual({
      draftKey: "k",
      sourceDraftId: "d1",
    });
    expect(resolveStockRowDraftSource(draft("update", { stockId: 4 }), "update", { stockId: 5 })).toEqual({});
  });
  it("matches create rows by row id", () => {
    expect(resolveStockRowDraftSource(draft("create", { id: 9 }), "create", { id: 9 })).toEqual({
      draftKey: "k",
      sourceDraftId: "d1",
    });
    expect(resolveStockRowDraftSource(draft("create", { id: 9 }), "update", { stockId: 1 })).toEqual({});
  });
});

describe("narrowRequestsToFailedLines", () => {
  const make = () => [{ api: "updateStockItemApi", args: [1, { lines: [{ stock_id: 1 }, { stock_id: 2 }] }] }];
  it("keeps only failed lines after partial success", () => {
    const requests = make();
    narrowRequestsToFailedLines(requests, { result: { status: "success", errors: [{ stock_id: 2 }] } });
    expect(requests[0].args[1].lines).toEqual([{ stock_id: 2 }]);
  });
  it("leaves requests alone on clean or total failure", () => {
    const requests = make();
    narrowRequestsToFailedLines(requests, { result: { status: "success" } });
    narrowRequestsToFailedLines(requests, undefined);
    expect(requests[0].args[1].lines).toHaveLength(2);
  });
});

describe("narrowCreateRequestsToFailedLines", () => {
  const make = () => [{ api: "createStockItemApi", args: [{ lines: [{ a: 1 }, { a: 2 }, { a: 3 }] }] }];
  it("keeps only the lines at the failed indices", () => {
    const requests = make();
    narrowCreateRequestsToFailedLines(requests, { result: { status: "success", errors: [{ index: 1 }] } });
    expect(requests[0].args[0].lines).toEqual([{ a: 2 }]);
  });
  it("empties requests when failures cannot be matched to lines", () => {
    const requests = make();
    narrowCreateRequestsToFailedLines(requests, { result: { status: "success", error_count: 2 } });
    expect(requests).toEqual([]);
    const byId = make();
    narrowCreateRequestsToFailedLines(byId, { result: { status: "success", errors: [{ stock_id: 5 }] } });
    expect(byId).toEqual([]);
  });
  it("leaves requests alone on clean success or total failure", () => {
    const requests = make();
    narrowCreateRequestsToFailedLines(requests, { result: { status: "success" } });
    narrowCreateRequestsToFailedLines(requests, { result: { status: "error", errors: [{ index: 0 }] } });
    narrowCreateRequestsToFailedLines(requests, undefined);
    expect(requests).toEqual(make());
  });
});

describe("buildFailedStockFormState unsentRows", () => {
  const rows = [{ stockId: 1 }, { stockId: 2 }];
  const unsent = [{ id: "n1" }];
  it("appends unsent rows on a non-partial failure", () => {
    const state = buildFailedStockFormState({ rows, unsentRows: unsent })({ result: { status: "error" } });
    expect(state.formRows).toEqual([...rows, ...unsent]);
  });
  it("omits unsent rows on partial success (they are still sent)", () => {
    const state = buildFailedStockFormState({ rows, unsentRows: unsent })({
      result: { status: "success", errors: [{ stock_id: 2 }] },
    });
    expect(state.formRows).toEqual([{ stockId: 2 }]);
  });
});
