const User = require('../models/User');
const odooService = require('../services/odooService');

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
const getProfile = async (req, res) => {
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
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      updateData.email = email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          odooUserId: user.odooUserId,
          isActive: user.isActive,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

// @desc    Change user password
// @route   PUT /api/user/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Update password in Odoo if user has Odoo ID
    if (user.odooUserId) {
      try {
        await odooService.updateUserPassword(user.odooUserId, newPassword);
      } catch (odooError) {
        console.log('Odoo password update failed:', odooError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// @desc    Get user data from Odoo
// @route   GET /api/user/odoo-data
// @access  Private
const getOdooData = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.odooUserId) {
      return res.status(404).json({
        success: false,
        message: 'User not linked to Odoo account'
      });
    }

    const odooResult = await odooService.getUserDetails(user.odooUserId);
    
    if (!odooResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Odoo user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        odooUser: odooResult.user
      }
    });
  } catch (error) {
    console.error('Get Odoo data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Odoo data'
    });
  }
};

// @desc    Get mail server data from Odoo
// @route   GET /api/user/mail-server
// @access  Private
const getMailServer = async (req, res) => {
  try {
    const { id = 1 } = req.query;
    
    const mailServerResult = await odooService.getMailServer(parseInt(id));
    
    if (!mailServerResult.success) {
      return res.status(404).json({
        success: false,
        message: 'Mail server not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        mailServer: mailServerResult.data
      }
    });
  } catch (error) {
    console.error('Get mail server error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mail server data'
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/user/all
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

// @desc    Get user by ID (admin only)
// @route   GET /api/user/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user'
    });
  }
};

// @desc    Update user by ID (admin only)
// @route   PUT /api/user/:id
// @access  Private/Admin
const updateUserById = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
      updateData.email = email.toLowerCase();
    }
    if (role) updateData.role = role;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

// @desc    Delete user by ID (admin only)
// @route   DELETE /api/user/:id
// @access  Private/Admin
const deleteUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getOdooData,
  getMailServer,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById
};
