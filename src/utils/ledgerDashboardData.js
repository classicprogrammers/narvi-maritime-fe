// Pure data helpers and ApexCharts option builders for the Master Ledger dashboards.
import { formatDashboardMoney } from "views/admin/default/dashboardUtils";
import { fyLabel, isFutureMonth } from "./ledgerDashboardPeriod";

const MONTH_AXIS_LABELS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// Values for each key, in key order: missing -> 0, keys the rows do not know are dropped.
// With futureAsNull, month keys after today become null (gaps in charts and "—" in tables).
export const fillBuckets = (keys, rows, valueKey, { futureAsNull = false, today = new Date() } = {}) => {
  const byKey = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (row && row.key != null) byKey.set(String(row.key), toNumber(row[valueKey]) ?? 0);
  });
  return (Array.isArray(keys) ? keys : []).map((key) => {
    if (futureAsNull && isFutureMonth(key, today)) return null;
    return byKey.get(String(key)) ?? 0;
  });
};

// True when at least one of the rows' bucket keys is one of the response keys.
// A row such as "No vessel" may come with a single { key: "total" } bucket on a quarter interval: it cannot be placed
// on the period axis, so charts skip its series (it stays in the table and totals).
export const hasMatchingBucket = (keys, rows) => {
  const known = new Set((Array.isArray(keys) ? keys : []).map(String));
  return (Array.isArray(rows) ? rows : []).some((row) => row && row.key != null && known.has(String(row.key)));
};

export const DASHBOARD_NOT_AVAILABLE_TEXT = "This dashboard is not available on the server yet.";

// 404 -> not-available text; otherwise the server message (also HTTP 400: bad date / interval / missing client).
export const dashboardErrorMessage = (error) => {
  if (!error) return "";
  if (error?.response?.status === 404) return DASHBOARD_NOT_AVAILABLE_TEXT;
  return (
    error?.response?.data?.message ||
    error?.response?.data?.result?.message ||
    error?.message ||
    "Failed to load the dashboard"
  );
};

// Note for records the backend could not place in a period. "" when there are none.
export const formatUndatedNote = (undated) => {
  // Implemented shape: { sale: {count, usd}, cost: {count, usd} }
  if (undated && (undated.sale || undated.cost)) {
    const part = (side, noun) => {
      const n = toNumber(side?.count);
      if (!n || n <= 0) return "";
      const usd = toNumber(side?.usd);
      return `${n} ${noun} record${n === 1 ? "" : "s"}${usd === null ? "" : ` ($${formatDashboardMoney(usd)})`}`;
    };
    const parts = [part(undated.sale, "sales"), part(undated.cost, "cost")].filter(Boolean);
    if (!parts.length) return "";
    const total = (toNumber(undated.sale?.count) || 0) + (toNumber(undated.cost?.count) || 0);
    return `${parts.join(" and ")} without a date ${total === 1 ? "is" : "are"} not included`;
  }
  const count = toNumber(undated?.count);
  if (!count || count <= 0) return "";
  const amounts = [
    ["sale_usd", "Sale"],
    ["cost_usd", "Cost"],
    ["profit_usd", "Profit"],
  ]
    .filter(([key]) => toNumber(undated[key]) !== null)
    .map(([key, label]) => `${label} $${formatDashboardMoney(undated[key])}`);
  const text = `${count} record${count === 1 ? "" : "s"} without a date ${count === 1 ? "is" : "are"} not included`;
  return amounts.length ? `${text} (${amounts.join(", ")})` : text;
};

// Profit / sale as a ratio. null when sale is 0 or either value is invalid (display fallback only: the backend sends margin).
export const marginPct = (profit, sale) => {
  const p = toNumber(profit);
  const s = toNumber(sale);
  if (p === null || s === null || s === 0) return null;
  return p / s;
};

// 0.1234 -> "12.3%", null / invalid -> "—"
export const formatMarginPct = (ratio) => {
  const n = toNumber(ratio);
  return n === null ? "—" : `${(n * 100).toFixed(1)}%`;
};

const SUMMED_SUFFIX = /_usd$|_count$/;

// Merge by_bucket arrays by key, summing numeric fields (margin is not summable and is dropped)
const mergeBuckets = (lists) => {
  const merged = new Map();
  lists.forEach((list) => {
    (Array.isArray(list) ? list : []).forEach((bucket) => {
      if (!bucket || bucket.key == null) return;
      const target = merged.get(bucket.key) || { key: bucket.key };
      Object.keys(bucket).forEach((field) => {
        if (SUMMED_SUFFIX.test(field)) target[field] = (target[field] || 0) + (toNumber(bucket[field]) ?? 0);
      });
      merged.set(bucket.key, target);
    });
  });
  return [...merged.values()];
};

