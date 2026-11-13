# QA: Client Tariffs (2026-11-13)

Scope: src/views/admin/quotations/client-tariffs.jsx, rateListPdf.js, src/utils/clientTariffSections.js (uncommitted, branch staging).

## Environment
- Dev server started via preview_start "web" on http://localhost:3003 (3000 was busy). App compiles and renders the Sign In page; console shows no errors.
- Login not possible (credentials cannot be typed by QA; none supplied). Backend /api/client/rate/tariff also reported as HTTP 500. So no in-browser verification of the screen, PDF or Excel was done.
- Unit tests: `src/utils/clientTariffSections.test.js` passes (5/5), including the new `uniqueCurrencies` test. `npm run build` was not run in this pass.

## Checklist
| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Columns Rate Name, Standard / If Apply, Currency, Charges, Rate Calculation, Shipment Type | NOT VERIFIED (code looks right) | Diff: COLUMNS now has `rate_calculation` right after `sales` (Charges); SCREEN_COLUMNS appends Shipment Type. Not seen in browser. |
| 2 | Buttons: Export PDF, Import + DOB PDF, one Export Excel | NOT VERIFIED | Diff does not touch the button markup; not seen in browser. |
| 3 | PDF header/currency/sections/letterhead/Rate Calculation | NOT VERIFIED (code looks right) | Diff: title `Export Tariffs` / `Import + DOB Tariffs`, no record count (tariffHeader); client name via scopeLabel; Generated; `Currency: X` only if `uniqueCurrencies(all).length === 1`, and then the Currency column is dropped (PDF_COLUMNS_NO_CURRENCY); with several currencies the column stays and no Currency line prints; table start shifted for a blank line; sections Standard then If Apply (buildTypeSections); Rate Calculation after Charges. Letterhead code unchanged. Visual layout not checked. |
| 4 | Excel file name export-tariffs-<date>.xlsx / import-dob-tariffs-<date>.xlsx, no 'Sheet name' error | NOT VERIFIED (code looks right) | Diff: filePrefix is `import-dob-tariffs` when filter is import_dob, else `export-tariffs`. Sheet names are `Client Tariff - <label>` via shipmentTypeSheetLabel; whether that is <=31 chars and free of illegal characters was not checked here, and no download was run. |

## Bugs found
None confirmed. Observations to check once login and data work:
- Excel `sheetName` is "Client Tariff - " plus the shipment type label; confirm it stays within Excel's 31-character limit.
- The PDF filename suffix still uses `client-tariff-<type>` (unchanged), which is not part of the checklist.
- A tariff with no rows may hit the empty-state branch before any PDF is built; check that the empty and error toasts show when the backend returns 500.

## To finish
Someone with a test login must sign in at http://localhost:3003 and repeat items 1 to 4, ideally with a single-currency and a multi-currency client. The backend 500 on /api/client/rate/tariff must be fixed first.
