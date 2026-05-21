import api from "./axios";
import { buildCommonStockJobFilters } from "./commonFilterBuilder";

export const getClientStock = async (params = {}) => {
  try {
    const requestParams = buildCommonStockJobFilters(params, "stock");

    const response = await api.get("/api/client/stock", { params: requestParams });
    const data = response.data || response;

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch client stock");
    }

    return {
      status: data.status || "success",
      count: data.count ?? 0,
      client: data.client || null,
      stock_list: Array.isArray(data.stock_list) ? data.stock_list : [],
    };
  } catch (error) {
    throw error;
  }
};

function parseAttachmentDispositionFilename(header) {
  if (!header || typeof header !== "string") return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1].trim();
  const unquoted = header.match(/filename=([^;\s]+)/i);
  return unquoted?.[1]?.replace(/"/g, "").trim() || null;
}

/**
 * Download a stock attachment (client API).
 * @param {number|string} stockRecordId - Stock row `id` from list API (not stock_item_id)
 * @param {number|string|object} attachmentOrId - Attachment `id` or full attachment object with download_url
 */
export async function downloadClientStockAttachmentApi(
  stockRecordId,
  attachmentOrId,
  forceDownload = true
) {
  const attachmentId =
    typeof attachmentOrId === "object" && attachmentOrId != null
      ? attachmentOrId.id
      : attachmentOrId;
  if (stockRecordId == null || stockRecordId === "" || attachmentId == null || attachmentId === "") {
    throw new Error("Stock record id and attachment id are required.");
  }

  const query = forceDownload ? "?download=true" : "";
  const downloadPath =
    typeof attachmentOrId === "object" && attachmentOrId?.download_url
      ? String(attachmentOrId.download_url)
      : null;

  const urls = [];
  if (downloadPath) {
    const path = downloadPath.includes("?") ? downloadPath : `${downloadPath}${query}`;
    urls.push(path);
  }
  urls.push(`/api/client/stock/${stockRecordId}/attachment/${attachmentId}/download${query}`);

  let lastError;
  for (const url of urls) {
    try {
      const response = await api.get(url, { responseType: "blob" });
      if (response.data instanceof Blob && response.data.type === "application/json") {
        const text = await response.data.text();
        const jsonData = JSON.parse(text);
        if (jsonData.result?.status === "error" || jsonData.status === "error") {
          throw new Error(
            jsonData.result?.message || jsonData.message || "Failed to download attachment"
          );
        }
        continue;
      }
      return {
        data: response.data,
        type: response.headers["content-type"] || "application/pdf",
        filename: parseAttachmentDispositionFilename(response.headers["content-disposition"]),
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Failed to download attachment");
}

const clientStockApi = {
  getClientStock,
  downloadClientStockAttachmentApi,
};

export default clientStockApi;
