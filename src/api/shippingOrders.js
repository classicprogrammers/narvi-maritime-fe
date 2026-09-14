import api from "./axios";
import { getApiEndpoint, API_CONFIG } from "../config/api";
import { parseContentDispositionFilename } from "../utils/shippingOrderAttachments";

function throwIfApiError(data) {
  if (!data) return;
  if (data.result && data.result.status === "error") {
    throw new Error(data.result.message || "Request failed");
  }
  if (data.status === "error") {
    throw new Error(data.message || "Request failed");
  }
}

function unwrapApiPayload(data) {
  if (!data) return data;
  if (data.result && typeof data.result === "object" && !Array.isArray(data.result)) {
    return data.result;
  }
  return data;
}

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

function firstRecord(value) {
  if (Array.isArray(value)) {
    return value.find((item) => item && typeof item === "object") || null;
  }
  if (value && typeof value === "object") {
    return value;
  }
  return null;
}

/** Pull a single order object from GET/POST /api/shipping/order responses. */
export function extractShippingOrderRecord(data) {
  throwIfApiError(data);
  const source = unwrapApiPayload(data);
  throwIfApiError(source);

  const fromOrder = firstRecord(source?.order);
  if (fromOrder) return fromOrder;

  const fromOrders = firstRecord(source?.orders);
  if (fromOrders) return fromOrders;

  if (
    source &&
    typeof source === "object" &&
    source.id != null &&
    (source.so_id != null ||
      source.so_number != null ||
      source.name != null ||
      Array.isArray(source.stock_list) ||
      source.client_id != null ||
      source.done != null)
  ) {
    return source;
  }
  return null;
}

export function extractShippingOrderStockList(data) {
  throwIfApiError(data);
  const source = unwrapApiPayload(data);
  throwIfApiError(source);
  if (Array.isArray(source.stock_list)) return source.stock_list;
  const order = firstRecord(source.order) || firstRecord(source.orders);
  if (Array.isArray(order?.stock_list)) return order.stock_list;
  return [];
}

// Get all shipping orders with pagination and search
export const getShippingOrders = async (params = {}) => {
  try {
    const {
      page = 1,
      page_size = 80,
      fetch_all,
      fetchAll,
      sort_by,
      sort_order,
      search = "",
      client_id,
      vessel_id,
      destination_id,
      country_id,
      done,
      so_id,
      destination,
      pic_new,
      pic_id,
    } = params;

    const fetchAllRequested =
      fetchAll === true ||
      fetch_all === true ||
      fetch_all === 1 ||
      fetch_all === "1" ||
      String(fetch_all).toLowerCase() === "true" ||
      String(fetch_all).toLowerCase() === "yes";

    const requestParams = fetchAllRequested
      ? { fetch_all: true }
      : { page, page_size };

    // Include search parameter if provided (only search, not name)
    const trimmedSearch = search ? search.trim() : "";
    if (trimmedSearch) {
      requestParams.search = trimmedSearch;
    }

    if (client_id != null && client_id !== "") {
      const numericClientId = Number(client_id);
      requestParams.client_id = Number.isFinite(numericClientId) ? numericClientId : client_id;
    }
    if (vessel_id != null && vessel_id !== "") {
      requestParams.vessel_id = vessel_id;
    }
    if (destination_id != null && destination_id !== "") {
      requestParams.destination_id = destination_id;
    }
    if (country_id != null && country_id !== "") {
      requestParams.country_id = country_id;
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
    if (destination != null && String(destination).trim() !== "") {
      requestParams.destination = String(destination).trim();
    }
    const picNewSource = pic_new ?? pic_id;
    if (picNewSource != null && picNewSource !== "") {
      const picNewIds = Array.isArray(picNewSource)
        ? picNewSource
        : String(picNewSource)
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "");
      const normalizedPicNewIds = picNewIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      if (normalizedPicNewIds.length > 0) {
        requestParams.pic_new = normalizedPicNewIds;
      }
    }
    // Normalize so_id to only the numeric part (e.g. "SO 123", "so-123" -> "123")
    if (so_id != null && String(so_id).trim() !== "") {
      const rawSoId = String(so_id).trim();
      const digitsMatch = rawSoId.match(/\d+/);
      if (digitsMatch && digitsMatch[0] !== "") {
        requestParams.so_id = digitsMatch[0];
      }
    }

    if (params.sort_by != null && String(params.sort_by).trim() !== "") {
      requestParams.sort_by = String(params.sort_by).trim();
      // next_action uses backend default order — omit sort_order
      if (
        requestParams.sort_by !== "next_action" &&
        (params.sort_order === "asc" || params.sort_order === "desc")
      ) {
        requestParams.sort_order = params.sort_order;
      }
    }

    const response = await api.get('/api/shipping/orders', {
      params: requestParams,
    });

    const data = response.data || response;

    // Check if response has error status (JSON-RPC format)
    if (data.result && data.result.status === 'error') {
      throw new Error(data.result.message || 'Failed to fetch shipping orders');
    }
    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch shipping orders");
    }

    // Return full response with pagination metadata
    if (data.status === "success") {
      return {
        orders: Array.isArray(data.orders) ? data.orders : [],
        count: data.count || 0,
        total_count: data.total_count || 0,
        page: data.page || page,
        page_size: data.page_size || page_size,
        total_pages: data.total_pages || 0,
        has_next: data.has_next || false,
        has_previous: data.has_previous || false,
        sort_by: data.sort_by || sort_by,
        sort_order: data.sort_order || sort_order,
      };
    }

    // Fallback for non-standard response format
    const orders = Array.isArray(data)
      ? data
      : Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.data)
            ? data.data
            : [];

    return {
      orders: orders,
      count: orders.length,
      total_count: orders.length,
      page: page,
      page_size: page_size,
      total_pages: 1,
      has_next: false,
      has_previous: false,
      sort_by: sort_by,
      sort_order: sort_order,
    };
  } catch (error) {
    throw error;
  }
};

