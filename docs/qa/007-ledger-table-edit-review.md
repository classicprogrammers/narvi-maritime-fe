# 007 Ledger table edit - Verifier review

Verdict: **PASS (feature scope)**. Caveat: `npm run check` exits 1 because of lint errors in unrelated uncommitted Stock files (see F1). Nothing blocking was found in the feature code.

## Gate results
- `npm run check` exits 1 at `lint:changed`. The 129 errors are all in `src/views/admin/stock-list/NewStockItem.jsx` and `StockForm.jsx` (`import/first`, `react-hooks/rules-of-hooks`). Those files are outside 007.
- ESLint on the feature files (new utils and tests, `components/ledger`, `ledger/cost`, `ledger/invoice`, `routes.js`) reports 0 errors. Its 3 warnings are all pre-existing and outside the diff.
- `npm run test:ci`: 73/73 suites, 616 tests passed (4 skipped).
- `npm run build`: compiled successfully.

## Acceptance criteria
- AC1-12 and AC14-18: met in code. Some notes:
  - Selection order is kept because `selectedIds` is append-ordered.
  - Rows come from `getLedgerCostById` / `getLedgerInvoiceById` through `mapWithConcurrency(…, 5)`.
  - The update payload is `buildUpdatePayload` diff-only, and a payload of only `{id}` is skipped.
  - Validation and the Cost duplicate pre-check run before any request is sent.
  - `LOCKED_STATUSES` excludes cancelled and load-error rows from save and from edits.
  - The leave guard uses `Prompt` plus `beforeunload`, and the view toggle asks to confirm.
  - Rows are capped at 50. Edit-selected is disabled with the spec text.
  - Every cell is disabled during a save run, so the sequential save cannot overwrite later edits with an old snapshot.
  - File cell refreshes use a functional update that touches only `record.invoice_file`.
  - Both form pages reload when the route `:id` changes (load effect deps `[id]`; Cost line 413, Invoice line 373).
- AC13: not built, on purpose (Invoice Number is read-only in the table). `otherAgentCheckNeeded` / `markOtherAgentWarning` exist and are tested but are not used yet.
- AC19: the unit tests pass. `npm run check` fails for out-of-scope reasons (F1).
- No invented endpoints. Only existing `api/ledgerCost` / `api/ledgerInvoice` functions are used.
- Create mode of `LedgerEntryTable` behaves as before: the same disable rule, badges and "Save all (n)" label. The new props are inert when `mode` is `"create"`.
- Hooks rules are respected in the new pages: the early `return null` comes after all hooks.
- No hardcoded hex or rgb colors in the new files. Only Chakra tokens are used.

## Findings (most severe first)
1. **Blocker for CP4 gate, outside scope.** `src/views/admin/stock-list/NewStockItem.jsx:116-149,2851` and `StockForm.jsx` have lint errors, so `npm run check` fails. Fix or stash that unrelated work before the CP4 gate.
2. **Medium.** `src/views/admin/ledger/cost/CostFormPage.jsx:184-195,355-413`: per-record check state is not reset when Prev/Next changes `:id`. This covers `duplicateKey`, `otherAgentPendingKey`, `otherAgentCheckedKeyRef`, `checkedOkKeyRef`, `precheckFailed` and `lastValidationErrorRef`. Effects:
   - An other-agent warning accepted on record A silently suppresses the same warning on record B for the same invoice numbers.
   - The `precheckFailed` notice (line 930) carries over to the next record.
   - `editingRecord` (the header "SO n") shows record A while record B loads.
   - Fix: reset these values at the top of the `[id]` load effect when the id differs from `recordIdRef`.
3. **Low-Medium.** `CostFormPage.jsx:762`, `InvoiceFormPage.jsx:702`: `isNavLocked` covers only saving and pending. When `saveMode === "blocked"` (missing required field, duplicate, or other-agent pending), Prev/Next and "Table view" stay enabled and silently discard the unsaved invalid edits. This meets the letter of AC18 but loses data. Fix: also lock (or confirm) when blocked and dirty.
4. **Low.** `CostFormPage.jsx:764-767`, `InvoiceFormPage.jsx:704-707`: clicking "Form view" on the form page does not store `"form"` (only `"table"` is written). It also pushes the same URL again, which adds a duplicate history entry. This is a partial miss of AC4 ("clicking the toggle stores the choice"). Fix: write `"form"` and skip navigation when the view is already form.
5. **Low.** `src/views/admin/ledger/invoice/InvoiceTableView.jsx:35,69`: the ROE/Due preview is gated on `!isDisabled`. In edit mode every cell is disabled while saving, so non-manual ROE/Due cells drop the preview and briefly show the stored value (often empty) during Save. Fix: pass `isDisabled` but leave the gate to `previewEnabled` in edit mode, or gate on it only when `previewEnabled` is not given.
6. **Low.** `src/views/admin/ledger/cost/CostEditTablePage.jsx:567` (same in Invoice): the Table -> Form toggle opens `rowIds[0]` even when that row is Load error or Cancelled. The form page then toasts and redirects to the list, and the ids context is lost. Fix: target the first row that is neither Load error nor Cancelled.
7. **Low.** `CostEditTablePage.jsx:387`: during a row save the file cell is blocked only with `pointerEvents="none"`, so its buttons can still be reached by keyboard. AC15 says "disabled while saving". Fix: pass a disabled flag into `LedgerCostFileCell`, or `canEdit={false}` while saving.
8. **Low.** `CostEditTablePage.jsx:506-508`: when the duplicate pre-check call fails, the row is sent with no feedback at all. The spec's edge-case note implies a non-error "Could not check for duplicates" message.
9. **Low.** `src/utils/ledgerEditNav.js:23`: `/^\d+$/` accepts `0` (and `00`), which yields a Load error row. Fix: use `/^[1-9]\d*$/`.
10. **Nit.** `CostFormPage.jsx:226`: `const pageBg =useColorModeValue(` is missing a space (unrelated whitespace churn).

## Not verified
- No browser walk of AC1-18 (it needs a login and a backend). Not checked in a browser:
  - the real `Prompt` / `beforeunload` behavior
  - the sticky Save bar layout
  - persistence across re-login
  - server responses for update and duplicates
- Whether `GET /api/ledger/cost?id=` returns `invoice_file`. The code falls back to the previous value when it is missing.
- React 18 StrictMode double-mount of the load effect. It looks safe because of the `cancelled` flag, but this was not run.
