import {
  soDoneStatusLabel,
  soDoneStatusColor,
  destinationParts,
  agentOptionLabel,
  agentOptionSecondary,
  ledgerViewValue,
  isLedgerCancelled,
  ledgerCancelledText,
} from "./ledgerDisplay";

describe("ledgerDisplay", () => {
  test("soDoneStatusLabel fallback chain", () => {
    expect(soDoneStatusLabel({ so_done_status_label: "Pending POD", so_done_status: "done" })).toBe("Pending POD");
    expect(soDoneStatusLabel({ so_done_status: "ready_for_invoice" })).toBe("Ready for Invoice");
    expect(soDoneStatusLabel({ so_done_status_label: false })).toBe("-");
    expect(soDoneStatusLabel({ so_done_status: "weird" })).toBe("weird");
  });

  test("soDoneStatusColor", () => {
    expect(soDoneStatusColor("done")).toBe("green");
    expect(soDoneStatusColor("pending_pod")).toBe("orange");
    expect(soDoneStatusColor("unknown")).toBe("gray");
    expect(soDoneStatusColor(undefined)).toBe("gray");
  });

  test("destinationParts treats false as empty", () => {
    expect(
      destinationParts({ destination_type_label: "Port", destination_name: "Shanghai", destination_country: false })
    ).toEqual({ type: "Port", name: "Shanghai", country: "" });
  });

  test("agent option label and secondary line", () => {
    expect(agentOptionLabel({ id: 3, name: "Jady PVG", agent_code: "A1" })).toBe("Jady PVG");
    expect(agentOptionLabel({ id: 3 })).toBe("Agent 3");
    expect(agentOptionSecondary({ agent_code: "A1", company: "Co" })).toBe("A1 · Co");
    expect(agentOptionSecondary({ agent_code: "A1", company: false })).toBe("A1");
    expect(agentOptionSecondary({ agent_code: "A1", company: "A1" })).toBe("A1");
    expect(agentOptionSecondary({})).toBe("");
  });

  test("ledgerViewValue formats by column type", () => {
    expect(ledgerViewValue({ key: "date_due", type: "due" }, { date_due: "2026-09-30 00:00:00", date_due_manual: true })).toBe("2026-09-30 (manual)");
    expect(ledgerViewValue({ key: "roe", type: "roe" }, { roe: 2 })).toBe("2 (auto)");
    expect(ledgerViewValue({ key: "currency_amount", type: "number" }, { currency_amount: 1234.5 })).toBe("1,234.5");
    expect(ledgerViewValue({ key: "invoice_soa", type: "bool" }, { invoice_soa: true })).toBe("Yes");
    expect(ledgerViewValue({ key: "so_done_status", type: "badge" }, { so_done_status: "done" })).toBe("Done");
    expect(ledgerViewValue({ key: "payment_status", type: "badge" }, { payment_status: "open", payment_status_label: "Open" })).toBe("Open");
    expect(ledgerViewValue({ key: "so_number", type: "text" }, { sale_order_id: [5, "SO 4349"] })).toBe("SO 4349");
    expect(ledgerViewValue({ key: "agent", type: "text" }, { agent_detail: { name: "ACS" } })).toBe("ACS");
    expect(ledgerViewValue({ key: "invoices", type: "longtext" }, { invoices: false })).toBe("");
  });

  test("cancelled helpers", () => {
    expect(isLedgerCancelled({ is_cancelled: true })).toBe(true);
    expect(isLedgerCancelled({ state: "cancelled" })).toBe(true);
    expect(isLedgerCancelled({ state: "active", is_cancelled: false })).toBe(false);
    expect(isLedgerCancelled(null)).toBe(false);
    expect(
      ledgerCancelledText({ is_cancelled: true, cancelled_by: { id: 1, name: "Sam" }, cancelled_on: "2026-11-04 10:00:00" })
    ).toBe("Cancelled by Sam on 2026-11-04");
    expect(ledgerCancelledText({ is_cancelled: true, cancelled_by: null, cancelled_on: false })).toBe("Cancelled");
    expect(ledgerCancelledText({ is_cancelled: false })).toBe("");
  });
});
