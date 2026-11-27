# API Contract (frontend view of the backend)

The backend is a black box. This file records what the frontend actually uses. Agents must not use anything not listed here
or in `src/config/api.js` / `src/api/*` without asking. Update via `/update-docs`.

- Base URL: `REACT_APP_BACKEND_URL` or `REACT_APP_API_BASE_URL`
- Client: `src/api/axios.js` (JSON, 60s timeout, repeated-key array params)
- Endpoint map: `src/config/api.js` (`API_CONFIG.ENDPOINTS`), e.g. `/api/login`, `/api/customers`, `/api/countries`
- Resource modules: `src/api/*.js` (stock, cipl, shippingInstructions, shippingOrders, ledger*, rate, vessels, warehouses, ...)

## Per-resource notes
<!-- One section per resource: endpoint, method, request fields, response shape, enums, known quirks. -->
_TODO (Phase 0): fill from `src/api/*` and the payload builders in `src/utils/*Payload.js`._

### CIPL simple form: item currency conversion (`src/api/cipl.js`)
- `stock_list[]` items carry `source_currency_id` ({id,name,symbol}|null), `needs_conversion`, `roe` (number|false), `roe_date`,
  `roe_manual`, `entries[].source_value`. ROE = form-currency units per 1 item-currency unit; `value_in_usd` = `source_value` x `roe`,
  always in the form's `currency_id` despite the name.
- `POST /api/cipl/form/update` per line (only changed keys): `source_currency_id`, `roe` (>0 manual, `null` = automatic),
  `entries[].source_value` (instead of `value_in_usd` when `needs_conversion`). No rate -> `{status:"error", message}`, nothing saved.
- `POST /api/cipl/form/convert` `{id}` -> updated `form` (refreshes non-manual ROEs).
- `POST /api/currency/roe` `{from_currency_id, to_currency_id, date}` -> `{roe|null, roe_date}` (preview only).
- Per-unit CIPL and invoice/manifest forms do not support this yet.

### CIPL Manual form (feature 009, `src/api/cipl.js`, `src/utils/ciPlManual.js`)
- `form_type` on `POST /api/cipl/form` (list, `latest_only`, archived): omitted = Simple only, `"manual"` = Manual only, `"all"` = both. Required on `POST /api/cipl/form/create` for a Manual draft (`{form_type:"manual"}`). Load by `id` (`POST /api/cipl/form {id}`) returns any type without `form_type`. Every form response has `form_type`, `cipl_number` (read-only) and `vessel_id` (`{id, name}` or `null`; send only the id when saving).
- Manual header: same fields as Simple plus `job_no` (typed) and `vessel_id`; no SI/SIC/DI numbers, no ship-by, `agent_cnee_id` not required.
- `stock_list[]` on `POST /api/cipl/form/update` and archive, Manual line shapes: `{stock_list_id}` adds a stock item (`id` of the stock list record); `{description, hs_code, quantity, unit_price, box, weight}` adds a free-text line; `{id, ...changed fields}` edits (never send `stock_list_id` with `id`); `{id, delete:true}` removes. Line value = `quantity` x `unit_price`.
- Totals come from the backend (`total_box`, `total_weight`, `total_value_in_usd`, `totals`, `packed_as {boxes, kg}`); values are strings like "125.00", zero comes back as `false`.
- Rule: on Manual forms every update that sends `stock_list` resets `packed_as` and the packed totals to the line sums. Packed edits (`total_packed_quantity`, `total_packed_weight`, `packed_as`) must go in a SEPARATE update without `stock_list`, sent after the line save (the screen keeps the typed override and re-sends it after each line save).

### Agent / client tariffs: rate age (`src/api/rate.js`)
- `GET /api/agent/rate/tariff` and `GET /api/client/rate/tariff` (read by `agent-tariffs.jsx` / `client-tariffs.jsx` as `result.data`, `result.total_count`, `result.total_pages`):
  - each row has `last_update`: `"YYYY-MM-DD"`, or `false` when unknown (some older rates have no date). `false` is "unknown", never "old".
  - the list response has `oldest_last_update`: the oldest `last_update` across ALL rows matching the current filters/search/active, same on any page and with or without `fetch_all`; `false` if no matching row has a date.
  - per the backend team, `last_update` changes only when a rate, sales rate, calculation or currency changes (not remarks, status or sort order).
