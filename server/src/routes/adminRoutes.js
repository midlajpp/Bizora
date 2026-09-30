const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getAllUsers,
  getUserDetails,
  deleteUser,
  getAllInvoices,
  getAllPayments
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getAdminDashboard);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.delete('/users/:id', deleteUser);
router.get('/invoices', getAllInvoices);
router.get('/payments', getAllPayments);

module.exports = router;
