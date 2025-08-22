const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const userController = require('../controllers/userController');
const validate = require('../middleware/validation');
const { protect, authorize, isAdmin } = require('../middleware/auth');

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Routes
// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, userController.getProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfileValidation, validate, userController.updateProfile);

// @route   PUT /api/user/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, changePasswordValidation, validate, userController.changePassword);

// @route   GET /api/user/odoo-data
// @desc    Get user data from Odoo
// @access  Private
router.get('/odoo-data', protect, userController.getOdooData);

// @route   GET /api/user/mail-server
// @desc    Get mail server data from Odoo
// @access  Private
router.get('/mail-server', protect, userController.getMailServer);

// Admin routes
// @route   GET /api/user/all
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/all', protect, isAdmin, userController.getAllUsers);

// @route   GET /api/user/:id
// @desc    Get user by ID (admin only)
// @access  Private/Admin
router.get('/:id', protect, isAdmin, userController.getUserById);

// @route   PUT /api/user/:id
// @desc    Update user by ID (admin only)
// @access  Private/Admin
router.put('/:id', protect, isAdmin, updateProfileValidation, validate, userController.updateUserById);

// @route   DELETE /api/user/:id
// @desc    Delete user by ID (admin only)
// @access  Private/Admin
router.delete('/:id', protect, isAdmin, userController.deleteUserById);

module.exports = router;
