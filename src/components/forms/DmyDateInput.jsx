import React from "react";
import { Box, Input, IconButton, Icon } from "@chakra-ui/react";
import { MdCalendarToday } from "react-icons/md";
import { maskDmyTyping, dmyToIsoStrict } from "utils/dateFormat";

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

/**
 * The one date field for the whole app. Shows and accepts DD/MM/YYYY only:
 * digits with auto slashes, day 01-31, month 01-12, real calendar dates, plus a calendar picker.
 * `value` may be YYYY-MM-DD or DD/MM/YYYY; `onChange` receives DD/MM/YYYY (or "" when cleared).
 * Incomplete or impossible text stays local (red border) and is dropped on blur.
 */
export default function DmyDateInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "dd/mm/yyyy",
  iconColor = "whiteAlpha.900",
  max,
  ...inputProps
}) {
  const pickerRef = React.useRef(null);
  const [draft, setDraft] = React.useState(null);
  const displayValue = draft != null ? draft : formatIsoToDisplayDate(value);
  const pickerValue = normalizeToIsoDate(value);
  const invalid = draft != null && draft.length === 10;

  const commit = (iso, display) => {
    setDraft(null);
    if (max && iso > max) {
      onChange(max);
      return;
    }
    onChange(display);
  };

  const handleTyping = (text) => {
    const raw = String(text ?? "");
    if (raw.trim() === "") {
      setDraft(null);
      onChange("");
      return;
    }
    const masked = maskDmyTyping(raw);
    const iso = dmyToIsoStrict(masked);
    if (iso) {
      commit(iso, masked);
      return;
    }
    setDraft(masked);
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
        inputMode="numeric"
        maxLength={10}
        autoComplete="off"
        value={displayValue}
        onChange={(e) => handleTyping(e.target.value)}
        onBlur={(e) => {
          setDraft(null);
          if (onBlur) onBlur(e);
        }}
        placeholder={placeholder}
        pr="28px"
        isInvalid={invalid || inputProps.isInvalid}
        _placeholder={{ color: "whiteAlpha.800" }}
        {...inputProps}
      />
      <Input
        ref={pickerRef}
        type="date"
        value={pickerValue}
        max={max}
        onChange={(e) => {
          const iso = e.target.value;
          if (!iso) {
            setDraft(null);
            onChange("");
            return;
          }
          commit(iso, formatIsoToDisplayDate(iso));
        }}
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
