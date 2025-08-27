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

    // Store user data in localStorage
    localStorage.setItem("user", JSON.stringify(mockUser));
    localStorage.setItem("token", mockToken);

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
      // Validate that we have both token and user data
      if (user && user.id) {
        dispatch(checkAuth({ token, user }));
      } else {
        // Invalid user data, clear everything
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        dispatch(logout());
      }
    } catch (error) {
      // If parsing fails, clear invalid data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      dispatch(logout());
    }
  } else {
    // No token or user data, ensure logged out state
    dispatch(logout());
  }
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
