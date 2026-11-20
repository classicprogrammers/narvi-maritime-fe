import React from "react";
import DmyDateInput, { normalizeToIsoDate } from "./DmyDateInput";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

// Accepts "YYYY-MM-DD", "YYYY-MM-DD HH:MM:SS", ISO timestamps or dd/mm/yyyy text.
const toIso = (value) => {
  if (value == null || value === false) return "";
  const head = String(value).trim().slice(0, 10);
  if (ISO_RE.test(head)) return head;
  const iso = normalizeToIsoDate(value);
  return ISO_RE.test(iso) ? iso : "";
};

/**
 * Event-style adapter over DmyDateInput (the single date field) for forms that
 * used `<Input type="date" />`: `value` is YYYY-MM-DD and `onChange` receives
 * `{ target: { value: "YYYY-MM-DD" | "" } }`.
 */
export default function DateField({ value, onChange, name, ...rest }) {
  return (
    <DmyDateInput
      name={name}
      value={toIso(value)}
      onChange={(text) => {
        const next = text ? toIso(text) : "";
        if (onChange) onChange({ target: { value: next, name }, currentTarget: { value: next, name } });
      }}
      iconColor="gray.500"
      _placeholder={{ color: "gray.400" }}
      {...rest}
    />
  );
}
