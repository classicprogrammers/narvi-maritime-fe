import * as XLSX from "xlsx";

const FIELD_LABELS = {
  id: "ID",
  sort_order: "Sort Order",
  rate_type: "Rate Type",
  location: "Location",
  location_text: "Location",
  client_id: "Client",
  agent_id: "Agent",
  agent_text: "Agent",
  import_group: "Group Name",
  rate_name: "Rate Name",
  charge_category: "Charge Category",
  charge_category_label: "Charge Category",
  rate_text: "Rate Text",
  rate_calculation: "Rate Calculation",
  rate_float: "Rate Cost",
  fixed_sales_rate: "Sales",
  currency_id: "Currency",
  valid_until: "Valid Until",
  last_update: "Last Update",
  incl_in_tariff: "In Tariff",
  active: "Active",
  remarks: "Remarks",
};

const RATE_TYPE_LABELS = { general: "General", client_specific: "Client Specific" };
const BOOLEAN_FIELDS = new Set(["incl_in_tariff", "active"]);

// Same field shown twice when the API returns both a code and its label.
const SKIPPED_FIELDS = new Set(["charge_category"]);

function humanizeKey(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatExcelValue(key, value) {
  if (BOOLEAN_FIELDS.has(key)) {
    if (value === true || value === "true" || value === 1 || value === "1") return "Yes";
    if (value === false || value === "false" || value === 0 || value === "0") return "No";
    return "-";
  }
  if (value === false || value == null || String(value).trim() === "") return "-";
  if (key === "rate_type") return RATE_TYPE_LABELS[String(value).trim()] || String(value);
  if (Array.isArray(value)) {
    return value.map((entry) => entry?.name ?? entry?.display_name ?? String(entry)).join(", ");
  }
  if (typeof value === "object") {
    return value.name ?? value.display_name ?? JSON.stringify(value);
  }
  return value;
}

/** Union of every field returned by the API, known fields first, in API order. */
export function getRateListExcelFields(items = []) {
  const fields = [];
  const seen = new Set();
  items.forEach((item) => {
    Object.keys(item || {}).forEach((key) => {
      if (seen.has(key) || SKIPPED_FIELDS.has(key)) return;
      seen.add(key);
      fields.push(key);
    });
  });
  return fields;
}

export function getRateListExcelFilename(filePrefix = "rate-list") {
  const dateTag = new Date().toISOString().slice(0, 10);
  return `${filePrefix}-${dateTag}.xlsx`;
}

/** Download a worksheet of `headers` + `rows` as an .xlsx file. */
export function downloadSheetAsExcel({ headers, rows, filePrefix, sheetName, colWidths }) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: headers.length - 1, r: Math.max(rows.length, 1) },
    }),
  };
  worksheet["!cols"] = headers.map((header, index) => ({
    wch: colWidths?.[index] ?? Math.max(14, String(header).length + 4),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, getRateListExcelFilename(filePrefix));
}

export function downloadRateListExcel(items = [], { filePrefix = "rate-list", sheetName = "Rate List" } = {}) {
  const fields = getRateListExcelFields(items);
  const headers = fields.map((key) => FIELD_LABELS[key] || humanizeKey(key));
  const rows = items.map((item) => fields.map((key) => formatExcelValue(key, item?.[key])));
  downloadSheetAsExcel({ headers, rows, filePrefix, sheetName });
}
