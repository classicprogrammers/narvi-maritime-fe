// API Configuration
import { getBackendUrl } from "./backend";

// Ensure proper initialization order
const initializeApiConfig = () => {
  try {
    return {
      // Base URL for all API calls
      BASE_URL: process.env.REACT_APP_API_BASE_URL || getBackendUrl(),

      // API Endpoints
      ENDPOINTS: {
        LOGIN: "/api/login",
        FORGOT_PASSWORD: "/api/forgot_password",
        SIGNUP: "/api/signup",
        COUNTRIES: "/api/countries",
        CUSTOMERS: "/api/customers",
        CUSTOMER_REGISTER: "/api/customer/register",
        CUSTOMER_UPDATE: "/api/customer/update",
        CUSTOMER_DELETE: "/api/customer/delete",
      },

      // Request timeout in milliseconds
      TIMEOUT: 30000,

      // Default headers
      DEFAULT_HEADERS: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
  } catch (error) {
    console.error("Failed to initialize API config:", error);
    // Fallback configuration
    return {
      BASE_URL: "http://localhost:8069",
      ENDPOINTS: {
        LOGIN: "/api/login",
        FORGOT_PASSWORD: "/api/forgot_password",
        SIGNUP: "/api/signup",
        COUNTRIES: "/api/countries",
        CUSTOMERS: "/api/customers",
        CUSTOMER_REGISTER: "/api/customer/register",
        CUSTOMER_UPDATE: "/api/customer/update",
        CUSTOMER_DELETE: "/api/customer/delete",
      },
      TIMEOUT: 30000,
      DEFAULT_HEADERS: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };
  }
};

export const API_CONFIG = initializeApiConfig();

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  if (!API_CONFIG || !API_CONFIG.BASE_URL) {
    throw new Error(
      "API_CONFIG not initialized. Please check your configuration."
    );
  }
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get API endpoint
export const getApiEndpoint = (key) => {
  if (!API_CONFIG || !API_CONFIG.ENDPOINTS) {
    throw new Error(
      "API_CONFIG not initialized. Please check your configuration."
    );
  }
  return API_CONFIG.ENDPOINTS[key] || key;
};
