# 007 Ledger table edit - final review (Verifier, read-only)

Scope: the uncommitted working tree on `staging` (`git diff` + untracked files). `git diff staging...HEAD` is empty
because nothing is committed. Covered: feature 007 (table edit, ids batch load, Invoice check-number warning),
Shipping docs document type and file-row UI tweaks, Cost DB Invoice File column, SOA paid exclusion.
Not covered: docs/specs/008*, 009*.

## Verdict: FAIL (gate only)

`npm run check` exits 1 in `lint:changed`. It reports 129 errors, all in `StockForm.jsx` (114) and `NewStockItem.jsx` (15).
I linted the `HEAD` version of both files and got the same counts (114 / 15), so these errors existed
before this diff. Both files are in the diff only for the file-row wrap tweak, so `lint:changed` picks them up.
I ran `test:ci` and `build` separately: 73 suites, 623 passed, 4 skipped, exit 0; build "Compiled successfully", exit 0.
Every other changed or new file lints clean.

The code has no blocking defects. If a human waives the pre-existing lint errors, or moves the StockForm/NewStockItem
tweak to its own change, the gate passes and this review becomes PASS with the findings below.

## Findings (by severity)

1. **Blocker (gate)** - `src/views/admin/stock-list/StockForm.jsx`, `src/views/admin/stock-list/NewStockItem.jsx` -
   `npm run check` fails on 129 lint errors that existed before this diff (import/first, rules-of-hooks).
   AC19 and the CLAUDE.md "must pass before any review" rule are not met. Fix: get a human waiver at CP4, or keep the
   two-line wrap tweak out of this change. Fixing the 129 errors would be an unrequested refactor.

2. **Medium** - `src/utils/ledgerColumns.js:25` (`COST_FILE_COLUMN` in `COST_COLUMNS`) plus
   `src/utils/ledgerDisplay.js:105` - `LedgerRecordViewModal` gets `costColumns` (`cost/index.jsx:1554`), and
   `ledgerViewValue` has no case for `type: "file"`. It falls through to `clean(row.invoice_file)`, which gives
   "[object Object]" when a cancelled cost has a file. The modal is the only view of cancelled rows. Fix: in
   `ledgerViewValue`, add `case "file": return readCostInvoiceFile(row)?.filename || ""` (or `clean(row[key]?.filename)`).
   Add a unit test.

3. **Medium** - `src/views/admin/ledger/invoice/InvoiceFormPage.jsx:321-372` together with `:455-470` - the new
   `invoiceNumberWarning` is not cleared when the route `id` changes (Prev/Next or table -> Open). The duplicate warning
   for record A stays visible on record B until the user types in Invoice Number. Also, a check still in flight when the
   user navigates can set the warning on the next record, because `invoiceNumberCheckGenRef` is not bumped on id change.
   Fix: in the load effect, after the early returns, call `setInvoiceNumberWarning("")` and
   `invoiceNumberCheckGenRef.current += 1`, as CostFormPage does in its new reset block (`CostFormPage.jsx:372-381`).

4. **Low** - `src/views/admin/ledger/cost/CostEditTablePage.jsx:160-169` and
   `src/views/admin/ledger/invoice/InvoiceEditTablePage.jsx:138-147` - the code falls back to per-row loading only when
   the batch call throws. Two cases give "Record not found" Load error rows instead (the user must press Retry per row):
   (a) the backend ignores `ids` (PROGRESS noted this earlier) and returns other records, or (b) the list endpoint hides
   cancelled records by default. In case (b), AC16 "Cancelled" rows would never appear. Fix: run `loadRow`
   (by `id=`) automatically for the ids missing from the batch result.

5. **Low** - `src/views/admin/ledger/cost/CostEditTablePage.jsx:239` - the spec edge case says a currency change clears
   `currency_code` and `usd_cost` until refetch. Only `currency_code` is cleared, so the read-only USD Cost cell shows a
   stale value after a currency edit until Save. Fix: add `usd_cost: ""` to the currency patch.

6. **Low (a11y)** - `src/components/ledger/LedgerCostFileCell.jsx:38-41, 48-60, 104-115` - Upload and Replace are a
   `<label>` wrapping `Button as="span"` / `IconButton as="span"`. Neither can receive focus, so keyboard users cannot
   upload or replace a file (Download and Remove do work). Fix: use a real `Button` that calls `inputRef.current.click()`.

