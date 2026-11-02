import { buildRateCreatePayload, buildRateUpdateLine, mapRateItemToFormRow } from "./rateListForm";

const apiRate = { id: 7, rate_type: "general", rate_name: "THC", currency_id: { id: 1 }, shipment_type: "export" };

describe("shipment type in rate payloads", () => {
  test("a copied rate keeps its shipment type", () => {
    const copy = { ...mapRateItemToFormRow(apiRate), id: undefined, rate_type: "client_specific", client_id: 3 };
    expect(buildRateCreatePayload(copy).shipment_type).toBe("export");
  });

  test("a rate without a type is sent as both", () => {
    const { shipment_type: _omit, ...legacy } = apiRate;
    expect(mapRateItemToFormRow(legacy).shipment_type).toBe("both");
    expect(buildRateCreatePayload(mapRateItemToFormRow(legacy)).shipment_type).toBe("both");
  });

  test("update line only carries the type when it changed", () => {
    const original = mapRateItemToFormRow(apiRate);
    expect(buildRateUpdateLine(original, original)).toBeNull();
    expect(buildRateUpdateLine({ ...original, shipment_type: "import_dob" }, original)).toEqual({
      id: 7,
      shipment_type: "import_dob",
    });
  });
});
