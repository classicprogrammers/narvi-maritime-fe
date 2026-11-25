# QA: 004 Ledger Dashboards (browser walkthrough)

Date: 2026-11-25. Branch: staging.

## Environment result
- `preview_start "web"` worked. Port 3000 was busy, so the dev server ran at http://localhost:3002.
- Navigating to `/admin/ledger/dashboards` redirected to `/auth/sign-in` (staging banner shown). No test credentials were
  provided in chat and I did not enter or invent any. **I could not log in, so no authenticated page was seen.**
- Console on the sign-in page: no errors. No dashboard API calls were possible (no session), so the backend, CORS
  and network behaviour are **not verified**.
- Every browser-dependent criterion below is **NOT VERIFIED**. Where the code was read, the result is labelled
  "static only" and is not a PASS.

## Automated
- `npm run test:ci`: PASS. 67 suites passed, 527 tests passed, 4 skipped.
- `npm run build`: PASS (exit code 0, "serve -s build" deployment hint printed). It ran in the background past the
  180s tool limit and completed after the first draft of this report. Lint was not run, so E4 remains NOT VERIFIED.

## Acceptance criteria
| ID | Result | Evidence |
|---|---|---|
| A1 sidebar item, icon, route | FAIL (static only) | `src/routes.js:254-261`: "Dashboards" (`MdInsertChart`, `/ledger/dashboards`, `exact: true`) is the **first** item in the Master Ledger submenu. The order is Dashboards, Cost DB, Invoice DB, SO Ledger. The spec says it comes **after SO Ledger**. Either move it or update the spec. Sidebar not seen in the browser. |
| A2 header, tab order, lazy | NOT VERIFIED | Registry order in `dashboardRegistry.js` matches the spec table (static only). |
| A3 `?tab=` in URL, reload/back | NOT VERIFIED | Needs login. |
| A4 single registry | NOT VERIFIED | Static only: `DASHBOARD_TABS` array exists with key, label, filter, needsClient, Component. |
| B1-B4 period filter, presets, custom validation, resolved text | NOT VERIFIED | Needs login. Covered by unit tests in `ledgerDashboardPeriod.test.js` (pass), not by UI. |
| B5 sessionStorage state | NOT VERIFIED | Needs login. |
| B6 dates built from local parts | NOT VERIFIED | Unit-tested only. |
| Clear filters | NOT VERIFIED | Needs login. Not an explicit criterion in the spec; no such control is specified. Check the implementation against the intent. |
| C1 loading / error / 404 / empty / data states | NOT VERIFIED | Needs login and API access. |
| C2 latest response wins | NOT VERIFIED | Needs login. |
| C3 USD formatting, margin, red negatives | NOT VERIFIED | Needs login. |
| C4 chart error boundary, theme colours, table fallback | NOT VERIFIED | Needs login. |
| C5 truncation, horizontal scroll | NOT VERIFIED | Needs login. |
| D1 Cash | NOT VERIFIED | Needs login. |
| D2 Client Stats | NOT VERIFIED | Needs login. |
| D3 Destinations | NOT VERIFIED | Needs login. |
| D4 Turnover | NOT VERIFIED | Needs login. |
| D5 Singapore / Greece | NOT VERIFIED | Needs login. |
| D6 Client Turnover (prompt, no request without client) | NOT VERIFIED | Needs login. |
| E1/E2 utility and API tests exist | PASS | Sibling tests exist (`src/utils/ledgerDashboard*.test.js`, `src/api/ledgerDashboard.test.js`) and the suite passes. |
| E3 no new dependencies | NOT VERIFIED | Not checked (package.json diff not inspected). |
| E4 `npm run check` | NOT VERIFIED | Tests pass. Build result not seen. Lint not run. |

## Bugs / findings
1. A1 deviation (see above): Dashboards is first in the Master Ledger submenu, not after SO Ledger. Severity low.

## What is needed to finish
- A test account the user provides in chat, entered by the user or supplied for the test login, and a backend reachable from
  localhost (CORS allowing http://localhost:3002, or `REACT_APP_BACKEND_URL` pointing at an allowed host).
- Alternatively, ask for permission to stub API responses, which would only prove UI rendering, not the contract.
