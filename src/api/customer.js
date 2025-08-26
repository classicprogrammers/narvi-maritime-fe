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
      headers: API_CONFIG.DEFAULT_HEADERS,
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

    const response = await fetch(
      buildApiUrl(getApiEndpoint("CUSTOMER_REGISTER")),
      {
        method: "POST",
        headers: API_CONFIG.DEFAULT_HEADERS,
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

    return result;
  } catch (error) {
    handleApiError(error, "Register customer");
  }
};

// Get Customers API
export const getCustomersApi = async () => {
  try {
    const response = await fetch(buildApiUrl(getApiEndpoint("CUSTOMERS")), {
      method: "GET",
      headers: API_CONFIG.DEFAULT_HEADERS,
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
        headers: API_CONFIG.DEFAULT_HEADERS,
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
        headers: API_CONFIG.DEFAULT_HEADERS,
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
