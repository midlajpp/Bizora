import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { CreditCard, Trash2, Calendar, FileText, User } from 'lucide-react';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, [startDate, endDate]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axiosClient.get('/payments', { params });
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load cash received history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await axiosClient.delete(`/payments/${deleteId}`);
      showToast(res.data.message || 'Cash record deleted & invoice balance updated', 'success');
      setDeleteId(null);
      fetchPayments();
    } catch (err) {
      showToast('Failed to delete cash record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 1.875rem)', fontWeight: 800, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            Cash Received
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Complete ledger of cash received and pending cash balances
          </p>
        </div>

        <div className="card total-collection-card" style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--primary-light)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Filtered Cash Received</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(totalCollected)}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div className="grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="End Date"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {loading ? (
        <LoadingSpinner text="Fetching cash records..." />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No Cash Received Records"
          description="There are no cash received entries matching your date filter."
          icon={CreditCard}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Cash Received</th>
                  <th>Note</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td>
                      {p.invoiceId ? (
                        <Link to={`/invoices/${p.invoiceId._id}`} style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {p.invoiceId.invoiceNumber}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.customerId?.name || 'Customer'}</td>
                    <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                      {formatCurrency(p.amount)}
                    </td>
                    <td style={{ color: 'var(--text-subtle)', maxWidth: '250px' }}>{p.note || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setDeleteId(p._id)}
                        title="Delete Cash Entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
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
                  <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--text-main)' }}>
                    {p.customerId?.name || 'Customer'}
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.125rem' }}>
                    {formatCurrency(p.amount)}
                  </span>
                </div>

                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Invoice:</span>
                  {p.invoiceId ? (
                    <Link to={`/invoices/${p.invoiceId._id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {p.invoiceId.invoiceNumber}
                    </Link>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>

                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                  <span style={{ fontSize: '0.8125rem' }}>{formatDate(p.paymentDate)}</span>
                </div>

                {p.note && (
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Note:</span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>{p.note}</span>
                  </div>
                )}

                <div className="mobile-card-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteId(p._id)}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Trash2 size={14} /> Delete Entry
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Cash Record Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeletePayment}
        title="Delete Cash Record"
        message="Deleting this cash record will automatically deduct the amount from the invoice and recalculate its pending cash balance."
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Payments;
