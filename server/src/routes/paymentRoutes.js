const express = require('express');
const router = express.Router();
const {
  getPayments,
  createPayment,
  getPaymentById,
  deletePayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.route('/:id')
  .get(getPaymentById)
  .delete(deletePayment);

module.exports = router;