function toShippingOrderResult(data) {
  throwIfApiError(data);
  const source = unwrapApiPayload(data) || {};
  const order = extractShippingOrderRecord(data);
  if (!order) {
    throw new Error("Shipping order not found");
  }
  return {
    ...source,
    status: source.status || data?.status || "success",
    order,
  };
}

// Get shipping order by ID — GET /api/shipping/order?id=
export const getShippingOrderById = async (id) => {
  const normalizedId =
    typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id))
      ? Number(id)
      : id;
  if (normalizedId == null || normalizedId === "") {
    throw new Error("Order id is required.");
  }

  const response = await api.get("/api/shipping/order", {
    params: { id: normalizedId },
  });
  return toShippingOrderResult(response.data || response);
};

/** GET /api/shipping/order/<order_id>/stock — full stock_list for one SO */
export const getShippingOrderStockApi = async (orderId, stockItemsUrl = null) => {
  if (orderId == null || orderId === "") {
    throw new Error("Order id is required.");
  }
  const path =
    toRelativeApiPath(stockItemsUrl) || `${getApiEndpoint("SHIPPING_ORDER")}/${orderId}/stock`;
  const response = await api.get(path);
  const data = response.data || response;
  const stock_list = extractShippingOrderStockList(data);
  const source = unwrapApiPayload(data) || {};
  return {
    status: source.status || data?.status || "success",
    order_id: source.order_id ?? orderId,
    so_id: source.so_id,
    count: source.count ?? stock_list.length,
    stock_list,
  };
};

