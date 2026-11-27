# 009 CI/PL Manual tab

Status: DRAFT, waiting for CP1. Branch `staging`. Frontend only, no new endpoints.

## Goal
CI/PL page (`/admin/forms/ci-pl`) gets a 4th tab **Manual**: a CI/PL issued without an SI/SIC/DI number. The user
types Job No, picks a vessel, adds stock items (picker) and/or free-text lines, edits/removes lines, sees totals
(qty x unit price), prints the PDF, archives it, and finds it (and deletes it) in Archived CI PL.

## Current state (verified in code)
- Route `src/views/admin/forms/ci-pl/index.jsx` -> `CiPlDetail.jsx` (~4900 lines, component is
  `ShippingInstructionDetail`, shared with advise/delivery via `formType`; CI/PL = `isCiPlForm`).
- Tabs: `CI_PL_TAB_SLUGS = ["simple","per-unit","manifest"]` (`CiPlDetail.jsx:201`), state `ciPlTabIndex` kept in
  `?tab=` (`:414-427`); flags `isCiPlPerUnitTab` / `isCiPlManifestTab` (`:573-576`). Index 3 makes both false, so
  every "else" branch would treat Manual as Simple: each manual branch must be explicit.
- Per-tab APIs: `resolveFormApis()` (`:340-390`) -> `loadFormLatest`, `loadOptions`, `saveForm`, `createForm`,
  `archiveForm`. Archived view always uses the Simple APIs.
- Draft model: one "latest" working form per tab. `ensureFormId` (`:1556`) loads `{latest_only:true}`, creates with
  `createForm({})` if none. Autosave effects (500-600 ms): header candidate `buildHeaderSaveCandidate` (`:828`, diff via
  `pickChangedFields` against `buildHeaderSnapshotFromApi` `:901`), consign block (`cnee_text`), remarks, packed totals,
  and stock lines (`:1915-1954`, full `stock_list` from `buildCiplStockLinePayload` in `utils/ciPlStockLineEntries.js:386`,
  which sends `id` AND `stock_list_id` per line).
- Lines today only come from the SI/SIC/DI selection (backend fills `stock_list`). There is no stock picker anywhere
  in `src/components`; stock search exists as `getStockListApi` (`src/api/stock.js:187`, `POST /api/stock/list`;
  note `handleApiError` shows a modal on failure).
- Job No is display-only (`:3561-3567`); vessel is display-only (`formData.vessel` from `vessel_name`, title only).
- Archive: `handleArchiveCiPlDraft` (`:2183`) -> `archiveForm({id})`, then reloads latest. Reset (`:2228`) sends a
  big null payload plus a Simple-shaped `stock_list` (wrong for Manual).
- PDF only (preview/download/print, `buildShippingFormPdf` `:2417`); no Excel export exists for CI/PL.
  Summary box: "Invoice No" = SI/SIC/DI name, JOB NO, DATE (`:2732`).
- Archived: `CiPlArchivedList.jsx` calls `listCiplSimpleArchivedFormsApi` (no `form_type` -> Simple only) and
  `postCiplSimpleFormDeleteApi`; detail `archived/:id` loads `getCiplSimpleFormByIdApi` and shows a single "Simple" tab.
- `src/api/cipl.js`: `buildFormLoadPayload` (`:60`) whitelists keys, so `form_type` is DROPPED today on load/list.
  `postCreate`, `postUpdate`, archive and delete pass the payload through, so they already accept `form_type` / `stock_list`.
- Vessel options: master data cache `getMasterData(MASTER_KEYS.VESSELS)` (already imported in CiPlDetail; same source
  as `hooks/useEntitySelects.js:74` used by `components/forms/ShippingOrderForm.jsx:430`).

