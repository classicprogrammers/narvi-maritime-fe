const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, email, role = 'user') => {
  return jwt.sign(
    { 
      id: userId, 
      email, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// Extract token from authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '30d'
    }
  );
};

// Generate short-lived token (for password reset, etc.)
const generateShortToken = (userId, purpose) => {
  return jwt.sign(
    { 
      id: userId,
      purpose,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: '1h'
    }
  );
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  generateRefreshToken,
  generateShortToken
};
