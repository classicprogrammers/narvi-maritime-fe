# 005-tariff-last-updated: "Last Updated" column and stale-rate warning on Agent + Client Tariffs

Status: Spec revised for the whole-set warning (awaiting CP1)
Branch: `staging` (no feature branch, no commits by the architect). The uncommitted 004-ledger-dashboards files in the
same tree must not be touched or committed with this feature.
UI details: `docs/specs/005-tariff-last-updated-ui.md` (reconciled with this spec; where they differ, this spec wins, see
"Reconciliation with the UI spec").

## Goal
On the Agent Tariffs (`src/views/admin/quotations/agent-tariffs.jsx`) and Client Tariffs
(`src/views/admin/quotations/client-tariffs.jsx`) screens, show when each rate was last updated, and warn the user when ANY
rate matching the current filters, search and active setting (across all pages, not only the loaded page) is older than 12
months: "Rates in this tariff seem to be old, please check". This applies to ALL charge types (Standard, If Apply, DOB If
Apply, ...). It only shows a warning: nothing is hidden, sorted or filtered differently.

"VIEW mode" means these two listing screens. Both are read-only lists (rates are edited in the Rate List / `RateListForm.jsx`,
which is out of scope). Client Tariffs also has delete, copy and selection, and those stay as they are.

## Backend contract (confirmed by the user; no endpoint or param changes)
- `GET /api/agent/rate/tariff` (`getAgentRateTariffsApi`, `src/api/rate.js:50-53`) and `GET /api/client/rate/tariff`
  (`getClientRateTariffsApi`, `src/api/rate.js:66-69`).
- **Per row**: every row of `data[]` has `last_update`: a `"YYYY-MM-DD"` string, or boolean `false` when unknown.
- **List meta**: the response has `oldest_last_update` at the top level, next to `total_count` / `total_pages` /
  `has_next` / `has_previous`. Value = the oldest `last_update` (`"YYYY-MM-DD"`) across ALL rows matching the current
  filters, search and active setting, or `false` when no matching row has a date. Rows with no date are ignored. The value is
  the same with or without `fetch_all` and on any page.
- `last_update` changes only when the rate, sales rate, calculation or currency changes. The backend handles this, and the
  frontend does nothing about it.
- No new endpoint, param or payload. `src/config/api.js` and `src/api/rate.js` are not changed.
- Record both fields in `docs/API_CONTRACT.md` during `/update-docs`.

## Research findings (load-bearing)
1. **No normalizer drops the fields.** `getAgentRateTariffsApi` / `getClientRateTariffsApi` return `response.data` unchanged
   (no `unwrapRateApiData`, no mapping). Both screens read the list meta straight off that object:
   - Agent: `setRows(...result.data...)` at `agent-tariffs.jsx:158`, `setMeta({ totalCount: result.total_count || 0,
     totalPages: result.total_pages || 1, hasNext, hasPrevious })` at `:159-164`; error reset `setMeta({...})` at `:167`;
     initial state `useState({ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false })` at `:103`.
   - Client: `setRows` at `client-tariffs.jsx:224`, `setMeta({...})` at `:226-231` (`result.total_count` at `:227`), error
     reset at `:235`, initial state at `:158`.
   So `row.last_update` is already on screen, and `result.oldest_last_update` only needs to be copied into `meta` beside
   `totalCount`. `agentTariffState.js` / `clientTariffState.js` persist filters, pins, search, page, fetchAll and remarks,
   never rows or meta, so nothing new is persisted.
2. **Table rendering.** `TariffTable.jsx:133-148` renders each cell as `displayTariffValue(column.render ? column.render(row)
   : row[column.key])`. `displayTariffValue` (`tariffScreenUtils.js:5-8`) returns `"-"` for `false`/null/empty, otherwise
   `String(value)`. A React element would print as `"[object Object]"`, so the styled cell needs an optional
   `column.renderCell(row)` in `TariffTable` (see Files).
