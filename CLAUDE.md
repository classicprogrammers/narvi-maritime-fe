# narvi-maritime-fe

Maritime operations admin frontend (stock, CI/PL, shipping instructions/orders, quotations, ledger, rates).
Stack: React 18, Chakra UI v2, Redux Toolkit, react-router v5, axios, react-table v7, jspdf/xlsx exports.
Create React App (react-scripts 5), JavaScript (JSX), no TypeScript. Absolute imports from `src/` (jsconfig `baseUrl`).

## Commands
- `npm start` dev server on :3000 (ESLint is disabled in start/build, so lint separately)
- `npm run lint:changed` ESLint only on files changed vs `staging`
- `npm run test:ci` run unit tests once (Jest + React Testing Library)
- `npm run check` lint:changed + test:ci + build. Must pass before any review.

## Layout
- `src/views/admin/<feature>/` screens (stock-list, forms/*, quotations, ledger, ...)
- `src/components/` shared UI (forms, modals, stock-list, shipping-order, ...)
- `src/api/` one axios module per backend resource; shared client in `src/api/axios.js`, endpoints in `src/config/api.js`
- `src/redux/` slices (user, stock, customer, vendor, shippingOrders)
- `src/utils/` pure helpers (tests live beside them as `*.test.js`)
- `src/hooks/`, `src/constants/`, `src/theme/`
- Details: docs/ARCHITECTURE.md. UI rules: docs/STYLE_GUIDE.md. Backend: docs/API_CONTRACT.md. Tests: docs/TESTING.md.

## Hard rules
- Frontend only. Never invent endpoints; if docs/API_CONTRACT.md or `src/config/api.js` lacks one, stop and ask.
- Copy existing patterns before creating new ones: read a sibling screen/util first.
- Use Chakra theme tokens, not hardcoded colors. Reuse components from `src/components/`.
- Put pure logic in `src/utils/` so it is testable; keep components thin.
- Minimal diffs. No drive-by refactors, renames or new dependencies without asking.
- Never push, force-push, `reset --hard`, or edit `.env*`.
- Only two branches: `staging` (all work is committed and pushed here for testing) and `main` (updated from `staging` after testing). Do not create `feature/*` or other branches.
- Do not commit unless the user asks, or the active workflow step says to (developer commits per task on `staging`).

## Workflow
Features go through `/feature`: spec -> plan -> code -> QA -> review -> human approval.
Read docs/PROGRESS.md first in every session; update it before ending a phase.
Never skip a human checkpoint: CP1 spec, CP2 plan, CP3 repeated failure, CP4 diff, CP5 merge.
Agents live in `.claude/agents/` (architect, ui-designer, developer, qa-tester, verifier). Commands in `.claude/commands/`.