## Backend contract (confirmed by user, live locally)
- Create `POST /api/cipl/form/create` `{form_type:"manual"}`. Every form response has `form_type`, `cipl_number`, `vessel_id`.
- Load latest / list (`POST /api/cipl/form`): send `form_type:"manual"`; omitted = Simple only; `"all"` = both.
- Manual header: `job_no` and `vessel_id` set by the user via `POST /api/cipl/form/update`.
- Lines in `stock_list` on update and archive: `{stock_list_id}` adds a stock item; `{description, hs_code, quantity,
  unit_price, box, weight}` adds a free-text line; `{id, ...fields}` edits; `{id, delete:true}` removes.
  Free-text lines return `hs_code`, `quantity`, `unit_price`; line value = quantity x unit_price.
- Update, archive (`/api/cipl/form/archive`), delete (`/api/cipl/form/delete`) as for Simple.

## Design (smallest change)
- **API**: no new functions. `buildFormLoadPayload` passes `form_type` through (`"manual"` | `"all"`, other values
  dropped; `form_type` alone does not satisfy the "required" check). The Manual branch of `resolveFormApis` wraps the
  Simple functions: `loadFormLatest: p => postCiplSimpleFormApi({...p, form_type:"manual"})`,
  `createForm: p => postCiplSimpleFormCreateApi({...p, form_type:"manual"})`, `saveForm`/`archiveForm`/`loadOptions`
  = Simple ones.
- **CiPlDetail** (thin wiring only): slug `"manual"` (index 3), `isCiPlManualTab`, and
  `isCiPlManualForm = isCiPlManualTab || (isCiPlArchivedView && loadedFormType === "manual")`. When manual: hide
  SI/SIC/DI selects, render `CiPlManualHeaderFields` (Job No input, Vessel select) in the orange header box, render
  `CiPlManualLines` instead of the cargo table, skip the Simple stock-line autosave effect and
  `mergeStockLinesFromServer`, keep currency, date, Consign To, remarks, packed as, agent/consignee panel as today.
- **Lines are saved per action, not by the full-list autosave**: add stock items = one update with
  `[{stock_list_id}, ...]`; add free-text row = local until valid, then one update with the free-text object; edit =
  on blur/Enter of a cell, one update `[{id, <changed keys>}]`; remove = `[{id, delete:true}]` after confirm. After each
  response the lines are replaced from `form.stock_list` (server is the truth), except rows with unsaved local edits.
  Never send `stock_list_id` together with `id` (unlike `buildCiplStockLinePayload`).
- **Value / totals**: value = quantity x unit_price (2 dp, empty when either is empty/non-numeric). Totals row = sum of
  box, weight, quantity, value of the loaded rows; if the response has `total_value_in_usd` it wins for value (as Simple).

## UX
- Tab label "Manual", `?tab=manual`. Title "INVOICE / PACKING LIST (MANUAL)" + ` FOR <vessel>`.
- Header box: CI/PL No (read-only `cipl_number`), JOB NO (text input, autosave), VESSEL (searchable select, autosave
  `vessel_id`, clearable -> `null`), CURRENCY, DATE.
- Lines table columns: # / Stock Item ID (stock lines; "Manual" badge for free-text), DESCRIPTION, HS CODE, QTY,
  UNIT PRICE, BOX, WEIGHT, VALUE IN <currency> (read-only), actions (remove). Then TOTAL, PACKED AS, REMARKS rows.
- Toolbar above table: "Add stock items" (opens `CiPlManualStockPicker` modal) and "Add line" (free-text row).
- Picker modal: search box (debounced 300 ms) -> `getStockListApi({search, vessel_id?, page, page_size:50})`,
  "Only this vessel" switch (default on when a vessel is chosen), multi-select checkboxes, rows already on the form are
  disabled ("Added"), "Add n items" button. Loading, empty, error states.
- Row status: saving spinner per row; failed save keeps the local values, shows the server message under the row
  (`showFormSaveError` toast as elsewhere).

