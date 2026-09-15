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
  forgotPasswordStart,
  forgotPasswordSuccess,
  forgotPasswordFailure,
  clearForgotPasswordState,
} from "../slices/userSlice";
import { clearCustomerState } from "../slices/customerSlice";
import { clearAgentState } from "../slices/vendorSlice";
import { clearStockState } from "../slices/stockSlice";
import { clearShippingOrdersState } from "../slices/shippingOrdersSlice";
import { clearMasterData } from "../../utils/masterDataCache";
import {
  getAuthContextFromPath,
  getStoredAuth,
} from "../../utils/authStorage";

// Async action for login
export const loginUser = (email, password) => async (dispatch) => {
  try {
    dispatch(loginStart());

    // Since the API call is now handled in the component,
    // we just need to simulate a successful login for Redux state management
    const mockUser = {
      id: Date.now(),
      email: email,
      name: email.split('@')[0],
      role: "user",
      avatar: null,
      permissions: ["read"],
      createdAt: new Date().toISOString(),
    };

    const mockToken = "mock_token_" + Date.now();

    dispatch(
      loginSuccess({
        user: mockUser,
        token: mockToken,
      })
    );

    return { success: true, user: mockUser };
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

    // Since the API call is now handled in the component,
    // we just need to simulate a successful signup for Redux state management
    const mockUser = {
      id: Date.now(),
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`,
      role: "user",
      avatar: null,
      permissions: ["read"],
      createdAt: new Date().toISOString(),
    };

    dispatch(signupSuccess());
    return { success: true, data: { user: mockUser } };
  } catch (error) {
    const errorMessage = error.message || "Signup failed";
    dispatch(signupFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Action for logout - clear all Redux state and caches except user/token (which logout clears)
export const logoutUser = () => (dispatch) => {
  const context = getAuthContextFromPath();
  clearMasterData();
  dispatch(clearCustomerState());
  dispatch(clearAgentState());
  dispatch(clearStockState());
  dispatch(clearShippingOrdersState());
  dispatch(logout({ context }));
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
  const context = getAuthContextFromPath();
  const { token, user } = getStoredAuth(context);

  if (token && user?.id) {
    dispatch(checkAuth({ token, user, context }));
    return;
  }

  // Clear in-memory auth for this panel only. Leave the other panel's session intact.
  dispatch(checkAuth({ token: null, user: null }));
};

// Action for password reset
export const resetPassword = (email) => async (dispatch) => {
  try {
    dispatch(forgotPasswordStart());

    // Since the API call is now handled in the component,
    // we just need to simulate a successful password reset for Redux state management
    dispatch(forgotPasswordSuccess());
    return {
      success: true,
      message: "Password reset email sent successfully",
    };
  } catch (error) {
    const errorMessage = error.message || "Failed to send password reset email";
    dispatch(forgotPasswordFailure(errorMessage));
    return { success: false, error: errorMessage };
  }
};

// Action to clear forgot password state
export const clearForgotPassword = () => (dispatch) => {
  dispatch(clearForgotPasswordState());
};
