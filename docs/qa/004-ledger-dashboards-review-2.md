# 004-ledger-dashboards: Verifier review 2

Scope: all uncommitted work on `staging` for 004: `src/config/api.js`, `src/routes.js`, the new files under `src/api`,
`src/utils`, `src/hooks`, `src/components/ledger/dashboards` and `src/views/admin/ledger/dashboards`. Checked against
docs/specs/004-ledger-dashboards.md, including "Backend answers (confirmed)" and "Implemented shapes".
This review follows docs/qa/004-ledger-dashboards-review.md and covers the T13 shape alignment, Clear filters, the
sidebar reorder and the UI polish.

What was run: `npm run check` was not run (as instructed). `react-scripts test ledgerDashboard` gave 4 suites and
54 tests, all passing. ESLint on the feature files found 0 errors; its one warning (`Warehouses` unused,
routes.js:95) was already there before this work.

## Verdict: FAIL

One high-severity bug shows up with the real backend data. The `available_fy` that the backend returns (the real
fixture has `first: 2023`) widens the FY options. `resolvePeriod` and `sanitizeState` still clamp to the hardcoded
`FIRST_DASHBOARD_FY..current`, so picking an offered FY can load a different FY's figures.

## Previous review: status
- Fixed: 1 (LedgerSortableHeader), 2 (fallbackDisplay), 3 (client title), 4 (initial tab), 5 ("USD" prefix), 8 (exported constant), 11 (Destinations empty colour).
- Still open: 6 (RegionSalesTab.jsx:124-130, a newly ticked FY shows 0.00 while it loads), 7 (ClientStatsTab.jsx:239-240, tiles and the undated note sit outside the panels and show "—" during load and error), 9, 10 (`TruncatedText` is still copied 4 times).

## Findings (by severity)

### High
1. src/utils/ledgerDashboardPeriod.js:150-153 (with src/components/ledger/dashboards/DashboardPeriodFilter.jsx:44 and src/views/admin/ledger/dashboards/index.jsx:60-67) - The FY select lists `fyOptions(firstFy, today, lastFy)` from the backend's `available_fy`. `resolvePeriod` still accepts only `FIRST_DASHBOARD_FY (2024) <= fy <= current`.
   - Scenario: the backend sends `available_fy.fys` starting at 2023, as in the real client-stats fixture (ledgerDashboard.test.js:351). The user picks "FY 2023/24". The select shows 2023/24, but the request and the resolved label are for FY 2026/27 ("... (FY 2026/27)").
   - The same happens for any FY above the current one if `available_fy.last` is in the future (the spec says future FYs return zeros).
   - On reload, `sanitizeState` uses `fyOptions(FIRST_DASHBOARD_FY)`, so a stored FY 2023 falls back to Current FY. Stored region FYs such as 2023 are dropped silently (index.jsx:71-73).
   - Fix: validate the FY against the same range the UI offers. Pass `firstFy`/`lastFy` (or the options list) into `resolvePeriod`, or remove the lower and upper clamp there and leave the check to the options. Keep the stored FY in `sanitizeState` if it is a plausible year, and check it again once `available_fy` arrives.

### Medium
2. src/api/ledgerDashboard.js:310-339 - `getDashboardRegionSales` drops `available_fy`. The real region response includes it (spec line 473; fixture at test:404), but neither return path calls `normalizeMeta`.
   - Spec: "the FY options and the Region sales FY list run from `first` to `last`".
   - Scenario: open `/admin/ledger/dashboards?tab=regions` directly (or reload on it). No other tab has reported `available_fy`, so the checkboxes always fall back to 2024..current.
   - Fix: add `available_fy: normalizeAvailableFy(payload.available_fy)` to both return objects, and add a test.
3. src/views/admin/ledger/dashboards/index.jsx:43,51,218-220,345-355 - The default `regionFys` is `fyOptions(FIRST_DASHBOARD_FY)`, which today is [2024, 2025, 2026]. The checkboxes, however, come from `availableFy`. When the backend range differs, a selected year can have no checkbox.
   - Scenario: client-stats returns `fys` 2023 and 2025, so `last = 2025`. On the Singapore / Greece tab, FY 2026 is still selected and requested and gets a chart series and table column, but no checkbox exists to untick it. "Clear filters" brings it back.
   - The `lastFy` cap also removes the current FY from the period FY list in this case.
   - Fix: build the default and the visible choices from the same list, e.g. the union of `available_fy` and the current FY. Drop or show any selected year outside the choices.
