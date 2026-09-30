import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import { Phone, Mail, MapPin, ArrowLeft, FileText, CreditCard, PlusCircle, Eye } from 'lucide-react';

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/customers/${id}`);
      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Loading customer details..." />;
  }

  if (!customer) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>Customer Not Found</h2>
        <Link to="/customers" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Customer Directory
        </Link>
      </div>
    );
  }

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/customers" style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          <ArrowLeft size={16} /> Back to Customers Directory
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>{customer.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {customer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={14} /> {customer.phone}</span>}
              {customer.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={14} /> {customer.email}</span>}
              {customer.address && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {customer.address}</span>}
            </div>
          </div>

          <Link to={`/invoices/new?customerId=${customer._id}`} className="btn btn-primary">
            <PlusCircle size={18} /> Invoice This Customer
          </Link>
        </div>
      </div>

      {/* Customer Financial Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Billed"
          value={formatCurrency(customer.totalBilled)}
          subtitle={`${customer.invoices?.length || 0} Invoices Generated`}
          icon={FileText}
          color="indigo"
        />
        <StatCard
          title="Total Received"
          value={formatCurrency(customer.totalPaid)}
          subtitle="Collected Payments"
          icon={CreditCard}
          color="emerald"
        />
        <StatCard
          title="Pending Amount"
          value={formatCurrency(customer.pendingAmount)}
          subtitle="Unpaid Balance"
          icon={FileText}
          color={customer.pendingAmount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Invoices List */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Invoices History ({customer.invoices?.length || 0})</h3>
        </div>

        {!customer.invoices || customer.invoices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>
            No invoices have been generated for this customer yet.
          </p>
        ) : (
        <>
          {/* Desktop View Table */}
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((inv) => {
                  let badgeClass = 'badge-pending';
                  if (inv.paymentStatus === 'Paid') badgeClass = 'badge-paid';
                  if (inv.paymentStatus === 'Partially Paid') badgeClass = 'badge-partially';
                  if (inv.paymentStatus === 'Cancelled') badgeClass = 'badge-cancelled';

                  return (
                    <tr key={inv._id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.invoiceNumber}</td>
                      <td>{formatDate(inv.invoiceDate)}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                      <td style={{ color: 'var(--primary)' }}>{formatCurrency(inv.paidAmount)}</td>
                      <td style={{ color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {formatCurrency(inv.pendingAmount)}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>{inv.paymentStatus}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to={`/invoices/${inv._id}`} className="btn btn-outline btn-sm">
                          <Eye size={14} /> View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View Cards */}
          <div className="mobile-only-cards">
            {customer.invoices.map((inv) => {
              let badgeClass = 'badge-pending';
              if (inv.paymentStatus === 'Paid') badgeClass = 'badge-paid';
              if (inv.paymentStatus === 'Partially Paid') badgeClass = 'badge-partially';
              if (inv.paymentStatus === 'Cancelled') badgeClass = 'badge-cancelled';

              return (
                <div key={inv._id} className="mobile-data-card">
                  <div className="mobile-data-card-header">
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{inv.invoiceNumber}</span>
                    <span className={`badge ${badgeClass}`}>{inv.paymentStatus}</span>
                  </div>
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Total:</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</span>
                  </div>
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Pending:</span>
                    <span style={{ color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {formatCurrency(inv.pendingAmount)}
                    </span>
                  </div>
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Due Date:</span>
                    <span style={{ fontSize: '0.8125rem' }}>{formatDate(inv.dueDate)}</span>
                  </div>
                  <div className="mobile-card-actions">
                    <Link to={`/invoices/${inv._id}`} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                      <Eye size={14} /> View Invoice
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}
      </div>

      {/* Payment History List */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Payment Transactions ({customer.payments?.length || 0})</h3>
        </div>

        {!customer.payments || customer.payments.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>
            No payment records found for this customer.
          </p>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="table-responsive desktop-only-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Reference</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.payments.map((p) => (
                    <tr key={p._id}>
                      <td>{formatDate(p.paymentDate)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.amount)}</td>
                      <td><span className="badge badge-active">{p.paymentMethod}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                      <td style={{ color: 'var(--text-subtle)' }}>{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="mobile-only-cards">
              {customer.payments.map((p) => (
                <div key={p._id} className="mobile-data-card">
                  <div className="mobile-data-card-header">
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.125rem' }}>{formatCurrency(p.amount)}</span>
                  </div>
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Method:</span>
                    <span className="badge badge-active">{p.paymentMethod}</span>
                  </div>
                  {p.reference && (
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Reference:</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>{p.reference}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
