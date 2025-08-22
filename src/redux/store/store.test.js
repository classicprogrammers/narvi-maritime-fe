// Simple test to verify Redux store configuration
// This is not a comprehensive test suite, just a basic verification

import store from './index';
import userReducer from '../slices/userSlice';

describe('Redux Store Configuration', () => {
  test('store should be configured with user reducer', () => {
    const state = store.getState();
    expect(state).toHaveProperty('user');
  });

  test('initial user state should match slice initial state', () => {
    const state = store.getState();
    const expectedInitialState = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: localStorage.getItem('token') || null,
    };
    
    expect(state.user).toEqual(expectedInitialState);
  });

  test('store should dispatch actions', () => {
    const initialState = store.getState();
    
    // Dispatch a test action
    store.dispatch({
      type: 'user/loginStart'
    });
    
    const newState = store.getState();
    expect(newState.user.isLoading).toBe(true);
  });
});

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  window.__REDUX_STORE__ = store;
  console.log('Redux store available at window.__REDUX_STORE__');
  console.log('Current state:', store.getState());
}
