import {
  buildStockListOptionsFilterParams,
  normalizeIdNameFilterOptions,
  normalizeOriginFilterOptions,
  normalizeSoFilterOptions,
  normalizeValueFilterOptions,
  normalizeWarehouseFilterOptions,
  stockListOptionsFilterKey,
} from "./stockListOptionFilters";

describe("buildStockListOptionsFilterParams", () => {
  it("keeps selected filters and drops empty or unknown ones", () => {
    expect(
      buildStockListOptionsFilterParams({
        client_id: 12,
        vessel_id: null,
        so_id: " 4563 ",
        active: "true",
        stock_status: ["pending", "stock", ""],
        origin_text: "",
        si_number: "SI-1",
        unknown_key: "x",
      })
    ).toEqual({
      client_id: 12,
      so_id: "4563",
      active: "true",
      stock_status: ["pending", "stock"],
      si_number: "SI-1",
    });
  });

  it("returns an empty object for no filters", () => {
    expect(buildStockListOptionsFilterParams()).toEqual({});
    expect(buildStockListOptionsFilterParams(null)).toEqual({});
  });

  it("drops an empty stock_status array", () => {
    expect(buildStockListOptionsFilterParams({ stock_status: [] })).toEqual({});
  });
});

describe("stockListOptionsFilterKey", () => {
  it("is stable regardless of key order and ignores empty values", () => {
    const a = stockListOptionsFilterKey({ client_id: 1, so_id: "2", vessel_id: "" });
    const b = stockListOptionsFilterKey({ so_id: "2", client_id: 1 });
    expect(a).toBe(b);
  });

  it("changes when a filter changes", () => {
    expect(stockListOptionsFilterKey({ client_id: 1 })).not.toBe(stockListOptionsFilterKey({ client_id: 2 }));
  });
});

describe("option normalizers", () => {
  it("normalizes client/vessel {id, name} and dedupes", () => {
    expect(
      normalizeIdNameFilterOptions([
        { id: 1, name: "A" },
        { id: 1, name: "A again" },
        { id: 2, name: "" },
        null,
      ])
    ).toEqual([{ id: "1", name: "A", key: "id-1" }]);
    expect(normalizeIdNameFilterOptions(undefined)).toEqual([]);
  });

  it("normalizes origin {name, value} options using the name as id", () => {
    expect(
      normalizeOriginFilterOptions([{ name: "ATH", value: "ATH" }, { id: 5, name: "BKK" }, { name: "ATH", value: "ATH" }, {}])
    ).toEqual([
      { id: "ATH", name: "ATH", key: "origin-ATH" },
      { id: 5, name: "BKK", key: "origin-5" },
    ]);
  });

  it("normalizes SO options to the so_id value", () => {
    expect(normalizeSoFilterOptions([{ id: 9, name: "SO 4563", so_id: "4563" }, { id: 3, name: "x" }])).toEqual([
      { id: 9, name: "SO 4563", value: "4563", key: "so-4563" },
    ]);
  });

  it("normalizes {name, value} and plain string options", () => {
    expect(normalizeValueFilterOptions([{ name: "SI-1", value: "SI-1" }, "DI-2", { name: "SI-1", value: "SI-1" }, ""])).toEqual([
      { name: "SI-1", value: "SI-1", key: "val-SI-1" },
      { name: "DI-2", value: "DI-2", key: "val-DI-2" },
    ]);
  });

  it("normalizes warehouse options using the name as the value", () => {
    expect(normalizeWarehouseFilterOptions([{ name: "WH-1", warehouse_new: "WH-1" }, { name: "" }])).toEqual([
      { name: "WH-1", value: "WH-1", key: "wh-WH-1" },
    ]);
  });
});
