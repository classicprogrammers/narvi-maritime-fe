# Progress

The handoff file. The orchestrator rewrites it after every phase. After `/clear` or a crash, run `/resume`.

## Current feature
004-ledger-dashboards: Master Ledger dashboards (frontend only + a backend request message). Financial year starts 01 March (FY 2024/25 = 01 Mar 2024 to end Feb 2025). Dashboards: (1) CASH outstanding to Agents + Clients; (2) CLIENT STAT turnover/profit/margin per client; (3) DESTINATIONS (agents who sent an invoice); (4) TURNOVER GRAPH sum of Actual Sale / Cost / Profit; (5) TO SINGAPORE and TO GREECE per month per FY (2024/25, 2025/26, 2026/27), sum of Actual Sales (Singapore = Martin, Alexandra, Bali; Greece = Igor, Tasos, Amanta); (6) client turnover with vessel breakdown. All except 1 and 5 filterable by year or selected period. More dashboards to come.

## Phase
Implemented T1-T12; verifier PASS (docs/qa/004-ledger-dashboards-review.md), findings 1-5,8,11 fixed; npm run check exit 0. WAITING AT CP4. T13 done (backend answers applied); T14 docs after CP4.

## Branch
`staging` (no feature branch: CLAUDE.md hard rule + user preference; user confirmed). No commits unless user asks.

## Decisions (from user)
- One new "Dashboards" page under Master Ledger, tab per dashboard.
- Actual Sale = sales invoice USD amount, Actual Cost = cost ledger USD cost, Profit = Sale - Cost, Margin = Profit / Sale. Backend computes.
- Singapore/Greece grouping rule: backend decides; frontend only shows the two series. Ask backend which field (agent vs issuer).
- Chart lib: apexcharts + react-apexcharts already installed (no new deps).
- No dashboard endpoints exist in src/config/api.js: frontend must not invent them. Deliverable includes a backend request message; frontend uses the proposed contract only after user approves it (CP1/CP2).

## Tasks
T1-T12 done (T6,T8-T12 browser-unverified, no backend). T13 done (undated note, available_fy, destinations sale/profit/margin, 400 message). T14 check passed; /update-docs pending.

## QA / review
(none yet)

## Blockers / open questions
- Backend contract for dashboard endpoints does not exist yet.

## Next action
Architect writes docs/specs/004-ledger-dashboards.md incl. proposed backend contract. Stop at CP1.

## Active feature 005 (runs in parallel with 004 above; 004 notes untouched)
005-tariff-last-updated: Agent + Client tariffs, VIEW mode. Add a "Last Updated" column and a stale-rate warning ("Rates in this tariff seem to be old, please check") when a rate is older than 12 months, for ALL charge types. Backend (confirmed) returns `last_update` per row on GET /api/agent/rate/tariff and GET /api/client/rate/tariff: "YYYY-MM-DD" or `false` (unknown -> show "—", never old). Changes only when rate, sales rate, calculation or currency change. No sort/filter/hide changes. Threshold = one constant in src/utils; pure age helper + unit tests. Frontend only, no new endpoints.
- Specs: docs/specs/005-tariff-last-updated.md (main, wins on conflict) and docs/specs/005-tariff-last-updated-ui.md.
- Branch: `staging` (no feature branch, user confirmed). No commits unless user asks.
- Decisions: 12 months for all charge types (user decision); warning, not hiding.
- Decision (user): the warning must cover ALL matching rates, not just the loaded page. Chosen approach: backend adds a whole-filtered-set value to the list response (e.g. `oldest_last_update`). Per-row Old badge/column still use loaded rows. Specs 005 (both files) still say "page-scoped" and must be revised once the backend names the field.
- Backend confirmed: `oldest_last_update` ("YYYY-MM-DD" or false) in list meta beside `total_count`, over ALL matching rows, same on any page / fetch_all. Rows without date ignored. Server restart needed.
- Specs revised (T1-T8): banner driven by `meta.oldestLastUpdate` via `isRateOld`; column + Old badge per loaded row; TariffTable `renderCell`; new TariffLastUpdated.jsx + TariffStaleBanner.jsx.
- CP1 APPROVED by user (defaults accepted: future dates ok, "—" vs "-" accepted, exports unchanged, keep last banner value while paging).
- CP2 APPROVED by user (plan T1-T8 from the main spec, branch `staging`).
- Phase: CODING. Tasks done: T1 (src/utils/tariffRateAge.js, lint ok), T2 (src/utils/tariffRateAge.test.js), T3 (TariffTable column.renderCell, lint ok), T4 (TariffLastUpdated.jsx, lint ok), T5 (TariffStaleBanner.jsx, lint ok), T6 (agent-tariffs.jsx wired, browser-unverified), T7 (client-tariffs.jsx wired, browser-unverified). CP1 decision: banner gate is `meta.totalCount > 0` only (stays visible while paging), applied in both screens.
- QA phase (qa-tester): unit tests 18/18 pass; code inspection OK for column placement, exports untouched, single `12` constant, gate `meta.totalCount > 0`. Browser ACs UNVERIFIED: app requires login and no test credentials are available (not faked); see docs/qa/005-tariff-last-updated-qa.md. Note: banner has a second line (spec section says single line) - decide at CP4.
- Verifier loop 1 fixes done: banner reduced to single line (main spec governs), minW removed, default export added to TariffLastUpdated, date pattern tightened, test gaps filled. Next: re-verify.
- T8 done: `npm run check` exit 0 (68 suites pass, build compiled). Verifier re-verify: PASS (docs/qa/005-tariff-last-updated-review.md). Browser ACs still UNVERIFIED (no login/test credentials).
- Phase: WAITING AT CP4.
- Next action: user approves CP4 (ideally after a browser walk with a login), then prepare PR into `staging` (no push without explicit OK) and run /update-docs.

