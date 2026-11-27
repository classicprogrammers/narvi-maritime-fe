# 007 Ledger table edit (Cost DB + Invoice DB)

Status: CP1 APPROVED (defaults). Plan at CP2. Branch `staging`. Frontend only, no new endpoints.

## Goal
In Master Ledger Cost DB and Invoice DB the user can edit existing records in **Table view** (one editable row per
record, saved per row) or **Form view** (today's autosave form), switching between them like Items
(`src/views/admin/stock-list/NewStockItem.jsx`, "Table view" / "Form view" buttons, lines ~2693-2714).
Saving uses only the existing `updateLedgerCost` / `updateLedgerInvoice` (`POST /api/ledger/cost/update`,
`POST /api/ledger/invoice/update`). Cost table rows also show the agent invoice file.

## Current state (verified in code)
- List row click: `history.push('/admin/ledger/{cost|invoice}/form/:id')` (`cost/index.jsx:523`, `invoice/index.jsx:535`).
  Cancelled rows open `LedgerRecordViewModal` instead and their checkbox is disabled.
- "Edit selected" opens `LedgerBulkEditModal` (same value for all, `bulk-update`, limit `BULK_MAX_IDS = 500`,
  drafts module `ledgerCostBulk` / `ledgerInvoiceBulk`, category D). `selectedIds` can span pages.
- Table view is **hard switched off**: `const isTableView = false` in `CostFormPage.jsx:213` and `InvoiceFormPage.jsx:466`.
  `CostEntryTableView.jsx` / `InvoiceTableView.jsx` (create only, "Save all" -> `create*`) are unreachable today.
- Form pages: autosave (700 ms) with diff payload `buildUpdatePayload(form, original, id)`
  (`cost/ledgerCostUtils.js:316`, `invoice/ledgerInvoiceUtils.js:321`), refetch by id after save, then
  `applyComputedFromRecord`. Cancelled record -> toast + back to list.
- Only single-record read exists: `GET /api/ledger/{cost|invoice}?id=` (`getLedgerCostById`, `getLedgerInvoiceById`).
  There is no "get many by ids" call.
- Cost duplicate checks: `checkLedgerCostInvoices` (same agent, blocking, `exclude_id`) and
  `findCostInvoicesUnderOtherAgents` (other agents, warning the user can accept). Invoice DB has **no** frontend
  duplicate check (server is the only gate).
- Cost file: `LedgerCostFileCell.jsx` (uncommitted) + `uploadLedgerCostInvoiceFile` / `deleteLedgerCostInvoiceFile` /
  `downloadLedgerCostInvoiceFile`, `readCostInvoiceFile`, `validateCostInvoiceFile`; list handlers in `cost/index.jsx:752-780`.
- `localStorage` is wiped on boot except `drafts:`, `chat:`, `filters:` keys (`utils/authStorage.js:118`).
  `utils/persistedFilters.js` stores per-user values under `filters:` and survives the wipe.

## UX
### Entering edit
- **List selection bar** (both DBs): "Edit selected" opens the edit screen for the selected ids in the user's
  remembered view. The existing modal moves to a second button "Set same value" (unchanged behaviour).
- **Row click** (non-cancelled): opens that one record in the remembered view (Form = today's form page,
  Table = one-row table).
- **Remember the choice**: per user, per DB, via `persistedFilters` (screen keys `ledgerCostEditView`,
  `ledgerInvoiceEditView`), values `"form" | "table"`, default `"form"` (today's behaviour). Written whenever the
  user clicks the toggle.
- **Toggle** "Table view | Form view" in the header of both the table edit screen and the form page (edit mode only;
  create mode keeps the form only). Same buttons/icons as Items (`MdTableChart`, `MdViewList`, solid/outline).

### Routes and URL
- Table view: new route `/admin/ledger/cost/edit?ids=1,2,3` and `/admin/ledger/invoice/edit?ids=...`
  (non-sidebar entries in `src/routes.js`, next to "Cost Form" / "Invoice Form").
- Form view: existing `/admin/ledger/{cost|invoice}/form/:id`, plus optional `?ids=1,2,3` when opened from a
  multi-selection. With `ids`, the form header shows "Record i of n" with Prev / Next (route `id` changes, `ids` kept).
- Switching view keeps the same ids: Table -> Form opens the first id (or the row's id when switched from a row
  action); Form -> Table opens `edit?ids=<ids or current id>`.

### Table edit screen
- Built on `LedgerEntryTable` with new edit-mode props. No "Add Row" / "Clear". Actions column: "Open" (form view
  of that record, keeps `ids`) and "Remove from table" (removes the row from this screen only, never deletes data).
- Toolbar: "Save changes (n)" where n = rows with unsaved edits; row count; "Back to list".
- Saved rows stay editable (unlike create). After a save the row's baseline is the refetched record.

## Acceptance criteria
1. With 1..50 non-cancelled rows selected in Cost DB, "Edit selected" opens the table edit screen (if remembered
   view = table) with exactly one row per selected id, in selection order, or the form view of the first id with
   "Record 1 of n" (if remembered view = form).
2. "Set same value" opens the existing `LedgerBulkEditModal` and behaves exactly as today.
3. Row click on a non-cancelled row opens the remembered view for that single record; cancelled rows still open the
   view modal.
4. Clicking the toggle stores the choice; after a page reload and re-login on the same browser the same view is used.
5. Each row loads via `getLedgerCostById` / `getLedgerInvoiceById` (max 5 requests in flight). While loading the table
   shows a spinner; a row that fails to load shows status "Load error" with its message and a Retry action, and is
   never saved.
6. Editable columns are exactly the editable fields listed below (SO Number and Invoice Number are read-only); read-only columns cannot be typed into.
7. "Save changes" sends one `update*` request per dirty row, sequentially, with only the changed keys plus `id`
   (output of the existing `buildUpdatePayload`). Rows whose payload is only `{id}` send nothing and show "No changes".
8. Per-row status badge: No changes, Edited, Saving, Saved, Missing required, Duplicate invoice, Check invoice
   (other-agent warning), Error, Cancelled, Load error. Error/Missing/Duplicate/Check rows show the message line
   (existing `LedgerEntryTable` alert row). Editing a row in Error/Missing/Duplicate returns it to Edited.
9. After a successful save the row is refetched by id; derived fields (USD cost/amount, client, vessel, SO status,
   currency code, balance, payment status) update; manual ROE/due typed by the user stay manual.
10. A summary toast after Save: "x saved, y need attention".
11. Required-field rules are the existing `validateCostForm` / `validateInvoiceForm`; a failing row is not sent.
12. Cost: if agent changed (invoice number is read-only here) vs the row baseline, `checkLedgerCostInvoices` runs with
    `exclude_id = row id`; duplicates block the row (status Duplicate). If the pre-check call fails, the row is sent
    (server is the gate), as in the form.
13. Cost: if invoice numbers changed, `findCostInvoicesUnderOtherAgents` runs (`exclude_id = row id`); hits put the
    row in "Check invoice" with the agent names, not sent. Pressing Save again with the same invoice numbers sends it
    (accepted); changing the numbers re-checks.
14. ROE / due cells: a stored automatic value is shown as is; the automatic preview runs only when the stored value
    is empty or its inputs changed vs baseline (Cost ROE: currency, invoice date; Cost due: agent, invoice date;
    Invoice ROE: currency, invoice date; Invoice due: client (from SO), invoice date). Typing makes it manual;
    clearing returns to automatic (`roeInputPatch`/`dueInputPatch`, `applyRoeInput`/`applyDueDateInput`).
15. Cost: Invoice File column shows `LedgerCostFileCell` per row; upload/replace/remove/download act immediately
    (not part of Save), refresh only that row's file, never touch unsaved edits; disabled while the row is saving;
    download-only for cancelled rows.
16. A record found cancelled on load shows status "Cancelled", all cells read-only, excluded from Save.
17. More than 50 selected: "Edit selected" is disabled with the text "Edit supports up to 50 records. Clear some
    rows." (bulk "Set same value" still allows 500). `edit?ids=` with more than 50 ids loads the first 50 and shows
    a warning.
18. Leaving the table screen (Back, sidebar, view toggle, browser close) with Edited rows asks for confirmation.
    Form view Prev/Next is disabled while the form is saving or has a pending autosave.
19. Unit tests for all new pure helpers pass; `npm run check` passes.

## Columns
Cost (`COST_TABLE_EDIT_COLUMNS`, new, in `utils/ledgerColumns.js`):
- Editable: Agent, Biz Category, Currency, Amount, ROE, GST In Amount, Internal Remarks, Invoice Date, Due, Paid, Invoice Link.
  SO Number and Invoice Number are READ-ONLY in the table (approved, first version; still editable in Form view).
- Read-only (`derived: true`): SO Number, Invoice Number, SO Status, Client Case / Invoice Ref, Client, Vessel, USD Cost, Invoice File (action cell).

Invoice (`INVOICE_TABLE_EDIT_COLUMNS`, new):
- Editable: Invoice Date, Currency, Amount, ROE, Due,
  Paid, Client Amount Paid, Bank Change USD, GST Output Tax, GST Out Amount, Invoice SOA, Customer Billing Remarks,
  Payment Remark, SO Remark, Internal Remarks.
- Read-only: SO Number, Invoice Number, SO Status, Client Case / Invoice Ref, Client, Vessel, USD Amount, Invoice Balance, Payment Status.
- Invoice attachments (multi-file) are not in the table (see Out of scope).

## State and API
- Row model (edit mode): `{ key, id, record, baseline, values, status, message, acceptedOtherAgentKey }`.
  `baseline = recordToForm(record)`, `values` starts as a copy; dirty = writable signature differs
  (`getWritableCostSignature` / `getWritableInvoiceSignature`).
- Save per row: validate -> (Cost) duplicate pre-check -> (Cost) other-agent check -> `buildUpdatePayload(values,
  baseline, id)` -> skip if only `{id}` -> `update*` -> refetch by id (fallback: `extract*Record(response)`) ->
  `baseline = applyComputedFromRecord(values, record)`, `values = same`, status Saved.
- No Redux changes. Local component state only. View preference via `persistedFilters`.
- Endpoints used (all existing): `GET /api/ledger/cost?id=`, `POST /api/ledger/cost/update`,
  `POST /api/ledger/cost/check-invoice`, `GET /api/ledger/cost` (search, other-agent lookup),
  `POST|DELETE|GET /api/ledger/cost/:id/invoice-file`, `GET /api/ledger/invoice?id=`, `POST /api/ledger/invoice/update`,
  ROE / due previews. Nothing new.
- Drafts: NOT in this version (Q4 = no). Originally proposed: a failed `update*` call (not validation / pre-check) is wrapped with `saveWithDraft`
  as new category D modules `ledgerCostTableEdit` / `ledgerInvoiceTableEdit` (`apis: { updateLedgerCost }` /
  `{ updateLedgerInvoice }`), `recordId = row id`, `formState: null`, `requests: [{ api, args: [payload] }]`.
  Retry + Delete only on the Drafts page, like the bulk modules. Success removes it.

## Edge cases
- Selected ids on other pages: loaded by id like any other.
- Record deleted / not found / no permission: "Load error" row.
- Record cancelled after selection: "Cancelled" row (AC16). Record cancelled between load and save: server error on
  the row.
- Same agent + invoice number typed in two rows: sequential saving lets the server / pre-check catch the second row.
- SO Number and Invoice Number are read-only in the table, so there is no SO change flow and no invoice-number duplicate re-check from typing (Cost duplicate checks still run if agent changes).
- Currency change clears `currency_code` (Cost) and `usd_cost` until refetch.
- Pre-check network failure: proceed (server gate), message "Could not check for duplicates" not shown as error.
- File upload on a row with unsaved edits: allowed, edits kept.
- 401 during save: draft written first (if Q4 = yes), then normal redirect.
- Duplicated ids / non-numeric ids in the URL: ignored (deduped, filtered).
- Empty `ids`: redirect to the list with an info toast.
- Narrow widths: table scrolls (existing `LedgerEntryTable` behaviour); long text truncated with title.

## Out of scope
- Re-enabling the create table view (`isTableView = false` stays for create).
- Invoice DB attachments in the table (form view keeps `LedgerInvoiceFilesField`).
- SO Ledger, bulk modal changes, new endpoints, autosave in the table.
- The Items layout key `narvi_stock_form_layout` is wiped on boot today (not `filters:`); not fixed here.

## Open questions (ANSWERED at CP1: 1 yes 50; 2 yes; 3 Form; 4 no drafts; 5 one Save changes; 6 yes Prev/Next; 7 acceptable; 8 read-only)
1. Row limit for table / form edit: 50 OK?
2. Labels: "Edit selected" (table/form) + "Set same value" (existing bulk modal) OK?
3. Default view before the user picks one: Form (today) or Table?
4. Drafts for failed table-edit saves (category D, Retry/Delete only): yes or no?
5. Table save: "Save changes" for all edited rows only, or also a Save button on each row?
6. Form view with several records: Prev / Next navigator OK, or form view only for one record?
7. Invoice DB: should the table check duplicate invoice numbers before saving? There is no check endpoint for
   invoices, so today only the server decides (see backend message).
8. Should SO Number and Invoice Number be editable in the table (they are in the form, blocked in bulk)?

## Backend message (draft, no frontend dependency)
> For the Master Ledger table edit we only use existing endpoints. Optional improvements, please confirm or decline:
> (a) `GET /api/ledger/cost` and `GET /api/ledger/invoice`: accept `ids=1,2,3` to return those records in one call
> (today we call `?id=` once per row, up to 50). (b) Is there or will there be a duplicate invoice number check for
> sales invoices (like `POST /api/ledger/cost/check-invoice`), or does `/api/ledger/invoice/update` reject duplicates
> itself, and with what message? (c) Reminder: please add `invoice_file` to the `columns` of `GET /api/ledger/cost`.
> Until (a)/(b) are confirmed the frontend keeps one request per row and relies on server errors.

## Tasks
Each task: lint the touched files (`npm run lint:changed`); utils tasks include tests. Do not overwrite the uncommitted
work in `ledgerColumns.js(.test.js)`, `cost/index.jsx`, `LedgerCostFileCell.jsx`.

- T1 `src/utils/ledgerEditNav.js` (+ test): `LEDGER_EDIT_MAX_ROWS = 50`, `parseEditIds(search)` (dedupe, numeric,
  cap, returns `{ ids, truncated }`), `buildLedgerEditPath({ base, view, ids, id })`, `readLedgerEditView(entity)` /
  `writeLedgerEditView(entity, view)` on top of `persistedFilters` (invalid -> `"form"`), `validateEditSelection(ids)`.
- T2 `src/utils/ledgerEditRows.js` (+ test), entity-agnostic via an adapter `{ recordToForm, buildUpdatePayload,
  getSignature, applyComputedFromRecord, validate, isCancelled }`: `recordToEditRow`, `isRowDirty`, `patchEditRow`
  (status back to Edited, clears message), `rowsToSave`, `buildRowUpdate` (returns `{ skip }` or `{ payload }`),
  `applySavedRecord`, `saveSummary`. Test with the real Cost and Invoice adapters.
- T3 Same file (+ test): `shouldPreviewAuto({ manual, value, inputsChanged })` and
  `otherAgentCheckNeeded(row)` / accepted-key logic for AC13.
- T4 `src/utils/mapWithConcurrency.js` (+ test): run async loaders with a cap (5), keep order, collect per-item errors.
- T5 `utils/ledgerColumns.js`: add `COST_TABLE_EDIT_COLUMNS`, `INVOICE_TABLE_EDIT_COLUMNS`; extend `ledgerColumns.test.js`
  (editable keys = entry columns, read-only marked `derived`).
- T6 `components/ledger/LedgerEntryTable.jsx`: optional props `mode="edit"`, `statusBadges` override,
  `pendingCount`, `saveLabel`, `renderActions(row)`, `isRowDisabled(row)`; create mode renders exactly as today.
- T7 `components/ledger/LedgerEditViewToggle.jsx`: Table/Form buttons copied from `NewStockItem.jsx`.
- T8 Cost ROE/due cells: export `RoeCell`/`DueCell` from `CostEntryTableView.jsx` with an optional `previewEnabled`
  prop (default = today's behaviour). Same for `InvoiceTableView.jsx`.
- T9 `views/admin/ledger/cost/CostEditTablePage.jsx`: load (T4), rows (T2), columns (T5), cells (T8 + SO/agent/currency
  pickers as in `CostEntryTableView`), file cell (handlers as `cost/index.jsx:752-780`, per-row refresh), save flow
  (AC7-13), leave guard (react-router `Prompt` + `beforeunload`), toggle (T7). Route `/ledger/cost/edit` in `routes.js`.
- T10 `cost/index.jsx`: "Edit selected" -> remembered view (T1), "Set same value" -> existing modal, limit text,
  row click -> remembered view.
- T11 `CostFormPage.jsx`: toggle in edit mode; `ids` navigator with Prev/Next disabled while saving/pending.
- T12 Invoice: `InvoiceEditTablePage.jsx` + route (as T9, no file column, no duplicate pre-check).
- T13 `invoice/index.jsx` and `InvoiceFormPage.jsx` (as T10, T11).
- T14 DROPPED (Q4 = no drafts) - `config/draftModules.js`: `ledgerCostTableEdit`, `ledgerInvoiceTableEdit` (category D);
  wrap the update call in T9/T12; extend `draftModules.test.js`.
- T15 `npm run check`; manual browser walk of AC1-18 (needs a login); update ARCHITECTURE/API_CONTRACT via /update-docs.
