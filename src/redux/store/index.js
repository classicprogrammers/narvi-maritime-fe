import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../slices/userSlice';
import customerReducer from '../slices/customerSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    customer: customerReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
