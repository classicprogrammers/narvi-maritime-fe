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

// Update stock item - payload must include the same fields as the list items
export const updateStockItemApi = async (stockId, stockData = {}) => {
  try {
    const response = await api.post(
      getApiEndpoint("STOCK_UPDATE"),
      {
        stock_id: stockId,
        id: stockId,
        ...stockData,
      }
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

// Create stock item
export const createStockItemApi = async (stockData) => {
  try {
    const response = await api.post(getApiEndpoint("STOCK_CREATE"), stockData);
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to create stock item');
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
