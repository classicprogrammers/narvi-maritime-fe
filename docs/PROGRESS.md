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

## Previous features (archived summary)
- 001-drafts: frontend draft-on-failure; T1-T16 done (docs/specs/001-drafts.md).
- 002-sales-notes: Sales Notes + follow-up filters; verified PASS by verifier, browser flows unverified (docs/specs/002-sales-notes.md).
- 003-rate-list-location-filters: Rate List cascading filters via POST /api/rate/list/options (docs/specs/003-rate-list-location-filters.md).