3. **Column lists and exports (why the new column must stay screen-only).**
   - Agent: `COLUMNS` (`agent-tariffs.jsx:61-69`) is used both on screen (`:426`) and for the Excel export through
     `EXCEL_COLUMNS = COLUMNS.filter(...)` (`:72`, used at `:230-231`). The new column goes into a new screen-only list.
   - Client: `COLUMNS` (`client-tariffs.jsx:81-87`) feeds `PDF_COLUMNS` / `PDF_COLUMNS_NO_CURRENCY` (`:106-108`, PDF and
     Excel). The screen already uses a separate `SCREEN_COLUMNS` (`:91-99`, used at `:698`). The new column is appended to
     `SCREEN_COLUMNS` only.
   - `typeTariffPdf.js:11-16`, `rateListPdf.js` (`buildPdfModel`) and `rateListExcel.js` (`downloadSheetAsExcel`, whose
     `last_update` handling at `:25, :32` belongs to the Rate List export) do not change.
4. **Existing date helpers.** `formatDateDMY` (`src/utils/dateFormat.js:20-34`) is the app-wide DD/MM/YYYY display rule and is
   reused for the cell text. `toDateInputValue` (`src/utils/rateListForm.js:84-98`) is lenient (accepts D/M/Y), so it is NOT
   reused for the age rule, which needs a strict parse.
5. **Closest patterns.**
   - Pure helper + sibling test: `src/utils/clientTariffSections.js` + `clientTariffSections.test.js`,
     `src/utils/dateFormat.js` + `dateFormat.test.js`.
   - Inline warning banner: Chakra `Alert` + `AlertIcon` in `src/views/admin/quotations/CopyTariffModal.jsx:246-251` and the
     warning variant in `src/components/ledger/LedgerAutoTag.jsx`.
   - Compact Badge override: `src/components/stock-list/StockReportGenerateModal.jsx`.
   - Column with `render`: `client-tariffs.jsx:84, 92, 97`.
6. **No component tests exist under `src/views/admin/quotations/`.** This spec follows docs/TESTING.md and tests the pure
   helper. Screen wiring (meta, column, banner) is verified by QA in the browser.

## Scope
In scope:
- New pure helper `src/utils/tariffRateAge.js` (+ `tariffRateAge.test.js`) with the 12-month constant.
- "Last Updated" column on the Agent Tariffs and Client Tariffs on-screen tables (per-row, from loaded rows).
- Whole-set stale-rate warning banner on both screens, driven by `meta.oldestLastUpdate`.
- `TariffTable.jsx`: optional `column.renderCell(row)` (backwards compatible).
- `meta.oldestLastUpdate` on both screens (initial, success, error reset).

## Out of scope
- PDF exports (`typeTariffPdf.js`, `rateListPdf.js`, Client Tariffs PDF) and Excel exports (`rateListExcel.js`, both tariff
  Excel buttons): no Last Updated column, no warning.
- Rate List screen, `RateListForm.jsx`, CopyTariffModal, quotation screens, AgentDetail/ClientDetail "Tariffs" tabs.
- Any sort, filter, hide or "only old rates" option. No sorting by Last Updated.
- Any count of old rates ("N of M") in the banner; the backend gives only the oldest date, not a count.
- Setting or editing `last_update` (the backend owns it).
- Changing `displayTariffValue`'s `"-"` for the other columns.
- Persisting anything new in session storage. Any extra request.

