# 002-sales-notes: Sales notes, client follow-up flag and date filters for Contacts

Status: Spec (awaiting CP1)
Branch: `staging` (no feature branch, no commits by the architect)

## Goal
Sales staff can keep dated **sales notes** (remarks, entry date, follow-up date) for clients and find them again.
1. A new global **Sales** screen under Contacts lists every sales note across all clients, with search, entry/follow-up
   date range filters, sorting, pagination and add/edit/delete (the client is chosen in a picker).
2. **Client Management** (`/admin/contacts/customer`) Advanced Filters get:
   - a **Follow up** filter (`follow_up=true`) with an X to clear it;
   - **Entry date** and **Follow-up date** ranges that filter the clients table through `/api/customers`, plus a popup
     that lists the matching sales notes from `/api/client/sales` using the same date params.
3. Each client has a `follow_up` flag. It can be changed in the client edit form and from a toggle in the clients table,
   both through `POST /api/customer/update`.

UI dates are shown as `dd/mm/yy`. Dates are sent as `YYYY-MM-DD`.

## Research findings (load-bearing)
1. **There is no tabbed "Contacts page".** Contacts is a sidebar submenu in `src/routes.js:128-158` (Client
   `/contacts/customer`, Agents `/contacts/agents`, Phonebook `/contacts/phonebook`). "SALES tab" = a fourth submenu entry
   `Sales` at `/admin/contacts/sales` (see Open question 1).
2. **The "Narvi Maritime Approved Agents" filter is not on the stock list.** `Stocks.jsx` has no approved-agent filter.
   The only one is on the **Agents** page: `src/views/admin/contacts/components/VendorsTable.js:1060-1079` (a Checkbox
   "Show approved agents only" setting `filters.narvi_maritime_approved_agent` to `"true"` or `""`), wired to the API in
   `src/views/admin/contacts/Vendors.js:121-124` and `src/api/vendor.js:331-341`. That checkbox has **no X**. The X-to-clear
   pattern in the same panel is the `MdClose` IconButton next to the Country SearchableSelect
   (`VendorsTable.js:1046-1056`) and inside text inputs (`CustomerTable.js:819-830`). The Follow up filter copies the
   checkbox and adds that X (see Open question 2).
3. **Client Management** = `src/views/admin/contacts/Customer.js` (state, sessionStorage persistence under
   `narvi_client_list_state`, debounced refetch, server pagination) + `src/views/admin/contacts/components/CustomerTable.js`
   (filter bar, Advanced Filters panel `:736-878`, table, pagination footer `:1163-1249`, delete AlertDialog `:1647-1689`).
   Filter keys are hard-coded in several places that must all be updated: `Customer.js:29-32, 54, 144, 190`;
   `CustomerTable.js:98-101, 123, 343, 662-666, 689, 694`.
4. **The edit modal in `CustomerTable.js` is dead code**: `onEditOpen` is never taken from `useDisclosure` (`:143-146`);
   Edit navigates to `/admin/customer-registration` (`:497-514`). The real edit form is
   `src/views/admin/customer-registration/index.jsx` (formData `:236-271`, prefill `:337-378`, update payload `:907-914`,
   `saveWithDraft` `:917-932`). Do not touch the dead modal.
5. **`updateCustomerApi` whitelists fields** (`src/api/customer.js:215-259`) and always sends `tariffs: ""`,
   `client_invoicing: ""` and `company_type: "company"` when they are missing. So:
   - `follow_up` must be added to that whitelist for the edit form;
   - the table toggle **must not** reuse `updateCustomerApi` (it would wipe tariffs/client invoicing). It needs a new
     minimal call that posts only `{ customer_id, follow_up }`.
6. **`getCustomersApi` whitelists query params** (`src/api/customer.js:167-194`); `follow_up`, `entry_date_from/to`,
   `follow_up_date_from/to` are dropped today and must be added.
