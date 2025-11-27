import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      // Validate token format before sending
      if (token && token.trim() !== '') {
        // Standard Bearer header
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn("Empty or invalid token found, not adding to request:", config.url);
      }
    } else {
      console.warn("No token found in localStorage for request:", config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data);

      // Check for authentication errors
      const responseData = error.response.data;
      const status = error.response.status;

      // Only logout for specific authentication errors, not all 401/403 errors
      const shouldLogout = 
        // Check for JSON-RPC format with specific auth error messages
        (responseData.result && responseData.result.message === "Invalid token") ||
        (responseData.result && responseData.result.message === "Token expired") ||
        (responseData.result && responseData.result.message === "Unauthorized") ||
        (responseData.result && responseData.result.message === "Authentication failed") ||
        // Check for direct format with specific auth error messages
        (responseData.message === "Invalid token") ||
        (responseData.message === "Token expired") ||
        (responseData.message === "Unauthorized") ||
        (responseData.message === "Authentication failed") ||
        // Check for 401 status with specific error messages
        (status === 401 && responseData.message && responseData.message.includes("token")) ||
        (status === 401 && responseData.message && responseData.message.includes("auth")) ||
        // Check for 403 status with specific error messages
        (status === 403 && responseData.message && responseData.message.includes("token")) ||
        (status === 403 && responseData.message && responseData.message.includes("auth"));

      if (shouldLogout) {
        console.log("Authentication error detected, logging out user");
        // Clear authentication state
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login page
        window.location.href = '/auth/sign-in';
        return Promise.reject(error);
      } else {
        // Log the error but don't logout for other types of errors
        console.log("API error occurred but not logging out:", {
          status,
          message: responseData.message || responseData.result?.message,
          data: responseData,
          url: error.config?.url,
          method: error.config?.method
        });
        
        // Special handling for quotation and rate list APIs
        if (error.config?.url?.includes('/api/quotations') || 
            error.config?.url?.includes('/api/products') || 
            error.config?.url?.includes('/api/agents')) {
          console.log("Quotation/Rate List API error - this should not cause logout:", {
            url: error.config.url,
            status,
            message: responseData.message || responseData.result?.message
          });
        }
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error("Network Error:", error.request);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;