## Helper API (`src/utils/tariffRateAge.js`, pure, no React, no imports except `formatDateDMY`)
```js
export const TARIFF_RATE_MAX_AGE_MONTHS = 12;            // the ONLY place the threshold lives
export const RATE_AGE = { OK: "ok", OLD: "old", UNKNOWN: "unknown" };
export const UNKNOWN_LAST_UPDATE_TEXT = "—";             // U+2014 em dash
export const STALE_TARIFF_WARNING = "Rates in this tariff seem to be old, please check";
export const OLD_RATE_HINT = `Last updated more than ${TARIFF_RATE_MAX_AGE_MONTHS} months ago`; // badge tooltip

/** Strict parse of a backend date value. Returns a local-midnight Date, or null when unknown. */
export function parseLastUpdate(value) {}

/** "ok" | "old" | "unknown". `today` defaults to new Date(); only its calendar date is used. */
export function getRateAgeStatus(lastUpdate, today = new Date()) {}

/** True only when getRateAgeStatus(...) === "old". Used for the per-row badge AND for meta.oldestLastUpdate. */
export function isRateOld(lastUpdate, today = new Date()) {}

/** Cell text: "DD/MM/YYYY" (via formatDateDMY) or "—" when unknown. */
export function formatLastUpdate(lastUpdate) {}
```
There is no `hasOldRates(rows)`: the banner never scans loaded rows.

Rules:
- **parseLastUpdate**: accepts only a string that, after trim, matches `^(\d{4})-(\d{2})-(\d{2})$`, or the same date followed
  by `T` or a space and a time (e.g. `"2025-03-01 10:00:00"`, tolerated defensively; only the date part is used). The date
  must be a real calendar date (`"2025-02-30"`, `"2025-13-01"`, `"0000-00-00"` give null). The Date is built as
  `new Date(y, m - 1, d)` (local; never `new Date("YYYY-MM-DD")`, which is UTC). Anything else gives null: `false`, `true`,
  `null`, `undefined`, `""`, `"   "`, numbers, Date objects, `"01/03/2025"`, `"2025-3-1"`, `"abc"`, `"false"`.
- **Cutoff** = the calendar date of `today` minus `TARIFF_RATE_MAX_AGE_MONTHS` months, clamped to the target month's last day
  when that day does not exist (today 2024-02-29 gives cutoff 2023-02-28). Time of day is ignored.
- **getRateAgeStatus**: unparseable -> `"unknown"` (never old); parsed date **strictly before** cutoff -> `"old"`; otherwise
  (on/after cutoff, including today and **future dates**) -> `"ok"`; `today` not a valid Date -> `"unknown"`.
  "Exactly 12 months" is **ok**: with today 2026-11-25, `"2025-11-25"` -> ok and `"2025-11-24"` -> old.
- **isRateOld**: `getRateAgeStatus(lastUpdate, today) === RATE_AGE.OLD`. Charge type is never consulted.
- **formatLastUpdate**: null parse -> `"—"`; otherwise `formatDateDMY` of the normalized `YYYY-MM-DD`
  (`"2025-03-01 10:00:00"` -> `"01/03/2025"`). Never returns `"-"`, `""`, `"false"` or raw bad text.

Why the whole-set check is correct: `oldest_last_update` is the minimum date over all matching dated rows, so "any matching
rate is old" is equivalent to "the oldest one is old". `isRateOld(meta.oldestLastUpdate)` is therefore the whole-set check.

## State change (both screens)
`meta` gains one key, `oldestLastUpdate`, next to `totalCount`:
- Initial state: `{ totalCount: 0, totalPages: 1, hasNext: false, hasPrevious: false, oldestLastUpdate: false }`
  (`agent-tariffs.jsx:103`, `client-tariffs.jsx:158`).
- Success: `oldestLastUpdate: result.oldest_last_update ?? false` beside `totalCount: result.total_count || 0`
  (`agent-tariffs.jsx:159-164`, `client-tariffs.jsx:226-231`). The raw value is stored; validation happens in the helper
  (a missing, `null`, `false` or invalid value is "unknown" and gives no banner).
- Error reset: same object as the initial state, including `oldestLastUpdate: false` (`agent-tariffs.jsx:167`,
  `client-tariffs.jsx:235`).
`rows` stay raw and unchanged. Nothing new is persisted or sent.

