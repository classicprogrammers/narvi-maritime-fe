# Progress

The handoff file. The orchestrator rewrites it after every phase. After `/clear` or a crash, run `/resume`.

## Current feature
002-sales-notes: Contacts / Client Management "SALES" tab. (1) Sales Notes list + create/edit/delete (remarks, entry date, follow-up date, dd/mm/yy) with entry/follow-up date filters. (2) "FOLLOW UP" filter in Advanced Filters (works like Narvi Maritime Approved Agents filter on stock list: add X to clear; list pops up); `follow_up` boolean on customers set via customer update. (3) Date filters (entry / follow-up) on customers + notes list popup. Backend contract: see request in session; endpoints `/api/client/sales`, `/create`, `/update`, `/delete`, `/api/customers?follow_up=...&follow_up_date_from/to&entry_date_from/to`.

## Phase
CP1 approved (open questions resolved with defaults). Plan = spec tasks T1-T15 (docs/specs/002-sales-notes.md). WAITING AT CP2: user approval of plan; no commits, work on `staging`. (Phases: intake, spec CP1, plan CP2, implement, QA, review, approval CP4, ship CP5)

## Branch
`staging` (no feature branch: CLAUDE.md hard rule + user preference in memory). Working tree was clean at start.

## Spec
docs/specs/002-sales-notes.md (not yet written)

## Tasks
- [x] T1 endpoints + src/api/clientSales.js + tests
- [x] T2 utils/salesNotes.js + tests (deviation: local normalizeToIsoDate/getLocalTodayIso copies, because importing DmyDateInput.jsx breaks Jest with `@chakra-ui/utils/context` not found; flag at CP4)
- [x] T3 utils/clientListFilters.js + tests (follow_up stored as "true"/"" in filter state; private CLIENT_DATE_FILTER_FIELDS, no import of salesNotes)
- [x] T4 customer API changes (+follow_up, new updateCustomerFollowUpApi) + tests
- [x] T5 Customer.js filter wiring (not browser-tested)
- [x] T6 Follow up filter UI (checkbox + X) (not browser-tested)
- [x] T7 Date range filter UI on clients (not browser-tested)
- [x] T8 Matching notes popup (SalesNotesMatchModal.jsx + button in CustomerTable.js; not browser-tested; reversed range is not validated inside matchDateParams)
- [x] T9 FOLLOW UP column toggle (not browser-tested; local CLIENT_DATE_FIELDS copies in Customer.js and CustomerTable.js)
- [x] T10 follow_up in client edit form (not browser-tested)
- [x] T11 SalesNoteFormModal
- [x] T12 Sales screen list
- [x] T13 Sales add/edit/delete
- [x] T14 Route + sidebar
- [ ] T15 npm run check + docs

## Decisions
- Work stays on `staging`; no `feature/*` branch created (CLAUDE.md "Only two branches"; the /feature skill asks for one, project rule wins).
- Endpoints for sales are not yet in `src/config/api.js` / docs/API_CONTRACT.md; contract supplied by backend dev in the request. Adding them to config is allowed (contract given), record in API_CONTRACT during /update-docs.

## QA / review
- QA: unit coverage OK; browser blocked by staging CORS (duplicate Access-Control-Allow-Origin) and no test credentials -> data flows NOT VERIFIED.
- Verifier loop 1: FAIL. Fix loop 1 running: (1) SalesNotes stuck loading with reversed saved range, (2) SalesNoteFormModal field errors never shown, (3) match popup sends reversed range, (4) buildClientFilterParams sends reversed/half ranges, (5) dedupe CLIENT_DATE_FIELDS, (8) empty-state text. Finding 6 (local date helpers) get a comment only; 7 (API_CONTRACT) handled by /update-docs.

- Fix loop 1: findings 1-6, 8 done. Re-verify: PASS (npm run check exit 0). Remaining low items: (a) Customer.js:143 early return skips refetch on non-date filter changes while a date error exists, (b) CustomerTable.js duplicate import + alias of CLIENT_DATE_FILTER_FIELDS, (c) hex scrollbar colors in SalesNotesTable.jsx:90-92 copied from CustomerTable, (d) sanitizeSalesListState keeps reversed saved range. Finding 7: API_CONTRACT.md update pending (/update-docs after CP4).
- Phase: WAITING AT CP4 (diff + QA + verifier). Browser flows unverified (staging CORS, no test credentials).

## Blockers / open questions
- Spec open questions 1-11 resolved with defaults (see spec); user asked how to test. Still waiting for explicit CP1 approval.

## Next action
Get answers, then delegate spec to `architect` (and `ui-designer`). Stop at CP1.

## Previous feature (archived summary)
001-drafts: frontend draft-on-failure feature. T1-T16 marked done (see git log / docs/specs/001-drafts.md). Open risk noted then: stock create partial-failure Retry may duplicate created rows. Was never browser-tested at last note.

## Second feature in flight (parallel to 002): 003-rate-list-location-filters
Rate List cascading filters using the new POST /api/rate/list/options (rate_type, location/location_id, client_id, agent_id, currency_id, rate_name, import_group; option lists only contain values valid for the current selection; new location_options + q_location; general => no clients; client_specific => only clients with client-specific tariffs; re-call options after every filter change). Scope: src/views/admin/quotations/rate-list.jsx only. Origin: Igor's IAH request.
- Branch: `staging` (no feature branch, per CLAUDE.md). 002 files are uncommitted in the same tree: do not touch or commit them with 003.
- Phase: spec drafting (architect) -> CP1.
- Spec: docs/specs/003-rate-list-location-filters.md