## Feature 006-soa (client answer received)
Master Ledger > SOA (`/admin/ledger/soa`). Built from GET /api/ledger/invoice (no new endpoint): SOA date (as-at, invoices dated <= date) + optional client, then one currency; rows = non-cancelled invoices with balance > 0; columns Client, Currency, Date Invoice, Invoice Number, Customer Billing Ref (client_case_invoice_ref), Vessel, Date Due, Invoice Amount (currency_amount), Account Balance (invoice_balance), Grand Total. PDF (letterhead + bank details) and Excel export. Files: src/utils/soaReport.js(+test), src/views/admin/ledger/soa/{index.jsx,soaExport.js}. Unit tests pass, build ok; browser unverified (needs login). Open for client: balance is the current balance, not historic as-at; bank details/account no. are USD-specific constants in soaReport.js.

## Active feature 007-ledger-table-edit (client request; earlier notes untouched)
Master Ledger > Cost DB and Invoice DB: when editing, the user chooses Table view or Form view (like Items). Table view = one editable row per selected record, saved with the existing update endpoints (/api/ledger/cost/update, /api/ledger/invoice/update). No new endpoints. Reuse LedgerEntryTable, CostEntryTableView, InvoiceTableView. Cost DB table also shows the agent invoice file (LedgerCostFileCell, already built, uncommitted). Frontend only; backend needs go in a message.
- Branch: `staging` (user confirmed: CLAUDE.md rule, no feature branch). Working tree has other UNCOMMITTED work (Shipping docs + UI fixes, SOA paid check, Cost DB Invoice File column); user chose to leave it uncommitted. No commits unless user asks.
- Spec: docs/specs/007-ledger-table-edit.md (T1-T15). CP1 APPROVED by user with defaults: 50-row limit; buttons "Edit selected" + "Set same value"; default view Form; NO drafts for failed saves (first version); one "Save changes" only; Prev/Next in form view; Invoice duplicates left to server; SO Number and Invoice Number NOT editable in table (first version). Create table views stay off (isTableView=false) and out of scope.
- UI spec: docs/specs/007-ledger-table-edit-ui.md. Main spec updated to match CP1 answers (T14 dropped, SO/Invoice Number read-only).
- CP2 APPROVED by user (plan T1-T13 + T15, T14 dropped, branch staging).
- Phase: CODING. Batch 1 DONE (T1 ledgerEditNav, T2+T3 ledgerEditRows, T4 mapWithConcurrency, T5 edit columns; 57 tests pass, lint ok). Batch 2 DONE (T6 LedgerEntryTable edit mode: props mode,statusBadges,pendingCount,saveLabel,renderActions,isRowDisabled; derived cols read-only; no Retry slot -> use renderActions. T7 LedgerEditViewToggle props view,onChange,isDisabled. T8 RoeCell/DueCell exported from CostEntryTableView + InvoiceTableView with previewEnabled). Cost batch DONE (T9 CostEditTablePage.jsx + route /ledger/cost/edit, T10 cost/index.jsx buttons, T11 CostFormPage toggle + Record i of n). AC13 other-agent check NOT built (Invoice Number read-only in table, cannot trigger). Browser-unverified. Invoice batch DONE (T12 InvoiceEditTablePage.jsx + route /ledger/invoice/edit, T13 invoice/index.jsx + InvoiceFormPage.jsx). Backend confirmed invoice_file in Cost columns; withCostFileColumn fallback REMOVED (COST_FILE_COLUMN now in COST_COLUMNS). Backend ids= batch filter NOT working yet (returns all records) -> keep per-row loads. Checks: 73 suites/616 tests pass; feature files lint-clean; npm run check FAILS on pre-existing errors only (129 lint errors in StockForm/NewStockItem unchanged by us; build fails on Stocks.jsx/stockReportPdf.js/stockCreatePayload.js no-undef). Browser (read-only): Cost + Invoice edit tables load, toggle works; saves/uploads NOT exercised (writes staging). Verifier PASS (docs/qa/007-ledger-table-edit-review.md); findings 2,3,4 + id 0 fixed (loop 1). Phase: WAITING AT CP4.
- Client answers received: CI/PL Manual tab = YES; Invoice Issued by = selected from a list. Invoice-files-to-SO/portal question still unanswered. Need backend input before building both (no issuer field exists in invoice data).
- Util API notes: ledgerEditRows exports EDIT_ROW_STATUS (no_changes, edited, saving, saved, missing, duplicate, check_invoice, error, cancelled, load_error), recordToEditRow, isRowDirty, patchEditRow, rowsToSave, buildRowUpdate (validate separately), applySavedRecord, saveSummary, shouldPreviewAuto, otherAgentKey/otherAgentCheckNeeded/markOtherAgentWarning. ledgerEditNav: parseEditIds, buildLedgerEditPath, read/writeLedgerEditView, validateEditSelection (null when ok).
- Side note: backend asked to add `invoice_file` to GET /api/ledger/cost `columns`; then remove withCostFileColumn fallback (ledgerColumns.js) and re-test.