## Acceptance criteria
1. Manual tab appears as 4th tab; `?tab=manual` reopens it after refresh; Simple/Per unit/Manifest behave exactly as before.
2. Opening Manual loads `POST /api/cipl/form {latest_only:true, form_type:"manual"}`; the first header/line change
   with no draft creates one via `/api/cipl/form/create {form_type:"manual"}`; no request on this tab is sent without
   `form_type:"manual"` on load/create.
3. Manual header shows no SI/SIC/DI selects; Job No and Vessel are editable and autosave as `job_no` / `vessel_id`
   (only changed keys); reload shows the saved values; `cipl_number` is shown read-only.
4. "Add stock items": selecting k stock records sends one update with `stock_list: [{stock_list_id}, ...k]`; the
   returned lines appear; a record already on the form cannot be selected again.
5. "Add line": a free-text row is sent only when Description is not empty and Qty/Unit price are empty or numeric
   >= 0; payload `{description, hs_code, quantity, unit_price, box, weight}` (numbers as numbers, empty as null).
6. Editing a saved cell and leaving it sends `[{id, <changed key>}]` only; unchanged cells send nothing.
7. Remove asks for confirmation, sends `[{id, delete:true}]`; unsaved new rows are removed locally without a request.
8. Value column = qty x unit price per row; TOTAL row sums box, weight, qty and value; changes immediately on typing.
9. PDF on Manual: title "Invoice / Packing List", summary rows Invoice No = `cipl_number`, JOB NO, VESSEL, DATE;
   table columns DESCRIPTION, HS CODE, QTY, UNIT PRICE, BOX, WEIGHT, VALUE IN <currency>, then TOTAL, PACKED AS, REMARKS.
10. Archive on Manual archives the manual draft and loads the next manual draft (empty); Archive is disabled while a
    line save is in flight or a row has unsaved edits.
11. Reset on Manual clears header (incl. `job_no`, `vessel_id`) and sends `{id, delete:true}` for every saved line.
12. Archived CI PL list: Type filter (All / Simple / Manual) sends `form_type` `"all"` / omitted / `"manual"`; columns
    add TYPE and CI/PL NO; delete works for both types.
13. Opening an archived Manual form shows the Manual layout (tab label "Manual"), lines, totals and PDF as AC8-9.
14. Unit tests for all new utils and the `buildFormLoadPayload` change pass; touched files lint-clean;
    `npm run check` passes or fails only on the pre-existing errors listed in docs/PROGRESS.md (007).

## State and API changes
- `src/api/cipl.js`: `buildFormLoadPayload` accepts `form_type`. Nothing else.
- CiPlDetail local state: `formData.vesselId`, `formData.ciplNumber`, `loadedFormType`; manual lines live in
  `CiPlManualLines` state (initialised from the form response, replaced after each line save via a callback).
- Header candidate (manual only) adds `job_no`, `vessel_id`; snapshot reads them back. No Redux, no drafts (CI/PL is
  an autosave screen, category B, out of scope in 001-drafts).

## Files
Create:
- `src/utils/ciPlManual.js` + `ciPlManual.test.js` (pure helpers, see tasks).
- `src/api/cipl.test.js` (axios mocked like `src/api/ledgerShared.test.js`).
- `src/views/admin/forms/ci-pl/CiPlManualHeaderFields.jsx`, `CiPlManualLines.jsx`, `CiPlManualStockPicker.jsx`.
Modify:
- `src/api/cipl.js`, `src/views/admin/forms/ci-pl/CiPlDetail.jsx`, `src/views/admin/forms/ci-pl/CiPlArchivedList.jsx`.

## Edge cases
- No vessel chosen: picker searches all stock; PDF title without vessel.
- Same stock item added twice (double click, two tabs): button disabled while saving; server is the final gate.
- Free-text row with only spaces, negative or non-numeric qty/price: not sent, inline message.
- Qty or price empty: value "-" and counted as 0 in the total.
- Decimal input with comma ("1,5"): treated as invalid (same as other numeric inputs) - see Q8.
- Server returns a line without `id`: row read-only, no edit/remove.
- Tab switch while a line save is in flight: existing `loadedCiPlTabRef` guard; manual component unmounts (Tabs `isLazy`).
- Archived manual form whose vessel is not in the cached vessel list: show `vessel_name` from the response.
- Very long descriptions: textarea wraps, PDF linebreak (as Simple).
- Stock list API failure in the picker: `handleApiError` modal + empty state; modal stays open.

