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

## Error handling
Form API errors are mapped by `src/utils/formApiErrors.js`. _TODO: document the backend error shape._

## Open questions about the backend
-
