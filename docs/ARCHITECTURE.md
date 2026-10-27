# Architecture

> Seeded from a quick repo scan. Items marked **TODO (Phase 0)** need a fuller mapping and human review at CP0.

## Stack
React 18 (CRA / react-scripts 5), Chakra UI v2, Redux Toolkit, react-router-dom v5, axios, react-table v7,
apexcharts, jspdf + jspdf-autotable (PDF), xlsx (Excel). JavaScript/JSX only.

## Folder map
| Path | Purpose |
|---|---|
| `src/index.js`, `src/routes.js` | Entry point and route/sidebar definitions |
| `src/layouts/{admin,auth,client}` | Shell layouts per portal context |
| `src/views/admin/<feature>/` | Screens: stock-list, forms/{ci-pl, ci-pl-form, delivery-*, shipping-*}, quotations, ledger, configurations, contacts, users, ... |
| `src/components/` | Shared UI: forms/ (searchable selects, date input, pickers), modals/ (Success/Failure), stock-list/, shipping-order/, navbar, sidebar, charts |
| `src/api/` | One module per backend resource, all built on `src/api/axios.js` |
| `src/config/api.js` | `API_CONFIG.BASE_URL` and `ENDPOINTS` map |
| `src/redux/` | `slices/` (user, stock, customer, vendor, shippingOrders), `actions/`, `store/`, `hooks/` |
| `src/utils/` | Pure helpers (stock payload builders, PDF report, auth storage, form error mapping). Tests beside them as `*.test.js` |
| `src/hooks/` | Data hooks (lookups, master data, entity selects, stock form remote selects, ...) |
| `src/constants/` | Stock status/sort/T1 constants, vessel type options |
| `src/theme/` | Chakra theme: foundations, components, additions, styles |

## Conventions observed
- Absolute imports from `src/` (`jsconfig.json` baseUrl), e.g. `import MainDashboard from "views/admin/default"`.
- Axios client: `REACT_APP_BACKEND_URL` / `REACT_APP_API_BASE_URL`, 60s timeout, array params serialized as repeated keys (no `[]`), auth/portal-client handling in interceptors.
- Auth is context-aware (`utils/authStorage`: admin/client contexts, login path per context); portal client selection is attached to requests (`utils/portalClientSelection`).
- Business logic is extracted to `src/utils` (e.g. `stockCreatePayload`, `stockUpdatePayload`, `stockStatusRequirements`) and consumed by large form components such as `views/admin/stock-list/StockForm.jsx`.
- Env: `.env` is gitignored; deploy via Vercel (`vercel-build`) and gh-pages scripts.

## Tooling gaps
- ESLint plugin is disabled in `start`/`build`; use `npm run lint:changed`.
- Few tests exist (`authStorage`, `portalClientSelection`, `portalClients`, `store`). See docs/TESTING.md.

## TODO (Phase 0)
- Routing/guard flow (`ProtectedRoute`, layouts) in detail
- Data flow per major feature (stock, CI/PL, shipping instructions, quotations, ledger)
- List of reusable components with when-to-use notes
