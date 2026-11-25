import api from "./axios";
import { getApiEndpoint } from "../config/api";

// Contract confirmed by backend (docs/specs/004-ledger-dashboards.md, "Backend answers (confirmed)").
// Endpoint knowledge lives only here and in src/config/api.js.

const unwrapError = (data, fallback) => {
  if (data?.result?.status === "error") {
    throw new Error(data.result.message || fallback);
  }
  if (data?.status === "error") {
    throw new Error(data.message || fallback);
  }
};

// Payload can sit in data, data.result, data.data or data.result.data
const pickPayload = (data) => {
  const candidates = [data?.result?.data, data?.data, data?.result, data];
  return candidates.find((c) => c && typeof c === "object" && !Array.isArray(c)) || {};
};

const num = (value) => {
  if (value == null || value === "" || value === false) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// Margin is a ratio, or null when the backend has no value (sale = 0)
const marginOrNull = (value) => {
  if (value == null || value === "" || value === false) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const str = (value) => (value == null || value === false ? "" : String(value));
const strOrNull = (value) => (value == null || value === false || value === "" ? null : String(value));
const idOrNull = (value) => (value == null || value === false || value === "" ? null : value);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);

const request = async (endpointKey, params, fallback) => {
  const response = await api.get(getApiEndpoint(endpointKey), { params });
  const data = response?.data || response;
  unwrapError(data, fallback);
  return pickPayload(data);
};

// Common period params: omit empty values
const buildPeriodParams = (params = {}) => {
  const requestParams = {};
  ["date_from", "date_to", "interval", "client_id"].forEach((key) => {
    const value = params[key];
    if (value != null && String(value).trim() !== "") {
      requestParams[key] = typeof value === "string" ? value.trim() : value;
    }
  });
  return requestParams;
};

// Implemented shape: top-level date_from / date_to / interval. Old shape: a `period` object.
const normalizePeriod = (payload) => {
  const source = isPlainObject(payload?.period) ? payload.period : payload;
  return {
    date_from: strOrNull(source?.date_from),
    date_to: strOrNull(source?.date_to),
    interval: strOrNull(source?.interval),
  };
};

const normalizeBuckets = (buckets) =>
  list(buckets).map((b) => ({
    key: str(b?.key),
    label: str(b?.label) || str(b?.key),
    date_from: strOrNull(b?.date_from),
    date_to: strOrNull(b?.date_to),
  }));

// Records without a date. Implemented shape: { sale: {count, usd}, cost: {count, usd} } -> kept as is
// (count = sale + cost). Old flat shape: { count, ...any *_usd numbers }. null when nothing usable.
const normalizeUndated = (undated) => {
  if (!isPlainObject(undated)) return null;
  if (isPlainObject(undated.sale) || isPlainObject(undated.cost)) {
    const side = (s) => ({ count: num(s?.count), usd: num(s?.usd ?? s?.usd_total ?? s?.total_usd) });
    const sale = side(undated.sale);
    const cost = side(undated.cost);
    return { count: sale.count + cost.count, sale, cost };
  }
  const result = { count: num(undated.count) };
  Object.keys(undated).forEach((key) => {
    if (key.endsWith("_usd") && undated[key] != null && Number.isFinite(Number(undated[key]))) {
      result[key] = Number(undated[key]);
    }
  });
  return result;
};

const isYear = (y) => y != null && y !== "" && y !== false && Number.isInteger(Number(y));

// Available FY start years -> { first, last }, else null. Accepts the implemented shape
// { from, to, from_label, to_label, fys: [{ fy, label }] } (min/max of fys, else numeric from/to),
// { first, last } or an array of years. FY 2025 = 2025/26.
const normalizeAvailableFy = (value) => {
  let candidates;
  if (Array.isArray(value)) {
    candidates = value;
  } else if (Array.isArray(value?.fys) && value.fys.length) {
    candidates = value.fys.map((f) => (isPlainObject(f) ? f.fy : f));
  } else if (typeof value?.from === "number" || typeof value?.to === "number") {
    candidates = [value.from, value.to];
  } else {
    candidates = [value?.first, value?.last];
  }
  const years = candidates.filter(isYear).map(Number);
  if (!years.length) return null;
  return { first: Math.min(...years), last: Math.max(...years) };
};

const normalizeMeta = (payload) => ({
  undated: normalizeUndated(payload.undated),
  available_fy: normalizeAvailableFy(payload.available_fy),
});

const normalizeMoneyTotals = (totals) => ({
  sale_usd: num(totals?.sale_usd),
  cost_usd: num(totals?.cost_usd),
  profit_usd: num(totals?.profit_usd),
  margin: marginOrNull(totals?.margin),
});

const normalizeMoneyBucket = (row) => ({
  key: str(row?.key),
  sale_usd: num(row?.sale_usd),
  cost_usd: num(row?.cost_usd),
  profit_usd: num(row?.profit_usd),
  margin: marginOrNull(row?.margin),
});

// Per-bucket list: implemented name is `buckets`, old name `by_bucket`. Always exposed as the array.
const pickBuckets = (item) => (Array.isArray(item?.buckets) ? item.buckets : item?.by_bucket);

// Totals only get by_bucket when the backend sent a list
const withBuckets = (totals, source) =>
  Array.isArray(source?.buckets) || Array.isArray(source?.by_bucket)
    ? { ...totals, by_bucket: list(pickBuckets(source)).map(normalizeMoneyBucket) }
    : totals;

const firstDefined = (...values) => values.find((v) => v != null && v !== "");

// Group totals may sit in `totals` (implemented) or directly on the group (old); rows are tolerant of field names
// countKey: agent_count / client_count (number of agents / clients); oldest_due_date may be `false` (no due date)
const normalizeCashGroup = (group, idKey, nameKey, altNameKey, countKey) => {
  const t = isPlainObject(group?.totals) ? group.totals : group;
  const rows = list(group?.rows).map((row) => ({
    [idKey]: idOrNull(firstDefined(row?.[idKey], row?.id)),
    [nameKey]: str(firstDefined(row?.[nameKey], row?.[altNameKey], row?.name)),
    outstanding_usd: num(firstDefined(row?.outstanding_usd, row?.total_usd, row?.usd)),
    overdue_usd: num(row?.overdue_usd),
    invoice_count: num(firstDefined(row?.invoice_count, row?.count)),
    oldest_due_date: strOrNull(row?.oldest_due_date),
  }));
  const count = firstDefined(t?.[countKey], t?.count);
  return {
    total_usd: num(firstDefined(t?.outstanding_usd, t?.total_usd, t?.usd)),
    overdue_usd: num(t?.overdue_usd),
    count: count == null ? rows.length : num(count),
    invoice_count: num(t?.invoice_count),
    rows,
  };
};

export const getDashboardCash = async ({ as_of } = {}) => {
  const params = {};
  if (as_of != null && String(as_of).trim() !== "") params.as_of = String(as_of).trim();
  const payload = await request("LEDGER_DASHBOARD_CASH", params, "Failed to load the cash dashboard");
  return {
    as_of: strOrNull(payload.as_of),
    agents: normalizeCashGroup(payload.agents, "agent_id", "agent_name", "agent", "agent_count"),
    clients: normalizeCashGroup(payload.clients, "client_id", "client_name", "client", "client_count"),
  };
};

export const getDashboardClientStats = async (params = {}) => {
  const payload = await request(
    "LEDGER_DASHBOARD_CLIENT_STATS",
    buildPeriodParams(params),
    "Failed to load client stats"
  );
  return {
    period: normalizePeriod(payload),
    buckets: normalizeBuckets(payload.buckets),
    ...normalizeMeta(payload),
    totals: withBuckets(normalizeMoneyTotals(payload.totals), payload.totals),
    rows: list(payload.rows).map((row) => ({
      client_id: idOrNull(row?.client_id),
      client_name: str(firstDefined(row?.client_name, row?.client, row?.name)),
      ...normalizeMoneyTotals(row),
      by_bucket: list(pickBuckets(row)).map(normalizeMoneyBucket),
    })),
  };
};

export const getDashboardDestinations = async (params = {}) => {
  const payload = await request(
    "LEDGER_DASHBOARD_DESTINATIONS",
    buildPeriodParams(params),
    "Failed to load destinations"
  );
  return {
    period: normalizePeriod(payload),
    buckets: normalizeBuckets(payload.buckets),
    ...normalizeMeta(payload),
    totals: withBuckets(
      {
        sale_usd: num(payload.totals?.sale_usd),
        cost_usd: num(payload.totals?.cost_usd),
        profit_usd: num(payload.totals?.profit_usd),
        margin: marginOrNull(payload.totals?.margin),
        invoice_count: num(payload.totals?.invoice_count),
        agent_count: num(payload.totals?.agent_count),
      },
      payload.totals
    ),
    rows: list(payload.rows).map((row) => ({
      destination: str(firstDefined(row?.destination, row?.destination_name, row?.name)),
      destination_country: str(firstDefined(row?.destination_country, row?.country)),
      agent_count: num(row?.agent_count),
      invoice_count: num(row?.invoice_count),
      sale_usd: num(row?.sale_usd),
      cost_usd: num(row?.cost_usd),
      profit_usd: num(row?.profit_usd),
      margin: marginOrNull(row?.margin),
      by_bucket: list(pickBuckets(row)).map((b) => ({
        key: str(b?.key),
        cost_usd: num(b?.cost_usd),
        invoice_count: num(b?.invoice_count),
      })),
    })),
  };
};

// Per-bucket figures: `series`, else totals.buckets / totals.by_bucket, else rows that carry a key
const pickTurnoverSeries = (payload) => {
  const candidates = [
    payload.series,
    payload.totals?.buckets,
    payload.totals?.by_bucket,
    list(payload.rows).filter((row) => row?.key != null && row.key !== ""),
  ];
  return candidates.find((c) => Array.isArray(c) && c.length) || [];
};

export const getDashboardTurnover = async (params = {}) => {
  const payload = await request(
    "LEDGER_DASHBOARD_TURNOVER",
    buildPeriodParams(params),
    "Failed to load turnover"
  );
  return {
    period: normalizePeriod(payload),
    buckets: normalizeBuckets(payload.buckets),
    ...normalizeMeta(payload),
    totals: withBuckets(normalizeMoneyTotals(payload.totals), payload.totals),
    series: pickTurnoverSeries(payload).map(normalizeMoneyBucket),
  };
};

const REGION_MONTH_FIELDS = [
  ["singapore", "Singapore", "singapore_usd"],
  ["greece", "Greece", "greece_usd"],
];

// Tolerant reader for the implemented shape: FY entries under `years` or `fys` (or the payload itself when it has
// `months`), each holding months with singapore_usd / greece_usd / unassigned_usd / total_usd. The exact nesting
// is not confirmed: an unrecognised payload gives empty regions instead of throwing.
const normalizeRegionSalesByMonth = (payload) => {
  const rawEntries = [payload.years, payload.fys].find((v) => Array.isArray(v) && v.length);
  const entries = list(rawEntries || (Array.isArray(payload.months) ? [payload] : [])).filter(isPlainObject);
  const fyEntries = entries.map((entry) => {
    const fyRaw = firstDefined(entry.fy, entry.year, entry.start_year);
    const fy = isYear(fyRaw) ? Number(fyRaw) : 0;
    const months = list(entry.months)
      .filter(isPlainObject)
      .map((m) => ({ ...m, key: str(firstDefined(m.key, m.month, m.month_key)) }));
    return {
      fy,
      label: str(entry.label) || (fy ? `${fy}/${String(fy + 1).slice(-2)}` : ""),
      months,
      totals: isPlainObject(entry.totals) ? entry.totals : null,
    };
  });
  const recognised = fyEntries.some((e) =>
    e.months.some((m) => [...REGION_MONTH_FIELDS.map((r) => r[2]), "unassigned_usd"].some((f) => f in m))
  );
  if (!recognised) return { regions: [], unassigned: { total_usd: 0 } };
  const regions = REGION_MONTH_FIELDS.map(([key, label, field]) => ({
    key,
    label,
    years: fyEntries.map((e) => {
      const months = e.months.map((m) => ({ key: m.key, sale_usd: num(m[field]) }));
      const fyTotal = e.totals && e.totals[field] != null ? num(e.totals[field]) : null;
      return {
        fy: e.fy,
        label: e.label,
        total_usd: fyTotal ?? months.reduce((s, m) => s + m.sale_usd, 0),
        months,
      };
    }),
  }));
  const unassignedTotal = fyEntries.reduce(
    (sum, e) =>
      sum +
      (e.totals && e.totals.unassigned_usd != null
        ? num(e.totals.unassigned_usd)
        : e.months.reduce((s, m) => s + num(m.unassigned_usd), 0)),
    0
  );
  return { regions, unassigned: { total_usd: unassignedTotal } };
};

// fys: FY start years, sent as repeated `fy` keys (axios serialises arrays that way)
export const getDashboardRegionSales = async ({ fys } = {}) => {
  const params = {};
  const years = list(fys).filter((fy) => fy != null && fy !== "" && Number.isFinite(Number(fy)));
  if (years.length) params.fy = years.map(Number);
  const payload = await request(
    "LEDGER_DASHBOARD_REGION_SALES",
    params,
    "Failed to load Singapore / Greece sales"
  );
  const available_fy = normalizeAvailableFy(payload.available_fy);
  // `regions` as an array of strings (implemented shape) is not the old region objects
  if (Array.isArray(payload.regions) && payload.regions.some(isPlainObject)) {
    return {
      available_fy,
      regions: list(payload.regions).filter(isPlainObject).map((region) => ({
        key: str(region?.key),
        label: str(region?.label) || str(region?.key),
        years: list(region?.years).map((year) => ({
          fy: num(year?.fy),
          label: str(year?.label),
          total_usd: num(year?.total_usd),
          months: list(year?.months).map((m) => ({
            key: str(m?.key),
            sale_usd: num(m?.sale_usd),
          })),
        })),
      })),
      unassigned: { total_usd: num(payload.unassigned?.total_usd) },
    };
  }
  return { ...normalizeRegionSalesByMonth(payload), available_fy };
};

export const getDashboardClientTurnover = async (params = {}) => {
  const payload = await request(
    "LEDGER_DASHBOARD_CLIENT_TURNOVER",
    buildPeriodParams(params),
    "Failed to load client turnover"
  );
  return {
    period: normalizePeriod(payload),
    buckets: normalizeBuckets(payload.buckets),
    ...normalizeMeta(payload),
    client: {
      id: idOrNull(payload.client?.id),
      name: str(payload.client?.name),
    },
    totals: withBuckets(normalizeMoneyTotals(payload.totals), payload.totals),
    // Implemented name is `rows` (old: `vessels`, used when present). vessel_id is boolean false for the "No vessel" row -> null.
    vessels: list(Array.isArray(payload.vessels) ? payload.vessels : payload.rows).map((v) => ({
      vessel_id: idOrNull(v?.vessel_id),
      vessel_name: str(firstDefined(v?.vessel_name, v?.vessel, v?.name)),
      ...normalizeMoneyTotals(v),
      by_bucket: list(pickBuckets(v)).map(normalizeMoneyBucket),
    })),
  };
};
