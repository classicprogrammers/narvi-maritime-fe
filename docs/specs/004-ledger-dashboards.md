# 004-ledger-dashboards: Master Ledger Dashboards (frontend + proposed backend contract)

Status: Spec (awaiting CP1)
Branch: `staging` (no feature branch, no commits by the architect).

## Goal
Add one page, **Master Ledger > Dashboards** (`/admin/ledger/dashboards`), with one tab per dashboard and a period filter
that every tab can reuse. More dashboards will be added later, so adding a tab should take one registry line, one
API function, one config entry and one component.

The financial year (FY) starts on 01 March. FY 2024/25 runs from 01 Mar 2024 to 28/29 Feb 2025.

| # | Tab | Content | Filter |
|---|---|---|---|
| 1 | Cash | Outstanding to agents + outstanding from clients (snapshot as of today) | none |
| 2 | Client Stats | Turnover, cost, profit, margin per client | period + interval |
| 3 | Destinations | Aggregates per destination, agents who sent an invoice only | period + interval |
| 4 | Turnover | Sum of Actual Sale / Cost / Profit per bucket | period + interval |
| 5 | Singapore / Greece | Actual Sales per month for each selected FY, Singapore chart above Greece chart | FY multi-select |
| 6 | Client Turnover | One client's turnover, split by vessel | client + period + interval |

User decisions: Actual Sale = sales invoice USD amount; Actual Cost = cost ledger USD cost; Profit = Sale - Cost;
Margin = Profit / Sale. **The backend computes all of these.** The backend owns the Singapore/Greece rule. Charts use the
existing `apexcharts` / `react-apexcharts`. No new dependencies.

## Hard constraint: no endpoints exist yet
`src/config/api.js` and `docs/API_CONTRACT.md` have no dashboard endpoints. The contract below is **PROPOSED, pending
backend confirmation**. Before the backend confirms (or corrects) it, the developer may build only:
- the backend-independent tasks T1-T5 (utils, period filter, shell, route), and
- T6-T12 against the proposed shapes, covered by unit tests with fixtures.

Before shipping, the confirmed contract replaces the proposal in this spec and in `docs/API_CONTRACT.md` (CP2 gate).
All endpoint knowledge lives in exactly two places, so changes stay small:
- `src/config/api.js`: `LEDGER_DASHBOARD_*` entries
- `src/api/ledgerDashboard.js`: request param building and response normalising

Components consume only the normalised shapes, never raw responses.

## Research findings (sibling patterns)
1. **Ledger list screen**: `src/views/admin/ledger/cost/index.jsx`. Copy these from it:
   - page shell and header (`:879-893`)
   - filter card (`:895-1135`)
   - `useColorModeValue` token set (`:253-266`)
   - loading/empty states (`:1171-1191`) and error toast plus `listError` (`:306-323`)
   - sessionStorage persistence (`:110-155`)
   - master data clients (`useMasterData().refreshClients`, `getCached(MASTER_KEYS.CLIENTS)`, `:200-207, 355-373`)
   - client `SearchableSelect` (`:1048-1060`)
2. **Ledger API module**: `src/api/ledgerCost.js` (`unwrapError` `:4-11`, optional-key param building `:30-56`, `GET` with
   `params`) and `src/api/ledgerShared.js` (`pickPayload` `:12-16`, which tolerates the `data` / `result` / `result.data`
   wrappers). The axios client serialises arrays as repeated keys (ARCHITECTURE.md).
3. **Endpoint map**: `src/config/api.js:48-67` has the Master Ledger block. The new keys go there.
4. **Routes/sidebar**: `src/routes.js:244-278`, the "Master Ledger" `submenu` (Cost DB, Invoice DB, SO Ledger), with
   imports at `:114-120`. `MdDashboard` is already used by the main dashboard (`:127`), so use `MdInsertChart`.
5. **Tabs**: `src/views/admin/carbon-calculator/index.jsx:7-15` (`Tabs variant="enclosed" colorScheme="blue" isLazy`).
6. **ApexCharts**: `src/views/admin/default/index.jsx` (`ReactApexChart` with `ChartErrorBoundary` `:73-95`,
   `EmptyChartState` `:62-71`, `key`-based remount `:128-134, 210-218`). Option builders are in
   `src/views/admin/default/dashboardUtils.js` (`buildVerticalBarChartOptions` `:271-320`,
   `buildHorizontalBarChartOptions` `:322-356`, `formatDashboardMoney` `:26-30`). Those builders hardcode hex colours and
   count-style labels, so the new money/percent builders go in a new util. Colours come from theme tokens via Chakra
   `useToken`.
