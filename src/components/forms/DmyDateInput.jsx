import React from "react";
import { Box, Input, IconButton, Icon } from "@chakra-ui/react";
import { MdCalendarToday } from "react-icons/md";

/** Local calendar date as YYYY-MM-DD (not UTC). */
export const getLocalTodayIso = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const normalizeToIsoDate = (value) => {
  if (value == null || value === false) return "";
  const text = String(value).trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const dmyMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return text;
};

/** If value is a complete date after today, return today; otherwise leave it as-is. */
export const clampIsoDateToToday = (value) => {
  if (value == null || value === false || value === "") return value;
  const iso = normalizeToIsoDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return value;
  const today = getLocalTodayIso();
  return iso > today ? today : iso;
};

/** Convert UI date (dd/mm/yyyy) to API format (yyyy-mm-dd). */
export const formatDateForApi = (value) => normalizeToIsoDate(value);

export const formatIsoToDisplayDate = (value) => {
  if (value == null || value === false) return "";
  // Keep raw text (including spaces) while typing free-form deadlines/notes.
  // Only normalize when the value is a complete date.
  const text = String(value);
  const trimmed = text.trim();
  if (!trimmed) return text;

  const iso = normalizeToIsoDate(trimmed);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return text;
};

export default function DmyDateInput({
  id,
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  iconColor = "whiteAlpha.900",
  max,
  ...inputProps
}) {
  const pickerRef = React.useRef(null);
  const displayValue = formatIsoToDisplayDate(value);
  const pickerValue = normalizeToIsoDate(value);
  const emitChange = (next) => {
    const iso = normalizeToIsoDate(next);
    if (max && /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso > max) {
      onChange(max);
      return;
    }
    onChange(next);
  };

  const openPicker = () => {
    const pickerEl = pickerRef.current;
    if (!pickerEl) return;
    if (typeof pickerEl.showPicker === "function") {
      pickerEl.showPicker();
    } else {
      pickerEl.focus();
      pickerEl.click();
    }
  };

  return (
    <Box position="relative">
      <Input
        id={id}
        type="text"
        value={displayValue}
        onChange={(e) => emitChange(e.target.value)}
        placeholder={placeholder}
        pr="28px"
        _placeholder={{ color: "whiteAlpha.800" }}
        {...inputProps}
      />
      <Input
        ref={pickerRef}
        type="date"
        value={pickerValue}
        max={max}
        onChange={(e) => emitChange(formatIsoToDisplayDate(e.target.value))}
        position="absolute"
        opacity={0}
        pointerEvents="none"
        h="1px"
        w="1px"
        p={0}
        border={0}
        overflow="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      <IconButton
        aria-label="Open date calendar"
        icon={<Icon as={MdCalendarToday} />}
        size="xs"
        variant="ghost"
        color={iconColor}
        position="absolute"
        right="0"
        top="50%"
        transform="translateY(-50%)"
        onClick={openPicker}
      />
    </Box>
  );
}