## Previous features (archived summary)
- 001-drafts: frontend draft-on-failure; T1-T16 done (docs/specs/001-drafts.md).
- 002-sales-notes: Sales Notes + follow-up filters; verified PASS by verifier, browser flows unverified (docs/specs/002-sales-notes.md).
- 003-rate-list-location-filters: Rate List cascading filters via POST /api/rate/list/options (docs/specs/003-rate-list-location-filters.md).

- 007 follow-ups done: ids batch loading in Cost/Invoice edit tables (fallback per row), Invoice number duplicate warning on blur (POST /api/ledger/invoice/check-number), API_CONTRACT updated. Verified read-only against local backend: ids filter, check-number, Record not found row, blur warning. 73 suites/623 tests pass. Not exercised: real saves/uploads. Pending: backend answers for Issued by (issued_by_id + list) and CI/PL Manual tab; client answers for SOA and invoice-file sync. Nothing committed.

## Active feature 008-invoice-issued-by (client request; 007 notes above untouched)
Invoice DB: new "Issued by" dropdown (client: selected from a list). Backend (confirmed, live locally): POST /api/ledger/invoice/issuers {q?} -> {id,name}; issued_by_id REQUIRED on create, sent on update, cannot be cleared; rows return issued_by_id + issued_by; list `columns` includes it; filter ?issued_by_id=. Scope: Invoice form create+edit, list column + filter, InvoiceEditTablePage select. Bulk modal/SOA untouched.
- Branch: `staging` (user confirmed). Other work stays UNCOMMITTED; no commits unless user asks.
- Phase: SPEC (architect). Next: stop at CP1.

## Active feature 009-cipl-manual-tab (runs in parallel with 008; user asked to finish all remaining points)
CI/PL: 4th "Manual" tab so a CI/PL can be issued without an SI No; user picks stock items or adds free-text lines. Client said YES. Backend (confirmed, live locally): POST /api/cipl/form/create with form_type:"manual"; every response has form_type, cipl_number, vessel_id; lists/latest take form_type:"manual" (omitted = Simple only, "all" = both); job_no and vessel_id typed by user on manual forms; lines in stock_list on update/archive: {stock_list_id} add stock item, {description,hs_code,quantity,unit_price,box,weight} add free-text line, {id,...} edit, {id,delete:true} remove; free-text lines return hs_code, quantity, unit_price; line value = quantity x unit_price; update/archive/delete work as other forms.
- Branch: `staging`. Other work stays UNCOMMITTED. Phase: SPEC (architect). Next: CP1 for 008 and 009 together.
- Not buildable yet (waiting on client): SOA Date Paid question; invoice-file sync to SO/portal question.

