# 008 Invoice "Issued by" - Verifier review

Reviewer: verifier (read-only). Scope: 008 changes in the working tree on `staging` (uncommitted, mixed with 007 work).
Spec: docs/specs/008-invoice-issued-by.md (incl. "Backend answers").

## Verdict: PASS

No blocking defects found. The core safety rules hold: `issued_by_id` is never sent as `null`/`false`/`""`, it is
required on create only, old issuer-less invoices save other fields, clearing a set issuer is blocked, and create
autosave waits silently ("idle") until an issuer is picked. Findings below are minor and can be fixed in a follow-up.

## Checks run
- Unit tests (`react-scripts test --watchAll=false`): 75 suites passed, 664 tests passed, 4 skipped.
- ESLint on all 008 files: 0 errors, 2 warnings, both already present before 008 (`ledgerInvoice.js` anonymous default export, `invoice/index.jsx:247` unused `mutedColor`).
- `npm run build`: succeeds.
- `npm run check` fails only on the 129 lint errors in StockForm.jsx / NewStockItem.jsx that came before 008, as reported by the caller (not re-checked as part of 008).

## Acceptance criteria
| AC | Result | Evidence |
|---|---|---|
| 1 Create waits for issuer, sends numeric id | Met | `ledgerInvoiceUtils.js:402-404` (required on create), `InvoiceFormPage.jsx:643-646` silent return, `saveMode` "idle" at `:739`; `buildCreatePayload` `:307` (`toIdOrNull` -> number), test "create always sends a numeric issued_by_id" |
| 2 Issuers endpoint, `{q}`, 400 ms debounce, latest only, Retry | Met in form and list; partial in edit table (F2) | `useLedgerIssuerOptions.js` (request-id guard, 400 ms), `ledgerInvoice.js:183-190`, form Retry `InvoiceFormPage.jsx:1055-1062` |
| 3 Existing issuer shown/pinned; change sends only changed keys | Met | `hydrateForm` pin `InvoiceFormPage.jsx:306-308`, `fallbackDisplay`, `buildUpdatePayload` `:341-345`, test "update sends issued_by_id only when changed and set" |
| 4 Clearing blocked, badge "blocked", error shown | Met | `ledgerInvoiceUtils.js:405-406`, autosave `:648-654` toast + return, inline error `InvoiceFormPage.jsx:1046-1049` |
| 5 Old invoice: other fields save, no `issued_by_id`, note | Met (note wording/colour differs, F4) | validation returns null when original has no issuer; test "update never sends ... null, false or empty" |
| 6 Never null/false/"" in update (unit test) | Met | `ledgerInvoiceUtils.js:341-345`; tests cover `""`, `null`, `false`, `undefined` |
| 7 No false dirty for `false` issuer | Met | `recordToForm` -> `""`, signature `issued_by_id: toIdOrNull(...) ?? ""`; signature test |
| 8 List column + server columns | Met | `ledgerColumns.js:61`, `index.jsx:673` `mergeServerColumns`, used for header, rows, `tableMinW`, view modal (`:1399`); empty -> "—" via `TruncatedText` / `ledgerViewValue` |
| 9 Filter: param, persisted id+name, count, Clear, page/selection reset | Met | `index.jsx` state/persist/`advancedFilterCount`/`handleClearAdvancedFilters`/selection-reset effect/`setPage(1)`; reload pin effect `:457-461`; api test "sends issued_by_id only when set" |
| 10 Edit table issuer cell, cannot-clear -> Missing required | Met (label caveat F1) | `INVOICE_TABLE_EDIT_COLUMNS` extrasAfter, `InvoiceEditTablePage.jsx:260-274`, `handleSave` `validate(row.values, row.baseline)` `:413` |
| 11 Bulk, SOA, SO panel, create table unchanged | Met by code inspection | `INVOICE_TABLE_ENTRY_COLUMNS` unchanged; no 008 edits to bulk/SOA/SO panel; `InvoiceTableView.jsx` still calls `validateInvoiceForm(row.values)` (now requires issuer; screen is unreachable, as the spec says) |
| 12 Tests / check | Met apart from the lint errors that came before 008 | see "Checks run" |

## Findings (ordered by severity)

1. **Low-Medium** - `src/views/admin/ledger/invoice/InvoiceEditTablePage.jsx:263` - The issuer cell's `onChange` stores only
   `issued_by_id`. It does not update `values.issued_by` and does not pin the picked option. The cell's `fallbackDisplay`
   (`:270`) then still holds the previous issuer's name. The issuer options are shared by every row, so when another row's
   cell searches and the newly picked issuer drops out of the options, this row shows the OLD issuer's name for the new id
   until the search resets or the row is saved. - Fix: copy the Cost table agent cell (`CostEditTablePage.jsx:330-331`):
   look up the picked option, call `issuers.pin(picked)`, and patch `{ issued_by_id: v || "", issued_by: picked?.name || "" }`.

