// Vendor API functions
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

// Get Countries API
export const getCountriesApi = async () => {
  try {
    const response = await api.get(getApiEndpoint("COUNTRIES"));
    return response.data;
  } catch (error) {
    console.error("Get countries error:", error);
    handleApiError(error, "Get countries");
  }
};

// Register Vendor API
export const registerVendorApi = async (vendorData) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    // Add user_id to vendor data
    const payload = {
      ...vendorData,
      user_id: userId,
    };

    const response = await api.post(
      getApiEndpoint("VENDOR_REGISTER"),
      payload
    );
    const result = response.data;


    // Check if the JSON-RPC response indicates an error
    if (result.result && result.result.status === "error") {
      throw new Error(result.result.message || "Registration failed");
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      console.error("Invalid response structure:", result);
      throw new Error("Invalid response from server");
    }

    return result;
  } catch (error) {
    console.error("Register vendor error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Get Vendors API
export const getVendorsApi = async () => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    // Add user_id as query parameter
    const url = userId ? `${getApiEndpoint("VENDORS")}?user_id=${userId}` : getApiEndpoint("VENDORS");
        
    const response = await api.get(url);
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch vendors');
    }
    
    return response.data;
  } catch (error) {
    console.error("Get vendors error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Get Vendor by ID API
export const getVendorByIdApi = async (vendorId) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }
    
    // Try different endpoint patterns with user_id
    const endpoints = [
      `${getApiEndpoint("VENDORS")}/${vendorId}${userId ? `?user_id=${userId}` : ''}`,
      `/api/vendor/get/${vendorId}${userId ? `?user_id=${userId}` : ''}`,
      `/api/vendor/${vendorId}${userId ? `?user_id=${userId}` : ''}`,
      `${getApiEndpoint("VENDORS")}?id=${vendorId}${userId ? `&user_id=${userId}` : ''}`
    ];
    
    let response;
    let lastError;
    
    for (const endpoint of endpoints) {
      try {
        response = await api.get(endpoint);
        break; // If successful, break out of the loop
      } catch (err) {
        lastError = err;
        continue; // Try next endpoint
      }
    }
    
    if (!response) {
      throw lastError || new Error("All endpoints failed");
    }
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch vendor');
    }
    
    return response.data;
  } catch (error) {
    console.error("Get vendor by ID error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Update Vendor API
export const updateVendorApi = async (vendorId, data) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    // Add vendor_id and user_id to the request body
    const payload = {
      ...data,
      vendor_id: vendorId,
      user_id: userId
    };

    const response = await api.post(
      getApiEndpoint("VENDOR_UPDATE"),
      payload
    );
    const result = response.data;


    // Check if the JSON-RPC response indicates an error
    if (result.result && result.result.status === "error") {
      throw new Error(result.result.message || "Update failed");
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      console.error("Invalid response structure:", result);
      throw new Error("Invalid response from server");
    }

    console.log("Vendor update successful:", result);
    return result;
  } catch (error) {
    console.error("Update vendor error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};

// Delete Vendor API
export const deleteVendorApi = async (vendorId) => {
  try {
    // Get user ID from localStorage
    const userData = localStorage.getItem("user");
    let userId = null;

    if (userData) {
      try {
        const user = JSON.parse(userData);
        userId = user.id;
      } catch (parseError) {
        console.warn(
          "Failed to parse user data from localStorage:",
          parseError
        );
      }
    }

    // Add vendor_id and user_id to the request body
    const payload = {
      vendor_id: vendorId,
      user_id: userId
    };

    const response = await api.post(
      getApiEndpoint("VENDOR_DELETE"),
      payload
    );
    const result = response.data;


    // Check if the JSON-RPC response indicates an error
    if (result.result && result.result.status === "error") {
      throw new Error(result.result.message || "Delete failed");
    }

    // Check if the response has the expected structure
    if (!result.result || result.result.status !== "success") {
      console.error("Invalid response structure:", result);
      throw new Error("Invalid response from server");
    }

    console.log("Vendor delete successful:", result);
    return result;
  } catch (error) {
    console.error("Delete vendor error:", error);
    // Don't show modal here, let the component handle it
    throw error;
  }
};
