import React, { useState, useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { CreditCard } from 'lucide-react';

const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/admin/payments');
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin payments:', err);
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
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>System-Wide Cash Received</h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          All recorded cash received entries across all user accounts
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching system-wide cash records..." />
      ) : payments.length === 0 ? (
        <EmptyState title="No System Cash Records" icon={CreditCard} />
      ) : (
        <>
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>User Account</th>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Cash Received</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{p.userId?.name || 'User'}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.invoiceId?.invoiceNumber || 'N/A'}</td>
                    <td>{p.customerId?.name || 'Customer'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: 'var(--text-subtle)' }}>{p.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-only-cards">
            {payments.map((p) => (
              <div key={p._id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{p.invoiceId?.invoiceNumber || 'N/A'}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>User Account:</span>
                  <span style={{ fontWeight: 600 }}>{p.userId?.name || 'User'}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{p.customerId?.name || 'Customer'}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Cash Received:</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(p.amount)}</span>
                </div>
                {p.note && (
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Note:</span>
                    <span style={{ fontSize: '0.8125rem' }}>{p.note}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPayments;
