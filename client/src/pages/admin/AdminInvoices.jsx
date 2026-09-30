import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { FileText } from 'lucide-react';

const AdminInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/admin/invoices');
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      console.error('Error loading admin invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>System-Wide Invoices</h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          All invoices generated across all platform business accounts
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching system-wide invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState title="No System Invoices" icon={FileText} />
      ) : (
        <>
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>User Account</th>
                  <th>Client Customer</th>
                  <th>Invoice Date</th>
                  <th>Total</th>
                  <th>Cash Received</th>
                  <th>Pending Cash</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.invoiceNumber}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600 }}>{inv.userId?.name || 'User'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.userId?.email}</span>
                      </div>
                    </td>
                    <td>{inv.customerId?.name || 'Customer'}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</td>
                    <td style={{ color: 'var(--primary)' }}>{formatCurrency(inv.paidAmount)}</td>
                    <td style={{ color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {formatCurrency(inv.pendingAmount)}
                    </td>
                    <td>
                      <span className={`badge ${inv.paymentStatus === 'Paid' ? 'badge-paid' : inv.paymentStatus === 'Partially Paid' ? 'badge-partially' : 'badge-pending'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-only-cards">
            {invoices.map((inv) => (
              <div key={inv._id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{inv.invoiceNumber}</span>
                  <span className={`badge ${inv.paymentStatus === 'Paid' ? 'badge-paid' : inv.paymentStatus === 'Partially Paid' ? 'badge-partially' : 'badge-pending'}`}>
                    {inv.paymentStatus}
                  </span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>User Account:</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{inv.userId?.name || 'User'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{inv.userId?.email}</div>
                  </div>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{inv.customerId?.name || 'Customer'}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <span>{formatDate(inv.invoiceDate)}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Cash Received:</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(inv.paidAmount)}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Pending Cash:</span>
                  <span style={{ fontWeight: 700, color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {formatCurrency(inv.pendingAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminInvoices;
