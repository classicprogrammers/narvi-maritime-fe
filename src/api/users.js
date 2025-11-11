// Users API functions
import api from "./axios";
import { getApiEndpoint } from "../config/api";
import { showApiModal } from "../components/ApiModal";

// Helper to standardize error handling and surface modal
const handleApiError = (error, operation) => {
  console.error(`${operation} failed:`, error);

  let errorMessage = error.message || `Failed to ${operation.toLowerCase()}`;

  if (error.name === "TypeError" && error.message.includes("Failed to fetch")) {
    errorMessage =
      "Cannot connect to backend server. Please check if the server is running and CORS is properly configured.";
  }

  if (error.response) {
    const responseData = error.response.data;

    if (responseData && responseData.result && responseData.result.status === "error") {
      errorMessage = responseData.result.message || errorMessage;
    } else if (responseData && responseData.message) {
      errorMessage = responseData.message;
    } else if (responseData && responseData.error) {
      errorMessage = responseData.error;
    } else {
      errorMessage = `Backend error (${error.response.status}): ${errorMessage}`;
    }
  }

  showApiModal("error", `${operation} Failed`, errorMessage);
  throw new Error(errorMessage);
};

// GET /api/list/users
export const listUsersApi = async () => {
  try {
    const res = await api.get("/api/list/users");
    return res.data;
  } catch (error) {
    return handleApiError(error, "Fetch Users");
  }
};

// POST /api/signup
export const signupUserApi = async (payload) => {
  try {
    const res = await api.post("/api/signup", payload);
    return res.data;
  } catch (error) {
    return handleApiError(error, "Create User");
  }
};

// POST /api/users/update
export const updateUserApi = async (payload) => {
  try {
    const res = await api.post("/api/users/update", payload);
    return res.data;
  } catch (error) {
    return handleApiError(error, "Update User");
  }
};

// POST forgot password email
export const forgotPasswordApi = async (email) => {
  try {
    const res = await api.post(getApiEndpoint("FORGOT_PASSWORD"), { email });
    return res.data;
  } catch (error) {
    return handleApiError(error, "Forgot Password");
  }
};


