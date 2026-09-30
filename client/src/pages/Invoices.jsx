import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  CreditCard,
  Ban,
  Trash2,
  Calendar,
  Filter
} from 'lucide-react';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Cash Recording Modal State
  const [payInvoice, setPayInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('Cash received');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Confirm Actions State
  const [cancelId, setCancelId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, startDate, endDate]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axiosClient.get('/invoices', { params });
      if (res.data.success) {
        setInvoices(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRecordPayment = (inv) => {
    setPayInvoice(inv);
    setPaymentAmount(inv.pendingAmount);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNote('Cash received');
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payInvoice || !paymentAmount) return;

    try {
      setIsSubmittingPayment(true);
      const res = await axiosClient.post('/payments', {
        invoiceId: payInvoice._id,
        amount: Number(paymentAmount),
        paymentDate,
        note: paymentNote
      });

      showToast(res.data.message || 'Cash received recorded successfully!', 'success');
      setPayInvoice(null);
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record cash received', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelId) return;
    try {
      setIsProcessingAction(true);
      const res = await axiosClient.patch(`/invoices/${cancelId}/cancel`);
      showToast(res.data.message || 'Invoice cancelled', 'success');
      setCancelId(null);
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel invoice', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteId) return;
    try {
      setIsProcessingAction(true);
      const res = await axiosClient.delete(`/invoices/${deleteId}`);
      showToast(res.data.message || 'Invoice deleted', 'success');
      setDeleteId(null);
      fetchInvoices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete invoice', 'error');
    } finally {
      setIsProcessingAction(false);
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Invoice Management</h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Track, generate, print, and record cash received on all client invoices
          </p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary btn-lg">
          <Plus size={20} /> Create Invoice
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem' }} className="grid-filters-responsive">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by Invoice # or Customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          </div>

          <div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Invoice Statuses</option>
              <option value="Paid">Paid Only</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending Only</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Start Date"
            />
          </div>

          <div>
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

      {/* Invoices List Table */}
      {loading ? (
        <LoadingSpinner text="Fetching invoice records..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No Invoices Found"
          description={search || statusFilter ? "No invoices match your current search or status filter." : "Create your first professional invoice in seconds."}
          icon={FileText}
          actionButton={
            <Link to="/invoices/new" className="btn btn-primary btn-sm">
              <Plus size={16} /> Create First Invoice
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop View Table */}
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Grand Total</th>
                  <th>Cash Received</th>
                  <th>Pending Cash</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  let badgeClass = 'badge-pending';
                  if (inv.paymentStatus === 'Paid') badgeClass = 'badge-paid';
                  if (inv.paymentStatus === 'Partially Paid') badgeClass = 'badge-partially';
                  if (inv.paymentStatus === 'Cancelled') badgeClass = 'badge-cancelled';

                  return (
                    <tr key={inv._id}>
                      <td>
                        <Link to={`/invoices/${inv._id}`} style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{inv.customerId?.name || 'Customer'}</span>
                      </td>
                      <td>{formatDate(inv.invoiceDate)}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(inv.total)}</td>
                      <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(inv.paidAmount)}</td>
                      <td style={{ color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {formatCurrency(inv.pendingAmount)}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{inv.paymentStatus}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <Link
                            to={`/invoices/${inv._id}`}
                            className="btn btn-outline btn-sm"
                            title="View / Print PDF Invoice"
                          >
                            <Eye size={14} />
                          </Link>

                          <Link
                            to={`/invoices/${inv._id}/edit`}
                            className="btn btn-outline btn-sm"
                            title="Edit Invoice"
                          >
                            <Edit size={14} />
                          </Link>

                          {inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Cancelled' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenRecordPayment(inv)}
                              title="Record Cash Received"
                            >
                              <Plus size={14} /> Record Cash
                            </button>
                          )}

                          {inv.paymentStatus !== 'Cancelled' && (
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => setCancelId(inv._id)}
                              title="Cancel Invoice"
                              style={{ color: 'var(--warning)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                            >
                              <Ban size={14} />
                            </button>
                          )}

                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteId(inv._id)}
                            title="Delete Invoice"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View Cards */}
          <div className="mobile-only-cards">
            {invoices.map((inv) => {
              let badgeClass = 'badge-pending';
              if (inv.paymentStatus === 'Paid') badgeClass = 'badge-paid';
              if (inv.paymentStatus === 'Partially Paid') badgeClass = 'badge-partially';
              if (inv.paymentStatus === 'Cancelled') badgeClass = 'badge-cancelled';

              return (
                <div key={inv._id} className="card mobile-data-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
                  <div className="mobile-data-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <Link to={`/invoices/${inv._id}`} style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>
                      {inv.invoiceNumber}
                    </Link>
                    <span className={`badge ${badgeClass}`}>{inv.paymentStatus}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{inv.customerId?.name || 'Customer'}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(inv.total)}</span>
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
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                      <span>{formatDate(inv.invoiceDate)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
                    <Link to={`/invoices/${inv._id}`} className="btn btn-outline btn-sm" style={{ justifyContent: 'center', minHeight: '44px' }}>
                      <Eye size={16} /> View
                    </Link>

                    <Link to={`/invoices/${inv._id}/edit`} className="btn btn-outline btn-sm" style={{ justifyContent: 'center', minHeight: '44px' }}>
                      <Edit size={16} /> Edit
                    </Link>

                    {inv.paymentStatus !== 'Paid' && inv.paymentStatus !== 'Cancelled' ? (
                      <>
                        <button className="btn btn-primary btn-sm" onClick={() => handleOpenRecordPayment(inv)} style={{ justifyContent: 'center', minHeight: '44px' }}>
                          <Plus size={16} /> Record Cash
                        </button>

                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(inv._id)} style={{ justifyContent: 'center', minHeight: '44px' }}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(inv._id)} style={{ gridColumn: 'span 2', justifyContent: 'center', minHeight: '44px' }}>
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Record Cash Modal */}
      {payInvoice && (
        <Modal
          isOpen={!!payInvoice}
          onClose={() => setPayInvoice(null)}
          title={`Record Cash Received for ${payInvoice.invoiceNumber}`}
        >
          <form onSubmit={handleSavePayment}>
            <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                <span style={{ fontWeight: 600 }}>{payInvoice.customerId?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Invoice Total:</span>
                <span>{formatCurrency(payInvoice.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pending Cash:</span>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(payInvoice.pendingAmount)}</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cash Received Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                max={payInvoice.pendingAmount}
                step="any"
                className="form-input"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note / Remark</label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional notes..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>

            <div className="modal-footer" style={{ paddingBottom: 0, paddingRight: 0 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPayInvoice(null)}
                disabled={isSubmittingPayment}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmittingPayment}>
                {isSubmittingPayment ? 'Recording...' : 'Save Cash Received'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Invoice Dialog */}
      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={handleCancelInvoice}
        title="Cancel Invoice"
        message="Are you sure you want to mark this invoice as Cancelled? Its pending cash balance will no longer count towards open dues."
        confirmText="Cancel Invoice"
        isDanger={false}
        isLoading={isProcessingAction}
      />

      {/* Delete Invoice Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteInvoice}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice and its recorded cash transactions?"
        isLoading={isProcessingAction}
      />

      <style>{`
        @media (max-width: 900px) {
          .grid-filters-responsive {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 550px) {
          .grid-filters-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Invoices;