7. **Date inputs**: `src/components/forms/DateField.jsx` (used by `LedgerDateRangeFilterModal.jsx:23`). Range
   validation follows `utils/ledgerListQuery.validateDateRanges`. Use `formatDateDMY` (`src/utils/dateFormat.js:20`) for
   display.
8. **Stale responses**: use `createLatestGuard` (`src/utils/searchableSelect.js:58-67`).

## Acceptance criteria
### A. Page, route, tabs
- A1. The Master Ledger submenu shows "Dashboards" (icon `MdInsertChart`) after SO Ledger. It routes to
  `/admin/ledger/dashboards` (exact).
- A2. The page header reads "Dashboards" with the subtitle "Master Ledger figures in USD". Tabs appear in the order of
  the table above. Only the active tab mounts and fetches (`isLazy`).
- A3. The active tab is kept in the URL (`?tab=cash|client-stats|destinations|turnover|regions|client-turnover`) via
  `history.replace`. An unknown or missing value opens the first tab. Reload and back/forward restore the tab.
- A4. Tabs come from one registry array. Adding a tab needs no change to the page component.

### B. Period filter (reusable component)
- B1. Presets: **Current FY** (default), **Previous FY**, **FY ...** (select from 2024/25 up to the current FY), and
  **Custom range** (From/To `DateField`). Today (2026-11-25) the current FY is 2026/27 = 2026-03-01..2027-02-28.
- B2. Interval select: **Month** (default), **Quarter** (FY quarters Mar-May, Jun-Aug, Sep-Nov, Dec-Feb) and **Total**.
  This is subject to user Q1.
- B3. Custom range: From and To are required, and From must not be after To. Invalid input shows an inline
  `FormErrorMessage` and sends no request. If the range spans more than 36 months with interval Month, show the
  validation message "Choose Quarter or Total for ranges over 36 months".
- B4. The resolved period is displayed as text, e.g. "01/03/2026 - 28/02/2027 (FY 2026/27)".
- B5. One period state is shared by all period tabs and persisted in sessionStorage `narvi_ledger_dashboards_state`
  (`{ tab, period, interval, clientId, regionFys }`). Corrupt stored state falls back to defaults.
- B6. Dates are sent as `YYYY-MM-DD`, inclusive, built from local date parts. Never use `toISOString` (it can shift the
  day across time zones).

### C. Common tab behaviour
- C1. Each tab shows four states:
  - **Loading**: spinner on first load; on reload, previous content dims to `opacity 0.6`.
  - **Error**: inline `Alert status="error"` with the API message and a "Retry" button, plus no toast spam (one toast
    at most per failed request). An HTTP 404 shows "This dashboard is not available on the server yet."
  - **Empty**: "No data for the selected period."
  - **Data**.
- C2. Only the latest response is applied: changing filters quickly never shows results for an older selection.
- C3. All amounts are shown in USD with 2 decimals using `formatDashboardMoney`. Margin shows as a percentage with
  1 decimal, or "—" when the backend sends `null` (sale = 0). Negative profit and margin show in theme `red.500`/`red.300`.
- C4. Charts are wrapped in an error boundary (copy `ChartErrorBoundary`). Chart colours come from theme tokens
  (`useToken`), with no new hex literals in components. Every chart has a table with the same numbers below it, which
  serves as the accessible fallback.
- C5. Long client/agent/destination/vessel names are truncated with a tooltip (copy `TruncatedText`, `cost/index.jsx:174-192`).
  Tables scroll horizontally on narrow widths.

### D. Dashboards
- D1. **Cash**:
  - Two stat tiles: Total outstanding to agents and Total outstanding from clients (USD), plus "as of <date>".
  - Below them, two tables, Agents and Clients, sorted by outstanding descending. Columns: Name, Outstanding USD,
    Overdue USD, Invoices, Oldest due date.
  - No period filter.
- D2. **Client Stats**:
  - Totals tiles: Turnover, Cost, Profit, Margin.
  - Table per client (Turnover, Cost, Profit, Margin), sortable client-side, default turnover descending, with a totals
    row taken from the backend `totals`.
  - Metric switch (Turnover | Profit | Margin) plus a "By period" toggle that pivots the table to clients x buckets
    for the chosen metric.
  - Horizontal bar chart of the top 10 clients by turnover.
