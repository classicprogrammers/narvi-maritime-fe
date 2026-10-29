import {
  splitInvoiceNumbers,
  formatDuplicateMessage,
  shouldPrecheckInvoices,
} from "./ledgerInvoiceNumbers";

describe("ledgerInvoiceNumbers", () => {
  test("splits on mixed separators, trims, drops blanks and dupes", () => {
    expect(splitInvoiceNumbers("INV-1, INV-2;\n\n  inv-1 \r\nINV-3,,")).toEqual([
      "INV-1",
      "INV-2",
      "INV-3",
    ]);
    expect(splitInvoiceNumbers(" ,;\n ")).toEqual([]);
    expect(splitInvoiceNumbers(null)).toEqual([]);
  });

  test("duplicate message matches backend wording", () => {
    expect(
      formatDuplicateMessage(
        { invoice: "INV-1", so_number: "12", booked_by: "Ann", booked_on: "2026-10-01" },
        "Jady PVG"
      )
    ).toBe("Invoice number INV-1 from Jady PVG was already booked on SO 12 by Ann on 2026-10-01.");
  });

  test("shouldPrecheckInvoices", () => {
    expect(shouldPrecheckInvoices({ agent_id: "", invoices: "A" })).toBe(false);
    expect(shouldPrecheckInvoices({ agent_id: 1, invoices: " ; " })).toBe(false);
    expect(shouldPrecheckInvoices({ agent_id: 1, invoices: "A" })).toBe(true);
    const orig = { agent_id: 1, invoices: "A, B" };
    expect(shouldPrecheckInvoices({ agent_id: 1, invoices: "B\nA" }, orig)).toBe(false);
    expect(shouldPrecheckInvoices({ agent_id: 1, invoices: "A, C" }, orig)).toBe(true);
    expect(shouldPrecheckInvoices({ agent_id: 2, invoices: "A, B" }, orig)).toBe(true);
  });
});
