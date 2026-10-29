import api from "./axios";
import { previewLedgerRoe, previewLedgerDueDate, getLedgerAgentOptions } from "./ledgerShared";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe("ledgerShared", () => {
  afterEach(() => jest.clearAllMocks());

  test("previewLedgerRoe posts payload and returns roe", async () => {
    api.post.mockResolvedValue({ data: { status: "success", data: { roe: 1.1, roe_date: "2026-10-28" } } });
    const res = await previewLedgerRoe({ kind: "cost", currency_id: 3, date: "2026-10-28" });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/roe/preview", {
      kind: "cost",
      currency_id: 3,
      date: "2026-10-28",
    });
    expect(res).toEqual({ roe: 1.1, roe_date: "2026-10-28" });
  });

  test("previewLedgerRoe maps no rate to null", async () => {
    api.post.mockResolvedValue({ data: { roe: null, roe_date: null } });
    expect((await previewLedgerRoe({ kind: "invoice", currency_id: 3 })).roe).toBeNull();
  });

  test("previewLedgerDueDate returns null due_date when unreadable", async () => {
    api.post.mockResolvedValue({ data: { result: { payment_term: "Odd", rule: null, due_date: null } } });
    const res = await previewLedgerDueDate({ partner_id: 5, date: "2026-08-14" });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/due-date/preview", { partner_id: 5, date: "2026-08-14" });
    expect(res).toEqual({ payment_term: "Odd", rule: null, due_date: null });
  });

  test("getLedgerAgentOptions posts q and limit and returns the list", async () => {
    api.post.mockResolvedValue({ data: { status: "success", data: [{ id: 1, name: "Jady PVG" }] } });
    const res = await getLedgerAgentOptions({ q: "jady" });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/agent/options", { q: "jady", limit: 30 });
    expect(res).toEqual([{ id: 1, name: "Jady PVG" }]);
  });

  test("getLedgerAgentOptions reads the list from result.agents", async () => {
    api.post.mockResolvedValue({
      data: { result: { status: "success", agents: [{ id: 91, name: "ACS Freight Services Pte Ltd" }] } },
    });
    const res = await getLedgerAgentOptions({ q: "acs" });
    expect(res).toEqual([{ id: 91, name: "ACS Freight Services Pte Ltd" }]);
  });

  test("errors surface the server message", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "error", message: "Bad kind" } } });
    await expect(previewLedgerRoe({ kind: "x", currency_id: 1 })).rejects.toThrow("Bad kind");
  });
});
