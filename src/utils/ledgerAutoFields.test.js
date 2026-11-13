import {
  readAutoField,
  applyManualInput,
  writableAutoValue,
  diffAutoNumber,
  diffAutoDate,
  describeDueRule,
} from "./ledgerAutoFields";

describe("ledgerAutoFields", () => {
  test("readAutoField reads value and flag; 0 with manual flag is auto", () => {
    expect(readAutoField({ roe: 1.2, roe_manual: true }, "roe", "roe_manual")).toEqual({
      value: "1.2",
      manual: true,
    });
    expect(readAutoField({ roe: 0, roe_manual: true }, "roe", "roe_manual")).toEqual({
      value: "",
      manual: false,
    });
    expect(readAutoField({ roe: false }, "roe", "roe_manual")).toEqual({ value: "", manual: false });
  });

  test("applyManualInput: typing is manual, only empty is auto; a leading 0 is kept for 0.5", () => {
    expect(applyManualInput("1.5")).toEqual({ value: "1.5", manual: true });
    expect(applyManualInput("")).toEqual({ value: "", manual: false });
    expect(applyManualInput("   ")).toEqual({ value: "", manual: false });
    expect(applyManualInput("0")).toEqual({ value: "0", manual: true });
    expect(applyManualInput("0.")).toEqual({ value: "0.", manual: true });
    expect(applyManualInput("0.5")).toEqual({ value: "0.5", manual: true });
  });

  test("a manual value that is still 0 is never written and counts as automatic", () => {
    const k = ["roe", "roe_manual"];
    expect(writableAutoValue({ roe: "0", roe_manual: true }, ...k)).toBe("");
    expect(writableAutoValue({ roe: "0.", roe_manual: true }, ...k)).toBe("");
    expect(writableAutoValue({ roe: "0.5", roe_manual: true }, ...k)).toBe("0.5");
    const auto = { roe: "1.2", roe_manual: false };
    expect(diffAutoNumber({ roe: "0", roe_manual: true }, auto, ...k)).toBeUndefined();
    expect(diffAutoNumber({ roe: "0.5", roe_manual: true }, auto, ...k)).toBe(0.5);
    expect(diffAutoNumber({ roe: "0", roe_manual: true }, { roe: "1.5", roe_manual: true }, ...k)).toBeNull();
  });

  test("auto values are never written", () => {
    expect(writableAutoValue({ roe: "1.2", roe_manual: false }, "roe", "roe_manual")).toBe("");
    expect(writableAutoValue({ roe: "1.2", roe_manual: true }, "roe", "roe_manual")).toBe("1.2");
  });

  test("diffAutoNumber", () => {
    const k = ["roe", "roe_manual"];
    const auto = { roe: "1.2", roe_manual: false };
    expect(diffAutoNumber(auto, auto, ...k)).toBeUndefined();
    expect(diffAutoNumber({ roe: "1.2", roe_manual: true }, auto, ...k)).toBe(1.2);
    expect(diffAutoNumber({ roe: "", roe_manual: false }, { roe: "1.5", roe_manual: true }, ...k)).toBeNull();
    expect(diffAutoNumber({ roe: "1.6", roe_manual: true }, { roe: "1.5", roe_manual: true }, ...k)).toBe(1.6);
  });

  test("diffAutoDate", () => {
    const k = ["due", "due_manual"];
    expect(diffAutoDate({ due: "2026-11-01", due_manual: false }, { due: "2026-11-01", due_manual: false }, ...k)).toBeUndefined();
    expect(diffAutoDate({ due: "2026-11-02", due_manual: true }, { due: "2026-11-01", due_manual: false }, ...k)).toBe("2026-11-02");
    expect(diffAutoDate({ due: "", due_manual: false }, { due: "2026-11-02", due_manual: true }, ...k)).toBe(false);
  });

  test("describeDueRule", () => {
    expect(describeDueRule({ rule: "30 days", payment_term: "30 days", due_date: "2026-11-30" })).toBe(
      "30 days after invoice date"
    );
    expect(
      describeDueRule({ rule: "Current month + 30 days", payment_term: "x", due_date: "2026-12-30" })
    ).toBe("End of invoice month + 30 days");
    // Rule texts the backend sends
    expect(describeDueRule({ rule: "30 days after invoice date", payment_term: "Net 30", due_date: "2026-09-13" })).toBe(
      "30 days after invoice date"
    );
    expect(
      describeDueRule({ rule: "end of invoice month + 30 days", payment_term: "Running month + 30", due_date: "2026-09-30" })
    ).toBe("End of invoice month + 30 days");
    expect(describeDueRule({ rule: "end of invoice month", payment_term: "EOM", due_date: "2026-08-31" })).toBe(
      "End of invoice month"
    );
    expect(
      describeDueRule({
        rule: "end of the month after the invoice month + 30 days",
        payment_term: "Next month + 30 days",
        due_date: "2026-10-30",
      })
    ).toBe("End of the month after the invoice month + 30 days");
    expect(
      describeDueRule({
        rule: "end of the month after the invoice month",
        payment_term: "End of following month",
        due_date: "2026-09-30",
      })
    ).toBe("End of the month after the invoice month");
    expect(describeDueRule({ payment_term: "Net weird", due_date: null })).toBe(
      "Payment term 'Net weird' could not be read. Enter the due date manually."
    );
  });
});
