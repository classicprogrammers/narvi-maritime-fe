import api from "./axios";
import { showApiModal } from "../components/ApiModal";
import {
  getCustomersApi,
  updateCustomerApi,
  updateCustomerFollowUpApi,
  updateCustomerTargetListApi,
} from "./customer";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../components/ApiModal", () => ({ showApiModal: jest.fn() }));

describe("customer api", () => {
  beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    jest.clearAllMocks();
    console.error.mockRestore();
  });

  test("getCustomersApi sends follow_up and date params", async () => {
    api.get.mockResolvedValue({ data: { rows: [] } });
    await getCustomersApi({
      follow_up: true,
      entry_date_from: "2026-01-01",
      entry_date_to: "2026-01-31",
      follow_up_date_from: "2026-02-01",
      follow_up_date_to: "2026-02-28",
    });
    const url = api.get.mock.calls[0][0];
    expect(url).toContain("follow_up=true");
    expect(url).toContain("entry_date_from=2026-01-01");
    expect(url).toContain("entry_date_to=2026-01-31");
    expect(url).toContain("follow_up_date_from=2026-02-01");
    expect(url).toContain("follow_up_date_to=2026-02-28");
  });

  test("getCustomersApi omits follow_up when false and empty dates", async () => {
    api.get.mockResolvedValue({ data: {} });
    await getCustomersApi({ follow_up: false, entry_date_from: "", follow_up_date_to: null });
    const url = api.get.mock.calls[0][0];
    expect(url).not.toContain("follow_up");
    expect(url).not.toContain("entry_date");
  });

  test("updateCustomerApi sends follow_up only when boolean", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "success" } } });
    await updateCustomerApi(5, { name: "A", follow_up: true });
    expect(api.post.mock.calls[0][1].follow_up).toBe(true);
    await updateCustomerApi(5, { name: "A", follow_up: false });
    expect(api.post.mock.calls[1][1].follow_up).toBe(false);
    await updateCustomerApi(5, { name: "A" });
    expect("follow_up" in api.post.mock.calls[2][1]).toBe(false);
  });

  test("updateCustomerFollowUpApi posts exactly customer_id and follow_up", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "success" } } });
    await updateCustomerFollowUpApi(7, true);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post.mock.calls[0][1]).toEqual({ customer_id: 7, follow_up: true });
  });

  test("updateCustomerTargetListApi posts exactly customer_id and target_list", async () => {
    api.post.mockClear();
    api.post.mockResolvedValue({ data: { result: { status: "success" } } });
    await updateCustomerTargetListApi(7, true);
    expect(api.post.mock.calls[0][1]).toEqual({ customer_id: 7, target_list: true });
  });

  test("getCustomersApi sends target_list=true only when on", async () => {
    api.get.mockClear();
    api.get.mockResolvedValue({ data: { result: { status: "success", data: [] } } });
    await getCustomersApi({ target_list: true });
    expect(api.get.mock.calls[0][0]).toContain("target_list=true");
    await getCustomersApi({ target_list: "" });
    expect(api.get.mock.calls[1][0]).not.toContain("target_list");
  });

  test("updateCustomerFollowUpApi throws on error body", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "error", message: "Nope" } } });
    await expect(updateCustomerFollowUpApi(7, false)).rejects.toThrow("Nope");
    expect(showApiModal).toHaveBeenCalled();
  });
});
