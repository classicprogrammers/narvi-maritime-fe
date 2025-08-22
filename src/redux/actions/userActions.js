import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
  checkAuth
} from '../slices/userSlice';

// Async action for login
export const loginUser = (email, password) => (dispatch) => {
  return new Promise((resolve, reject) => {
    try {
      dispatch(loginStart());
      
      // Mock validation
      if (!email || !password) {
        const error = 'Email and password are required';
        dispatch(loginFailure(error));
        resolve({ success: false, error });
        return;
      }
      
      // Simulate API delay
      setTimeout(() => {
        try {
          // For now, let's simulate a successful login with mock data
          // In production, this would come from your API
          const mockUserData = {
            id: '1',
            email: email,
            name: 'Admin User',
            role: 'admin',
            avatar: null,
            permissions: ['read', 'write', 'admin'],
            createdAt: new Date().toISOString(),
          };

          const mockToken = 'mock-jwt-token-' + Date.now();

          dispatch(loginSuccess({
            user: mockUserData,
            token: mockToken,
          }));

          resolve({ success: true, user: mockUserData });
        } catch (error) {
          dispatch(loginFailure(error.message));
          resolve({ success: false, error: error.message });
        }
      }, 1000);
    } catch (error) {
      dispatch(loginFailure(error.message));
      resolve({ success: false, error: error.message });
    }
  });
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
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      dispatch(checkAuth({ token, user }));
    } catch (error) {
      // If parsing fails, clear invalid data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch(logout());
    }
  }
};

// Action for password reset
export const resetPassword = (email) => (dispatch) => {
  return new Promise((resolve, reject) => {
    try {
      // Simulate API call for password reset
      setTimeout(() => {
        // In production, this would be an actual API call
        // const response = await fetch('/api/auth/reset-password', {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({ email }),
        // });

        // For now, simulate success
        resolve({ success: true, message: 'Password reset email sent successfully' });
      }, 2000);
    } catch (error) {
      reject({ success: false, error: error.message });
    }
  });
};
