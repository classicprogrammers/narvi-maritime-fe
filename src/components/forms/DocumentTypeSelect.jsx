import React from "react";
import { Select } from "@chakra-ui/react";
import useDocumentTypes from "../../hooks/useDocumentTypes";
import { DEFAULT_DOCUMENT_TYPE } from "../../utils/documentTypes";

// Document type dropdown for uploaded files. value is the type value ("other" when empty).
export default function DocumentTypeSelect({ value, onChange, isDisabled = false, ariaLabel = "Document type", ...rest }) {
  const types = useDocumentTypes();
  const current = value || DEFAULT_DOCUMENT_TYPE;
  const known = types.some((t) => t.value === current);
  return (
    <Select
      size="xs"
      value={current}
      onChange={(e) => onChange(e.target.value)}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      borderRadius="md"
      {...rest}
    >
      {!known && <option value={current}>{current}</option>}
      {types.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </Select>
  );
}
