import { formatDateDMY, formatDateTimeDMYFull, maskDmyTyping, dmyToIsoStrict } from "./dateFormat";

describe("formatDateDMY", () => {
  it("formats ISO dates as DD/MM/YYYY without timezone shift", () => {
    expect(formatDateDMY("2026-06-15")).toBe("15/06/2026");
    expect(formatDateDMY("2026-01-05")).toBe("05/01/2026");
  });
  it("formats backend datetimes and Date objects", () => {
    expect(formatDateDMY("2026-06-15 10:30:00")).toBe("15/06/2026");
    expect(formatDateDMY(new Date(2026, 9, 13, 12, 9, 8))).toBe("13/10/2026");
  });
  it("normalises d/m/yyyy text", () => {
    expect(formatDateDMY("5/6/2026")).toBe("05/06/2026");
  });
  it("returns empty for blank and raw text when unparseable", () => {
    expect(formatDateDMY(null)).toBe("");
    expect(formatDateDMY(false)).toBe("");
    expect(formatDateDMY("")).toBe("");
    expect(formatDateDMY("TBA")).toBe("TBA");
  });
});

describe("formatDateTimeDMYFull", () => {
  it("never re-reads day-first text as month-first", () => {
    expect(formatDateTimeDMYFull("05/06/2026 12:09:08")).toBe("05/06/2026 12:09:08");
    expect(formatDateDMY("05/06/2026 12:09:08")).toBe("05/06/2026 12:09:08");
  });
  it("adds 24h time", () => {
    expect(formatDateTimeDMYFull(new Date(2026, 9, 13, 14, 9, 8))).toBe("13/10/2026 14:09:08");
    expect(formatDateTimeDMYFull("2026-10-13 12:09:08")).toBe("13/10/2026 12:09:08");
  });
  it("date-only stays date-only; blank is empty", () => {
    expect(formatDateTimeDMYFull("2026-10-13")).toBe("13/10/2026");
    expect(formatDateTimeDMYFull(null)).toBe("");
  });
});

describe("maskDmyTyping", () => {
  it("keeps digits only and adds slashes", () => {
    expect(maskDmyTyping("asdf")).toBe("");
    expect(maskDmyTyping("15062026")).toBe("15/06/2026");
    expect(maskDmyTyping("15/0")).toBe("15/0");
    expect(maskDmyTyping("1506x2026")).toBe("15/06/2026");
  });
  it("refuses impossible days and months while typing", () => {
    expect(maskDmyTyping("4")).toBe("");
    expect(maskDmyTyping("32")).toBe("3");
    expect(maskDmyTyping("00")).toBe("0");
    expect(maskDmyTyping("1313")).toBe("13/1");
    expect(maskDmyTyping("13/32/1233")).toBe("13");
    expect(maskDmyTyping("1500")).toBe("15/0");
    expect(maskDmyTyping("15/13")).toBe("15/1");
  });
  it("caps at 8 digits", () => {
    expect(maskDmyTyping("150620261234")).toBe("15/06/2026");
  });
});

describe("dmyToIsoStrict", () => {
  it("accepts real dates only", () => {
    expect(dmyToIsoStrict("15/06/2026")).toBe("2026-06-15");
    expect(dmyToIsoStrict("29/02/2024")).toBe("2024-02-29");
    expect(dmyToIsoStrict("31/02/2026")).toBeNull();
    expect(dmyToIsoStrict("15/06/1800")).toBeNull();
    expect(dmyToIsoStrict("15/06")).toBeNull();
  });
});
