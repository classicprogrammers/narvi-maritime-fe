// Auth API functions for Odoo backend server
import { buildApiUrl, getApiEndpoint, API_CONFIG } from "../config/api";

// Import the global modal system
import { showApiModal } from "../components/ApiModal";

const API_BASE_URL = API_CONFIG.BASE_URL;

// Test API connection
export const testApiConnection = async () => {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "GET",
      headers: API_CONFIG.DEFAULT_HEADERS,
    });

    if (response.ok) {
      // Show success modal
      showApiModal("success", "Connection Test", "API connection successful!");
      return { success: true, message: "API connection successful" };
    } else {
      // Show error modal
      showApiModal("error", "Connection Test Failed", "API connection failed");
      return { success: false, message: "API connection failed" };
    }
  } catch (error) {
    console.error("API connection test failed:", error);
    // Show error modal
    showApiModal(
      "error",
      "Connection Test Failed",
      "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
    );
    return {
      success: false,
      message:
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.",
    };
  }
};

// Signup API
export const signupApi = async (data) => {
  try {
    const response = await fetch(buildApiUrl(getApiEndpoint("SIGNUP")), {
      method: "POST",
      headers: API_CONFIG.DEFAULT_HEADERS,
      body: JSON.stringify({
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        password: data.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Signup failed");
    }

    const result = await response.json();

    // Show success modal
    showApiModal(
      "success",
      "Signup Successful",
      "Account created successfully!"
    );

    return result;
  } catch (error) {
    console.error("Signup failed:", error);

    // Show error modal
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      showApiModal(
        "error",
        "Signup Failed",
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
      );
      throw new Error(
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
      );
    }

    showApiModal("error", "Signup Failed", error.message || "Signup failed");
    throw error;
  }
};

// Signin API - Using the simple /api/login endpoint
export const signinApi = async (data) => {
  try {
    const response = await fetch(buildApiUrl(getApiEndpoint("LOGIN")), {
      method: "POST",
      headers: API_CONFIG.DEFAULT_HEADERS,
      body: JSON.stringify({
        login: data.email,
        password: data.password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Login failed");
    }

    const result = await response.json();

    // Check if authentication was successful
    if (result.result && result.result.uid) {
      // Show success modal
      showApiModal(
        "success",
        "Login Successful",
        `Welcome back, ${result.result.name || data.email}!`
      );

      return {
        success: true,
        user: {
          id: result.result.uid,
          email: data.email,
          name: result.result.name || data.email,
          role: "user",
          avatar: null,
          permissions: ["read"],
          createdAt: new Date().toISOString(),
        },
        token: result.result.session_id || "session_token",
      };
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    console.error("Login failed:", error);

    // Show error modal
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      showApiModal(
        "error",
        "Login Failed",
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
      );
      throw new Error(
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
      );
    }

    showApiModal("error", "Login Failed", error.message || "Login failed");
    throw error;
  }
};

// Forgot Password API - Using the simple /api/forgot_password endpoint
export const forgotPasswordApi = async (data) => {
  try {
    // Now try the password reset
    const response = await fetch(
      buildApiUrl(getApiEndpoint("FORGOT_PASSWORD")),
      {
        method: "POST",
        headers: API_CONFIG.DEFAULT_HEADERS,
        mode: "cors", // Enable CORS
        credentials: "include", // Include cookies if needed
        body: JSON.stringify({
          email: data.email,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Password reset request failed");
    }

    const result = await response.json();

    // Show success modal
    showApiModal(
      "success",
      "Password Reset",
      "Password reset email sent successfully. Please check your inbox."
    );

    // For now, we'll assume success if we get a response
    // In a real implementation, you'd check the actual response structure
    return {
      success: true,
      message:
        "Password reset email sent successfully. Please check your inbox.",
    };
  } catch (error) {
    console.error("Password reset failed:", error);

    // Show error modal
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      showApiModal(
        "error",
        "Password Reset Failed",
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
      );
      throw new Error(
        "Cannot connect to backend server. Please check if the server is running and CORS is properly configured."
      );
    }

    showApiModal(
      "error",
      "Password Reset Failed",
      error.message || "Password reset request failed"
    );
    throw error;
  }
};
