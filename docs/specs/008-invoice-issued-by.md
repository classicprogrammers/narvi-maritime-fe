# 008 Invoice "Issued by" (Invoice DB)

Status: DRAFT, waiting at CP1. Branch `staging`. Frontend only. Uses only the backend contract below.

## Goal
Every sales invoice records who issued it. On New Invoice the user picks "Issued by" from a searchable list
(client decision: selected, not auto-filled). It is required on create, editable on existing invoices, shown as a
column in Invoice DB, filterable there, and editable in the Invoice edit table.

## Backend contract (confirmed by backend, live locally; nothing beyond this is used)
- `POST /api/ledger/invoice/issuers` body `{}` or `{ "q": "<text>" }` -> list of `{ id, name }`.
- `POST /api/ledger/invoice/create`: `issued_by_id` REQUIRED.
- `POST /api/ledger/invoice/update`: `issued_by_id` accepted; it cannot be cleared.
- Invoice rows (list and `?id=`) return `issued_by_id` and `issued_by` (name).
- `GET /api/ledger/invoice` returns a `columns` array that includes the new column.
- `GET /api/ledger/invoice?issued_by_id=<id>` filters the list.

## Current state (verified in code)
- Form: `src/views/admin/ledger/invoice/InvoiceFormPage.jsx`. Autosave 700 ms (`AUTOSAVE_DELAY_MS`, effect at ~line 612).
  On create (`!recordId`) a `validateInvoiceForm` error makes autosave wait silently (badge "idle"). On edit it shows the error
  once and blocks ("blocked" mode, navigation locked). Required fields use `<FormControl isRequired>` (SO Number ~876,
  Invoice Number ~990, Currency Amount ~1031).
- The Invoice form does NOT use `useSaveWithDraft`. Drafts exist only for bulk edit (`ledgerInvoiceBulk`,
  `src/config/draftModules.js:159`, `formState: null`). The 007 edit table has no drafts.
- Payload helpers: `src/views/admin/ledger/invoice/ledgerInvoiceUtils.js` (`emptyInvoiceForm`, `recordToForm`,
  `buildCreatePayload`, `buildUpdatePayload`, `validateInvoiceForm(form)`, `getWritableInvoiceFields`/`Signature`,
  `applyComputedFromRecord`). `validateInvoiceForm` is called by the form (create + edit) and by the edit table adapter
  (`InvoiceEditTablePage.jsx:69`, `:386`, called with `row.values` only).
- Server-search picker pattern: `src/hooks/useLedgerAgentOptions.js` (debounce 400 ms, request id guard, `pin`, `retry`)
  with `SearchableSelect serverSideSearch` in `src/views/admin/ledger/cost/CostFormPage.jsx:960-995`
  (incl. "Could not load agents. Retry" text). API pattern: `getLedgerAgentOptions` in `src/api/ledgerShared.js:53`.
- Invoice list `src/views/admin/ledger/invoice/index.jsx` uses `INVOICE_COLUMNS` directly (lines 648, 1097, 1152, 1340);
  it does NOT read server `columns`. Cost list does (`cost/index.jsx:227,307,960` + `mergeServerColumns`;
  `src/api/ledgerCost.js:86` returns `columns`). `getLedgerInvoices` (`src/api/ledgerInvoice.js`) drops `columns`.
- List filters persist in sessionStorage (`INVOICE_LIST_STORAGE_KEY`, `defaultInvoiceListState`); Client filter is a
  `SearchableSelect` (`index.jsx:911-923`); `advancedFilterCount`, `handleClearAdvancedFilters` and the
  selection-reset effect list every filter.
- Parity test `src/utils/ledgerColumns.test.js:66`: every `emptyInvoiceForm()` key must be covered by an `INVOICE_COLUMNS` column.

## Behaviour
### Form (create)
- New field "Issued By" (required, `isRequired`), `SearchableSelect serverSideSearch`, placed right after Invoice Number.
  Options from the issuers endpoint, label = `name`.
