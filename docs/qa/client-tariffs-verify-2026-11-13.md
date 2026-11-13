# Client Tariffs PDFs / Excel - Verifier review (2026-11-13)

Scope: only these four files. Other changes in the working tree were ignored.
- src/views/admin/quotations/client-tariffs.jsx
- src/views/admin/quotations/rateListPdf.js
- src/utils/clientTariffSections.js
- src/utils/clientTariffSections.test.js

Note: while this review was running, the reviewed changes were committed as `b0cef95` on `staging`. The committed content is the same as the diff I reviewed (4 files, +51/-14). I judged the current file state.

## Verdict: APPROVE WITH NOTES

## Checks run
- `npm run check`: **FAILED at `lint:changed`**. The 132 errors are all in unrelated working-tree files: `src/utils/chat.test.js`, `src/views/admin/stock-list/NewStockItem.jsx` and `src/views/admin/stock-list/StockForm.jsx` (`import/first`, `react-hooks/rules-of-hooks`). Because of that failure, the test and build steps did not run inside `check`.
- `npx eslint` on the 4 reviewed files: clean (exit 0).
- `npm run test:ci`: 50 suites passed, 345 tests passed, 4 skipped. `clientTariffSections.test.js` passed 5/5.
- `npm run build`: succeeded.

## Requirements
1. Separate Export and Import + DOB PDFs with the requested header, Standard then If Apply, each in Sort Order: **met**, apart from the edge case in finding M1. The title is `Export Tariffs` / `Import + DOB Tariffs` and the record count is dropped only when `tariffHeader` is set. Next come the scope (client) line, Generated, and a Currency line only when there is exactly one currency (the Currency column is then dropped). A blank line follows before the first section. DOB Standard and DOB If Apply go into the right sections (`isIfApplyRow`, tested).
2. Rate Calculation column after Charges on screen, PDF and Excel: **met**. It was added to `COLUMNS`, so `SCREEN_COLUMNS`, `PDF_COLUMNS` and the Excel headers all get it. Excel `colWidths` was extended to 5 entries.
3. A single Export Excel button, file name only: **met**. The name is `export-tariffs-<date>.xlsx`, or `import-dob-tariffs-<date>.xlsx` when the filter is `import_dob`. The sheet name logic is unchanged.
4. Letterhead once per page, retried on load failure, other PDFs unchanged: **met**. A `Set` per page stops the letterhead being drawn twice. Load is tried 3 times, 300 ms apart. Rate List (`buildRateListPdfModel`) and Agent Tariffs (`agent-tariffs.jsx:186`) do not pass `tariffHeader` or `currencyLabel`, so their title (with record count) and `tableStartY` stay as before.
5. CLAUDE.md rules: **met**. The diff is minimal. New pure logic (`uniqueCurrencies`) is in `src/utils` with tests. No new endpoints (still `GET /api/client/rate/tariff`). No colours or theme changes. No new dependencies.

Dead code check: `fileSuffix` and `GROUPED_COLUMNS` are fully removed with no leftover references. `typeScope` is still used for the sheet name. The new export `uniqueCurrencies` is used by `client-tariffs.jsx`. Nothing in these files can throw at runtime: `PDF_TYPE_LABELS` covers both values passed by the buttons, and `currencyLabel` / `tariffHeader` have defaults in `buildPdfModel`.

## Findings (by severity)

### Medium
- **M1** `src/utils/clientTariffSections.js:4-7`: `sortValue` uses `Number(row?.sort_order)`, and `Number(null)`, `Number(false)` and `Number("")` all give `0`, which is finite. Rates with an empty Sort Order (the rate form saves `null` for an empty field, `src/utils/rateListForm.js:216`, and the backend may return `null`/`false`) are therefore sorted **first**, not last as the JSDoc and the test name say. The test only covers `undefined`, which gives `NaN` and so goes last. **Fix:** treat `null`, `false` and `""` as missing before the `Number()` conversion, for example `if (v === null || v === false || v === "" || v === undefined) return Infinity`. Add `null` and `false` cases to the "missing last" test.

### Low
- **L1** `src/views/admin/quotations/client-tariffs.jsx:71` vs `src/utils/clientTariffSections.js:20`: the Currency column renders `row.currency ?? row.currency_id?.name`, but `uniqueCurrencies` uses `row.currency || row.currency_id?.name`. If the API returns `currency: false` or `""` together with a `currency_id`, the header line shows a currency while the cells (in the multi-currency case) show `-`. **Fix:** use one shared accessor (for example export a `rowCurrency(row)` from `clientTariffSections.js`) for both.
- **L2** `src/views/admin/quotations/client-tariffs.jsx:328-334`: `uniqueCurrencies` ignores rows with no currency. If a tariff has one currency plus some rows without one, the Currency column is still dropped and those rows look as if they use the header currency. **Fix (optional):** keep the column when any row has no currency, for example only drop it when `currencies.length === 1 && all.every(hasCurrency)`.
- **L3** `src/views/admin/quotations/rateListPdf.js:171-172,229`: `tableStartY` is also used as `margin.top` for continuation pages. Tariff PDFs therefore get an extra 12-24 pt empty band at the top of page 2 onwards, where there is no header. When `scopeLabel` is empty (no client, location or agent selected) there are two blank lines before the first table instead of one. This is cosmetic. **Fix (optional):** work out the header height from the actual `metaY` (`metaY + 24`) for the first page and keep the old margin for later pages.
- **L4** `src/views/admin/quotations/rateListPdf.js:125-136`: after the third failed attempt the loop still waits 300 ms before throwing. **Fix:** skip the delay on the last attempt (`if (attempt < 2) await ...`).

### Info (outside this diff)
- `src/views/admin/quotations/rateListPdf.js:279`: the regex `/[^w.-]+/g` is missing a backslash (`[^\w.-]`). Every character except `w`, `.` and `-` is replaced, so a client scope turns into dashes and the PDF file name looks like `rate-list-client-tariff-export---2026-11-13.pdf`. This bug existed before this change. It is listed here only because it is in a reviewed file.
- The header "client name" line is the shared `exportScope` (client · location · agent). When no client filter is set, no client name is printed. This matches the existing behaviour and is noted for the human reviewer.
- With no Shipment Type filter, the Excel file is named `export-tariffs-<date>.xlsx` even though it contains both Export and Import / DOB rows. This matches the stated requirement, but users may find the name misleading.
