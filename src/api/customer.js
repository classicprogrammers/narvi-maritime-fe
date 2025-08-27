// Customer API functions
import { buildApiUrl, getApiEndpoint, API_CONFIG } from "../config/api";

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
    errorMessage = `Backend error (${error.status}): ${
      error.message || "Unknown error occurred"
    }`;
  }

  // Show error modal
  showApiModal("error", `${operation} Failed`, errorMessage);

  throw new Error(errorMessage);
};

// Get Countries API
export const getCountriesApi = async () => {
  try {
    const response = await fetch(buildApiUrl(getApiEndpoint("COUNTRIES")), {
      method: "GET",
      headers: {
        ...API_CONFIG.DEFAULT_HEADERS,
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    return result;
  } catch (error) {
    console.error("Get countries error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    handleApiError(error, "Get countries");
  }
};

// Register Customer API
export const registerCustomerApi = async (customerData) => {
  try {
    // Ensure API_CONFIG is initialized
    if (!API_CONFIG || !API_CONFIG.DEFAULT_HEADERS) {
      throw new Error(
        "API configuration not initialized. Please refresh the page."
      );
    }

    // Get user token from localStorage for authentication
    const userToken = localStorage.getItem("token");

    // Create headers with or without authentication token
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-User-Token",
    };

    // Add authentication if token exists
    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
      headers["X-User-Token"] = userToken;
    }

    const response = await fetch(
      buildApiUrl(getApiEndpoint("CUSTOMER_REGISTER")),
      {
        method: "POST",
        headers: headers,
        mode: "cors",
        body: JSON.stringify(customerData),
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

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
    console.error("Register customer error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    handleApiError(error, "Register customer");
  }
};

// Get Customers API
export const getCustomersApi = async () => {
  try {
    // Get user token from localStorage for authentication
    const userToken = localStorage.getItem("token");

    // Create headers with or without authentication token
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
    };

    // Add authentication if token exists
    if (userToken) {
      headers.Authorization = `Bearer ${userToken}`;
      headers["X-User-Token"] = userToken;
    }

    // Try to fetch customers
    const response = await fetch(buildApiUrl(getApiEndpoint("CUSTOMERS")), {
      method: "GET",
      headers: headers,
      mode: "cors",
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    return result;
  } catch (error) {
    console.error("Get customers error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    handleApiError(error, "Get customers");
  }
};

// Update Customer API
export const updateCustomerApi = async (customerId, data) => {
  try {
    const response = await fetch(
      buildApiUrl(`${getApiEndpoint("CUSTOMER_UPDATE")}/${customerId}`),
      {
        method: "PUT",
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-User-Token",
        },
        mode: "cors",
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      error.status = response.status;
      throw error;
    }

    const result = await response.json();

    return result;
  } catch (error) {
    console.error("Update customer error details:", error);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    handleApiError(error, "Update customer");
  }
};

// Delete Customer API
export const deleteCustomerApi = async (customerId) => {
  try {
    const response = await fetch(
      buildApiUrl(`${getApiEndpoint("CUSTOMER_DELETE")}/${customerId}`),
      {
        method: "DELETE",
        headers: {
          ...API_CONFIG.DEFAULT_HEADERS,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-User-Token",
        },
        mode: "cors",
      }
    );

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
      throw error;
    }

    const result = await response.json();

    return result;
  } catch (error) {
    handleApiError(error, "Delete customer");
  }
};