- D3. **Destinations**:
  - Horizontal bar chart of the top 15 destinations by the backend's primary measure.
  - Table with every row and the fields the backend returns (proposed: Destination, Country, Agents, Invoices,
    Cost USD).
  - "By period" toggle as in D2.
  - Content is subject to backend question BQ4.
- D4. **Turnover**:
  - Bar chart per bucket with three series: Actual Sale, Actual Cost, Actual Profit. Profit can be negative, so the
    y-axis is not clamped at 0.
  - Totals tiles (Sale, Cost, Profit, Margin).
  - Table of buckets.
- D5. **Singapore / Greece**:
  - FY multi-select, default 2024/25, 2025/26 and 2026/27. Options run from 2024/25 to the current FY.
  - Two charts, "To Singapore" above "To Greece". Each has x-axis Mar..Feb and one series per selected FY, showing the
    sum of Actual Sales.
  - Months after today in the current FY are gaps (`null`), not 0.
  - Under each chart, a table of months x FYs with a total row and column.
  - If the backend returns an `unassigned` total above 0, show a muted note: "USD x not assigned to Singapore or Greece".
- D6. **Client Turnover**:
  - Requires a client (client `SearchableSelect`). With no client selected, show the prompt "Select a client to see
    turnover"; no request is sent.
  - Totals tiles.
  - Stacked bar chart per bucket by vessel: the top 8 vessels by turnover, the rest grouped as "Other vessels", plus
    "No vessel" if the backend sends one.
  - Vessel table: Vessel, Turnover, Cost, Profit, Margin.

### E. Quality
- E1. Pure logic lives in `src/utils/ledgerDashboardPeriod.js` and `src/utils/ledgerDashboardData.js`, each with a
  sibling test (see T1, T2, T7).
- E2. `src/api/ledgerDashboard.js` has a sibling test with mocked axios, copying `src/api/ledgerCost.test.js`. It
  checks params and normalisation for every endpoint.
- E3. No new dependencies. `SearchableSelect`, `DateField` and existing ledger screens are not modified.
- E4. `npm run check` passes.

## Files
### Create
| Path | Purpose |
|---|---|
| `src/utils/ledgerDashboardPeriod.js` (+ `.test.js`) | FY start month constant (`FY_START_MONTH = 3`), `fyStartYearOf(date)`, `fyLabel(startYear)` -> `"2024/25"`, `fyRange(startYear)` -> `{date_from, date_to}` (leap years), `fyOptions(firstStartYear, today)`, `resolvePeriod(state, today)` -> `{date_from, date_to, label}`, `validatePeriod(state)` -> errors, `toIsoDate(dateParts)` (local), `fyMonthKeys(startYear)` (12 `YYYY-MM`), `monthKeysBetween(from, to)`, `bucketKeys(from, to, interval)`, `bucketLabel(key, interval)` (`"Mar 2026"`, `"Q1 2026/27"`), `isFutureMonth(key, today)`. |
| `src/utils/ledgerDashboardData.js` (+ `.test.js`) | `fillBuckets(keys, rows, valueKey, { futureAsNull, today })` (zero-fill, drop out-of-range keys), `marginPct(profit, sale)` (null when sale is 0 or invalid; display fallback only), `formatMarginPct`, `topNWithOther(rows, n, valueKey, otherLabel)`, `pivotByBucket(rows, keys, metric)`, `sortRows(rows, key, order)`, `buildMoneyBarOptions(...)` / `buildRegionLineOptions(...)` (pure ApexCharts option builders taking colours as arguments). |
| `src/api/ledgerDashboard.js` (+ `.test.js`) | One function per dashboard: `getDashboardCash()`, `getDashboardClientStats(params)`, `getDashboardDestinations(params)`, `getDashboardTurnover(params)`, `getDashboardRegionSales({ fys })`, `getDashboardClientTurnover(params)`. Builds params (omits empty), `unwrapError`, `pickPayload`, returns the normalised shapes below with safe defaults (numbers coerced, arrays defaulted to `[]`). Errors keep `error.response.status` so the UI can detect 404. |
| `src/hooks/useLedgerDashboard.js` | `useLedgerDashboard(fetcher, params, { enabled })` -> `{ data, isLoading, error, reload }` with `createLatestGuard`. Params are compared by `JSON.stringify` key. |
| `src/components/ledger/dashboards/DashboardPeriodFilter.jsx` | Preset select + FY select + custom From/To + interval select + resolved-period text (B1-B4). Controlled `value`/`onChange`; props `showInterval`. |
| `src/components/ledger/dashboards/DashboardPanel.jsx` | Card wrapper with title and loading / error (Retry, 404 text) / empty / content slots (C1). |
| `src/components/ledger/dashboards/DashboardChart.jsx` | `ReactApexChart` + error boundary + empty state + `useToken` colours (C4). |
| `src/components/ledger/dashboards/DashboardStatTiles.jsx` | Row of USD/percent tiles (reuse `components/card/MiniStatistics` if it fits, otherwise a Chakra `Stat` grid). |
| `src/views/admin/ledger/dashboards/index.jsx` | Page shell, tab state <-> URL, shared filter state + sessionStorage, renders registry tabs. |
| `src/views/admin/ledger/dashboards/dashboardRegistry.js` | `[{ key, label, filter: "none" \| "period" \| "fyMulti", needsClient, Component }]`. |
| `src/views/admin/ledger/dashboards/tabs/{CashTab,ClientStatsTab,DestinationsTab,TurnoverTab,RegionSalesTab,ClientTurnoverTab}.jsx` | One thin component per dashboard. |

