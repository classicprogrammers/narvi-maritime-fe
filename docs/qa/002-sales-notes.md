# QA 002-sales-notes (2026-11-18)

Verdict: PARTIAL. Automated checks pass. Browser walkthrough covered UI-only behaviour; every backend-data flow is NOT VERIFIED (no reachable backend). No bugs found in what was exercised.

## Automated
- `npm run test:ci`: 58 suites passed, 420 passed, 4 skipped, 0 failed.
- `npm run build`: succeeded.
- I added no tests (existing tests for clientSales, customer, salesNotes and clientListFilters were already in the tree).

## Environment
- Dev server via preview_start "web"; port 3000 was busy so it ran on http://localhost:3001.
- `.env` sets only `REACT_APP_APP_ENV`; `REACT_APP_BACKEND_URL` / `REACT_APP_API_BASE_URL` are unset. The browser had an existing session (admin shell rendered, staging banner), but every API call failed: Sales list showed "Network Error", Client list showed a "Get customers failed: Network Error" modal then "No clients available", Rate List showed "No rates found".
- No test credentials were provided, so none were used. The network panel did not log the API calls, so request params could not be inspected. Console had no errors.

## Criteria
| ID | Result | Evidence |
|---|---|---|
| A1 sidebar Sales + title | PASS (partial) | `/admin/contacts/sales` renders "Sales Notes", breadcrumb "Sales". Sidebar entry position not visually checked. |
| A2 initial request params | NOT VERIFIED | no backend / requests not captured. Unit tests only. |
| A3 columns | PARTIAL | headers Entry date, Client, Client code, Follow up, Remarks, Follow-up date, Created by, Actions present; rows/format/tooltip not seen (no data). |
| A4 search debounce/X | NOT VERIFIED | |
| A5 date filters + validation | PASS (UI) | panel has 4 DmyDateInputs, X per filled field; From 20/11/2026 with To 10/11/2026 showed inline "From date must be on or before To date". "No request sent" not confirmable. |
| A6 sorting | PARTIAL | sort arrows on Entry date, Client, Follow-up date; not exercised. |
| A7 pagination | NOT VERIFIED with data | footer renders "Showing 0 to 0 of 0 results". |
| A8 Clear All | PASS (UI) | appears when a filter is set. Reset result not re-verified (screenshots lagged one step). |
| A9 persistence | NOT VERIFIED | |
| A10 states | PARTIAL | loading text and error text ("Network Error") seen; empty states not seen. |
| A11 Add modal | PASS (UI) | fields Client*, Remarks*, Entry date defaults to today (18/11/2026), Follow-up date; Save disabled while empty; hint "No clients loaded yet" shown because clients list is empty. Create request NOT VERIFIED. |
| A12-A15 edit/delete/success/backend error | NOT VERIFIED | no data |
| B1 Follow up filter | PASS (UI) | checkbox "Show follow-up clients only" with X appears when ticked. Request param NOT VERIFIED. |
| B2 | PASS (UI) | Advanced Filters button turns solid blue, Clear All appears. |
| B3 persistence/auto-open | NOT VERIFIED | |
| C1 date filters on clients | PARTIAL | four date inputs present; request params NOT VERIFIED. |
| C2 View matching notes popup | NOT VERIFIED | |
| C3 | NOT VERIFIED | |
| D1 FOLLOW UP switch | PARTIAL | FOLLOW UP column header present; no rows so toggle and payload NOT VERIFIED. |
| D2 edit form checkbox | NOT VERIFIED | |
| D3 register unchanged | NOT VERIFIED (unit-level only) | |
| E1 tests / E3 check | PASS | see Automated |

## Secondary: Rate List -> Copy selected to Client
NOT VERIFIED. Rate List loaded empty ("No rates found") because the backend is unreachable, so no rates could be ticked. No copy was confirmed and no data changed.

## Bugs found
None in exercised UI. Observations:
- Typing in the Entry "To" field right after the From field: the layout shifts when the X appears, so a quick second click can miss the target (test-tooling effect, not necessarily a bug).
- Known low items from docs/PROGRESS.md remain untested.

## To finish verification
Provide a backend URL (`REACT_APP_BACKEND_URL`, with CORS allowing localhost) and test credentials, then re-run A2-A4, A6-A15, B1 (network param), C1-C2, D1-D2 and the Rate List copy modal.