- Autosave create waits until SO Number, Invoice Number, Currency Amount AND Issued By are set (same silent "idle" as today).
  A muted hint under the field while empty: "Required before the invoice is saved."
- `buildCreatePayload` always sends `issued_by_id` (number).

### Form (edit) and OLD invoices without an issuer (safest behaviour, proposed)
- Record has an issuer: field shows it (pinned into the options so it shows even if a search does not return it).
  Changing it sends `issued_by_id` in the update. Clearing it is not allowed: validation error
  "Issued By cannot be cleared." (blocks the save like other required errors; picking a value fixes it).
- Record has NO issuer (old data): the form opens and autosaves other fields as before. `issued_by_id` is NOT sent
  and NOT required on update. The field shows empty with a warning-coloured note "No issuer recorded. Please select one."
  Picking one sends it once; from then on it cannot be cleared.
- Rule: `buildUpdatePayload` sends `issued_by_id` only when it changed AND is non-empty; it never sends `null`/`false`.
- If the backend nevertheless rejects updates of issuer-less records, the server error is shown as today (toast); see Q1.

### Invoice edit table (007 screen)
- New editable column "Issued By" (type `issuer`) after Invoice Number, a `SearchableSelect` cell fed by one shared
  issuer hook for the page (same as agents in `CostEditTablePage.jsx:125`); each loaded row's issuer is pinned.
- Same rules as form edit (old rows without issuer save fine; clearing a set issuer -> row status "Missing required"
  with "Issued By cannot be cleared.").

### Invoice DB list
- Column "Issued By" shows `issued_by` (fallback many2one name of `issued_by_id`), "—" when empty, not sortable
  (no sort key in the contract).
- List adopts server `columns` like Cost DB: `mergeServerColumns(serverColumns, INVOICE_COLUMNS)` for the header,
  rows, `tableMinW` and `LedgerRecordViewModal`. Without server columns the local list is used (Q3).
- Advanced filter "Issued By" (`SearchableSelect serverSideSearch`, placeholder "All issuers") sends `issued_by_id`;
  persisted with the other filters (id + name so the label survives a reload), counted in the filter badge, cleared by
  "Clear", resets page to 1 and clears the selection.

## Acceptance criteria
1. New Invoice: with SO, Invoice Number, Amount set but Issued By empty, no create request is sent and the badge stays idle;
   after picking an issuer the invoice is created and the request body contains `issued_by_id` (number).
2. The Issued By dropdown loads from `POST /api/ledger/invoice/issuers`; typing sends `{ q }` (debounced 400 ms);
   only the latest response is shown; on failure "Could not load issuers. Retry" is shown and Retry refetches.
3. Edit an invoice with an issuer: the name is shown on open even if not in the first options page; changing it sends
   an update containing `id` and `issued_by_id` only (plus any other changed keys).
4. Edit an invoice with an issuer and clear the field: no update is sent; error "Issued By cannot be cleared." is shown;
   the autosave badge is "blocked"; re-selecting resumes autosave.
5. Edit an OLD invoice with no issuer: changing any other field autosaves normally; the payload has no `issued_by_id`;
   the field shows the "No issuer recorded" note.
6. No update payload ever contains `issued_by_id` equal to `null`, `false` or `""` (unit test).
7. Opening an invoice and changing nothing sends no request (signature includes `issued_by_id`; no false dirty state for
   records where `issued_by_id` is `false`).
8. Invoice DB shows an "Issued By" column with the name or "—"; header order/labels follow the server `columns` when present.
9. Filter "Issued By" sends `issued_by_id=<id>`; the list shows only those invoices; the value survives a page reload
   in the same tab; "Clear" removes it; the advanced filter count includes it.
10. Edit table: Issued By cell edits and saves through `/update`; old rows without issuer save other edits; clearing a
    set issuer gives "Missing required" and the row is not sent.
