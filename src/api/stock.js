// Stock API functions
import { buildApiUrl, getApiEndpoint, API_CONFIG } from "../config/api";
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

  // HTTP errors (4xx, 5xx)
  if (error.status) {
    errorMessage = `Backend error (${error.status}): ${error.message || "Unknown error occurred"
      }`;
  }

  // Show error modal
  showApiModal("error", `${operation} Failed`, errorMessage);

  throw new Error(errorMessage);
};

// Get stock list
export const getStockListApi = async () => {
  try {
    const response = await api.get(getApiEndpoint("STOCK_LIST"));
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch stock list');
    }
    
    return response.data;
  } catch (error) {
    console.error("Get stock list error:", error);
    handleApiError(error, "Get stock list");
  }
};

// Update stock item - only send changed parameters
export const updateStockItemApi = async (stockId, stockData, originalData = {}) => {
  try {
    // Helper function to check if a value has actually changed
    const hasChanged = (newValue, oldValue) => {
      // Handle null/undefined cases
      if (newValue === null || newValue === undefined) {
        return oldValue !== null && oldValue !== undefined;
      }
      if (oldValue === null || oldValue === undefined) {
        return newValue !== null && newValue !== undefined;
      }
      // For numbers, compare values
      if (typeof newValue === 'number' && typeof oldValue === 'number') {
        return newValue !== oldValue;
      }
      // For strings, trim and compare
      if (typeof newValue === 'string' && typeof oldValue === 'string') {
        return newValue.trim() !== oldValue.trim();
      }
      // For booleans, direct comparison
      if (typeof newValue === 'boolean' && typeof oldValue === 'boolean') {
        return newValue !== oldValue;
      }
      // For dates, compare ISO strings
      if (newValue instanceof Date && oldValue instanceof Date) {
        return newValue.toISOString() !== oldValue.toISOString();
      }
      // Default comparison
      return newValue !== oldValue;
    };

    // Build payload with only changed fields
    const payload = { id: stockId };
    const fieldsToCheck = [
      'client_id', 'vessel_id', 'supplier_id', 'extra', 'origin', 'destination',
      'warehouse_id', 'date_on_stock', 'exp_ready_in_stock', 'shipped_date',
      'delivered_date', 'weight_kg', 'length_cm', 'width_cm', 'height_cm',
      'volume_cbm', 'remarks', 'item_desc', 'pcs_count', 'submit_to_stockdb',
      'stock_status', 'value'
    ];

    fieldsToCheck.forEach(field => {
      if (hasChanged(stockData[field], originalData[field])) {
        payload[field] = stockData[field] !== undefined ? stockData[field] : null;
      }
    });

    // Only proceed if there are actual changes
    if (Object.keys(payload).length === 1) { // Only has 'id'
      console.log("No changes detected, skipping update");
      return { result: { status: 'success', message: 'No changes detected' } };
    }

    console.log("Stock Update API Payload (changed fields only):", payload);
    console.log("API URL:", getApiEndpoint("STOCK_UPDATE"));

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
