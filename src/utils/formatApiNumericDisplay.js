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
