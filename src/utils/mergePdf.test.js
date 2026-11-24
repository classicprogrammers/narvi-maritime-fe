import { buildMergeRequestBody, validateMergeIds, normalizeMergePreview, pickAttachmentIds } from "./mergePdf";

describe("mergePdf utils", () => {
  test("request body keeps only what is set", () => {
    expect(buildMergeRequestBody({ ids: ["1", 2], preset: "cipl" })).toEqual({ ids: [1, 2], preset: "cipl" });
    expect(buildMergeRequestBody({ ids: [1], attachmentIds: [5, 6], excludeTypes: ["msds"], preview: true, download: true })).toEqual({
      ids: [1],
      exclude_types: ["msds"],
      attachment_ids: [5, 6],
      preview: true,
      download: true,
    });
  });

  test("validates the selection size", () => {
    expect(validateMergeIds([])).toMatch(/at least one/i);
    expect(validateMergeIds(Array.from({ length: 101 }, (_, i) => i))).toMatch(/100/);
    expect(validateMergeIds([1, 2])).toBeNull();
  });

  test("normalises the preview", () => {
    const res = normalizeMergePreview({
      file_count: 2,
      page_count: 5,
      included: [{ attachment_id: 1, filename: "a.pdf", document_type: "invoice", pages: 2 }],
      skipped: [{ filename: "b.jpg", reason: "not a PDF" }],
    });
    expect(res).toMatchObject({ fileCount: 2, pageCount: 5 });
    expect(res.skipped).toHaveLength(1);
    expect(normalizeMergePreview(null)).toEqual({ fileCount: 0, pageCount: 0, included: [], skipped: [] });
  });

  test("sends attachment ids only when some files are unticked", () => {
    const included = [{ attachment_id: 1 }, { attachment_id: 2 }];
    expect(pickAttachmentIds(included, new Set([1, 2]))).toBeNull();
    expect(pickAttachmentIds(included, new Set([2]))).toEqual([2]);
  });
});
