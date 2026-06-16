const PIE_COLORS = ["#174693", "#39B8FF", "#01B574", "#FFB547", "#E53E3E", "#805AD5", "#319795", "#DD6B20"];

export function pickValue(obj, ...keys) {
  if (!obj || typeof obj !== "object") return null;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const value = obj[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

export function pickNumber(obj, ...keys) {
  const value = pickValue(obj, ...keys);
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function formatDashboardCount(value, fallback = "0") {
  const parsed = pickNumber({ value }, "value");
  if (parsed == null) return fallback;
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatDashboardMoney(value, fallback = "0.00") {
  const parsed = pickNumber({ value }, "value");
  if (parsed == null) return fallback;
  return parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDashboardLabel(value) {
  if (value === false) return "Unset";
  if (value == null || value === "") return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatPieRowLabel(row) {
  const label = pickValue(row, "label", "status_label", "done_label", "name");
  if (label != null && label !== "" && label !== false) return String(label);
  const key = row?.key ?? row?.status ?? row?.done;
  if (key === false) return "Unset";
  if (key != null && key !== "") return formatDashboardLabel(key);
  return "—";
}

export function sectionStat(section, keys, formatter = formatDashboardCount) {
  const value = pickNumber(section, ...keys);
  if (value == null) {
    return formatter === formatDashboardMoney ? formatDashboardMoney(0) : formatDashboardCount(0);
  }
  return formatter === formatDashboardMoney ? formatDashboardMoney(value) : formatDashboardCount(value);
}

export function chartRowsHaveValues(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  return rows.some((row) => (pickNumber(row, "count", "value", "total", "amount", "qty", "lines", "y") ?? 0) > 0);
}

export function normalizePieInput(data) {
  const EMPTY = { series: [], labels: [] };
  try {
    if (!data) return EMPTY;

    if (Array.isArray(data.series) && Array.isArray(data.labels)) {
      return {
        series: data.series.map((value) => Number(value) || 0),
        labels: data.labels.map((label) => formatDashboardLabel(label)),
      };
    }

    if (Array.isArray(data)) {
      const labels = [];
      const series = [];
      data.forEach((row) => {
        if (row == null) return;
        labels.push(formatPieRowLabel(row));
        series.push(pickNumber(row, "count", "value", "total", "amount", "qty", "lines", "y") ?? 0);
      });
      return { series, labels };
    }

    if (data !== null && typeof data === "object") {
      const keys = Object.keys(data);
      return {
        series: keys.map((key) => Number(data[key]) || 0),
        labels: keys.map((key) => formatDashboardLabel(key === "false" ? false : key)),
      };
    }

    return EMPTY;
  } catch {
    return EMPTY;
  }
}

export function normalizeGroupedBarInput(data, seriesDefs = []) {
  try {
    if (!Array.isArray(data) || !data.length) {
      return {
        categories: ["—"],
        series: seriesDefs.map(({ name }) => ({ name, data: [0] })),
      };
    }

    return {
      categories: data.map((row) => formatPieRowLabel(row)),
      series: seriesDefs.map(({ key, name }) => ({
        name,
        data: data.map((row) => pickNumber(row, key) ?? 0),
      })),
    };
  } catch {
    return {
      categories: ["—"],
      series: seriesDefs.map(({ name }) => ({ name, data: [0] })),
    };
  }
}

export function buildPieChartOptions(labels = [], chartLabelColor, { donut = false } = {}) {
  const safeLabels = Array.isArray(labels) ? labels : [];
  const base = {
    chart: { toolbar: { show: false } },
    labels: safeLabels,
    colors: PIE_COLORS,
    legend: { position: "bottom", labels: { colors: chartLabelColor } },
    dataLabels: {
      enabled: true,
      formatter: (_pct, opts) => {
        try {
          const count = opts.w.globals.series[opts.seriesIndex];
          return count != null && Number(count) > 0 ? String(count) : "";
        } catch {
          return "";
        }
      },
      style: { fontSize: "12px", fontWeight: 600, colors: ["#fff"] },
      dropShadow: { enabled: false },
    },
    stroke: { colors: ["#fff"] },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val) => String(val),
      },
    },
    plotOptions: {
      pie: donut
        ? { donut: { size: "62%" } }
        : {},
    },
  };
  return base;
}

export function splitCountForStack(count) {
  const total = Number(count) || 0;
  if (total <= 0) return [0, 0, 0];
  const first = Math.round(total * 0.42);
  const second = Math.round(total * 0.33);
  const third = Math.max(0, total - first - second);
  return [first, second, third];
}

export function normalizeShippingStackedInput(doneStatus = [], financialByDone = []) {
  const financialMap = new Map();
  if (Array.isArray(financialByDone)) {
    financialByDone.forEach((row) => {
      const key = row?.done === false ? "unset" : String(row?.done ?? row?.key ?? "");
      financialMap.set(key, row);
    });
  }

  const rows = Array.isArray(doneStatus) ? doneStatus : [];
  const categories = [];
  const segmentA = [];
  const segmentB = [];
  const segmentC = [];

  rows.forEach((row) => {
    const rowKey = row?.key === false ? "unset" : String(row?.key ?? row?.done ?? "");
    const financial = financialMap.get(rowKey) || financialMap.get(String(row?.done ?? "")) || {};
    const sale = pickNumber(financial, "sale_amount") ?? 0;
    const invoice = pickNumber(financial, "to_invoice") ?? 0;
    const profit = pickNumber(financial, "estimated_profit") ?? 0;
    const count = pickNumber(row, "count") ?? 0;

    categories.push(formatPieRowLabel(row));

    if (sale + invoice + profit > 0) {
      segmentA.push(sale);
      segmentB.push(invoice);
      segmentC.push(profit);
    } else {
      const [a, b, c] = splitCountForStack(count);
      segmentA.push(a);
      segmentB.push(b);
      segmentC.push(c);
    }
  });

  if (!categories.length) {
    return {
      categories: ["—"],
      series: [
        { name: "Base", data: [0] },
        { name: "Middle", data: [0] },
        { name: "Top", data: [0] },
      ],
    };
  }

  return {
    categories,
    series: [
      { name: "Base", data: segmentA },
      { name: "Middle", data: segmentB },
      { name: "Top", data: segmentC },
    ],
  };
}

export function buildShippingStackedBarOptions(categories = [], chartLabelColor) {
  const safeCategories = Array.isArray(categories) ? categories : ["—"];
  return {
    chart: { toolbar: { show: false }, stacked: true },
    colors: ["#4318FF", "#39B8FF", "#E9EDF7"],
    plotOptions: {
      bar: {
        borderRadius: 10,
        borderRadiusApplication: "end",
        borderRadiusWhenStacked: "top",
        columnWidth: "42%",
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: {
      show: false,
      padding: { left: 8, right: 8, top: 0, bottom: 0 },
    },
    xaxis: {
      categories: safeCategories,
      labels: {
        style: { colors: chartLabelColor, fontSize: "11px", fontWeight: 500 },
        trim: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { show: false },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => String(Math.round(Number(value) || 0)),
      },
    },
  };
}

export function buildVerticalBarChartOptions(categories = [], chartLabelColor, { stacked = false } = {}) {
  const safeCategories = Array.isArray(categories) ? categories : ["—"];
  return {
    chart: { toolbar: { show: false }, stacked },
    colors: PIE_COLORS,
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: stacked ? "50%" : "45%",
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => {
        const parsed = Number(value);
        if (Number.isNaN(parsed) || parsed === 0) return "0";
        return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 });
      },
      style: { fontSize: "10px", fontWeight: 600 },
    },
    legend: {
      position: "top",
      horizontalAlign: "right",
      labels: { colors: chartLabelColor },
    },
    xaxis: {
      categories: safeCategories,
      labels: {
        style: { colors: chartLabelColor, fontSize: "10px" },
        rotate: -30,
        trim: true,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: chartLabelColor, fontSize: "11px" },
        formatter: (value) => {
          const parsed = Number(value);
          if (Number.isNaN(parsed)) return value;
          return parsed.toLocaleString(undefined, { maximumFractionDigits: 0 });
        },
      },
      min: 0,
    },
    grid: { borderColor: "#E6ECFA" },
    tooltip: { theme: "light" },
  };
}

export function buildHorizontalBarChartOptions(categories = [], chartLabelColor) {
  const safeCategories = Array.isArray(categories) ? categories : ["—"];
  return {
    chart: { toolbar: { show: false } },
    colors: ["#174693"],
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: true,
        barHeight: "55%",
        dataLabels: { position: "right" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => String(Number(value) || 0),
      style: { fontSize: "11px", fontWeight: 600 },
    },
    legend: { show: false },
    xaxis: {
      categories: safeCategories,
      labels: { style: { colors: chartLabelColor, fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: chartLabelColor, fontSize: "11px" },
        maxWidth: 140,
      },
    },
    grid: { borderColor: "#E6ECFA" },
    tooltip: { theme: "light" },
  };
}

export function quotationDisplayName(quotation) {
  return (
    pickValue(quotation, "name", "quotation_name", "display_name") ||
    (quotation?.id != null ? `QT/${quotation.id}` : "Quotation")
  );
}

export function quotationClientName(quotation) {
  return (
    pickValue(quotation, "client_name", "client") ||
    (typeof quotation?.client_id === "object" ? quotation.client_id?.name : null) ||
    "—"
  );
}

export function quotationVesselName(quotation) {
  const vesselName = pickValue(quotation, "vessel_name", "vessel");
  if (vesselName) return vesselName;
  if (typeof quotation?.vessel_id === "object" && quotation.vessel_id?.name) {
    return quotation.vessel_id.name;
  }
  return "—";
}

export function quotationValidityDate(quotation) {
  const value = quotation?.validity_date;
  if (!value || value === false) return null;
  return String(value);
}
