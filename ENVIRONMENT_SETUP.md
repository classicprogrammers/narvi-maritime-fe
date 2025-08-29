# Environment Setup Guide

This project has been updated to use environment variables for all API URLs instead of hardcoded values.

## Frontend Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# API Configuration
REACT_APP_API_BASE_URL=http://13.61.187.51:8069
REACT_APP_BACKEND_URL=http://13.61.187.51:8069
```

## Backend Environment Variables

The backend already uses environment variables. You can override them by setting:

```bash
# Odoo Configuration
ODOO_URL=http://13.61.187.51:8069

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

## How to Use

1. **Copy the example file**: `cp env.example .env`
2. **Update the values** in `.env` to match your backend server
3. **Restart the application** after making changes

## What Was Changed

- ✅ Removed all hardcoded URLs from source code
- ✅ Updated configuration files to use environment variables
- ✅ Removed fallback alternative URL logic
- ✅ Simplified error handling to use single API endpoint
- ✅ Updated proxy configuration to use environment variables

## Benefits

- **Environment-specific configuration**: Different URLs for dev/staging/production
- **Security**: No hardcoded IPs in source code
- **Maintainability**: Easy to change URLs without code changes
- **Deployment flexibility**: Different environments can use different backends

## Troubleshooting

If you encounter connection issues:

1. Check that your `.env` file exists and has correct values
2. Verify your backend server is running and accessible
3. Check CORS configuration on your backend
4. Ensure the environment variables are loaded (restart after changes)
