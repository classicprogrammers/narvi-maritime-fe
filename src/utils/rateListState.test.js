import { buildRateListFilterSnapshot, buildRateListSortParams } from "./rateListState";

test("a saved sort by import_group becomes group_name", () => {
  const { sort } = buildRateListFilterSnapshot({ sort: { sort_by: "import_group", sort_order: "asc" } });
  expect(sort).toEqual({ sort_by: "group_name", sort_order: "asc" });
});

describe("buildRateListSortParams", () => {
  test("no sort sends nothing", () => {
    expect(buildRateListSortParams({ sort_by: "", sort_order: "asc" })).toEqual({
      sort_by: undefined,
      sort_order: undefined,
    });
  });

  test("Group Name ascending never sends sort_order", () => {
    expect(buildRateListSortParams({ sort_by: "group_name", sort_order: "asc" })).toEqual({
      sort_by: "group_name",
      sort_order: undefined,
    });
  });

  test("Group Name descending still reverses the groups", () => {
    expect(buildRateListSortParams({ sort_by: "group_name", sort_order: "desc" })).toEqual({
      sort_by: "group_name",
      sort_order: "desc",
    });
  });

  test("other columns send their order", () => {
    expect(buildRateListSortParams({ sort_by: "rate_name", sort_order: "asc" })).toEqual({
      sort_by: "rate_name",
      sort_order: "asc",
    });
  });
});
