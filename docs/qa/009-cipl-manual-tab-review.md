# 009 CI/PL Manual tab - Verifier review

Verdict: **FAIL** (1 high finding: user-typed packed totals are discarded after every line save, which goes against the Backend answers section of the spec. Everything else is medium/low.)

Scope: uncommitted 009 changes in `src/api/cipl.js` (+`cipl.test.js`), `src/utils/ciPlManual.js` (+test),
`src/views/admin/forms/ci-pl/{CiPlDetail.jsx, CiPlManualHeaderFields.jsx, CiPlManualLines.jsx, CiPlManualStockPicker.jsx, CiPlArchivedList.jsx}`.
007/008 files ignored.

## Gate
- `npm run check`: lint:changed fails with 129 errors, all `react-hooks/rules-of-hooks` / pre-existing in
  `StockForm.jsx` / `NewStockItem.jsx` (not 009 files). ESLint on the 009 files: 0 errors, 24 warnings (exhaustive-deps /
  unused vars in CiPlDetail.jsx, almost all pre-existing pattern).
- `npm run test:ci`: 75 suites, 665 passed, 4 skipped. `ciPlManual.test.js` + `cipl.test.js`: 28 tests pass.
- `npm run build`: compiled successfully.

## Findings (by severity)

1. **High** - `src/views/admin/forms/ci-pl/CiPlDetail.jsx:2285-2310` (`handleManualSaveLines`) - after every line
   add/edit/delete the packed totals are replaced with the backend line sums (`totalPackedQuantity/Weight = apiTotals.packed*`,
   `lastSavedAutosaveRef.packed` set to the same values). A packed override the user typed is never re-sent, so it is lost on
   the server and in the UI (and in the PDF PACKED AS row). It also cancels a pending packed autosave: typing packed, then
   blurring a line cell within 500 ms, changes `formData.totalPackedQuantity`, the packed effect cleanup clears the timer, and
   the typed value is never sent. The spec (Backend answers) says: "if the user types different packed totals, send them in a
   SEPARATE call after the line save". Fix: keep a `manualPackedOverrideRef` (set in the PACKED AS onChange, cleared on reset/
   archive/load); in `handleManualSaveLines`, when it is set, after the line save call
   `saveForm(buildManualPackedPayload(id, override))` and keep the override in formData/lastSaved; only adopt
   `apiTotals.packed*` when there is no override. Line 2304 (`packedTotalsUserEditedRef = packed != 0`) is also meaningless for
   Manual and can go.

2. **Medium** - `src/views/admin/forms/ci-pl/CiPlManualLines.jsx:142,154,248` - `locked = isBusy || isReadOnly` and `isBusy`
   is the parent's `isSiFormLoading`, which every header / remarks / packed / consign autosave toggles. While any of those is in
   flight all line inputs are disabled, and `saveRow` returns early without a message when `locked`. A cell edited right before
   an unrelated autosave starts can stay dirty and never be saved (blur is either not fired on a disabled input or is ignored at
   :154). The row shows no error; only Archive gets disabled with a generic tooltip. Fix: lock line inputs only on the
   component's own in-flight line saves (rowState/toolbarBusy), or re-run `saveRow` for dirty rows when `isBusy` goes false;
   at least mark dirty rows (e.g. "Unsaved" badge).

3. **Medium (conditional, needs browser/backend confirmation)** - `src/views/admin/forms/ci-pl/CiPlDetail.jsx:1104, 1632-1637`
   - when the Manual latest load returns no form, `applySiFormResponse(null)` returns early, so the Manual tab keeps the Simple
   tab's formData (Job No, vessel title, consignee block, remarks, packed). The editable Job No field then shows the Simple job
   no. On the first header edit `ensureFormId` creates the manual draft and calls `applySiFormResponse(created)`, which resets
   `jobNo`/`vesselId` to the empty created values while the stale-closure candidate is still saved: the server gets the typed
   value but the UI clears it. Same pattern exists for Per unit/Manifest, but Manual is the first tab where Job No/Vessel are
   user-editable. Fix: in the Manual load effect, when `form` is null, reset the manual header/lines state (jobNo, vesselId,
   vessel, ciplNumber, manualForm, header snapshot); in `ensureFormId`, do not overwrite user-edited header fields when applying
   the created form (or only set id/snapshots).

4. **Low** - `src/views/admin/forms/ci-pl/CiPlManualLines.jsx:197-217, 219-232` + `CiPlDetail.jsx:2287-2288` - if
   `ensureFormId()` returns null, `handleManualSaveLines` returns null silently. Add stock items then does nothing, and a new row
   just stops spinning, with no message. Fix: throw/return an error ("Could not create the manual draft") so the row/toolbar
   shows it.

5. **Low** - `src/views/admin/forms/ci-pl/CiPlDetail.jsx:2525-2526` (Reset on Manual) - saved lines are deleted, but unsaved
   "New" rows in `CiPlManualLines` (`newRows` state) survive the reset, so a reset form still shows them and keeps Archive
   disabled. Fix: give `CiPlManualLines` a `key` that changes on reset/archive (e.g. `key={manualForm?.id + resetCounter}`),
   or clear `newRows` when `stockList` comes back empty after a reset.

