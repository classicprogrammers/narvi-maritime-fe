import { buildModalFormState, resolveModalDraft } from "./modalDraft";

describe("modalDraft", () => {
  const items = [{ id: 1, name: "A" }, { id: 2, name: "B" }];

  it("builds form state with the editing id", () => {
    expect(buildModalFormState({ name: "x" }, { id: 7 })).toEqual({ formData: { name: "x" }, editingId: 7 });
    expect(buildModalFormState({ name: "x" }, null)).toEqual({ formData: { name: "x" }, editingId: null });
  });

  it("ignores drafts without form data", () => {
    expect(resolveModalDraft(null, items).status).toBe("none");
    expect(resolveModalDraft({ formState: {} }, items).status).toBe("none");
  });

  it("applies create drafts", () => {
    expect(resolveModalDraft({ formState: { formData: { name: "n" }, editingId: null } }, items)).toEqual({
      status: "apply",
      formData: { name: "n" },
      item: null,
    });
  });

  it("finds the edited item (string or number ids)", () => {
    const out = resolveModalDraft({ formState: { formData: { name: "n" }, editingId: "2" } }, items);
    expect(out.status).toBe("apply");
    expect(out.item).toBe(items[1]);
  });

  it("reports a missing record", () => {
    expect(resolveModalDraft({ formState: { formData: {}, editingId: 99 } }, items).status).toBe("missing");
  });
});
