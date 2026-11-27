# QA 007 Ledger table edit - browser walkthrough + checks

Date: 2026-11-27. Branch staging (uncommitted).

## Automated
- `npm run test:ci`: 73 suites passed, 623 passed, 4 skipped, 0 failed. (AC19 tests part: PASS)
- `npm run build`: compiled, build folder produced. (lint not run by QA; `npm run check` lint step not verified)

## Browser
Dev server at http://localhost:3000 shows the Sign In page (/auth/sign-in). No test credentials are available, so
none were entered. Every browser-only criterion is UNVERIFIED (reason: login required). No data was saved,
uploaded, created, deleted or cancelled.

## Per-AC
| AC | Result | Evidence |
|----|--------|----------|
| 1 Edit selected -> remembered view, rows in selection order | UNVERIFIED (login) | Code: "Edit selected" present in cost/index.jsx:1249, invoice/index.jsx:1040; ledgerEditNav tests pass |
| 2 "Set same value" opens bulk modal | UNVERIFIED (login) | Button exists cost/index.jsx:1261, invoice/index.jsx:1052 |
| 3 Row click opens remembered view; cancelled -> modal | UNVERIFIED (login) | not inspected in detail |
| 4 Toggle persists across reload/re-login | UNVERIFIED (login) | `read/writeLedgerEditView` in ledgerEditNav.js (unit-tested, via persistedFilters) |
| 5 Per-id load, max 5 in flight, spinner, Load error + Retry | UNVERIFIED (login) | Code: `mapWithConcurrency` used in both edit pages (Cost:175, Invoice:153); mapWithConcurrency tests pass. Spinner/Retry UI not seen |
| 6 Editable/read-only columns | UNVERIFIED (login) | ledgerColumns tests pass (COST/INVOICE_TABLE_EDIT_COLUMNS) |
| 7 Sequential per-row update, only changed keys | UNVERIFIED (login) | ledgerEditRows tests (buildRowUpdate skip/payload) pass |
| 8 Status badges | UNVERIFIED (login) | not seen in UI |
| 9 Refetch after save | UNVERIFIED (login) | applySavedRecord unit-tested |
| 10 Summary toast | UNVERIFIED (login) | saveSummary unit-tested |
| 11 Validation, failing row not sent | UNVERIFIED (login) | |
| 12 Cost agent-change duplicate pre-check | UNVERIFIED (login) | `checkLedgerCostInvoices` used in CostEditTablePage.jsx:519 |
| 13 Other-agent warning | NOT BUILT (intentional) | `findCostInvoicesUnderOtherAgents` not referenced in CostEditTablePage.jsx; consistent with note |
| 14 ROE/due auto preview rules | UNVERIFIED (login) | shouldPreviewAuto unit-tested |
| 15 Cost file cell | UNVERIFIED (login) | not exercised (would upload/delete data) |
| 16 Cancelled row read-only | UNVERIFIED (login) | |
| 17 >50 limit text + truncate warning | UNVERIFIED (login) | Message constant "Edit supports up to 50 records. Clear some rows." in ledgerEditNav.js:11; `overEditLimit` in both list pages; parseEditIds caps at 50 with `truncated` flag (tested) |
| 18 Leave guard; Prev/Next disabled when saving | UNVERIFIED (login) | `Prompt` + `beforeunload` in both edit pages; Record i of n with Previous/Next in CostFormPage.jsx:884-899 |
| 19 Unit tests + check | PARTIAL PASS | tests and build pass; lint not run |

## Small items
- "Shipping docs" file type: option `shipping_docs` / "Shipping docs" present in utils/documentTypes.js:9 (documentTypes test passes). Dropdown rendering UNVERIFIED (login).
- Cost DB "Invoice File" column: `COST_FILE_COLUMN` defined (ledgerColumns.js:7), rendered in cost/index.jsx. UI UNVERIFIED.
- Batch `ids` loading: `api/ledgerCost.js:26-31` and `api/ledgerInvoice.js:25-30` send `ids` param. Note the edit pages still call `mapWithConcurrency` per id (spec AC5 per-row). Whether the edit pages use the batch `ids` path was not confirmed. Backend support unverified.
- Invoice New form duplicate-number warning: code at InvoiceFormPage.jsx ~466 (formatInvoiceNumberDuplicateMessage; server still gates). UI UNVERIFIED.

## Bugs found
None found in code inspection, tests or build. Console/network not checked beyond the login page (no errors observed on load).

## To finish
Provide staging test credentials (or a logged-in session) and re-walk AC1-18 read-only.