## UI: where the column and the warning go
Visual details (badge, colors, a11y) come from `docs/specs/005-tariff-last-updated-ui.md` sections 2, 3, 4, 7, 8. The
behaviour below is the contract.

**Column** `LAST_UPDATED_COLUMN = { key: "last_update", label: "Last Updated", renderCell: (row) => <TariffLastUpdated
value={row.last_update} /> }`:
- Agent Tariffs: new screen-only `SCREEN_COLUMNS = [...COLUMNS, LAST_UPDATED_COLUMN]` passed to `TariffTable`
  (`agent-tariffs.jsx:426`). `COLUMNS` and `EXCEL_COLUMNS` unchanged. Last data column, after "Sales".
- Client Tariffs: appended to the existing `SCREEN_COLUMNS` (`client-tariffs.jsx:91-99`), after "Shipment Type", before the
  delete action column. `COLUMNS` / `PDF_COLUMNS` unchanged.
- Cell (`TariffLastUpdated`, per loaded row): text from `formatLastUpdate(value)`. When `isRateOld(value)`: date text in
  `orange.600` / `orange.300` (`useColorModeValue`) + compact `Badge colorScheme="orange" variant="subtle"` "Old" with a
  `Tooltip hasArrow` label `OLD_RATE_HINT`. ok: plain date, normal cell text. unknown: `"—"` in the muted pair
  (`gray.500` / `gray.400`) with `aria-label="Last updated unknown"`, no badge. `HStack spacing="2"`, `whiteSpace="nowrap"`.

**Banner** `TariffStaleBanner({ oldestLastUpdate })`:
- Renders `null` unless `isRateOld(oldestLastUpdate)`. Otherwise Chakra `Alert status="warning" variant="subtle"
  borderRadius="md" mb="4" role="status"` + `AlertIcon`, single line of text exactly `STALE_TARIFF_WARNING`
  (`fontWeight="600"`, wraps on narrow screens). No count line, no "on this page" wording, not dismissible.
- Screen gate: rendered only when `!loading && meta.totalCount > 0`, i.e.
  `{!loading && meta.totalCount > 0 && <TariffStaleBanner oldestLastUpdate={meta.oldestLastUpdate} />}`.
  So it is hidden while loading, on error (meta reset), and on an empty list.
- Placement: directly above `<TariffTable>`, outside its card. Agent: after the filter `SimpleGrid` (`:363-423`). Client:
  after the Remarks `FormControl` (`:667-695`).
- Because the value is whole-set, the banner is identical on every page and with fetch all on or off for the same filters.

## Data flow
`GET .../rate/tariff` -> `result.data` -> `rows` (raw) -> `TariffTable` `column.renderCell(row)` -> `TariffLastUpdated`
-> `formatLastUpdate` + `isRateOld(row.last_update)`.
`GET .../rate/tariff` -> `result.oldest_last_update` -> `meta.oldestLastUpdate` -> `TariffStaleBanner` ->
`isRateOld(oldestLastUpdate)`.
`today` = `new Date()` at render time (no state, no timer). The two paths are independent: the per-row badge reflects the
loaded rows, the banner reflects the whole filtered set.

## Reconciliation with the UI spec (`005-tariff-last-updated-ui.md`)
- TariffTable extension: **`column.renderCell(row)`** (UI spec section 10.1). The earlier "pass React elements through
  `render`" approach is dropped.
- Components: two files beside `TariffTable` (UI spec section 10.2): `TariffLastUpdated.jsx` (cell + `LAST_UPDATED_COLUMN`)
  and `TariffStaleBanner.jsx` (banner taking `oldestLastUpdate`).
- Old marker: "Old" Badge + tooltip + orange date (UI spec section 3), replacing the earlier `MdWarning` icon idea.
- Banner: the UI spec's optional second line "N of M rates on this page..." (section 4) and the "Some old / count" wording in
  its states table (section 5) are **superseded**: single-line text only, driven by `oldestLastUpdate`, not by loaded rows.
  UI spec open item 1 (page scope) is resolved by the backend field.
