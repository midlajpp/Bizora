import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Shield, Users, FileText, TrendingUp, Clock, ArrowRight, UserCheck } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get('/admin/dashboard');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
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
    return <LoadingSpinner fullPage text="Loading administrator system analytics..." />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={28} color="var(--primary)" /> System Administrator Control Center
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            System-wide platform analytics, user accounts, and cash accounting health
          </p>
        </div>
      </div>

      {/* Primary Platform Stats - Account & User Focus Only */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Registered Users"
          value={`${stats?.totalUsers || 0} Accounts`}
          subtitle="Total platform user accounts"
          icon={UserCheck}
          color="indigo"
        />
        <StatCard
          title="Active Business Users"
          value={`${stats?.normalUsers || 0} Accounts`}
          subtitle="Registered business owner accounts"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="System Administrators"
          value={`${stats?.adminUsers || 0} Accounts`}
          subtitle="Platform administrator accounts"
          icon={Shield}
          color="amber"
        />
      </div>

      {/* Recent User Signups */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Recently Joined Business Users</h3>
          <Link to="/admin/users" className="btn btn-outline btn-sm">
            View All Users <ArrowRight size={14} />
          </Link>
        </div>

        <>
          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email Address</th>
                  <th>Business Name</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentUsers?.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.businessName || '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-active'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/admin/users/${u._id}`} className="btn btn-outline btn-sm">
                        Inspect User
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-only-cards">
            {stats?.recentUsers?.map((u) => (
              <div key={u._id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{u.name}</span>
                  <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-active'}`}>{u.role}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <span style={{ fontSize: '0.8125rem' }}>{u.email}</span>
                </div>
                {u.businessName && (
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Business:</span>
                    <span style={{ fontWeight: 600 }}>{u.businessName}</span>
                  </div>
                )}
                <div className="mobile-card-actions">
                  <Link to={`/admin/users/${u._id}`} className="btn btn-outline btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    Inspect User
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      </div>
    </div>
  );
};

export default AdminDashboard;
