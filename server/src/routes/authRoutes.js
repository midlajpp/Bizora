const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  uploadBusinessLogo,
  removeBusinessLogo,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const uploadLogo = require('../middleware/upload');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logo', protect, uploadLogo.single('logo'), uploadBusinessLogo);
router.delete('/logo', protect, removeBusinessLogo);
router.put('/change-password', protect, changePassword);

module.exports = router;
