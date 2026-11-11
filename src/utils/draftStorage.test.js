import {
  draftStorageKey,
  isDraftStorageKey,
  parseDraftsEnvelope,
  readDrafts,
  writeDrafts,
} from "./draftStorage";

const draft = (id, key = `k${id}`) => ({ id, key, module: "stock" });

describe("draftStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("uses a per-user storage key", () => {
    expect(draftStorageKey(7)).toBe("drafts:7");
    expect(isDraftStorageKey("drafts:7")).toBe(true);
    expect(isDraftStorageKey("admin_user")).toBe(false);
    expect(isDraftStorageKey(null)).toBe(false);

    writeDrafts(1, [draft("a")]);
    writeDrafts(2, [draft("b")]);
    expect(readDrafts(1).map((d) => d.id)).toEqual(["a"]);
    expect(readDrafts(2).map((d) => d.id)).toEqual(["b"]);
    expect(readDrafts(3)).toEqual([]);
  });

  test("corrupt JSON loads as empty", () => {
    localStorage.setItem("drafts:1", "{not json");
    expect(readDrafts(1)).toEqual([]);
    expect(parseDraftsEnvelope("null")).toEqual([]);
    expect(parseDraftsEnvelope('{"version":1,"items":"x"}')).toEqual([]);
    expect(parseDraftsEnvelope(null)).toEqual([]);
  });

  test("unknown version is treated as empty and not overwritten by a read", () => {
    const raw = JSON.stringify({ version: 2, items: [draft("a")] });
    localStorage.setItem("drafts:1", raw);
    expect(readDrafts(1)).toEqual([]);
    expect(localStorage.getItem("drafts:1")).toBe(raw);
  });

  test("round trips items and skips malformed entries", () => {
    expect(writeDrafts(1, [draft("a")])).toEqual({ ok: true });
    localStorage.setItem(
      "drafts:1",
      JSON.stringify({ version: 1, items: [draft("a"), null, { foo: 1 }] })
    );
    expect(readDrafts(1)).toEqual([draft("a")]);
  });

  test("quota error returns ok:false", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("full");
      err.name = "QuotaExceededError";
      throw err;
    });
    expect(writeDrafts(1, [draft("a")])).toEqual({ ok: false, reason: "quota" });
  });

  test("other write errors and a missing user return ok:false", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("boom");
    });
    expect(writeDrafts(1, [])).toEqual({ ok: false, reason: "error" });
    expect(writeDrafts(null, [])).toEqual({ ok: false, reason: "no-user" });
    expect(readDrafts(undefined)).toEqual([]);
  });
});
