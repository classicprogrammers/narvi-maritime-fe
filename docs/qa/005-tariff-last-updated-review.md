# Review 005 tariff last updated (independent re-review of the staged change)

Date: 2026-11-25. Branch `staging`. Reviewer: verifier (read-only, no application code edited).
Scope: the staged 005 files (`git diff --cached`): `src/utils/tariffRateAge.js` (+ `.test.js`),
`src/views/admin/quotations/TariffTable.jsx`, `TariffLastUpdated.jsx`, `TariffStaleBanner.jsx`, `agent-tariffs.jsx`,
`client-tariffs.jsx`, and the doc edits in `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md`, `docs/DECISIONS.md`.
Checked against `docs/specs/005-tariff-last-updated.md` (wins where it differs from the UI spec), the UI spec and CLAUDE.md.
The 004 ledger work and `docs/PROGRESS.md` were not reviewed.

## Verdict: PASS

## Commands
- `npx eslint` on the 7 touched source files: clean (exit 0).
- `npm run test:ci -- tariffRateAge`: 1 suite, 23/23 pass.
- `npm run check` (lint:changed + test:ci + build): exit 0, "Compiled successfully".

## Checks
- **tariffRateAge.js:** strict parse (`DATE_PATTERN` with an optional `T`/space time part only), built with local
  `new Date(y, m-1, d)`, and a round-trip check that rejects `2025-02-30`, `0000-00-00` and years 0-99. The cutoff is today
  minus 12 months, clamped to the last day of the month, so Feb 29 gives Feb 28. It is strictly before -> old. Future dates
  are ok. A non-Date or invalid `today` is unknown. `formatLastUpdate` normalises to `YYYY-MM-DD` before `formatDateDMY`, so
  it can never return raw text. The only import is `formatDateDMY`. There is no charge-type branch (AC 5). This matches the
  spec rules.
- **Tests:** they cover the spec test list: null cases, trimming, time parts, impossible dates, the exact 12-month
  boundary, the leap day, the month end, the time of day, an invalid `today`, the default `today` via fake timers set to
  2026-11-25 (restored afterwards), `isRateOld` for the whole set, and the constants. The base fixture is 2025-06-15, not
  2026-11-25. The cases are equivalent, and the 2026-11-25 boundary is covered in the fake-timer block.
- **TariffTable:** this is a one-line change (`:149`). `renderCell` takes precedence. Otherwise `displayTariffValue(value)`
  runs with `value` computed exactly as before (`:136`), so existing `render` and plain columns are unchanged (AC 10). The
  JSDoc is updated.
- **TariffLastUpdated / TariffStaleBanner:** they follow the spec. The unknown case gives a muted em dash with
  `aria-label`. The old case gives an orange date and a subtle orange "Old" Badge with a `Tooltip hasArrow` showing
  `OLD_RATE_HINT`. The banner is a single line with `STALE_TARIFF_WARNING`, `role="status"`, and is not dismissible (AC
  4e). Only theme tokens, `colorScheme` and `status` are used, with no hex (AC 9).
- **Wiring:** on both screens `meta.oldestLastUpdate` is `false` in the initial state, `result.oldest_last_update ?? false`
  on success, and `false` in the error reset. The gate is `meta.totalCount > 0 &&` with no `!loading`, which matches the
  user's CP1 decision. The banner is placed directly above `TariffTable`. Agent uses
  `SCREEN_COLUMNS = [...COLUMNS, LAST_UPDATED_COLUMN]`. On Client the column is appended to the existing `SCREEN_COLUMNS`.
- **Exports:** Agent `EXCEL_COLUMNS` and Client `PDF_COLUMNS` still derive from the unchanged `COLUMNS`. The PDF and Excel
  modules are not touched (AC 7, code path only).
- **Threshold:** `12` appears once, at `src/utils/tariffRateAge.js:5`. `OLD_RATE_HINT` is built from the constant (AC 8).
- **Hygiene:** no new endpoints (`src/config/api.js`, `src/api/rate.js` and `package.json` are unchanged), no new
  dependencies, no dead code, no drive-by changes. The diff is minimal.
- **Docs:**
  - `ARCHITECTURE.md` describes the helper, the screens, the column and `renderCell` accurately. "Stays visible while
    paging" is correct because `meta` is kept during `loading`.
  - `API_CONTRACT.md` lists the two endpoints that exist in `src/api/rate.js:51,67` and the fields exactly as the spec
    states them.
  - `DECISIONS.md` is append-only and its entry matches the spec. No backend behaviour is invented beyond the
    user-confirmed contract in the spec.

## Findings (by severity)
1. Low (doc wording, non-blocking): `docs/API_CONTRACT.md:29` says the rule about which changes bump `last_update` is
   "per the backend team". The spec ("Backend contract (confirmed by the user)", `005-tariff-last-updated.md:19,27`)
   attributes it to the user. Suggested fix: change it to "per the backend contract confirmed by the user", or drop the
   attribution.

No code findings.

## Notes
- `docs/PROGRESS.md` is currently staged (index `M`) together with the 005 files. If it holds 004 content, unstage it or
  check it before committing 005.

## Unverified (no browser login; see docs/qa/005-tariff-last-updated-qa.md)
- That the backend actually returns `last_update` per row and `oldest_last_update` in the list meta on both endpoints.
- AC 1: the header and position at runtime (Client: before the delete column).
- AC 2 and 3: the rendered date, the em dash and the Old badge with its tooltip.
- AC 4a-d at runtime:
  - the banner on page 1 when the only old rate is on page 2
  - the same state on page N and with fetch all on and off
  - the banner hidden on error and on an empty result
  - the banner kept while paging
- AC 6: pagination, filters, search, selection, delete and copy unchanged, with no extra request.
- AC 7: the actual downloaded Excel and PDF files.
- AC 9: dark-mode contrast.
- Narrow-width layout.
- Console and network errors.
