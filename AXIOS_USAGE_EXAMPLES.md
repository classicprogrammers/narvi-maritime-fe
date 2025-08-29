# Axios Usage Examples

This document shows how to use the new axios-based API calls instead of the old fetch methods.

## Basic Usage

### Before (with fetch):
```javascript
try {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  setResponse(result);
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

### After (with axios):
```javascript
try {
  const response = await api.post(url, payload);
  setResponse(response.data);
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

## Available Methods

### GET Request
```javascript
const response = await api.get('/api/endpoint');
const data = response.data;
```

### POST Request
```javascript
const response = await api.post('/api/endpoint', payload);
const data = response.data;
```

### PUT Request
```javascript
const response = await api.put('/api/endpoint', payload);
const data = response.data;
```

### DELETE Request
```javascript
const response = await api.delete('/api/endpoint', { data: payload });
const data = response.data;
```

## Key Benefits

1. **Automatic JSON parsing** - No need for `response.json()`
2. **Automatic error handling** - HTTP errors are automatically thrown
3. **Built-in authentication** - Token is automatically added via interceptors
4. **Simpler syntax** - Less boilerplate code
5. **Better error handling** - More detailed error information
6. **Automatic headers** - Content-Type and Authorization are handled automatically

## Error Handling

```javascript
try {
  const response = await api.post('/api/endpoint', payload);
  // Success - data is in response.data
} catch (error) {
  if (error.response) {
    // Server responded with error status
    console.error('Server error:', error.response.data);
    console.error('Status:', error.response.status);
  } else if (error.request) {
    // Request was made but no response received
    console.error('Network error:', error.request);
  } else {
    // Something else happened
    console.error('Error:', error.message);
  }
}
```

## Authentication

The axios instance automatically includes the authentication token from localStorage. No need to manually add it to headers:

```javascript
// This automatically includes the Authorization header
const response = await api.get('/api/protected-endpoint');
```

## Configuration

The axios instance is configured in `src/api/axios.js` with:
- Base URL from environment variables
- Default headers (Content-Type: application/json)
- Request timeout (30 seconds)
- Automatic token injection
- Error logging
