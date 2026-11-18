import api from "./axios";
import {
  getClientSales,
  createClientSale,
  updateClientSale,
  deleteClientSale,
} from "./clientSales";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe("clientSales api", () => {
  afterEach(() => jest.clearAllMocks());

  test("list sends only non-empty whitelisted params", async () => {
    api.get.mockResolvedValue({ data: { status: "success", data: [] } });
    await getClientSales({
      search: " abc ",
      entry_date_from: "2026-10-01",
      entry_date_to: "",
      follow_up_date_from: null,
      sort_by: "entry_date",
      sort_order: "desc",
      bogus: "x",
    });
    expect(api.get).toHaveBeenCalledWith("/api/client/sales", {
      params: {
        page: 1,
        page_size: 50,
        search: "abc",
        entry_date_from: "2026-10-01",
        sort_by: "entry_date",
        sort_order: "desc",
      },
    });
  });

  test("list unwraps top-level data and pagination", async () => {
    api.get.mockResolvedValue({
      data: { status: "success", data: [{ id: 1 }], total_count: 7, total_pages: 2, has_next: true },
    });
    const res = await getClientSales({ page: 1 });
    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.total_count).toBe(7);
    expect(res.total_pages).toBe(2);
    expect(res.has_next).toBe(true);
    expect(res.has_previous).toBe(false);
  });

  test("list unwraps result.data and pagination", async () => {
    api.get.mockResolvedValue({
      data: { result: { status: "success", data: [{ id: 2 }], total_count: 3, total_pages: 4 } },
    });
    const res = await getClientSales({ page: 2, page_size: 10 });
    expect(res.data).toEqual([{ id: 2 }]);
    expect(res.total_count).toBe(3);
    expect(res.total_pages).toBe(4);
    expect(res.page).toBe(2);
  });

  test("create, update and delete post the right URL and body", async () => {
    api.post.mockResolvedValue({ data: { status: "success" } });
    const createBody = { client_id: 1, remarks: "r", entry_date: "2026-11-18" };
    await createClientSale(createBody);
    expect(api.post).toHaveBeenLastCalledWith("/api/client/sales/create", createBody);

    const updateBody = { id: 5, remarks: "r", entry_date: "2026-11-18", follow_up_date: null };
    await updateClientSale(updateBody);
    expect(api.post).toHaveBeenLastCalledWith("/api/client/sales/update", updateBody);

    await deleteClientSale(5);
    expect(api.post).toHaveBeenLastCalledWith("/api/client/sales/delete", { id: 5 });
  });

  test("top-level error throws the backend message", async () => {
    api.post.mockResolvedValue({ data: { status: "error", message: "Not allowed" } });
    await expect(createClientSale({})).rejects.toThrow("Not allowed");
    await expect(deleteClientSale(1)).rejects.toThrow("Not allowed");
  });

  test("result error throws the backend message", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "error", message: "Note not found" } } });
    await expect(updateClientSale({ id: 9 })).rejects.toThrow("Note not found");
    api.get.mockResolvedValue({ data: { result: { status: "error", message: "Bad filter" } } });
    await expect(getClientSales()).rejects.toThrow("Bad filter");
  });
});