### Modify
| Path | Change |
|---|---|
| `src/config/api.js` | Add `LEDGER_DASHBOARD_CASH`, `_CLIENT_STATS`, `_DESTINATIONS`, `_TURNOVER`, `_REGION_SALES`, `_CLIENT_TURNOVER` in the Master Ledger block, with the comment "PROPOSED, pending backend confirmation" until confirmed. |
| `src/routes.js` | Import the page and add the "Dashboards" submenu item (A1). |
| `docs/API_CONTRACT.md` | Add the confirmed contract during `/update-docs` (not mid-feature). |

## State & API changes
- No Redux changes. Page state: `{ tab, period: { preset: "current"|"previous"|"fy"|"custom", fyStartYear, from, to },
  interval: "month"|"quarter"|"total", clientId, clientLabel, regionFys: number[] }`, persisted per B5.
- Request params built by `resolvePeriod` + the API module: `date_from`, `date_to`, `interval`, `client_id`,
  `fy` (repeated).

## PROPOSED backend contract (pending backend confirmation)
All endpoints are `GET` with query params, return USD, exclude cancelled ledger records and use the same error shape as
the ledger endpoints (`{status:"error", message}`). Dates are `YYYY-MM-DD`, inclusive. A bucket key is `YYYY-MM` for
month, `YYYY-Qn` for FY quarter (n = 1..4, where `YYYY` is the FY start year) and `"total"` for total.
`margin` is a ratio (0.125 = 12.5%), or `null` when sale = 0.

Common for period endpoints: params `date_from`, `date_to`, `interval=month|quarter|total`. The response includes
`period: {date_from, date_to, interval}` and `buckets: [{key, label, date_from, date_to}]` in chronological order.

1. `GET /api/ledger/dashboard/cash` (no params; optional `as_of`)
   ```json
   {"status":"success","as_of":"2026-11-25",
    "agents":{"total_usd":0,"overdue_usd":0,"count":0,
      "rows":[{"agent_id":1,"agent_name":"","outstanding_usd":0,"overdue_usd":0,"invoice_count":0,"oldest_due_date":"2026-10-01"}]},
    "clients":{"total_usd":0,"overdue_usd":0,"count":0,
      "rows":[{"client_id":1,"client_name":"","outstanding_usd":0,"overdue_usd":0,"invoice_count":0,"oldest_due_date":"2026-10-01"}]}}
   ```
2. `GET /api/ledger/dashboard/client-stats` (common params)
   ```json
   {"status":"success","period":{},"buckets":[],
    "totals":{"sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null},
    "rows":[{"client_id":1,"client_name":"","sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null,
             "by_bucket":[{"key":"2026-03","sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null}]}]}
   ```
3. `GET /api/ledger/dashboard/destinations` (common params)
   ```json
   {"status":"success","period":{},"buckets":[],
    "totals":{"cost_usd":0,"invoice_count":0,"agent_count":0},
    "rows":[{"destination":"","destination_country":"","agent_count":0,"invoice_count":0,"cost_usd":0,
             "by_bucket":[{"key":"2026-03","cost_usd":0,"invoice_count":0}]}]}
   ```
4. `GET /api/ledger/dashboard/turnover` (common params)
   ```json
   {"status":"success","period":{},"buckets":[],
    "totals":{"sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null},
    "series":[{"key":"2026-03","sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null}]}
   ```
