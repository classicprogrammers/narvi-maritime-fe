import {
  buildStatusChangePayload,
  needsStatusChangePopup,
  normalizeCaseCloseDate,
  normalizePodReceived,
  resolveStatusFromPod,
  validateStatusChangeInput,
} from "./shippingOrderStatusChange";

describe("normalizeCaseCloseDate", () => {
  it("returns empty for false, null and bad text", () => {
    expect(normalizeCaseCloseDate(false)).toBe("");
    expect(normalizeCaseCloseDate(null)).toBe("");
    expect(normalizeCaseCloseDate("abc")).toBe("");
  });
  it("keeps the date part", () => {
    expect(normalizeCaseCloseDate("2026-11-20")).toBe("2026-11-20");
    expect(normalizeCaseCloseDate("2026-11-20 10:00:00")).toBe("2026-11-20");
  });
});

describe("normalizePodReceived", () => {
  it("maps booleans and leaves unknown as null", () => {
    expect(normalizePodReceived(true)).toBe(true);
    expect(normalizePodReceived(false)).toBe(false);
    expect(normalizePodReceived(undefined)).toBeNull();
    expect(normalizePodReceived("")).toBeNull();
  });
});

describe("needsStatusChangePopup", () => {
  it("only opens for Active -> done / pending_pod / ready_for_invoice", () => {
    expect(needsStatusChangePopup("active", "ready_for_invoice")).toBe(true);
    expect(needsStatusChangePopup("active", "pending_pod")).toBe(true);
    expect(needsStatusChangePopup("active", "done")).toBe(true);
    expect(needsStatusChangePopup("active", "cancelled")).toBe(false);
    expect(needsStatusChangePopup("active", "archive")).toBe(false);
    expect(needsStatusChangePopup("pending_pod", "ready_for_invoice")).toBe(false);
    expect(needsStatusChangePopup(undefined, "done")).toBe(false);
  });
});

describe("resolveStatusFromPod", () => {
  it("NO is Pending POD, YES is Ready for Invoice", () => {
    expect(resolveStatusFromPod(false)).toBe("pending_pod");
    expect(resolveStatusFromPod(true)).toBe("ready_for_invoice");
  });
});

describe("validateStatusChangeInput", () => {
  it("requires a close date and a POD answer", () => {
    expect(validateStatusChangeInput({ caseCloseDate: "", podReceived: true })).toMatch(/close date/i);
    expect(validateStatusChangeInput({ caseCloseDate: "2026-11-20", podReceived: null })).toMatch(/POD/);
    expect(validateStatusChangeInput({ caseCloseDate: "2026-11-20", podReceived: false })).toBe("");
  });
});

describe("buildStatusChangePayload", () => {
  it("sends done, pod_received and the close date when the order has none", () => {
    expect(
      buildStatusChangePayload(
        { done: "pending_pod", pod_received: false, so_case_close_date: "2026-11-20" },
        { done: "active", so_case_close_date: "" }
      )
    ).toEqual({ done: "done", pod_received: false, so_case_close_date: "2026-11-20" });
  });

  it("skips the close date when the order already has one", () => {
    expect(
      buildStatusChangePayload(
        { done: "ready_for_invoice", pod_received: true, so_case_close_date: "2026-11-21" },
        { done: "active", so_case_close_date: "2026-11-01" }
      )
    ).toEqual({ done: "done", pod_received: true });
  });

  it("sends only pod_received when the POD arrives later", () => {
    expect(
      buildStatusChangePayload(
        { done: "ready_for_invoice", pod_received: true },
        { done: "pending_pod", pod_received: false }
      )
    ).toEqual({ pod_received: true });
  });

  it("adds nothing for other changes", () => {
    expect(buildStatusChangePayload({ done: "cancelled" }, { done: "active" })).toEqual({});
    expect(buildStatusChangePayload({ done: "active" }, { done: "active" })).toEqual({});
    expect(buildStatusChangePayload({ done: "done" }, { done: "active" })).toEqual({});
  });
});
