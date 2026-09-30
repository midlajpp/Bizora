const User = require('../models/User');
const Service = require('../models/Service');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

// @desc    Get admin dashboard metrics across all user accounts (User-level stats only)
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getAdminDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const normalUsers = await User.countDocuments({ role: 'user' });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    // Recent user signups
    const recentUsers = await User.find().select('-password').sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      data: {
        totalUsers,
        normalUsers,
        adminUsers,
        recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details for Admin Inspect
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // STABILITY: All resources strictly filtered by target user._id
    const services = await Service.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
    const customers = await Customer.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
    const invoices = await Invoice.find({ userId: user._id }).populate('customerId', 'name phone email').sort({ createdAt: -1 }).lean();
    const payments = await Payment.find({ userId: user._id }).populate('invoiceId', 'invoiceNumber total').sort({ paymentDate: -1 }).lean();

    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);
    const activeInvoices = invoices.filter(inv => inv.paymentStatus !== 'Cancelled');
    const totalPending = activeInvoices.reduce((sum, inv) => sum + (inv.pendingAmount || 0), 0);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalServices: services.length,
          totalCustomers: customers.length,
          totalInvoices: invoices.length,
          totalIncome,
          totalPending
        },
        services,
        customers,
        invoices,
        payments
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a user & all their data (Admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete their own account' });
    }

    const targetUserId = targetUser._id;

    // Delete user resources
    await Service.deleteMany({ userId: targetUserId });
    await Customer.deleteMany({ userId: targetUserId });
    await Invoice.deleteMany({ userId: targetUserId });
    await Payment.deleteMany({ userId: targetUserId });
    await User.findByIdAndDelete(targetUserId);

    res.json({
      success: true,
      message: `User ${targetUser.name} (${targetUser.email}) and all associated data deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all invoices across system for Admin
// @route   GET /api/admin/invoices
// @access  Private/Admin
const getAllInvoices = async (req, res, next) => {
  try {
    const invoices = await Invoice.find()
      .populate('userId', 'name email businessName businessLogo')
      .populate('customerId', 'name email phone')
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

// @desc    Get all payments across system for Admin
// @route   GET /api/admin/payments
// @access  Private/Admin
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'name email')
      .populate('invoiceId', 'invoiceNumber total')
      .populate('customerId', 'name')
      .sort({ paymentDate: -1 });

    res.json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getAllUsers,
  getUserDetails,
  deleteUser,
  getAllInvoices,
  getAllPayments
};
