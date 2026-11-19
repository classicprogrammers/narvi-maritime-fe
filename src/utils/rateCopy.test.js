import { filterNewRates, sortRatesForCopy } from "./rateCopy";

describe("sortRatesForCopy", () => {
  test("orders by sort order, then id; unset last; ignores group sort order", () => {
    const rates = [
      { id: 5, group_sort_order: 1, sort_order: false },
      { id: 4, group_sort_order: 3, sort_order: 2 },
      { id: 3, group_sort_order: false, sort_order: 1 },
      { id: 2, group_sort_order: 2, sort_order: 2 },
      { id: 1, group_sort_order: 9, sort_order: 1 },
    ];
    expect(sortRatesForCopy(rates).map((rate) => rate.id)).toEqual([1, 3, 2, 4, 5]);
  });

  test("does not mutate the input", () => {
    const rates = [{ id: 2 }, { id: 1 }];
    sortRatesForCopy(rates);
    expect(rates[0].id).toBe(2);
  });
});

describe("filterNewRates", () => {
  const source = [
    { rate_name: "THC", location_text: "Dubai", charge_category_label: "Standard" },
    { rate_name: "Docs", location_text: "Dubai", charge_category_label: "If Apply" },
  ];

  test("keeps everything when the client has no rates", () => {
    expect(filterNewRates(source, [])).toEqual(source);
  });

  test("skips rates the client already has, ignoring case and spacing", () => {
    const existing = [{ rate_name: " thc ", location: "dubai", charge_category_label: "standard" }];
    expect(filterNewRates(source, existing)).toEqual([source[1]]);
  });

  test("same rate for another agent is still new", () => {
    const withAgent = [{ ...source[0], agent_id: { id: 1 } }];
    const existing = [{ ...source[0], agent_id: 2 }];
    expect(filterNewRates(withAgent, existing)).toEqual(withAgent);
    expect(filterNewRates(withAgent, [{ ...source[0], agent_id: 1 }])).toEqual([]);
  });

  test("same name in another location is still new", () => {
    const existing = [{ rate_name: "THC", location_text: "Fujairah", charge_category_label: "Standard" }];
    expect(filterNewRates(source, existing)).toHaveLength(2);
  });
});
