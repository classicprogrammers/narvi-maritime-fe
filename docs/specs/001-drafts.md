# 001-drafts: Keep user input as a frontend draft when a create/update call fails

Status: Spec (awaiting CP1)
Branch: `staging`

## Goal
When a create/update API call fails anywhere in the admin app, the field data the user entered is kept as a
**draft** in the browser (per logged-in user) so it is not lost. Drafts stay until the user deletes them or the
same data is saved successfully. A new **Drafts** sidebar item (with a count badge) lists them with
**Resume** (reopen the original form prefilled), **Retry** (resubmit through the same existing API) and **Delete**.
Stock list, Shipping order and Rate list forms also get a manual **Save as draft** button.
Files and images are never stored. No new backend endpoints.

## CP1 decisions (these override anything below that conflicts)
1. **SoNumberTab "Create SO" modal is removed.** Verified dead: `formDisclosure.onOpen` is never called anywhere
   (`SoNumberTab.jsx:2382`); the Create buttons already `history.push("/admin/shipping-orders/create")` (`:992`).
   `/admin/shipping-orders/create` and `/edit/:id` (`ShippingOrderEditPage.jsx`) are the only create/update screen.
   Inventory row 5 is dropped; new task T9a removes the dead modal, its `handleFormSubmit`/`createShippingOrder`
   call (`:1256`) and any state/imports only it used.
2. **Autosave modules are out of scope**: rows 9 (QuotationForm autosave), 13, 14 (ledger cost/invoice), 17 (SI/SA/DI/DC),
   18 (CI/PL) get no drafts. Category B and `DraftResumeBanner` are removed. Rows 10, 11: see Open question A.
