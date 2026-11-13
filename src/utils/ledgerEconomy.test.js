import { formatFileSize, invoiceFilesOf, readEconomy, readFileErrors, toRelativeApiPath } from "./ledgerEconomy";

describe("ledgerEconomy", () => {
  test("toRelativeApiPath keeps API paths and strips the host", () => {
    expect(toRelativeApiPath("/api/ledger/invoice/3/attachment/9/download")).toBe(
      "/api/ledger/invoice/3/attachment/9/download"
    );
    expect(toRelativeApiPath("https://be.example.org/api/client/x/download?a=1")).toBe("/api/client/x/download?a=1");
    expect(toRelativeApiPath("https://be.example.org/files/x")).toBeNull();
    expect(toRelativeApiPath("")).toBeNull();
    expect(toRelativeApiPath(null)).toBeNull();
  });

  test("readEconomy returns null without an economy object", () => {
    expect(readEconomy({})).toBeNull();
    expect(readEconomy({ economy: [] })).toBeNull();
    expect(readEconomy(null)).toBeNull();
    expect(readEconomy({ economy: { invoices: [{ id: 1 }], so_invoice_files: [{ id: 2 }] } })).toEqual({
      invoices: [{ id: 1 }],
      soInvoiceFiles: [{ id: 2 }],
    });
    expect(readEconomy({ economy: { invoices: null } })).toEqual({ invoices: [], soInvoiceFiles: [] });
  });

  test("invoiceFilesOf skips entries without an id", () => {
    expect(invoiceFilesOf({ files: [{ id: 1, filename: "a.pdf" }, null, { filename: "x" }] })).toEqual([
      { id: 1, filename: "a.pdf" },
    ]);
    expect(invoiceFilesOf(null)).toEqual([]);
  });

  test("readFileErrors reads both response shapes", () => {
    expect(readFileErrors({ result: { status: "success", file_errors: ["bad.exe: not allowed"] } })).toEqual([
      "bad.exe: not allowed",
    ]);
    expect(readFileErrors({ file_errors: [{ message: "too big" }] })).toEqual(["too big"]);
    expect(readFileErrors({ result: { file_errors: [] } })).toEqual([]);
    expect(readFileErrors(null)).toEqual([]);
  });

  test("formatFileSize", () => {
    expect(formatFileSize(0)).toBe("");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(300 * 1024)).toBe("300 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
