import {
  DEFAULT_LEDGER_SORT,
  COST_DATE_FILTER_FIELDS,
  isSortableKey,
  nextSortState,
  buildDateRangeParams,
  validateDateRanges,
  countActiveDateRanges,
} from "./ledgerListQuery";

describe("ledgerListQuery", () => {
  test("default sort is so_number desc", () => {
    expect(DEFAULT_LEDGER_SORT).toEqual({ sortBy: "so_number", sortOrder: "desc" });
  });

  test("sort cycle: inactive -> asc -> desc -> asc", () => {
    const first = nextSortState({ sortBy: "so_number", sortOrder: "desc" }, "agent");
    expect(first).toEqual({ sortBy: "agent", sortOrder: "asc" });
    const second = nextSortState(first, "agent");
    expect(second).toEqual({ sortBy: "agent", sortOrder: "desc" });
    expect(nextSortState(second, "agent")).toEqual({ sortBy: "agent", sortOrder: "asc" });
  });

  test("whitelist per kind", () => {
    expect(isSortableKey("cost", "agent")).toBe(true);
    expect(isSortableKey("invoice", "agent")).toBe(false);
    expect(isSortableKey("invoice", "date_paid")).toBe(true);
    expect(isSortableKey("cost", "invoice_link")).toBe(false);
  });

  test("buildDateRangeParams drops empty and invalid values", () => {
    const params = buildDateRangeParams(
      {
        date_due_agent_from: "2026-10-01",
        date_due_agent_to: "",
        date_agent_paid_to: "2026-13-40",
        other_from: "2026-01-01",
      },
      COST_DATE_FILTER_FIELDS
    );
    expect(params).toEqual({ date_due_agent_from: "2026-10-01" });
  });

  test("validateDateRanges rejects from > to and bad format, allows single-sided", () => {
    const errors = validateDateRanges(
      {
        date_agent_invoice_from: "2026-10-05",
        date_agent_invoice_to: "2026-10-01",
        date_due_agent_from: "10/01/2026",
        date_agent_paid_to: "2026-10-31",
      },
      COST_DATE_FILTER_FIELDS
    );
    expect(errors.date_agent_invoice).toMatch(/on or before/);
    expect(errors.date_due_agent).toMatch(/not a valid/);
    expect(errors.date_agent_paid).toBeUndefined();
  });

  test("countActiveDateRanges counts fields with any side", () => {
    expect(
      countActiveDateRanges(
        { date_due_agent_from: "2026-10-01", date_agent_paid_to: "2026-10-31" },
        COST_DATE_FILTER_FIELDS
      )
    ).toBe(2);
    expect(countActiveDateRanges({}, COST_DATE_FILTER_FIELDS)).toBe(0);
  });
});
