// Document types of uploaded files (invoice, cipl, ...). GET /api/attachment/document-types is the source;
// this list only keeps the dropdown usable when that request fails.
export const DEFAULT_DOCUMENT_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "cipl", label: "CIPL" },
  { value: "stock_report", label: "Stock report" },
  { value: "msds", label: "MSDS" },
  { value: "supplier_doc", label: "Supplier document" },
  { value: "other", label: "Other" },
];

export const DEFAULT_DOCUMENT_TYPE = "other";

// Response of the types endpoint -> [{ value, label }]
export const normalizeDocumentTypes = (data) => {
  const payload = data?.result && typeof data.result === "object" ? data.result : data;
  const list = [payload, payload?.document_types, payload?.types, payload?.data].find(Array.isArray) || [];
  return list
    .filter((t) => t && t.value != null && t.value !== "")
    .map((t) => ({ value: String(t.value), label: String(t.label || t.value) }));
};

export const documentTypeLabel = (types, value) => {
  const key = String(value ?? "");
  return (types || []).find((t) => t.value === key)?.label || "";
};

// Label shown for a file: the server's label, else looked up from the types, else the raw value
export const fileTypeLabel = (file, types = DEFAULT_DOCUMENT_TYPES) =>
  file?.document_type_label || documentTypeLabel(types, file?.document_type) || file?.document_type || "";

// Same list with one file's type changed
export const withFileDocumentType = (files, fileId, value, types = DEFAULT_DOCUMENT_TYPES) =>
  (Array.isArray(files) ? files : []).map((file) =>
    String(file?.id) === String(fileId)
      ? { ...file, document_type: value, document_type_label: documentTypeLabel(types, value) || value }
      : file
  );
