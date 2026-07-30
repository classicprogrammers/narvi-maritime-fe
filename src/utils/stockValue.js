export const isEmptyStockValue = (value) =>
    value == null || value === false || value === "";

export const parseStockValue = (value) => {
    if (isEmptyStockValue(value)) return null;
    const num = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(num) ? num : null;
};

export const roundStockValue = (value) => {
    const num = parseStockValue(value);
    if (num == null) return null;
    return Math.round(num * 100) / 100;
};

/** Table / read-only display: 123 -> "123.00", empty -> "-" */
export const formatStockValueDisplay = (value) => {
    const num = roundStockValue(value);
    if (num == null) return "-";
    return num.toFixed(2);
};

/** Form input display after blur / load: 123 -> "123.00", empty -> "" */
export const normalizeStockValueForForm = (value) => {
    const num = roundStockValue(value);
    if (num == null) return "";
    return num.toFixed(2);
};

/** API payload: always a number rounded to 2 decimal places */
export const normalizeStockValueForSave = (value) => {
    const num = roundStockValue(value);
    return num == null ? 0 : num;
};
