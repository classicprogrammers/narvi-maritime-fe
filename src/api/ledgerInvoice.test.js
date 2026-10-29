import api from "./axios";
import { getLedgerInvoices, bulkUpdateLedgerInvoices } from "./ledgerInvoice";

jest.mock("./axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe("ledgerInvoice api", () => {
  afterEach(() => jest.clearAllMocks());

  test("list passes sort, status, ref and date params", async () => {
    api.get.mockResolvedValue({ data: { status: "success", data: [], sort_by: "date_due", sort_order: "desc" } });
    const res = await getLedgerInvoices({
      sort_by: "date_due",
      sort_order: "desc",
      so_done_status: "pending_pod",
      client_case_invoice_ref: "R1",
      date_due_from: "2026-10-01",
      date_paid_to: "2026-10-31",
      date_due_agent_from: "2026-01-01",
    });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/invoice", {
      params: {
        page: 1,
        page_size: 50,
        sort_by: "date_due",
        sort_order: "desc",
        so_done_status: "pending_pod",
        client_case_invoice_ref: "R1",
        date_due_from: "2026-10-01",
        date_paid_to: "2026-10-31",
      },
    });
    expect(res.sort_by).toBe("date_due");
  });

  test("bulk update posts ids and values", async () => {
    api.post.mockResolvedValue({ data: { updated_count: 1, ids: [4], updated_fields: ["roe"] } });
    const res = await bulkUpdateLedgerInvoices({ ids: [4], values: { roe: null } });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/invoice/bulk-update", { ids: [4], values: { roe: null } });
    expect(res).toEqual({ updated_count: 1, ids: [4], updated_fields: ["roe"] });
  });
});
