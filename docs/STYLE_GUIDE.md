# Style Guide

> Seed rules; **TODO (Phase 0)**: replace with concrete tokens and patterns extracted from `src/theme` and the sibling screens.

## Principles
- Chakra UI v2 components first; theme tokens (`src/theme`) instead of hex values or ad-hoc colors.
- Reuse before creating: check `src/components/forms`, `src/components/modals`, and the feature's own components.
- Success/failure feedback uses `SuccessModal` / `FailureModal` from `src/components/modals`.
- Match the closest existing screen for layout, spacing, table and form patterns.

## Every screen must handle
Loading, empty, error, validation errors, disabled/read-only, long text, narrow widths.

## Code style
- Function components and hooks; JSX files use `.jsx` in `views/`, utils are plain `.js`.
- Pure logic in `src/utils` with a sibling `*.test.js`.
- Comment density and naming follow the surrounding file.

## TODO (Phase 0)
- Color/spacing/typography tokens in use
- Form field and validation pattern (e.g. `StockForm.jsx`)
- Table pattern (react-table) and filter inputs
- Export (PDF/Excel) conventions
