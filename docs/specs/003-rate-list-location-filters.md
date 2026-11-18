# 003-rate-list-location-filters: Cascading Rate List filters with a Location select

Status: Spec (awaiting CP1)
Branch: `staging` (no feature branch, no commits by the architect). The uncommitted 002-sales-notes files in the same tree
must not be touched or committed with this feature.

## Goal
On the Rate List screen (`/admin/quotations/rate-list`, `src/views/admin/quotations/rate-list.jsx`) the Advanced Filters
cascade: every option list (Rate Type, Location, Client, Agent, Group Name, Rate Name, Currency) only offers values that
exist for the current selection, and the **Location** filter becomes a searchable select fed by the backend instead of free
text. Origin (Igor): choosing a port such as `IAH` should list only the agents with tariffs there (general) and only the
clients that have client-specific tariffs there, so the user can drill down without dead-end combinations.

Scope: Rate List screen only, plus the pure helpers it uses. Agent Tariffs, Client Tariffs, CopyTariffModal, RateListForm
and the quotation screens are not changed.

## Backend contract (supplied by the backend dev; authoritative; record in docs/API_CONTRACT.md during /update-docs)
### `POST /api/rate/list/options` (existing endpoint, extended; called via `getRateListOptionsApi` in `src/api/rate.js`)
- Request body accepts the current selection: `rate_type`, `location` (name, e.g. `"IAH"`) **or** `location_id`,
  `client_id`, `agent_id`, `currency_id`, `rate_name`, `import_group`; plus the existing `page`, `page_size` and per-list
  search keys (`q_rate_type`, `q_client`, `q_agent`, `q_currency`, `q_rate_name`, `q_group`) and the new `q_location`.
- Every option list (clients, agents, currencies, rate names, groups, locations) only contains values that exist for the
  current selection. The list of the field being changed ignores that field's own selection (faceted: picking `IAH` still
  lists the other locations that fit the remaining filters).
- New in the response: `location_options: [{ name, location }]`, `location_total_count`, `location_page`,
  `location_page_size`, `location_total_pages`. Searchable with `q_location`.
- `rate_type=general` => `client_options` is empty. `rate_type=client_specific` => only clients that have client-specific
  tariffs.
- Choosing a location narrows agents and clients.
- The frontend must re-call the options endpoint after every change of one of the filters above.
- Response is unwrapped from JSON-RPC `result` by `unwrapRateApiData` (`src/api/rate.js:3-16`); no change needed there.

### `GET /api/rate/list` (existing; `getRateListApi`)
- Accepts `location=<name>`. It now also matches rates that only have a linked location (not only `location_text`).

Nothing else is assumed. No new endpoint is added; `src/config/api.js` is not changed (rate URLs are hard-coded in
`src/api/rate.js` today).

## Research findings (load-bearing)
1. **Options loading today** (`rate-list.jsx:606-805`): `buildOptionsPayload(currentFilters, queries)` (`:606-627`, a
   `useCallback` inside the component, not testable) sends `page:1, page_size:200`, `rate_type`, `client_id`, `agent_id`,
   `currency_id`, `rate_name`, `import_group` and any non-empty `q_*`. **It sends no location.** `loadFilterOptions`
   (`:675-781`) guards stale responses with `optionsRequestIdRef` (`:680, 684, 772, 775`), normalizes lists (`:687-700`),
   **prunes** selections that are no longer in the returned lists (`:702-746`), then merges the pinned selected option back
   into each list (`:748-764`) and updates pins (`pinSelectedOptions`, `:629-673`).
2. **Re-call trigger** (`:783-794`): an effect re-runs `loadFilterOptions` (with prune) whenever `rate_type`, `client_id`,
   `agent_id`, `currency_id`, `rate_name` or `import_group` change. `location_text` is not in the deps. Typing in a select
   calls `handleOptionSearchChange` (`:796-805`) with `pruneSelections:false`.
3. **Pins** (`selectedOptionPinsRef`, `:314-322`): label objects of the selected options so a selected value stays visible
   when it is not in the current list. Persisted with the list state (`:524-535`, `utils/rateListState.js:95-96`) and reset
   in `clearFilters` (`:850-869`). Restored filters skip the first prune (`skipFirstPruneRef`, `:323, 679, 685`).
