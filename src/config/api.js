// API Configuration

// Simple and clean API configuration
export const API_CONFIG = {
  // Base URL for all API calls
  BASE_URL:
    process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL,

  // API Endpoints - only include what actually exists in the backend
  ENDPOINTS: {
    LOGIN: "/login",
    FORGOT_PASSWORD: "/forgot_password",
    SIGNUP: "/signup",
    COUNTRIES: "/countries",
    CUSTOMERS: "/customers",
    CUSTOMER_REGISTER: "/customer/register",
    CUSTOMER_UPDATE: "/customer/update",
    CUSTOMER_DELETE: "/customer/delete",
    VENDOR_REGISTER: "/vendor/register",
    VENDOR_UPDATE: "/vendor/update",
    VENDOR_DELETE: "/vendor/delete",
    VENDORS: "/vendor/list",
    // Stock list endpoints
    STOCK_LIST: "/stock/list",
    STOCK_UPDATE: "/stock/list/update",
    // Product endpoints
    PRODUCTS: "/products",
    PRODUCT_CREATE: "/product/create",
    PRODUCT_UPDATE: "/product/update",
    PRODUCT_DELETE: "/product/delete",
  },

  // Request timeout in milliseconds
  TIMEOUT: 30000,

  // Default headers
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  },
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  if (!API_CONFIG.BASE_URL) {
    throw new Error("API base URL not configured");
  }
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get API endpoint
export const getApiEndpoint = (key) => {
  return API_CONFIG.ENDPOINTS[key] || key;
};
