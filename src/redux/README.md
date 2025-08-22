# Redux Setup Documentation

This project uses Redux Toolkit for state management with a focus on user authentication and admin data.

## Folder Structure

```
src/redux/
├── store/          # Store configuration
├── slices/         # Redux Toolkit slices
├── actions/        # Async actions and thunks
├── reducers/       # Root reducer (optional with RTK)
└── hooks/          # Custom hooks for easy Redux usage
```

## Key Features

### 1. User Authentication Slice (`userSlice.js`)
- Manages user login/logout state
- Handles authentication tokens
- Stores user profile data
- Manages loading and error states

### 2. User Actions (`userActions.js`)
- `loginUser(email, password)` - Handles user login
- `logoutUser()` - Handles user logout
- `updateUserData(userData)` - Updates user information
- `checkUserAuth()` - Checks authentication status

### 3. Custom Hook (`useUser.js`)
Provides easy access to user state and actions:

```javascript
import { useUser } from 'redux/hooks/useUser';

const { 
  user,           // Current user data
  isAuthenticated, // Authentication status
  isLoading,      // Loading state
  error,          // Error messages
  login,          // Login function
  logout,         // Logout function
  updateUser      // Update user data
} = useUser();
```

## Usage Examples

### In Components

```javascript
import React from 'react';
import { useUser } from 'redux/hooks/useUser';

function MyComponent() {
  const { user, isAuthenticated, login } = useUser();

  const handleLogin = async () => {
    const result = await login('user@example.com', 'password');
    if (result.success) {
      console.log('Login successful!');
    }
  };

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### Accessing Store Directly

```javascript
import { useSelector, useDispatch } from 'react-redux';
import { loginUser } from 'redux/actions/userActions';

function MyComponent() {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const isLoading = useSelector(state => state.user.isLoading);

  const handleLogin = () => {
    dispatch(loginUser('email', 'password'));
  };
}
```

## State Structure

```javascript
{
  user: {
    user: {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      permissions: ['read', 'write', 'admin'],
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    token: 'jwt-token-here'
  }
}
```

## Authentication Flow

1. **Login**: User submits credentials → `loginUser` action → API call → Store user data and token
2. **Persistence**: Token stored in localStorage for session persistence
3. **Logout**: Clear user data and token from store and localStorage
4. **Auto-check**: Check authentication status on app initialization

## Adding New Features

### New Slice
```javascript
import { createSlice } from '@reduxjs/toolkit';

const newSlice = createSlice({
  name: 'newFeature',
  initialState: { /* initial state */ },
  reducers: { /* reducers */ }
});
```

### New Actions
```javascript
export const newAction = (data) => async (dispatch) => {
  // Async logic here
  dispatch(newSlice.actions.actionName(data));
};
```

### Update Store
```javascript
// In store/index.js
import newReducer from '../slices/newSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    newFeature: newReducer, // Add new reducer
  },
});
```

## Best Practices

1. **Use the custom hook** (`useUser`) instead of direct Redux calls when possible
2. **Keep slices focused** on a single domain (user, products, etc.)
3. **Use async actions** for API calls and complex logic
4. **Handle errors gracefully** with proper error states
5. **Persist important data** like authentication tokens in localStorage

## Troubleshooting

- **Store not working**: Ensure `Provider` wraps your app in `index.js`
- **Actions not dispatching**: Check if component is wrapped in Redux Provider
- **State not updating**: Verify reducer is properly added to store
- **Type errors**: Ensure all imports and exports are correct