- The UI spec file is not edited by this revision; the ui-designer/developer follow this section where they differ.

## Files
Create:
- `src/utils/tariffRateAge.js` (helper API above)
- `src/utils/tariffRateAge.test.js`
- `src/views/admin/quotations/TariffLastUpdated.jsx` (default `TariffLastUpdated({ value })`, named `LAST_UPDATED_COLUMN`)
- `src/views/admin/quotations/TariffStaleBanner.jsx` (default `TariffStaleBanner({ oldestLastUpdate })`)

Modify:
- `src/views/admin/quotations/TariffTable.jsx`: in the cell (`:133-147`) render `column.renderCell ? column.renderCell(row) :
  displayTariffValue(column.render ? column.render(row) : row[column.key])`. Update the JSDoc (`renderCell?(row)` returns a
  node and bypasses `displayTariffValue`). No other change; existing `render` columns behave identically.
- `src/views/admin/quotations/agent-tariffs.jsx`: `meta.oldestLastUpdate` (initial/success/error), import, `SCREEN_COLUMNS`,
  pass it to `TariffTable`, gated `<TariffStaleBanner>` above the table.
- `src/views/admin/quotations/client-tariffs.jsx`: `meta.oldestLastUpdate` (initial/success/error), import, append
  `LAST_UPDATED_COLUMN` to `SCREEN_COLUMNS`, gated `<TariffStaleBanner>` above the table.

Not modified: `src/api/rate.js`, `src/config/api.js`, `agentTariffState.js`, `clientTariffState.js`,
`clientTariffSections.js`, `tariffScreenUtils.js`, `typeTariffPdf.js`, `rateListPdf.js`, `rateListExcel.js`.
Docs (after CP4, `/update-docs`): `docs/API_CONTRACT.md` (`last_update` per row, `oldest_last_update` in list meta, both
endpoints), `docs/PROGRESS.md`.

## Acceptance criteria
1. Agent Tariffs and Client Tariffs tables each show a "Last Updated" column (header "LAST UPDATED" via the existing uppercase
   header style). It is the last data column, before Client Tariffs' delete column.
2. A row with `last_update: "2025-03-01"` shows `01/03/2025`. A row with `false`, missing, `null` or an invalid string shows
   `—` (em dash) and never `-`, `false` or the raw text.
3. With today = 2026-11-25: a row with `"2025-11-24"` shows the orange date + "Old" badge; `"2025-11-25"`, `"2026-11-25"` and
   `"2027-01-01"` show a plain date.
4. Banner is driven only by the response's `oldest_last_update`:
   a. `oldest_last_update` old (e.g. `"2025-11-24"` with today 2026-11-25) and `total_count > 0` -> the banner "Rates in this
      tariff seem to be old, please check" appears directly above the table, **even when no row on the current page is
      old**.
   b. `oldest_last_update` ok, future, `false`, `null`, missing or invalid -> no banner, **even if** a loaded row were old
      (not expected from a consistent backend, but the rows are never scanned for the banner).
   c. No banner while loading, after a failed load, or when `total_count` is 0.
   d. Same filters on page 1, page N and with fetch all on/off -> same banner state.
   e. The banner text has no count and no "on this page" wording.
5. The rule applies to every charge type. There is no charge-type branch in the code.
6. Row order, pagination, fetch all, filters, search, selection, delete and copy behave exactly as before. No rows are hidden.
   No extra request is made.
7. The Agent Excel, Agent Export/Import+DOB PDFs, Client Excel and Client PDFs are unchanged in columns (no Last Updated
   column, no warning).
8. The value `12` appears once in the code (`TARIFF_RATE_MAX_AGE_MONTHS`). Changing it changes the cell badge, its tooltip
   text and the banner.
