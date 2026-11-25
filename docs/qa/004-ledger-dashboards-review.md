# 004-ledger-dashboards: Verifier review

Scope: uncommitted work on `staging` (T1-T12; T13 pending backend reply). `npm run check` not run by the verifier (orchestrator runs it).

## Verdict: PASS (with fixes recommended before CP4)

No blocking bugs found. These areas were checked and are correct:
- FY/date math: 01 Mar boundary, leap years (`fyRange` uses `new Date(y, 2, 0)`), and local-part ISO dates (no `toISOString`).
- Bucket keys and zero-fill; margin null handling; latest-wins guard plus unmount invalidation in the hook.
- Requests are blocked on an invalid custom period or a missing client, and the empty FY set sends no request.
- Session state is sanitised, and the 404 status survives the axios interceptor.
- Endpoints are limited to the six PROPOSED ones. No new deps, no hex colours. `SearchableSelect`/`DateField` are untouched.

## Findings (by severity)

### Medium
1. src/views/admin/ledger/dashboards/tabs/ClientStatsTab.jsx:127-141 - Sortable headers are a component (`SortTh`) defined inside render: a new component type every render, so every `Th` remounts on each render. They also have only `onClick`, no `tabIndex` or key handler, so keyboard users cannot sort. The existing `components/ledger/LedgerSortableHeader.jsx` already does this accessibly, so the CLAUDE.md "reuse components" rule is also broken. - Use `LedgerSortableHeader` (sortKey/sortBy/sortOrder/onSort).
2. src/views/admin/ledger/dashboards/index.jsx:223-231 - The client `SearchableSelect` has no `fallbackDisplay={state.clientLabel}`. The spec edge case requires this ("A client removed from master data still shows via clientLabel"). Scenario: a client is stored in sessionStorage but is not in the cached client list, or the cache is empty on first open. The select shows blank while Client Turnover fetches and shows figures for that hidden client. - Pass `fallbackDisplay={state.clientLabel}`.
3. src/views/admin/ledger/dashboards/tabs/ClientTurnoverTab.jsx:93,98 - `clientName = data?.client?.name || clientLabel` prefers the previous response. Scenario: client A is loaded, then the user picks client B. While B loads, or if B fails, the panel title reads "Turnover: A" above B's spinner/error. - Use `clientLabel` first, or use `data.client.name` only when `String(data.client.id) === String(clientId)`.

### Low
4. src/views/admin/ledger/dashboards/index.jsx:105-121 - The page is opened without `?tab=` and a non-default tab is stored. The first render mounts `CashTab` (index 0) and fires `GET /api/ledger/dashboard/cash`, and only then does the mount effect `history.replace` to the stored tab. The result is one wasted request per page open (two under StrictMode). - Compute the initial active key from `state.tab` when the URL has no `tab`, so the first render already uses it.
5. src/views/admin/ledger/dashboards/tabs/RegionSalesTab.jsx:161-165 - The unassigned note renders "1,234.00 not assigned to Singapore or Greece", but spec D5 wording is "USD x not assigned ...". - Prefix with `USD ` (or `$`, as in the tiles).
6. src/views/admin/ledger/dashboards/tabs/RegionSalesTab.jsx:124-130 - The user ticks an extra FY. While the new request loads, `views` is rebuilt from the old `data` with the new `fys`. The new column shows 0.00 in every past month (dimmed) until the response lands, so the zeros look like real data. - While `isLoading`, keep the previous `fys` for the view, or render missing years as `null`.
7. src/views/admin/ledger/dashboards/tabs/ClientStatsTab.jsx:245 - `DashboardStatTiles` sits outside the panels. On first load, on error and on empty data it shows four "—" tiles above the spinner/error, and it is not dimmed on reload, unlike every other tab. - Move the tiles inside the first panel's content, or render them only when `data` exists.
8. src/utils/ledgerDashboardPeriod.js:149 - The hardcoded `2024` duplicates `FIRST_DASHBOARD_FY` (components/ledger/dashboards/DashboardPeriodFilter.jsx:6). If the first FY changes in one place only, `resolvePeriod` and the FY options disagree. - Export the constant from the util and import it in the filter.
9. src/utils/ledgerDashboardData.js:2 - A `src/utils` module imports from `views/admin/default/dashboardUtils`, so utils now depend on a view. - Acceptable for reuse of `formatDashboardMoney`. Note it, or move the formatter to utils in a separate change.
10. Duplicated helpers within the feature:
    - `TruncatedText` is copied 4x: CashTab.jsx:13, ClientStatsTab.jsx:39, DestinationsTab.jsx:31, ClientTurnoverTab.jsx:15.
    - Compact money formatters: ClientStatsTab.jsx:34, DestinationsTab.jsx:79, and the unexported `compactMoney` in ledgerDashboardData.js:109.
    - `MONTH_LABELS` in RegionSalesTab.jsx:11 duplicates `MONTH_AXIS_LABELS` in ledgerDashboardData.js:5.
    - `formatPercent` in DashboardStatTiles.jsx:7 duplicates `formatMarginPct`.
    - Suggested fix: export one copy of each (e.g. a `components/ledger/dashboards/TruncatedText.jsx`, plus exported helpers from the data util).
11. src/views/admin/ledger/dashboards/tabs/DestinationsTab.jsx:39 - `color="gray.400"` is used for empty cells and is not colour-mode aware, unlike the rest of the feature, which uses `useColorModeValue`. - Use a muted `useColorModeValue` token.

## Notes (not defects)
- A3: `history.replace` (as specified) means browser back/forward does not step between tabs; reload restores the tab.
- Cash empty text is "No outstanding amounts." instead of the period wording, which is reasonable for a no-period tab.
- Browser flows are not verified by this review.
