import api from "./axios";
import { buildCommonStockJobFilters } from "./commonFilterBuilder";

export const getClientStock = async (params = {}) => {
  try {
    const requestParams = buildCommonStockJobFilters(params, "stock");
    const fetchAll = params.fetch_all === true || params.fetch_all === "true" || params.page_size === "all";
    if (fetchAll) {
      requestParams.fetch_all = true;
    } else {
      const page = params.page != null && Number(params.page) >= 1 ? Number(params.page) : 1;
      const pageSize =
        params.page_size != null && Number(params.page_size) > 0 ? Number(params.page_size) : 50;
      requestParams.page = page;
      requestParams.page_size = pageSize;
    }

    const response = await api.get("/api/client/stock", { params: requestParams });
    const data = response.data || response;

    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch client stock");
    }

    const list = Array.isArray(data.stock_list)
      ? data.stock_list
      : Array.isArray(data.result?.stock_list)
        ? data.result.stock_list
        : Array.isArray(data.data)
          ? data.data
          : [];
    const page = Number(data.page ?? requestParams.page) || 1;
    const pageSize = Number(data.page_size ?? requestParams.page_size) || list.length || 50;
    const totalCount = Number(data.total_count ?? data.count ?? list.length) || 0;
    const totalPages =
      Number(data.total_pages) ||
      Math.max(1, Math.ceil(totalCount / (Number(pageSize) || 50)));

    return {
      status: data.status || "success",
      count: data.count ?? list.length,
      total_count: totalCount,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      has_next: Boolean(data.has_next ?? page < totalPages),
      has_previous: Boolean(data.has_previous ?? page > 1),
      client: data.client || data.result?.client || null,
      stock_list: list,
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