7. **Reusable date-range helpers already exist**: `buildDateRangeParams`, `validateDateRanges`, `countActiveDateRanges`,
   `sanitizeDateRanges`, `isValidIsoDate`, `nextSortState` in `src/utils/ledgerListQuery.js` (tested in
   `ledgerListQuery.test.js`). They take `fields: [{ key, label }]` and produce `<key>_from` / `<key>_to` params, which
   matches the backend names `entry_date_from/to`, `follow_up_date_from/to`. Reuse them; do not copy them.
8. **Date input**: `src/components/forms/DmyDateInput.jsx` (text dd/mm/yyyy + hidden native picker, emits the typed text;
   helpers `getLocalTodayIso`, `normalizeToIsoDate`, `formatDateForApi`). Its defaults `iconColor="whiteAlpha.900"` and
   white placeholder are for dark headers, so pass `iconColor` and `_placeholder` from the screen's color tokens.
   **No `dd/mm/yy` formatter exists** in `src/` (grep), so one is added in `src/utils/salesNotes.js`.
9. **API module pattern**: `src/api/ledgerSo.js` (list/create/update/delete with `unwrapError` handling both
   `{status:"error",message}` and `{result:{status:"error",message}}`, list unwrapping `data` / `result.data` plus
   pagination keys). Its test style: `src/api/ledgerCost.test.js` (mocks `./axios`).
10. **Client picker**: `SearchableSelect` (`src/components/forms/SearchableSelect.jsx`) fed by `useMasterData().clients`
    (`src/hooks/useMasterData.js`), as in `src/views/admin/ledger/so/index.jsx:252, 417-424`.
11. **Feedback**: `SuccessModal` / `FailureModal` from `src/components/modals` (STYLE_GUIDE). Delete confirm uses the
    AlertDialog pattern at `CustomerTable.js:1647-1689`.

## Acceptance criteria
### A. Sales screen (`/admin/contacts/sales`)
- A1. The sidebar Contacts submenu shows **Sales** after Phonebook; clicking it opens the Sales screen titled "Sales Notes".
- A2. On load the screen calls `GET /api/client/sales` with `page=1`, `page_size=50`, `sort_by=entry_date`,
  `sort_order=desc`, and no other params.
- A3. Columns: Entry date, Client (name), Client code, Follow up (Yes/No badge from `client_follow_up`), Remarks,
  Follow-up date, Created by, Actions. Dates show as `dd/mm/yy`; empty values show `-`. Long remarks are truncated with
  the full text in a tooltip; the table scrolls horizontally on narrow widths.
- A4. Typing in Search sends `search=<trimmed text>` after a 400 ms debounce and resets to page 1. An X clears it.
- A5. Advanced Filters panel has Entry date From/To and Follow-up date From/To (DmyDateInput). Each filled field has an X.
  Valid values are sent as `entry_date_from`, `entry_date_to`, `follow_up_date_from`, `follow_up_date_to`
  (`YYYY-MM-DD`). If From > To or a date is invalid, an inline error shows under that pair and **no request** is sent for
  that change.
- A6. Clicking a sortable header (Entry date, Follow-up date, Client, Created by, ID if shown) sets `sort_by` to
  `entry_date` / `follow_up_date` / `client` / `created_by` / `id` and toggles `sort_order` (asc/desc), with the arrow icon
  on the active column. Remarks and Client code are not sortable.
- A7. Pagination footer matches Client Management (first/prev/numbers/next/last, "Showing x to y of z") and uses the
  server's `total_count`, `total_pages`, `has_next`, `has_previous`.
- A8. "Clear All" (shown only when any filter/search/non-default sort is active) resets everything and refetches page 1.
- A9. Filter, sort and page state persist in sessionStorage (key `narvi_sales_notes_list_state`) and survive navigating
  away and back; invalid persisted dates are dropped.