4. src/views/admin/ledger/dashboards/tabs/TurnoverTab.jsx:40-56,105 - The tab reads per-bucket figures only from `data.series`.
   - The spec's implemented shapes never confirm `series` for turnover. They say per-bucket money lives in `buckets` on rows and totals (spec 457-459), and the normaliser already exposes `totals.by_bucket` (ledgerDashboard.js:251).
   - None of the real-response tests includes a turnover `series`. Its only fixtures are the hand-made wrapper/empty-payload tests (ledgerDashboard.test.js:423-437). The shared real period fixture at test:361 is only checked for `period`.
   - Scenario: if the live turnover response follows the other period endpoints (`totals.buckets`, no `series`), every row is 0, `isEmpty` becomes true, and the tab shows "No data for the selected period." even though there is turnover.
   - Fix: confirm the live shape. In the normaliser, fall back to `totals.by_bucket` when `series` is missing, and add a test with the real turnover payload.

### Low
5. src/views/admin/ledger/dashboards/tabs/ClientStatsTab.jsx:223-228 - The pivot's total row shows "—" in every bucket. The comment says "The backend sends totals for the whole period only", but after T13 `totals.by_bucket` is present (spec line 460; test:358). Fix: fill the cells from `totals.by_bucket` for the chosen metric, using `pivotByBucket([totals], keys, metric)`.
6. src/components/ledger/dashboards/DashboardPanel.jsx:85-86 - The new table polish uses `sx` descendant selectors. They have higher specificity than the cell props in the tabs, which causes three problems:
   - (a) `& thead th { zIndex: 3 }` overrides the sticky first header's `zIndex 2/1` (ClientStatsTab.jsx:137, DestinationsTab.jsx:148/106, RegionSalesTab.jsx:66). All header cells share z-index 3, so on horizontal scroll the later headers paint over the sticky "Client"/"Destination"/"Month" header.
   - (b) `color: muted` overrides `LedgerSortableHeader`'s active-column colour, so the sorted column is no longer highlighted.
   - (c) `& tbody tr:hover td { bg: whiteAlpha.100 }` in dark mode replaces the opaque sticky cell background with a translucent one, so scrolled cells show through the first column on hover.
   - Fix: give the sticky header a higher z-index from `sx` (e.g. a `"& thead th[data-sticky]"` rule or `"& thead th:first-of-type": { left: 0, zIndex: 4 }`). Do not set `color` in `sx`. Use an opaque hover token in dark mode.
7. src/views/admin/ledger/dashboards/index.jsx:195-196,233,358 - Clear filters resets every filter (period, interval, client, region FYs), but on the Singapore / Greece tab only the FY checkboxes are visible.
   - Scenario: a custom period is set on Turnover, then the user switches to Singapore / Greece. Clear filters is enabled even though the FYs are at their defaults. Clicking it changes nothing visible but silently discards the custom range and the selected client.
   - Fix: base `isDisabled` and the reset on the filters the active tab shows, or label the button so it is clear it resets all dashboard filters.
8. src/routes.js:252-260 and src/views/admin/ledger/dashboards/index.jsx:281-283 - These differ from the spec as written:
   - A1: "Dashboards" is now the first submenu item, not after SO Ledger.
   - A2: the subtitle is "Cash, client, destination and turnover figures from the Master Ledger, in USD.", not "Master Ledger figures in USD".
   - If the user asked for these changes, update A1 and A2 in the spec. Otherwise revert them.
9. src/views/admin/ledger/dashboards/tabs/TurnoverTab.jsx:169 - `color="gray.500"` does not follow colour mode. The rest of the feature uses `useColorModeValue` muted tokens. Fix: use the `secondaryGray.600/400` pair.

## Checked, no issue found
- CLAUDE.md hard rules:
  - Only the six `LEDGER_DASHBOARD_*` endpoints, as confirmed by the backend; the PROPOSED comment has been replaced.
  - No new dependencies.
  - No hex colours.
  - `SearchableSelect`, `DateField` and existing ledger screens are untouched.
  - No `toISOString`.
- Normalisers checked against the real shapes:
  - cash `{totals, rows}` with `agent`/`client` names and `oldest_due_date: false`
  - client-stats `client` and `buckets`
  - destinations sale/profit/margin
  - client-turnover `rows`, with `vessel_id: false` mapped to null
  - region `regions: [strings]` and `fys[].months`/`totals`
  - undated `{sale, cost}`
  - `available_fy {fys}`
- Clear filters and sessionStorage: `resetFilters` keeps the tab, and the persist effect writes `activeKey`.
- First-render tab selection from storage: no wasted Cash request.
- Hook latest-wins and unmount invalidation; 404 and 400 message handling; `fallbackDisplay` on the client select; the client turnover title ignores another client's response.

## Notes
- Browser flows were not verified by this review.