## Out of scope
- Excel export for CI/PL (does not exist today for any tab).
- Per-line item currency / ROE (disabled for Simple too, `isCiPlCurrencyTab = false`).
- Manual variants of Per unit / Manifest layouts; converting a Simple form to Manual.
- Listing archived Per-unit forms (not listed today either).
- Drafts-on-failure for CI/PL.

## Open questions (for the user / backend)
1. `getCiplSimpleFormByIdApi` (`POST /api/cipl/form {id}`): does it return manual forms without `form_type`, or must we
   send `form_type:"all"` with `id`?
2. Response shape of `vessel_id` (number, `{id,name}` or false) and is `vessel_name` also returned on manual forms?
3. Which Simple header fields apply to Manual: Consign To (`cnee_text`), agent / consignee (`agent_id`,
   `agent_cnee_id`; the code says the backend requires `agent_cnee_id` for Simple - also for Manual?), currency,
   date, remarks, packed as. Default: keep all as on Simple.
4. Is `cipl_number` the number to print as "Invoice No" on the Manual PDF? Who assigns it (on create or on archive)?
5. Stock-item lines: which fields are editable (description, hs_code, quantity, unit_price, box, weight)? Do they also
   return `hs_code`, `quantity`, `unit_price`? Default: same editable fields as free-text lines.
6. Does the response include a line value and/or form totals (`total_value_in_usd`, `total_box`, `total_weight`) for
   Manual? Default: compute in the frontend, prefer backend totals when present.
7. `stock_list_id` for the picker = the stock record `id` from `/api/stock/list` (not `stock_item_id`)? Any stock
   status restriction (e.g. only "in stock")?
8. Numbers: decimals allowed for quantity / box? Max decimals for unit price / weight?
9. Archived list default filter: All (shows manual too; today shows Simple only) or Simple?
10. Line saving per cell on blur (proposed) OK, or keep keystroke autosave like the other tabs?
11. Reset on Manual: delete all lines (proposed) or hide Reset on this tab?

## Tasks
Each task: `npm run lint:changed` on touched files; util tasks include tests. Do not touch the uncommitted 007/008 files.

- T1 `src/api/cipl.js`: `buildFormLoadPayload` passes `form_type` (`"manual"`/`"all"` only, not a "required" key alone).
  `src/api/cipl.test.js`: latest/list with and without `form_type`; create forwards `form_type`; update forwards `stock_list`.
- T2 `src/utils/ciPlManual.js` (+ test) parsing: `CIPL_FORM_TYPE` constants, `isManualCiplForm(form)`,
  `ciplFormTypeLabel(form)`, `parseCiplVessel(form)` -> `{id, name}`, `parseManualLinesFromApi(stockList)` -> rows
  `{key, id, stockListId, stockItemId, isStockLine, description, hsCode, quantity, unitPrice, box, weight}`.
- T3 Same file (+ test) math: `manualLineValue(row)`, `manualLinesTotals(rows)` (box, weight, quantity, value; bad
  numbers = 0), `formatManualValue`.
- T4 Same file (+ test) payloads: `validateManualLine(row)` (error text or null), `buildManualAddStockLines(ids,
  rows)` (dedupe, skip existing), `buildManualFreeTextLine(row)`, `buildManualLineEdit(row, baseline)` (`{id, ...changed}`
  or null, never `stock_list_id`), `buildManualLineDelete(row)`, `buildManualResetLines(rows)`.
