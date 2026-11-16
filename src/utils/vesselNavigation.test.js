import { getAdjacentVesselIds } from "./vesselNavigation";

describe("getAdjacentVesselIds", () => {
  const ids = [10, 20, 30];

  it("returns both neighbours for a middle item", () => {
    expect(getAdjacentVesselIds(ids, 20)).toEqual({ index: 1, total: 3, prevId: 10, nextId: 30 });
  });

  it("has no prev at the start and no next at the end", () => {
    expect(getAdjacentVesselIds(ids, 10).prevId).toBeNull();
    expect(getAdjacentVesselIds(ids, 30).nextId).toBeNull();
  });

  it("matches string route ids against numeric list ids", () => {
    expect(getAdjacentVesselIds(ids, "20").nextId).toBe(30);
  });

  it("returns no neighbours when the id is missing or the list is invalid", () => {
    expect(getAdjacentVesselIds(ids, 99)).toEqual({ index: -1, total: 3, prevId: null, nextId: null });
    expect(getAdjacentVesselIds(undefined, 1).total).toBe(0);
  });
});
