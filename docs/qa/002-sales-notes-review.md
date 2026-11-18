# Verifier review: working tree on `staging` (2026-11-18)

`npm run check`: exit 0. lint:changed was clean, 58/58 test suites passed (420 passed, 4 skipped), and the build compiled.
This review was read-only. No application code was changed.

---

## Scope A: rate-copy sort-order fix
Files: `src/utils/rateCopy.js`, `src/utils/rateCopy.test.js`, `src/views/admin/quotations/CopyTariffModal.jsx`

### Verdict: PASS

### What was checked
- Comparator: `orderValue` maps `false`, `null`, `undefined`, `""` and non-numeric values to `+Infinity`. This puts unset
  values after every number. When both values are unset, `Infinity - Infinity` gives `NaN`. The `!Number.isNaN` guard
  then moves on to the next key, so the comparator stays consistent and does not return `NaN` to `Array.sort`. Numeric
  strings ("3") compare as numbers. A real `0` stays `0`. When ids are missing, the id tie-break returns `0`, and the sort
  is stable (ES2019+).
- `sortRatesForCopy` copies the input array, so the caller's `selectedRates` is not mutated. A test covers this.
- Placement: the sort runs after `filterNewRates` and before the empty check, the progress total and the create loop. It
  covers all three modes: from-selected, from-general and from-client.
- Minimal diff: one import and one line in the modal. The pure logic is in `src/utils/` with a sibling test. No new
  dependency, endpoint or colour. Follows CLAUDE.md.

### Findings (low only)
1. src/utils/rateCopy.test.js:5 - The NaN fall-through when both values are unset is not tested. Only one row has
   `group_sort_order: false`, so the `Infinity - Infinity` branch never runs. String values ("2") are not tested either.
   - Suggested fix: add a case with two rows where `group_sort_order` is `false`/`null` and their `sort_order` values
     differ, plus a numeric-string row.
2. src/utils/rateListForm.js:147 (pre-existing, outside the diff) - `sort_order: item.sort_order ?? ""` lets `false`
   through. `buildRateCreatePayload` then sends `Number(false)` = `sort_order: 0`. The backend would not assign a
   sequence, which works against this fix. This only matters if the API really returns `false` for `sort_order`. The new
   comment in rateCopy.js says it does for "an unset order". I have not confirmed this against the contract:
   API_CONTRACT.md does not document `sort_order`.
   - Suggested fix: confirm the API's value for an unset `sort_order`. If it is `false`, map it to `""` the same way as
     `group_sort_order` at line 153. That change belongs in a separate, scoped task.
3. src/utils/rateCopy.js:26 (informational) - Group Sort Order is set per agent and location. A from-selected copy that
   mixes agents or locations is sorted globally, so different agents' groups are interleaved. This is harmless if the
   backend numbers rates per agent and location.
   - Suggested fix: none needed unless mixed-agent copies are common. If they are, sort by agent and location first.

---

## Scope B: 002-sales-notes WIP (brief review against docs/specs/002-sales-notes.md)

### Verdict: PASS (low findings only; browser flows still unverified)

From the code, acceptance criteria A1-A15, B1-B3, C1-C3, D1-D3 and E1 are implemented, and E3 passes. Points checked:
- `registerPayload` does not include `follow_up` (D3).
- `updateCustomerFollowUpApi` posts exactly `{ customer_id, follow_up }`, and its error is re-thrown through
  `handleApiError`. On failure the Switch goes back to its old value (D1).
- Reversed or invalid date ranges send no request on either screen (A5/C1).
- Endpoints added to `src/config/api.js` match the contract given in the spec.

### Findings (ordered by severity)
1. src/views/admin/contacts/components/SalesNotesTable.jsx:90-92 - Hex scrollbar colours (`#f1f1f1`, `#c1c1c1`, ...)
   break E2 ("no new hex colors"). They were copied from CustomerTable.
   - Suggested fix: use theme tokens, e.g. `gray.100`/`gray.700` and `gray.300`/`gray.600`.
2. src/views/admin/contacts/Customer.js:143 - While any date range is invalid, the early return also blocks refetches
   when client_code, email or follow_up change. Those filters look applied in the UI, but the table is stale until the
   date error is fixed.
   - Suggested fix: acceptable per the spec ("no request for that change"). Otherwise, show a hint that filters are
     paused while dates are invalid.
3. src/views/admin/contacts/components/CustomerTable.js:56-65,89 - Two separate imports from `utils/clientListFilters`,
   plus the alias `const CLIENT_DATE_FIELDS = CLIENT_DATE_FILTER_FIELDS`. This is dead indirection.
   - Suggested fix: merge into one import and use `CLIENT_DATE_FILTER_FIELDS` directly.
4. docs/API_CONTRACT.md - The `/api/client/sales*` endpoints and the new customer params (`follow_up`,
   `entry_date_*`, `follow_up_date_*`) are not recorded yet. This is T15, still open.
   - Suggested fix: run `/update-docs` after CP4.
5. docs/PROGRESS.md - Contradictory state:
   - "Spec: not yet written" and "Next action: delegate spec ... Stop at CP1", but it also says "WAITING AT CP4".
   - The spec header still says "Status: Spec (awaiting CP1)".
   - Suggested fix: the orchestrator should rewrite these sections when it next updates the file.

### Not verified
Browser data flows (staging CORS, no test credentials), including the real response envelope of
`GET /api/client/sales` (Open question 3), and whether a partial `/api/customer/update` call leaves other fields
unchanged (Open question 11).
