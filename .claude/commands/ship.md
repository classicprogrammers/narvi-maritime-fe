---
description: Prepare the current feature branch for a PR into staging (never pushes without approval)
---
1. Confirm `npm run check` passes and docs/PROGRESS.md shows CP4 approved. If not, stop.
2. Show `git log staging..HEAD --oneline` and `git diff staging...HEAD --stat`. Tidy commits only if I ask.
3. Draft the PR title and description (summary, acceptance criteria met, QA evidence, risks) and show it to me.
4. Only after my explicit OK: push the branch and open the PR into `staging` with `gh pr create`.
