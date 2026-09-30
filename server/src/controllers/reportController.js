const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');

// @desc    Get dashboard metrics & summary according to simplified SaaS spec
// @route   GET /api/reports/summary
// @access  Private
const getSummaryReport = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Total Invoices count
    const totalInvoicesCount = await Invoice.countDocuments({ userId, paymentStatus: { $ne: 'Cancelled' } });

    // 2. Pending Payments: Count of distinct customers with pending amounts > 0
    const pendingInvoices = await Invoice.find({
      userId,
      paymentStatus: { $in: ['Pending', 'Partially Paid'] },
      pendingAmount: { $gt: 0 }
    });
    const pendingCustomerIds = new Set(pendingInvoices.map(inv => inv.customerId.toString()));
    const pendingCustomersCount = pendingCustomerIds.size;

    // 3. This Month Payments: Count of distinct customers who made payments during current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const thisMonthPayments = await Payment.find({
      userId,
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth }
    });
    const thisMonthPayerIds = new Set(thisMonthPayments.map(p => p.customerId ? p.customerId.toString() : ''));
    const thisMonthPayersCount = thisMonthPayerIds.size;

    // Financial totals
    const allPayments = await Payment.find({ userId });
    const totalIncome = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const totalPendingAmount = pendingInvoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);

    // 4. Last Payment Received
    const lastPayment = await Payment.findOne({ userId })
      .populate('invoiceId', 'invoiceNumber')
      .populate('customerId', 'name')
      .sort({ paymentDate: -1, createdAt: -1 });

    // 5. Recent 5 Invoices
    const recentInvoices = await Invoice.find({ userId })
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(5);

    // 6. Payment/Income Trend Graph Data (Monthly trend for last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trendPayments = await Payment.find({
      userId,
      paymentDate: { $gte: sixMonthsAgo }
    }).sort({ paymentDate: 1 });

    const timelineMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      timelineMap[label] = 0;
    }

    trendPayments.forEach(p => {
      const d = new Date(p.paymentDate);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      if (timelineMap[label] !== undefined) {
        timelineMap[label] += p.amount;
      }
    });

    const trendData = Object.keys(timelineMap).map(label => ({
      month: label,
      Income: timelineMap[label]
    }));

    res.json({
      success: true,
      data: {
        totalInvoicesCount,
        pendingCustomersCount,
        thisMonthPayersCount,
        totalIncome,
        totalPendingAmount,
        lastPayment,
        recentInvoices,
        trendData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Income report
const getIncomeReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, groupBy = 'month' } = req.query;

    let query = { userId };
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name')
      .populate({ path: 'invoiceId', select: 'items invoiceNumber' })
      .sort({ paymentDate: 1 });

    const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0);

    const incomeByCustomerObj = {};
    const incomeByServiceObj = {};
    const timelineObj = {};

    payments.forEach(p => {
      const custName = p.customerId ? p.customerId.name : 'Unknown Customer';
      incomeByCustomerObj[custName] = (incomeByCustomerObj[custName] || 0) + p.amount;

      const d = new Date(p.paymentDate);
      let timeKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (groupBy === 'day') {
        timeKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        timeKey = `${d.getFullYear()}`;
      }
      timelineObj[timeKey] = (timelineObj[timeKey] || 0) + p.amount;

      if (p.invoiceId && p.invoiceId.items && p.invoiceId.items.length > 0) {
        const invTotal = p.invoiceId.items.reduce((s, it) => s + it.amount, 0);
        if (invTotal > 0) {
          p.invoiceId.items.forEach(item => {
            const serviceName = item.serviceName || 'Custom Service';
            const itemShare = (item.amount / invTotal) * p.amount;
            incomeByServiceObj[serviceName] = (incomeByServiceObj[serviceName] || 0) + itemShare;
          });
        }
      }
    });

    const incomeByCustomer = Object.keys(incomeByCustomerObj).map(key => ({
      name: key,
      amount: Math.round(incomeByCustomerObj[key] * 100) / 100
    }));

    const incomeByService = Object.keys(incomeByServiceObj).map(key => ({
      name: key,
      amount: Math.round(incomeByServiceObj[key] * 100) / 100
    }));

    const timelineData = Object.keys(timelineObj).map(key => ({
      date: key,
      income: Math.round(timelineObj[key] * 100) / 100
    }));

    res.json({
      success: true,
      data: {
        totalIncome,
        incomeByCustomer,
        incomeByService,
        timelineData
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Invoice Report
const getInvoiceReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const invoices = await Invoice.find({ userId });

    const statusCounts = { Paid: 0, 'Partially Paid': 0, Pending: 0, Cancelled: 0 };
    const statusAmounts = { Paid: 0, 'Partially Paid': 0, Pending: 0, Cancelled: 0 };
    let totalBilled = 0;

    invoices.forEach(inv => {
      statusCounts[inv.paymentStatus] = (statusCounts[inv.paymentStatus] || 0) + 1;
      statusAmounts[inv.paymentStatus] = (statusAmounts[inv.paymentStatus] || 0) + inv.total;
      if (inv.paymentStatus !== 'Cancelled') totalBilled += inv.total;
    });

    res.json({
      success: true,
      data: {
        totalInvoices: invoices.length,
        totalBilled,
        statusCounts,
        statusAmounts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Pending Report
const getPendingReport = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const pendingInvoices = await Invoice.find({
      userId,
      paymentStatus: { $in: ['Pending', 'Partially Paid'] },
      pendingAmount: { $gt: 0 }
    })
      .populate('customerId', 'name phone email')
      .sort({ dueDate: 1 });

    const totalPending = pendingInvoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);

    res.json({
      success: true,
      data: {
        totalPending,
        count: pendingInvoices.length,
        invoices: pendingInvoices
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummaryReport,
  getIncomeReport,
  getInvoiceReport,
  getPendingReport
};
