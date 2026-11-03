import { findSavedDimensions, mergeSavedDimensionVw } from "./stockDimensionVw";

describe("mergeSavedDimensionVw", () => {
  it("takes the backend-calculated VW when the form still has 0", () => {
    const form = [{ id: null, length_cm: 10, cw_air_freight: 0 }];
    const saved = [{ id: 5, cw_air_freight: 12.5 }];
    expect(mergeSavedDimensionVw(form, saved)[0].cw_air_freight).toBe(12.5);
  });

  it("matches by id before position", () => {
    const form = [{ id: 2, cw_air_freight: 0 }, { id: 1, cw_air_freight: 0 }];
    const saved = [{ id: 1, cw_air_freight: 3 }, { id: 2, cw_air_freight: 7 }];
    const merged = mergeSavedDimensionVw(form, saved);
    expect(merged.map((d) => d.cw_air_freight)).toEqual([7, 3]);
  });

  it("keeps the form value when the saved record has no VW", () => {
    const form = [{ id: 1, cw_air_freight: 4 }];
    expect(mergeSavedDimensionVw(form, [{ id: 1, cw_air_freight: 0 }])).toEqual(form);
    expect(mergeSavedDimensionVw(form, [])).toBe(form);
  });
});

describe("findSavedDimensions", () => {
  it("finds dimensions in common response shapes", () => {
    const dims = [{ id: 1 }];
    expect(findSavedDimensions({ result: { data: { dimensions: dims } } })).toBe(dims);
    expect(findSavedDimensions({ result: { dimensions: dims } })).toBe(dims);
    expect(findSavedDimensions({ foo: 1 })).toEqual([]);
  });

  it("picks the matching record from a stock list response", () => {
    const dims = [{ id: 9, cw_air_freight: 0.5 }];
    const response = { stock_list: [{ id: 1, dimensions: [] }, { id: 27471, dimensions: dims }] };
    expect(findSavedDimensions(response, 27471)).toBe(dims);
  });
});
