const express = require('express');
const router = express.Router();
const {
  getSummaryReport,
  getIncomeReport,
  getInvoiceReport,
  getPendingReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/summary', getSummaryReport);
router.get('/income', getIncomeReport);
router.get('/invoice', getInvoiceReport);
router.get('/pending', getPendingReport);

module.exports = router;
