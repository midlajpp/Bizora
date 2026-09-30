import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ToastContainer from './components/ToastContainer';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import UserRoute from './components/UserRoute';

// User Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Payments from './pages/Payments';
import Income from './pages/Income';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminPayments from './pages/admin/AdminPayments';

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <Router>
        <ToastProvider>
          <AuthProvider>
            <ToastContainer />
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected User Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Dashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/services"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Services />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Customers />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <CustomerDetail />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Invoices />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/invoices/new"
                element={
                  <UserRoute>
                    <AppLayout>
                      <CreateInvoice />
                    </AppLayout>
                  </UserRoute>
                }
              />

              <Route
                path="/invoices/:id"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <InvoiceDetail />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/invoices/:id/edit"
                element={
                  <UserRoute>
                    <AppLayout>
                      <CreateInvoice />
                    </AppLayout>
                  </UserRoute>
                }
              />

              <Route
                path="/payments"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Payments />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/income"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Income />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />


              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Reports />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminDashboard />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminUsers />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/users/:id"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminUserDetail />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/invoices"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminInvoices />
                    </AppLayout>
                  </AdminRoute>
                }
              />

              <Route
                path="/admin/payments"
                element={
                  <AdminRoute>
                    <AppLayout>
                      <AdminPayments />
                    </AppLayout>
                  </AdminRoute>
                }
              />


              {/* Default Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
