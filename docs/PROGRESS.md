# Progress

The handoff file. The orchestrator rewrites it after every phase. After `/clear` or a crash, run `/resume`.

## Current feature
001-drafts: save entered form data as a frontend draft when any create/update API call fails; Drafts sidebar item + page (list, Resume, Retry, Delete). Manual "Save as draft" button on Stock list, Shipping order, Rate list. Files/images excluded. Redux slice persisted to localStorage, keyed per user.

## Phase
CP1 approved. CP2 accepted by user (no commits; user tests locally then pushes). Implement: T1-T10 + T9a done (pilot: stock, shipping order, rates). Paused for user decision before T11-T16. Open risk: stock create partial-failure Retry may duplicate created rows. Nothing browser-tested yet. (Phases: intake, spec CP1, plan CP2, implement, QA, review, approval CP4, ship CP5)

## Branch
`staging` (no feature branch: CLAUDE.md hard rule + user preference)

## Spec
docs/specs/001-drafts.md (17 tasks T1-T17, 8 open questions)

## Tasks
- [x] T1 utils: draftStorage, draftSanitize, drafts + tests
- [x] T2 authStorage: keep `drafts:*` on boot + test
- [x] T3 draftsSlice + store wiring + tests
- [x] T4 useDraftsSync (admin layout) + useDrafts
- [x] T5 draftModules registry + test
- [x] T6 useSaveWithDraft + useResumeDraft + tests (generic isFailure; 401 = draft, redirect, toast)
- [x] T7 Drafts page + route + sidebar badge
- [x] T8 Stock (#1-#3) + manual button + Resume
- [x] T9 Shipping order (#4, #6) + manual button + Resume
- [x] T9a Remove dead SoNumberTab Create SO modal
- [x] T10 Rates (#7, #8) + manual button + Resume
- [x] T11 Quotations (#10, #11, #12)
- [x] T12 Ledger bulk (#15, #16)
- [x] T13 Contacts (#20-#22)
- [x] T14 Configurations (#23-#31) + Users (#32, #33)
- [x] T15 Carbon (#34, #35) + formOption (#19)
- [x] T16 Docs + npm run check

## Decisions
- Work stays on `staging`; no `feature/*` branch created (CLAUDE.md "Only two branches").
- Storage: Redux slice for live UI state + localStorage for persistence, key `drafts:<userId>`.
- Manual "Save as draft" button only on Stock list, Shipping order, Rate list; all other modules draft on API failure only.

- CP1 answers (user): remove dead SoNumberTab Create SO modal; skip autosave modules; draft bulk entries too; user_id from login is stable; 401 -> draft + redirect to login with toast; draft on any failure shape.

- CP2 (user): do NOT commit anything; changes stay uncommitted in the working tree. User tests and pushes themselves.

## Blockers / open questions
- Open A resolved: QuotationDetail `persist` (#10) is an explicit save (toast "Quotation saved", no debounce), so #10 and #11 stay in scope (Retry + Delete).
- Open B: bulk Resume only for full-form bulk screens (#1, #7, #23); inline grids Retry+Delete. Default accepted unless user objects.
- Defaults still assumed: manual drafts have Retry disabled; PDF status-change calls rely on surrounding stock draft.
- Phase 0 (ARCHITECTURE/STYLE_GUIDE/API_CONTRACT TODOs) may be incomplete; architect to report gaps.

## Next action
Wait for CP2 approval, then delegate T1 to `developer`.
