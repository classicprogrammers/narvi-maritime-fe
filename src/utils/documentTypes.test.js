import {
  DEFAULT_DOCUMENT_TYPES,
  documentTypeLabel,
  fileTypeLabel,
  normalizeDocumentTypes,
  withFileDocumentType,
} from "./documentTypes";

describe("documentTypes", () => {
  test("normalizeDocumentTypes reads the list from the usual response shapes", () => {
    const list = [{ value: "invoice", label: "Invoice" }, { value: "other" }, null, { label: "no value" }];
    const expected = [
      { value: "invoice", label: "Invoice" },
      { value: "other", label: "other" },
    ];
    expect(normalizeDocumentTypes(list)).toEqual(expected);
    expect(normalizeDocumentTypes({ result: { status: "success", document_types: list } })).toEqual(expected);
    expect(normalizeDocumentTypes({ types: list })).toEqual(expected);
    expect(normalizeDocumentTypes({ result: list })).toEqual(expected);
    expect(normalizeDocumentTypes(null)).toEqual([]);
  });

  test("labels", () => {
    expect(documentTypeLabel(DEFAULT_DOCUMENT_TYPES, "msds")).toBe("MSDS");
    expect(documentTypeLabel(DEFAULT_DOCUMENT_TYPES, "nope")).toBe("");
    expect(fileTypeLabel({ document_type: "cipl", document_type_label: "CIPL files" })).toBe("CIPL files");
    expect(fileTypeLabel({ document_type: "cipl" })).toBe("CIPL");
    expect(fileTypeLabel({ document_type: "weird" })).toBe("weird");
    expect(fileTypeLabel({})).toBe("");
  });

  test("withFileDocumentType changes only the matching file", () => {
    const files = [{ id: 1, document_type: "other" }, { id: 2, document_type: "other" }];
    expect(withFileDocumentType(files, "2", "msds")).toEqual([
      { id: 1, document_type: "other" },
      { id: 2, document_type: "msds", document_type_label: "MSDS" },
    ]);
    expect(withFileDocumentType(null, 1, "msds")).toEqual([]);
  });
});
