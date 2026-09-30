const express = require('express');
const router = express.Router();
const {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  cancelInvoice,
  deleteInvoice
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.patch('/:id/cancel', cancelInvoice);

router.route('/:id')
  .get(getInvoiceById)
  .put(updateInvoice)
  .delete(deleteInvoice);

module.exports = router;
