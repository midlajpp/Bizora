const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');

// @desc    Get all cash received entries for logged-in user
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res, next) => {
  try {
    const { invoiceId, customerId, startDate, endDate } = req.query;
    let query = { userId: req.user._id };

    if (invoiceId) query.invoiceId = invoiceId;
    if (customerId) query.customerId = customerId;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('invoiceId', 'invoiceNumber total pendingAmount paidAmount paymentStatus')
      .populate('customerId', 'name phone email')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record a new cash received entry against an invoice
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res, next) => {
  try {
    const { invoiceId, amount, paymentDate, note } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ success: false, message: 'Invoice ID and cash amount are required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Cash received amount must be greater than zero' });
    }

    // Verify invoice belongs to user
    const invoice = await Invoice.findOne({ _id: invoiceId, userId: req.user._id });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot record cash for a cancelled invoice' });
    }

    if (invoice.pendingAmount <= 0) {
      return res.status(400).json({ success: false, message: 'This invoice has no pending cash due' });
    }

    // Create cash record entry
    const payment = await Payment.create({
      userId: req.user._id,
      invoiceId,
      customerId: invoice.customerId,
      amount: numAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      note: note || ''
    });

    // Update invoice stats
    const newPaidAmount = Math.min(invoice.total, invoice.paidAmount + numAmount);
    const newPendingAmount = Math.max(0, Math.round((invoice.total - newPaidAmount) * 100) / 100);

    let newStatus = 'Partially Paid';
    if (newPendingAmount === 0 || newPaidAmount >= invoice.total) {
      newStatus = 'Paid';
    }

    invoice.paidAmount = newPaidAmount;
    invoice.pendingAmount = newPendingAmount;
    invoice.paymentStatus = newStatus;
    await invoice.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate('invoiceId', 'invoiceNumber total pendingAmount paidAmount paymentStatus')
      .populate('customerId', 'name phone email');

    res.status(201).json({
      success: true,
      message: 'Cash received recorded successfully',
      data: populatedPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single cash entry by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('invoiceId')
      .populate('customerId');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Cash record not found' });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a cash record & adjust invoice stats
// @route   DELETE /api/payments/:id
// @access  Private
const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({ _id: req.params.id, userId: req.user._id });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Cash record not found' });
    }

    // Find invoice to revert amounts
    const invoice = await Invoice.findOne({ _id: payment.invoiceId, userId: req.user._id });
    if (invoice) {
      const revertedPaid = Math.max(0, invoice.paidAmount - payment.amount);
      const revertedPending = Math.max(0, Math.round((invoice.total - revertedPaid) * 100) / 100);

      let revertedStatus = 'Pending';
      if (revertedPaid >= invoice.total && invoice.total > 0) {
        revertedStatus = 'Paid';
      } else if (revertedPaid > 0) {
        revertedStatus = 'Partially Paid';
      }

      invoice.paidAmount = revertedPaid;
      invoice.pendingAmount = revertedPending;
      invoice.paymentStatus = revertedStatus;
      await invoice.save();
    }

    await Payment.findByIdAndDelete(payment._id);

    res.json({
      success: true,
      message: 'Cash record deleted and invoice pending balance updated'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPayments,
  createPayment,
  getPaymentById,
  deletePayment
};