- A10. Loading state ("Loading sales notes..."), empty state ("No sales notes yet." when no filters, "No sales notes match
  your filters." otherwise) and error state (message from the API) are shown in the table body.
- A11. **Add Note** opens a modal: Client (required, searchable picker), Remarks (required, textarea), Entry date
  (defaults to today), Follow-up date (optional, X clears). Save is disabled until client and non-blank remarks are set.
  Save posts `POST /api/client/sales/create` with `{ client_id, remarks, entry_date }` plus `follow_up_date` only when set.
- A12. **Edit** (pencil) opens the same modal prefilled; Client is shown read-only. Save posts
  `POST /api/client/sales/update` with `{ id, remarks, entry_date, follow_up_date }`, where a cleared follow-up date is
  sent as `null`.
- A13. **Delete** (bin) asks for confirmation ("Delete this sales note for <client>?"), then posts
  `POST /api/client/sales/delete` with `{ id }`.
- A14. After a successful create/update/delete the modal closes, a success message shows and the current page reloads
  (after delete, if the page becomes empty and page > 1, go to the previous page).
- A15. If any call returns `{status:"error", message}` (top level or under `result`) or throws, the backend `message` is
  shown to the user (FailureModal or inline Alert in the modal) and the modal keeps the user's input.

### B. Client Management: Follow up filter
- B1. The Advanced Filters panel has a **Follow up** block: Checkbox "Show follow-up clients only". When checked, the
  clients table refetches with `follow_up=true` (page 1) and an X button appears next to it; X (or unchecking) removes the
  param and refetches.
- B2. The "Advanced Filters" button turns solid blue and "Clear All" appears while the filter is on; Clear All removes it.
- B3. The filter persists in `narvi_client_list_state` and the panel auto-opens when it is restored as active.

### C. Client Management: date filters + matching notes popup
- C1. The Advanced Filters panel has Entry date From/To and Follow-up date From/To with X per field and the same
  validation as A5. Valid values are sent to `GET /api/customers` as `entry_date_from`, `entry_date_to`,
  `follow_up_date_from`, `follow_up_date_to` and the table reloads at page 1.
- C2. While at least one date param is active, a **"View matching notes"** button shows in the panel. It opens a modal
  that calls `GET /api/client/sales` with exactly the active date params (plus `page`, `page_size=50`, default sort) and
  lists Entry date, Client, Client code, Remarks, Follow-up date, Created by (dates `dd/mm/yy`), with pagination,
  loading, empty ("No sales notes match these dates.") and error states.
- C3. Date filters count for the solid "Advanced Filters" button, "Clear All", persistence and auto-open (as B2/B3).

### D. Follow-up flag per client
- D1. The clients table has a **FOLLOW UP** column with a Switch reflecting `follow_up`. Toggling it posts
  `POST /api/customer/update` with exactly `{ customer_id, follow_up }`, disables that switch while saving, and on success
  refetches the current page (so the row disappears if the Follow up filter is on and it was turned off).
  On failure the switch returns to its old value and the backend message is shown.
- D2. The client edit form (`/admin/customer-registration` in edit mode) shows a "Follow up" checkbox prefilled from
  `follow_up`; saving sends `follow_up` (boolean) in the update payload together with the other fields.
- D3. `/api/customer/register` is not changed (follow_up is not in its contract; see Open question 5).

### E. Quality
- E1. All new pure logic lives in `src/utils/` with sibling tests; API modules have tests with mocked axios.
- E2. Theme tokens / `useColorModeValue` only, copied from the sibling screen; no new hex colors.
- E3. `npm run check` passes.

## Files
### Create
| Path | Purpose |
|---|---|
| `src/api/clientSales.js` | `getClientSales(params)`, `createClientSale(payload)`, `updateClientSale(payload)`, `deleteClientSale(id)`. Copy `src/api/ledgerSo.js` (local `unwrapError`, list unwrapping). Only whitelisted params are sent. |
| `src/api/clientSales.test.js` | Mocked-axios tests (pattern `src/api/ledgerCost.test.js`). |
| `src/api/customer.test.js` | Tests for the new customer params / follow-up call (mock `./axios` and `../components/ApiModal`). |
| `src/utils/salesNotes.js` | `SALES_DATE_FILTER_FIELDS = [{key:"entry_date",label:"Entry date"},{key:"follow_up_date",label:"Follow-up date"}]`, `SALES_SORT_KEYS`, `DEFAULT_SALES_SORT`, `formatIsoToDdMmYy(iso)`, `buildSalesListParams(state)`, `validateSalesNoteForm(form, mode)`, `buildSalesNoteCreatePayload(form)`, `buildSalesNoteUpdatePayload(form)`, `sanitizeSalesListState(raw)`. Reuses `utils/ledgerListQuery` helpers. |
| `src/utils/salesNotes.test.js` | Unit tests. |
| `src/utils/clientListFilters.js` | `DEFAULT_CLIENT_FILTERS` (`client_code`, `email`, `follow_up`, `entry_date_from/to`, `follow_up_date_from/to`), `hasActiveClientAdvanceFilters(filters, overallSearch)`, `buildClientFilterParams(filters)` (adds `follow_up: true` only when on, valid date params only), `sanitizeClientFilters(raw)`. |
| `src/utils/clientListFilters.test.js` | Unit tests. |
| `src/views/admin/contacts/SalesNotes.jsx` | Sales screen (state, persistence, fetch, handlers). Layout copied from `Customer.js` + `CustomerTable.js`. |
| `src/views/admin/contacts/components/SalesNotesTable.jsx` | Filter bar, Advanced Filters (date ranges), table, pagination footer. Thin; props only. |
| `src/views/admin/contacts/components/SalesNoteFormModal.jsx` | Add/Edit modal (SearchableSelect client, Textarea, DmyDateInput x2). |
| `src/views/admin/contacts/components/SalesNotesMatchModal.jsx` | Read-only popup of notes matching date params (used by Client Management). |

### Modify
| Path | Change |
|---|---|
| `src/config/api.js` | Add `CLIENT_SALES: "/api/client/sales"`, `CLIENT_SALES_CREATE`, `CLIENT_SALES_UPDATE`, `CLIENT_SALES_DELETE`. |
| `src/api/customer.js` | `getCustomersApi`: pass `follow_up` (only `true`), `entry_date_from/to`, `follow_up_date_from/to`. `updateCustomerApi`: add `follow_up` (only when boolean). New `updateCustomerFollowUpApi(customerId, followUp)` posting `{ customer_id, follow_up }`, same error handling as `updateCustomerApi`. |
| `src/views/admin/contacts/Customer.js` | Use `clientListFilters` for default/persisted filters, fetch params, debounce deps, Clear All. |
| `src/views/admin/contacts/components/CustomerTable.js` | Advanced Filters: Follow up checkbox + X, date range fields + X + errors, "View matching notes" button + `SalesNotesMatchModal`; active-filter checks via `hasActiveClientAdvanceFilters`; FOLLOW UP Switch cell. Do not touch the dead edit modal. |
| `src/views/admin/contacts/variables/columnsData.js` | Add `{ Header: "FOLLOW UP", accessor: "follow_up", minWidth: 110 }` to `columnsDataClient` before ACTIONS. |
| `src/views/admin/customer-registration/index.jsx` | `follow_up` in formData default (`false`), prefill (`!!editingClient.follow_up`), Checkbox in edit mode; `updatePayload` already spreads formData. Exclude `follow_up` from `registerPayload`. |
| `src/routes.js` | Import `SalesNotes`; add submenu `{ name: "Sales", path: "/contacts/sales", icon: MdNoteAlt or existing md icon, component: SalesNotes, exact: true }` after Phonebook. |
| `docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md` | Record the sales endpoints and customer follow-up/date params (during `/update-docs`). |

## State & API
- No Redux changes. Sales list state is local to `SalesNotes.jsx` (page, pageSize 50, search, dateRanges, sort) and
  persisted in sessionStorage. Client list keeps using `useCustomer().getCustomers`, with the extended filters object.
- `getClientSales` params whitelist: `client_id`, `search`, `entry_date_from`, `entry_date_to`, `follow_up_date_from`,
  `follow_up_date_to`, `sort_by`, `sort_order`, `page`, `page_size`, `fetch_all`. Empty values are omitted; strings trimmed.
  Returns `{ data: rows[], total_count, page, page_size, total_pages, has_next, has_previous }` read from top level or
  `result` (defensive, like `ledgerSo.js`; see Open question 3).
- Create/update/delete return the parsed body; on `status === "error"` (top level or `result`) they throw
  `new Error(message)`. The screen shows `error.message`.
- `buildSalesNoteCreatePayload`: `{ client_id: Number, remarks: trimmed, entry_date: iso || today, follow_up_date?: iso }`.
- `buildSalesNoteUpdatePayload`: `{ id, remarks: trimmed, entry_date: iso, follow_up_date: iso | null }`.
- Row reading: `client_id` may be `{id,name}`; `created_by` `{id,name}`; use `?.name ?? "-"`.
- Customer list params (added): `follow_up=true`, `entry_date_from`, `entry_date_to`, `follow_up_date_from`,
  `follow_up_date_to`.

## Edge cases
- Remarks only whitespace: invalid (required).
- Entry date cleared in the form: create sends today; update requires a valid entry date (error "Entry date is required").
- Typed date not a full valid date (e.g. `31/02/2026`, `12/5/26`): field error, no save / no filter request.
- Follow-up date earlier than entry date: allowed unless Open question 6 says otherwise.
- Only one side of a range set: open range (send the one side).
- From > To: inline error, request not sent; previous results stay.
- Client deleted or missing in master data: the picker still shows the row's `client_id.name` in edit mode (read-only text).
- Master data clients empty (cache not loaded): picker shows empty with a hint; Save disabled.
- Long remarks: truncated in table with tooltip; full text in edit modal; multi-line kept (`whiteSpace="pre-wrap"` in tooltip).
- Rapid toggling of the follow-up Switch: disabled while its request is pending; one request per row at a time.
- Turning off follow-up while the Follow up filter is on: the row leaves after refetch.
- Last row on a page deleted: step back a page (A14).
- 401 during any call: existing axios interceptor behaviour, nothing new.
- Null `follow_up_date` / `follow_up` missing on old customers: show `-` / unchecked.

## Out of scope
- Per-client sales notes inside ClientDetail or the edit form (global screen only, per decision a).
- Changing a note's client after creation (update contract has no `client_id`).
- Setting follow_up on client create (`/api/customer/register`).
- Excel/PDF export of sales notes.
- Changing `DmyDateInput` (it stays dd/mm/yyyy for input; dd/mm/yy is display only, see Open question 4).
- The dead edit modal in `CustomerTable.js`.
- Drafts integration for the new calls, unless Open question 7 is answered yes.

## Open questions — RESOLVED (orchestrator defaults, pending user veto at CP1)
1. Sidebar submenu item "Sales" at `/admin/contacts/sales`.
2. Checkbox + X in Advanced Filters; clients table refreshes to follow-up clients.
3. Parse defensively like `ledgerSo.js` (rows from `data` / `result.data`; `total_count`/`total_pages` with fallbacks; errors from top-level or `result.status === "error"`). Verify against the real response during manual test.
4. Display dd/mm/yy; inputs use `DmyDateInput` (dd/mm/yyyy).
5. No: follow_up is edit-only (register unchanged).
6. No ordering rule enforced; past follow-up dates allowed.
7. No Drafts integration in this feature.
8. Buttons visible to all users; backend enforces and its message is shown.
9. Yes: client has at least one note with a date in range (backend contract: "returns the clients with a note follow-up date in that range; same for entry_date").
10. Page size 50.
11. Safe per backend contract (documented example); confirm in the Network tab during manual test that other client fields are unchanged.

### Original questions (for reference)
1. **"Tab" placement**: Contacts has no in-page tabs; it is a sidebar submenu. Proposed: new submenu item "Sales" at
   `/admin/contacts/sales`. OK, or do you want real tabs (Client / Sales) on the Client Management page?
2. **"Like Narvi Maritime Approved Agents (X to clear, list pops up)"**: no such filter exists on the stock list. The closest
   is the Agents page "Approved Agent" checkbox (`VendorsTable.js:1060-1079`), which has no X. Proposed: checkbox + X, and
   the clients table refreshes to the follow-up list. If "list pops up" means a popup listing the follow-up clients (or
   a dropdown with Yes/No/All), please say which.
3. **List response envelope for `GET /api/client/sales`**: rows under `data` or `result.data`? Pagination key names
   (`total_count`, `total_pages`, `has_next`, `has_previous` like ledger)? Is the GET a plain HTTP route (not JSON-RPC)?
   Do create/update/delete return `{status:"success", ...}` at top level or under `result`?
4. **Date input format**: requirement says dd/mm/yy in UI. Proposed: tables/popup show dd/mm/yy; inputs use the existing
   `DmyDateInput` (dd/mm/yyyy with calendar). Acceptable, or must inputs also accept/show dd/mm/yy?
5. Should **follow_up** be settable when creating a client (`/api/customer/register`)? The contract only mentions update.
6. Must follow-up date be on or after entry date? Should a follow-up date in the past be allowed?
7. **Drafts**: 001-drafts keeps failed create/update input. Should sales note create/update (category C, modal on list page)
   and the follow-up toggle (category D) be added to `src/config/draftModules.js`? Proposed: not in this feature.
8. **Permissions**: can every user edit/delete any note, or only admins / the creator (client delete is admin-only,
   `CustomerTable.js:1123`)? Proposed: show for all; backend enforces and its message is shown.
9. **`/api/customers` date filter meaning**: does `entry_date_from/to` mean "client has at least one note with entry date in
   range"? Confirm so the popup and table agree.
10. Page size for the Sales list and popup: proposed 50 (ledger default) vs 80 (client list).
11. Is a partial `POST /api/customer/update { customer_id, follow_up }` safe (other fields untouched)? The spec relies on it.

## Tasks
Each task ends with `npm run lint:changed` and `npm run test:ci` green. Do not commit unless the workflow step says so.

- **T1. Endpoints + sales API module.** Add the four `CLIENT_SALES*` keys to `src/config/api.js`. Create
  `src/api/clientSales.js` (copy `ledgerSo.js`: param whitelist, `unwrapError`, list unwrapping, use
  `getApiEndpoint`). Tests in `src/api/clientSales.test.js`: list sends only non-empty whitelisted params; list unwraps
  `data` and `result.data`; create/update/delete post the right URL/body; `{status:"error",message}` and
  `{result:{status:"error",message}}` throw with that message.
  *Verify:* tests pass.
- **T2. Sales pure helpers.** `src/utils/salesNotes.js` + tests: `formatIsoToDdMmYy` (`"2026-11-18"` -> `"18/11/26"`,
  datetime strings, null/false/invalid -> `""`); `buildSalesListParams` (reuses `buildDateRangeParams` with
  `SALES_DATE_FILTER_FIELDS`, trims search, default sort, omits empties); `validateSalesNoteForm` (client required on
  create, remarks non-blank, dates valid via `normalizeToIsoDate` + `isValidIsoDate`); create/update payload builders
  (today default, `null` clearing on update, omit on create); `sanitizeSalesListState`.
  *Verify:* tests pass.
- **T3. Client list filter helpers.** `src/utils/clientListFilters.js` + tests: defaults, active check (each new key),
  `buildClientFilterParams` (`follow_up: true` only when `"true"`/true; invalid dates dropped), `sanitizeClientFilters`
  (old persisted shape without new keys still works).
  *Verify:* tests pass.
- **T4. Customer API changes.** `getCustomersApi` passes the five new params; `updateCustomerApi` adds `follow_up` when
  boolean; new `updateCustomerFollowUpApi`. Tests in `src/api/customer.test.js` (URL query contains `follow_up=true` and
  date params; follow-up call body is exactly `{customer_id, follow_up}`; error body throws).
  *Verify:* tests pass; existing callers unchanged (`git diff` shows only additions in those functions).
- **T5. Customer.js wiring.** Replace hard-coded filter literals with `DEFAULT_CLIENT_FILTERS` / `sanitizeClientFilters`;
  spread `buildClientFilterParams(filters)` into `buildFetchParams`; extend the debounced filter effect deps to the new
  keys but skip the request when `validateDateRanges` reports errors; Clear All resets to defaults.
  *Verify:* manual: set/clear each filter, network tab shows the params; reload restores them.
- **T6. Follow up filter UI.** In `CustomerTable.js` Advanced Filters add the Follow up checkbox + `MdClose` X (copy
  `VendorsTable.js:1060-1079` and `:1046-1056`); use `hasActiveClientAdvanceFilters` for auto-open, button variant and
  Clear All visibility (`:123, :662-666, :689, :694`); update the uncontrolled fallback literals (`:98-101, :343`).
  *Verify:* B1-B3 by hand.
- **T7. Date range filter UI on clients.** Four `DmyDateInput` fields (Entry From/To, Follow-up From/To) with X each and
  inline errors from `validateDateRanges(filters, SALES_DATE_FILTER_FIELDS)`; values stored as ISO in `filters`.
  *Verify:* C1, C3 by hand; invalid range shows error and sends nothing.
- **T8. Matching notes popup.** Create `SalesNotesMatchModal.jsx` (props `isOpen`, `onClose`, `dateParams`; fetches with
  `getClientSales`, own page state, loading/empty/error, dd/mm/yy). Add the "View matching notes" button in the
  CustomerTable panel when any date param is active.
  *Verify:* C2 by hand; request contains only date + paging + sort params.
- **T9. FOLLOW UP column toggle.** Add the column to `columnsDataClient`; render a Chakra `Switch` in the CustomerTable cell
  renderer (`:1002-1137` chain) calling a handler that uses `updateCustomerFollowUpApi`, per-row pending state, revert +
  message on error, `propsOnRefresh()` on success.
  *Verify:* D1 by hand; request body has only two keys.
- **T10. Follow up in client edit form.** `customer-registration/index.jsx`: formData default, prefill, Checkbox shown
  only when `editingClient`; make sure `registerPayload` does not include it.
  *Verify:* D2 by hand; create request has no `follow_up`.
- **T11. Sales note form modal.** `SalesNoteFormModal.jsx` (props `isOpen`, `onClose`, `mode`, `initialNote`,
  `onSubmit(payload)`, `isSaving`, `error`): SearchableSelect clients from `useMasterData`, Textarea, two `DmyDateInput`s
  (theme-token `iconColor`/placeholder), follow-up X; validation via `validateSalesNoteForm`; payload via builders.
  *Verify:* renders in both modes; Save disabled when invalid.
- **T12. Sales screen: list.** `SalesNotes.jsx` + `SalesNotesTable.jsx`: state + sessionStorage persistence
  (`sanitizeSalesListState`), fetch via `getClientSales(buildSalesListParams(state))`, debounced search, Advanced Filters
  date ranges with X + errors, header sort with `nextSortState` limited to `SALES_SORT_KEYS`, pagination footer copied from
  `CustomerTable.js:1163-1249`, loading/empty/error rows, Clear All.
  *Verify:* A2-A10 by hand.
- **T13. Sales screen: add/edit/delete.** Wire Add Note / Edit / Delete (AlertDialog copied from `CustomerTable.js:1647-1689`)
  to the API, SuccessModal on success, error message on failure, page step-back after deleting the last row.
  *Verify:* A11-A15 by hand, including a forced backend error.
- **T14. Route.** Add the Sales submenu entry and import in `src/routes.js` (reuse an icon already imported from
  `react-icons/md` if possible).
  *Verify:* sidebar shows Sales; deep link `/admin/contacts/sales` works after reload.
- **T15. Full check + docs.** `npm run check`. Hand the API/architecture notes to `/update-docs` (API_CONTRACT sections for
  `/api/client/sales*` and the customer follow-up/date params).
  *Verify:* check passes.
