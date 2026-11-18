import {
  buildDateRangeParams,
  countActiveDateRanges,
} from "utils/ledgerListQuery";

export const CLIENT_DATE_FILTER_FIELDS = [
  { key: "entry_date", label: "Entry date" },
  { key: "follow_up_date", label: "Follow-up date" },
];

// Valid date params, minus any field whose From is after To; a single valid side is kept
export const buildClientDateParams = (filters) => {
  const params = buildDateRangeParams(filters, CLIENT_DATE_FILTER_FIELDS);
  CLIENT_DATE_FILTER_FIELDS.forEach(({ key }) => {
    const from = params[`${key}_from`];
    const to = params[`${key}_to`];
    if (from && to && from > to) {
      delete params[`${key}_from`];
      delete params[`${key}_to`];
    }
  });
  return params;
};

export const DEFAULT_CLIENT_FILTERS = {
  client_code: "",
  email: "",
  follow_up: "",
  entry_date_from: "",
  entry_date_to: "",
  follow_up_date_from: "",
  follow_up_date_to: "",
};

const isFollowUpOn = (value) => value === true || value === "true";

export const hasActiveClientAdvanceFilters = (filters, overallSearch) =>
  !!(
    filters?.client_code ||
    filters?.email ||
    isFollowUpOn(filters?.follow_up) ||
    countActiveDateRanges(filters, CLIENT_DATE_FILTER_FIELDS) > 0 ||
    overallSearch
  );

// Query params for the clients API; empty values are omitted
export const buildClientFilterParams = (filters) => {
  const params = {};
  const clientCode = String(filters?.client_code ?? "").trim();
  const email = String(filters?.email ?? "").trim();
  if (clientCode) params.client_code = clientCode;
  if (email) params.email = email;
  if (isFollowUpOn(filters?.follow_up)) params.follow_up = true;
  return { ...params, ...buildClientDateParams(filters) };
};

// Works with older persisted shapes that lack the new keys; drops invalid dates and reversed pairs
export const sanitizeClientFilters = (raw) => ({
  ...DEFAULT_CLIENT_FILTERS,
  client_code: raw?.client_code != null ? String(raw.client_code) : "",
  email: raw?.email != null ? String(raw.email) : "",
  follow_up: isFollowUpOn(raw?.follow_up) ? "true" : "",
  ...buildClientDateParams(raw),
});