11. Bulk "Set same value", SOA, Shipping Order ledger invoices panel and the create table view behave exactly as before.
12. Unit tests for the changed helpers pass; `npm run check` passes (modulo the pre-existing failures noted in PROGRESS 007).

## Files
Create:
- `src/hooks/useLedgerIssuerOptions.js` (copy of `useLedgerAgentOptions` calling the issuers API; no `limit`).

Modify:
- `src/config/api.js`: `LEDGER_INVOICE_ISSUERS: "/api/ledger/invoice/issuers"`.
- `src/api/ledgerInvoice.js` (+ `ledgerInvoice.test.js`): `getLedgerInvoiceIssuers({ q })` (send `q` only when non-empty,
  tolerant list extraction like `getLedgerAgentOptions`, normalise to `{ id, name }`); add `issued_by_id` to
  `optionalKeys`; return `columns` from the list like `ledgerCost.js:86`.
- `src/views/admin/ledger/invoice/ledgerInvoiceUtils.js` (+ test): see State.
- `src/utils/ledgerColumns.js` (+ test): `INVOICE_COLUMNS` add `{ key: "issued_by", label: "Issued By", type: "text",
  minW: "150px", covers: ["issued_by_id"] }` after Invoice Number; `INVOICE_TABLE_EDIT_COLUMNS` add an editable
  `{ key: "issued_by_id", label: "Issued By", type: "issuer", minW: "200px" }` after Invoice Number via the `extrasAfter`
  map (so `INVOICE_TABLE_ENTRY_COLUMNS` and the unreachable create table stay unchanged); update the editable-keys test.
- `src/views/admin/ledger/invoice/InvoiceFormPage.jsx`, `InvoiceEditTablePage.jsx`, `index.jsx`.
- `docs/API_CONTRACT.md`: new "Ledger invoice: Issued by" section (via the developer task / `/update-docs`).

## State and API
- `emptyInvoiceForm`: `issued_by_id: ""`, `issued_by: ""`.
- `recordToForm`: `issued_by_id = getMany2oneId(record.issued_by_id) ?? ""` (handles number, `false`, `[id, name]`),
  `issued_by = record.issued_by || getMany2oneName(record.issued_by_id) || ""` (`false` -> "").
- `getWritableInvoiceFields`: add `issued_by_id: toIdOrNull(form.issued_by_id) ?? ""`.
- `buildCreatePayload`: `issued_by_id: toIdOrNull(form.issued_by_id)`.
- `buildUpdatePayload`: `if (!sameId(...) && toIdOrNull(form.issued_by_id) != null) payload.issued_by_id = ...`.
- `validateInvoiceForm(form, original = null)`: existing checks first; then
  create (`original == null`): empty issuer -> "Issued By is required.";
  update: `original.issued_by_id` set and form empty -> "Issued By cannot be cleared."; otherwise ok.
  Callers: form create passes `null`, form edit passes `originalFormRef.current`; edit table calls
  `validate(row.values, row.baseline)` (wrap in the page adapter; `ledgerEditRows.js` unchanged).
- `applyComputedFromRecord`: refresh `issued_by` (name) from the record; keep the form's `issued_by_id`.
- No Redux. Issuer options are component state via the new hook. List filter state: `issuedById`, `issuedByName` in
  the sessionStorage list state (`defaultInvoiceListState`).
- Drafts: none involved. The form never used `useSaveWithDraft`; bulk drafts (`ledgerInvoiceBulk`) never carry
  `issued_by_id`. Existing bulk drafts on the Drafts page retry unchanged. No `draftModules.js` change.

## Edge cases
- `issued_by_id` returned as `false`, number or `[id, name]`: all normalised (unit tests).
- Issuer of a record not in the current search results: pinned from `{ id: issued_by_id, name: issued_by }`.
- Issuer list empty or endpoint down: create cannot complete (required); message + Retry; edit of other fields unaffected.
- Issuer deactivated/removed later: still shown by name from the record; backend decides on save (error toast).
- Create in flight while the user changes the issuer: existing `createInFlightRef` + signature logic sends the change as an update afterwards.
- Autosave on create with a server error for `issued_by_id` (e.g. invalid id): shown via the existing toast path.
- Persisted filter id no longer valid: list returns empty; user clears the filter.
- Long names: truncated with tooltip (`TruncatedText`, 150px).
- Edit table: searching in one cell refreshes the shared options; pinned values keep other rows' labels.

