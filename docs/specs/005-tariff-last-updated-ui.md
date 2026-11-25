# 005 Tariff "Last Updated" - UI

Scope: Agent Tariffs and Client Tariffs screens, VIEW mode only. Data contract, threshold constant and the pure age helper are the architect's section; this section covers UI only. No sort, filter or hide changes. No new endpoints.

Revision: the banner now covers ALL rates matching the current list filters, not just the loaded page. The list response meta carries `oldest_last_update` ("YYYY-MM-DD" or `false`); the banner decides from that single value. The per-row "Last Updated" column and "Old" badge are unchanged and still use each loaded row.

Files inspected (the existing patterns this spec copies):
- `src/views/admin/quotations/TariffTable.jsx` (shared table, both screens)
- `src/views/admin/quotations/agent-tariffs.jsx` (`COLUMNS`, also reused by the Excel export via `EXCEL_COLUMNS`)
- `src/views/admin/quotations/client-tariffs.jsx` (`COLUMNS` feeds the PDF/Excel exports, `SCREEN_COLUMNS` is on-screen only; no separate section components, the screen composes `TariffTable` directly)
- `src/views/admin/quotations/tariffScreenUtils.js` (`displayTariffValue`)
- `src/utils/dateFormat.js` (`formatDateDMY`)
- `src/components/ledger/LedgerAutoTag.jsx` (Badge + Alert warning pattern), `src/components/forms/EditModeNotice.jsx`, `src/components/stock-list/StockReportGenerateModal.jsx` (compact Badge overrides)
- `src/theme/components/badge.js`, `src/theme/theme.js`

## UI

### 1. Layout and placement

Screen order stays unchanged: title and toolbar, filter panel (`SimpleGrid`), (client only) Remarks `FormControl`, then the new banner, then `TariffTable`.

- Banner sits directly above `TariffTable`, below the filter panel (and below Remarks on Client Tariffs), full width of the screen content, `mb="4"`. It is rendered by the screen (not inside `TariffTable`), so the table component keeps no knowledge of tariff semantics beyond the cell rendering below.
- The "Last Updated" column is the LAST data column on both screens, after "Sales" (Agent) and after "Shipment Type" (Client), before the optional delete column. Reason: it is metadata, not a quote field; appending avoids shifting columns users already scan and the persisted/exported column order.
- Column definition: `{ key: "last_update", label: "Last Updated" }` added to the Agent `COLUMNS` for screen only and to the Client `SCREEN_COLUMNS` only.
  - Agent: `COLUMNS` is also the source of `EXCEL_COLUMNS` and PDF scope. The new column must be screen-only (e.g. a separate `SCREEN_COLUMNS = [...COLUMNS, LAST_UPDATED_COLUMN]` as the Client screen already does) so Excel and PDF are unchanged. Exports are out of scope.
  - Client: add to `SCREEN_COLUMNS` only, never to `COLUMNS` (PDF_COLUMNS derive from it).

### 2. Table column

| Property | Value |
|---|---|
| Header | "Last Updated" (rendered by existing `Th`: uppercase, `fontSize="11px"`, `color` header token, `whiteSpace="nowrap"`) |
| Position | Last data column |
| Alignment | Left (not `isNumeric`) |
| Width | Content-sized, `whiteSpace="nowrap"`, min about 140px (fits "DD/MM/YYYY" + "Old" badge on one line at `size="sm"`). Do not set a fixed width on the `Th`; the table auto-sizes. |
| Date format | `DD/MM/YYYY` via `formatDateDMY(row.last_update)` from `src/utils/dateFormat.js` (app-wide rule: display always DD/MM/YYYY, API stays YYYY-MM-DD). Do not add a new formatter. |
| Unknown | `false`, null, empty string or unparseable value shows "—" (em dash) in the muted token colour, no badge, never old. |
| Sorting/filtering | None. Header is plain text, no sort icon. |

