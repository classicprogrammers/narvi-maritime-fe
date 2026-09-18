import api from "./axios";
import { parseContentDispositionFilename } from "../utils/shippingOrderAttachments";

const CLIENT_SHIPPING_ORDER_BASE = "/api/client/shipping/order";

/**
 * Client portal read-only shipping orders.
 * Auth: Bearer client token (axios interceptor). No token in the URL.
 */

const buildListParams = (params = {}) => {
  const {
    page = 1,
    page_size = 80,
    fetch_all,
    fetchAll,
    sort_by,
    sort_order,
    search = "",
    vessel_id,
    country_id,
    destination,
    destination_id,
    done,
    so_id,
    name,
    id,
  } = params;

  const fetchAllRequested =
    fetchAll === true ||
    fetch_all === true ||
    fetch_all === 1 ||
    fetch_all === "1" ||
    String(fetch_all).toLowerCase() === "true" ||
    String(fetch_all).toLowerCase() === "yes";

  const requestParams = {};

  if (id != null && id !== "") {
    requestParams.id = id;
    return requestParams;
  }

  if (fetchAllRequested) {
    requestParams.fetch_all = true;
  } else {
    requestParams.page = page;
    requestParams.page_size = page_size;
  }

  const trimmedSearch = search ? String(search).trim() : "";
  if (trimmedSearch) {
    requestParams.search = trimmedSearch;
  }

  if (name != null && String(name).trim() !== "") {
    requestParams.name = String(name).trim();
  }

  if (vessel_id != null && vessel_id !== "") {
    requestParams.vessel_id = vessel_id;
  }
  if (country_id != null && country_id !== "") {
    requestParams.country_id = country_id;
  }
  if (destination_id != null && destination_id !== "") {
    requestParams.destination_id = destination_id;
  }
  if (destination != null && String(destination).trim() !== "") {
    requestParams.destination = String(destination).trim();
  }

  if (done != null && done !== "") {
    const doneValues = Array.isArray(done)
      ? done.map((value) => String(value).trim()).filter((value) => value !== "")
      : String(done)
          .split(",")
          .map((value) => value.trim())
          .filter((value) => value !== "");
    if (doneValues.length === 1) {
      requestParams.done = doneValues[0];
    } else if (doneValues.length > 1) {
      requestParams.done = doneValues;
    }
  }

  if (so_id != null && String(so_id).trim() !== "") {
    const rawSoId = String(so_id).trim();
    const digitsMatch = rawSoId.match(/\d+/);
    if (digitsMatch && digitsMatch[0] !== "") {
      requestParams.so_id = digitsMatch[0];
    }
  }

  if (sort_by != null && String(sort_by).trim() !== "") {
    requestParams.sort_by = String(sort_by).trim();
    if (sort_order === "asc" || sort_order === "desc") {
      requestParams.sort_order = sort_order;
    }
  }

  return requestParams;
};

const unwrapClientPayload = (data) => {
  if (data?.result && typeof data.result === "object" && !Array.isArray(data.result)) {
    return data.result;
  }
  return data;
};

const firstOrderRecord = (value) => {
  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === "object") || null;
  }
  if (value && typeof value === "object") return value;
  return null;
};

const extractOrders = (data) => {
  const source = unwrapClientPayload(data);
  if (Array.isArray(source?.order)) {
    return source.order.filter((item) => item && typeof item === "object");
  }
  if (source?.order && typeof source.order === "object") {
    return [source.order];
  }
  if (Array.isArray(source?.orders)) return source.orders;
  if (Array.isArray(source)) return source;
  if (Array.isArray(source?.data)) return source.data;
  return [];
};

const normalizeListResponse = (data, fallback = {}) => {
  if (data?.result && data.result.status === "error") {
    throw new Error(data.result.message || "Failed to fetch shipping orders");
  }
  if (data?.status === "error") {
    throw new Error(data.message || "Failed to fetch shipping orders");
  }

  const source = unwrapClientPayload(data) || {};
  const orders = extractOrders(data);
  const order = firstOrderRecord(source.order) || orders[0] || null;

  if (source.status === "success" || data?.status === "success") {
    return {
      status: "success",
      orders,
      order,
      count: source.count ?? data?.count ?? orders.length,
      total_count: source.total_count ?? source.count ?? data?.total_count ?? orders.length,
      page: source.page || fallback.page || 1,
      page_size: source.page_size || fallback.page_size || 80,
      total_pages: source.total_pages || 0,
      has_next: source.has_next || false,
      has_previous: source.has_previous || false,
      client: source.client || data?.client || null,
      sort_by: source.sort_by || fallback.sort_by,
      sort_order: source.sort_order || fallback.sort_order,
    };
  }

  return {
    status: source.status || data?.status || "success",
    orders,
    order,
    count: orders.length,
    total_count: orders.length,
    page: fallback.page || 1,
    page_size: fallback.page_size || 80,
    total_pages: 1,
    has_next: false,
    has_previous: false,
    client: source.client || data?.client || null,
    sort_by: fallback.sort_by,
    sort_order: fallback.sort_order,
  };
};

