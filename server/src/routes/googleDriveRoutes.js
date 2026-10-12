const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  getAuthUrl,
  handleCallback,
  exchangeCode,
  getStatus,
  disconnectDrive,
  uploadInvoicePdf
} = require('../controllers/googleDriveController');

// Memory storage for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Public callback endpoint for OAuth redirect from Google
router.get('/callback', handleCallback);

// Protected endpoints
router.get('/auth-url', protect, getAuthUrl);
router.post('/exchange-code', protect, exchangeCode);
router.get('/status', protect, getStatus);
router.post('/disconnect', protect, disconnectDrive);
router.post('/upload-invoice/:invoiceId', protect, upload.single('pdfFile'), uploadInvoicePdf);

module.exports = router;
