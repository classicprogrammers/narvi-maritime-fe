# QA 005 tariff last updated

Date: 2026-11-25. Branch staging. Dev server already running at http://localhost:3003 (reused, no duplicate started).

## Blocker (browser ACs)
My browser pane is signed out: navigating to /admin/quotations/agent-tariffs redirects to /auth/sign-in ("This is the
staging environment", email + password form). I have no credentials and did not guess or enter any. Everything that needs the
signed-in screens is UNVERIFIED by me (column, badge, banner, paging, console/network, dark mode, narrow width). The
supervising session's observations in the user's own Chrome are a lead only and are not counted as my evidence.

## Automated (my own runs)
- Full `CI=true npx react-scripts test --watchAll=false`: 68 suites passed, 555 passed, 4 skipped, 0 failed (includes
  `src/utils/tariffRateAge.test.js`).
- `npm run build`: started; result noted in the final report (was still running when this file was written).
- Lint not run by me (`lint:changed` is part of `npm run check`, left to the caller).

## AC by AC
| AC | Result | Evidence |
|----|--------|----------|
| 1 Last Updated column, last data column | UNVERIFIED (browser); code OK | agent-tariffs.jsx:74 `SCREEN_COLUMNS = [...COLUMNS, LAST_UPDATED_COLUMN]` passed at :440. client-tariffs.jsx:93-101 appended last in `SCREEN_COLUMNS`, used at :710. |
| 2 DD/MM/YYYY, em dash for unknown | UNVERIFIED (browser); unit tests PASS | `formatLastUpdate` tests pass. |
| 3 Old = orange date + Old badge, boundaries | UNVERIFIED (browser); unit tests PASS | Boundary tests for `isRateOld`/`getRateAgeStatus` pass. |
| 4a Banner from oldest_last_update, totalCount > 0 | UNVERIFIED (browser); code OK | Both screens: `{meta.totalCount > 0 && <TariffStaleBanner oldestLastUpdate={meta.oldestLastUpdate} />}` (agent :437, client :707); meta from `result.oldest_last_update ?? false`. Banner returns null unless `isRateOld`. |
| 4b Not driven by rows | PASS (code) | Banner takes only `oldestLastUpdate`; rows never scanned. |
| 4c Hidden on error / empty; visible while loading (CP1 decision) | UNVERIFIED (browser); code OK | Gate has no `loading` (matches CP1). Error reset sets `totalCount: 0, oldestLastUpdate: false` (agent :179, client :245), so the banner hides. |
| 4d Same on any page / fetch all | UNVERIFIED (browser); code OK | Value is from the response meta only, no page logic. |
| 4e Single line, no count, no "on this page" | PASS (code) | TariffStaleBanner.jsx now renders only `<Text>{STALE_TARIFF_WARNING}</Text>`. The second "oldest rate ..." line seen in my earlier run is gone. Visual single-line check UNVERIFIED. |
| 5 No charge-type branch | PASS (code) | No charge type referenced in the three new files. |
| 6 Behaviour unchanged, no extra request | UNVERIFIED (browser); code OK | Diff adds a meta key, a column, a banner; no new calls. Network not observed. |
| 7 Exports unchanged | PASS (code) | `COLUMNS`/`EXCEL_COLUMNS`/`PDF_COLUMNS` unchanged; `LAST_UPDATED_COLUMN` only in screen lists. No file downloaded. |
| 8 Single `12` constant | PASS (code) | In tariffRateAge.js `12` appears only at line 5 (`TARIFF_RATE_MAX_AGE_MONTHS`). |
| 9 Theme tokens, light/dark | UNVERIFIED (visual); code OK | useColorModeValue / colorScheme / status, no hex found. |
| 10 Existing TariffTable columns | PASS (code) | Only `renderCell` branch added. |
| 11 check + tests | PASS (tests, my run); build see report; lint not run by me | |

## Other requested items
- Console / network errors: UNVERIFIED (only sign-in page loaded; no errors observed there).
- Banner on page 2 / while paging: UNVERIFIED by me.
- Dark mode, narrow width (resize_window): UNVERIFIED (signed out).
- Error/empty/unknown-date states: UNVERIFIED (code gate OK).

## Bugs
None found. No functional defects from code inspection; earlier AC 4e discrepancy (second banner line) is resolved.

## To finish
Provide a signed-in browser session (or test credentials), then walk both screens; use network override to simulate
`oldest_last_update` cases (old, ok, false, error, empty) and narrow width / dark mode.
