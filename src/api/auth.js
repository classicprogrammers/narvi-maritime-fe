// Auth API functions for local backend server
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
console.log(API_BASE_URL);

// Signup API
export const signupApi = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors", // Enable CORS
      credentials: "include", // Include cookies if needed
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

    return await response.json();
  } catch (error) {
    console.error("Signup failed:", error);
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Cannot connect to backend server. Please check if the server is running on localhost:8060"
      );
    }
    throw error;
  }
};

// Signin API
export const signinApi = async (data) => {
  try {
    const response = await fetch(
      `http://13.61.187.51:8069/web?debug=1reload#cids=1&menu_id=30&action=17&model=ir.mail_server&view_type=form&id=1/api/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors", // Enable CORS
        credentials: "include", // Include cookies if needed
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Login failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Login failed:", error);
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Cannot connect to backend server. Please check if the server is running on localhost:8060"
      );
    }
    throw error;
  }
};

// Forgot Password API
export const forgotPasswordApi = async (data) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/forgot_password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors", // Enable CORS
      credentials: "include", // Include cookies if needed
      body: JSON.stringify({
        email: data.email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Request failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Password reset failed:", error);
    if (
      error.name === "TypeError" &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Cannot connect to backend server. Please check if the server is running on localhost:8060"
      );
    }
    throw error;
  }
};
