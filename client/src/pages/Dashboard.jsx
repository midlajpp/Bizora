import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import SkeletonLoader from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import {
  FileText,
  Clock,
  Calendar,
  PlusCircle,
  ArrowRight,
  CreditCard,
  Eye,
  TrendingUp
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/reports/summary');
      if (res.data.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const lastPayment = summary?.lastPayment;

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading financial metrics...</p>
        </div>
        <SkeletonLoader type="cards" count={3} />
        <div style={{ marginTop: '1.5rem' }}>
          <SkeletonLoader type="table" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Title & Quick CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Welcome back! Here is your cash accounting and invoice overview.
          </p>
        </div>

        <Link to="/invoices/new" className="btn btn-primary">
          <PlusCircle size={18} /> Create Invoice
        </Link>
      </div>

      {/* SECTION 1: TOP 3 SUMMARY CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem'
        }}
      >
        {/* Card 1: Total Invoices */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Invoices
            </span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-main)' }}>
              {summary?.totalInvoicesCount || 0}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
              Clients billed
            </p>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <FileText size={24} />
          </div>
        </div>

        {/* Card 2: Pending Cash */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Cash
            </span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--warning)' }}>
              {formatCurrency(summary?.totalPendingAmount)}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
              Uncollected balance ({summary?.pendingCustomersCount || 0} clients)
            </p>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
        </div>

        {/* Card 3: This Month Cash Received */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              This Month Cash Received
            </span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>
              {summary?.thisMonthPayersCount || 0} Clients
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
              Received during current month
            </p>
          </div>
          <div className="stat-icon" style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}>
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* SECTION 2: TOTAL GRAPH */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Total Cash Received Trend</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Cash received over recent months</p>
          </div>
          <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>
            <TrendingUp size={12} /> Cash Received
          </span>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary?.trendData || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-md)'
                }}
                formatter={(val) => [formatCurrency(val), 'Cash Received']}
              />
              <Bar dataKey="Income" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: LAST CASH RECEIVED (LEFT) & RECENT INVOICES (RIGHT) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem' }} className="grid-responsive-dash">
        
        {/* LEFT: LAST CASH RECEIVED CARD */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Last Cash Received</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Most Recent</span>
          </div>

          {!lastPayment ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No cash received entries recorded yet.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
                flex: 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--success-bg)',
                    color: 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}
                >
                  <CreditCard size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {lastPayment.customerId?.name || 'Customer'}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatDate(lastPayment.paymentDate)}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cash Received:</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--success)' }}>
                    {formatCurrency(lastPayment.amount)}
                  </span>
                </div>

                {lastPayment.invoiceId && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Invoice Number:</span>
                    <Link to={`/invoices/${lastPayment.invoiceId._id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      {lastPayment.invoiceId.invoiceNumber}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: RECENT INVOICES */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Recent Invoices</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Latest generated invoices</p>
            </div>
            <Link to="/invoices" className="btn btn-outline btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>

          {!summary?.recentInvoices || summary.recentInvoices.length === 0 ? (
            <EmptyState
              title="No Invoices"
              description="Create your first invoice to start managing your billing."
              actionButton={
                <Link to="/invoices/new" className="btn btn-primary btn-sm">
                  <PlusCircle size={16} /> Create Invoice
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
                      <th>Amount</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentInvoices.map((inv) => {
                      let badgeClass = 'badge-pending';
                      if (inv.paymentStatus === 'Paid') badgeClass = 'badge-paid';
                      if (inv.paymentStatus === 'Partially Paid') badgeClass = 'badge-partially';
                      if (inv.paymentStatus === 'Cancelled') badgeClass = 'badge-cancelled';

                      return (
                        <tr key={inv._id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.invoiceNumber}</td>
                          <td>{inv.customerId?.name || 'Client'}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(inv.total)}</td>
                          <td>
                            <span className={`badge ${badgeClass}`}>{inv.paymentStatus}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to={`/invoices/${inv._id}`} className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }}>
                              <Eye size={14} />
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
                {summary.recentInvoices.map((inv) => {
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
                        <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                        <span style={{ fontWeight: 600 }}>{inv.customerId?.name || 'Client'}</span>
                      </div>
                      <div className="mobile-data-card-row">
                        <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                        <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{formatCurrency(inv.total)}</span>
                      </div>
                      <div className="mobile-data-card-row">
                        <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                        <span style={{ fontSize: '0.8125rem' }}>{formatDate(inv.invoiceDate)}</span>
                      </div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <Link to={`/invoices/${inv._id}`} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                          <Eye size={14} /> View Invoice Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .grid-responsive-dash {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
