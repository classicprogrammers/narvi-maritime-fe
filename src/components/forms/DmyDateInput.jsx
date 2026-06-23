import React from "react";
import { Box, Input, IconButton, Icon } from "@chakra-ui/react";
import { MdCalendarToday } from "react-icons/md";

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

/** Convert UI date (dd/mm/yyyy) to API format (yyyy-mm-dd). */
export const formatDateForApi = (value) => normalizeToIsoDate(value);

export const formatIsoToDisplayDate = (value) => {
  if (value == null || value === false) return "";
  const text = String(value).trim();
  if (!text) return "";
  const iso = normalizeToIsoDate(text);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }
  const dmyMatch = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  return text;
};

export default function DmyDateInput({ id, value, onChange, placeholder = "dd/mm/yyyy", ...inputProps }) {
  const pickerRef = React.useRef(null);
  const displayValue = formatIsoToDisplayDate(value);
  const pickerValue = normalizeToIsoDate(value);

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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        pr="28px"
        _placeholder={{ color: "whiteAlpha.800" }}
        {...inputProps}
      />
      <Input
        ref={pickerRef}
        type="date"
        value={pickerValue}
        onChange={(e) => onChange(formatIsoToDisplayDate(e.target.value))}
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
        color="whiteAlpha.900"
        position="absolute"
        right="0"
        top="50%"
        transform="translateY(-50%)"
        onClick={openPicker}
      />
    </Box>
  );
}
