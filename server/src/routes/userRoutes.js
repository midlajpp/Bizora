const express = require('express');
const router = express.Router();
const {
  getMe,
  updateProfile,
  uploadBusinessLogo,
  removeBusinessLogo,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const uploadLogo = require('../middleware/upload');

router.use(protect);

router.get('/', getMe);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.post('/logo', uploadLogo.single('logo'), uploadBusinessLogo);
router.delete('/logo', removeBusinessLogo);
router.put('/change-password', changePassword);

module.exports = router;