6. **Low** - `src/views/admin/forms/ci-pl/CiPlArchivedList.jsx:167` - CI/PL NO is shown only for manual forms (`"—"` for
   Simple), although the spec says every form response has `cipl_number`. Fix: `form.cipl_number || "—"` for all types.

7. **Low** - `docs/API_CONTRACT.md` - not updated for the `form_type` param on `/api/cipl/form` (list/latest/create), manual
   line shapes (`{stock_list_id}`, free-text, `{id, delete:true}`), `job_no`/`vessel_id`/`cipl_number` and the
   "packed totals reset on stock_list update" rule (T14). Fix: run /update-docs before merge.

8. **Info (spec deviation, accepted by the Backend answers)** - AC8 says the TOTAL row "changes immediately on typing". The
   implementation shows box/weight/value totals from the backend (`readManualTotals`), so they update only after a save. Only
   the per-row value and the qty total are live. This matches "Totals come from the backend, do NOT calculate", but AC8 should
   be reworded at CP4.

9. **Info** - AC5: a free-text row is sent only on the explicit row "Save" button, not automatically when it becomes valid as
   the Design section describes. This is reasonable UX. Confirm at CP4.

## Checks that passed
- Tab wiring: slug `manual` at index 3, `?tab=manual` round-trips; `isCiPlManualTab` requires `isCiPlForm && !isCiPlArchivedView`.
  `resolveFormApis` has an explicit manual branch (load latest and create add `form_type:"manual"`; save/archive/options =
  Simple). Every `loadFormLatest`/`createForm` call site (ensureFormId, load effect, archive, reset, SI/agent/consignee
  handlers) goes through the wrapper, so nothing on tab 3 loads or creates without `form_type`.
- Explicit manual branches in CiPlDetail: load (`applySiFormResponse` early return after `setManualForm`), create, header
  autosave (candidate + snapshot, `vessel_id` id only via `idOf`), Simple stock-line autosave skipped (`isCiPlManualForm`
  plus the `manualResponseRef` check inside the timer for archived views), `mergeStockLinesFromServer` skipped, packed
  auto-calc skipped, packed save as a separate call without `stock_list`, archive (+ no-next-draft clear), reset
  (`buildManualResetLines`), PDF (head/body/total/packed/summary/column indexes), archived view (tab label, layout,
  read-only header and lines). No path on tab 3 falls through to Simple cargo behaviour.
- `stock_list_id` never sent with `id`: `buildManualLineEdit` builds only `{id, ...changed}` (tested);
  `buildCiplStockLinePayload` is never called on manual (reset/autosave branches checked).
- Line payloads match the contract: add `[{stock_list_id}]` (deduped, existing skipped), free-text
  `{description, hs_code, quantity, unit_price, box, weight}` (numbers, empty -> null), edit `{id, <changed keys>}`, delete
  `{id, delete:true}` after `window.confirm`; unsaved rows are discarded locally.
- Archived list: Simple -> no `form_type`, Manual -> `"manual"`, All -> `"all"`; `buildFormLoadPayload` forwards only
  `manual`/`all` and `form_type` alone does not pass the required check (tested). Load by id sends no `form_type`.
- Simple / Per unit / Manifest: diff changes are guarded by `isCiPlManualForm`/`isManualResponse`; the Simple `vessel`
  mapping, column indexes, PDF head/rows and header candidate are unchanged for the other tabs. `formData.vesselId` was added
  to the header-autosave deps; it stays `null` on non-manual responses, so the effect does not trigger extra saves there.
- No new endpoints. Picker uses the existing `getStockListApi` (`vessel_id`, `search`, `page`, `page_size`).
- Hooks: all hooks are at the top level in the three new components. Colors use Chakra tokens (`orange.*`, `gray.*`,
  `secondaryGray.600`, `brand`); `var(--chakra-colors-orange-400)` and `style={{color:"white"}}` copy existing CiPlDetail
  patterns.
- Pure helpers in `utils/ciPlManual.js` are covered by tests (parsing, math, validation, payload builders, header, PDF rows).

## Not verified (no browser run, no backend access)
- Every AC end to end in a browser (needs login): actual request bodies, autosave timing, PDF rendering/layout of the
  7-column manual table, picker paging.
- Whether `POST /api/cipl/form {latest_only, form_type:"manual"}` returns null or auto-creates when no manual draft exists
  (decides whether finding 3 can happen).
- Stock list row fields used in the picker (`item_desc`, `po_text`, qty via `item ?? items ?? item_id ?? stock_items_quantity`).
  If `item_id` comes back as an object, the Qty column would show `[object Object]`. The chain is copied from `NewStockItem.jsx`.
- Backend behaviour of the manual packed payload (`total_packed_quantity`, `total_packed_weight`, `packed_as`) sent without
  `stock_list`.
- Whether a blur fires when a focused input becomes disabled (finding 2, browser-dependent).
