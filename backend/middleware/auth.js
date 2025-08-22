const { verifyToken, extractTokenFromHeader } = require('../utils/jwtUtils');
const User = require('../models/User');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const { valid, decoded, error } = verifyToken(token);
    
    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: error
      });
    }

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Optional auth - doesn't require authentication but adds user if available
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization) {
      token = extractTokenFromHeader(req.headers.authorization);
    }

    if (token) {
      const { valid, decoded } = verifyToken(token);
      
      if (valid) {
        const user = await User.findById(decoded.id).select('-password');
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

// Check if user is owner or admin
const isOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Allow if user is admin
  if (req.user.role === 'admin') {
    return next();
  }

  // Allow if user is the owner (checking by user ID)
  if (req.params.userId && req.params.userId === req.user._id.toString()) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Owner or admin access required.'
  });
};

module.exports = {
  protect,
  optionalAuth,
  authorize,
  isAdmin,
  isOwnerOrAdmin
};