5. `GET /api/ledger/dashboard/region-sales?fy=2024&fy=2025&fy=2026` (`fy` = FY start year, repeated)
   ```json
   {"status":"success",
    "regions":[{"key":"singapore","label":"Singapore",
                "years":[{"fy":2024,"label":"2024/25","total_usd":0,
                          "months":[{"key":"2024-03","sale_usd":0}]}]},
               {"key":"greece","label":"Greece","years":[]}],
    "unassigned":{"total_usd":0}}
   ```
6. `GET /api/ledger/dashboard/client-turnover` (common params + required `client_id`)
   ```json
   {"status":"success","period":{},"buckets":[],"client":{"id":1,"name":""},
    "totals":{"sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null},
    "vessels":[{"vessel_id":1,"vessel_name":"","sale_usd":0,"cost_usd":0,"profit_usd":0,"margin":null,
                "by_bucket":[{"key":"2026-03","sale_usd":0,"cost_usd":0,"profit_usd":0}]}]}
   ```
   Records without a vessel come back as `vessel_id: null, vessel_name: "No vessel"`.

## BACKEND REQUEST MESSAGE (ready to send)
> Hi, for the Master Ledger we need six read-only dashboard endpoints. The frontend will not call anything until you
> confirm or correct the paths, params and shapes below.
>
> **General rules**
> - All amounts in USD.
> - Cancelled cost and invoice records excluded.
> - Our financial year starts 01 March (FY 2024/25 = 2024-03-01..2025-02-28).
> - Period endpoints take `date_from` and `date_to` (YYYY-MM-DD, inclusive) and `interval` = `month`, `quarter` (FY
>   quarters: Mar-May, Jun-Aug, Sep-Nov, Dec-Feb) or `total`. They return `buckets: [{key, label, date_from, date_to}]`
>   in order. Please include empty buckets too.
> - Errors use the usual `{status:"error", message}`.
>
> **Definitions (agreed with the client)**
> - Actual Sale = sales invoice USD amount (Invoice DB `usd_amount`).
> - Actual Cost = cost ledger USD cost (Cost DB `usd_cost`).
> - Profit = Sale - Cost.
> - Margin = Profit / Sale, as a ratio, `null` when Sale is 0.
> - Please compute all of these server-side. Totals must be computed from summed values, not averaged per row.
>
> **Endpoints** (full JSON examples in our spec, section "PROPOSED backend contract")
> 1. `GET /api/ledger/dashboard/cash`: outstanding to agents and outstanding from clients, as of today. Totals plus one
>    row per agent/client: outstanding_usd, overdue_usd, invoice_count, oldest_due_date.
> 2. `GET /api/ledger/dashboard/client-stats`: per client sale/cost/profit/margin for the period, plus per bucket and
>    totals.
> 3. `GET /api/ledger/dashboard/destinations`: per destination, for agents who sent us an invoice: agent_count,
>    invoice_count, cost_usd, plus per bucket and totals.
> 4. `GET /api/ledger/dashboard/turnover`: sale/cost/profit/margin per bucket plus totals.
> 5. `GET /api/ledger/dashboard/region-sales?fy=2024&fy=2025&fy=2026`: sum of Actual Sales per month (Mar..Feb) per
>    FY, split into Singapore and Greece. Singapore = invoices issued by Martin, Alexandra, Bali. Greece = Igor, Tasos,
>    Amanta. Plus an `unassigned` total for anything else.
> 6. `GET /api/ledger/dashboard/client-turnover?client_id=..`: one client's sale/cost/profit/margin per bucket, split
>    by vessel (records without a vessel as "No vessel").
>
> **Questions for you**
> - BQ1. Singapore/Greece: which field decides "issued by"? Invoice record creator, the SO salesperson/responsible user,
>   or something else? Is the person list configurable (e.g. a user group or a field on the user) rather than hard-coded
>   names? How should records issued by anyone else be handled? (We propose returning them as `unassigned`.)
> - BQ2. Outstanding to agents: is it cost records with no `date_agent_paid`, summed as `usd_cost`, or is there a
>   partial-payment amount? Is "overdue" = `date_due_agent` before today?
> - BQ3. Outstanding from clients: is it invoice records with `invoice_balance_usd` > 0, or `payment_status` not
>   paid? Is "overdue" = `date_due` before today?
> - BQ4. Destinations: what should be aggregated? We propose cost records that have an agent invoice (invoice number or
>   `date_agent_invoice` set), grouped by the cost record's `destination`, with agent count, invoice count and cost
>   USD. Should it also show sales/profit per destination?
> - BQ5. Which date puts a record into a period/bucket? We propose sales by `date_sales_invoice` and costs by
>   `date_agent_invoice`. Alternatively everything by SO date, so that the profit of one SO lands in a single month.
>   Records missing that date: excluded, or bucketed by another date?
> - BQ6. Client turnover per vessel: is the vessel taken from the SO? What happens to multi-vessel SOs?
> - BQ7. Can you confirm GET with query params, and repeated `fy=` keys (our axios sends arrays as repeated keys
>   without `[]`)?
> - BQ8. Should these endpoints have permission/role restrictions beyond Master Ledger access?
> - BQ9. Earliest FY with data (we plan to offer FYs starting 2024/25)?

