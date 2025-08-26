# Backend Connection Fix Guide

## Current Issue

Your frontend is getting "Cannot connect to backend server" errors when trying to update or delete customers. This is likely due to CORS (Cross-Origin Resource Sharing) configuration issues on your backend.

## Quick Fix Steps

### 1. Update Backend URL (if needed)

If your backend is running on a different IP address, update the URL in:

```
src/config/backend.js
```

Change the `CURRENT_URL` to match your backend server:

```javascript
CURRENT_URL: "http://YOUR_BACKEND_IP:8069";
```

### 2. Fix Backend CORS Configuration

In your backend server (Python/Flask/Node.js), add CORS headers:

**For Python Flask:**

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])
```

**For Node.js Express:**

```javascript
const cors = require("cors");
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
  })
);
```

**For Python Django:**

```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

INSTALLED_APPS = [
    # ... other apps
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    # ... other middleware
]
```

### 3. Test Connection

1. Click the "Test Connection" button in the Customer Management page
2. If successful, the customer data will automatically refresh
3. If failed, check the error message and fix accordingly

### 4. Restart Services

After fixing CORS:

1. Restart your backend server
2. Refresh your frontend application

## API Endpoints

Your backend should have these endpoints working:

- `GET /api/customers` - Get all customers
- `POST /api/customer/register` - Register new customer
- `PUT /api/customer/update/{id}` - Update customer
- `DELETE /api/customer/delete/{id}` - Delete customer
- `GET /api/countries` - Get all countries

## Troubleshooting

- **CORS Error**: Check browser console for CORS-related errors
- **Connection Refused**: Make sure backend server is running
- **Wrong Port**: Verify the port number (8069) matches your backend
- **Firewall**: Check if firewall is blocking the connection

## Testing

Use the test buttons in the Customer Management page to verify your backend is accessible:

1. **Test Connection** - Tests the general backend connectivity
2. **Test Countries API** - Tests the countries endpoint specifically
3. **Test Connection** will automatically refresh customer data when successful

Test these before trying to update/delete customers.
