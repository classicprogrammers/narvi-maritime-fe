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
    CUSTOMERS_OPTIONS: "/api/customers/options",
    CUSTOMER_REGISTER: "/api/customer/register",
    CUSTOMER_UPDATE: "/api/customer/update",
    CUSTOMER_DELETE: "/api/customer/delete",
    VENDOR_REGISTER: "/api/agent/register",
    VENDOR_UPDATE: "/api/agent/update",
    VENDOR_DELETE: "/api/vendor/delete",
    VENDORS: "/api/agents",
    // Stock list endpoints
    STOCK_LIST: "/api/stock/list",
    STOCK_LIST_OPTIONS: "/api/stock/list/options",
    STOCK_CREATE: "/api/stock/list/create",
    STOCK_UPDATE: "/api/stock/list/update",
    STOCK_DELETE: "/api/stock/list/delete",
    // Product endpoints
    PRODUCTS: "/api/products",
    PRODUCT_CREATE: "/api/product/create",
    PRODUCT_UPDATE: "/api/product/update",
    PRODUCT_DELETE: "/api/product/delete",
    // Shipping order endpoints
    SHIPPING_ORDERS: "/api/shipping/orders",
    SHIPPING_ORDER: "/api/shipping/order",
    SHIPPING_ORDER_CREATE: "/api/create/shipping/order",
    SHIPPING_ORDER_UPDATE: "/api/shipping/order/update",
    SHIPPING_ORDER_PACKAGE_CHECK: "/api/shipping/order/package/check",
    SHIPPING_ORDER_PACKAGE_MERGE: "/api/shipping/order/package/merge",
    // Carbon calculator
    CARBON_EMISSION_FACTORS: "/api/carbon/emission-factors",
    CARBON_EMISSION_FACTORS_UPDATE: "/api/carbon/emission-factors/update",
    CARBON_STOCK_EMISSIONS: "/api/carbon/stock-emissions",
    CARBON_CALCULATE: "/api/carbon/calculate",
  },

  // Request timeout in milliseconds
  TIMEOUT: 60000,

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