- T5 Same file (+ test) header + PDF: `buildManualHeaderFields(data)` / `manualHeaderSnapshot(form)` (`job_no`,
  `vessel_id`), `buildManualPdfRows(rows, totals, labels)` -> head, body, total row.
- T6 `CiPlManualHeaderFields.jsx`: CI/PL No (read-only), Job No input, Vessel `SearchableSelect` (vessel master data);
  props `{ value, onChange, isLoading, isReadOnly }`; same orange header styling as the SI selects.
- T7 `CiPlManualStockPicker.jsx`: modal (search, vessel switch, checkboxes, Added state, loading/empty/error) calling
  `getStockListApi`; `onAdd(ids)`.
- T8 `CiPlManualLines.jsx`: table + Add stock items / Add line + edit-on-blur + remove + TOTAL row + `renderFooter`
  slot for PACKED AS / REMARKS; prop `onSaveLines(stockListPayload) -> form` (parent calls `saveForm`), `onFormSaved(form)`,
  `isBusy`, `currencyLabel`, `isReadOnly`; exposes `hasPendingChanges` via callback for AC10.
- T9 `CiPlDetail.jsx` tab wiring: slug `manual`, Tab, `isCiPlManualTab` / `isCiPlManualForm`, `resolveFormApis` manual
  branch, title, hide SI/SIC/DI, mount T6/T8, skip Simple stock-line autosave + merge when manual, header candidate and
  snapshot extended via T5, `syncFormTotalsFromApi` after line saves.
- T10 `CiPlDetail.jsx` Reset/Archive: manual reset payload (T4 `buildManualResetLines`, `job_no:""`, `vessel_id:null`);
  Archive disabled while T8 reports pending changes.
- T11 `CiPlDetail.jsx` PDF: manual branch using T5 (summary rows Invoice No = `cipl_number`, JOB NO, VESSEL, DATE).
- T12 Archived detail: set `loadedFormType` from the loaded form; manual layout and tab label "Manual" (depends on Q1).
- T13 `CiPlArchivedList.jsx`: Type filter (default per Q9) -> `listCiplSimpleArchivedFormsApi({..., form_type})`,
  TYPE and CI/PL NO columns.
- T14 `npm run check`; browser walk of AC1-13 (needs login); update API_CONTRACT/ARCHITECTURE via /update-docs.

## Backend answers (received before CP1; closes open questions Q1, Q2, Q3, Q5, Q6, Q7)
- Load by id: `POST /api/cipl/form` {id} and `GET /api/cipl/form?id=` return any form type, no `form_type` needed. `form_type` is needed only for list, latest, archived and manual create.
- `vessel_id` is an object `{id, name}` or `null`; the name is inside it; send only the id when saving.
- Header fields: same as Simple (agent, CNEE, company/address block, `cnee1`-`cnee12`, `cnee_text`, `warnings`, `remarks`, `date`, `currency_id`, `packed_as`) plus `job_no` (typed), `vessel_id`, `cipl_number` (read-only). NO ship-by field; SI/SIC/DI numbers not used. `agent_cnee_id` is NOT required; when chosen it fills company/address and CNEE lines, and anything sent in the same call overrides the fill.
- Stock-item line editable: `description` (or `entries`), `value_in_usd`, `box`, `weight`, `hs_code`, `quantity`, `unit_price` (line value recalculates as quantity x unit_price when either is sent). Fixed by the stock record: the stock item, `po_number`, `lwh`. `box`/`weight` start from the stock record and can be changed.
- Totals come from the backend, do NOT calculate: `total_box`, `total_weight`, `total_value_in_usd`, the same three in `totals`, and `packed_as` {boxes, kg}. Values are strings like "125.00"; zero comes back as `false`. On manual forms every update that sends `stock_list` resets `packed_as` and the packed totals to the line sums: if the user types different packed totals, send them in a SEPARATE call after the line save.
- `stock_list_id` is the `id` of the stock list record (narvi.stock.list); the response also returns `stock_item_id` (stock item code) for display.
