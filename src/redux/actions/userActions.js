import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
  checkAuth,
  signupStart,
  signupSuccess,
  signupFailure,
} from "../slices/userSlice";
import { signupApi, signinApi, forgotPasswordApi } from "../../api/auth";

// Async action for login
export const loginUser = (email, password) => async (dispatch) => {
  try {
    dispatch(loginStart());

    // Call the real signin API
    const result = await signinApi({ email, password });

    // Store user data and token
    const userData = {
      id: result.user?.id || "1",
      email: email,
      name: result.user?.name || "User",
      role: result.user?.role || "user",
      avatar: null,
      permissions: result.user?.permissions || ["read"],
      createdAt: new Date().toISOString(),
    };

    const token = result.token || result.accessToken;

    dispatch(
      loginSuccess({
        user: userData,
        token: token,
      })
    );

    return { success: true, user: userData };
  } catch (error) {
    const errorMessage = error.message || "Login failed";
    dispatch(loginFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Async action for signup
export const signupUser = (userData) => async (dispatch) => {
  try {
    dispatch(signupStart());

    // Call the signup API
    const result = await signupApi(userData);

    dispatch(signupSuccess());
    return { success: true, data: result };
  } catch (error) {
    const errorMessage = error.message || "Signup failed";
    dispatch(signupFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Action for logout
export const logoutUser = () => (dispatch) => {
  dispatch(logout());
};

// Action to update user data
export const updateUserData = (userData) => (dispatch) => {
  dispatch(updateUser(userData));
};

// Action to clear error
export const clearUserError = () => (dispatch) => {
  dispatch(clearError());
};

// Action to check authentication status
export const checkUserAuth = () => (dispatch) => {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      dispatch(checkAuth({ token, user }));
    } catch (error) {
      // If parsing fails, clear invalid data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      dispatch(logout());
    }
  }
};

// Action for password reset
export const resetPassword = (email) => async (dispatch) => {
  try {
    // Call the real forgot password API
    const result = await forgotPasswordApi({ email });

    return {
      success: true,
      message: result.message || "Password reset email sent successfully",
    };
  } catch (error) {
    const errorMessage = error.message || "Failed to send password reset email";
    return { success: false, error: errorMessage };
  }
};