Note on em dash: `displayTariffValue` returns an ASCII "-" for empty values today. The spec asks for "—". The Last Updated cell must render its own "—" (do not change `displayTariffValue`, it also feeds the exports). Other empty cells in the same row keep "-"; this small inconsistency is accepted (see Open items).

### 3. Old-row marker

A row is "old" when its `last_update` is a valid date more than 12 months before today (helper from the architect section; the UI only consumes a boolean per row). This is unchanged by the revision and uses each loaded row only.

Marker, used in the Last Updated cell only (the whole row is NOT recoloured, so zebra and hover backgrounds from `TariffTable` stay intact and the signal is not colour-only):
- Date text followed by a small Badge reading "Old":
  - `<Badge colorScheme="orange" variant="subtle" fontSize="2xs" px="2" py="0.5" borderRadius="md" textTransform="uppercase">Old</Badge>` (same override approach as `StockReportGenerateModal` since the theme Badge has large 7px/12px padding and 10px radius; orange matches the "manual" warning tag in `LedgerAutoTag`).
  - Date text colour for old rows: `orange.600` light / `orange.300` dark via `useColorModeValue` (tokens only). Fresh rows keep the normal cell text token.
  - Layout: `HStack spacing="2"` inside the cell, `whiteSpace="nowrap"`.
- Tooltip on the Badge (and `title` not used): label "Last updated more than 12 months ago". Use Chakra `Tooltip hasArrow` as the screens already do. The 12 comes from the shared constant (do not hardcode the number in the string; build the text from the constant).
- Accessibility text: Badge visible text "Old" plus visually hidden suffix is not needed; instead give the date `Text` an `aria-label` is NOT used. Screen reader reads "15/03/2025 Old" which is sufficient; the tooltip is supplemental, not the only carrier.

Table cell rendering requirement (flag, see section 9): `TariffTable` currently runs every cell through `displayTariffValue(value)` which does `String(value)`, so a React element returned from `column.render` would print "[object Object]". The cell therefore needs a small, backwards-compatible extension of `TariffTable` (e.g. an optional `column.renderCell(row)` that returns a node and bypasses `displayTariffValue`). Existing columns are untouched.

### 4. Warning banner

