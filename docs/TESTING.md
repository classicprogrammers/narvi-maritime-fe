# Testing

## Automated
- `npm run test:ci` runs Jest + React Testing Library once (`react-scripts test --watchAll=false`).
- Existing tests: `src/utils/authStorage.test.js`, `portalClientSelection.test.js`, `portalClients.test.js`, `src/redux/store/store.test.js`.
- Priority for new tests: pure helpers in `src/utils` (payload builders, status requirements, formatters), then critical component behavior.
- `npm run lint:changed` lints files changed vs `staging`. `npm run check` = lint:changed + test:ci + build.

## Browser verification (qa-tester)
Start with `preview_start "web"` (port 3000). Needs a reachable backend via `.env` (`REACT_APP_BACKEND_URL`).
Use a test account the user provides in chat; never invent or store credentials in the repo.
For each acceptance criterion check: happy path, validation errors, empty/loading/error states, console errors, failed network calls.

## Core flow checklist (Phase 0: confirm with owner)
- [ ] Login and logout
- [ ] Stock list: filter, sort, open item
- [ ] Stock create/edit and save
- [ ] CI/PL detail and export
- [ ] Shipping instruction detail and save
