const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

// @desc    Get all customers for logged-in user with summary metrics
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = { userId: req.user._id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 }).lean();

    // Calculate invoice stats per customer
    const customerIds = customers.map(c => c._id);
    const invoices = await Invoice.find({ userId: req.user._id, customerId: { $in: customerIds } });

    const customerMap = customers.map(cust => {
      const custInvoices = invoices.filter(inv => inv.customerId.toString() === cust._id.toString() && inv.paymentStatus !== 'Cancelled');
      const totalBilled = custInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalPaid = custInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
      const pendingAmount = custInvoices.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);

      return {
        ...cust,
        invoiceCount: custInvoices.length,
        totalBilled,
        totalPaid,
        pendingAmount
      };
    });

    res.json({
      success: true,
      count: customerMap.length,
      data: customerMap
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const customer = await Customer.create({
      userId: req.user._id,
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Customer added successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer details with invoices & stats
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id }).lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const invoices = await Invoice.find({ userId: req.user._id, customerId: customer._id }).sort({ createdAt: -1 });
    const payments = await Payment.find({ userId: req.user._id, customerId: customer._id }).sort({ paymentDate: -1 });

    const activeInvoices = invoices.filter(inv => inv.paymentStatus !== 'Cancelled');
    const totalBilled = activeInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalPaid = activeInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const pendingAmount = activeInvoices.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);

    res.json({
      success: true,
      data: {
        ...customer,
        totalBilled,
        totalPaid,
        pendingAmount,
        invoices,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, notes } = req.body;

    let customer = await Customer.findOne({ _id: req.params.id, userId: req.user._id });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (name) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;
    if (notes !== undefined) customer.notes = notes;

    const updatedCustomer = await customer.save();

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer
};
