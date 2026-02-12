// Stock API functions
import { getApiEndpoint } from "../config/api";
import api from "./axios";

// Import the global modal system
import { showApiModal } from "../components/ApiModal";

// Helper function to handle API errors and show modals
const handleApiError = (error, operation) => {
  console.error(`${operation} failed:`, error);

  let errorMessage = error.message || `Failed to ${operation.toLowerCase()}`;

  // Network errors (CORS, connection refused, etc.)
  if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
    errorMessage =
      "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.";
  }

  // HTTP errors (4xx, 5xx) - Extract detailed error message from response
  if (error.response) {
    const responseData = error.response.data;

    // Check for JSON-RPC error format
    if (responseData && responseData.result && responseData.result.status === 'error') {
      errorMessage = responseData.result.message || errorMessage;
    }
    // Check for direct error message in response
    else if (responseData && responseData.message) {
      errorMessage = responseData.message;
    }
    // Check for error in response data
    else if (responseData && responseData.error) {
      errorMessage = responseData.error;
    }
    // Fallback to status-based message
    else {
      errorMessage = `Backend error (${error.response.status}): ${errorMessage}`;
    }
  }

  // Show error modal
  showApiModal("error", `${operation} Failed`, errorMessage);

  throw new Error(errorMessage);
};

// Get stock list with pagination and search/filters (all params passed through to backend)
export const getStockListApi = async (params = {}) => {
  try {
    const {
      page = 1,
      page_size = 50,
      sort_by = "id",
      sort_order = "desc",
      search = "",
      name = "",
      client_id,
      vessel_id,
      status = "",
      so_number = "",
      si_number = "",
      si_combined = "",
      di_number = "",
      stock_item_id = "",
      date_on_stock = "",
      days_on_stock = "",
      hub = "",
      supplier_id,
      warehouse_id,
      currency_id,
    } = params;

    const requestParams = {
      page,
      page_size,
      sort_by,
      sort_order,
    };

    const trimmedSearch = search ? String(search).trim() : "";
    const trimmedName = name ? String(name).trim() : "";
    if (trimmedSearch) {
      requestParams.search = trimmedSearch;
    }
    if (trimmedName) {
      requestParams.name = trimmedName;
    }
    if (trimmedSearch && !trimmedName) {
      requestParams.name = trimmedSearch;
    }

    if (client_id != null && client_id !== "") requestParams.client_id = client_id;
    if (vessel_id != null && vessel_id !== "") requestParams.vessel_id = vessel_id;
    if (status != null && String(status).trim() !== "") requestParams.status = String(status).trim();
    if (so_number != null && String(so_number).trim() !== "") requestParams.so_number = String(so_number).trim();
    if (si_number != null && String(si_number).trim() !== "") requestParams.si_number = String(si_number).trim();
    if (si_combined != null && String(si_combined).trim() !== "") requestParams.si_combined = String(si_combined).trim();
    if (di_number != null && String(di_number).trim() !== "") requestParams.di_number = String(di_number).trim();
    if (stock_item_id != null && String(stock_item_id).trim() !== "") requestParams.stock_item_id = String(stock_item_id).trim();
    if (date_on_stock != null && String(date_on_stock).trim() !== "") requestParams.date_on_stock = String(date_on_stock).trim();
    if (days_on_stock != null && String(days_on_stock).trim() !== "") requestParams.days_on_stock = String(days_on_stock).trim();
    if (hub != null && String(hub).trim() !== "") requestParams.hub = String(hub).trim();
    if (supplier_id != null && supplier_id !== "") requestParams.supplier_id = supplier_id;
    if (warehouse_id != null && warehouse_id !== "") requestParams.warehouse_id = warehouse_id;
    if (currency_id != null && currency_id !== "") requestParams.currency_id = currency_id;

    const response = await api.get(getApiEndpoint("STOCK_LIST"), {
      params: requestParams,
    });

    const data = response.data || response;
    const res = data.result || data;

    // Check if response has error status (JSON-RPC format)
    if (data.result && data.result.status === 'error') {
      throw new Error(data.result.message || 'Failed to fetch stock list');
    }
    if (data.status === "error") {
      throw new Error(data.message || "Failed to fetch stock list");
    }

    // Return full response with pagination metadata (support flat and nested result)
    if (data.status === "success" || (res && res.status === "success")) {
      const list = Array.isArray(data.stock_list) ? data.stock_list : (Array.isArray(res?.stock_list) ? res.stock_list : []);
      return {
        stock_list: list,
        count: data.count ?? res?.count ?? 0,
        total_count: data.total_count ?? res?.total_count ?? 0,
        page: data.page ?? res?.page ?? page,
        page_size: data.page_size ?? res?.page_size ?? page_size,
        total_pages: data.total_pages ?? res?.total_pages ?? 0,
        has_next: data.has_next ?? res?.has_next ?? false,
        has_previous: data.has_previous ?? res?.has_previous ?? false,
        sort_by: data.sort_by ?? res?.sort_by ?? sort_by,
        sort_order: data.sort_order ?? res?.sort_order ?? sort_order,
      };
    }

    // Fallback for non-standard response format
    const stockList = Array.isArray(data.stock_list)
      ? data.stock_list
      : Array.isArray(data)
        ? data
        : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.data)
            ? data.data
            : [];

    return {
      stock_list: stockList,
      count: stockList.length,
      total_count: stockList.length,
      page: page,
      page_size: page_size,
      total_pages: 1,
      has_next: false,
      has_previous: false,
      sort_by: sort_by,
      sort_order: sort_order,
    };
  } catch (error) {
    console.error("Get stock list error:", error);
    handleApiError(error, "Get stock list");
    throw error;
  }
};

