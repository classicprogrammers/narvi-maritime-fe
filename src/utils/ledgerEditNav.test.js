import {
  LEDGER_EDIT_MAX_ROWS,
  buildLedgerEditPath,
  parseEditIds,
  readLedgerEditView,
  validateEditSelection,
  writeLedgerEditView,
} from "./ledgerEditNav";
import { persistedFiltersKey } from "./persistedFilters";

describe("parseEditIds", () => {
  it("parses, dedupes and drops non-numeric ids", () => {
    expect(parseEditIds("?ids=3,1,3,abc,,2,-4,1.5")).toEqual({
      ids: [3, 1, 2],
      truncated: false,
    });
  });

  it("rejects id 0 (positive integers only)", () => {
    expect(parseEditIds("?ids=0,00,5")).toEqual({ ids: [5], truncated: false });
  });

  it("handles missing ids", () => {
    expect(parseEditIds("")).toEqual({ ids: [], truncated: false });
    expect(parseEditIds(undefined)).toEqual({ ids: [], truncated: false });
  });

  it("caps at the max and flags truncation", () => {
    const many = Array.from({ length: 60 }, (_, i) => i + 1).join(",");
    const res = parseEditIds(`?ids=${many}`);
    expect(res.ids).toHaveLength(LEDGER_EDIT_MAX_ROWS);
    expect(res.ids[0]).toBe(1);
    expect(res.truncated).toBe(true);
  });

  it("does not flag truncation at exactly the max", () => {
    const exact = Array.from({ length: 50 }, (_, i) => i + 1).join(",");
    expect(parseEditIds(`?ids=${exact}`).truncated).toBe(false);
  });
});

describe("buildLedgerEditPath", () => {
  const base = "/admin/ledger/cost";

  it("builds the table path", () => {
    expect(buildLedgerEditPath({ base, view: "table", ids: [1, 2] })).toBe(
      "/admin/ledger/cost/edit?ids=1,2"
    );
    expect(buildLedgerEditPath({ base, view: "table", id: 7 })).toBe(
      "/admin/ledger/cost/edit?ids=7"
    );
  });

  it("builds the form path with ids only for multi-selection", () => {
    expect(buildLedgerEditPath({ base, view: "form", ids: [4, 5, 6] })).toBe(
      "/admin/ledger/cost/form/4?ids=4,5,6"
    );
    expect(buildLedgerEditPath({ base, view: "form", ids: [5, 6], id: 6 })).toBe(
      "/admin/ledger/cost/form/6?ids=5,6"
    );
    expect(buildLedgerEditPath({ base, view: "form", ids: [4] })).toBe(
      "/admin/ledger/cost/form/4"
    );
    expect(buildLedgerEditPath({ base, view: "form", id: 9 })).toBe(
      "/admin/ledger/cost/form/9"
    );
  });
});

describe("ledger edit view preference", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to form", () => {
    expect(readLedgerEditView("cost")).toBe("form");
    expect(readLedgerEditView("invoice")).toBe("form");
  });

  it("round-trips per entity", () => {
    writeLedgerEditView("cost", "table");
    expect(readLedgerEditView("cost")).toBe("table");
    expect(readLedgerEditView("invoice")).toBe("form");
  });

  it("falls back to form for invalid stored values", () => {
    localStorage.setItem(
      persistedFiltersKey("ledgerInvoiceEditView"),
      JSON.stringify("grid")
    );
    expect(readLedgerEditView("invoice")).toBe("form");
    localStorage.setItem(persistedFiltersKey("ledgerInvoiceEditView"), "{bad");
    expect(readLedgerEditView("invoice")).toBe("form");
  });

  it("stores form for an invalid view", () => {
    writeLedgerEditView("cost", "nope");
    expect(readLedgerEditView("cost")).toBe("form");
  });
});

describe("validateEditSelection", () => {
  it("rejects empty", () => {
    expect(validateEditSelection([])).toMatch(/at least one/i);
    expect(validateEditSelection(undefined)).toMatch(/at least one/i);
  });

  it("rejects more than the max", () => {
    expect(validateEditSelection(Array.from({ length: 51 }, (_, i) => i))).toBe(
      "Edit supports up to 50 records. Clear some rows."
    );
  });

  it("accepts 1..50", () => {
    expect(validateEditSelection([1])).toBeNull();
    expect(validateEditSelection(Array.from({ length: 50 }, (_, i) => i))).toBeNull();
  });
});