// Top n rows by valueKey (descending); the rest become one { label: otherLabel, isOther: true } row.
// The other row sums valueKey, every *_usd / *_count field and merges by_bucket. No other row when rows <= n.
export const topNWithOther = (rows, n, valueKey, otherLabel = "Other") => {
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const sorted = [...list].sort((a, b) => (toNumber(b[valueKey]) ?? 0) - (toNumber(a[valueKey]) ?? 0));
  if (sorted.length <= n) return sorted;
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  const other = { label: otherLabel, isOther: true, [valueKey]: 0 };
  rest.forEach((row) => {
    Object.keys(row).forEach((field) => {
      if (field === valueKey || SUMMED_SUFFIX.test(field)) other[field] = (other[field] || 0) + (toNumber(row[field]) ?? 0);
    });
  });
  other.by_bucket = mergeBuckets(rest.map((row) => row.by_bucket));
  return [...top, other];
};

// Rows with by_bucket -> rows plus `values`: one number per key for metric ("sale_usd", "profit_usd", "margin", ...).
// Missing buckets are 0 for amounts and null for margin. Margin falls back to profit / sale when the bucket has none.
export const pivotByBucket = (rows, keys, metric) =>
  (Array.isArray(rows) ? rows : []).map((row) => {
    const buckets = new Map((Array.isArray(row?.by_bucket) ? row.by_bucket : []).map((b) => [String(b?.key), b]));
    const values = (Array.isArray(keys) ? keys : []).map((key) => {
      const bucket = buckets.get(String(key));
      if (metric === "margin") {
        if (!bucket) return null;
        return toNumber(bucket.margin) ?? marginPct(bucket.profit_usd, bucket.sale_usd);
      }
      return bucket ? toNumber(bucket[metric]) ?? 0 : 0;
    });
    return { ...row, values };
  });

// Sorted copy. Numbers compare numerically, strings with localeCompare; null / invalid values are always last.
export const sortRows = (rows, key, order = "desc") => {
  const dir = order === "asc" ? 1 : -1;
  const isEmpty = (v) => v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));
  return [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const av = a?.[key];
    const bv = b?.[key];
    const aEmpty = isEmpty(av);
    const bEmpty = isEmpty(bv);
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
    const an = typeof av === "number" ? av : toNumber(av);
    const bn = typeof bv === "number" ? bv : toNumber(bv);
    if (an !== null && bn !== null) return (an - bn) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
};

const compactMoney = (value) => {
  const n = toNumber(value);
  return n === null ? "" : n.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

// Money bar chart (clustered or stacked). Colours are passed in (theme tokens). The y-axis is not clamped at 0.
export const buildMoneyBarOptions = (
  categories = [],
  { colors = [], labelColor, gridColor, stacked = false } = {}
) => ({
  chart: { toolbar: { show: false }, stacked },
  colors,
  plotOptions: { bar: { borderRadius: 4, columnWidth: stacked ? "50%" : "55%" } },
  dataLabels: { enabled: false },
  legend: { position: "top", horizontalAlign: "right", labels: { colors: labelColor } },
  xaxis: {
    categories: Array.isArray(categories) ? categories : [],
    labels: { style: { colors: labelColor, fontSize: "10px" }, rotate: -30, trim: true },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: { labels: { style: { colors: labelColor, fontSize: "11px" }, formatter: compactMoney } },
  grid: { borderColor: gridColor },
  tooltip: { y: { formatter: (value) => formatDashboardMoney(value, "—") } },
});

// Line chart with a Mar..Feb x-axis, one series per FY (series data keeps null gaps)
// fys: [{ fy, label?, values: (number|null)[12] }] -> { options, series }
export const buildRegionLineOptions = (fys = [], { colors = [], labelColor, gridColor } = {}) => {
  const list = Array.isArray(fys) ? fys : [];
  return {
    options: {
      chart: { toolbar: { show: false }, zoom: { enabled: false } },
      colors,
      stroke: { curve: "straight", width: 3 },
      markers: { size: 4 },
      dataLabels: { enabled: false },
      legend: { position: "top", horizontalAlign: "right", labels: { colors: labelColor } },
      xaxis: {
        categories: MONTH_AXIS_LABELS,
        labels: { style: { colors: labelColor, fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: labelColor, fontSize: "11px" }, formatter: compactMoney } },
      grid: { borderColor: gridColor },
      tooltip: { y: { formatter: (value) => formatDashboardMoney(value, "—") } },
    },
    series: list.map((item) => ({
      name: item.label || fyLabel(item.fy),
      data: MONTH_AXIS_LABELS.map((_, i) => {
        const value = Array.isArray(item.values) ? item.values[i] : null;
        return value === undefined ? null : value;
      }),
    })),
  };
};
