---
description: Run the full verification gate on the current branch
---
1. Run `npm run check` and report the result faithfully, including failures.
2. Delegate to `qa-tester` for the browser walkthrough of the active spec (or the checklist in docs/TESTING.md if there is none).
3. Delegate to `verifier` for the diff review.
Present the combined result: check output, QA report path, verifier verdict. Do not fix anything unless I ask.
