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

describe("ledgerInvoice ids filter and number check", () => {
  afterEach(() => jest.clearAllMocks());

  test("sends ids as a comma string", async () => {
    api.get.mockResolvedValue({ data: { status: "success", data: [], total_count: 0 } });
    await getLedgerInvoices({ ids: [7, 8], page_size: 2 });
    expect(api.get).toHaveBeenCalledWith("/api/ledger/invoice", { params: { ids: "7,8", page: 1, page_size: 2 } });
  });

  test("checkLedgerInvoiceNumber posts the number and unwraps the result", async () => {
    const { checkLedgerInvoiceNumber } = require("./ledgerInvoice");
    api.post.mockResolvedValue({
      data: {
        result: {
          status: "success",
          has_duplicates: true,
          duplicates: [{ invoice: "654", record_id: 9, so_number: "4364", booked_by: "admin", booked_on: "2026-09-09" }],
        },
      },
    });
    const res = await checkLedgerInvoiceNumber({ invoice_number: "654", exclude_id: 5 });
    expect(api.post).toHaveBeenCalledWith("/api/ledger/invoice/check-number", { invoice_number: "654", exclude_id: 5 });
    expect(res.has_duplicates).toBe(true);
    expect(res.duplicates[0].record_id).toBe(9);

    api.post.mockResolvedValue({ data: { result: { status: "success", has_duplicates: false, duplicates: [] } } });
    const none = await checkLedgerInvoiceNumber({ invoice_number: "655" });
    expect(api.post).toHaveBeenLastCalledWith("/api/ledger/invoice/check-number", { invoice_number: "655" });
    expect(none).toEqual({ has_duplicates: false, duplicates: [] });

    api.post.mockResolvedValue({ data: { result: { status: "error", message: "nope" } } });
    await expect(checkLedgerInvoiceNumber({ invoice_number: "1" })).rejects.toThrow("nope");
  });
});

describe("ledgerInvoice issuers and issued_by filter", () => {
  afterEach(() => jest.clearAllMocks());

  test("getLedgerInvoiceIssuers posts {} or { q } and unwraps the list", async () => {
    const { getLedgerInvoiceIssuers } = require("./ledgerInvoice");
    api.post.mockResolvedValue({ data: { result: { status: "success", issuers: [{ id: 1, name: "Ann" }] } } });
    expect(await getLedgerInvoiceIssuers({})).toEqual([{ id: 1, name: "Ann" }]);
    expect(api.post).toHaveBeenLastCalledWith("/api/ledger/invoice/issuers", {});

    await getLedgerInvoiceIssuers({ q: " an " });
    expect(api.post).toHaveBeenLastCalledWith("/api/ledger/invoice/issuers", { q: "an" });

    api.post.mockResolvedValue({ data: { status: "success", issuers: [{ id: 2, name: "Bob" }] } });
    expect(await getLedgerInvoiceIssuers({ q: "" })).toEqual([{ id: 2, name: "Bob" }]);

    api.post.mockResolvedValue({ data: { result: { status: "success" } } });
    expect(await getLedgerInvoiceIssuers({})).toEqual([]);

    api.post.mockResolvedValue({ data: { result: { status: "error", message: "bad" } } });
    await expect(getLedgerInvoiceIssuers({})).rejects.toThrow("bad");
  });

  test("getLedgerInvoices sends issued_by_id only when set and returns columns", async () => {
    api.get.mockResolvedValue({ data: { status: "success", data: [], columns: ["issued_by"] } });
    const res = await getLedgerInvoices({ issued_by_id: 4 });
    expect(api.get).toHaveBeenLastCalledWith("/api/ledger/invoice", {
      params: { page: 1, page_size: 50, issued_by_id: 4 },
    });
    expect(res.columns).toEqual(["issued_by"]);

    const none = await getLedgerInvoices({ issued_by_id: "" });
    expect(api.get).toHaveBeenLastCalledWith("/api/ledger/invoice", { params: { page: 1, page_size: 50 } });
    expect(none.columns).toEqual(["issued_by"]);
  });
});
