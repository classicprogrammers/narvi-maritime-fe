# 001-drafts: Verifier review (final pass)

Scope: the uncommitted working tree on `staging`, checked against `docs/specs/001-drafts.md` and the second-pass report (B1-residual, R1, V1, L1).

## Verdict: PASS

The blocker B1-residual is fixed. R1 and V1 are fixed too. The edits caused no regressions: lint counts are unchanged, and all tests and the build pass. L1 and the earlier known limits are still open, and none of them blocks. One new low-severity issue is listed for CP4.

## Checks run
- `npm run check` exits 1 at `lint:changed` with 187 errors. All of them already exist at HEAD.
- Lint error counts per file, HEAD vs the working tree, using the ESLint API:
  - Covered 40 modified and 43 untracked files under `src/`.
  - Totals: HEAD 187, now 187.
  - No file's count changed, and the new files have 0 errors.
- `npm run test:ci`: 47 of 47 suites passed. 320 tests passed and 4 were skipped.
- `npm run build`: exit 0.

## Re-verification
| ID | Status | Evidence |
|---|---|---|
| B1-residual | FIXED | `src/utils/draftRetry.js:18-21` now calls `moduleDef.isFailure(req.api, result, req.args)`. `src/config/draftModules.js:35-36` adds `ledgerBulkFailure = isExplicitFailure(result) \|\| isLedgerBulkPartialFailure(args?.[0], result)`, and `ledgerCostBulk` / `ledgerInvoiceBulk` use it at `:150`, `:156`. `args[0]` is the `{ids, values}` payload. The screens build it with `buildLedgerBulkRetryRequests` (`ledger/cost/index.jsx:575,589`, `ledger/invoice/index.jsx:493,507`), and it matches the API signature (`api/ledgerCost.js:121`, `api/ledgerInvoice.js:120`). The registry check is now the same as the screens' check (`cost/index.jsx:584`, `invoice/index.jsx:502`). When `res.ids` is a strict subset, `getFailedBulkIds` is non-empty, so the result is a failure. `runDraftRequests` then returns `ok:false`, and `drafts/index.jsx:73-79` takes the `upsertDraft(applyRetryFailure(...))` branch, so the draft is not removed. Tests: `draftModules.test.js:139-141` (registry, strict subset) and `draftRetry.test.js:70-77`. |
| B1 other modules | NO REGRESSION | Every other `isFailure` in `draftModules.js:33-48` and the vessel one at `:229-233` take `(apiName, result)`, so the extra third argument is ignored. A module without `isFailure` still falls back to `defaultIsFailure`. |
| V1 | FIXED | `VesselForm.jsx:772-773`: `requests: createRows.length ? [] : [{ api: "bulkUpdateVesselItems", args: [items] }]`. A draft that also holds create rows can only be resumed, not retried, which matches `NewStockItem.jsx:2470-2473`. |
| R1 | FIXED | `sessionExpiredNotice.js:22-26`: `markSessionExpired` now only sets the flag. `consumeSessionExpired` (`:29-39`) decides the message when the flag is read, using `hasStoredDrafts()` (`:11-20`, which skips the flag key itself). It is called from `signIn/index.jsx:169-181`, after the full-page redirect. By then the failing save's draft has been written, so the main CP1 #5 case gets the with-drafts message. |

## Blocking issues
None.

## Non-blocking issues (for CP4, ordered by severity)
1. **S1 (new, low):** `src/api/axios.js:133` and `src/utils/sessionExpiredNotice.js:22`
   - **Problem:** the flag is set for every logout context, client portal included (`getLoginPathForContext` sends client users to `/Client/login`). Only the admin `signIn/index.jsx:170` reads and clears it.
   - **Effect:** after a client-portal 401, the flag stays set. The next time anyone opens `/auth/sign-in`, even much later after a normal logout, they get a stale "Session expired" toast.
   - **Fix:** call `markSessionExpired()` only when `context !== AUTH_CONTEXTS.CLIENT`, or consume the flag on the client login page too.
2. **S2 (low):** `src/utils/sessionExpiredNotice.js:11-20`
   - **Problem:** `hasStoredDrafts()` checks every user's draft list, because the user is unknown at that point. If older drafts exist, any 401, a GET included, shows "Your data was saved to Drafts" even when that request saved nothing.
   - **Fix:** accept this as a wording limit, or have `persistFailure` write a `"drafts"` value to the flag.
3. **L1 (carried over):** `src/views/admin/stock-list/NewStockItem.jsx:2470-2473`
   - **Problem:** after a partial update failure with no create rows, `requests` still holds every update line. Retry resends lines that already saved, which can overwrite edits made since.
   - **Fix:** narrow the lines in `call` with `narrowRequestsToFailedLines`, as `Stocks.jsx` does.
4. **Ledger retry scope (note):** after a partial failure on the Drafts page, `applyRetryFailure` keeps the request unchanged with all original ids. It does not narrow to the failed ids the way the screens do (`cost/index.jsx:589`). No data is lost, but already-updated ids are sent again with the same values.
5. **Known limits, unchanged:**
   - N2: whole-list last-writer-wins across tabs.
   - N3: dead `formData` / `resetForm` in `SoNumberTab.jsx:324,569,2440`.
   - N4: drafts saved only in memory after a storage-quota failure are dropped when another tab's `storage` event rehydrates the list.
   - Cross-tab Retry race, from N1.
6. **Pre-existing lint:** `npm run check` stays red on 187 lint errors that already exist at HEAD (`StockForm.jsx`, `Stocks.jsx`, `NewStockItem.jsx`). The feature adds none.
