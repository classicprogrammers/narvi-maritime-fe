import { filterNewRates } from "./rateCopy";

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

  test("same name in another location is still new", () => {
    const existing = [{ rate_name: "THC", location_text: "Fujairah", charge_category_label: "Standard" }];
    expect(filterNewRates(source, existing)).toHaveLength(2);
  });
});
