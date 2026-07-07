/** Show decimals only when the value (or API string) has a fractional part */
export const formatApiNumericDisplay = (value) => {
  if (value == null || value === "" || value === false) return "-";
  const text = String(value).trim();
  if (!text) return "-";
  const n = Number(text);
  if (!Number.isFinite(n)) return text;
  if (Number.isInteger(n)) return String(n);
  return String(parseFloat(n.toFixed(10)));
};

/** Preserve decimal places from API string (e.g. 350.00); otherwise use standard numeric display */
export const formatCiPlCurrencyDisplay = (value) => {
  if (value == null || value === false) return "";
  const text = String(value).trim();
  if (text === "") return "";
  if (/^-?\d+\.\d+$/.test(text)) return text;
  const displayed = formatApiNumericDisplay(text);
  return displayed === "-" ? text : displayed;
};
