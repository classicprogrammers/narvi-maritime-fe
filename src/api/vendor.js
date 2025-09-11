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

  // HTTP errors (4xx, 5xx)
  if (error.status) {
    errorMessage = `Backend error (${error.status}): ${error.message || "Unknown error occurred"
      }`;
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

    console.log("Vendor Registration API Payload:", payload);
    console.log("API URL:", buildApiUrl(getApiEndpoint("VENDOR_REGISTER")));

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
      throw new Error("Invalid response from server");
    }

    return result;
  } catch (error) {
    console.error("Register vendor error:", error);
    handleApiError(error, "Register vendor");
  }
};

// Get Vendors API
export const getVendorsApi = async () => {
  try {
    const response = await api.get(getApiEndpoint("VENDORS"));
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch vendors');
    }
    
    return response.data;
  } catch (error) {
    console.error("Get vendors error:", error);
    handleApiError(error, "Get vendors");
  }
};

// Update Vendor API
export const updateVendorApi = async (vendorId, data) => {
  try {
    const response = await api.post(
      `${getApiEndpoint("VENDOR_UPDATE")}/${vendorId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Update vendor error:", error);
    handleApiError(error, "Update vendor");
  }
};

// Delete Vendor API
export const deleteVendorApi = async (vendorId) => {
  try {
    const response = await api.delete(
      `${getApiEndpoint("VENDOR_DELETE")}/${vendorId}`
    );
    return response.data;
  } catch (error) {
    console.error("Delete vendor error:", error);
    handleApiError(error, "Delete vendor");
  }
};
