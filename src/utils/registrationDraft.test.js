import { applyRegistrationDraft } from "./registrationDraft";

describe("applyRegistrationDraft", () => {
  const prev = { name: "Old", street: "", existingAttachments: [{ id: 1 }], attachments: [] };

  it("returns null without form data", () => {
    expect(applyRegistrationDraft(prev, null)).toBeNull();
    expect(applyRegistrationDraft(prev, {})).toBeNull();
  });

  it("overlays draft values and keeps fresh existing attachments", () => {
    const out = applyRegistrationDraft(prev, {
      formData: { name: "New", street3: "x", vessel_type2: "Tanker", existingAttachments: [{ id: 9 }] },
      peopleRows: [{ first_name: "A", attachments: [{ filename: "f" }] }],
    });
    expect(out.formData.name).toBe("New");
    expect(out.formData.existingAttachments).toEqual([{ id: 1 }]);
    expect(out.formData.attachments).toEqual([]);
    expect(out.visibleAddressFields).toBe(3);
    expect(out.visibleVesselTypeFields).toBe(2);
    expect(out.peopleRows[0].attachments).toEqual([]);
    expect(out.peopleRows[0].first_name).toBe("A");
  });

  it("defaults visible counts", () => {
    const out = applyRegistrationDraft(prev, { formData: { name: "N" } });
    expect(out.visibleAddressFields).toBe(2);
    expect(out.visibleVesselTypeFields).toBe(1);
    expect(out.peopleRows).toEqual([]);
    expect(out.cneeRows).toBeNull();
  });

  it("passes CNEE rows through", () => {
    const out = applyRegistrationDraft(prev, { formData: { name: "N" }, cneeRows: [{ cnee_text: "x" }] });
    expect(out.cneeRows).toEqual([{ cnee_text: "x" }]);
  });
});