## Out of scope
- Re-enabling the create table view (`InvoiceTableView.jsx`, `isTableView = false`). Note: with the new validation its
  "Save all" would require an issuer; it stays unreachable, no change.
- Bulk "Set same value" for Issued By, SOA, exports, Shipping Order ledger invoices panel, dashboards.
- Sorting by Issued By (not in the contract).
- Auto-filling the issuer from the logged-in user (client chose a list).

## Open questions (for the user / backend)
1. Old invoices without issuer: does `/update` accept a payload WITHOUT `issued_by_id` for a record whose issuer is empty
   (as the proposed behaviour assumes)? If not, the form must force picking an issuer before any other change saves.
2. Issuers response envelope: exact shape (`result.data`, `result.issuers`, plain array?) and whether `{}` returns all
   issuers or a capped list. The frontend will read any of these, but please confirm.
3. Invoice DB: OK that the server `columns` order and labels now drive the whole Invoice DB table (as in Cost DB)? Exact
   `key` of the new column (assumed `issued_by`).
4. Should Issued By be added to bulk "Set same value" later (needs backend confirmation for `bulk-update`)?
5. Placement: right after Invoice Number in the form, list and edit table OK?

## Tasks
Each task: lint touched files; util/api tasks include tests. Do not overwrite the uncommitted 007 work in these files.
- T1 `config/api.js` + `api/ledgerInvoice.js` (+ test): `LEDGER_INVOICE_ISSUERS`, `getLedgerInvoiceIssuers({ q })`
  (body `{}` vs `{ q }`, envelope variants, error unwrap), `issued_by_id` filter param, `columns` returned from the list.
- T2 `ledgerInvoiceUtils.js` (+ test): `emptyInvoiceForm`, `recordToForm` (number/false/pair), signature, `applyComputedFromRecord`.
- T3 Same (+ test): `buildCreatePayload` includes `issued_by_id`; `buildUpdatePayload` sends it only when changed and
  non-empty (AC6, AC7).
- T4 Same (+ test): `validateInvoiceForm(form, original)` create-required / update-cannot-clear / old-record-ok.
- T5 `utils/ledgerColumns.js` (+ test): list column with `covers`, edit-table extra column, updated tests (parity passes).
- T6 `hooks/useLedgerIssuerOptions.js` (copy of the agent hook).
- T7 `InvoiceFormPage.jsx`: field, pinning on hydrate, hints/notes, validation calls with `original` (both call sites ~618, ~712).
- T8 `InvoiceEditTablePage.jsx`: `issuer` cell, shared hook + pinning, adapter `validate(values, baseline)`.
- T9 `invoice/index.jsx`: server columns via `mergeServerColumns`, Issued By cell, filter (state, persistence, count,
  clear, selection reset, page reset), view modal columns.
- T10 `docs/API_CONTRACT.md` section; `npm run check`; browser walk of AC1-11 (needs login; creates write to the backend).

## Backend answers (received before CP1)
- `POST /api/ledger/invoice/update` saves an old invoice with NO `issued_by_id` in the payload (required only on create). Leave the key out completely: `null` or `""` returns "issued_by_id cannot be cleared; choose another person." Send it only when the user picked someone, with an id from `/api/ledger/invoice/issuers`. This matches the proposed behaviour in this spec (open question 1 closed).
- Issuers endpoint verified live: `POST /api/ledger/invoice/issuers` returns `{ result: { status, issuers: [{id, name}] } }`; empty request returns all (10 on staging), `{q}` filters by name. List `columns` key is `issued_by`; rows carry `issued_by_id` and `issued_by` (false/null for old invoices).