function toRelativeApiPath(url) {
  if (!url) return null;
  const path = String(url).trim();
  if (!path) return null;
  if (path.startsWith("/api/")) return path;
  try {
    const parsed = new URL(path);
    if (parsed.pathname.startsWith("/api/")) {
      return `${parsed.pathname}${parsed.search || ""}`;
    }
  } catch {
    return path.startsWith("/") ? path : `/${path}`;
  }
  return path;
}

function withDownloadQuery(path, forceDownload) {
  if (!path) return path;
  if (!forceDownload || path.includes("download=true")) return path;
  return `${path}${path.includes("?") ? "&" : "?"}download=true`;
}

async function downloadBlob(url, fallbackFilename) {
  const response = await api.get(url, { responseType: "blob" });

  if (response.data instanceof Blob && response.data.type === "application/json") {
    const text = await response.data.text();
    const jsonData = JSON.parse(text);
    if (jsonData.result?.status === "error" || jsonData.status === "error") {
      throw new Error(
        jsonData.result?.message || jsonData.message || "Failed to download file"
      );
    }
    throw new Error("Failed to download file");
  }

  const disposition = response.headers["content-disposition"];
  return {
    data: response.data,
    type: response.headers["content-type"] || "application/octet-stream",
    filename: parseContentDispositionFilename(disposition) || fallbackFilename,
    contentDisposition: disposition,
  };
}

async function downloadFromCandidateUrls(urls, fallbackFilename, fallbackMessage) {
  let lastError;
  for (const url of urls) {
    if (!url) continue;
    try {
      return await downloadBlob(url, fallbackFilename);
    } catch (err) {
      lastError = err;
      if (err.response?.data instanceof Blob && err.response.data.type === "application/json") {
        try {
          const text = await err.response.data.text();
          const jsonData = JSON.parse(text);
          if (jsonData.result?.status === "error" || jsonData.status === "error") {
            lastError = new Error(jsonData.result?.message || jsonData.message || fallbackMessage);
          }
        } catch {
          lastError = err;
        }
      }
    }
  }
  throw lastError || new Error(fallbackMessage);
}

/** GET /api/client/shipping/order — list or single (?id=) */
export const getClientShippingOrders = async (params = {}) => {
  const requestParams = buildListParams(params);
  const response = await api.get(CLIENT_SHIPPING_ORDER_BASE, { params: requestParams });
  const data = response.data || response;
  return normalizeListResponse(data, {
    page: params.page || 1,
    page_size: params.page_size || 80,
    sort_by: params.sort_by,
    sort_order: params.sort_order,
  });
};

/** GET /api/client/shipping/order?id= — single order */
export const getClientShippingOrderById = async (id) => {
  const result = await getClientShippingOrders({ id });
  return { ...result, order: result.order || result.orders?.[0] || null };
};

/** GET /api/client/shipping/order/<order_id>/stock — full stock_list for one SO */
export const getClientShippingOrderStockApi = async (orderId, stockItemsUrl = null) => {
  if (orderId == null || orderId === "") {
    throw new Error("Order id is required.");
  }
  const path =
    toRelativeApiPath(stockItemsUrl) || `${CLIENT_SHIPPING_ORDER_BASE}/${orderId}/stock`;
  const response = await api.get(path);
  const data = response.data || response;
  if (data.result?.status === "error" || data.status === "error") {
    throw new Error(data.result?.message || data.message || "Failed to fetch stock items");
  }
  const source = data.result && typeof data.result === "object" ? data.result : data;
  const orderRecord = firstOrderRecord(source.order);
  const stock_list = Array.isArray(source.stock_list)
    ? source.stock_list
    : Array.isArray(orderRecord?.stock_list)
      ? orderRecord.stock_list
      : [];
  return {
    status: source.status || data.status || "success",
    order_id: source.order_id ?? orderId,
    so_id: source.so_id,
    count: source.count ?? stock_list.length,
    stock_list,
  };
};

