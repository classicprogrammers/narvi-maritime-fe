import {
  buildClientOrderEditForm,
  buildClientOrderUpdatePayload,
  getClientOrderTwoWayState,
  shouldMarkClientOrderSeen,
  toDateInputValue,
  validateClientOrderDates,
} from "./clientOrderUpdates";

describe("clientOrderUpdates", () => {
  const raw = {
    id: 12,
    eta_date: "2026-11-01 00:00:00",
    etb: "2026-11-02",
    etd: false,
    vsls_agent_dtls: "Agent A",
    client_case_invoice_ref: false,
  };

  test("normalizes dates for date inputs", () => {
    expect(toDateInputValue("2026-11-01 00:00:00")).toBe("2026-11-01");
    expect(toDateInputValue("2026-11-01T10:00:00Z")).toBe("2026-11-01");
    expect(toDateInputValue(false)).toBe("");
    expect(toDateInputValue(null)).toBe("");
  });

  test("builds the edit form with an empty new remark", () => {
    expect(buildClientOrderEditForm(raw)).toEqual({
      eta_date: "2026-11-01",
      etb: "2026-11-02",
      etd: "",
      vsls_agent_dtls: "Agent A",
      client_case_invoice_ref: "",
      remark_to_nm: "",
    });
  });

  test("sends only changed keys and null for cleared dates", () => {
    const initial = buildClientOrderEditForm(raw);
    const form = { ...initial, etb: "", client_case_invoice_ref: " CASE-123 " };
    expect(buildClientOrderUpdatePayload(12, initial, form)).toEqual({
      id: 12,
      etb: null,
      client_case_invoice_ref: "CASE-123",
    });
  });

  test("returns null when nothing changed and adds client_id when given", () => {
    const initial = buildClientOrderEditForm(raw);
    expect(buildClientOrderUpdatePayload(12, initial, { ...initial, remark_to_nm: "  " })).toBeNull();
    expect(
      buildClientOrderUpdatePayload("12", initial, { ...initial, remark_to_nm: "Please confirm." }, 310)
    ).toEqual({ id: 12, remark_to_nm: "Please confirm.", client_id: 310 });
  });

  test("enforces ETA <= ETB <= ETD on the dates that are set", () => {
    expect(validateClientOrderDates({ eta_date: "2026-11-01", etb: "2026-11-02", etd: "2026-11-02" })).toBeNull();
    expect(validateClientOrderDates({ eta_date: "2026-11-03", etb: "2026-11-02" })).toMatch(/ETA/);
    expect(validateClientOrderDates({ etb: "2026-11-03", etd: "2026-11-02" })).toMatch(/ETB/);
    expect(validateClientOrderDates({ eta_date: "2026-11-03", etd: "2026-11-02" })).toMatch(/ETA/);
    expect(validateClientOrderDates({ etb: "2026-11-03" })).toBeNull();
  });

  test("reads two-way flags and remarks from the raw order", () => {
    const state = getClientOrderTwoWayState({
      is_editable: true,
      has_new_from_narvi: true,
      client_update_pending: false,
      seen_by_narvi_at: false,
      remark_to_client: { id: 3, text: "Berth confirmed", author: "Narvi", created_at: "2026-10-27 09:00:00" },
      remark_to_nm: null,
      remarks: [{ id: 3, text: "Berth confirmed", direction: "to_client" }, { id: 4, text: "" }],
      changes: [{ source: "staff", label: "ETA" }, null],
    });
    expect(state.isEditable).toBe(true);
    expect(state.hasNewFromNarvi).toBe(true);
    expect(state.seenByNarviAt).toBeNull();
    expect(state.remarkToClient.text).toBe("Berth confirmed");
    expect(state.remarkToNm).toBeNull();
    expect(state.remarks).toHaveLength(1);
    expect(state.changes).toHaveLength(1);
    expect(getClientOrderTwoWayState(undefined).isEditable).toBe(false);
  });

  test("marks seen only for flagged orders", () => {
    expect(shouldMarkClientOrderSeen({ id: 1, has_new_from_narvi: true })).toBe(true);
    expect(shouldMarkClientOrderSeen({ id: 1, has_new_from_narvi: false })).toBe(false);
    expect(shouldMarkClientOrderSeen(null)).toBe(false);
  });
});
