const User = require('../models/User');
const odooService = require('../services/odooService');
const emailService = require('../services/emailService');
const { generateToken, generateShortToken, verifyToken } = require('../utils/jwtUtils');
const crypto = require('crypto');

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists in our database
    const user = await User.findByEmail(email).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Try to authenticate with Odoo
    let odooUser = null;
    try {
      const odooResult = await odooService.authenticateUser(email, password);
      if (odooResult.success) {
        odooUser = odooResult.user;
        
        // Update Odoo user ID if not already set
        if (!user.odooUserId) {
          user.odooUserId = odooUser.id;
          await user.save();
        }
      }
    } catch (odooError) {
      console.log('Odoo authentication failed, continuing with local auth:', odooError.message);
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          odooUserId: user.odooUserId
        },
        token,
        odooUser: odooUser ? {
          id: odooUser.id,
          name: odooUser.name,
          email: odooUser.email
        } : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Initialize Odoo session
    await odooService.initializeSession();

    // Check if user exists in Odoo
    const userExistsInOdoo = await odooService.checkUserExists(email);
    
    if (userExistsInOdoo) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists in the system'
      });
    }

    // Create user in Odoo
    let odooUserId = null;
    try {
      const odooResult = await odooService.createUser({
        name,
        email,
        password
      });
      
      if (odooResult.success) {
        odooUserId = odooResult.user_id;
      }
    } catch (odooError) {
      console.log('Odoo user creation failed:', odooError.message);
    }

    // Create user in our database
    const user = await User.create({
      name,
      email,
      password,
      odooUserId
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.log('Welcome email failed:', emailError.message);
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          odooUserId: user.odooUserId
        },
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const { resetToken, hashedToken } = emailService.generateResetToken();
    
    // Save hashed token to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    const emailResult = await emailService.sendPasswordResetEmail(
      email, 
      resetToken, 
      user.name
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Update password in Odoo if user has Odoo ID
    if (user.odooUserId) {
      try {
        await odooService.updateUserPassword(user.odooUserId, password);
      } catch (odooError) {
        console.log('Odoo password update failed:', odooError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password-otp
// @access  Public
const forgotPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to user (in production, you might want to use Redis for OTP storage)
    user.resetPasswordToken = otp;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send OTP email
    const emailResult = await emailService.sendOTPEmail(email, otp, user.name);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Forgot password OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
};

// @desc    Verify OTP and reset password
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP is valid and not expired
    if (user.resetPasswordToken !== otp || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Update password in Odoo if user has Odoo ID
    if (user.odooUserId) {
      try {
        await odooService.updateUserPassword(user.odooUserId, password);
      } catch (odooError) {
        console.log('Odoo password update failed:', odooError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a more complex setup, you might want to blacklist the token
    // For now, we'll just return a success response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          odooUserId: user.odooUserId,
          isActive: user.isActive,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user data'
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const { valid, decoded } = verifyToken(refreshToken);
    
    if (!valid || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Get user
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new access token
    const newToken = generateToken(user._id, user.email, user.role);

    res.status(200).json({
      success: true,
      data: {
        token: newToken
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token'
    });
  }
};

module.exports = {
  login,
  signup,
  forgotPassword,
  resetPassword,
  forgotPasswordOTP,
  verifyOTP,
  logout,
  getMe,
  refreshToken
};
