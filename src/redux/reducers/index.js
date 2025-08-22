import { combineReducers } from '@reduxjs/toolkit';
import userReducer from '../slices/userSlice';

const rootReducer = combineReducers({
  user: userReducer,
  // Add more reducers here as your app grows
});

export default rootReducer;
