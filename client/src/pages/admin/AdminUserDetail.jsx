import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatCard from '../../components/StatCard';
import { getLogoUrl } from '../../utils/logoUrl';
import {
  ArrowLeft,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  Eye
} from 'lucide-react';

const AdminUserDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('invoices');

  useEffect(() => {
    fetchUserData();
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/admin/users/${id}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
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

  if (loading) {
    return <LoadingSpinner fullPage text="Inspecting user account details..." />;
  }

  if (!data) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2>User Account Not Found</h2>
        <Link to="/admin/users" className="btn btn-outline" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Users List
        </Link>
      </div>
    );
  }

  const { user, stats, services, customers, invoices, payments } = data;

  return (
    <div className="page-container">
      {/* Top Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/admin/users" style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          <ArrowLeft size={16} /> Back to All Users
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Inspect User: {user.name}</h1>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Detailed account information, activity statistics, and user-scoped records
            </p>
          </div>
        </div>
      </div>

      {/* User Details Metadata Card */}
      <div className="card" style={{ marginBottom: '1.75rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            User Details
          </h3>
          {user.businessLogo && (
            <div style={{ maxHeight: '50px', maxWidth: '120px', display: 'flex', alignItems: 'center' }}>
              <img
                src={getLogoUrl(user.businessLogo)}
                alt={`${user.businessName || user.name} Logo`}
                style={{ maxHeight: '50px', maxWidth: '120px', objectFit: 'contain' }}
              />
            </div>
          )}
        </div>
        <div className="user-details-grid">
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Name</span>
            <strong style={{ color: 'var(--text-main)', wordBreak: 'break-word' }}>{user.name}</strong>
          </div>
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Email</span>
            <strong style={{ color: 'var(--text-main)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{user.email}</strong>
          </div>
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Phone</span>
            <strong style={{ color: 'var(--text-main)' }}>{user.phone || 'N/A'}</strong>
          </div>
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Business Name</span>
            <strong style={{ color: 'var(--primary)', wordBreak: 'break-word' }}>{user.businessName || 'N/A'}</strong>
          </div>
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Registration Date</span>
            <strong style={{ color: 'var(--text-main)' }}>{formatDate(user.createdAt)}</strong>
          </div>
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Status</span>
            <span className="badge badge-paid" style={{ marginTop: '2px' }}>Active</span>
          </div>
          <div className="user-detail-field">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'block', marginBottom: '2px' }}>Role</span>
            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-active'}`} style={{ marginTop: '2px' }}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* User Activity / Business Details Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard title="Total Services" value={`${stats?.totalServices || 0}`} icon={Briefcase} color="indigo" />
        <StatCard title="Total Customers" value={`${stats?.totalCustomers || 0}`} icon={Users} color="indigo" />
        <StatCard title="Total Invoices" value={`${stats?.totalInvoices || 0}`} icon={FileText} color="indigo" />
        <StatCard title="Total Cash Received" value={formatCurrency(stats?.totalIncome)} icon={TrendingUp} color="emerald" />
        <StatCard title="Total Pending Cash" value={formatCurrency(stats?.totalPending)} icon={Clock} color="amber" />
      </div>

      {/* Sub Tabs for Inspection */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { id: 'invoices', name: `Invoices (${invoices.length})`, icon: FileText },
          { id: 'services', name: `Services (${services.length})`, icon: Briefcase },
          { id: 'customers', name: `Customers (${customers.length})`, icon: Users },
          { id: 'payments', name: `Cash Received (${payments.length})`, icon: CreditCard }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id)}
              className="btn"
              style={{
                backgroundColor: isActive ? 'var(--primary)' : 'var(--bg-card)',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                borderColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                padding: '0.625rem 1rem',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={16} /> {t.name}
            </button>
          );
        })}
      </div>

      {/* Content based on sub-tab */}
      {activeSubTab === 'invoices' && (
        <div className="card">
          {invoices.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No invoices created by this user yet.</p>
          ) : (
            <>
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
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.invoiceNumber}</td>
                        <td>{inv.customerId?.name || 'Customer'}</td>
                        <td>{formatDate(inv.invoiceDate)}</td>
                        <td>{formatDate(inv.dueDate)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</td>
                        <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(inv.paidAmount)}</td>
                        <td style={{ color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>{formatCurrency(inv.pendingAmount)}</td>
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

              <div className="mobile-only-cards">
                {invoices.map((inv) => (
                  <div key={inv._id} className="mobile-data-card">
                    <div className="mobile-data-card-header">
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{inv.invoiceNumber}</span>
                      <span className={`badge ${inv.paymentStatus === 'Paid' ? 'badge-paid' : inv.paymentStatus === 'Partially Paid' ? 'badge-partially' : 'badge-pending'}`}>
                        {inv.paymentStatus}
                      </span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                      <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{inv.customerId?.name || 'Customer'}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Total:</span>
                      <span style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Cash Received:</span>
                      <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(inv.paidAmount)}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Pending:</span>
                      <span style={{ fontWeight: 700, color: inv.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{formatCurrency(inv.pendingAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'services' && (
        <div className="card">
          {services.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No catalog services added by this user yet.</p>
          ) : (
            <>
              <div className="table-responsive desktop-only-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Description</th>
                      <th>Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</td>
                        <td>{s.description || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(s.rate)}</td>
                        <td><span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-only-cards">
                {services.map((s) => (
                  <div key={s._id} className="mobile-data-card">
                    <div className="mobile-data-card-header">
                      <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{s.name}</span>
                      <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>{s.status}</span>
                    </div>
                    {s.description && (
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{s.description}</p>
                    )}
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Rate:</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(s.rate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'customers' && (
        <div className="card">
          {customers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No client customers added by this user yet.</p>
          ) : (
            <>
              <div className="table-responsive desktop-only-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c._id}>
                        <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</td>
                        <td>{c.phone || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-only-cards">
                {customers.map((c) => (
                  <div key={c._id} className="mobile-data-card">
                    <div className="mobile-data-card-header">
                      <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{c.name}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                      <span>{c.phone || '—'}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                      <span style={{ fontSize: '0.8125rem', wordBreak: 'break-all' }}>{c.email || '—'}</span>
                    </div>
                    {c.address && (
                      <div className="mobile-data-card-row">
                        <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                        <span style={{ fontSize: '0.8125rem' }}>{c.address}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeSubTab === 'payments' && (
        <div className="card">
          {payments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem', textAlign: 'center' }}>No cash received records logged by this user yet.</p>
          ) : (
            <>
              <div className="table-responsive desktop-only-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Invoice #</th>
                      <th>Cash Received</th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td>{formatDate(p.paymentDate)}</td>
                        <td>{p.invoiceId?.invoiceNumber || 'N/A'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.amount)}</td>
                        <td>{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-only-cards">
                {payments.map((p) => (
                  <div key={p._id} className="mobile-data-card">
                    <div className="mobile-data-card-header">
                      <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{p.invoiceId?.invoiceNumber || 'N/A'}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{formatDate(p.paymentDate)}</span>
                    </div>
                    <div className="mobile-data-card-row">
                      <span style={{ color: 'var(--text-muted)' }}>Cash Received:</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(p.amount)}</span>
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
      )}
    </div>
  );
};

export default AdminUserDetail;
