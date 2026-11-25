# Decisions

Append-only. Format: `YYYY-MM-DD - decision - why`.

- 2026-10-26 - Adopt supervised multi-agent workflow (architect, ui-designer, developer, qa-tester, verifier) with human checkpoints CP1-CP5 - frontend-only repo with little test coverage, solo supervisor.
- 2026-11-25 - Tariff rates older than 12 months (all charge types) are flagged by a single banner driven by the backend `oldest_last_update` (whole filtered set), plus a per-row "Last Updated" column and "Old" badge; the 12-month threshold lives only in `src/utils/tariffRateAge.js`; rows with unknown (`false`) dates are never treated as old; exports are unchanged - the page-only alternative would miss old rates on other pages, and an extra `fetch_all` request would be slow on large tariffs. The user chose the backend value.
