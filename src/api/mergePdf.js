import api from "./axios";
import { buildMergeRequestBody } from "../utils/mergePdf";

// Error bodies of a blob request arrive as a Blob; read the message out of it
const blobErrorMessage = async (error, fallback) => {
  const data = error?.response?.data;
  try {
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      const json = JSON.parse(await data.text());
      return json?.message || json?.result?.message || fallback;
    }
  } catch {
    /* not JSON */
  }
  return data?.message || data?.result?.message || error?.message || fallback;
};

const toPdfResult = async (response) => {
  const blob = response.data;
  // A JSON body on a 200 is an error message, not a PDF
  if (blob instanceof Blob && blob.type.includes("json")) {
    const json = JSON.parse(await blob.text());
    throw new Error(json?.message || json?.result?.message || "Failed to build the merged PDF");
  }
  const headers = response.headers || {};
  return {
    blob,
    fileCount: Number(headers["x-merge-files"]) || null,
    skippedCount: Number(headers["x-merge-skipped"]) || 0,
    itemsWithoutPdf: Number(headers["x-merge-items-without-pdf"]) || 0,
    notAvailable: Number(headers["x-merge-not-available"]) || 0,
  };
};

// Client portal, one item. preview: JSON { file_count, page_count, included, skipped } instead of the PDF.
export const getClientStockMergePdf = async (stockId, { preview = false } = {}) => {
  if (stockId == null || stockId === "") throw new Error("Stock item id is required.");
  const url = `/api/client/stock/${stockId}/merge-pdf`;
  try {
    if (preview) {
      const response = await api.get(url, { params: { preview: true } });
      return response.data;
    }
    return toPdfResult(await api.get(url, { responseType: "blob" }));
  } catch (error) {
    throw new Error(await blobErrorMessage(error, "Failed to build the merged PDF"));
  }
};

// Client portal, several items in ONE merged PDF (files follow the order of ids; MSDS left out).
export const getClientStockListMergePdf = async (ids) => {
  const body = buildMergeRequestBody({ ids });
  try {
    return toPdfResult(await api.post("/api/client/stock/merge-pdf", body, { responseType: "blob" }));
  } catch (error) {
    throw new Error(await blobErrorMessage(error, "Failed to build the merged PDF"));
  }
};

// Live stock list, many items. Options: ids, preset, excludeTypes, attachmentIds, preview, download.
export const getStockListMergePdf = async (options = {}) => {
  const body = buildMergeRequestBody(options);
  try {
    if (options.preview) {
      const response = await api.post("/api/stock/list/merge-pdf", body);
      return response.data;
    }
    return toPdfResult(await api.post("/api/stock/list/merge-pdf", body, { responseType: "blob" }));
  } catch (error) {
    throw new Error(await blobErrorMessage(error, "Failed to build the merged PDF"));
  }
};

const mergePdfApi = { getClientStockMergePdf, getClientStockListMergePdf, getStockListMergePdf };
export default mergePdfApi;
