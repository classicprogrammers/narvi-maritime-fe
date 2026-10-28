import { buildClientStockStatusBreakdown } from "./clientStockStatusBreakdown";

describe("buildClientStockStatusBreakdown", () => {
  test("counts statuses in portal order, merging variants and skipping cancelled", () => {
    const list = [
      { stock_status: "in_transit" },
      { stock_status: "pending" },
      { stock_status: "Pending" },
      { stock_status: "arrived_dest" },
      { stock_status: "arrived" },
      { stock_status: "cancelled" },
      { stock_status: "stock" },
      { stock_status: "" },
    ];
    expect(buildClientStockStatusBreakdown(list)).toEqual([
      { key: "pending", label: "Pending", count: 2 },
      { key: "stock", label: "Stock", count: 1 },
      { key: "in_transit", label: "In Transit", count: 1 },
      { key: "arrived", label: "Arrived Dest", count: 2 },
    ]);
  });

  test("returns an empty list for missing data", () => {
    expect(buildClientStockStatusBreakdown(undefined)).toEqual([]);
  });
});
