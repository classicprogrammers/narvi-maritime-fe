import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: localStorage.getItem("token") || null,
  signupLoading: false,
  signupError: null,
  forgotPasswordLoading: false,
  forgotPasswordError: null,
  forgotPasswordSuccess: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem("token", action.payload.token);
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
      localStorage.removeItem("token");
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
      state.error = null;
      state.signupLoading = false;
      state.signupError = null;
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = null;
      state.forgotPasswordSuccess = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    updateUser: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
      state.signupError = null;
      state.forgotPasswordError = null;
    },
    checkAuth: (state, action) => {
      if (action.payload.token && action.payload.user) {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      } else {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      }
    },
    signupStart: (state) => {
      state.signupLoading = true;
      state.signupError = null;
    },
    signupSuccess: (state) => {
      state.signupLoading = false;
      state.signupError = null;
    },
    signupFailure: (state, action) => {
      state.signupLoading = false;
      state.signupError = action.payload;
    },
    forgotPasswordStart: (state) => {
      state.forgotPasswordLoading = true;
      state.forgotPasswordError = null;
      state.forgotPasswordSuccess = false;
    },
    forgotPasswordSuccess: (state) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = null;
      state.forgotPasswordSuccess = true;
    },
    forgotPasswordFailure: (state, action) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = action.payload;
      state.forgotPasswordSuccess = false;
    },
    clearForgotPasswordState: (state) => {
      state.forgotPasswordLoading = false;
      state.forgotPasswordError = null;
      state.forgotPasswordSuccess = false;
    },
  },
});

export const {
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
} = userSlice.actions;

export default userSlice.reducer;
