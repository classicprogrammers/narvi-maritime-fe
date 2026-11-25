import {
  OLD_RATE_HINT,
  RATE_AGE,
  STALE_TARIFF_WARNING,
  TARIFF_RATE_MAX_AGE_MONTHS,
  UNKNOWN_LAST_UPDATE_TEXT,
  formatLastUpdate,
  getRateAgeStatus,
  isRateOld,
  parseLastUpdate,
} from "./tariffRateAge";

const TODAY = new Date(2025, 5, 15); // 15 Jun 2025, fixed so tests never use the real clock

describe("constants", () => {
  it("uses a 12 month threshold and the agreed texts", () => {
    expect(TARIFF_RATE_MAX_AGE_MONTHS).toBe(12);
    expect(OLD_RATE_HINT).toBe("Last updated more than 12 months ago");
    expect(STALE_TARIFF_WARNING).toBe("Rates in this tariff seem to be old, please check");
    expect(UNKNOWN_LAST_UPDATE_TEXT).toBe("—");
  });
});

describe("parseLastUpdate", () => {
  it("returns null for non-strings and bad strings", () => {
    [false, true, null, undefined, 0, 20250101, {}, [], "", "   ", "abc", "2025-1-1", "01/02/2025", "2025-01-01x"].forEach(
      (v) => expect(parseLastUpdate(v)).toBeNull()
    );
  });

  it("returns null for zero dates, 'false', Date objects and junk suffixes", () => {
    ["0000-00-00", "false", new Date(2025, 2, 1), "2025-03-01 junk", "2025-03-01T"].forEach((v) =>
      expect(parseLastUpdate(v)).toBeNull()
    );
  });

  it("trims surrounding whitespace", () => {
    const d = parseLastUpdate(" 2025-03-01 ");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 2, 1]);
  });

  it("returns null for impossible dates", () => {
    expect(parseLastUpdate("2025-02-30")).toBeNull();
    expect(parseLastUpdate("2025-13-01")).toBeNull();
    expect(parseLastUpdate("2025-00-10")).toBeNull();
    expect(parseLastUpdate("2025-04-31")).toBeNull();
  });

  it("parses a plain date to local midnight", () => {
    const d = parseLastUpdate("2024-02-29");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2024, 1, 29]);
  });

  it("uses only the date part when a time part is present", () => {
    const iso = parseLastUpdate("2025-03-04T10:00:00Z");
    const spaced = parseLastUpdate("2025-03-04 10:00:00");
    [iso, spaced].forEach((d) => expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 2, 4]));
  });
});

describe("getRateAgeStatus", () => {
  it("is unknown for false, null, undefined, non-strings and bad values", () => {
    [false, null, undefined, 123, {}, "", "garbage", "2025-02-30", "2025-13-01"].forEach((v) =>
      expect(getRateAgeStatus(v, TODAY)).toBe(RATE_AGE.UNKNOWN)
    );
  });

  it("is ok for exactly 12 months ago and old one day over", () => {
    expect(getRateAgeStatus("2024-06-15", TODAY)).toBe(RATE_AGE.OK);
    expect(getRateAgeStatus("2024-06-14", TODAY)).toBe(RATE_AGE.OLD);
  });

  it("is ok for recent and future dates", () => {
    expect(getRateAgeStatus("2025-06-15", TODAY)).toBe(RATE_AGE.OK);
    expect(getRateAgeStatus("2025-01-01", TODAY)).toBe(RATE_AGE.OK);
    expect(getRateAgeStatus("2030-01-01", TODAY)).toBe(RATE_AGE.OK);
  });

  it("clamps Feb 29 to Feb 28 of the previous year", () => {
    const leapDay = new Date(2024, 1, 29);
    expect(getRateAgeStatus("2023-02-28", leapDay)).toBe(RATE_AGE.OK);
    expect(getRateAgeStatus("2023-02-27", leapDay)).toBe(RATE_AGE.OLD);
  });

  it("uses only the date part of a value with a time", () => {
    expect(getRateAgeStatus("2024-06-15T10:00:00Z", TODAY)).toBe(RATE_AGE.OK);
    expect(getRateAgeStatus("2024-06-14 23:59:59", TODAY)).toBe(RATE_AGE.OLD);
  });

  it("ignores the time of day of today", () => {
    const lateToday = new Date(2025, 5, 15, 23, 59, 59);
    expect(getRateAgeStatus("2024-06-15", lateToday)).toBe(RATE_AGE.OK);
  });

  it("handles a month-end today (31 Mar 2026 -> cutoff 31 Mar 2025)", () => {
    const monthEnd = new Date(2026, 2, 31);
    expect(getRateAgeStatus("2025-03-31", monthEnd)).toBe(RATE_AGE.OK);
    expect(getRateAgeStatus("2025-03-30", monthEnd)).toBe(RATE_AGE.OLD);
  });

  describe("default today", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2026, 10, 25, 12, 0, 0));
    });
    afterEach(() => jest.useRealTimers());

    it("uses the current date when today is omitted", () => {
      expect(getRateAgeStatus("2025-11-25")).toBe(RATE_AGE.OK);
      expect(getRateAgeStatus("2025-11-24")).toBe(RATE_AGE.OLD);
    });

    it("isRateOld uses the current date when today is omitted", () => {
      expect(isRateOld("2025-11-25")).toBe(false);
      expect(isRateOld("2025-11-24")).toBe(true);
    });
  });

  it("is unknown when today is invalid", () => {
    expect(getRateAgeStatus("2020-01-01", new Date("nope"))).toBe(RATE_AGE.UNKNOWN);
    expect(getRateAgeStatus("2020-01-01", "2025-06-15")).toBe(RATE_AGE.UNKNOWN);
    expect(getRateAgeStatus("2020-01-01", null)).toBe(RATE_AGE.UNKNOWN);
  });
});

describe("isRateOld", () => {
  it("gives no banner for false, missing, unparseable or future values", () => {
    [false, null, undefined, "bad", "2099-01-01"].forEach((v) => expect(isRateOld(v, TODAY)).toBe(false));
  });

  it("gives no banner at exactly 12 months", () => {
    expect(isRateOld("2024-06-15", TODAY)).toBe(false);
  });

  it("gives a banner for an old oldest date", () => {
    expect(isRateOld("2024-06-14", TODAY)).toBe(true);
    expect(isRateOld("2020-01-01", TODAY)).toBe(true);
  });

  it("gives no banner when today is invalid", () => {
    expect(isRateOld("2020-01-01", new Date("nope"))).toBe(false);
  });
});

describe("formatLastUpdate", () => {
  it("formats as DD/MM/YYYY", () => {
    expect(formatLastUpdate("2025-03-04")).toBe("04/03/2025");
    expect(formatLastUpdate("2025-03-04T10:00:00Z")).toBe("04/03/2025");
  });

  it("shows an em dash for unknown values", () => {
    [false, null, undefined, "", "bad", "2025-02-30"].forEach((v) => expect(formatLastUpdate(v)).toBe("—"));
  });
});
