import reducer, {
  hydrateDrafts,
  upsertDraft,
  removeDraft,
  removeDraftByKey,
  clearDraftsMemory,
  selectDrafts,
  selectDraftCount,
  selectDraftById,
  selectDraftByKey,
} from "./draftsSlice";

const draft = (id, key, extra = {}) => ({
  id,
  key,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  ...extra,
});

const root = (drafts) => ({ drafts });

describe("draftsSlice", () => {
  test("initial state", () => {
    expect(reducer(undefined, { type: "@@init" })).toEqual({
      userId: null,
      items: [],
      hydrated: false,
    });
  });

  test("hydrateDrafts sets user, items and hydrated", () => {
    const state = reducer(undefined, hydrateDrafts({ userId: 7, items: [draft("a", "k1")] }));
    expect(state).toEqual({ userId: 7, items: [draft("a", "k1")], hydrated: true });
  });

  test("hydrateDrafts tolerates non-array items", () => {
    const state = reducer(undefined, hydrateDrafts({ userId: 7, items: null }));
    expect(state.items).toEqual([]);
    expect(state.hydrated).toBe(true);
  });

  test("upsertDraft adds, then updates by key keeping id and createdAt", () => {
    let state = reducer(undefined, upsertDraft(draft("a", "k1")));
    state = reducer(
      state,
      upsertDraft(draft("b", "k1", { createdAt: "2025-01-01T00:00:00.000Z", label: "new" }))
    );
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe("a");
    expect(state.items[0].createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(state.items[0].label).toBe("new");
  });

  test("removeDraft and removeDraftByKey", () => {
    const start = reducer(
      undefined,
      hydrateDrafts({ userId: 1, items: [draft("a", "k1"), draft("b", "k2"), draft("c", "k3")] })
    );
    const afterId = reducer(start, removeDraft("a"));
    expect(afterId.items.map((d) => d.id)).toEqual(["b", "c"]);
    const afterKey = reducer(afterId, removeDraftByKey("k3"));
    expect(afterKey.items.map((d) => d.id)).toEqual(["b"]);
  });

  test("clearDraftsMemory resets to initial state", () => {
    const start = reducer(undefined, hydrateDrafts({ userId: 1, items: [draft("a", "k1")] }));
    expect(reducer(start, clearDraftsMemory())).toEqual({
      userId: null,
      items: [],
      hydrated: false,
    });
  });

  test("selectors", () => {
    const state = root(
      reducer(undefined, hydrateDrafts({ userId: 1, items: [draft("a", "k1"), draft("b", "k2")] }))
    );
    expect(selectDrafts(state)).toHaveLength(2);
    expect(selectDraftCount(state)).toBe(2);
    expect(selectDraftById("b")(state).key).toBe("k2");
    expect(selectDraftById("zzz")(state)).toBeNull();
    expect(selectDraftByKey("k1")(state).id).toBe("a");
    expect(selectDraftByKey("nope")(state)).toBeNull();
  });
});
