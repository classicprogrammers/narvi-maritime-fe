// Helpers for invoice files and the "economy" section of a Shipping Order.

const list = (value) => (Array.isArray(value) ? value : []);

// Absolute or relative download link -> path on our API (axios adds the base URL)
export const toRelativeApiPath = (url) => {
  const path = String(url ?? "").trim();
  if (!path) return null;
  if (path.startsWith("/api/")) return path;
  try {
    const parsed = new URL(path);
    return parsed.pathname.startsWith("/api/") ? `${parsed.pathname}${parsed.search || ""}` : null;
  } catch {
    return null;
  }
};

// economy object of an SO detail response -> { invoices, soInvoiceFiles }, or null when the backend sends none
export const readEconomy = (rawOrder) => {
  const economy = rawOrder?.economy;
  if (!economy || typeof economy !== "object" || Array.isArray(economy)) return null;
  return {
    invoices: list(economy.invoices),
    soInvoiceFiles: list(economy.so_invoice_files),
  };
};

// Files of one invoice record (Invoice DB record or economy invoice)
export const invoiceFilesOf = (invoice) => list(invoice?.files).filter((f) => f && f.id != null);

// file_errors of a create/update response (empty list when everything uploaded)
export const readFileErrors = (response) => {
  const payload = response?.result && typeof response.result === "object" ? response.result : response;
  return list(payload?.file_errors).map((e) => (typeof e === "string" ? e : e?.message || e?.error || "")).filter(Boolean);
};

// Save a downloaded { data: Blob, filename } response under the file's own name
export const saveDownloadedFile = (response, file) => {
  if (!(response?.data instanceof Blob)) throw new Error("Could not download file.");
  const name = (file?.filename || file?.name || response.filename || "download").toString().trim() || "download";
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};
