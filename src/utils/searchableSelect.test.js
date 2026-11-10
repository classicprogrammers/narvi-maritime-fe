import {
  clampIndex,
  computeAutoSize,
  createLatestGuard,
  filterOptionsByQuery,
  findSelectedIndex,
  getListState,
  stepIndex,
} from "./searchableSelect";

const label = (o) => o.name;
const options = [{ id: 1, name: "Alpha" }, { id: 2, name: "Beta" }, { id: 3, name: "Alphabet" }];

describe("filterOptionsByQuery", () => {
  it("returns everything for an empty query", () => {
    expect(filterOptionsByQuery(options, "  ", label)).toHaveLength(3);
  });
  it("returns an empty array (not the full list) when nothing matches", () => {
    expect(filterOptionsByQuery(options, "zzz", label)).toEqual([]);
  });
  it("matches case-insensitively", () => {
    expect(filterOptionsByQuery(options, "ALPHA", label).map((o) => o.id)).toEqual([1, 3]);
  });
});

describe("index helpers", () => {
  it("clamps into range and returns -1 for an empty list", () => {
    expect(clampIndex(9, 3)).toBe(2);
    expect(clampIndex(-1, 3)).toBe(0);
    expect(clampIndex(0, 0)).toBe(-1);
  });
  it("wraps arrow navigation", () => {
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });
  it("finds the selected option by string compare", () => {
    expect(findSelectedIndex(options, "2", "id")).toBe(1);
    expect(findSelectedIndex(options, "", "id")).toBe(0);
    expect(findSelectedIndex(options, 99, "id")).toBe(0);
  });
});

describe("getListState", () => {
  it("prefers loading, then options, then empty", () => {
    expect(getListState({ isLoading: true, count: 0 })).toBe("loading");
    expect(getListState({ isLoading: false, count: 2 })).toBe("options");
    expect(getListState({ isLoading: false, count: 0 })).toBe("empty");
  });
});

describe("computeAutoSize", () => {
  it("stays within min and max", () => {
    expect(computeAutoSize({ text: "a", placeholder: "", min: 12, max: 60 })).toBe(12);
    expect(computeAutoSize({ text: "x".repeat(100), placeholder: "", min: 12, max: 60 })).toBe(60);
  });
});

describe("createLatestGuard", () => {
  it("only accepts the latest token", () => {
    const guard = createLatestGuard();
    const first = guard.next();
    const second = guard.next();
    expect(guard.isLatest(first)).toBe(false);
    expect(guard.isLatest(second)).toBe(true);
    guard.invalidate();
    expect(guard.isLatest(second)).toBe(false);
  });
});

describe("unmatched search registry", () => {
  it("tracks fields that show text without a selection", () => {
    const { setUnmatchedSearchField, hasUnmatchedSearchText } = require("./searchableSelect");
    expect(hasUnmatchedSearchText()).toBe(false);
    setUnmatchedSearchField("a", true);
    expect(hasUnmatchedSearchText()).toBe(true);
    setUnmatchedSearchField("a", false);
    expect(hasUnmatchedSearchText()).toBe(false);
  });
});
