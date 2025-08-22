# Narvi Maritime Backend API

A Node.js backend API that integrates with Odoo for user authentication and management.

## 🚀 Features

- **User Authentication**: Login, signup, logout with JWT tokens
- **Password Management**: Forgot password with email reset and OTP
- **Odoo Integration**: Seamless integration with Odoo backend
- **Email Services**: Welcome emails and password reset emails
- **Security**: Rate limiting, input validation, password hashing
- **Admin Panel**: User management for administrators

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Odoo server running at `http://13.61.187.51:8069`
- Email service (Gmail SMTP recommended)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp config.env .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/narvi-maritime

   # Odoo Configuration
   ODOO_URL=http://13.61.187.51:8069
   ODOO_DATABASE=your_odoo_database_name
   ODOO_USERNAME=your_odoo_username
   ODOO_PASSWORD=your_odoo_password

   # Email Configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=Narvi Maritime <your-email@gmail.com>

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## 📚 API Endpoints

### Authentication Routes

#### POST `/api/auth/login`
Login user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "user",
      "odooUserId": 123
    },
    "token": "jwt_token_here",
    "odooUser": {
      "id": 123,
      "name": "John Doe",
      "email": "user@example.com"
    }
  }
}
```

#### POST `/api/auth/signup`
Register new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "Password123"
}
```

#### POST `/api/auth/forgot-password`
Send password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/reset-password`
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_here",
  "password": "NewPassword123"
}
```

#### POST `/api/auth/forgot-password-otp`
Send OTP for password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/verify-otp`
Verify OTP and reset password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "NewPassword123"
}
```

#### POST `/api/auth/logout`
Logout user (requires authentication).

#### GET `/api/auth/me`
Get current user profile (requires authentication).

#### POST `/api/auth/refresh-token`
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

### User Routes

#### GET `/api/user/profile`
Get user profile (requires authentication).

#### PUT `/api/user/profile`
Update user profile (requires authentication).

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### PUT `/api/user/change-password`
Change user password (requires authentication).

**Request Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "NewPassword123"
}
```

#### GET `/api/user/odoo-data`
Get user data from Odoo (requires authentication).

#### GET `/api/user/mail-server`
Get mail server data from Odoo (requires authentication).

**Query Parameters:**
- `id`: Mail server ID (default: 1)

### Admin Routes

#### GET `/api/user/all`
Get all users (requires admin authentication).

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

#### GET `/api/user/:id`
Get user by ID (requires admin authentication).

#### PUT `/api/user/:id`
Update user by ID (requires admin authentication).

#### DELETE `/api/user/:id`
Delete user by ID (requires admin authentication).

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 🏗️ Project Structure

```
backend/
├── config/
│   └── database.js          # Database connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   └── userController.js    # User management logic
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── errorHandler.js     # Error handling middleware
│   └── validation.js       # Input validation middleware
├── models/
│   └── User.js             # User model
├── routes/
│   ├── auth.js             # Authentication routes
│   └── user.js             # User routes
├── services/
│   ├── emailService.js     # Email functionality
│   └── odooService.js      # Odoo integration
├── utils/
│   └── jwtUtils.js         # JWT utilities
├── package.json
├── server.js               # Main server file
└── README.md
```

## 🔧 Configuration

### Odoo Integration

The backend integrates with your Odoo server at `http://13.61.187.51:8069`. Make sure to:

1. Set correct Odoo credentials in `.env`
2. Ensure Odoo server is accessible
3. Configure proper database name

### Email Configuration

For Gmail SMTP:
1. Enable 2-factor authentication
2. Generate app password
3. Use app password in `EMAIL_PASS`

### Security

- JWT tokens expire in 7 days (configurable)
- Rate limiting: 100 requests per 15 minutes
- Password requirements: min 6 chars, uppercase, lowercase, number
- Account lockout after 5 failed login attempts

## 🧪 Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🚀 Deployment

1. **Set environment variables for production**
2. **Use PM2 or similar process manager**
3. **Set up MongoDB Atlas or production MongoDB**
4. **Configure reverse proxy (Nginx)**
5. **Set up SSL certificates**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "narvi-backend"

# Monitor
pm2 monit
```

## 📝 Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## 🔍 Logging

- Development: Morgan HTTP logging
- Production: Structured logging
- Error logging to console

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@narvi-maritime.com or create an issue in the repository.