7. **Low (a11y/UX)** - `src/views/admin/ledger/cost/CostEditTablePage.jsx:405` - while a row is saving, the file cell is
   disabled with `pointerEvents="none"` only. Its buttons still take keyboard focus and Enter. Fix: pass a
   `isDisabled` prop to `LedgerCostFileCell`.

8. **Low (dead code)** - `src/utils/ledgerEditRows.js:109-125` - `otherAgentKey`, `otherAgentCheckNeeded` and
   `markOtherAgentWarning` are exported and tested, but no screen imports them. AC13 is documented as not built because
   Invoice Number is read-only in the table. The same applies to `EDIT_ROW_STATUS.CHECK_INVOICE`. This is acceptable as
   groundwork, but either note it in the spec as intentionally unused or remove it.

9. **Low (hardcoded token)** - `src/components/ledger/LedgerCostFileCell.jsx:44` uses `color="gray.400"` and
   `src/views/admin/ledger/invoice/InvoiceFormPage.jsx:1004` uses `color="orange.500"` as fixed tokens with no
   `useColorModeValue`. The file already has a `muted` value. They match existing patterns (`LedgerBulkEditModal.jsx:179`,
   the `dash` in cost/index.jsx), so this is minor. Fix: use `muted`, or a mode-aware warning color.

10. **Nit (drive-by formatting)** - `src/views/admin/ledger/cost/CostFormPage.jsx:226` -
    `const pageBg =useColorModeValue(...)`: a space was removed on an untouched line. Fix: restore the original line.

11. **Nit (spec deviation, behaviour is stricter)** - `CostFormPage.jsx:774`, `InvoiceFormPage.jsx:727` - Prev/Next
    and the view toggle are also disabled when the form is in validation "blocked" state, not only when saving or
    pending (AC18). This is reasonable because it prevents losing unsaved invalid edits, but it differs from the spec
    text. Record it in the spec or tell the user.

## Checked and OK
- Endpoints: only existing ones plus `GET /api/ledger/{cost,invoice}?ids=` and `POST /api/ledger/invoice/check-number`.
  Both are documented in API_CONTRACT.md and the second is added to `config/api.js`. `formatIdsParam` filters to
  numeric ids. No other invented endpoints.
- `LedgerEntryTable` create mode: badges, disabled logic, Save label/title, Add Row/Clear, error alert and actions
  are unchanged when `mode` is not "edit". Create table views stay off (`isTableView = false`).
- AC1-3, 17: the "Edit selected" / "Set same value" split, the 50 limit with exact text, row click to the remembered
  view, and cancelled rows going to the view modal. AC4: preference stored via `persistedFilters` (`filters:` key).
  AC7/11/12: sequential per-row save, validate first, same-agent pre-check with `exclude_id` (proceeds on failure),
  diff payload with skip on `{id}` only, refetch then `applySavedRecord`. AC10: summary toast. AC14: `shouldPreviewAuto`
  wired for ROE/due in both tables. AC15: file cell actions are immediate, refresh only `invoice_file`, keep edits,
  download-only when cancelled. AC16: cancelled rows locked. AC18: `Prompt` + `beforeunload` + confirm on toggle/remove.
- New pure helpers (`ledgerEditNav`, `ledgerEditRows` incl. `pickRecordsByIds`, `mapWithConcurrency`, `formatIdsParam`,
  `formatInvoiceNumberDuplicateMessage`, edit columns, SOA paid exclusion) all have tests, and all pass.
- `soaReport.js`: paid exclusion is case-insensitive and tested. `documentTypes.js`: fallback list only (the server list
  is the source). `ShippingOrderAttachmentsField.jsx`: `Flex` import removed and no longer used.
- No Redux changes, no new dependencies, no draft modules (Q4 = no).

## Could not verify
- Browser behaviour (no login): real saves, uploads/replace/delete, Prompt/beforeunload, sticky Save bar, layout of the
  file-row wrap in StockForm/NewStockItem and ShippingOrderAttachmentsField.
- Whether `GET /api/ledger/cost|invoice` list rows have the same fields as `?id=` (the batch path builds rows from
  list records), and whether the list includes cancelled records by default (finding 4).
- Whether the backend document-types list contains `shipping_docs` and whether the backend accepts it on upload/update.
- The response shape of `check-number` comes from API_CONTRACT.md only; I did not call it live.