- Component: Chakra `Alert` with `AlertIcon` (the repo's existing warning-alert pattern from `LedgerAutoTag.jsx` / `LedgerEntryTable.jsx`: `status="warning" variant="subtle" borderRadius="md"`). No custom colours.
- Prop: `oldestLastUpdate` (the list meta `oldest_last_update`: "YYYY-MM-DD" string or `false`/null/undefined). The banner component takes only this value (plus nothing page-related). Whether it is old is decided with the architect's age helper (same 12-month constant, strictly older); the UI consumes the boolean. Loading/empty/error gating is done by the screen, which simply does not render the banner in those states (or passes `undefined`).
- Props: `status="warning" variant="subtle" borderRadius="md" mb="4" alignItems="flex-start"` (top-aligned so the icon stays at the first line when text wraps), `role="status"` is the Chakra default (`role="alert"` would interrupt screen readers on every refresh, so override to `role="status"`).
- Content, exact text (first line, bold-weight `fontWeight="600"`): "Rates in this tariff seem to be old, please check"
- Static second line (`fontSize="sm"`, `Text` with `wordBreak="break-word"`): "The oldest rate in this list was last updated on DD/MM/YYYY. It may be on another page." The date is `formatDateDMY(oldestLastUpdate)` (no new formatter). The sentence is the same on every page; it never contains a count and is not recomputed per page. If the product owner prefers the shorter variant, drop the second sentence ("It may be on another page.") and keep the date sentence only; the first line is mandatory either way.
- Scope: covers all rates matching the current filters/search (as computed by the backend), independent of the displayed page and of fetch-all. Changing page does not change the banner content.
- Visibility: shown only when not loading AND no fetch error AND the list is not empty AND `oldestLastUpdate` is a valid date older than 12 months. Hidden for: loading, error, empty list, `false`/null/undefined/unparseable value, and a date within 12 months.
- Not dismissible (no close button), not sticky; it scrolls with the page above the table. Appears/disappears with no animation (avoids layout jump flicker; reserve nothing while loading, see states).
- Banner sits outside the table's `overflow="hidden"` card so it is never clipped.

Banner shown but visible page has no Old badges: this is a valid and expected state (the old rates are on another page, since the banner is whole-list and badges are per loaded row). The user sees the warning with no orange marker in the table. The static second line is what explains it: the oldest date is shown, and "It may be on another page" tells the user why no row on screen is marked, so the banner does not read as a false alarm. The date is also a concrete anchor if they page or filter. Do not add a count, a "go to page" link or an auto-jump (no backend support, out of scope).

The converse (a page with Old badges while the banner is hidden) cannot happen in normal operation, since the page rows are a subset of the matched set. If it ever appears (stale or inconsistent data), do not hide the row badges; QA to verify consistency.

### 5. States

| State | Table | Banner | Last Updated cell |
|---|---|---|---|
| Loading | existing centred `Spinner` | hidden (data not final) | n/a |
| Empty (no rows) | existing `emptyText` message | hidden | n/a |
| Error (request failed) | rows cleared, empty-state text; the existing error `toast` is the only error surface (unchanged) | hidden (previous value cleared) | n/a |
| `oldest_last_update` is `false`/unknown | normal | hidden | per-row rules (may still show dates or "—") |
| `oldest_last_update` within 12 months | normal | hidden | date only, normal text token |
| `oldest_last_update` older than 12 months, old rows on this page | normal | shown, with oldest date | old rows: orange date + "Old" badge; others plain date |
| `oldest_last_update` older than 12 months, no old rows on this page | normal | shown, with oldest date and the "may be on another page" wording | all plain dates (or "—"); no Old badges |
| All rows on page unknown (all `false`) but banner value old | normal | shown | "—" muted in every row |
| Disabled / read-only | VIEW only; the column and banner are non-interactive. Existing disabled states (Export buttons when `totalCount === 0`, delete/checkbox controls on Client) are unchanged. | unaffected | unaffected |
| Long text | The new cell is short and `nowrap`; long Rate Name / Group Name cells keep `wordBreak="break-word"` as today. Banner text wraps (`wordBreak="break-word"`). | | |
| Narrow width | See section 6 | stacks icon + text, wraps | |

Boundary: a date exactly 12 months ago is NOT old (strictly older, per the architect's helper); the UI does not decide this.

Page change: the banner value comes from the same list response as the rows, so it is stable across pages for the same filters. Per the loading rule it is hidden together with the table while a fetch is in flight and returns with the response, with the same text. Accepted: a brief disappear/reappear on each page change. If QA finds this flicker distracting, an option for CP1 is to keep the last value visible while paging (only clear on filter change or error); default stays "hidden while loading".

Filter/search change or refresh: banner recomputes from the new response meta (different filters can yield a different oldest date, or `false`).

### 6. Responsive and overflow

- `TariffTable` already wraps the table in `overflowX="auto"` (and `maxH="620px"` vertical scroll with a sticky header), so adding a column simply extends the horizontal scroll on narrow screens. No layout changes, no column hiding at breakpoints (the requirement says no hide changes).
- Client screen already has 7 data columns plus checkbox and delete; the 8th column makes horizontal scroll likely below `xl`. Acceptable; the `nowrap` header and cell keep the column from collapsing.
- Banner: full width, `Alert` content wraps; at narrow width the icon stays left, both lines wrap below the baseline of the first line. No fixed widths.
- Date and badge stay on one line (`whiteSpace="nowrap"`); on very narrow cells the horizontal scroll takes over rather than wrapping the badge under the date.

### 7. Theme tokens used (no hex values)

- Alert: `status="warning"` (theme warning scheme) with `variant="subtle"`.
- Badge: `colorScheme="orange"`, `variant="subtle"`.
- Old date text: `orange.600` (light) / `orange.300` (dark) via `useColorModeValue`.
- Unknown "—": `mutedColor` of the table, `gray.500` light / `gray.400` dark (same pair `TariffTable` already uses for `mutedColor`).
- Normal date text: existing table `textColor` (`gray.700` / `white`).
- Spacing: `mb="4"`, `spacing="2"`, `px="2"`, `py="0.5"`; font sizes `2xs`, `sm`.

### 8. Accessibility

- The row marker is not colour-only: the visible "Old" text label is always present with the orange date.
- Banner uses `role="status"` with the standard Alert icon; the full message, including the oldest date, is in text, not in the icon or tooltip.
- Tooltip is supplemental: keyboard users get the same meaning from the visible "Old" text and the banner. Badge is not focusable, no `tabIndex` added.
- Colour contrast: `orange.600` on white/`gray.50` rows and `orange.300` on dark rows are the Chakra defaults and meet AA for the 14px text; verify in dark mode in QA.
- "—" cell: add `aria-label="Last updated unknown"` on the dash `Text` so it is not read as "em dash".
- Column header text "Last Updated" is unambiguous for screen readers; no extra labelling.
- Delete icon button on Client keeps its existing `aria-label`, unaffected.

### 9. Reused components and paths

| Need | Reuse | Path |
|---|---|---|
| Table | `TariffTable` (small extension, see below) | `src/views/admin/quotations/TariffTable.jsx` |
| Date display (cells and banner) | `formatDateDMY` | `src/utils/dateFormat.js` |
| Warning banner | Chakra `Alert` / `AlertIcon` (pattern from `LedgerAutoNotes`) | `src/components/ledger/LedgerAutoTag.jsx` (reference only) |
| Tag | Chakra `Badge` (override pattern) | `src/components/stock-list/StockReportGenerateModal.jsx` (reference only) |
| Tooltip | Chakra `Tooltip hasArrow` | as in `agent-tariffs.jsx` |
| Screens | `AgentTariffs`, `ClientTariffs` | `src/views/admin/quotations/agent-tariffs.jsx`, `client-tariffs.jsx` |

### 10. New shared component / change flags

1. REQUIRED, small: `TariffTable` must accept a node-returning cell renderer (e.g. optional `column.renderCell(row)`), because the current `displayTariffValue(String(value))` path cannot render a Badge. Backwards compatible; `render` and exports unchanged. This is a change to a shared component used by both screens only.
2. RECOMMENDED: one small presentational component, e.g. `src/views/admin/quotations/TariffLastUpdated.jsx` (the date + Old badge + dash cell) and `TariffStaleBanner.jsx` (the Alert, prop `oldestLastUpdate`), instead of duplicating JSX in both screens. They live beside `TariffTable` because they are tariff-specific, not `src/components/` shared. If the architect prefers, they may be one file. No other new shared component is needed.
3. NOT needed: no new theme tokens, no theme file edits, no new dependency.
4. Data dependency (not UI): the screens must read `oldest_last_update` from the list meta and keep it in screen state alongside the rows; clear it on error. Defined in the architect's spec and the API contract, not here.

### 11. Open items for CP1

1. Empty-cell dash: new column shows "—" as requested while other empty cells show "-". Confirm, or standardise later in a separate change (out of scope here).
2. Exports (PDF/Excel) intentionally do NOT include Last Updated or the warning; confirm.
3. Client tariff delete column and checkboxes are unchanged; the new column renders before the delete column.
4. Banner second line wording ("The oldest rate in this list was last updated on DD/MM/YYYY. It may be on another page.") and whether to keep the banner visible while paging (default: hidden while loading) need confirmation.
