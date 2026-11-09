import { buildRateCreatePayload, buildRateUpdateLine, mapRateItemToFormRow } from "./rateListForm";

const apiRate = { id: 7, rate_type: "general", rate_name: "THC", currency_id: { id: 1 }, shipment_type: "export" };

describe("empty dates from the API", () => {
  test("a false date is an empty form value and is not sent on copy", () => {
    const rate = { ...apiRate, valid_until: false, last_update: false };
    const row = mapRateItemToFormRow(rate);
    expect(row.valid_until).toBe("");
    expect(row.last_update).toBe("");
    const payload = buildRateCreatePayload({ ...row, id: undefined });
    expect(payload).not.toHaveProperty("valid_until");
    expect(payload).not.toHaveProperty("last_update");
  });

  test("real dates are kept in YYYY-MM-DD", () => {
    expect(mapRateItemToFormRow({ ...apiRate, valid_until: "09-11-2026" }).valid_until).toBe("2026-11-09");
    expect(mapRateItemToFormRow({ ...apiRate, valid_until: "31/12/2026" }).valid_until).toBe("2026-12-31");
  });
});

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
