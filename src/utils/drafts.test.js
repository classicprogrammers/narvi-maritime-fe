import {
  buildDraft,
  canResumeDraft,
  canRetryDraft,
  describeDraftError,
  makeDraftId,
  makeDraftKey,
  removeDraftFromList,
  sortDraftsNewestFirst,
  upsertDraftInList,
} from "./drafts";

const T1 = new Date("2026-01-01T00:00:00.000Z");
const T2 = new Date("2026-01-02T00:00:00.000Z");

describe("drafts", () => {
  test("makeDraftId and makeDraftKey", () => {
    expect(makeDraftId(123, () => 0.5)).toMatch(/^d_123_[a-z0-9]+$/);
    expect(makeDraftKey("stock", "update", 5)).toBe("stock:update:5");
    expect(makeDraftKey("rate", "create", "sess1")).toBe("rate:create:sess1");
  });

  test("buildDraft sanitizes formState and requests and records stripped paths", () => {
    const draft = buildDraft({
      module: "user",
      mode: "create",
      recordId: null,
      label: "New user",
      formState: { name: "n", password: "p", attachments: [{ datas: "x" }] },
      requests: [{ api: "signupUserApi", args: [{ email: "e", password: "p" }] }],
      error: { message: "boom", status: 500 },
      now: T1,
    });
    expect(draft.formState).toEqual({ name: "n", attachments: [] });
    expect(draft.requests).toEqual([{ api: "signupUserApi", args: [{ email: "e" }] }]);
    expect(draft.stripped).toEqual([
      "formState.password",
      "formState.attachments[0]",
      "requests[0].args[0].password",
    ]);
    expect(draft.source).toBe("failure");
    expect(draft.createdAt).toBe(T1.toISOString());
    expect(draft.updatedAt).toBe(T1.toISOString());
    expect(draft.key).toBe("user:create:new");
    expect(JSON.stringify(draft)).not.toContain('"p"');
  });

  test("buildDraft defaults for a manual draft without requests", () => {
    const draft = buildDraft({ module: "stock", mode: "create", source: "manual", now: T1 });
    expect(draft.formState).toBeNull();
    expect(draft.requests).toEqual([]);
    expect(draft.error).toBeNull();
  });

  test("upsert adds a new draft and keeps id and createdAt on update", () => {
    const first = buildDraft({ module: "so", mode: "update", recordId: 1, label: "a", now: T1 });
    const second = buildDraft({ module: "so", mode: "update", recordId: 1, label: "b", now: T2 });
    const other = buildDraft({ module: "so", mode: "update", recordId: 2, now: T1 });

    let list = upsertDraftInList([], first);
    list = upsertDraftInList(list, other);
    list = upsertDraftInList(list, second);

    expect(list).toHaveLength(2);
    const merged = list.find((d) => d.key === first.key);
    expect(merged.id).toBe(first.id);
    expect(merged.createdAt).toBe(T1.toISOString());
    expect(merged.updatedAt).toBe(T2.toISOString());
    expect(merged.label).toBe("b");
  });

  test("removeDraftFromList removes by id without mutating", () => {
    const list = [{ id: "a" }, { id: "b" }];
    expect(removeDraftFromList(list, "a")).toEqual([{ id: "b" }]);
    expect(list).toHaveLength(2);
  });

  test("sortDraftsNewestFirst sorts by updatedAt desc without mutating", () => {
    const list = [
      { id: "old", updatedAt: "2026-01-01T00:00:00.000Z" },
      { id: "new", updatedAt: "2026-03-01T00:00:00.000Z" },
      { id: "mid", updatedAt: "2026-02-01T00:00:00.000Z" },
    ];
    expect(sortDraftsNewestFirst(list).map((d) => d.id)).toEqual(["new", "mid", "old"]);
    expect(list[0].id).toBe("old");
  });

  test("describeDraftError reads message and status", () => {
    expect(
      describeDraftError({ message: "Network Error", response: { status: 503 } }, "fb")
    ).toEqual({ message: "Network Error", status: 503 });
    expect(describeDraftError({ result: { status: "error", message: "bad" } }, "fb")).toEqual({
      message: "bad",
      status: null,
    });
    expect(describeDraftError({ status: "error" }, "fb")).toEqual({ message: "fb", status: null });
    expect(describeDraftError(null, "fb")).toBeNull();
  });

  test("canRetryDraft rules", () => {
    const moduleDef = { apis: { saveIt: () => {} } };
    const base = { requests: [{ api: "saveIt", args: [] }], stripped: [] };
    expect(canRetryDraft(base, moduleDef)).toBe(true);
    expect(canRetryDraft({ ...base, requests: [] }, moduleDef)).toBe(false);
    expect(canRetryDraft({ ...base, requests: [{ api: "gone", args: [] }] }, moduleDef)).toBe(false);
    expect(canRetryDraft(base, undefined)).toBe(false);
    const secretDraft = { ...base, stripped: ["requests[0].args[0].password"] };
    expect(canRetryDraft(secretDraft, moduleDef)).toBe(true);
    expect(canRetryDraft(secretDraft, { ...moduleDef, requiresSecrets: true })).toBe(false);
  });

  test("canResumeDraft rules", () => {
    const def = { category: "A", resumeTo: () => ({}) };
    expect(canResumeDraft({ formState: {} }, def)).toBe(true);
    expect(canResumeDraft({ formState: null }, def)).toBe(false);
    expect(canResumeDraft({ formState: {} }, { ...def, category: "D" })).toBe(false);
    expect(canResumeDraft({ formState: {} }, { category: "A" })).toBe(false);
  });
});
