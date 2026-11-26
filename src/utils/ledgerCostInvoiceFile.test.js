import {
  COST_INVOICE_FILE_MAX_BYTES,
  readCostInvoiceFile,
  validateCostInvoiceFile,
} from "./ledgerCostInvoiceFile";

describe("validateCostInvoiceFile", () => {
  it("accepts allowed types, whatever the letter case", () => {
    expect(validateCostInvoiceFile({ name: "inv.PDF", size: 100 })).toBe("");
    expect(validateCostInvoiceFile({ name: "a.b.xlsx", size: 100 })).toBe("");
  });

  it("rejects other types and files without an extension", () => {
    expect(validateCostInvoiceFile({ name: "inv.exe", size: 100 })).toMatch(/Only/);
    expect(validateCostInvoiceFile({ name: "invoice", size: 100 })).toMatch(/Only/);
  });

  it("rejects files over 10 MB but allows exactly 10 MB", () => {
    expect(validateCostInvoiceFile({ name: "a.pdf", size: COST_INVOICE_FILE_MAX_BYTES })).toBe("");
    expect(validateCostInvoiceFile({ name: "a.pdf", size: COST_INVOICE_FILE_MAX_BYTES + 1 })).toMatch(/10 MB/);
  });

  it("asks for a file when none is given", () => {
    expect(validateCostInvoiceFile(null)).toMatch(/Choose/);
  });
});

describe("readCostInvoiceFile", () => {
  it("returns the file or null", () => {
    const file = { filename: "a.pdf", file_size: 5, download_url: "/api/x" };
    expect(readCostInvoiceFile({ invoice_file: file })).toBe(file);
    expect(readCostInvoiceFile({ invoice_file: null })).toBeNull();
    expect(readCostInvoiceFile({ invoice_file: false })).toBeNull();
    expect(readCostInvoiceFile(null)).toBeNull();
  });
});
