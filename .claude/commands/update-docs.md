---
description: Refresh ARCHITECTURE.md, API_CONTRACT.md and DECISIONS.md after a feature
---
Compare `git diff staging...HEAD` with docs/ARCHITECTURE.md and docs/API_CONTRACT.md.
Update only what the change made stale: new screens/routes/slices/hooks, new endpoints or payload fields actually used in `src/api`, new shared components.
Append any architectural decision to docs/DECISIONS.md (date, decision, why). Keep edits small and factual; do not invent backend behaviour.
Show me the doc diff.
