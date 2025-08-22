import { useSelector, useDispatch } from 'react-redux';
import { 
  loginUser, 
  logoutUser, 
  updateUserData, 
  clearUserError,
  checkUserAuth,
  resetPassword
} from '../actions/userActions';

export const useUser = () => {
  const dispatch = useDispatch();
  const userState = useSelector((state) => state.user);

  return {
    // State
    user: userState.user,
    isAuthenticated: userState.isAuthenticated,
    isLoading: userState.isLoading,
    error: userState.error,
    token: userState.token,

    // Actions
    login: (email, password) => dispatch(loginUser(email, password)),
    logout: () => dispatch(logoutUser()),
    updateUser: (userData) => dispatch(updateUserData(userData)),
    clearError: () => dispatch(clearUserError()),
    checkAuth: () => dispatch(checkUserAuth()),
    resetPassword: (email) => dispatch(resetPassword(email)),
  };
};
