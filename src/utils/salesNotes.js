import {
  buildDateRangeParams,
  isValidIsoDate,
  sanitizeDateRanges,
} from "utils/ledgerListQuery";

// Local copies of getLocalTodayIso/normalizeToIsoDate from components/forms/DmyDateInput.jsx.
// They must stay in sync with that file (Jest cannot import that component).
const getLocalTodayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const normalizeToIsoDate = (value) => {
  if (value == null || value === false) return "";
  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return text;
};

export const SALES_DATE_FILTER_FIELDS = [
  { key: "entry_date", label: "Entry date" },
  { key: "follow_up_date", label: "Follow-up date" },
];

export const SALES_SORT_KEYS = ["entry_date", "follow_up_date", "client", "created_by", "id"];

export const DEFAULT_SALES_SORT = { sortBy: "entry_date", sortOrder: "desc" };

export const DEFAULT_SALES_PAGE_SIZE = 50;

// "2026-11-18" or "2026-11-18T10:00:00" -> "18/11/26"; anything else -> ""
export const formatIsoToDdMmYy = (iso) => {
  if (iso == null || iso === false) return "";
  const date = String(iso).trim().slice(0, 10);
  if (!isValidIsoDate(date)) return "";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year.slice(2)}`;
};

// state: { page, pageSize, search, dateRanges, sort: { sortBy, sortOrder } }
export const buildSalesListParams = (state = {}) => {
  const sortBy = SALES_SORT_KEYS.includes(state.sort?.sortBy)
    ? state.sort.sortBy
    : DEFAULT_SALES_SORT.sortBy;
  const sortOrder = state.sort?.sortOrder === "asc" ? "asc" : state.sort?.sortOrder === "desc"
    ? "desc"
    : DEFAULT_SALES_SORT.sortOrder;
  const page = Number(state.page);
  const pageSize = Number(state.pageSize);
  const params = {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    page_size: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULT_SALES_PAGE_SIZE,
    sort_by: sortBy,
    sort_order: sortOrder,
  };
  const search = String(state.search ?? "").trim();
  if (search) params.search = search;
  return {
    ...params,
    ...buildDateRangeParams(state.dateRanges, SALES_DATE_FILTER_FIELDS),
  };
};

// form: { client_id, remarks, entry_date, follow_up_date }. Returns { <field>: message }; empty when valid.
export const validateSalesNoteForm = (form = {}, mode = "create") => {
  const errors = {};
  if (mode !== "edit" && mode !== "update") {
    const clientId = form.client_id;
    if (clientId == null || clientId === "" || clientId === false) {
      errors.client_id = "Client is required";
    }
  }
  if (!String(form.remarks ?? "").trim()) errors.remarks = "Remarks are required";

  const entry = normalizeToIsoDate(form.entry_date);
  if (entry) {
    if (!isValidIsoDate(entry)) errors.entry_date = "Entry date is not a valid date";
  } else if (mode === "edit" || mode === "update") {
    errors.entry_date = "Entry date is required";
  }

  const followUp = normalizeToIsoDate(form.follow_up_date);
  if (followUp && !isValidIsoDate(followUp)) {
    errors.follow_up_date = "Follow-up date is not a valid date";
  }
  return errors;
};

export const buildSalesNoteCreatePayload = (form = {}) => {
  const payload = {
    client_id: Number(form.client_id),
    remarks: String(form.remarks ?? "").trim(),
    entry_date: normalizeToIsoDate(form.entry_date) || getLocalTodayIso(),
  };
  const followUp = normalizeToIsoDate(form.follow_up_date);
  if (followUp) payload.follow_up_date = followUp;
  return payload;
};

export const buildSalesNoteUpdatePayload = (form = {}) => ({
  id: form.id,
  remarks: String(form.remarks ?? "").trim(),
  entry_date: normalizeToIsoDate(form.entry_date),
  follow_up_date: normalizeToIsoDate(form.follow_up_date) || null,
});

// Restore persisted list state; invalid pieces fall back to defaults
export const sanitizeSalesListState = (raw) => {
  const src = raw && typeof raw === "object" ? raw : {};
  const page = Number(src.page);
  const pageSize = Number(src.pageSize);
  const sortBy = SALES_SORT_KEYS.includes(src.sort?.sortBy)
    ? src.sort.sortBy
    : DEFAULT_SALES_SORT.sortBy;
  const sortOrder = ["asc", "desc"].includes(src.sort?.sortOrder)
    ? src.sort.sortOrder
    : DEFAULT_SALES_SORT.sortOrder;
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULT_SALES_PAGE_SIZE,
    search: typeof src.search === "string" ? src.search : "",
    dateRanges: sanitizeDateRanges(src.dateRanges, SALES_DATE_FILTER_FIELDS),
    sort: { sortBy, sortOrder },
  };
};