9. Colors come from Chakra theme tokens through `useColorModeValue` / `colorScheme` / `status` (no hex). Light and dark mode
   are both readable.
10. Existing `TariffTable` columns (with and without `render`) render exactly as before.
11. `npm run check` passes. `tariffRateAge.test.js` covers the test list below.

## Test list (`src/utils/tariffRateAge.test.js`, fixed `today = new Date(2026, 10, 25)` unless stated)
parseLastUpdate:
- `"2025-03-01"` -> local Date 2025/2/1. `" 2025-03-01 "` -> same.
- `"2025-03-01 10:00:00"` and `"2025-03-01T10:00:00Z"` -> 2025-03-01.
- null for: `false`, `true`, `null`, `undefined`, `""`, `"  "`, `0`, `20250301`, `new Date()`, `"false"`, `"abc"`,
  `"01/03/2025"`, `"2025-3-1"`, `"2025-02-30"`, `"2025-13-01"`, `"0000-00-00"`.

getRateAgeStatus:
- unknown for every null case above (explicitly `false`, `null`, `undefined`, `"bad"`).
- `"2025-11-25"` (exactly 12 months) -> ok. `"2025-11-24"` -> old. `"2020-01-01"` -> old.
- `"2026-11-25"` (today) -> ok. `"2026-12-31"` (future) -> ok.
- Time of day ignored: today `new Date(2026, 10, 25, 23, 59)` gives the same results.
- Leap day: today `new Date(2024, 1, 29)`: `"2023-02-28"` -> ok, `"2023-02-27"` -> old.
- Month end: today `new Date(2026, 2, 31)`: `"2025-03-31"` -> ok, `"2025-03-30"` -> old.
- Invalid `today` (`new Date("x")`) -> unknown.
- `TARIFF_RATE_MAX_AGE_MONTHS === 12`.
- Default `today`: with `jest.useFakeTimers().setSystemTime(new Date(2026, 10, 25))`, `getRateAgeStatus("2025-11-24")`
  -> old (restore real timers after).

isRateOld (whole-set check on `oldest_last_update`, same function as the per-row badge):
- `"2025-11-24"` -> true; `"2025-11-25"`, `"2026-11-25"`, `"2027-01-01"` -> false.
- Backend "no dated rows" value `false` -> false. `null`, `undefined` (field missing), `""`, `"bad"`, `"2025-02-30"`
  -> false.
- Invalid `today` -> false.
- Default `today` with fake timers as above -> `isRateOld("2025-11-24") === true`.

formatLastUpdate:
- `"2025-03-01"` -> `"01/03/2025"`. `"2025-03-01 10:00:00"` -> `"01/03/2025"`.
- `false`, `null`, `undefined`, `""`, `"bad"`, `"2025-02-30"` -> `"—"` (and `UNKNOWN_LAST_UPDATE_TEXT === "—"`).

Constants:
- `STALE_TARIFF_WARNING` equals the exact required text.
- `OLD_RATE_HINT === "Last updated more than 12 months ago"`.

Screen wiring (not unit-tested; no component tests exist for these screens): `meta.oldestLastUpdate` on
initial/success/error, `renderCell` in `TariffTable`, the column, and the banner gate are verified by QA in the browser (needs
a backend): ACs 1-10 on both screens, including a filter set whose only old rate is on page 2 (banner visible on page 1),
page change, fetch all on/off, an error response, an empty result, dark mode, and narrow width (table scrolls horizontally,
date + badge do not wrap). QA may simulate `oldest_last_update` values via the browser devtools network override if the
backend data lacks a case.

## Edge cases
- Row `last_update` `false` / missing / `null` / garbage: cell shows `—`, no badge. It has no effect on the banner.
- `oldest_last_update` `false` (no dated rows), missing (older backend), `null` or garbage: unknown, no banner.
- Future dates (row or `oldest_last_update`): ok, shown as the date, no badge/banner.
- Exactly 12 months: ok. 12 months + 1 day: old.
- Feb 29 today: the cutoff is clamped to Feb 28 of the previous year.
- Timezones: date-only values are parsed as local calendar dates, and `today` is compared by calendar date only.
- Old rate only on page 2: banner shows on page 1 as well (whole-set); the "Old" badge shows only on the page that holds that
  row.