// Create new shipping order
export const createShippingOrder = async (orderData) => {
  try {
    const response = await api.post('/api/create/shipping/order', orderData);

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to create shipping order');
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update shipping order
// `orderData` is expected to already be in the correct shape for the backend.
// Callers (like `buildPayloadFromForm`) can pre-diff and send only changed fields.
export const updateShippingOrder = async (id, orderData, originalData = {}) => {
  try {
    // Ensure numeric IDs are sent as numbers (not route-param strings)
    const normalizedId =
      typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id))
        ? Number(id)
        : id;
    // Build payload directly from provided orderData.
    // Always include id; callers decide which fields to send.
    const payload = {
      id: normalizedId,
      ...(orderData || {}),
    };

    const response = await api.post('/api/shipping/order/update', payload);

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to update shipping order');
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

/** GET /api/shipping/order/:orderId/attachments — metadata only */
export const getShippingOrderAttachmentsApi = async (orderId) => {
  try {
    const response = await api.get(
      `${getApiEndpoint("SHIPPING_ORDER")}/${orderId}/attachments`
    );
    const data = response.data || response;
    if (data.result && data.result.status === "error") {
      throw new Error(data.result.message || "Failed to fetch attachments");
    }
    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch attachments");
    }
    const source = data.status === "success" || data.result?.status === "success" ? data : data;
    const attachments = Array.isArray(source.attachments)
      ? source.attachments
      : Array.isArray(source.result?.attachments)
        ? source.result.attachments
        : [];
    return { attachments, ...source };
  } catch (error) {
    throw error;
  }
};

/** GET /api/shipping/order/:orderId/attachment/:attachmentId/download */
export const downloadShippingOrderAttachmentApi = async (
  orderId,
  attachmentId,
  forceDownload = false
) => {
  try {
    const url = `${getApiEndpoint("SHIPPING_ORDER")}/${orderId}/attachment/${attachmentId}/download${
      forceDownload ? "?download=true" : ""
    }`;
    const response = await api.get(url, { responseType: "blob" });

    if (response.data instanceof Blob && response.data.type === "application/json") {
      const text = await response.data.text();
      const jsonData = JSON.parse(text);
      if (jsonData.result && jsonData.result.status === "error") {
        throw new Error(jsonData.result.message || "Failed to download attachment");
      }
      return jsonData;
    }

    const disposition = response.headers["content-disposition"];
    return {
      data: response.data,
      type: response.headers["content-type"] || "application/octet-stream",
      filename: parseContentDispositionFilename(disposition),
      contentDisposition: disposition,
    };
  } catch (error) {
    if (error.response?.data instanceof Blob && error.response.data.type === "application/json") {
      const text = await error.response.data.text();
      const jsonData = JSON.parse(text);
      if (jsonData.result?.status === "error") {
        throw new Error(jsonData.result.message || "Failed to download attachment");
      }
    }
    throw error;
  }
};

/** GET /api/shipping/order/:orderId/cipl/:ciplId/download */
export const downloadShippingOrderCiplApi = async (orderId, ciplId, forceDownload = false) => {
  try {
    const url = `${getApiEndpoint("SHIPPING_ORDER")}/${orderId}/cipl/${ciplId}/download${
      forceDownload ? "?download=true" : ""
    }`;
    const response = await api.get(url, { responseType: "blob" });

    if (response.data instanceof Blob && response.data.type === "application/json") {
      const text = await response.data.text();
      const jsonData = JSON.parse(text);
      if (jsonData.result && jsonData.result.status === "error") {
        throw new Error(jsonData.result.message || "Failed to download CIPL file");
      }
      return jsonData;
    }

    const disposition = response.headers["content-disposition"];
    return {
      data: response.data,
      type: response.headers["content-type"] || "application/pdf",
      filename: parseContentDispositionFilename(disposition),
      contentDisposition: disposition,
    };
  } catch (error) {
    if (error.response?.data instanceof Blob && error.response.data.type === "application/json") {
      const text = await error.response.data.text();
      const jsonData = JSON.parse(text);
      if (jsonData.result?.status === "error") {
        throw new Error(jsonData.result.message || "Failed to download CIPL file");
      }
    }
    throw error;
  }
};

/** Build absolute download URL when API returns a relative download_url. */
export const buildShippingOrderAttachmentUrl = (orderId, attachment, forceDownload = false) => {
  const base = (API_CONFIG.BASE_URL || "").replace(/\/$/, "");
  if (attachment?.download_url) {
    const path = String(attachment.download_url);
    const absolute = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
    return forceDownload
      ? `${absolute}${absolute.includes("?") ? "&" : "?"}download=true`
      : absolute;
  }
  return `${base}${getApiEndpoint("SHIPPING_ORDER")}/${orderId}/attachment/${attachment.id}/download${
    forceDownload ? "?download=true" : ""
  }`;
};

/** Resolve package download URL (absolute). */
export const resolveShippingPackageDownloadUrl = (url) => {
  if (!url || url === false) return null;
  if (String(url).startsWith("http")) return String(url);
  const base = (API_CONFIG.BASE_URL || "").replace(/\/$/, "");
  const path = String(url);
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

/** POST /api/shipping/order/package/check — readiness (no download URL). */
export const checkShippingOrderPackage = async (id) => {
  try {
    const normalizedId =
      typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id))
        ? Number(id)
        : id;
    const response = await api.post("/api/shipping/order/package/check", { id: normalizedId });
    const data = response.data || response;
    if (data.result && data.result.status === "error") {
      throw new Error(data.result.message || "Failed to check shipping package");
    }
    if (data.status === "error") {
      throw new Error(data.message || "Failed to check shipping package");
    }
    return data.result && typeof data.result === "object" ? data.result : data;
  } catch (error) {
    throw error;
  }
};

/** POST /api/shipping/order/package/merge — merge CIPL + stock report PDFs. */
export const mergeShippingOrderPackage = async (id) => {
  try {
    const normalizedId =
      typeof id === "string" && id.trim() !== "" && !Number.isNaN(Number(id))
        ? Number(id)
        : id;
    const response = await api.post("/api/shipping/order/package/merge", { id: normalizedId });
    const data = response.data || response;
    if (data.result && data.result.status === "error") {
      const err = new Error(data.result.message || "Failed to merge shipping package");
      err.missing = data.result.missing;
      err.missing_messages = data.result.missing_messages;
      throw err;
    }
    if (data.status === "error") {
      const err = new Error(data.message || "Failed to merge shipping package");
      err.missing = data.missing;
      err.missing_messages = data.missing_messages;
      throw err;
    }
    return data.result && typeof data.result === "object" ? data.result : data;
  } catch (error) {
    throw error;
  }
};

// Delete shipping order
export const deleteShippingOrder = async (id) => {
  try {
    const response = await api.post('/api/shipping/order/delete', { id });

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to delete shipping order');
    }

    return response.data;
  } catch (error) {
    throw error;
  }
};

//eslint-disable-next-line
export default {
  getShippingOrders,
  getShippingOrderById,
  getShippingOrderStockApi,
  createShippingOrder,
  updateShippingOrder,
  deleteShippingOrder,
  getShippingOrderAttachmentsApi,
  downloadShippingOrderAttachmentApi,
  buildShippingOrderAttachmentUrl,
  resolveShippingPackageDownloadUrl,
  checkShippingOrderPackage,
  mergeShippingOrderPackage,
};
