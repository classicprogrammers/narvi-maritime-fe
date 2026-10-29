import {
  soDoneStatusLabel,
  soDoneStatusColor,
  destinationParts,
  agentOptionLabel,
  agentOptionSecondary,
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
    expect(agentOptionLabel({ id: 3, name: "Jady PVG" })).toBe("Jady PVG");
    expect(agentOptionLabel({ id: 3 })).toBe("Agent 3");
    expect(agentOptionSecondary({ agent_code: "A1", company: "Co" })).toBe("A1 · Co");
    expect(agentOptionSecondary({ agent_code: "A1", company: false })).toBe("A1");
    expect(agentOptionSecondary({})).toBe("");
  });
});
