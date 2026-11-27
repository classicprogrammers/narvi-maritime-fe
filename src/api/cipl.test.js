import api from "./axios";
import {
  getCiplSimpleFormByIdApi,
  listCiplSimpleArchivedFormsApi,
  postCiplSimpleFormApi,
  postCiplSimpleFormCreateApi,
  postCiplSimpleFormUpdateApi,
} from "./cipl";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe("cipl api form_type", () => {
  beforeEach(() => {
    api.post.mockResolvedValue({ data: { form: { id: 1, state: "draft" } } });
  });
  afterEach(() => jest.clearAllMocks());

  test("latest without form_type omits the key", async () => {
    await postCiplSimpleFormApi({ latest_only: true });
    expect(api.post).toHaveBeenCalledWith("/api/cipl/form", { latest_only: true });
  });

  test("latest with form_type manual forwards it", async () => {
    await postCiplSimpleFormApi({ latest_only: true, form_type: "manual" });
    expect(api.post).toHaveBeenCalledWith("/api/cipl/form", { latest_only: true, form_type: "manual" });
  });

  test("list forwards form_type all and manual, omits it when absent", async () => {
    api.post.mockResolvedValue({ data: { forms: [{ id: 1 }] } });
    await listCiplSimpleArchivedFormsApi({ page: 1, form_type: "all" });
    expect(api.post.mock.calls[0][1]).toEqual({ archived_only: true, page: 1, form_type: "all" });
    await listCiplSimpleArchivedFormsApi({ form_type: "manual" });
    expect(api.post.mock.calls[1][1]).toEqual({ archived_only: true, form_type: "manual" });
    await listCiplSimpleArchivedFormsApi({});
    expect(api.post.mock.calls[2][1]).toEqual({ archived_only: true });
  });

  test("invalid or empty form_type is dropped", async () => {
    for (const bad of ["simple", "", null, undefined, 5]) {
      api.post.mockClear();
      await postCiplSimpleFormApi({ latest_only: true, form_type: bad });
      expect(api.post.mock.calls[0][1]).toEqual({ latest_only: true });
    }
  });

  test("form_type alone does not satisfy the required check", async () => {
    await expect(postCiplSimpleFormApi({ form_type: "manual" })).rejects.toThrow(/is required/);
  });

  test("load by id sends no form_type", async () => {
    await getCiplSimpleFormByIdApi(7);
    expect(api.post).toHaveBeenCalledWith("/api/cipl/form", { id: 7 });
  });

  test("create forwards form_type manual", async () => {
    await postCiplSimpleFormCreateApi({ form_type: "manual" });
    expect(api.post).toHaveBeenCalledWith("/api/cipl/form/create", { form_type: "manual" });
  });

  test("update forwards stock_list lines untouched", async () => {
    const stock_list = [{ stock_list_id: 5 }, { id: 9, quantity: 2 }, { id: 10, delete: true }];
    await postCiplSimpleFormUpdateApi({ id: "3", stock_list });
    expect(api.post).toHaveBeenCalledWith("/api/cipl/form/update", { id: 3, stock_list });
    expect(api.post.mock.calls[0][1].stock_list).toEqual(stock_list);
  });
});
