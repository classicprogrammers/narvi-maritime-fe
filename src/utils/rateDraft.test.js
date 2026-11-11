import {
  isRateSaveFailure,
  getFailedRateLineIds,
  getRemainingRateRowIndices,
  buildRateDraftFormState,
  buildRateRetryRequests,
  buildRateCopyRetryRequests,
} from "./rateDraft";

jest.mock("./rateListForm", () => ({
  buildRateCreatePayload: (row) => ({ created: row._key }),
}));

const rows = [
  { id: 1, _key: "a" },
  { id: 2, _key: "b" },
  { id: 3, _key: "c" },
  { _key: "n1" },
  { _key: "n2" },
];
const changedLines = [
  { id: 1, x: 1 },
  { id: 2, x: 2 },
];

describe("isRateSaveFailure", () => {
  it("detects errors[] and error status only", () => {
    expect(isRateSaveFailure({ errors: [{ id: 1 }] })).toBe(true);
    expect(isRateSaveFailure({ status: "error" })).toBe(true);
    expect(isRateSaveFailure({ result: { status: "error" } })).toBe(true);
    expect(isRateSaveFailure({ errors: [] })).toBe(false);
    expect(isRateSaveFailure({ updated_count: 2 })).toBe(false);
    expect(isRateSaveFailure(null)).toBe(false);
  });
});

describe("getFailedRateLineIds", () => {
  it("uses id, falling back to line index", () => {
    const ids = getFailedRateLineIds([{ id: 2 }, { index: 0 }], changedLines);
    expect([...ids].sort()).toEqual(["1", "2"]);
  });
});

describe("getRemainingRateRowIndices", () => {
  it("keeps only failed lines and uncreated new rows after partial update", () => {
    expect(
      getRemainingRateRowIndices({
        formRows: rows,
        changedLines,
        updateDone: true,
        updateErrors: [{ id: 2 }],
        createdKeys: ["n1"],
      })
    ).toEqual([1, 4]);
  });

  it("keeps all changed rows when the update itself threw", () => {
    expect(
      getRemainingRateRowIndices({
        formRows: rows,
        changedLines,
        updateDone: false,
        updateErrors: undefined,
        createdKeys: [],
      })
    ).toEqual([0, 1, 3, 4]);
  });

  it("keeps nothing when everything succeeded", () => {
    expect(
      getRemainingRateRowIndices({
        formRows: rows,
        changedLines,
        updateDone: true,
        updateErrors: [],
        createdKeys: ["n1", "n2"],
      })
    ).toEqual([]);
  });
});

describe("buildRateDraftFormState", () => {
  it("remaps pins and limits originalRows and selectedItems to kept rows", () => {
    const state = buildRateDraftFormState({
      formRows: rows,
      originalRows: [{ id: 1 }, { id: 2 }, { id: 3 }],
      pins: { agent: { 1: "A1", 4: "A4" }, client: {}, currency: { 0: "C0" } },
      indices: [1, 4],
      selectedItems: [{ id: 1 }, { id: 2 }, { id: 3 }],
      isBulkEdit: true,
    });
    expect(state.formRows).toEqual([rows[1], rows[4]]);
    expect(state.originalRows).toEqual([{ id: 2 }]);
    expect(state.agentOptionPins).toEqual({ 0: "A1", 1: "A4" });
    expect(state.currencyOptionPins).toEqual({});
    expect(state.routeState).toEqual({ selectedItems: [{ id: 2 }], isBulkEdit: true });
  });

  it("has empty routeState for create-only rows", () => {
    const state = buildRateDraftFormState({
      formRows: rows,
      originalRows: [],
      pins: {},
      indices: [3],
      selectedItems: [],
    });
    expect(state.routeState).toEqual({});
  });
});

describe("buildRateRetryRequests", () => {
  it("builds update lines then creates for the remaining rows", () => {
    expect(buildRateRetryRequests({ formRows: rows, changedLines, indices: [1, 4] })).toEqual([
      { api: "updateRateListApi", args: [{ lines: [{ id: 2, x: 2 }] }] },
      { api: "createRateListApi", args: [{ created: "n2" }] },
    ]);
  });
});

describe("buildRateCopyRetryRequests", () => {
  it("maps each failed payload to a create request", () => {
    expect(buildRateCopyRetryRequests([{ a: 1 }])).toEqual([{ api: "createRateListApi", args: [{ a: 1 }] }]);
    expect(buildRateCopyRetryRequests(undefined)).toEqual([]);
  });
});
