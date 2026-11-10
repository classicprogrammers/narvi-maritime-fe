import { mergeSelectedIntoOptions } from "./stockFormSelectUtils";

const master = [
  { id: 1, name: "ABIGAIL" },
  { id: 2, name: "OTHER" },
];

describe("mergeSelectedIntoOptions", () => {
  it("keeps an empty search result empty instead of returning the master list", () => {
    expect(mergeSelectedIntoOptions([], null, master)).toEqual([]);
    expect(mergeSelectedIntoOptions([], "", master)).toEqual([]);
  });

  it("returns the options unchanged when the selection is already in them", () => {
    const list = [{ id: 2, name: "OTHER" }];
    expect(mergeSelectedIntoOptions(list, 2, master)).toBe(list);
  });

  it("adds the selected option from the master list when the search does not return it", () => {
    expect(mergeSelectedIntoOptions([], 1, master)).toEqual([{ id: 1, name: "ABIGAIL" }]);
  });

  it("falls back to a placeholder when the selection is unknown", () => {
    expect(mergeSelectedIntoOptions([], 9, master)).toEqual([{ id: "9", name: "#9" }]);
  });
});
