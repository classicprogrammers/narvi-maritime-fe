const isEmpty = (v) => v == null || v === false || v === "";

const toNum = (v) => {
  if (isEmpty(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Record value and manual flag -> { value, manual }. 0 / empty is treated as automatic.
export const readAutoField = (record, valueKey, manualKey) => {
  const raw = record?.[valueKey];
  const value = isEmpty(raw) ? "" : String(raw);
  const zero = value !== "" && Number(value) === 0;
  const manual = Boolean(record?.[manualKey]) && value !== "" && !zero;
  return { value: zero ? "" : value, manual };
};

// Text typed into an auto-capable field. Empty or 0 returns to automatic.
export const applyManualInput = (text) => {
  const value = String(text ?? "").trim();
  if (value === "" || (Number.isFinite(Number(value)) && Number(value) === 0)) {
    return { value: "", manual: false };
  }
  return { value: String(text), manual: true };
};

// Value written by the form: automatic values are never sent
export const writableAutoValue = (form, key, manualKey) =>
  form?.[manualKey] ? form?.[key] ?? "" : "";

// undefined = no change, null = back to automatic, number = manual value
export const diffAutoNumber = (form, original, key, manualKey) => {
  const now = form?.[manualKey] ? toNum(form?.[key]) : null;
  const before = original?.[manualKey] ? toNum(original?.[key]) : null;
  if (now === before) return undefined;
  return now;
};

// undefined = no change, false = back to automatic, date string = manual value
export const diffAutoDate = (form, original, key, manualKey) => {
  const now = form?.[manualKey] && form?.[key] ? String(form[key]) : "";
  const before = original?.[manualKey] && original?.[key] ? String(original[key]) : "";
  if (now === before) return undefined;
  return now || false;
};

const termText = (term) => (term ? String(term).trim() : "");

// Hint for the due date field, from the due-date preview
export const describeDueRule = ({ rule, payment_term, due_date } = {}) => {
  const term = termText(payment_term);
  if (!due_date) {
    return term
      ? `Payment term '${term}' could not be read. Enter the due date manually.`
      : "No payment term is set. Enter the due date manually.";
  }
  const text = String(rule || "").trim();
  const days = text.match(/(\d+)\s*days?/i);
  if (/current month|end of (the )?(invoice )?month/i.test(text) || /current month/i.test(term)) {
    const n = days ? days[1] : (term.match(/(\d+)/) || [])[1];
    return n ? `End of invoice month + ${n} days` : "End of invoice month";
  }
  if (days) return `${days[1]} days after invoice date`;
  if (text) return text;
  const termDays = term.match(/(\d+)\s*days?/i);
  if (termDays) return `${termDays[1]} days after invoice date`;
  return term || "Automatic";
};
