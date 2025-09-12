// API Configuration

// Simple and clean API configuration
export const API_CONFIG = {
  // Base URL for all API calls
  BASE_URL:
    process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_URL,

  // API Endpoints - only include what actually exists in the backend
  ENDPOINTS: {
    LOGIN: "/api/login",
    FORGOT_PASSWORD: "/api/forgot_password",
    SIGNUP: "/api/signup",
    COUNTRIES: "/api/countries",
    CUSTOMERS: "/api/customers",
    CUSTOMER_REGISTER: "/api/customer/register",
    CUSTOMER_UPDATE: "/api/customer/update",
    CUSTOMER_DELETE: "/api/customer/delete",
    VENDOR_REGISTER: "/api/vendor/register",
    VENDOR_UPDATE: "/api/vendor/update",
    VENDOR_DELETE: "/api/vendor/delete",
    VENDORS: "/api/vendor/list",
    // Stock list endpoints
    STOCK_LIST: "/api/stock/list",
    STOCK_UPDATE: "/api/stock/list/update",
    // Product endpoints
    PRODUCTS: "/api/products",
    PRODUCT_CREATE: "/api/product/create",
    PRODUCT_UPDATE: "/api/product/update",
    PRODUCT_DELETE: "/api/product/delete",
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