4. **Location today is free text**: `DEFAULT_FILTERS.location_text` (`:90`), an `Input` (`:1325-1333`), sent to the list as
   `location_text` (`:449`), counted in `hasAnyAdvanceFilter` (`:409`). Persisted shape in
   `utils/rateListState.js:24, 66-69` (tests: `src/utils/rateListState.test.js`).
5. **Closest pattern for a Location select fed by `location_options`**: Agent Tariffs
   `src/views/admin/quotations/agent-tariffs.jsx:45, 73-79, 121-128, 357-369` and Client Tariffs `client-tariffs.jsx:77,
   114, 185-193, 618-627`: filter key `location` (the name string), options via `normalizeNameOptions`
   (`tariffScreenUtils.js:22-34`, maps `name ?? location ?? import_group` to `{id: name, name}`), selected value kept with
   `withSelectedOption` (`tariffScreenUtils.js:52-56`), search via `onSearch("q_location", query)`. The Rate List select
   copies this.
6. **`SearchableSelect`** (`src/components/forms/SearchableSelect.jsx`) has **no pagination / load-more**. It supports
   `onSearchChange`, `isLoading`, `noOptionsText`, `isDisabled`, `fallbackDisplay`. Rate List selects use local filtering on
   top of server results (`serverSideSearch` off) and `prefillOnFocus={false}`.
7. **The list request has no stale guard**: `loadData` (`:563-604`) applies whatever response arrives last. Rapid filter
   changes (and the prune round trip, see Edge cases) can let an older response overwrite a newer one.
   `createLatestGuard` exists in `src/utils/searchableSelect.js:58-67`.
8. **Shared request counter quirk**: option-search requests (`pruneSelections:false`) increment the same
   `optionsRequestIdRef`, so typing in any select while a filter-change options request is in flight drops that response
   and its prune never happens.
9. **Pruning against a truncated list is unsafe**: lists are page 1 of 200. A valid selection that sits beyond the first
   page (likely for locations) would be treated as invalid and cleared.
10. Exports (`handleExportFilteredPdf` `:1021-1037`, `handleExportFilteredExcel` `:1067-1084`) reuse `buildListParams`, so
    they pick up the new `location` param automatically. CopyTariffModal on this screen is opened with `source="selected"`
    and no `filterParams` (`:1834-1840`), so it is unaffected.
11. `docs/API_CONTRACT.md` has no Rate List section yet; `docs/STYLE_GUIDE.md` rules apply (theme tokens, reuse
    components, loading/empty/error states).

## Acceptance criteria
### A. Location select
- A1. The Advanced Filters "Location" field is a `SearchableSelect` (placeholder "All Locations") instead of a text input,
  in the same grid position, styled with the screen's existing `searchableSelectProps`.
- A2. Its options come from `location_options` of `POST /api/rate/list/options`. Each option's value is its `name`
  (e.g. `IAH`); the label is `name`, or `name — location` when `location` is non-empty and differs from `name`
  (Open question 2).
- A3. Typing in the Location select sends `q_location=<trimmed text>` with the current selection; clearing/closing sends
  it without `q_location`. Stale search responses are ignored.
- A4. When `location_total_pages > 1` (more locations than returned), a helper text under the field reads
  "Showing <n> of <location_total_count>. Type to search." (n = number of options returned). No load-more in the dropdown
  (Open question 4).
- A5. Picking a location sets `filters.location` to the name, resets to page 1 and reloads both the table and the options.
  The X clears it and does the same.
- A6. `GET /api/rate/list` (table, Filtered PDF, Filtered Excel) sends `location=<name>` when set and **never** sends
  `location_text`.

### B. Cascading options
- B1. Every change to `rate_type`, `location`, `client_id`, `agent_id`, `currency_id`, `rate_name` or `import_group`
  re-calls `POST /api/rate/list/options` with all of these that are set (`location` as the name; `location_id` is not sent,
  Open question 1). Changes to Active, In Tariff, Charge Category, Shipment Type and search do **not** re-call it.
- B2. The Client, Agent, Group Name, Rate Name, Currency and Location lists show exactly the options returned for that call
  (plus the pinned current selection, see B4).
