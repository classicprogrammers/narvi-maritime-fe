import {
  splitInvoiceNumbers,
  formatDuplicateMessage,
  shouldPrecheckInvoices,
  invoiceNumbersKey,
  findOtherAgentDuplicates,
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

  test("invoiceNumbersKey ignores order and case", () => {
    expect(invoiceNumbersKey("B, a")).toBe(invoiceNumbersKey("A\nb"));
    expect(invoiceNumbersKey("A")).not.toBe(invoiceNumbersKey("A, B"));
  });

  test("findOtherAgentDuplicates keeps exact matches under another agent only", () => {
    const records = [
      { id: 1, invoices: "IN26103253", agent: "ACS", agent_detail: { id: 7, name: "ACS" }, so_number: "4349" },
      { id: 2, invoices: "IN26103253, X-1", agent: "Jady", agent_detail: { id: 8, name: "Jady" }, so_number: "4350" },
      { id: 3, invoices: "IN261032539", agent: "Other", agent_detail: { id: 9, name: "Other" } },
      { id: 4, invoices: "in26103253", agent: "Old", agent_detail: { id: 10, name: "Old" }, is_cancelled: true },
      { id: 5, invoices: "IN26103253", agent: "Self", agent_detail: { id: 11, name: "Self" } },
    ];
    // no agent picked yet: every agent counts as "another" (except cancelled / partial matches)
    expect(
      findOtherAgentDuplicates(records, "in26103253", {}).map((d) => [d.record_id, d.agent_name, d.so_number])
    ).toEqual([
      [1, "ACS", "4349"],
      [2, "Jady", "4350"],
      [5, "Self", ""],
    ]);
    // agent 7 picked: its own record is left to the same-agent check; the record being edited is skipped
    expect(
      findOtherAgentDuplicates(records, "IN26103253", { agentId: 7, excludeId: 5 }).map((d) => d.record_id)
    ).toEqual([2]);
    expect(findOtherAgentDuplicates(null, "A")).toEqual([]);
    expect(findOtherAgentDuplicates(records, "", {})).toEqual([]);
  });
});
