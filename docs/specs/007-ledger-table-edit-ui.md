# 007 Ledger table edit: UI

Companion to `007-ledger-table-edit.md` (approved). Applies to Cost DB and Invoice DB unless marked Cost only.
Chakra v2 components and theme tokens only (no hex, no new dependency). Light/dark values via `useColorModeValue`
with the same token pairs as `LedgerEntryTable.jsx` (`gray.200/600` borders, `gray.100/700` header, `gray.50/800`
toolbar, `gray.500/400` muted, `blue.50/gray.700` hover).

Approved decisions: default view Form; one "Save changes" for all rows (no per-row save); 50-row limit;
buttons "Edit selected" and "Set same value"; no drafts for failed saves (so T14 is dropped); SO Number and
Invoice Number read-only in the table.

## 1. List selection bar
File: `src/views/admin/ledger/{cost,invoice}/index.jsx`, the existing `Flex` bar shown when `selectedIds.length > 0`
(cost: ~line 1210).
Order, left to right, wrapping (`wrap="wrap"`, `gap={3}`):
1. `Text` "{n} item(s) selected" (fontSize sm, weight 600, unchanged).
2. **Edit selected**: `Button size="sm" colorScheme="blue" leftIcon={MdEdit}`. Disabled when `n > 50`
   (`LEDGER_EDIT_MAX_ROWS`) or `n === 0`. Disabled state wrapped in `Tooltip` "Edit supports up to 50 records. Clear some rows."
3. **Set same value**: `Button size="sm" variant="outline" colorScheme="red" leftIcon={MdEdit}`; opens existing
   `LedgerBulkEditModal`; limit stays 500 (`BULK_MAX_IDS`). (The old red "Edit selected" style moves here.)
4. "Clear Selection" ghost button (unchanged).
5. Limit message: `Text fontSize="xs" color="red.500"`: when `n > 50` show "Edit supports up to 50 records. Clear some rows."; when `n > 500` the existing bulk message also shows.
Cancelled rows keep their disabled checkbox, so they cannot be selected.

## 2. Table / Form toggle
Copy the `HStack spacing="2"` block of `NewStockItem.jsx` 2693-2714 verbatim in structure: two `size="sm"` Buttons,
`leftIcon` `MdTableChart` ("Table view") and `MdViewList` ("Form view"), active = `colorScheme="blue" variant="solid"`,
inactive = `colorScheme="gray" variant="outline"`, `aria-pressed` on both.
- **New shared component (flag): `src/components/ledger/LedgerEditViewToggle.jsx`** (already T7 in the spec), props
  `{ value, onChange, isDisabled }`. Needed because it is used on 4 screens (2 table pages, 2 form pages). No other new shared component is required.
- Click writes the choice via `writeLedgerEditView` and navigates keeping ids. Disabled (with tooltip "Saving...") while saving.
- Shown only in edit mode of the form page; create mode has no toggle.
- Narrow width: the header wraps; toggle moves to its own row (`flexWrap="wrap"`, `gap`).

## 3. Edit table page
Files: `cost/CostEditTablePage.jsx`, `invoice/InvoiceEditTablePage.jsx`, built on `components/ledger/LedgerEntryTable.jsx`
(edit-mode props). Reference sibling: `CostEntryTableView.jsx` / `InvoiceTableView.jsx`.

### Header (grid like Items: title | toggle | actions)
- Left: `IconButton` back arrow (aria-label "Back to list") + `Text` heading "Edit Cost Entries ({n})" / "Edit Invoices ({n})".
- Center: `LedgerEditViewToggle`.
- Right: muted `Text` "{n} rows, {d} edited", then "Back to list" (`variant="outline"`).
- Below header, when ids were truncated: `Alert status="warning"` "Only the first 50 records were loaded."

### Table
- Sticky: header row, `#`, status and SO Number columns (existing `stickyProps`; SO Number is read-only here but stays as the sticky anchor) and the actions column pinned right. Last left-sticky column keeps `stickyShadow`.
- Row background: `rowBg` / `stripeBg`; edited rows get a `blue.50` (dark `blue.900`) left tint via `boxShadow inset 3px 0 0` of `blue.400`.
- Read-only cells (`derived: true`, plus SO Number and Invoice Number): `muted` text on `gray.50/gray.700` background, no input, `cursor="default"`, truncated with `title`.
- Editable cells: existing inputs/pickers from `CostEntryTableView` / `InvoiceTableView`, `inputBg`.
- Column order = `COST_TABLE_EDIT_COLUMNS` / `INVOICE_TABLE_EDIT_COLUMNS`. Long text (remarks, links): single line, `isTruncated`, full text in `title`; remarks inputs min width as in create table.
- Actions column: "Open" (`IconButton` `MdOpenInNew`, tooltip "Open in form view") and "Remove from table" (`IconButton` `MdClose`, tooltip "Remove from this screen. No data is deleted.").

### Row status badges (`Badge`, extends the existing map in `LedgerEntryTable.jsx`)
| Status | Label | colorScheme |
|---|---|---|
| nochange | No changes | gray |
| edited | Edited | blue |
| saving | Saving (with `Spinner size="xs"`) | blue |
| saved | Saved | green |
| missing | Missing required | orange |
| duplicate | Duplicate invoice | red |
| checkinvoice (Cost) | Check invoice | yellow |
| error | Error | red |
| cancelled | Cancelled | gray (`variant="subtle"`, row text muted) |
| loaderror | Load error | red (`variant="outline"`) |
Message line below the row uses the existing alert row (`red.500` / `orange.500` / `yellow.600` text); "Check invoice" message lists agent names and says "Press Save changes again to keep it."
Load error row: message + `Button size="xs" variant="outline"` "Retry" in the message line; all cells disabled.