## Edge cases
- **FY boundaries and leap years**: 2024-02-29 falls in FY 2023/24. FY 2027/28 ends 2028-02-29. 01 March belongs to the
  new FY. Covered by T1 tests.
- **Time zones**: all dates come from local parts. A date picked late in the evening must not shift a day (B6).
- **Custom ranges that cut through a month or quarter**: the backend labels partial buckets. The frontend shows
  `buckets` as returned and does not re-bucket. `fillBuckets` only zero-fills keys the backend omitted.
- **Current FY future months**: `null` (gap) in region charts and "—" in tables. In period charts, buckets after
  today are shown as returned.
- **Zero sale / negative profit**: margin is `null` and shows "—". Negative values are red, and the axis allows
  negatives.
- **Many clients/destinations**: charts show the top N. Tables show all rows. Very wide pivots scroll horizontally,
  with the first column sticky (copy the sticky pattern from `cost/index.jsx:1283-1289`).
- **Client Turnover with a client that has no records**: empty state. A client removed from master data still shows
  via `clientLabel` (the `fallbackDisplay` pattern).
- **Endpoint not deployed (404)**: per-tab message (C1). Other tabs keep working.
- **Rapid tab or filter switching**: latest-wins (C2). Tabs unmount when inactive, and late responses for an
  unmounted tab are ignored.
- **Response missing fields or using the `result` wrapper**: the API module normalises with defaults and never throws
  on missing optional arrays.
- **Persisted state from an older FY list** (e.g. a stored FY outside the options): fall back to Current FY.

## Out of scope
- Backend implementation, and any endpoint beyond the six proposed.
- PDF/Excel export of dashboards (could follow later using the existing jspdf/xlsx patterns).
- Drill-down from a dashboard to Cost DB / Invoice DB lists.
- Currencies other than USD, and computing figures client-side from list endpoints.
- Changes to the main `/admin/default` dashboard or its `dashboardUtils.js`.
- Additional dashboards beyond the six (the registry makes them cheap to add later).

## Open questions for the user (each with a proposed default)
1. **Interval**: is Month / Quarter / Total enough for "distributed across a year or selected periods"? *Default:* yes;
   Month is the default.
2. **Region FYs**: fixed to 2024/25, 2025/26, 2026/27, or the user's choice? *Default:* multi-select, defaulting to those
   three, with new FYs appearing automatically.
3. **Cash with no period**: should Cash be a snapshot as of today only? *Default:* yes, no filter.
4. **Top-N sizes**: Client Stats top 10, Destinations top 15, vessels top 8 + "Other". *Default:* as stated.
5. **Bucket dates (BQ5)**: is invoice date (sales) / agent invoice date (costs) right, or should everything go by SO
   date? *Default:* invoice dates, pending the backend answer.
6. **Access**: should every user who sees Master Ledger see Dashboards? *Default:* yes, same as the other submenu
   items.
7. **Sequencing**: may the developer build T6-T12 against the proposed contract before the backend confirms it?
   *Default:* yes, but nothing ships until the contract is confirmed and the API module is aligned (T13).

## Tasks
Each task ends with `npm run lint:changed` and `npm run test:ci` passing. Commit per task on `staging` only if the
workflow step says so.

- **T1. FY/period utils.** `src/utils/ledgerDashboardPeriod.js` + tests:
  - `fyStartYearOf` for 2025-02-28 (2024), 2025-03-01 (2025) and 2024-02-29 (2023)
  - `fyRange(2023).date_to === "2024-02-29"` and `fyRange(2024)` = 2024-03-01..2025-02-28
  - `fyLabel(2024) === "2024/25"`
  - `fyOptions(2024, 2026-11-25)` -> 2024, 2025, 2026
  - `resolvePeriod` for each preset
  - `validatePeriod` (missing dates, from > to, >36 months with month)
  - `fyMonthKeys(2026)` = 2026-03..2027-02
  - `bucketKeys` for month/quarter/total, and quarter labels
  - `isFutureMonth`
  - `toIsoDate` produces no TZ shift

  *Verify:* tests pass.
