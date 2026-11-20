/**
 * Moving a shipping order out of Active asks for the SO case close date and
 * whether the POD was received. The backend sets the final status from
 * `pod_received` (false -> pending_pod, true -> ready_for_invoice).
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Statuses that open the popup when picked on an Active order. */
export const SO_STATUS_POPUP_TARGETS = ["done", "pending_pod", "ready_for_invoice"];

/** Backend returns `false` for an empty date; keep only a YYYY-MM-DD value. */
export function normalizeCaseCloseDate(value) {
  if (value == null || value === false) return "";
  const head = String(value).trim().slice(0, 10);
  return ISO_DATE_RE.test(head) ? head : "";
}

/** true / false when known, null when the order has no answer yet. */
export function normalizePodReceived(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

export function needsStatusChangePopup(originalDone, nextDone) {
  return originalDone === "active" && SO_STATUS_POPUP_TARGETS.includes(nextDone);
}

export function resolveStatusFromPod(podReceived) {
  return podReceived ? "ready_for_invoice" : "pending_pod";
}

/** Error text for the popup, or "" when it can be submitted. */
export function validateStatusChangeInput({ caseCloseDate, podReceived } = {}) {
  if (!normalizeCaseCloseDate(caseCloseDate)) return "SO case close date is required.";
  if (typeof podReceived !== "boolean") return "Select whether the POD was received.";
  return "";
}

/**
 * Extra update fields for a status change, merged over the normal diff payload.
 * - Active -> closed: `done: "done"` + `pod_received`, close date only when the order has none.
 * - Pending POD -> Ready for Invoice: `pod_received: true` (POD arrived later).
 */
export function buildStatusChangePayload(data = {}, originalData = {}) {
  const originalDone = originalData.done;
  const nextDone = data.done;
  const podReceived = normalizePodReceived(data.pod_received);

  if (needsStatusChangePopup(originalDone, nextDone) && podReceived !== null) {
    const payload = { done: "done", pod_received: podReceived };
    const caseCloseDate = normalizeCaseCloseDate(data.so_case_close_date);
    if (!normalizeCaseCloseDate(originalData.so_case_close_date) && caseCloseDate) {
      payload.so_case_close_date = caseCloseDate;
    }
    return payload;
  }

  if (originalDone === "pending_pod" && nextDone === "ready_for_invoice" && podReceived === true) {
    return { pod_received: true };
  }

  return {};
}
