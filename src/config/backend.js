// Import the global modal system
import { showApiModal } from "../components/ApiModal";

// Backend Configuration
// Main backend URL from environment or fallback
const MAIN_BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://13.61.187.51:8069";

export const BACKEND_CONFIG = {
  // Current backend URL from environment
  CURRENT_URL: MAIN_BACKEND_URL,

  // Alternative URLs you can try:
  ALTERNATIVE_URLS: [
    MAIN_BACKEND_URL,
    "http://3.6.118.75:8069",
    "http://localhost:8069",
    "http://127.0.0.1:8069",
  ],

  // Instructions
  INSTRUCTIONS: `
    To fix the backend connection:
    1. Make sure your backend server is running
    2. Fix CORS configuration in your backend
    3. Update the CURRENT_URL above to match your backend
    4. Restart the frontend application
  `,
};

// Function to get current backend URL
export const getBackendUrl = () => {
  return BACKEND_CONFIG.CURRENT_URL;
};

// Function to test backend connectivity
export const testBackendConnection = async () => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/customers`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      // Show success modal
      showApiModal(
        "success",
        "Connection Test",
        "Backend connection successful!"
      );
      return { success: true, message: "Backend connection successful" };
    } else {
      // Show error modal
      showApiModal(
        "error",
        "Connection Test Failed",
        `Backend responded with status: ${response.status}`
      );
      return {
        success: false,
        message: `Backend responded with status: ${response.status}`,
      };
    }
  } catch (error) {
    // Show error modal
    showApiModal(
      "error",
      "Connection Test Failed",
      `Connection failed: ${error.message}`
    );
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      error: error,
    };
  }
};

// Function to test countries API specifically
export const testCountriesApi = async () => {
  try {
    const response = await fetch(`${getBackendUrl()}/api/countries`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      // Show success modal
      showApiModal(
        "success",
        "Countries API Test",
        `Countries API working! Found ${
          data.countries?.length || data.length || 0
        } countries`
      );
      return {
        success: true,
        message: `Countries API working! Found ${
          data.countries?.length || data.length || 0
        } countries`,
      };
    } else {
      // Show error modal
      showApiModal(
        "error",
        "Countries API Test Failed",
        `Countries API responded with status: ${response.status}`
      );
      return {
        success: false,
        message: `Countries API responded with status: ${response.status}`,
      };
    }
  } catch (error) {
    // Show error modal
    showApiModal(
      "error",
      "Countries API Test Failed",
      `Countries API failed: ${error.message}`
    );
    return {
      success: false,
      message: `Countries API failed: ${error.message}`,
      error: error,
    };
  }
};