- **T2. Data utils (part 1).** `src/utils/ledgerDashboardData.js` + tests:
  - `fillBuckets` (missing -> 0, future -> null when asked, unknown keys dropped)
  - `marginPct` (sale 0 -> null, negative profit)
  - `formatMarginPct` (null -> "—", 0.1234 -> "12.3%")
  - `topNWithOther` (sums the rest, no "Other" when ≤ N)
  - `pivotByBucket`
  - `sortRows` (numbers, nulls last)

  *Verify:* tests pass.
- **T3. Endpoint config + API module skeleton.**
  - Add the six `LEDGER_DASHBOARD_*` entries (labelled PROPOSED) to `src/config/api.js`.
  - Create `src/api/ledgerDashboard.js` with the six functions: param building (omit empty, repeated `fy`),
    `unwrapError`, `pickPayload` and normalisers to the shapes above.
  - Tests with mocked `api.get`: URLs, params, `result` wrapper, missing arrays, number coercion, and an error status
    that throws with `response.status` kept.

  *Verify:* tests pass.
- **T4. Hook + shared panels.**
  - `src/hooks/useLedgerDashboard.js` (latest-wins, `enabled`, `reload`).
  - `DashboardPanel.jsx` (C1 states incl. 404 text).
  - `DashboardChart.jsx` (error boundary, `useToken` colours, empty state).
  - `DashboardStatTiles.jsx`.

  *Verify:* lint passes. A temporary story render is not needed; manual check happens in T6.
