// Customer API functions
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

// Register Customer API
export const registerCustomerApi = async (customerData) => {
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

    // Add user_id to customer data
    const payload = {
      ...customerData,
      user_id: userId,
    };

    const response = await api.post(
      getApiEndpoint("CUSTOMER_REGISTER"),
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
    console.error("Register customer error:", error);
    handleApiError(error, "Register customer");
  }
};

// Get Customers API
export const getCustomersApi = async () => {
  try {
    const response = await api.get(getApiEndpoint("CUSTOMERS"));
    
    // Check if response has error status (JSON-RPC format)
    if (response.data.result && response.data.result.status === 'error') {
      throw new Error(response.data.result.message || 'Failed to fetch customers');
    }
    
    return response.data;
  } catch (error) {
    console.error("Get customers error:", error);
    handleApiError(error, "Get customers");
  }
};

// Update Customer API
export const updateCustomerApi = async (customerId, data) => {
  try {
    const response = await api.post(
      `${getApiEndpoint("CUSTOMER_UPDATE")}/${customerId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Update customer error:", error);
    handleApiError(error, "Update customer");
  }
};

// Delete Customer API
export const deleteCustomerApi = async (customerId) => {
  try {
    const response = await api.delete(
      `${getApiEndpoint("CUSTOMER_DELETE")}/${customerId}`
    );
    return response.data;
  } catch (error) {
    console.error("Delete customer error:", error);
    handleApiError(error, "Delete customer");
  }
};