- Backend answered 008 + 009 questions; recorded at the end of docs/specs/008-invoice-issued-by.md and docs/specs/009-cipl-manual-tab.md. Waiting at CP1 for BOTH specs (user has not approved yet). Also open: user decision to fix 2 medium verifier bugs (cancelled cost view "[object Object]" for file column in ledgerViewValue; invoice duplicate warning not cleared on id change) and what to do about the check gate (old lint errors in StockForm/NewStockItem). Nothing committed.

- CP1 APPROVED by user for BOTH 008 and 009 (specs incl. backend answers). User also asked to fix the 2 medium verifier bugs (done by a developer, see below). Phase: PLAN. Next: CP2 for 008 (T1-T10) and 009 (T1-T14), build 008 first. Commits still on hold (user answered neither commit grouping nor check-gate question yet).

- CP2 APPROVED by user for BOTH 008 (T1-T10) and 009 (T1-T14); 008 built first, then 009. 2 medium 007 bugs FIXED (ledgerViewValue file case + test; InvoiceFormPage warning reset on id change); 73 suites/623 tests pass. Phase: CODING 008 batch 1 (T1 API+config, T2-T4 ledgerInvoiceUtils, T5 ledgerColumns, T6 hook) started. Then batch 2 (T7 InvoiceFormPage, T8 InvoiceEditTablePage, T9 invoice/index.jsx), T10.

- 008 batch 1 DONE: T1 getLedgerInvoiceIssuers/issued_by_id filter/columns (67 api tests pass), T2-T4 ledgerInvoiceUtils (issued_by_id/issued_by in form, create always sends, update only when changed+non-empty, validateInvoiceForm(form, original)), T5 columns (issued_by list col, issued_by_id issuer edit col), T6 hook useLedgerIssuerOptions {options,isLoading,error,onSearchChange,pin,retry}. One 007 test (ledgerEditRows.test.js adapter.validate one-arg) fails until T8 passes baseline. Batch 2 (T7 InvoiceFormPage, T8 InvoiceEditTablePage + that test, T9 invoice/index.jsx) started.

- 008 batch 2 DONE (T7 InvoiceFormPage Issued By dropdown, T8 InvoiceEditTablePage issuer cell + validate(values, baseline), T9 invoice/index.jsx server columns + Issued By col + filter) and T10 API_CONTRACT updated. 73 suites/636 tests pass; 008 files lint clean. Browser read-only (logged-in Chrome): list shows Issued By column after Invoice Number, New Invoice shows required Issued By dropdown listing issuers. Not exercised: real create/save with an issuer (writes staging). Verifier running -> docs/qa/008-invoice-issued-by-review.md. Then CP4 for 008, then 009 build.

- 009 batch 1 DONE: T1 cipl.js form_type passthrough (75 api tests), T2-T5 src/utils/ciPlManual.js (20 tests: parse, payload builders, readManualTotals, buildManualPdfRows 7 cols, buildManualPackedPayload separate call), T6 CiPlManualHeaderFields.jsx (display=contents rows CI/PL NO, JOB NO, VESSEL; mount inside orange header Grid), T7 CiPlManualStockPicker.jsx (props isOpen,onClose,onAdd(ids),existingStockListIds,isBusy,vesselId). Unconfirmed assumption: stock-line response field names (stock_list_id, stock_item_id, hs_code, quantity, unit_price, value_in_usd, box, weight, description) and whether Manual packed save wants total_packed_quantity/weight; check on a live manual form. Batch 2 (T8 CiPlManualLines, T9-T12 CiPlDetail wiring/reset/PDF/archived detail, T13 archived list filter) started.

- 008 verifier PASS (docs/qa/008-invoice-issued-by-review.md): 75 suites/664 tests, build ok, no blockers; low findings 1-5,7 being fixed (loop 1). Manual 009: T8 CiPlManualLines + T13 archived list done; T9-T12 CiPlDetail wiring running.

- 009 batch 2 DONE: T8 CiPlManualLines, T9-T12 CiPlDetail.jsx (tab index 3, resolveFormApis manual branch, header, handleManualSaveLines, renderManualFooter, packed via buildManualPackedPayload separate call, Reset/Archive guard, manual PDF, archived manual layout), T13 archived list Type filter. 589+ tests pass; 0 lint errors in CiPlDetail (24 warnings, pre-existing kinds). NOT browser-tested: opening the Manual tab may create a draft on the backend (writes) so waits for user OK. Unconfirmed: stock-line response field names and whether packed save wants total_packed_quantity/weight. Verifier running -> docs/qa/009-cipl-manual-tab-review.md.
