import api from "./axios";
import {
  getClientShippingOrders,
  markClientShippingOrderSeenApi,
  updateClientShippingOrderApi,
} from "./clientShippingOrders";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe("clientShippingOrders two-way updates", () => {
  afterEach(() => jest.clearAllMocks());

  test("update posts the payload and returns the updated order (JSON-RPC result)", async () => {
    const order = { id: 12, remark_to_nm: { id: 9, text: "Please confirm the berth.", author: "Classic test" } };
    api.post.mockResolvedValue({ data: { jsonrpc: "2.0", result: { status: "success", order } } });

    const res = await updateClientShippingOrderApi({ id: 12, remark_to_nm: "Please confirm the berth." });

    expect(api.post).toHaveBeenCalledWith("/api/client/shipping/order/update", {
      id: 12,
      remark_to_nm: "Please confirm the berth.",
    });
    expect(res).toEqual({ status: "success", order });
  });

  test("update shows the backend error message as is", async () => {
    api.post.mockResolvedValue({
      data: { result: { status: "error", message: "Closed orders cannot be edited." } },
    });
    await expect(updateClientShippingOrderApi({ id: 12, remark_to_nm: "x" })).rejects.toThrow(
      "Closed orders cannot be edited."
    );

    api.post.mockResolvedValue({ data: { status: "error", message: "Unknown field: remark_to_client" } });
    await expect(updateClientShippingOrderApi({ id: 12, remark_to_client: "x" })).rejects.toThrow(
      "Unknown field: remark_to_client"
    );
  });

  test("update uses the message from a non-2xx response", async () => {
    api.post.mockRejectedValue({ response: { data: { message: "ETA must be before ETB." } } });
    await expect(updateClientShippingOrderApi({ id: 12, eta_date: "2026-12-01" })).rejects.toThrow(
      "ETA must be before ETB."
    );
  });

  test("update requires an id and does not call the backend without one", async () => {
    await expect(updateClientShippingOrderApi({ remark_to_nm: "x" })).rejects.toThrow("Order id is required.");
    expect(api.post).not.toHaveBeenCalled();
  });

  test("seen posts only the order id", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "success" } } });
    await markClientShippingOrderSeenApi(12);
    expect(api.post).toHaveBeenCalledWith("/api/client/shipping/order/seen", { id: 12 });
  });

  test("list passes the remark-related filters and sort, and never calls seen", async () => {
    api.get.mockResolvedValue({ data: { status: "success", orders: [] } });
    await getClientShippingOrders({
      search: "berth",
      new_from_narvi: true,
      sort_by: "staff_updated_at",
      sort_order: "desc",
    });
    expect(api.get).toHaveBeenCalledWith("/api/client/shipping/order", {
      params: expect.objectContaining({
        search: "berth",
        new_from_narvi: true,
        sort_by: "staff_updated_at",
        sort_order: "desc",
      }),
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});
