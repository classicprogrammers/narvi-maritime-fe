// Agent invoice file of one Cost DB record (one file per cost; a new upload replaces the old one).

export const COST_INVOICE_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const COST_INVOICE_FILE_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"];
export const COST_INVOICE_FILE_ACCEPT = COST_INVOICE_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

// Returns an error message for a file the backend would refuse, or "" when it is fine
export const validateCostInvoiceFile = (file) => {
  if (!file) return "Choose a file to upload.";
  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";
  if (!COST_INVOICE_FILE_EXTENSIONS.includes(ext)) {
    return `Only ${COST_INVOICE_FILE_EXTENSIONS.join(", ")} files are allowed.`;
  }
  if (file.size > COST_INVOICE_FILE_MAX_BYTES) return "The file is larger than 10 MB.";
  return "";
};

// invoice_file of a cost record -> the file, or null (the backend sends null/false when there is none)
export const readCostInvoiceFile = (record) => {
  const file = record?.invoice_file;
  if (!file || typeof file !== "object" || !file.filename) return null;
  return file;
};
