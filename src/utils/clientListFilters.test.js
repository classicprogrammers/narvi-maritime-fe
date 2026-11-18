import {
  DEFAULT_CLIENT_FILTERS,
  hasActiveClientAdvanceFilters,
  buildClientFilterParams,
  buildClientDateParams,
  sanitizeClientFilters,
} from "./clientListFilters";

describe("DEFAULT_CLIENT_FILTERS", () => {
  it("has all keys empty", () => {
    expect(DEFAULT_CLIENT_FILTERS).toEqual({
      client_code: "",
      email: "",
      follow_up: "",
      entry_date_from: "",
      entry_date_to: "",
      follow_up_date_from: "",
      follow_up_date_to: "",
    });
  });
});

describe("hasActiveClientAdvanceFilters", () => {
  it("is false for defaults", () => {
    expect(hasActiveClientAdvanceFilters(DEFAULT_CLIENT_FILTERS, "")).toBe(false);
  });

  it.each([
    ["client_code", "C1"],
    ["email", "a@b.c"],
    ["follow_up", "true"],
    ["entry_date_from", "2026-01-01"],
    ["entry_date_to", "2026-01-02"],
    ["follow_up_date_from", "2026-01-01"],
    ["follow_up_date_to", "2026-01-02"],
  ])("is true when %s is set", (key, value) => {
    expect(
      hasActiveClientAdvanceFilters({ ...DEFAULT_CLIENT_FILTERS, [key]: value }, "")
    ).toBe(true);
  });

  it("is true with overall search", () => {
    expect(hasActiveClientAdvanceFilters(DEFAULT_CLIENT_FILTERS, "abc")).toBe(true);
  });

  it("treats follow_up false/empty as inactive", () => {
    expect(hasActiveClientAdvanceFilters({ follow_up: false }, "")).toBe(false);
    expect(hasActiveClientAdvanceFilters({ follow_up: "false" }, "")).toBe(false);
  });
});

describe("buildClientFilterParams", () => {
  it("returns empty object for defaults", () => {
    expect(buildClientFilterParams(DEFAULT_CLIENT_FILTERS)).toEqual({});
  });

  it("adds follow_up true for 'true' and true only", () => {
    expect(buildClientFilterParams({ follow_up: "true" })).toEqual({ follow_up: true });
    expect(buildClientFilterParams({ follow_up: true })).toEqual({ follow_up: true });
    expect(buildClientFilterParams({ follow_up: "false" })).toEqual({});
    expect(buildClientFilterParams({ follow_up: "" })).toEqual({});
  });

  it("trims text and keeps valid dates, dropping invalid ones", () => {
    expect(
      buildClientFilterParams({
        client_code: " C1 ",
        email: " ",
        entry_date_from: "2026-01-01",
        entry_date_to: "31/02/2026",
        follow_up_date_to: "2026-02-30",
        follow_up_date_from: "2026-03-01",
      })
    ).toEqual({
      client_code: "C1",
      entry_date_from: "2026-01-01",
      follow_up_date_from: "2026-03-01",
    });
  });
});

describe("reversed date ranges", () => {
  const reversed = {
    entry_date_from: "2026-02-01",
    entry_date_to: "2026-01-01",
    follow_up_date_from: "2026-03-01",
  };

  it("buildClientFilterParams drops a reversed pair but keeps other fields", () => {
    expect(buildClientFilterParams(reversed)).toEqual({
      follow_up_date_from: "2026-03-01",
    });
  });

  it("keeps equal dates and a single side", () => {
    expect(
      buildClientDateParams({
        entry_date_from: "2026-01-01",
        entry_date_to: "2026-01-01",
        follow_up_date_to: "2026-01-09",
      })
    ).toEqual({
      entry_date_from: "2026-01-01",
      entry_date_to: "2026-01-01",
      follow_up_date_to: "2026-01-09",
    });
  });

  it("sanitizeClientFilters drops a reversed pair", () => {
    expect(sanitizeClientFilters(reversed)).toEqual({
      ...DEFAULT_CLIENT_FILTERS,
      follow_up_date_from: "2026-03-01",
    });
  });
});

describe("sanitizeClientFilters", () => {
  it("fills defaults for the old persisted shape", () => {
    expect(sanitizeClientFilters({ client_code: "X", email: "e" })).toEqual({
      ...DEFAULT_CLIENT_FILTERS,
      client_code: "X",
      email: "e",
    });
  });

  it("handles null/undefined", () => {
    expect(sanitizeClientFilters(undefined)).toEqual(DEFAULT_CLIENT_FILTERS);
    expect(sanitizeClientFilters(null)).toEqual(DEFAULT_CLIENT_FILTERS);
  });

  it("normalizes follow_up and drops invalid dates", () => {
    expect(
      sanitizeClientFilters({
        follow_up: true,
        entry_date_from: "2026-01-05",
        entry_date_to: "bad",
      })
    ).toEqual({
      ...DEFAULT_CLIENT_FILTERS,
      follow_up: "true",
      entry_date_from: "2026-01-05",
    });
    expect(sanitizeClientFilters({ follow_up: "false" }).follow_up).toBe("");
  });
});