/** GET /api/client/shipping/order/<order_id>/attachments */
export const getClientShippingOrderAttachmentsApi = async (orderId, attachmentsUrl = null) => {
  if (orderId == null || orderId === "") {
    throw new Error("Order id is required.");
  }
  const path =
    toRelativeApiPath(attachmentsUrl) ||
    `${CLIENT_SHIPPING_ORDER_BASE}/${orderId}/attachments`;
  const response = await api.get(path);
  const data = response.data || response;
  if (data.result?.status === "error" || data.status === "error") {
    throw new Error(data.result?.message || data.message || "Failed to fetch attachments");
  }
  const source = data.result && typeof data.result === "object" ? data.result : data;
  return {
    status: source.status || data.status || "success",
    attachments: Array.isArray(source.attachments) ? source.attachments : [],
    cipl_files: Array.isArray(source.cipl_files) ? source.cipl_files : [],
    shipping_package: source.shipping_package || null,
    ...source,
  };
};

/**
 * GET /api/client/shipping/order/<order_id>/attachment/<attachment_id>/download
 * Bearer token via axios — never put the token in the URL.
 */
export const downloadClientShippingOrderAttachmentApi = async (
  orderId,
  attachmentOrId,
  forceDownload = true
) => {
  const attachmentId =
    typeof attachmentOrId === "object" && attachmentOrId != null
      ? attachmentOrId.id
      : attachmentOrId;
  if (orderId == null || orderId === "" || attachmentId == null || attachmentId === "") {
    throw new Error("Order id and attachment id are required.");
  }

  const query = forceDownload ? "?download=true" : "";
  const downloadPath = toRelativeApiPath(
    typeof attachmentOrId === "object" ? attachmentOrId?.download_url : null
  );

  const urls = [];
  if (downloadPath) {
    urls.push(withDownloadQuery(downloadPath, forceDownload));
  }
  urls.push(`${CLIENT_SHIPPING_ORDER_BASE}/${orderId}/attachment/${attachmentId}/download${query}`);

  return downloadFromCandidateUrls(urls, "attachment", "Failed to download attachment");
};

/**
 * GET /api/client/shipping/order/<order_id>/cipl/<attachment_id>/download
 */
export const downloadClientShippingOrderCiplApi = async (
  orderId,
  attachmentOrId,
  forceDownload = true
) => {
  const attachmentId =
    typeof attachmentOrId === "object" && attachmentOrId != null
      ? attachmentOrId.id
      : attachmentOrId;
  if (orderId == null || orderId === "" || attachmentId == null || attachmentId === "") {
    throw new Error("Order id and CIPL file id are required.");
  }

  const query = forceDownload ? "?download=true" : "";
  const downloadPath = toRelativeApiPath(
    typeof attachmentOrId === "object" ? attachmentOrId?.download_url : null
  );

  const urls = [];
  if (downloadPath) {
    urls.push(withDownloadQuery(downloadPath, forceDownload));
  }
  urls.push(`${CLIENT_SHIPPING_ORDER_BASE}/${orderId}/cipl/${attachmentId}/download${query}`);

  return downloadFromCandidateUrls(urls, "cipl.pdf", "Failed to download CIPL file");
};

/**
 * GET /api/client/shipping/order/<order_id>/package/download
 */
export const downloadClientShippingOrderPackageApi = async (
  orderId,
  packageMeta = null,
  forceDownload = true
) => {
  if (orderId == null || orderId === "") {
    throw new Error("Order id is required.");
  }

  const query = forceDownload ? "?download=true" : "";
  const downloadPath = toRelativeApiPath(
    packageMeta?.download_url || packageMeta?.full_download_url
  );

  const urls = [];
  if (downloadPath) {
    urls.push(withDownloadQuery(downloadPath, forceDownload));
  }
  urls.push(`${CLIENT_SHIPPING_ORDER_BASE}/${orderId}/package/download${query}`);

  return downloadFromCandidateUrls(urls, "shipping-package.pdf", "Failed to download package");
};

const clientShippingOrdersApi = {
  getClientShippingOrders,
  getClientShippingOrderById,
  getClientShippingOrderStockApi,
  getClientShippingOrderAttachmentsApi,
  downloadClientShippingOrderAttachmentApi,
  downloadClientShippingOrderCiplApi,
  downloadClientShippingOrderPackageApi,
};

export default clientShippingOrdersApi;
