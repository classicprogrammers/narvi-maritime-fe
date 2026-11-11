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

## Drafts (frontend only)
Spec: `docs/specs/001-drafts.md`. When a create/update call fails, the user's input is kept as a draft in the browser. No backend, no new endpoints.
- **State:** `src/redux/slices/draftsSlice.js` (`{ userId, items, hydrated }`), accessed via `src/redux/hooks/useDrafts.js`. Pure helpers: `src/utils/draftStorage.js`, `draftSanitize.js` (strips files, base64 `datas`, passwords), `drafts.js`.
- **Persistence:** localStorage key `drafts:<user_id>` = `{ version: 1, items }`. Logout clears Redux memory only, not localStorage.
- **Boot preservation:** `persistScopedAuthOnBoot` (`src/utils/authStorage.js`) clears localStorage on every load but keeps the auth keys and any key starting with `drafts:`.
- **Sync:** `src/hooks/useDraftsSync.js` (mounted once in `src/layouts/admin/index.js`) hydrates on user change, writes on change, and follows the `storage` event across tabs.
- **Capture:** `useSaveWithDraft()` returns `saveWithDraft` (wraps the existing API call: on throw or failure result it upserts a draft by `key`, then re-throws or returns the original result; on success it removes the draft) and `saveManualDraft` (Save as draft button; Stock, Shipping order, Rate list only). Validation that runs before the call must stay outside the wrapper.
- **Resume:** `useResumeDraft(moduleKeys, { ready })` reads `location.state.draftId` and returns the draft once the form's own data has loaded; pass the returned `draftId` as `sourceDraftId` so a later success deletes the draft. `useResumeModalDraft` does the same for list-page modals.
- **Registry:** `src/config/draftModules.js` maps each module key to `{ label, category, resumeTo(draft), apis, isFailure? }`. Retry runs `draft.requests` through `apis`. Categories: **A** full form (Resume restores the form), **C** modal on a list page (Resume reopens the modal prefilled), **D** inline/bulk/derived (Retry + Delete only, Resume disabled). Autosave screens (B) are out of scope.
- **Page:** `/admin/drafts` (sidebar item with count badge) lists drafts with Resume, Retry, Delete.
- **401:** the draft is written first (flushed synchronously), then the axios interceptor redirects to login. The flag `drafts:session_expired_notice` (`src/utils/sessionExpiredNotice.js`) uses the `drafts:` prefix so it survives the boot cleanup; the sign-in screen consumes it once and shows the "Session expired ... saved to Drafts" toast.
- **Adding a module:**
  1. Add an entry to `DRAFT_MODULES` in `src/config/draftModules.js` (label, category, `resumeTo` for A/C, `apis` imported from `src/api/*`, `isFailure` if the generic check is wrong).
  2. In the screen, wrap the existing call: `saveWithDraft({ module, mode, recordId, label, formState, requests: [{ api, args }], call })`. Use a stable `sessionKey` (`useRef`) for create flows.
  3. For A/C, read the draft with `useResumeDraft` / `useResumeModalDraft` after the screen's data is ready and overlay it on the form; pass `sourceDraftId`.
  4. Never put files or passwords in `formState`/`requests` (the sanitizer is a safety net, not a design tool). Extend `draftModules.test.js` coverage if needed.

## Tooling gaps
- ESLint plugin is disabled in `start`/`build`; use `npm run lint:changed`.
- Few tests exist (`authStorage`, `portalClientSelection`, `portalClients`, `store`). See docs/TESTING.md.

## TODO (Phase 0)
- Routing/guard flow (`ProtectedRoute`, layouts) in detail
- Data flow per major feature (stock, CI/PL, shipping instructions, quotations, ledger)
- List of reusable components with when-to-use notes
