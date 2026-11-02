import {
  SHIPMENT_TYPE_OPTIONS,
  normalizeShipmentTypeOptions,
  shipmentTypeLabel,
  shipmentTypeScope,
  shipmentTypeSheetLabel,
} from "./shipmentType";

describe("shipmentType", () => {
  test("normalizes backend options and falls back to the fixed list", () => {
    expect(normalizeShipmentTypeOptions([{ value: "export", label: "Export" }])).toEqual([
      { id: "export", name: "Export" },
    ]);
    expect(normalizeShipmentTypeOptions(undefined)).toBe(SHIPMENT_TYPE_OPTIONS);
    expect(normalizeShipmentTypeOptions([])).toBe(SHIPMENT_TYPE_OPTIONS);
  });

  test("label prefers the backend label", () => {
    expect(shipmentTypeLabel("both", "Both")).toBe("Both");
    expect(shipmentTypeLabel("import_dob")).toBe("Import / DOB");
    expect(shipmentTypeLabel("")).toBe("");
  });

  test("sheet label has no characters Excel rejects", () => {
    expect(shipmentTypeSheetLabel("import_dob")).toBe("Import-DOB");
    expect(shipmentTypeSheetLabel("export")).toBe("Export");
    expect(shipmentTypeSheetLabel("")).toBe("");
  });

  test("scope is empty unless export or import_dob is selected", () => {
    expect(shipmentTypeScope("export")).toBe("Export");
    expect(shipmentTypeScope("import_dob")).toBe("Import / DOB");
    expect(shipmentTypeScope("both")).toBe("");
    expect(shipmentTypeScope("")).toBe("");
  });
});