2. **Low** - `src/views/admin/ledger/invoice/InvoiceEditTablePage.jsx:271` - `error={issuers.error ? "Could not load issuers. Retry" : undefined}`:
   `SearchableSelect` uses `error` only to make the border red and set `aria-invalid` (`SearchableSelect.jsx:529,552`). The text never
   appears, and the table has no Retry action, so AC2's message and Retry are missing in the edit table. The red border also looks
   like a validation error on every issuer cell. - Fix: show one "Could not load issuers. Retry" line (with a button calling `issuers.retry`) above the table, or in
   the column header, and drop the `error` prop.

3. **Low** - `src/views/admin/ledger/invoice/ledgerInvoiceUtils.js:456-457` - `applyComputedFromRecord` keeps the form's `issued_by_id` but
   always takes `issued_by` (the name) from the record. Suppose the user changes the issuer while an autosave is in flight. The form then holds
   id = new issuer and name = old issuer. `fallbackDisplay={form.issued_by}` (`InvoiceFormPage.jsx:1043`) shows the wrong name whenever the
   new issuer is not in the current options. It corrects itself on the next save. The unit test at `ledgerInvoiceUtils.test.js` ("keeps the form issuer id and refreshes the name")
   asserts this mismatch (id "9", name "Ann" of id 3). - Fix: refresh the name only when
   `sameId(form.issued_by_id, record issuer id)`, otherwise keep `form.issued_by`. Update the test.

4. **Low** - `src/views/admin/ledger/invoice/InvoiceFormPage.jsx:1050-1052` - For an old invoice with no issuer, the note reads "No issuer recorded" in
   `mutedColor`. The spec asks for a warning-coloured note "No issuer recorded. Please select one." AC5 is still met on its wording. - Fix: use the spec
   text with a warning token, e.g. `useColorModeValue("orange.600", "orange.300")`.

5. **Low** - `src/views/admin/ledger/invoice/index.jsx:968-971` - The filter error line shows the raw `issuers.error` (for example "Network Error" or
   "Failed to load invoice issuers"). The form uses the fixed text "Could not load issuers." - Fix: show "Could not load issuers." so the wording matches the form and AC2.

6. **Low** - `src/views/admin/ledger/invoice/index.jsx:717` - The list cell renders only `row.issued_by`. The spec says to fall back to the
   many2one name of `issued_by_id`. The backend confirmed `issued_by` is always present, so there is no visible impact today. - Fix:
   `row.issued_by || getMany2oneName(row.issued_by_id)` (`getMany2oneName` is already imported in this file).

7. **Low (docs)** - `docs/API_CONTRACT.md:52` - The "Invoice Issued By (feature 008)" section sits under "## Open questions about the backend", but its
   content is confirmed contract. - Fix: move it next to the other ledger sections (after "Ledger lists: ids filter ...").

8. **Info** - `src/api/ledgerInvoice.js:186` - Uses the literal path rather than `LEDGER_INVOICE_ISSUERS`. This matches every other function
   in this file, so it is not a defect. The issuer list is returned as is, without mapping each item to `{ id, name }` as the spec asks.
   The backend shape is confirmed as `{id, name}`, so this has no impact.

## Items checked with no issue
- No invented endpoints. Only `/api/ledger/invoice/issuers`, plus the `issued_by_id` list param and `columns` described in the spec and in the Backend answers.
- Hook: request-id guard drops stale responses, debounce timer cleared on change and unmount, `pin` and `retry` are stable callbacks. Hooks rules are followed in all three screens (no conditional hooks). Pin effects depend on stable values (`savedState` is a `useRef(...).current`, `pin` is a `useCallback`).
- The filter persists `issuedById` and `issuedByName` and pins them on reload, so the label survives a reload.
- `mergeServerColumns` keeps local `sortKey`/`type`/`minW`, so Issued By is not sortable. The sticky SO column is keyed on `column.key === "so_number"`, the same as Cost DB.
- No hardcoded hex colours. `red.500` / `orange.500` follow the existing pattern (`CostFormPage.jsx:989`).
- Tests cover the new pure helpers: recordToForm (number/false/pair/missing), create/update payloads, never-null rule, signature, validate (create/old/clear/order), applyComputedFromRecord, the issuers API (body, envelopes, error), the filter param and `columns`, and column order/editable keys.

## Could not verify
- Browser walk of AC1-11 against the live backend (requires login; creates write data), including the badge states, the 400 ms debounce, and the toasts.
- Server `columns` content and order: if the server omits `so_number` or does not send it first, the sticky SO column (left offset = select column) would sit in the wrong place. Cost DB already behaves the same way.
- That `/update` really accepts issuer-less old invoices (relied on the Backend answers section).
- Screen-reader behaviour of `FormControl isRequired` with `SearchableSelect` (whether `aria-required` reaches the input).
