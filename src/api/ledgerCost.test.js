import api from "./axios";
import { getLedgerCosts, bulkUpdateLedgerCosts, checkLedgerCostInvoices } from "./ledgerCost";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe("ledgerCost api", () => {
  afterEach(() => jest.clearAllMocks());

  test("list passes sort, status, ref and date params and returns sort", async () => {
    api.get.mockResolvedValue({ data: { status: "success", data: [], sort_by: "agent", sort_order: "asc" } });
    const res = await getLedgerCosts({
      sort_by: "agent",
      sort_order: "asc",
      so_done_status: "done",
      client_case_invoice_ref: " REF ",
      date_due_agent_from: "2026-10-01",
      date_due_agent_to: "2026-10-31",
      date_due_from: "2026-01-01",
    });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/cost", {
      params: {
        page: 1,
        page_size: 50,
        sort_by: "agent",
        sort_order: "asc",
        so_done_status: "done",
        client_case_invoice_ref: "REF",
        date_due_agent_from: "2026-10-01",
        date_due_agent_to: "2026-10-31",
      },
    });
    expect(res.sort_by).toBe("agent");
    expect(res.sort_order).toBe("asc");
  });

  test("bulk update posts ids and values", async () => {
    api.post.mockResolvedValue({ data: { status: "success", updated_count: 2, ids: [1, 2], updated_fields: ["biz_category"] } });
    const res = await bulkUpdateLedgerCosts({ ids: [1, 2], values: { biz_category: "bunker" } });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/cost/bulk-update", {
      ids: [1, 2],
      values: { biz_category: "bunker" },
    });
    expect(res.updated_count).toBe(2);
  });

  test("bulk update surfaces the server message", async () => {
    api.post.mockResolvedValue({ data: { result: { status: "error", message: "Record 9 not found" } } });
    await expect(bulkUpdateLedgerCosts({ ids: [9], values: {} })).rejects.toThrow("Record 9 not found");
  });

  test("check-invoice sends exclude_id only when editing", async () => {
    api.post.mockResolvedValue({
      data: { has_duplicates: true, duplicates: [{ invoice: "INV-1", so_number: "12" }] },
    });
    const res = await checkLedgerCostInvoices({ agent_id: 12, invoices: "INV-1", exclude_id: 5 });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/cost/check-invoice", {
      agent_id: 12,
      invoices: "INV-1",
      exclude_id: 5,
    });
    expect(res.has_duplicates).toBe(true);

    api.post.mockResolvedValue({ data: { has_duplicates: false, duplicates: [] } });
    await checkLedgerCostInvoices({ agent_id: 12, invoices: "INV-2" });
    expect(api.post).toHaveBeenLastCalledWith("/api/ledger/cost/check-invoice", {
      agent_id: 12,
      invoices: "INV-2",
    });
  });
});