- The frontend decides "old" (more than 12 months, all charge types) in `src/utils/tariffRateAge.js`; the backend sends dates only.

### Ledger lists: ids filter and invoice number check (`src/api/ledgerCost.js`, `src/api/ledgerInvoice.js`)
- `GET /api/ledger/cost?ids=1,2,3` and `GET /api/ledger/invoice?ids=1,2,3` return only those records (same shape as the normal list: `data[]`, `total_count`; works with `page`/`page_size`). Unknown ids give an empty list; bad ids give 400 "ids must be a comma separated list of numbers.". The frontend sends `params.ids` (array or comma string) as comma-separated `ids`; the table edit pages load all selected records with one request (`page_size` = number of ids) and fall back to per-row `id=` loading if it fails.
- `POST /api/ledger/invoice/check-number` `{invoice_number, exclude_id?}` -> `result {status, has_duplicates, duplicates[{invoice, record_id, so_number, booked_by, booked_on}]}` (same envelope as `POST /api/ledger/cost/check-invoice`). Used only to warn on leaving the Invoice Number field; create/update still return `status: "error"` ("Invoice number 654 was already booked on 4364 by admin on 2026-09-09.") and that error is shown as before.

### Invoice "Issued By" (feature 008)
- `POST /api/ledger/invoice/issuers` body `{}` or `{ "q": "..." }` -> `{ result: { status, issuers: [{ id, name }] } }` (empty body returns every issuer, `q` filters by name). Config key `LEDGER_INVOICE_ISSUERS`; client `getLedgerInvoiceIssuers({ q })` in `src/api/ledgerInvoice.js`.
- `POST /api/ledger/invoice/create`: `issued_by_id` is REQUIRED. `POST /api/ledger/invoice/update`: send `issued_by_id` only when the user picked someone (id from the issuers list); an old invoice without an issuer saves without it. Never send `null`, `false` or `""`: the server answers "issued_by_id cannot be cleared; choose another person."
- `GET /api/ledger/invoice`: rows carry `issued_by_id` and `issued_by` (name; `false`/null on old invoices); the response has a `columns` array that includes `issued_by` after `invoice_number`; filter with `?issued_by_id=`.

## Error handling
Form API errors are mapped by `src/utils/formApiErrors.js`. _TODO: document the backend error shape._

### Failure shapes treated as failure by the drafts feature
Implemented in `defaultIsFailure` (`src/config/draftModules.js`); see ARCHITECTURE.md "Drafts (frontend only)". A draft is created when:
- the API call throws (network error, HTTP error, or an API function that throws on `result.status === "error"`);
- `result.status === "error"`;
- `result.result.status === "error"`;
- `result.errors[]` or `result.result.errors[]` is non-empty (partial failures keep only the failed lines);
- by default, the result has no recognisable success marker (`status` of `success`/`ok`, or `success === true`). A `null`/non-object result is not a failure.

Per-module overrides in `draftModules.js` (`isFailure(apiName, result)`): most config/contact/user modules use `isExplicitFailure` (`src/utils/draftFailure.js`: only `status === "error"`, `success === false` or non-empty `errors[]`, since their success shape is undocumented); vessel bulk calls fail only on `result.result.status === "error"` (after unwrapping a nested `result`). `isExplicitFailure` also treats a truthy `error` (JSON-RPC `{error}` or `{result:{error}}`), `result === false` and `status` `"failed"`/`"fail"` as failures. It is used by charge category, quotation detail, quotation wizard and ledger bulk (the ledger screens add a partial-failure check; their success body is `{updated_count, ids, updated_fields}`). Rate/rate copy use `isRateSaveFailure`, stock modules `isStockSaveFailure`, shipping order modules `getMsoApiError`, customer `result.result.status !== "success"`, vendor `isSuccessResponse`; Drafts-page Retry uses the same registry checks. Client-side validation errors before the call never create a draft.

## Open questions about the backend
-
