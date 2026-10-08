export const STOCK_T1_MARK = "❌";
export const STOCK_T1_HEADING = "T-1 ❌";
export const STOCK_WARNING_MARK = "‼️⛔";
export const STOCK_WARNING_HEADING = "Warning ‼️⛔";

export function isStockT1Marked(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "x" || normalized === "❌";
}

export function isStockT1Heading(label) {
  const text = String(label || "").trim();
  return text === STOCK_T1_HEADING || text === "T-1" || text === "T_1" || text.startsWith("T-1");
}

export function formatStockT1Display(value, empty = "-") {
  if (value == null || value === false || value === "") return empty;
  if (isStockT1Marked(value)) return STOCK_T1_MARK;
  const text = String(value).trim();
  return text || empty;
}
