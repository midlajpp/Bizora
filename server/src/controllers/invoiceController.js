const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const { generateInvoiceNumber } = require('../utils/invoiceNumberGenerator');

// @desc    Get all invoices for logged-in user with filters
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
  try {
    const { status, customerId, search, startDate, endDate } = req.query;
    let query = { userId: req.user._id };

    if (status && ['Paid', 'Partially Paid', 'Pending', 'Cancelled'].includes(status)) {
      query.paymentStatus = status;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    if (search) {
      // Find matching customers first
      const matchedCustomers = await Customer.find({
        userId: req.user._id,
        name: { $regex: search, $options: 'i' }
      }).select('_id');

      const customerIds = matchedCustomers.map(c => c._id);

      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerId: { $in: customerIds } }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('customerId', 'name email phone address')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins are not authorized to create invoices.'
      });
    }

    const {
      customerId,
      invoiceDate,
      dueDate,
      items,
      discount = 0,
      initialPaidAmount = 0,
      notes
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one invoice line item is required' });
    }

    // Check customer belongs to user
    const customer = await Customer.findOne({ _id: customerId, userId: req.user._id });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Process line items & amounts
    let subtotal = 0;
    const processedItems = items.map(item => {
      const qty = Number(item.qty) || 1;
      const rate = Number(item.rate) || 0;
      const amount = qty * rate;
      subtotal += amount;

      return {
        serviceId: item.serviceId || null,
        serviceName: item.serviceName || 'Custom Service',
        description: item.description || '',
        qty,
        rate,
        amount
      };
    });

    const numDiscount = Number(discount) || 0;
    const grandTotal = Math.max(0, Math.round((subtotal - numDiscount) * 100) / 100);

    const initialPaid = Math.min(grandTotal, Math.max(0, Number(initialPaidAmount) || 0));
    const pendingAmount = Math.max(0, Math.round((grandTotal - initialPaid) * 100) / 100);

    let paymentStatus = 'Pending';
    if (initialPaid >= grandTotal && grandTotal > 0) {
      paymentStatus = 'Paid';
    } else if (initialPaid > 0) {
      paymentStatus = 'Partially Paid';
    }

    const finalInvoiceNumber = await generateInvoiceNumber(req.user._id);

    const invoice = await Invoice.create({
      userId: req.user._id,
      customerId,
      invoiceNumber: finalInvoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: processedItems,
      subtotal,
      discount: numDiscount,
      tax: 0,
      taxPercentage: 0,
      total: grandTotal,
      paidAmount: initialPaid,
      pendingAmount,
      paymentStatus,
      notes: notes || ''
    });

    // If initial cash received was recorded, create cash entry
    if (initialPaid > 0) {
      await Payment.create({
        userId: req.user._id,
        invoiceId: invoice._id,
        customerId,
        amount: initialPaid,
        paymentDate: invoice.invoiceDate,
        note: 'Initial cash received during invoice creation'
      });
    }

    const populatedInvoice = await Invoice.findById(invoice._id).populate('customerId', 'name email phone address');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: populatedInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice details with payments
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    const invoice = await Invoice.findOne(query)
      .populate('customerId')
      .populate({ path: 'userId', select: 'name email phone businessName businessAddress businessPhone businessEmail businessLogo' });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payments = await Payment.find({ invoiceId: invoice._id }).sort({ paymentDate: -1 });

    res.json({
      success: true,
      data: {
        ...invoice.toObject(),
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res, next) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      query.userId = req.user._id;
    }

    let invoice = await Invoice.findOne(query);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot update a cancelled invoice' });
    }

    const { customerId, invoiceDate, dueDate, items, discount, notes } = req.body;

    if (customerId) invoice.customerId = customerId;
    if (invoiceDate) invoice.invoiceDate = new Date(invoiceDate);
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (notes !== undefined) invoice.notes = notes;

    let subtotal = 0;
    if (items && Array.isArray(items) && items.length > 0) {
      invoice.items = items.map(item => {
        const qty = Number(item.qty) || 1;
        const rate = Number(item.rate) || 0;
        const amount = qty * rate;
        subtotal += amount;

        return {
          serviceId: item.serviceId || null,
          serviceName: item.serviceName || 'Custom Service',
          description: item.description || '',
          qty,
          rate,
          amount
        };
      });
      invoice.subtotal = subtotal;
    } else {
      subtotal = invoice.subtotal || 0;
    }

    const numDiscount = discount !== undefined ? Number(discount) || 0 : invoice.discount || 0;

    invoice.discount = numDiscount;
    invoice.taxPercentage = 0;
    invoice.tax = 0;

    const grandTotal = Math.max(0, Math.round((subtotal - numDiscount) * 100) / 100);
    invoice.total = grandTotal;

    // Recalculate pending & status based on existing paidAmount
    const currentPaid = invoice.paidAmount || 0;
    invoice.pendingAmount = Math.max(0, Math.round((grandTotal - currentPaid) * 100) / 100);

    if (currentPaid >= grandTotal && grandTotal > 0) {
      invoice.paymentStatus = 'Paid';
    } else if (currentPaid > 0) {
      invoice.paymentStatus = 'Partially Paid';
    } else {
      invoice.paymentStatus = 'Pending';
    }

    const updatedInvoice = await invoice.save();
    const populated = await Invoice.findById(updatedInvoice._id).populate('customerId', 'name email phone address');

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel invoice
// @route   PATCH /api/invoices/:id/cancel
// @access  Private
const cancelInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user._id });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.paymentStatus = 'Cancelled';
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Delete associated payments
    await Payment.deleteMany({ userId: req.user._id, invoiceId: req.params.id });

    res.json({
      success: true,
      message: 'Invoice and related payment records deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  cancelInvoice,
  deleteInvoice
};