### Save changes bar
Toolbar uses existing `toolbarBg` bar; made **sticky at the bottom** of the page container (`position="sticky" bottom={0} zIndex={10}`, top border `borderColor`), so it is reachable with 50 rows.
- Left: muted text "{n} unsaved" / "No unsaved changes".
- Right: `Button colorScheme="green"` "Save changes ({n})" (existing `saveLabel` prop). Disabled when `n === 0`; `isLoading` + `loadingText="Saving {k}/{n}"` while saving.
- While saving: all row inputs, toggle, Back, Remove, Open are disabled; `LedgerCostFileCell` disabled for the saving row only.
- Result: toast "x saved, y need attention" (`status` success if y = 0, else `warning`). Failed rows stay Error/Missing/Duplicate/Check with their message; no draft is stored, so the message says "Not saved. Fix and press Save changes again."

### Unsaved-changes guard
- react-router v5 `Prompt` when any row is Edited/Error/Missing/Duplicate/Check; `beforeunload` listener for browser close.
- Message (native confirm): "You have unsaved changes. Leave without saving?"
- Applies to Back, sidebar, toggle, row "Open", browser back. Not triggered by "Remove from table" of a clean row; removing an edited row asks the same confirm.

## 4. Cost file column (Cost only)
Cell: `src/components/ledger/LedgerCostFileCell.jsx` (reuse as is; no new props needed). Column "Invoice File", `minW 190px`.
- Props per row: `file={row.record.invoice_file}`, `inputId={"cost-file-"+row.id}`, `canEdit={status !== "cancelled" && status !== "loaderror"}`, handlers as `cost/index.jsx:752-780`.
- States: no file = "Upload" outline button; file = filename link (truncated, `title`), size, Download / Replace / Remove icons; cancelled = download only; no file and cannot edit = "-" in `gray.400`; busy = per-action `isLoading`; row saving = wrap in `Box pointerEvents="none" opacity={0.5}`.
- File actions apply immediately and show their own toast. Show a muted caption in the column header tooltip: "Files save immediately, not with Save changes."
- Validation errors from `validateCostInvoiceFile` appear as toast (existing handler behaviour).

## 5. Form view with several records
File: `CostFormPage.jsx` / `InvoiceFormPage.jsx`, shown only when `ids` has more than one id.
- Bar under the page header: `Flex` with `IconButton MdChevronLeft` ("Previous record"), `Text` "Record {i} of {n}" (weight 600), `IconButton MdChevronRight` ("Next record"), plus muted text with the current record's SO / invoice number.
- Prev disabled at i = 1, Next disabled at i = n. Both disabled (with tooltip "Saving...") while the form is saving or has a pending autosave.
- The toggle sits in the same header (Table view switches to `edit?ids=...`).
- Single record (no `ids` or 1 id): no navigator.
- Loading next record: existing form spinner; error: existing form load-error state plus "Back to list".
- Narrow width: bar wraps; Prev/Next stay together.

## 6. Page states
| State | Behavior |
|---|---|
| Loading | Centered `Spinner` + muted "Loading {done} of {n} records..." (concurrency 5); toolbar disabled. Rows appear when all settled; rows that failed are Load error. |
| Empty (no valid ids) | Redirect to the list with info toast "No records selected." No empty page rendered. |
| All rows removed | `Flex` centered `Text` "No rows left." + "Back to list" button; Save disabled; guard off. |
| Load error (row) | See badges; page stays usable for other rows. |
| Load error (all rows) | `Alert status="error"` "Could not load the selected records." + "Retry all" and "Back to list". |
| Partial save failure | Summary toast; failed rows keep message; Save bar count shows remaining dirty rows; page not blocked. |
| Cancelled row | Read-only row, excluded from Save count, file download only. |
| Disabled | Saving: everything disabled except scrolling. Read-only cells: muted. |
| Over 50 ids | Warning alert (see header). |
| Long text | Truncate + `title` in cells and messages (messages wrap, max 2 lines then `title`). |
| Narrow width | Table scrolls horizontally inside its container (existing); sticky columns keep `#`, status, SO visible; header and Save bar wrap; Save button full width under 480px (`w={{ base: "100%", sm: "auto" }}`). |

## 7. Validation messages (reuse, do not reword)
Use the messages returned by `validateCostForm` / `validateInvoiceForm`; row status "Missing required" with the list of fields.
New texts only: "Duplicate invoice number for this agent." comes from `checkLedgerCostInvoices` result; "Check invoice: also used under {agents}." for other-agent hits; "Could not load this record." for load error fallback; "Not saved. Fix and press Save changes again." for failed save fallback.

## 8. New shared components
- `LedgerEditViewToggle.jsx` (components/ledger): yes, new (copy of the Items buttons).
- Everything else reuses existing components (`LedgerEntryTable` with edit props, `LedgerCostFileCell`, Chakra `Badge`, `Alert`, `Tooltip`, `Prompt`).
- Open point for the developer: if the sticky bottom Save bar cannot live inside `LedgerEntryTable`'s existing toolbar, add it in the page file, not as a new shared component.