- **T5. Page shell, period filter, route.**
  - `DashboardPeriodFilter.jsx` (B1-B4).
  - `views/admin/ledger/dashboards/index.jsx` + `dashboardRegistry.js` (tabs, `?tab=`, shared state, sessionStorage per
    B5, filter shown per the tab's `filter`/`needsClient`).
  - Route + submenu in `src/routes.js` (A1).
  - Tabs render placeholders.

  *Verify:* by hand: sidebar item, URL tab persistence, presets resolve to the expected text, custom range validation
  messages, and reload restores state.
- **T6. Turnover tab** (D4): the simplest one, and it proves the chain API -> hook -> panel -> chart.
  `buildMoneyBarOptions` in the data util with a unit test (negative axis allowed, money formatter).

  *Verify:* with the backend or a stubbed 404, the error state shows "not available yet". With data, the chart, tiles
  and table match.
- **T7. Data utils (part 2).** `buildRegionLineOptions` (x-axis Mar..Feb labels, one series per FY, nulls kept) +
  tests.

  *Verify:* tests pass.
- **T8. Singapore / Greece tab** (D5): FY multi-select, two charts stacked (Singapore first), month x FY tables with
  totals, and the unassigned note.

  *Verify:* by hand per D5.
- **T9. Client Stats tab** (D2): tiles, sortable table with totals row, metric switch + "By period" pivot, top-10
  chart.

  *Verify:* by hand per D2.
- **T10. Destinations tab** (D3).

  *Verify:* by hand per D3.
- **T11. Client Turnover tab** (D6): client select (master data pattern), no request without a client, and the vessel
  stacked chart via `topNWithOther`.

  *Verify:* by hand per D6.
- **T12. Cash tab** (D1): tiles + two tables, no filter.

  *Verify:* by hand per D1.
- **T13. Contract alignment (backend answers received; done).**
  - Update `src/config/api.js` (remove the PROPOSED comment) and `src/api/ledgerDashboard.js` normalisers to the
    confirmed contract.
  - Adjust the tests.
  - Record the contract in this spec.

  *Verify:* tests pass, and each tab loads real data.
- **T14. Full check + docs hand-off.** Run `npm run check`. Hand the confirmed contract to `/update-docs` for
  `docs/API_CONTRACT.md`. Note the manual QA results.

  *Verify:* check passes.

## Backend answers (confirmed)

Confirmed by the backend developer. Endpoints and paths are unchanged; implementation on the server is pending.

- **Undated records.** `client-stats`, `destinations`, `turnover` and `client-turnover` also return
  `undated: { count, sale_usd?, cost_usd?, ... }` for records with no date. Exact fields are not fixed, so the
  frontend keeps `count` and any `*_usd` numbers, and shows a muted note ("N records without a date are not
  included", with USD when present). It must not break when the block is absent.
- **Available FY.** Responses return `available_fy: { first, last }` (FY start years), possibly an array. The API
  module exposes `available_fy: { first, last } | null`. When present, the FY options and the Region sales FY list
  run from `first` to `last`; otherwise `FIRST_DASHBOARD_FY` and the current FY apply.
- **Destinations.** Rows and totals also carry `sale_usd`, `profit_usd` and `margin` (null margin shows "—").
  The "By period" pivot is unchanged (cost).
- **Errors.** Bad date, interval or a missing client return HTTP 400 with the usual error shape. The panel shows the
  server message. 404 keeps "This dashboard is not available on the server yet."
- **Cash and Region sales.** Cash returns `as_of` (already handled). Region sales for a future FY returns zeros.

### Implemented shapes

The backend is implemented. Its shapes differ from the proposed ones; the normalisers in
`src/api/ledgerDashboard.js` accept both and never throw on missing fields.

- **`undated`** is `{ sale: { count, usd }, cost: { count, usd } }` (old flat `{ count, *_usd }` still accepted).
  Note text: "N sales records ($X) and M cost records ($Y) without a date are not included"; nothing when both counts are 0.
- **`available_fy`** is `{ from, to, from_label, to_label, fys: [{ fy, label }] }`. `{ first, last }` = min/max of
  `fys[].fy`, else numeric `from` / `to`. FY 2025 = 2025/26. `{ first, last }` and arrays are still accepted.
- **Per-bucket list** in rows (client-stats, destinations, client-turnover vessels) and totals is named `buckets`
  (keyed by `key`) instead of `by_bucket`; exposed to the tabs as `by_bucket`. Quarter keys are `2025-Q1`..`2025-Q4`.
  Margin is null when sale is 0.
- **Cash (confirmed with real data)**: top-level `as_of`; `agents` / `clients` each `{ totals, rows }`. Totals are
  `{ outstanding_usd, overdue_usd, invoice_count, agent_count }` (clients: `client_count`). Rows use `agent` / `client`
  for the NAME (plus `agent_id` / `client_id`, `outstanding_usd`, `overdue_usd`, `invoice_count`, `oldest_due_date`),
  already sorted by outstanding desc. `oldest_due_date` is YYYY-MM-DD or the boolean `false` (shown as "—"). Normalised
  `count` = agent_count / client_count (fallback rows.length); `invoice_count` is also exposed (not shown in CashTab).
- **Period endpoints**: the period is top-level `date_from`, `date_to`, `interval` (no `period` object; the old object is
  still accepted). `buckets` are `{ key, label, date_from, date_to }`; row and total `buckets` are
  `{ key, sale_usd, cost_usd, profit_usd, margin }`, empty periods included with zeros and null margin.
- **Client-stats (confirmed)**: rows are `client_id` + `client` (name), plus the bucket lists above; totals also carry `buckets`.
- **Destinations (confirmed)**: rows use `destination` (string), `agent_count`, `invoice_count`, `sale_usd`, `cost_usd`,
  `profit_usd`, `margin`, and `buckets` (per bucket incl. `agent_count` / `invoice_count`); totals carry `buckets` too.
  `undated.cost` counts only cost lines that have an agent invoice number. Normaliser also still accepts
  `destination_name | name`, `destination_country | country`.
- **Client-turnover (confirmed)**: response has `client: { id, name }`, `buckets`, `totals` (with `buckets`),
  `undated`, and the vessel list under `rows` (old name `vessels` still accepted; exposed as `vessels`). Each row is
  `{ vessel_id, vessel, sale_usd, cost_usd, profit_usd, margin, buckets }`. `vessel_id` is boolean `false` for the
  "No vessel" row (name "No vessel", always last) -> normalised to `null`. That row's `buckets` may be a single
  `{ key: "total" }` entry even on a quarter interval: the table and totals include it, but ClientTurnoverTab leaves its
  series out of the stacked chart when none of its bucket keys match the response buckets (`hasMatchingBucket`).
- **Region sales (confirmed)**: `{ status, regions: ["singapore","greece"], fys: [{ fy, label, date_from, date_to,
  months: [{ key, label, singapore_usd, greece_usd, unassigned_usd, total_usd }], totals: { singapore_usd, greece_usd,
  unassigned_usd, total_usd } }], available_fy }`. `regions` is an array of strings; the old region-object path is only
  used when its entries are objects. FY total per region = `totals.<region>_usd` when present, else sum of months;
  unassigned = sum of each FY's `totals.unassigned_usd` (else of months).
