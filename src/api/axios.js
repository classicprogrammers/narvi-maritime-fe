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
    // Commented out Bearer token injection - making simple API calls without auth
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

      // Check for JSON-RPC format
      if (responseData.result && responseData.result.message === "Invalid token") {
        // Clear authentication state
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login page
        window.location.href = '/auth/sign-in';
        return Promise.reject(error);
      }

      // Check for direct format
      if (responseData.message === "Invalid token") {
        // Clear authentication state
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login page
        window.location.href = '/auth/sign-in';
        return Promise.reject(error);
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
