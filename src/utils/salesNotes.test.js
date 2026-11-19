import {
  DEFAULT_SALES_SORT,
  buildSalesListParams,
  applyNumberedListEnter,
  buildSalesNoteCreatePayload,
  buildSalesNoteUpdatePayload,
  formatIsoToDdMmYy,
  sanitizeSalesListState,
  validateSalesNoteForm,
} from "./salesNotes";

describe("formatIsoToDdMmYy", () => {
  it("formats ISO dates and datetimes", () => {
    expect(formatIsoToDdMmYy("2026-11-18")).toBe("18/11/26");
    expect(formatIsoToDdMmYy("2026-11-18T10:30:00Z")).toBe("18/11/26");
  });
  it("returns empty string for empty or invalid values", () => {
    [null, undefined, false, "", "abc", "2026-02-31"].forEach((v) =>
      expect(formatIsoToDdMmYy(v)).toBe("")
    );
  });
});

describe("buildSalesListParams", () => {
  it("sends only paging and default sort for default state", () => {
    expect(
      buildSalesListParams({ page: 1, pageSize: 50, search: "", dateRanges: {}, sort: DEFAULT_SALES_SORT })
    ).toEqual({ page: 1, page_size: 50, sort_by: "entry_date", sort_order: "desc" });
  });
  it("trims search and includes valid date params only", () => {
    expect(
      buildSalesListParams({
        page: 2,
        pageSize: 50,
        search: "  acme ",
        dateRanges: {
          entry_date_from: "2026-01-01",
          entry_date_to: "bad",
          follow_up_date_to: "2026-02-01",
        },
        sort: { sortBy: "client", sortOrder: "asc" },
      })
    ).toEqual({
      page: 2,
      page_size: 50,
      sort_by: "client",
      sort_order: "asc",
      search: "acme",
      entry_date_from: "2026-01-01",
      follow_up_date_to: "2026-02-01",
    });
  });
  it("falls back to defaults for unknown sort or missing state", () => {
    expect(buildSalesListParams({ sort: { sortBy: "remarks", sortOrder: "x" } })).toEqual({
      page: 1,
      page_size: 50,
      sort_by: "entry_date",
      sort_order: "desc",
    });
    expect(buildSalesListParams()).toMatchObject({ page: 1, page_size: 50 });
  });
});

describe("validateSalesNoteForm", () => {
  const valid = { client_id: 3, remarks: "Call", entry_date: "2026-11-18", follow_up_date: "" };
  it("accepts a valid create form", () => {
    expect(validateSalesNoteForm(valid, "create")).toEqual({});
  });
  it("requires client on create but not on edit", () => {
    expect(validateSalesNoteForm({ ...valid, client_id: "" }, "create").client_id).toBeTruthy();
    expect(validateSalesNoteForm({ ...valid, client_id: "" }, "edit")).toEqual({});
  });
  it("accepts blank remarks (optional)", () => {
    expect(validateSalesNoteForm({ ...valid, remarks: "   " }, "create")).toEqual({});
  });
  it("allows empty entry date on create but not on edit", () => {
    expect(validateSalesNoteForm({ ...valid, entry_date: "" }, "create")).toEqual({});
    expect(validateSalesNoteForm({ ...valid, entry_date: "" }, "edit").entry_date).toBe(
      "Entry date is required"
    );
  });
  it("flags invalid dates, accepting dd/mm/yyyy", () => {
    expect(validateSalesNoteForm({ ...valid, entry_date: "31/02/2026" }, "create").entry_date).toBeTruthy();
    expect(validateSalesNoteForm({ ...valid, entry_date: "12/5/26" }, "create").entry_date).toBeTruthy();
    expect(validateSalesNoteForm({ ...valid, follow_up_date: "xx" }, "create").follow_up_date).toBeTruthy();
    expect(validateSalesNoteForm({ ...valid, entry_date: "18/11/2026" }, "create")).toEqual({});
  });
});

describe("payload builders", () => {
  it("create: trims, defaults entry date to today, omits empty follow-up", () => {
    expect(buildSalesNoteCreatePayload({ client_id: "7", remarks: " hi ", entry_date: "" })).toEqual({
      client_id: 7,
      remarks: "hi",
      entry_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });
  it("create: includes follow-up when set and converts dd/mm/yyyy", () => {
    expect(
      buildSalesNoteCreatePayload({
        client_id: 7,
        remarks: "hi",
        entry_date: "01/02/2026",
        follow_up_date: "2026-03-04",
      })
    ).toEqual({ client_id: 7, remarks: "hi", entry_date: "2026-02-01", follow_up_date: "2026-03-04" });
  });
  it("update: sends null for a cleared follow-up date", () => {
    expect(
      buildSalesNoteUpdatePayload({ id: 9, remarks: " x ", entry_date: "2026-01-02", follow_up_date: "" })
    ).toEqual({ id: 9, remarks: "x", entry_date: "2026-01-02", follow_up_date: null, todo_remarks: null });
    expect(
      buildSalesNoteUpdatePayload({ id: 9, remarks: "x", entry_date: "2026-01-02", todo_remarks: " call " })
    ).toMatchObject({ todo_remarks: "call" });
    expect(
      buildSalesNoteCreatePayload({ client_id: 1, remarks: "x", entry_date: "2026-01-02", todo_remarks: " t " })
    ).toMatchObject({ todo_remarks: "t" });
    expect(
      buildSalesNoteUpdatePayload({ id: 9, remarks: "x", entry_date: "2026-01-02", follow_up_date: "2026-01-05" })
    ).toEqual({
      id: 9,
      remarks: "x",
      entry_date: "2026-01-02",
      follow_up_date: "2026-01-05",
      todo_remarks: null,
    });
  });
});

describe("sanitizeSalesListState", () => {
  it("returns defaults for garbage input", () => {
    const defaults = {
      page: 1,
      pageSize: 50,
      search: "",
      dateRanges: {},
      sort: DEFAULT_SALES_SORT,
    };
    expect(sanitizeSalesListState(null)).toEqual(defaults);
    expect(sanitizeSalesListState("x")).toEqual(defaults);
    expect(sanitizeSalesListState({ page: -1, sort: { sortBy: "remarks", sortOrder: "up" } })).toEqual(defaults);
  });
  it("keeps valid values and drops invalid dates", () => {
    expect(
      sanitizeSalesListState({
        page: 3,
        pageSize: 25,
        search: "abc",
        dateRanges: { entry_date_from: "2026-01-01", entry_date_to: "2026-13-01", other: "x" },
        sort: { sortBy: "client", sortOrder: "asc" },
      })
    ).toEqual({
      page: 3,
      pageSize: 25,
      search: "abc",
      dateRanges: { entry_date_from: "2026-01-01" },
      sort: { sortBy: "client", sortOrder: "asc" },
    });
  });
});

describe("applyNumberedListEnter", () => {
  it("numbers the first line and moves to a new line", () => {
    expect(applyNumberedListEnter("call", 4)).toEqual({ value: "1. call\n", cursor: 8 });
  });
  it("continues numbering from the highest number", () => {
    expect(applyNumberedListEnter("1. a\nb", 6).value).toBe("1. a\n2. b\n");
  });
  it("keeps an already numbered line and just adds a newline", () => {
    expect(applyNumberedListEnter("1. a", 4).value).toBe("1. a\n");
  });
  it("adds a plain newline on a blank line", () => {
    expect(applyNumberedListEnter("1. a\n", 5)).toEqual({ value: "1. a\n\n", cursor: 6 });
  });
});