// Update stock item(s) - accepts payload with lines array
// stockId can be a single ID or array of IDs for bulk updates
export const updateStockItemApi = async (stockId, stockData = {}) => {
  try {
    // If stockData is already in lines format, use it directly
    // Otherwise, wrap single item in lines array
    const payload = stockData.lines ? stockData : { lines: [stockData] };

    const response = await api.post(
      getApiEndpoint("STOCK_UPDATE"),
      payload
    );

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to update stock item');
    }

    return response.data;
  } catch (error) {
    console.error("Update stock item error:", error);
    handleApiError(error, "Update stock item");
  }
};

// Get single stock item by ID
export const getStockItemByIdApi = async (stockId) => {
  try {
    const response = await api.get(`${getApiEndpoint("STOCK_LIST")}/${stockId}`);

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch stock item');
    }

    return response.data;
  } catch (error) {
    console.error("Get stock item error:", error);
    handleApiError(error, "Get stock item");
  }
};

// Create stock item(s) - accepts payload with lines array
export const createStockItemApi = async (stockData) => {
  try {
    // If stockData is already in lines format, use it directly
    // Otherwise, wrap single item in lines array
    const payload = stockData.lines ? stockData : { lines: [stockData] };

    const response = await api.post(getApiEndpoint("STOCK_CREATE"), payload);

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to create stock item');
    }

    // Check for errors in the result even if status is "success"
    // API can return status: "success" but still have errors in errors array
    if (response.data.result) {
      const result = response.data.result;
      
      // Check if there are errors (error_count > 0 or errors array has items)
      if ((result.error_count && result.error_count > 0) || 
          (result.errors && Array.isArray(result.errors) && result.errors.length > 0)) {
        
        // Extract error messages from errors array
        const errorMessages = result.errors
          ? result.errors.map(err => err.message || `${err.field}: ${err.message || 'Unknown error'}`).join('; ')
          : result.message || 'Failed to create stock item';
        
        throw new Error(errorMessages);
      }
    }

    return response.data;
  } catch (error) {
    console.error("Create stock item error:", error);
    handleApiError(error, "Create stock item");
  }
};

// Delete stock item
export const deleteStockItemApi = async (stockId) => {
  try {
    const response = await api.post(getApiEndpoint("STOCK_DELETE"), {
      stock_id: stockId,
      id: stockId,
    });

    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to delete stock item');
    }

    return response.data;
  } catch (error) {
    console.error("Delete stock item error:", error);
    handleApiError(error, "Delete stock item");
  }
};

// Get stock item attachments
export const getStockItemAttachmentsApi = async (stockId) => {
  try {
    // Request binary data for file attachments
    const response = await api.get(`${getApiEndpoint("STOCK_LIST")}/${stockId}/attachments`, {
      responseType: 'blob', // Get binary data
    });

    // If response is JSON (error or metadata), parse it
    if (response.data instanceof Blob && response.data.type === 'application/json') {
      const text = await response.data.text();
      const jsonData = JSON.parse(text);
      
      // Check if response has error status (JSON-RPC format)
      if (jsonData.result && jsonData.result.status === 'error') {
        throw new Error(jsonData.result.message || 'Failed to fetch attachments');
      }
      
      return jsonData;
    }

    // If response is a file (binary), return it as blob
    return {
      data: response.data,
      type: response.headers['content-type'] || 'application/octet-stream',
    };
  } catch (error) {
    // If blob parsing fails, try as JSON
    if (error.response && error.response.data) {
      try {
        // If error response is JSON, parse it
        if (error.response.data instanceof Blob && error.response.data.type === 'application/json') {
          const text = await error.response.data.text();
          const jsonData = JSON.parse(text);
          if (jsonData.result && jsonData.result.status === 'error') {
            throw new Error(jsonData.result.message || 'Failed to fetch attachments');
          }
        }
      } catch (parseError) {
        // Ignore parse errors, use original error
      }
    }
    console.error("Get stock item attachments error:", error);
    handleApiError(error, "Get stock item attachments");
  }
};

// Download stock item attachment (for viewing or force download)
export const downloadStockItemAttachmentApi = async (stockId, attachmentId, forceDownload = false) => {
  try {
    const url = `${getApiEndpoint("STOCK_LIST")}/${stockId}/attachment/${attachmentId}/download${forceDownload ? '?download=true' : ''}`;
    const response = await api.get(url, {
      responseType: 'blob', // Get binary data
    });

    // If response is JSON (error or metadata), parse it
    if (response.data instanceof Blob && response.data.type === 'application/json') {
      const text = await response.data.text();
      const jsonData = JSON.parse(text);
      
      // Check if response has error status (JSON-RPC format)
      if (jsonData.result && jsonData.result.status === 'error') {
        throw new Error(jsonData.result.message || 'Failed to download attachment');
      }
      
      return jsonData;
    }

    // If response is a file (binary), return it as blob
    return {
      data: response.data,
      type: response.headers['content-type'] || 'application/octet-stream',
      filename: response.headers['content-disposition'] 
        ? response.headers['content-disposition'].match(/filename="?(.+)"?/)?.[1] 
        : null,
    };
  } catch (error) {
    // If blob parsing fails, try as JSON
    if (error.response && error.response.data) {
      try {
        // If error response is JSON, parse it
        if (error.response.data instanceof Blob && error.response.data.type === 'application/json') {
          const text = await error.response.data.text();
          const jsonData = JSON.parse(text);
          if (jsonData.result && jsonData.result.status === 'error') {
            throw new Error(jsonData.result.message || 'Failed to download attachment');
          }
        }
      } catch (parseError) {
        // Ignore parse errors, use original error
      }
    }
    console.error("Download stock item attachment error:", error);
    handleApiError(error, "Download stock item attachment");
  }
};
