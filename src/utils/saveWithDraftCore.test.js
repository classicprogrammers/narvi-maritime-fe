import { saveWithDraftCore, saveManualDraftCore, flushDraftsToStorage } from "./saveWithDraftCore";

const makeDeps = (over = {}) => ({
  hasUser: true,
  buildDraftFn: jest.fn((d) => ({ id: "d1", ...d })),
  upsert: jest.fn(),
  removeByKey: jest.fn(),
  removeById: jest.fn(),
  notify: jest.fn(),
  ...over,
});

const base = {
  module: "stock",
  mode: "update",
  recordId: 7,
  label: "Item",
  formState: { rows: [1, 2] },
  requests: [{ api: "updateStockItemApi", args: [1] }],
  isFailure: (r) => r?.status === "error",
};

describe("saveWithDraftCore", () => {
  it("throw path: upserts draft, notifies, re-throws the original error", async () => {
    const deps = makeDeps();
    const err = Object.assign(new Error("boom"), { response: { status: 500 } });
    await expect(
      saveWithDraftCore({ ...base, call: () => Promise.reject(err) }, deps)
    ).rejects.toBe(err);
    expect(deps.upsert).toHaveBeenCalledTimes(1);
    const draft = deps.buildDraftFn.mock.calls[0][0];
    expect(draft).toMatchObject({
      key: "stock:update:7",
      source: "failure",
      formState: base.formState,
      error: { message: "boom", status: 500 },
    });
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-saved-stock:update:7", title: "Your input was saved to Drafts" })
    );
    expect(deps.removeByKey).not.toHaveBeenCalled();
  });

  it("isFailure path: upserts draft and returns the original result", async () => {
    const deps = makeDeps();
    const result = { status: "error", message: "bad" };
    await expect(saveWithDraftCore({ ...base, call: async () => result }, deps)).resolves.toBe(result);
    expect(deps.upsert).toHaveBeenCalledTimes(1);
    expect(deps.notify).toHaveBeenCalledTimes(1);
    expect(deps.removeById).not.toHaveBeenCalled();
  });

  it("success removes sourceDraftId and the same key, returns result", async () => {
    const deps = makeDeps();
    const result = { status: "success" };
    await expect(
      saveWithDraftCore({ ...base, sourceDraftId: "d_src", call: async () => result }, deps)
    ).resolves.toBe(result);
    expect(deps.removeById).toHaveBeenCalledWith("d_src");
    expect(deps.removeByKey).toHaveBeenCalledWith("stock:update:7");
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("partial failure keeps failed rows only", async () => {
    const deps = makeDeps();
    const result = { status: "error", failed: [2] };
    await saveWithDraftCore(
      { ...base, call: async () => result, failedFormState: (r) => ({ rows: r.failed }) },
      deps
    );
    expect(deps.buildDraftFn.mock.calls[0][0].formState).toEqual({ rows: [2] });
  });

  it("validation that throws before call creates no draft", async () => {
    const deps = makeDeps();
    const run = async () => {
      const validate = () => {
        throw new Error("invalid");
      };
      validate();
      return saveWithDraftCore({ ...base, call: async () => ({}) }, deps);
    };
    await expect(run()).rejects.toThrow("invalid");
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("uses sessionKey for create flows and an explicit draftKey when given", async () => {
    const deps = makeDeps();
    await saveWithDraftCore(
      { ...base, mode: "create", recordId: null, sessionKey: "s1", call: async () => ({ status: "error" }) },
      deps
    );
    expect(deps.buildDraftFn.mock.calls[0][0].key).toBe("stock:create:s1");
    await saveWithDraftCore({ ...base, draftKey: "custom", call: async () => ({ status: "error" }) }, deps);
    expect(deps.buildDraftFn.mock.calls[1][0].key).toBe("custom");
  });

  it("no user: no write, warns, still re-throws", async () => {
    const deps = makeDeps({ hasUser: false });
    const err = new Error("x");
    await expect(saveWithDraftCore({ ...base, call: () => Promise.reject(err) }, deps)).rejects.toBe(err);
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Draft not saved: no user session" })
    );
  });
});

describe("saveManualDraftCore", () => {
  it("upserts a manual draft with no requests and a success toast", () => {
    const deps = makeDeps();
    expect(saveManualDraftCore({ ...base, mode: "create", recordId: null, sessionKey: "s1" }, deps)).toBe(true);
    expect(deps.buildDraftFn.mock.calls[0][0]).toMatchObject({
      key: "stock:create:s1",
      source: "manual",
      requests: [],
      error: null,
    });
    expect(deps.notify).toHaveBeenCalledWith(expect.objectContaining({ title: "Saved to Drafts" }));
  });

  it("no user: no write and warning toast", () => {
    const deps = makeDeps({ hasUser: false });
    expect(saveManualDraftCore(base, deps)).toBe(false);
    expect(deps.upsert).not.toHaveBeenCalled();
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Draft not saved: no user session" })
    );
  });
});

describe("flushDraftsToStorage", () => {
  const state = { userId: 7, hydrated: true, items: [{ id: "a", key: "k" }] };

  it("writes the latest items synchronously", () => {
    const write = jest.fn(() => ({ ok: true }));
    const notify = jest.fn();
    expect(flushDraftsToStorage({ userId: 7, draftsState: state, write, notify })).toBe(true);
    expect(write).toHaveBeenCalledWith(7, state.items);
    expect(notify).not.toHaveBeenCalled();
  });

  it("warns with the shared toast id when storage is full", () => {
    const write = jest.fn(() => ({ ok: false, reason: "quota" }));
    const notify = jest.fn();
    expect(flushDraftsToStorage({ userId: 7, draftsState: state, write, notify })).toBe(false);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ id: "draft-storage-full", status: "warning" }));
  });

  it("skips when no user, not hydrated, or hydrated for another user", () => {
    const write = jest.fn();
    const notify = jest.fn();
    flushDraftsToStorage({ userId: null, draftsState: state, write, notify });
    flushDraftsToStorage({ userId: 7, draftsState: { ...state, hydrated: false }, write, notify });
    flushDraftsToStorage({ userId: 8, draftsState: state, write, notify });
    expect(write).not.toHaveBeenCalled();
  });
});
