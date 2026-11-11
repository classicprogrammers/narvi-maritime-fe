import {
  applyVesselDraftRows,
  buildVesselDraftLabel,
  getVesselDraftRecordId,
  toCreateDraftRows,
} from "./vesselDraft";

describe("vesselDraft", () => {
  it("derives record id", () => {
    expect(getVesselDraftRecordId([{ vessel_id: null }])).toBeUndefined();
    expect(getVesselDraftRecordId([{ vessel_id: 4 }, { vessel_id: null }])).toBe(4);
    expect(getVesselDraftRecordId([{ vessel_id: 4 }, { vessel_id: 5 }])).toEqual([4, 5]);
  });

  it("builds labels", () => {
    expect(buildVesselDraftLabel([{ name: "ALPHA" }])).toBe("ALPHA");
    expect(buildVesselDraftLabel([{}, {}])).toBe("2 vessels");
  });

  it("overlays draft rows on loaded rows and appends new ones", () => {
    const loaded = [
      { key: "k1", vessel_id: 1, name: "A", attachments: [{ id: 9 }] },
      { key: "k2", vessel_id: 2, name: "B", attachments: [] },
    ];
    const draft = [
      { key: "old", vessel_id: 1, name: "A2", attachments: [{ id: 9 }, { filename: "x" }] },
      { key: "n1", vessel_id: null, name: "NEW", attachments: [{ filename: "u" }] },
      { key: "gone", vessel_id: 77, name: "GONE" },
    ];
    const out = applyVesselDraftRows(loaded, draft);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ key: "k1", name: "A2", attachments: [{ id: 9 }] });
    expect(out[1]).toEqual(loaded[1]);
    expect(out[2]).toMatchObject({ vessel_id: null, name: "NEW", attachments: [] });
  });

  it("returns loaded rows when the draft has none", () => {
    const loaded = [{ key: "k1", vessel_id: 1 }];
    expect(applyVesselDraftRows(loaded, [])).toBe(loaded);
  });

  it("strips uploads for create rows", () => {
    expect(toCreateDraftRows([{ name: "X", attachments: [{ filename: "f" }] }])[0].attachments).toEqual([]);
  });
});