- B3. With Location `IAH` selected, the Agent list contains only agents the backend returns for `location=IAH`, and the
  Client list only clients returned for it (Igor's case; content decided by the backend, Open question 6).
- B4. A selection that the new response no longer offers is **cleared** (auto-prune), but only when the list is known to be
  complete: the field has no active search text, and for Location `location_total_pages <= 1`. A cleared selection
  triggers one more table load and options call. An info toast says which filters were cleared, e.g.
  "Agent cleared: not available for the current filters." (Open question 3).
- B5. Rate Type `General`: the Client list is empty, the Client select is disabled with placeholder
  "Not used for General rates", and any selected client is cleared (by B4). Rate Type `Client Specific`: the Client list
  shows only what the backend returns.
- B6. Restored filters (sessionStorage or returning from the rate form) are trusted on the first options load (existing
  `skipFirstPruneRef` behaviour) and shown via their pins, including Location.
- B7. Only the latest options response is applied, and only the latest list response is applied (B-race: changing filters
  quickly never leaves the table or the option lists showing results for an older selection).
- B8. While options load, the selects show their loading state (existing `isLoadingFilterOptions`); an options error keeps
  the previous lists (existing behaviour) and does not clear selections.

### C. State, persistence, clear
- C1. The filter key is `location` (string name). Persisted state (`narvi_rate_list_state`) and the rate-form round trip
  carry `filters.location` and `pins.location`.
- C2. A persisted state from before this change that has `filters.location_text` is read without error; the old free-text
  value is dropped (Open question 5) and no `location_text` is ever sent.
- C3. "Clear All" resets Location and its pin along with the other filters and reloads unfiltered options.
- C4. Location counts as an active advanced filter (filter button state, auto-open panel, Clear All visibility,
  fetch-all availability), as `location_text` did.

### D. Quality
- D1. New pure logic lives in `src/utils/` with sibling tests (payload builder, options parsing incl. locations and location
  meta, prune decision, location option label, state migration).
- D2. Theme tokens / existing `useColorModeValue` values only; no new hex colors; no new dependencies; `SearchableSelect`
  is not modified.
- D3. `npm run check` passes.

## Files
### Create
| Path | Purpose |
|---|---|
| `src/utils/rateListOptions.js` | Pure helpers moved out of / added to the Rate List: `RATE_LIST_OPTION_FILTER_KEYS` (`rate_type`, `location`, `client_id`, `agent_id`, `currency_id`, `rate_name`, `import_group`), `buildRateListOptionsPayload(filters, queries)`, `parseRateListOptions(result)` (returns `{ rateTypes, locations, clients, agents, currencies, rateNames, groups, chargeCategories, locationMeta: { totalCount, page, pageSize, totalPages } }`), `formatLocationOption(option)`, `pruneRateListSelections(filters, options, { queries, locationMeta })` (returns `{ filters, clearedKeys }`), `optionsFilterSignature(filters)` (string of the 7 keys, used as effect dependency). The normalizers `normalizeRateTypeOptions`, `normalizeIdNameOptions`, `normalizeNamedOptions`, `optionHasValue`, `mergeSelectedOption` move here from `rate-list.jsx:150-203` unchanged (needed for testing; no behaviour change). |
| `src/utils/rateListOptions.test.js` | Unit tests (see T1-T3). |

### Modify
| Path | Change |
|---|---|
| `src/views/admin/quotations/rate-list.jsx` | `DEFAULT_FILTERS.location` replaces `location_text`; `EMPTY_FILTER_OPTIONS.locations`, `EMPTY_OPTION_QUERIES.q_location`; pins gain `location`; use the new utils in `loadFilterOptions`; options effect deps include `filters.location`; Location `SearchableSelect` + helper text; Client select disabled for General; `buildListParams` sends `location`; latest-wins guard on `loadData`; prune toast; `clearFilters` resets location pin. |
| `src/utils/rateListState.js` | `defaultRateListState.filters.location` replaces `location_text`; `buildRateListFilterSnapshot` reads `location` (string) and ignores legacy `location_text`. |
| `src/utils/rateListState.test.js` | Tests for the new key and the legacy migration. |
| `docs/API_CONTRACT.md` | Rate List options/list section from "Backend contract" above (during `/update-docs`, not by the developer mid-feature). |

Not modified: `src/api/rate.js` (body is passed through as is), `src/config/api.js`, `SearchableSelect.jsx`,
`tariffScreenUtils.js`, `CopyTariffModal.jsx`, `RateListForm.jsx`, `rateListPdf.js`, `rateListExcel.js`.

## State & API changes
- No Redux changes. All state stays local to `rate-list.jsx` and sessionStorage.
- `filters`: `location_text: ""` -> `location: ""` (selected location name). Other keys unchanged.
- `filterOptions`: adds `locations: []`; new local state `locationMeta` (`{ totalCount, page, pageSize, totalPages }`).
- `selectedOptionPinsRef`: adds `location: null` (`{ id: name, name, location? }`).
- `optionQueriesRef`: adds `q_location: ""`.
- Options request body (`buildRateListOptionsPayload`): `{ page: 1, page_size: 200 }` + each set filter among
  `rate_type` (string), `location` (trimmed string), `client_id`/`agent_id`/`currency_id` (integers via the existing
  `intFilterToParam` logic), `rate_name`/`import_group` (trimmed) + non-empty trimmed `q_*`. Empty values omitted.
  Never sends `location_id` or `location_text`.
- Options response parsing (`parseRateListOptions`): existing keys as today (`rate_type_options`, `client_options`,
  `agent_options`, `currency_options`, `rate_name_options`, `group_options` / `import_group_options` /
  `group_name_options`, `charge_category_options`) plus `location_options` -> `{ id: name, name, location }` (entries with a
  blank name dropped, duplicates by name dropped) and `location_*` counts (missing -> totalCount = list length,
  totalPages = 1).
- List params (`buildListParams`): `location: filters.location.trim() || undefined` replaces `location_text`.
- `loadData` uses a latest-wins guard (`createLatestGuard` or a request-id ref like `optionsRequestIdRef`); a superseded
  response neither sets rows nor shows a toast; `setLoading(false)` only for the latest request.

## Edge cases
- **Stale selections after a filter change**: e.g. Agent `X` selected, then Location `IAH` chosen where `X` has no rates.
  The options response lacks `X` -> Agent is cleared (B4), toast shown, table and options reload once more. Until the prune
  lands, one table request may have gone out with `IAH + X` (0 rows); the guard ensures the later request wins. The prune
  never cascades endlessly: a second response that still lacks nothing selected changes nothing (prune returns the same
  object -> no state update).
- **Rate Type General with a client selected**: client list empty -> client cleared and select disabled (B5). Switching
  back to Client Specific/All re-enables it (selection not restored).
- **Faceted own-list rule**: changing Location must not remove the other locations from the Location list (backend ignores
  the own selection). If the backend returns the location list narrowed by the selected location anyway, the pin keeps the
  current one visible; flag during manual test.
- **Selection beyond the first page / under a search**: never pruned when the field has search text or (Location) when
  `location_total_pages > 1`; it stays and is shown from its pin. Other lists have no total counts in the contract, so they
  prune as today when their search text is empty (Open question 7).
- **Race: rapid changes**: options responses are already latest-wins; list responses become latest-wins (B7). An
  option-search request (typing) must not cancel the prune of an in-flight filter-change request: the search request
  carries the same current filters, so its response is equally valid; prune runs on any latest response, skipping fields
  that have search text (fixes finding 8).
- **Race: response for an older filter set**: each options call is built from `filtersRef.current` at call time; a response
  is applied only if it is the latest, so it always matches the newest selection.
- **`location` (name) vs `location_id`**: the select's value is the name; only `location` is sent to both endpoints.
  `location_id` is never sent (no id is known on the frontend from `location_options`; Open question 1).
- **Location name casing / spaces**: value is used exactly as returned (trimmed); no case folding.
- **Location name that is also free text on a rate** (`location_text` vs linked location): backend matches both (contract);
  nothing to do in the frontend.
- **Free text becoming a select**: an old persisted free-text value (`location_text`, maybe partial like `hou`) is dropped
  on restore (C2) rather than sent as an exact `location` that would return 0 rows.
- **Empty `location_options`** (no data or older backend): select shows "No options found"; no helper text; filter still
  works if a pinned value exists.
- **Older backend without `location_options` in the response**: parsing returns `[]` and `totalPages: 1`; prune of
  Location would then clear a selected location. To avoid that, Location is only pruned when the response actually
  contains the `location_options` key.
- **Long location labels**: SearchableSelect shows them truncated in the input with full text in its title.
- **Clear All while an options request is in flight**: `clearFilters` calls `loadFilterOptions(DEFAULT_FILTERS, ...)`
  which supersedes it (existing); the list guard does the same for rows.
- **Returning from the rate form** with `location.state.filterState`: restored location trusted on first load (B6).
- **Options error**: lists and selections stay as they were (B8); the table still loads.

## Out of scope
- Agent Tariffs, Client Tariffs, CopyTariffModal (it still sends `location_text` from Client Tariffs; separate change if
  wanted), RateListForm's Location Text column, quotation screens.
- Infinite scroll / load-more pages of locations in the dropdown (would require changing the shared `SearchableSelect`).
- Narrowing option lists by Active, In Tariff, Charge Category, Shipment Type or the search box (not in the contract).
- Sending `location_id`.
- Changing `src/api/rate.js` or `src/config/api.js`.
- Making the table's Location column filterable/sortable.

## Open questions (each with a proposed default)
1. **`location` vs `location_id`**: should the frontend ever send `location_id`? `location_options` items are
   `{name, location}` with no id. *Default:* send only `location=<name>` to both endpoints; never `location_id`.
2. **Meaning of the `location` field inside `location_options`**: is it a display name (e.g. "Houston"), the same code, or
   an id? *Default:* treat `name` as the value; show `name — location` only when `location` is a non-empty string different
   from `name`; ignore it otherwise.
3. **Auto-clear vs keep invalid selections**: when a selection disappears from the narrowed list, clear it (and tell the
   user) or keep it and show 0 rows? *Default:* auto-clear (as today) plus an info toast naming the cleared filters.
4. **Location pagination**: the response has `location_page/page_size/total_pages`, but the contract does not name a
   request param for the location page (e.g. `location_page`). *Default:* do not page; request page 1 (the shared
   `page_size: 200`), rely on `q_location` search, show the "Showing n of N. Type to search." hint. Ask backend for the
   param name if load-more is wanted later.
5. **Persisted free-text location**: map an old `location_text` to `location`, or drop it? *Default:* drop it (partial
   text would match nothing as an exact location).
6. **Igor's IAH case, agents**: with only Location `IAH` (no Rate Type), does the agent list contain only agents with
   **general** tariffs at IAH, or also agents that only have client-specific rates there? *Default:* the frontend shows
   whatever the backend returns; if Igor needs "general only", he also picks Rate Type General (clients then empty).
   Backend to confirm the rule.
7. **Completeness of the other lists**: do `client_options`, `agent_options`, etc. include total counts, and is 200 enough?
   *Default:* keep `page_size: 200` and prune them only when their search text is empty (current behaviour).
8. **Does the options endpoint always include the selected value in its own list** (own-selection ignored), even beyond
   page 1? *Default:* do not rely on it; keep pins (`mergeSelectedOption`) for every field including Location.
9. **Client select under Rate Type General**: disable it or leave it enabled and empty? *Default:* disable with placeholder
   "Not used for General rates".
10. **Toast wording/noise**: one toast per prune round listing all cleared fields, `status: "info"`, 3 s. *Default:* yes.

## Tasks
Each task ends with `npm run lint:changed` and `npm run test:ci` green. Do not touch the 002 files. Commit only if the
workflow step says so (developer commits per task on `staging`, staging only the 003 files).

- **T1. Options payload helper.** Create `src/utils/rateListOptions.js` with `RATE_LIST_OPTION_FILTER_KEYS`,
  `buildRateListOptionsPayload(filters, queries)` and `optionsFilterSignature(filters)`; tests: empty filters ->
  `{page:1,page_size:200}`; ids become integers, non-numeric ids omitted; `location: " IAH "` -> `"IAH"`; `location_text`
  and `location_id` never present; `q_location` and other `q_*` trimmed and omitted when blank; signature changes when any
  of the 7 keys change and not when `active`/`shipment_type` change.
  *Verify:* tests pass.
- **T2. Options parsing.** Move the normalizers (`normalizeRateTypeOptions`, `normalizeIdNameOptions`,
  `normalizeNamedOptions`, `optionHasValue`, `mergeSelectedOption`) from `rate-list.jsx:150-203` into the util unchanged
  and add `parseRateListOptions(result)` + `formatLocationOption(option)`. Tests: existing keys parsed as before (group
  key fallbacks); `location_options` -> `{id:name,name,location}`, blank names and duplicates dropped; `locationMeta` read
  from `location_*` and defaults when missing; a `hasLocationOptions` flag false when the key is absent; label rules of
  Open question 2.
  *Verify:* tests pass; `rate-list.jsx` imports the moved functions and behaves the same (no other change in this task).
- **T3. Prune decision.** `pruneRateListSelections(filters, options, { queries, locationMeta, hasLocationOptions })` ->
  `{ filters, clearedKeys }`. Tests: invalid client/agent/currency/rate_name/import_group/rate_type cleared; a field with
  non-empty `q_*` is never cleared; Location cleared only when `hasLocationOptions` and `totalPages <= 1`; General with empty
  client list clears `client_id`; nothing invalid -> same `filters` object and `clearedKeys: []`.
  *Verify:* tests pass.
- **T4. Persisted state key.** `src/utils/rateListState.js`: `location` replaces `location_text` in defaults and the
  snapshot; legacy `location_text` ignored. Tests in `rateListState.test.js`: new key round-trips; legacy state yields
  `location: ""` and no `location_text` key; pins with `location` kept.
  *Verify:* tests pass.
- **T5. Wire options loading.** In `rate-list.jsx`: use `buildRateListOptionsPayload`, `parseRateListOptions`,
  `pruneRateListSelections` inside `loadFilterOptions`; add `locations` to `EMPTY_FILTER_OPTIONS`, `q_location` to
  `EMPTY_OPTION_QUERIES`, `location` to pins (initial, `pinSelectedOptions`, `handleFilterChange`, `clearFilters`) and
  `mergeSelectedOption` for locations; store `locationMeta`; options effect deps include `filters.location`; prune runs on
  every latest response (search requests too) per the util rules; show the info toast when `clearedKeys` is non-empty.
  *Verify:* manual: Network tab shows `location` in the options body after picking a location; changing Agent re-calls
  options; typing in a select sends `q_*` with the current filters.
- **T6. Location select UI.** Replace the Location `Input` (`:1325-1333`) with a `SearchableSelect` copied from the Agent
  select (`:1350-1365`) and Agent Tariffs (`agent-tariffs.jsx:357-369`): value `filters.location`, options
  `filterOptions.locations`, `formatOption={formatLocationOption}`, `onSearchChange` -> `q_location`, placeholder
  "All Locations"; helper text (theme `mutedTextColor`, `fontSize="xs"`) when `locationMeta.totalPages > 1`.
  *Verify:* A1-A5 by hand.
- **T7. List param + active-filter checks.** `buildListParams` sends `location` instead of `location_text`;
  `hasAnyAdvanceFilter` uses `filters.location`.
  *Verify:* A6 and C4 by hand (table, Filtered PDF and Filtered Excel requests show `location=IAH`, no `location_text`).
- **T8. Latest-wins list loading.** Guard `loadData` so only the latest request sets rows/meta/loading/toast.
  *Verify:* manual: switch Location quickly between two values; the table matches the last one. Throttle network in
  DevTools to make it visible.
- **T9. Client select under General.** Disable the Client `SearchableSelect` with placeholder "Not used for General rates"
  when `filters.rate_type === "general"`.
  *Verify:* B5 by hand; selecting General with a client selected clears it and shows the toast.
- **T10. Full check + docs hand-off.** `npm run check`. Hand the "Backend contract" section to `/update-docs` for
  `docs/API_CONTRACT.md`. Manual run of Igor's case: Location `IAH` -> agent and client lists narrowed; then Rate Type
  General -> clients empty; Client Specific -> only clients with client-specific tariffs.
  *Verify:* check passes; manual results noted in the QA file.
