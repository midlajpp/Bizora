const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const formatUserPayload = (user) => ({
  id: user._id.toString(),
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  businessName: user.businessName || '',
  businessAddress: user.businessAddress || '',
  businessPhone: user.businessPhone || '',
  businessEmail: user.businessEmail || '',
  businessLogo: user.businessLogo || ''
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, businessName, businessAddress, businessPhone, businessEmail } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'user',
      phone: phone || '',
      businessName: businessName || name,
      businessAddress: businessAddress || '',
      businessPhone: businessPhone || phone || '',
      businessEmail: businessEmail || email.toLowerCase(),
      businessLogo: ''
    });

    const token = generateToken(user._id);
    const userPayload = formatUserPayload(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: userPayload,
      data: {
        ...userPayload,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    const userPayload = formatUserPayload(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload,
      data: {
        ...userPayload,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userPayload = formatUserPayload(user);

    res.json({
      success: true,
      user: userPayload,
      data: userPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & business info
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, businessName, businessAddress, businessPhone, businessEmail } = req.body;

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (businessName !== undefined) user.businessName = businessName;
    if (businessAddress !== undefined) user.businessAddress = businessAddress;
    if (businessPhone !== undefined) user.businessPhone = businessPhone;
    if (businessEmail !== undefined) user.businessEmail = businessEmail;

    const updatedUser = await user.save();
    const userPayload = formatUserPayload(updatedUser);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: userPayload,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload business logo
// @route   POST /api/users/logo or POST /api/auth/profile/logo
// @access  Private
const uploadBusinessLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Safely delete old logo file if it exists locally
    if (user.businessLogo && user.businessLogo.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../', user.businessLogo);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.error('Error removing old logo file:', e.message);
        }
      }
    }

    user.businessLogo = `/uploads/logos/${req.file.filename}`;
    const updatedUser = await user.save();
    const userPayload = formatUserPayload(updatedUser);

    res.json({
      success: true,
      message: 'Business logo uploaded successfully',
      data: userPayload,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove business logo
// @route   DELETE /api/users/logo or DELETE /api/auth/profile/logo
// @access  Private
const removeBusinessLogo = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.businessLogo && user.businessLogo.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../', user.businessLogo);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.error('Error removing logo file:', e.message);
        }
      }
    }

    user.businessLogo = '';
    const updatedUser = await user.save();
    const userPayload = formatUserPayload(updatedUser);

    res.json({
      success: true,
      message: 'Business logo removed successfully',
      data: userPayload,
      user: userPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  uploadBusinessLogo,
  removeBusinessLogo,
  changePassword
};