3. **Bulk entries must be drafted.** All bulk saves draft on failure: stock bulk (#1 bulk edit, #3 inline bulk),
   rate bulk (#7, #8), ledger bulk (#15, #16), vessel bulk (#23). Failed rows only are kept. Retry is supported for all.
   Resume is supported where the bulk screen is a full form (#1, #7, #23); inline grids (#3, #15, #16) are Retry + Delete.
4. **User id:** backend login returns `result.user_id` (verified from the login response sample), so the key is
   `drafts:<user_id>`. The `Date.now()` fallback in sign-in stays untouched (no email fallback).
5. **Session expiry (401):** the draft is written first, then the user is redirected to the login page with a toast
   ("Session expired, please sign in again. Your data was saved to Drafts."). Uses the existing interceptor redirect in
   `src/api/axios.js`; only the toast is added. Open question 7 is closed: yes, 401 creates a draft.
6. **Failure shapes:** any thrown error and any non-success result creates a draft, because the point is to protect data
   when the API fails unexpectedly. `isFailure` is therefore generic (`status === "error"`, `result.status === "error"`,
   non-empty `errors[]`, or no recognisable success status), with per-module overrides only for partial failures. Open question 8 is closed.
   **Deviation (verifier M3/B1):** modules whose success body has no status (charge category, quotation detail, quotation wizard,
   ledger bulk, config lists, users) use `isExplicitFailure` instead of the generic check. It counts only explicit failures:
   `status` error/failed/fail, a truthy `error` (JSON-RPC `{error}`, `{result:{error}}`), `result === false`, `success === false`,
   non-empty `errors[]`. Every module has a registry `isFailure` equal to what its screen passes, so Drafts-page Retry judges results the same way.

## Research findings (load-bearing)
1. **Boot wipes localStorage.** `src/bootstrapAuthStorage.js` calls `persistScopedAuthOnBoot()`
   (`src/utils/authStorage.js:115-131`), which runs `localStorage.clear()` on every page load and only
   re-writes the four auth keys. Without a change there, every draft would be lost on reload. This spec
   requires `persistScopedAuthOnBoot` to also keep keys that start with `drafts:` (task T2). This is the only
   change to auth code.
2. **User id.** `state.user.user.id` is set by `loginSuccess`/`checkAuth` (`src/redux/slices/userSlice.js`)
   and restored from `admin_user` in localStorage by `checkUserAuth` (`src/redux/actions/userActions.js:109`)
   when the admin layout mounts (`src/layouts/admin/index.js:31`). There is also
   `getCurrentStoredUserId()` in `src/utils/authStorage.js:88`. **Risk:** the sign-in screen sets
   `id: result.result.user_id || Date.now()` (`src/views/auth/signIn/index.jsx:89`). If the backend leaves out
   `user_id`, the id changes on every login and the user's drafts would no longer show up (see Open questions).
3. **Files are not File/Blob in form state.** Uploads are already turned into `{ filename, mimetype, datas }`
   (base64) objects (`src/utils/shippingOrderAttachments.js:48`, stock rows `attachments` in
   `src/views/admin/stock-list/NewStockItem.jsx`, customer/vendor `attachments`). Stripping must also remove
   these objects, not just `File`/`Blob` values.
4. **Many APIs report failure without throwing.** Some return HTTP 200 with `{ result: { status: "error" } }`
   or partial per-line errors, e.g. stock bulk save (`getStockBulkSaveResultData`), rate update `errors[]`,
   customer register/update, users, vessels. The wrapper needs a per-call `isFailure(result)` check.
5. **Many forms autosave** with debounce and diffs: Cost/Invoice ledger, Quotation, SI/SA/DI/DC, CI/PL.
   Drafts must be **upserted by a stable key** so that each failed autosave updates one draft instead of
   adding a new one each time.
6. **Passwords** are sent by Users and Client-login create/update (`src/views/admin/users/index.jsx:376-423`,
   `:585-610`). They must never be written to localStorage.
7. **Sidebar has no badge support.** `src/components/sidebar/components/Links.js` only renders
   `icon` + `name`. A small, opt-in badge is needed.
8. Some apparent API callers are dead or hidden: `src/components/forms/ShippingOrderForm.jsx` is never rendered.
   `CostEntryTableView`/`InvoiceTableView` are mounted with `display: none`
   (`isTableView = false`, `CostFormPage.jsx:195`, `InvoiceFormPage.jsx:454`). `ledgerSo.create/updateLedgerSo`
   and `postShippingAdviseFormCreateApi` are not called from any view. The `warehouses` route is commented out.
   These are excluded.
9. A prior vendor "draft/return-to-edit" feature was removed (`src/views/admin/vendor-registration/index.jsx:313`
   no-op stub). It is not reused.

## Closest existing patterns (copy these)
- localStorage/sessionStorage read/write helpers with safe parse: `src/utils/rateListState.js`
  (`readPersistedRateListState` / `writePersistedRateListState`), `src/utils/authStorage.js` + `authStorage.test.js`.
- Slice + hook layout: `src/redux/slices/stockSlice.js`, `src/redux/hooks/useStock.js`, store wiring
  `src/redux/store/index.js`, store test `src/redux/store/store.test.js`.
- Error message extraction: `src/utils/formApiErrors.js` (`getApiErrorMessage`) and the `extractNarviQuotationError` in `src/api/narviQuotation.js`.
- Route + sidebar entry: `src/routes.js` (top-level item like "History Logs"/"Carbon Calculator").
- Simple Chakra list page with filters, loading/empty states and `Badge`: `src/views/admin/history-logs/index.jsx`.
- Resume-by-route-state precedent: `NewStockItem.jsx:307-358` and `RateListForm.jsx:542-578` already take
  `location.state.selectedItems`. `customer-registration/index.jsx:219` uses `location.state.client`.
- Toast dedupe by `id`: `CostFormPage.jsx:211` (`id: "cost-autosave"`).

## Draft model
localStorage key `drafts:<userId>`, value `{ "version": 1, "items": Draft[] }`.

```
Draft {
  id: string            // "d_<epochMs>_<rand>"
  key: string           // dedupe key: "<module>:<mode>:<recordId|sessionKey>"
  module: string        // registry key, see table (e.g. "stock", "shippingOrder", "rate")
  mode: "create" | "update"
  recordId: string|number|null
  label: string         // short human summary, e.g. "SO-1234", "3 stock items", "Group: Asia"
  source: "failure" | "manual"
  formState: object|null      // sanitized UI state for Resume (module-specific shape)
  requests: [{ api: string, args: any[] }]  // sanitized calls for Retry, in order; [] if not retryable
  error: { message: string, status: number|null } | null
  stripped: string[]    // paths removed by the sanitizer (files, passwords), shown as a warning
  createdAt: ISO string
  updatedAt: ISO string
}
```
Sanitizer rules (pure, recursive, cycle-safe):
- Drop `File`, `Blob`, `FileList`, `ArrayBuffer`, typed arrays, functions, `undefined`, React elements (`$$typeof`).
- Drop any object that has a `datas` property (base64 upload). Drop strings starting with `data:` and strings
  over 100 000 chars.
- Drop keys `password`, `confirm_password`, `new_password`, `newPassword`, `token`.
- `Date` becomes an ISO string, `Set` becomes an array, `Map` becomes an object.
- Record every removed path in `stripped`.

## Acceptance criteria
AC1 Storage
- a. When an admin user with id U is logged in, drafts are stored under localStorage `drafts:U` only. Another user
  never sees U's drafts.
- b. Drafts survive a full page reload (the boot cleanup keeps `drafts:*` keys). Auth migration behaviour is unchanged
  (the existing `authStorage.test.js` cases still pass).
- c. A missing or corrupt stored value loads as zero drafts without crashing. Writing when storage is full
  shows a warning toast "Draft could not be stored (browser storage full)" and keeps the draft in memory for the session.
- d. A draft change in one tab shows in another open tab of the same user (via the `storage` event) without a reload.
- e. Logout clears drafts from Redux memory but **not** from localStorage. Logging back in as the same user shows them again.

AC2 Capture on failure
- a. For every call marked "Draft: yes" in the inventory table, if the call throws or `isFailure(result)` is true,
  a draft is created or updated (same `key`) with `source: "failure"`, the error message (via `getApiErrorMessage`
  or the module's existing extractor) and the HTTP status if available.
- b. One extra info toast is shown (`id: "draft-saved-<key>"` so it is not repeated): "Your input was saved to Drafts".
  The screen's existing error toast/modal and its control flow stay the same: the wrapper re-throws the original
  error, or returns the original result when only `isFailure` matched.
- c. Repeated autosave failures on the same record or form session update one draft (`updatedAt` changes,
  `createdAt` stays the same). The Drafts count only goes up by 1.
- d. Partial failures: stock bulk save and rate save keep only the rows/lines that failed in the draft. If nothing
  failed, no draft is created.
- e. The stored draft contains no file data and no password, and the stored JSON passes the sanitizer test cases.
- f. A failure from a client-side validation guard (before any API call) does **not** create a draft.

AC3 Clear on success
- a. If a form was opened through Resume (`location.state.draftId`) and the next save succeeds, that draft is removed.
- b. Any successful create/update with the same draft `key` removes that draft, even if the form was not opened
  from Resume. Example: a later autosave of the same ledger record succeeds.

AC4 Manual "Save as draft"
- a. NewStockItem (`/admin/stock-list/stock`, create and edit), ShippingOrderEditPage (`/admin/shipping-orders/create`,
  `/edit/:id`) and RateListForm (`/admin/quotations/rate-list/rate`) show a "Save as draft" button next to the
  existing Save button. No other screen shows it.
- b. Clicking it stores `source: "manual"` with the current form state. No API call is made and no validation runs.
  A success toast "Saved to Drafts" is shown and the user stays on the page.
- c. Saving again from the same form session updates the same draft.
- d. Manual drafts have `requests: []`, so Retry is disabled with the tooltip "Open with Resume to finish and save".

AC5 Sidebar and route
- a. A top-level "Drafts" item (`/admin/drafts`, icon `MdDrafts`) is visible to all admin-portal users. It is not
  shown in the client portal.
- b. It shows a count badge when count > 0 and no badge at 0. When the sidebar is collapsed, a small dot shows on the icon.
  The count updates right away when drafts are added or removed.

AC6 Drafts page
- a. Table columns: Module (human label), Record (label or "New"), Type (Create/Update, plus "Manual" tag),
  Last updated (date + time, newest first), Error (truncated with full text on hover/tooltip), Actions
  (Resume, Retry, Delete).
- b. Empty state: "No drafts. Data you enter is saved here automatically if a save fails." Rows with long text
  wrap or truncate. The page works at narrow widths (table scrolls horizontally).
- c. Rows with `stripped` entries show a warning icon/tooltip: "Attachments/passwords were not kept. Re-add them before saving."
- d. **Delete** asks for confirmation (Chakra `AlertDialog`), then removes the draft.
- e. **Resume** goes to the module's resume route with `state: { draftId }`. The form opens with the draft's
  field values filled in after its own data has loaded. If the module does not support Resume (category D), the
  button is disabled with a tooltip explaining why.
- f. **Retry** asks for confirmation, then runs `draft.requests` in order through the same functions in `src/api/`,
  with the same `isFailure` checks. On full success the draft is removed and a success toast is shown. On failure
  the draft stays, `error`/`updatedAt` are updated, and requests that already succeeded are removed from
  `requests`. The button shows a loading state and double clicks are ignored. Retry is disabled when `requests` is
  empty or a required secret was stripped (Users/Client-login create).
- g. If Resume finds that the target record no longer exists (fetch by id fails), the form's existing
  "not found" handling runs and the draft is **not** deleted.

AC7 No new endpoints
- a. `src/config/api.js` and every `src/api/*.js` are unchanged except for imports. A grep for new URL strings in
  the diff finds none.

AC8 Quality
- a. `npm run check` passes. New pure helpers have `*.test.js` beside them (see Tasks).

## Inventory of create/update calls
Categories: **A** full form, Resume restores form state. **B** autosave record form, Resume opens the page and shows a
banner with pending fields and "Apply" (= Retry in context). **C** modal on a list page, Resume opens the page and
re-opens the modal prefilled. **D** inline/bulk/derived, Retry + Delete only, Resume disabled. **X** excluded (action
toggles, dead or hidden code, not admin portal).

| # | Module key | Screen (file) | API fn (`src/api/…`) | Mode | Cat | Resume input today -> adapter needed | isFailure / notes |
|---|---|---|---|---|---|---|---|
| 1 | `stock` | `views/admin/stock-list/NewStockItem.jsx` (`/admin/stock-list/stock`) | `stock.js` `createStockItemApi`, `updateStockItemApi` | create+update (mixed lines) | A + manual | `location.state.selectedItems/isBulkEdit/sourcePage` -> push same state + `draftId`; after init `setFormRows(draft.formState.formRows)` | `resultData.status !== "success"` or line errors -> keep failed rows only (`filterRowsWithBulkSaveFailures`) |
| 2 | `stockLegacyForm` | `views/admin/stock-list/StockForm.jsx` (`/admin/stock-list/form/:id?`, `?ids=`) | `createStockItemApi`; `updateStockItemApi` via `redux/actions/stockActions.js` `updateStockItem` | create/update | A | `:id`/`?ids` + refetch -> overlay `formRows` | same as #1. Only entry is `Stocks.jsx:3411` |
| 3 | `stockInline` | `views/admin/stock-list/Stocks.jsx` `handleEditSave`/`handleBulkSave` | `updateStockItemApi` | update | D | n/a | same result check; draft only failed lines |
| 4 | `shippingOrder` | `views/admin/shipping-order/ShippingOrderEditPage.jsx` | `shippingOrders.js` `createShippingOrder`, `updateShippingOrder` | create/update | A + manual | `:id` fetch -> after load overlay `formData` (fresh `originalOrder` stays the diff baseline); create: `getEmptyFormData` replaced by draft | API throws on `result.status==="error"`. Strip `attachments`/`cipl_files` datas, keep `existingAttachments` metadata |
| 5 | `shippingOrder` | `views/admin/shipping-order/SoNumberTab.jsx` create modal | `createShippingOrder` | create | A | resumes into #4 `/admin/shipping-orders/create` (same `formData` + `buildPayloadFromForm`) | same |
| 6 | `shippingOrderRemark` | `views/admin/shipping-order/ShippingOrderDetailPage.jsx` `handleSendRemarkToClient` | `updateShippingOrder` | update | D | n/a | text-only. Retry resends `{remark_to_client}` |
| 7 | `rate` | `views/admin/quotations/RateListForm.jsx` | `rate.js` `updateRateListApi({lines})`, `createRateListApi` (per row) | create+update | A + manual | `location.state.selectedItems` (keyed by `location.key`) -> push `{selectedItems, draftId}`; restore `formRows`, `originalRows`, option pins | `result.errors[]` -> failed lines only; rows already created are dropped (existing logic at :944) |
| 8 | `rateCopy` | `views/admin/quotations/CopyTariffModal.jsx` | `createRateListApi` (loop) | create | D | n/a | draft only the rows that were not created |
| 9 | `quotation` | `views/admin/quotations/QuotationForm.jsx` `persistQuotation` (autosave) | `narviQuotation.js` `createNarviQuotation`, `updateNarviQuotation` | create/update | A | `/quotations/manual` or `/quotations/edit/:id` fetch -> overlay `header`, `lines`, `deletedLineIds` | key `quotation:update:<id>` or `quotation:create:<sessionKey>` |
| 10 | `quotationDetail` | `views/admin/quotations/QuotationDetail.jsx` `persist` | `updateNarviQuotation` | update | D | n/a | |
| 11 | `quotationWizard` | `views/admin/quotations/QuotationWizard.jsx` | `createQuotationFromSelection` | create | D | n/a | |
| 12 | `chargeCategory` | `views/admin/quotations/ChargeCategories.jsx` create/edit modal | `chargeCategory.js` `createChargeCategoryApi`, `updateChargeCategoryApi` | create/update | C | modal `form` state -> reopen modal with `form` | active toggle (:170) = X |
| 13 | `ledgerCost` | `views/admin/ledger/cost/CostFormPage.jsx` autosave | `ledgerCost.js` `createLedgerCost`, `updateLedgerCost` | create/update | A | `:id?` fetch -> after load `setForm(draft.formState.form)`. Autosave then diffs against a fresh `originalForm` | key `ledgerCost:update:<id>` / `ledgerCost:create:<sessionKey>` |
| 14 | `ledgerInvoice` | `views/admin/ledger/invoice/InvoiceFormPage.jsx` autosave | `ledgerInvoice.js` `createLedgerInvoice`, `updateLedgerInvoice` | create/update | A | as #13 | |
| 15 | `ledgerCostBulk` | `views/admin/ledger/cost/index.jsx` bulk edit | `bulkUpdateLedgerCosts` | update | D | n/a | |
| 16 | `ledgerInvoiceBulk` | `views/admin/ledger/invoice/index.jsx` bulk edit | `bulkUpdateLedgerInvoices` | update | D | n/a | |
| 17 | `siForm` / `saForm` / `diForm` / `dcForm` | `views/admin/forms/shipping-instructions/ShippingInstructionDetail.jsx` (`formType` instruction/advise/delivery/deliveryConfirmation; routes `/forms/shipping-instructions`, `/forms/shipping-advise`, `/forms/delivery-instructions`, `/forms/delivery-confirmation`, `/forms/shipping-instruction/:id`, `/forms/delivery-instruction/:id`) | `shippingInstructions.js` `postSiFormUpdateApi`, `shippingAdvise.js` `postShippingAdviseFormUpdateApi`, `deliveryInstruction.js` `postDeliveryInstructionFormUpdateApi`, `deliveryConfirmation.js` `postDeliveryConfirmationFormUpdateApi` (via `saveForm`, ~10 call sites incl. `saveMasterOption`) | update (latest record) | B | page loads latest record (`loadFormLatest`) -> banner lists pending field keys from merged payload; "Apply" sends it if `recordId` matches loaded form id, else warns | key `<module>:update:<formId>`. Payloads from several fields are **merged** into one draft |
| 18 | `ciplSimple` / `ciplPerUnit` / `invoiceManifest` (+ SA/DI/DC update tabs) | `views/admin/forms/ci-pl/CiPlDetail.jsx` (`/forms/ci-pl`, `/forms/ci-pl/archived`, `?tab=`) | `cipl.js` `postCiplSimpleFormCreateApi/UpdateApi`, `postCiplPerUnitFormCreateApi/UpdateApi`; `shippingInvoiceManifest.js` `postShippingInvoiceManifestFormCreateApi/UpdateApi`; SA/DI/DC update fns | create/update | B | tab via query param -> banner as #17 | CIPL update can return `{status:"error"}` (API_CONTRACT CIPL section) |
| 19 | `formOption` | `hooks/useFormOptionDelete.js` `updateFormOption` | `formOptions.js` `updateFormOptionApi` | update | D | n/a | rename of a dropdown option |
| 20 | `customer` | `views/admin/customer-registration/index.jsx` | `customer.js` `registerCustomerApi`, `updateCustomerApi` | create/update | A | `location.state.client/clientId` -> push `{clientId, draftId}`; overlay `formData` + contact rows | `result.result.status !== "success"` |
| 21 | `customerInline` | `views/admin/contacts/components/CustomerTable.js` | `updateCustomerApi` via `redux/actions/customerActions.js` | update | D | n/a | |
| 22 | `vendor` | `views/admin/vendor-registration/index.jsx` (`/vendor-registration/:id?`) | `vendor.js` `registerVendorApi`, `updateVendorApi` | create/update | A | `:id` + `location.state.vendorData` -> overlay form state | `isSuccessResponse` (:305) negated |
| 23 | `vessel` | `views/admin/configurations/VesselForm.jsx` (`/configurations/vessels/create`, `/bulk-edit?ids=`, `/edit/:id`) | `vessels.js` `bulkCreateVessels`, `bulkUpdateVesselItems` | create/update | A | route ids fetch -> overlay `rows` (keep fresh `baselineById`) | `unwrapVesselResult(...).status === "error"` |
| 24 | `group` | `views/admin/configurations/groups.js` | `groups.js` `createGroup`, `updateGroup` | create/update | C | modal `formData` + `editingGroup` by id | |
| 25 | `pic` | `views/admin/configurations/pic.js` | `pic.js` `createPIC`, `updatePIC` | create/update | C | as #24 | |
| 26 | `uom` / `uomCategory` | `views/admin/configurations/uom.js` | `uom.js` `createUOM`, `updateUOM`, `createUOMCategory`, `updateUOMCategory` | create/update | C | two modals | |
| 27 | `country` | `views/admin/configurations/countries.js` | `countries.js` `createCountry`, `updateCountry` | create/update | C | | |
| 28 | `currency` | `views/admin/configurations/currencies.js` | `currencies.js` `createCurrency`, `updateCurrency` | create/update | C | | |
| 29 | `stockLocation` | `views/admin/configurations/locations.js` | `stockListLocations.js` `createLocation`, `updateLocation` | create/update | C | | |
| 30 | `stockDestination` | `views/admin/configurations/destinations.js` | `stockListDestinations.js` `createDestination`, `updateDestination` | create/update | C | | |
| 31 | `supplier` | `views/admin/configurations/suppliers.jsx` | `suppliers.js` `createSupplier`, `updateSupplier` | create/update | C | | |
| 32 | `user` | `views/admin/users/index.jsx` user modal | `users.js` `signupUserApi`, `updateUserApi` | create/update | C | modal `formData` + `editingUser` | `res.result.status==="error"`. Password stripped, so create Retry is disabled |
| 33 | `clientLogin` | `views/admin/users/index.jsx` client-access modal | `clientLogin.js` `createClientLoginApi`, `updateClientLoginApi` | create/update | C | modal `clientFormData` | password/confirm stripped, so create Retry is disabled |
| 34 | `carbonFactors` | `views/admin/carbon-calculator/carbon-emission.jsx` | `carbon.js` `updateEmissionFactorsApi` | update | D | n/a | |
| 35 | `carbonDistance` | `views/admin/carbon-calculator/shipping-order-emissions.jsx` | `carbon.js` `upsertLocationDistanceApi`, `setStockManualDistanceApi` | create/update | D | n/a | |
| X1 | | `users/index.jsx:463` deactivate, `ChargeCategories.jsx:170` active toggle, `MsoTab.jsx:240/287` link/unlink, `configurations/vessels.js:469` portal visibility | | action | X | | not entered field data |
| X2 | | `utils/stockReportPdf.js:839/1009` (status-change PDF create/update inside stock form) | `create/updateStockItemApi` | | X | | covered by the surrounding #1/#2 form draft (see Open questions) |
| X3 | | `components/forms/ShippingOrderForm.jsx` (via `shippingOrdersSlice` thunks), `ledger/*/CostEntryTableView.jsx` / `InvoiceTableView.jsx`, `ledgerSo.js` create/update, `warehouses.jsx`, `postShippingAdviseFormCreateApi`, `vessels.js` `createVessel/updateVessel` | | | X | | dead, hidden or unrouted |
| X4 | | `views/client/shipping-orders/ClientOrderTwoWayPanels.jsx` | `clientShippingOrders.js` `updateClientShippingOrderApi` | | X | | client portal (no Drafts page there) |

## Files to create
- `src/utils/draftStorage.js` + `draftStorage.test.js`: `draftStorageKey(userId)`, `readDrafts(userId)`,
  `writeDrafts(userId, items)` (returns `{ ok, reason }`, catches quota errors), `parseDraftsEnvelope(raw)`, `isDraftStorageKey(key)`.
- `src/utils/draftSanitize.js` + `draftSanitize.test.js`: `sanitizeDraftValue(value) -> { value, stripped }`.
- `src/utils/drafts.js` + `drafts.test.js`: `makeDraftId`, `makeDraftKey(module, mode, recordIdOrSessionKey)`,
  `buildDraft({...})` (sanitizes `formState` and `requests`), `upsertDraftInList(list, draft)` (keeps id/createdAt),
  `removeDraftFromList`, `sortDraftsNewestFirst`, `describeDraftError(errOrResult, fallback)` (wraps `getApiErrorMessage`, adds `status`),
  `canRetryDraft(draft, moduleDef)`, `canResumeDraft(draft, moduleDef)`.
- `src/redux/slices/draftsSlice.js` + `draftsSlice.test.js`: state `{ userId, items, hydrated }`. Reducers
  `hydrateDrafts({userId, items})`, `upsertDraft(draft)`, `removeDraft(id)`, `removeDraftByKey(key)`, `clearDraftsMemory()`.
  Selectors `selectDrafts`, `selectDraftCount`, `selectDraftById`, `selectDraftByKey`.
- `src/redux/hooks/useDrafts.js`: same style as `useStock.js`.
- `src/hooks/useDraftsSync.js`: hydrates on `user.id` change, writes on change, listens to `storage` events,
  clears memory on logout. Mounted once in `src/layouts/admin/index.js`.
- `src/hooks/useSaveWithDraft.js`: returns `saveWithDraft(options)` and `saveManualDraft(options)` (contract below).
- `src/hooks/useResumeDraft.js`: `useResumeDraft(moduleKeys, { ready })` reads `location.state.draftId`, returns the
  draft once `ready` is true, and returns `draftId` so it can be passed as `sourceDraftId`.
- `src/config/draftModules.js`: registry `{ [moduleKey]: { label, category, resumeTo(draft) -> {pathname, search?, state}, apis: { [apiName]: fn }, isFailure?(apiName, result) } }`.
  Imports existing `src/api/*` functions only.
- `src/views/admin/drafts/index.jsx`: Drafts page (layout modeled on `views/admin/history-logs/index.jsx`).
- `src/views/admin/drafts/DraftsTable.jsx` (optional split if the page is over ~250 lines).
- `src/components/drafts/DraftResumeBanner.jsx`: category B banner (pending field list, Apply, Discard).
- `src/components/drafts/SaveAsDraftButton.jsx`: shared button for the 3 manual-draft forms.

## Files to modify
- `src/utils/authStorage.js`: `persistScopedAuthOnBoot` also keeps keys that match `isDraftStorageKey`. Add a test in `authStorage.test.js`.
- `src/redux/store/index.js`: add `drafts` reducer. `store.test.js`: assert `drafts` initial state.
- `src/routes.js`: top-level `{ name: "Drafts", layout: "/admin", path: "/drafts", icon: MdDrafts, component: Drafts, badgeKey: "drafts" }`, placed after "Forms" and before "Configurations".
- `src/components/sidebar/components/Links.js`: if `route.badgeKey === "drafts"`, render a Chakra `Badge` with
  `selectDraftCount` (dot when `collapsed`). No other behaviour change.
- `src/layouts/admin/index.js`: call `useDraftsSync()`.
- Every screen in inventory rows 1-35: wrap the API call(s) with `saveWithDraft`. Add the resume adapter for categories A/B/C.
  Add `SaveAsDraftButton` to rows 1, 4 and 7 only.
- `docs/API_CONTRACT.md` / `docs/ARCHITECTURE.md`: short "Drafts (frontend only)" note (in the docs task).

## State & API changes
- **API:** none. Retry calls the existing functions listed in the inventory with the stored `args`.
- **Redux:** new `drafts` slice. It is persisted by `useDraftsSync` (not redux-persist; no new dependency).
- **Hook contract** `saveWithDraft(options)`:
  ```
  {
    module, mode, recordId, label,
    draftKey?,            // default makeDraftKey(module, mode, recordId ?? sessionKey)
    sessionKey?,          // stable per form mount (useRef) for create flows
    formState,            // UI state for Resume (sanitized inside)
    requests,             // [{ api, args }] for Retry (sanitized inside)
    call: () => Promise,  // the existing API call(s), unchanged
    isFailure?: (result) => boolean,
    failedFormState?: (result) => object, // partial failures: only failed rows
    sourceDraftId?,       // from useResumeDraft
  }
  ```
  On success (not `isFailure`): removes `sourceDraftId` and any draft with the same `draftKey`, then returns the result.
  On a thrown error: upserts the draft, shows the info toast, re-throws.
  On `isFailure`: upserts the draft, shows the info toast, returns the result.
  It must not catch errors from validation code that runs before `call`.
- `useResumeDraft` gives the draft to the form only after the form's own fetch is done (`ready`), so fetched data
  does not overwrite the draft values.

## Edge cases
- Auth failure (401/expired token): the axios interceptor clears auth and sets `window.location.href`. The draft is
  written synchronously in the catch before navigation, so it survives (needs a manual test).
- `user.id` is missing or falls back to `Date.now()`: drafts are written but cannot be found after the next login (Open question 1).
  If no user id exists at all, do not write. Show the toast "Draft not saved: no user session".
- Stale baseline on Resume of update drafts: categories A/C refetch the record and only overlay user-entered fields,
  so the diff is against fresh data. Retry resends the stored diff as is and may overwrite changes made in between.
  The Retry confirm dialog says so.
- Record deleted since the draft was made: Resume shows the form's "not found" handling and Retry shows the API
  error. The draft is kept until the user deletes it.
- Stock "already created" rows (`stockItemId` set by the PDF flow) must stay in update mode on Resume (keep `stockId`/`stockItemId` in `formState`).
- Rate rows created before a later row failed are already removed from `formRows` by existing code. The draft must hold only the remaining rows.
- Autosave forms: a debounced failure followed by a later success with the same key removes the draft (AC3b).
- Category B: if the page loads a different "latest" form id than `draft.recordId`, Apply is blocked with
  "This draft belongs to form #X; the current form is #Y".
- Multiple tabs editing the same key: last write wins (the `storage` event re-hydrates).
- Very large forms (hundreds of stock rows): sanitizer output is bounded once base64 is removed. Quota errors are handled (AC1c).
- Opening a resumed stock/SO edit form puts the sidebar into "open links in new tab" mode
  (`Links.js:77`). This is expected.
- Draft schema version mismatch: unknown `version` is treated as empty and not overwritten until the first write.

## Out of scope
- Backend-stored drafts, sharing drafts between users or devices.
- Storing files/images or passwords.
- Client portal (`/client/*`) forms.
- Delete calls, archive/accept/revise actions, toggles (X1).
- Changing existing validation, payload builders or error toasts beyond adding the wrapper.
- Draft expiry/auto-cleanup.

## Open questions
1. **User id stability:** does `/api/login` always return `result.user_id`? If not, should the draft key fall back to the user's email (`drafts:<email>`) instead of the `Date.now()` id?
2. Is it acceptable that category D screens (#3, 6, 8, 10, 11, 15, 16, 19, 21, 34, 35) get **Retry + Delete only** (Resume disabled) in v1? Building Resume for inline grids and wizards is a large extra effort.
3. Category B (SI/SA/DI/DC, CI/PL autosave): is "Resume = open the page + banner with pending fields + Apply" acceptable instead of putting the values back into the form's inputs? The inputs map to backend keys in many different ways.
4. Should the SoNumberTab "create SO" modal (#5) also get the manual "Save as draft" button, or only ShippingOrderEditPage?
5. Manual drafts: is Retry disabled (Resume only) acceptable, as the data has not passed validation yet?
6. X2 `stockReportPdf.js` status-change create/update: is it enough to rely on the surrounding stock form draft, or should these sub-calls also make their own drafts?
7. Should failures caused by session expiry (401) also create drafts? Recommended: yes.
8. `docs/API_CONTRACT.md` has no documented backend error shape ("TODO: document the backend error shape"). The spec assumes the shapes already handled in code (`result.status==="error"`, `result.message`, `response.data.message`, stock `errors[]`, rate `errors[]`). Please confirm there are no other failure shapes.

## Tasks (ordered, each independently verifiable)
- **T1** `src/utils/draftStorage.js`, `draftSanitize.js`, `drafts.js` + tests. Verify with `npm run test:ci`: cases for key per user,
  corrupt JSON, quota error, File/Blob/`datas`/password stripping, cycles, Set/Date, upsert keeps `createdAt`, sort order.
- **T2** `authStorage.js`: keep `drafts:*` keys during `persistScopedAuthOnBoot`, + test. Verify that the existing 4 tests and the new test pass.
- **T3** `draftsSlice.js` + selectors + test. Register it in the store. Update `store.test.js`. Verify with tests.
- **T4** `useDraftsSync` + mount in admin layout + `useDrafts` hook. Verify manually: a draft dispatched from devtools
  persists across reload. Logout clears it from memory. Logging in again shows it. A second tab updates.
- **T5** `src/config/draftModules.js` (registry for all modules in rows 1-35, APIs only from `src/api/*`) + a test
  that every registry `apis` entry is a function and every category A/B/C entry has `resumeTo`.
- **T6** `useSaveWithDraft` + `useResumeDraft` + a test with a mocked store/toast: throw path, `isFailure` path,
  success removes `sourceDraftId` and the same key, validation before `call` makes no draft.
- **T7** Drafts page + route + sidebar badge (`Links.js`). Verify: empty state, rows, Delete confirm, Retry
  enabled/disabled rules, Resume disabled for D, badge count/dot.
- **T8** Wire **Stock** (#1, #2, #3) incl. manual button on #1 and Resume adapter for #1/#2.
  Verify: forcing a failure (offline/DevTools block) creates a draft, Resume refills rows, a successful save removes the draft, partial-line case.
- **T9** Wire **Shipping orders** (#4, #5, #6) incl. manual button on #4 and Resume for #4/#5.
- **T10** Wire **Rates** (#7, #8) incl. manual button on #7 and Resume (rows + originalRows + pins).
- **T11** Wire **Quotations** (#9, #10, #11, #12).
- **T12** Wire **Ledger** (#13-#16) incl. autosave dedupe by key.
- **T13** Wire **Forms** (#17, #18, #19) + `DraftResumeBanner`.
- **T14** Wire **Contacts** (#20, #21, #22).
- **T15** Wire **Configurations** (#23-#31) and **Users** (#32, #33) incl. password stripping check.
- **T16** Wire **Carbon** (#34, #35).
- **T17** Docs: add a "Drafts (frontend only)" note to `docs/ARCHITECTURE.md` (slice, storage key, boot preservation) and
  `docs/API_CONTRACT.md` (failure shapes used by `isFailure`). Run `npm run check`.
