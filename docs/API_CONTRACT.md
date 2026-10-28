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

## Open questions about the backend
-
