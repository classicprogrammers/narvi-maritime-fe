import { resolveDraftSource } from "./draftSource";

describe("resolveDraftSource", () => {
  it("returns nothing without a resumed draft", () => {
    expect(resolveDraftSource(null, "create")).toEqual({});
  });

  it("reuses key and id when modes match", () => {
    expect(resolveDraftSource({ id: "d_1", key: "customer:create:s1", mode: "create" }, "create")).toEqual({
      draftKey: "customer:create:s1",
      sourceDraftId: "d_1",
    });
  });

  it("returns nothing when modes differ", () => {
    expect(resolveDraftSource({ id: "d_1", key: "k", mode: "create" }, "update")).toEqual({});
  });
});
