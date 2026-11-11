import { buildChargeCategorySave, chargeCategoryFormFromDraft } from "./chargeCategoryDraft";

const base = { id: null, name: " Port ", code: "", sequence: "", is_standard: false, active: true };

describe("buildChargeCategorySave", () => {
  it("builds a create payload with a trimmed name and no sequence when empty", () => {
    expect(buildChargeCategorySave(base)).toEqual({
      mode: "create",
      api: "createChargeCategoryApi",
      payload: { name: "Port", sequence: undefined, is_standard: false, active: true },
    });
  });

  it("builds an update payload with changed fields only", () => {
    const original = { name: "Port", sequence: 1, is_standard: false, active: true };
    const result = buildChargeCategorySave({ ...base, id: 7, sequence: "2", active: false }, original);
    expect(result).toEqual({
      mode: "update",
      api: "updateChargeCategoryApi",
      payload: { id: 7, sequence: 2, active: false },
    });
  });

  it("returns a null payload when nothing changed", () => {
    const original = { name: "Port", sequence: 1, is_standard: false, active: true };
    expect(buildChargeCategorySave({ ...base, id: 7, sequence: "1" }, original).payload).toBeNull();
  });
});

describe("chargeCategoryFormFromDraft", () => {
  it("restores the form with defaults", () => {
    expect(chargeCategoryFormFromDraft({ form: { id: 3, name: "A" } })).toEqual({
      id: 3,
      name: "A",
      code: "",
      sequence: "",
      is_standard: false,
      active: true,
    });
  });

  it("returns null without a form", () => {
    expect(chargeCategoryFormFromDraft(null)).toBeNull();
    expect(chargeCategoryFormFromDraft({})).toBeNull();
  });
});
