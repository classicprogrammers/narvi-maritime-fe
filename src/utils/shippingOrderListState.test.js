import {
  buildShippingOrderListQueryParams,
  buildShippingOrderListSortParams,
} from "./shippingOrderListState";

describe("shippingOrderListState client updates", () => {
  test("the Client updates chip asks for orders with an unseen client change", () => {
    expect(buildShippingOrderListQueryParams({ activeFilters: { clientUpdates: true } })).toEqual({
      client_update_unseen: true,
    });
    expect(buildShippingOrderListQueryParams({ activeFilters: {} })).not.toHaveProperty(
      "client_update_unseen"
    );
  });

  test("the Edited by client chip returns every client-edited order, optionally since a date", () => {
    expect(buildShippingOrderListQueryParams({ activeFilters: { clientEdited: true } })).toEqual({
      client_updated: true,
    });
    expect(
      buildShippingOrderListQueryParams({
        activeFilters: { clientEdited: true },
        clientUpdatedSince: "2026-10-01",
      })
    ).toEqual({ client_updated: true, client_updated_since: "2026-10-01" });
    // ignored without the chip, and when the date is malformed
    expect(
      buildShippingOrderListQueryParams({ activeFilters: {}, clientUpdatedSince: "2026-10-01" })
    ).toEqual({});
    expect(
      buildShippingOrderListQueryParams({
        activeFilters: { clientEdited: true },
        clientUpdatedSince: "01/10/2026",
      })
    ).toEqual({ client_updated: true });
  });

  test("sorts by the client's last update, newest first", () => {
    expect(buildShippingOrderListSortParams("client_updated_at")).toEqual({
      sort_by: "client_updated_at",
      sort_order: "desc",
    });
    expect(buildShippingOrderListSortParams("so_number")).toEqual({
      sort_by: "so_number",
      sort_order: "desc",
    });
  });
});
