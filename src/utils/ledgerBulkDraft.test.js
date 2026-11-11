import {
  buildLedgerBulkRetryRequests,
  getFailedBulkIds,
  isLedgerBulkPartialFailure,
  ledgerBulkRecordId,
} from "./ledgerBulkDraft";

const payload = { ids: [1, 2, 3], values: { state: "done" } };

describe("ledgerBulkDraft", () => {
  it("returns ids missing from the result", () => {
    expect(getFailedBulkIds(payload, { ids: ["1", 3] })).toEqual([2]);
    expect(isLedgerBulkPartialFailure(payload, { ids: [1, 2, 3] })).toBe(false);
  });

  it("is not a partial failure when the result lists no ids", () => {
    expect(getFailedBulkIds(payload, { updated_count: 3 })).toEqual([]);
    expect(getFailedBulkIds(null, null)).toEqual([]);
  });

  it("builds a retry request limited to the given ids", () => {
    expect(buildLedgerBulkRetryRequests("bulkUpdateLedgerCosts", payload, [2])).toEqual([
      { api: "bulkUpdateLedgerCosts", args: [{ ids: [2], values: { state: "done" } }] },
    ]);
    expect(buildLedgerBulkRetryRequests("bulkUpdateLedgerCosts", payload)[0].args[0].ids).toEqual([1, 2, 3]);
  });

  it("builds an order independent record id", () => {
    expect(ledgerBulkRecordId([3, 1, 2])).toBe(ledgerBulkRecordId([1, 2, 3]));
  });
});
