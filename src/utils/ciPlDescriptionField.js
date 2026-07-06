/** Internal separator for multiple description rows in frontend state */
export const CI_PL_MULTI_FIELD_SEP = "\x1e";

/** Default description for Shipping Invoice / Cargo Manifest rows */
export const CI_PL_MANIFEST_DEFAULT_DESCRIPTION =
  "As per the attached CI PL from the supplier";

/** Prefix for multi-line description payloads stored in the single API `description` key */
const CI_PL_DESC_API_PREFIX = "__CIPL_DESC_LINES__";

export const parseCiPlMultiFieldLines = (value) => {
  if (value == null || value === false) return [""];
  const text = String(value);
  if (!text) return [""];
  if (text.includes(CI_PL_MULTI_FIELD_SEP)) {
    return text.split(CI_PL_MULTI_FIELD_SEP);
  }
  return [text];
};

export const serializeCiPlMultiFieldLines = (lines) => {
  if (!Array.isArray(lines)) return "";
  return lines.map((line) => String(line ?? "")).join(CI_PL_MULTI_FIELD_SEP);
};

/** Decode API `description` into internal multi-line `details` state */
export const parseCiPlDescriptionFromApi = (apiValue) => {
  if (apiValue == null || apiValue === false) return "";
  const text = String(apiValue);
  if (!text) return "";

  if (text.startsWith(CI_PL_DESC_API_PREFIX)) {
    try {
      const parsed = JSON.parse(text.slice(CI_PL_DESC_API_PREFIX.length));
      if (Array.isArray(parsed)) {
        return serializeCiPlMultiFieldLines(parsed.map((line) => String(line ?? "")));
      }
    } catch {
      // fall through to legacy formats
    }
  }

  return text;
};

/** Encode internal multi-line `details` state for API `description` */
export const serializeCiPlDescriptionForApi = (internalValue) => {
  const lines = parseCiPlMultiFieldLines(internalValue).map((line) => String(line ?? ""));

  if (lines.length <= 1) {
    return lines[0] ?? "";
  }

  return `${CI_PL_DESC_API_PREFIX}${JSON.stringify(lines)}`;
};

export const formatCiPlMultiFieldDisplay = (value) => {
  const lines = parseCiPlMultiFieldLines(value)
    .map((line) => String(line ?? "").trim())
    .filter(Boolean);
  return lines.length ? lines.join("\n") : "";
};

export const getCiPlPdfMultiFieldLines = (value) =>
  parseCiPlMultiFieldLines(value).map((line) => {
    const text = String(line ?? "").trim();
    return text || "-";
  });
