import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../slices/userSlice';
import customerReducer from '../slices/customerSlice';
import vendorReducer from '../slices/vendorSlice';
import shippingOrdersReducer from '../slices/shippingOrdersSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    customer: customerReducer,
    vendor: vendorReducer,
    shippingOrders: shippingOrdersReducer,
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
