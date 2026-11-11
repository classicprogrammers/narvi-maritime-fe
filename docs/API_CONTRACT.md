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
