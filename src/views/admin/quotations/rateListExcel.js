import * as XLSX from "xlsx";
import { chargeCategoryLabel } from "../../../utils/rateListForm";

function displayExcelValue(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  return String(value);
}

function formatRateTypeValue(value) {
  if (value === false || value == null || String(value).trim() === "") return "-";
  const key = String(value).trim();
  if (key === "general") return "General";
  if (key === "client_specific") return "Client Specific";
  return key;
}

function formatYesNo(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return "Yes";
  if (value === false || value === "false" || value === 0 || value === "0") return "No";
  return "-";
}

export const RATE_LIST_EXCEL_HEADERS = [
  "Rate Type",
  "Location",
  "Client",
  "Agent",
  "Group Name",
  "Rate Name",
  "Charge Category",
  "Rate Text",
  "Rate Calculation",
  "Rate Cost",
  "Rate Fixed",
  "Currency",
  "Valid Until",
  "In Tariff",
  "Active",
  "Remarks",
];

const RATE_LIST_EXCEL_COL_WIDTHS = [
  16, 16, 28, 24, 18, 28, 16, 40, 22, 12, 12, 14, 14, 12, 10, 28,
];

export function mapRateItemForExcel(item = {}) {
  return [
    formatRateTypeValue(item.rate_type),
    displayExcelValue(item.location_text || item.location),
    displayExcelValue(item.client_id?.name || item.client_name || item.client),
    displayExcelValue(item.agent_id?.name || item.agent_text || item.agent),
    displayExcelValue(item.import_group),
    displayExcelValue(item.rate_name),
    displayExcelValue(chargeCategoryLabel(item.charge_category, item.charge_category_label)),
    displayExcelValue(item.rate_text),
    displayExcelValue(item.rate_calculation),
    displayExcelValue(item.rate_float),
    displayExcelValue(item.fixed_sales_rate),
    displayExcelValue(item.currency_id?.name || item.currency_name || item.currency),
    displayExcelValue(item.valid_until),
    formatYesNo(item.incl_in_tariff),
    formatYesNo(item.active),
    displayExcelValue(item.remarks),
  ];
}

export function getRateListExcelFilename(filePrefix = "rate-list") {
  const dateTag = new Date().toISOString().slice(0, 10);
  return `${filePrefix}-${dateTag}.xlsx`;
}

export function downloadRateListExcel(items = [], { filePrefix = "rate-list", sheetName = "Rate List" } = {}) {
  const rows = items.map(mapRateItemForExcel);
  const worksheet = XLSX.utils.aoa_to_sheet([RATE_LIST_EXCEL_HEADERS, ...rows]);
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: RATE_LIST_EXCEL_HEADERS.length - 1, r: Math.max(rows.length, 1) },
    }),
  };
  worksheet["!cols"] = RATE_LIST_EXCEL_COL_WIDTHS.map((wch) => ({ wch }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, getRateListExcelFilename(filePrefix));
}
