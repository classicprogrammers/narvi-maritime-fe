# Client Tariffs follow-up QA (2026-11-13)

Scope: src/views/admin/quotations/client-tariffs.jsx (now committed as beeceb4, working tree clean for this file).
Browser: dev server on :3003 reachable; app redirects to /auth/sign-in. No credentials can be typed by QA, so the Client Tariffs screen was not reached.

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | PDF title includes location ("Export Tariffs - SIN" / "Import + DOB Tariffs - SIN"; no location -> "Export Tariffs"); next line client name/agent, then Generated, Currency | NOT VERIFIED | Needs login + tariff data. Code review only: line 332 builds `${typeLabel} Tariffs - ${filters.location}` or `${typeLabel} Tariffs`. Header line order lives in buildPdfModel, not inspected. |
| 2 | Remarks footer: "Remarks:" on one line, text on next | NOT VERIFIED | Code review only: line 341 `Remarks:\n${remarks.trim()}`; empty remarks -> no block. Whether the PDF renderer honors "\n" is unconfirmed. |
| 3 | "Delete remarks" button clears the box, disabled when empty | NOT VERIFIED | Code review only: onClick `setRemarks("")`, `isDisabled={!remarks}` (lines ~560-570). Not exercised in browser. Note: whitespace-only remarks leave the button enabled (acceptable). |

Not done: unit tests added (no new pure logic in this change); test:ci/build not run in this task.
Bugs found: none. Console/network not checked (no authenticated session).
To finish: user signs in the preview browser, then re-run items 1-3 (also confirm backend /api/client/rate/tariff no longer returns 500).