- Banner shown but no visible row has a badge: expected when the old rows are on other pages.
- Filters/search/active change: the next response brings a new `oldest_last_update`, so the banner recomputes; while loading it
  is hidden.
- Client Tariffs after delete/copy: the list reloads, and `meta.oldestLastUpdate` and the badges refresh from the new
  response.
- Out-of-order responses: `rows` and `meta` are set together from the same response, as today; no new race is introduced.

## Open questions
None blocking. Resolved defaults (user/caller decisions, re-confirm at CP1):
1. Warning scope: whole filtered set via `oldest_last_update` (resolved by the backend contract).
2. Future dates: ok (not old, not unknown).
3. Datetime strings: the backend sends `"YYYY-MM-DD"` or `false`; the parser still tolerates a trailing time defensively.
4. Em dash `"—"` in the new column vs `"-"` in other empty cells: accepted.
5. Exports (PDF/Excel): unchanged, no Last Updated column and no warning.
6. Banner hidden while loading, on error and on an empty list.
   Note (user CP1 decision, supersedes "hidden while loading"): the banner stays visible while loading/paging (gate is `meta.totalCount > 0` only, no `!loading &&`); it still hides on error (meta reset) and on an empty list.

## Tasks (small, ordered, each independently verifiable)
- **T1** Create `src/utils/tariffRateAge.js` (constants incl. `OLD_RATE_HINT`, `parseLastUpdate`, `getRateAgeStatus`,
  `isRateOld`, `formatLastUpdate`; no `hasOldRates`). Verify: module imports cleanly, lint passes.
- **T2** Create `src/utils/tariffRateAge.test.js` with the full test list (incl. the `isRateOld` whole-set cases). Verify:
  `npm run test:ci` is green.
- **T3** `TariffTable.jsx`: add optional `column.renderCell(row)` that bypasses `displayTariffValue`; update the JSDoc.
  Verify: both screens render exactly as before (no column uses `renderCell` yet), lint passes (AC 10).
- **T4** Create `src/views/admin/quotations/TariffLastUpdated.jsx` (`TariffLastUpdated` cell: date / "—" / orange date +
  "Old" Badge + Tooltip; `LAST_UPDATED_COLUMN` using `renderCell`). Verify: lint passes; not yet used.
- **T5** Create `src/views/admin/quotations/TariffStaleBanner.jsx` (`TariffStaleBanner({ oldestLastUpdate })`, returns null
  unless `isRateOld`). Verify: lint passes; not yet used.
- **T6** Agent Tariffs: add `oldestLastUpdate` to `meta` (initial `:103`, success `:159-164` from
  `result.oldest_last_update`, error reset `:167`); add screen-only `SCREEN_COLUMNS` and pass it to `TariffTable`; render the
  gated `<TariffStaleBanner>` above the table. Verify in browser: AC 1-4, 6 on Agent Tariffs; Agent Excel/PDF columns
  unchanged (AC 7).
- **T7** Client Tariffs: add `oldestLastUpdate` to `meta` (initial `:158`, success `:226-231`, error reset `:235`); append
  `LAST_UPDATED_COLUMN` to `SCREEN_COLUMNS`; render the gated `<TariffStaleBanner>` above the table. Verify in browser: AC
  1-4, 6 on Client Tariffs; Client Excel/PDF columns unchanged (AC 7).
- **T8** `npm run check`. After CP4: `/update-docs` (`docs/API_CONTRACT.md`: `last_update` per row and `oldest_last_update`
  in list meta for both tariff endpoints; `docs/PROGRESS.md`).
