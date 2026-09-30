import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { useToast } from '../../context/ToastContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { UserCheck, Search, Eye, Trash2, Shield, FileText, Users as CustomerIcon } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;

      const res = await axiosClient.get('/admin/users', { params });
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      showToast('Failed to fetch user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await axiosClient.delete(`/admin/users/${deleteId}`);
      showToast(res.data.message || 'User deleted', 'success');
      setDeleteId(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete user account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Registered Users Management</h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
          Inspect user accounts, operational metrics, and private data isolation status
        </p>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search users by name, email, or business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <LoadingSpinner text="Fetching platform users..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="No Users Found"
          description="No user accounts match your search filter."
          icon={UserCheck}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>User & Business</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <Link to={`/admin/users/${u._id}`} style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
                        <span>{u.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{u.email}</span>
                        {u.businessName && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>{u.businessName}</span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-active'}`}>
                        {u.role === 'admin' && <Shield size={12} />} {u.role}
                      </span>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <Link to={`/admin/users/${u._id}`} className="btn btn-outline btn-sm" title="Inspect User Account">
                          <Eye size={14} /> Inspect
                        </Link>
                        {u.role !== 'admin' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteId(u._id)}
                            title="Delete User Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-only-cards">
            {users.map((u) => (
              <div key={u._id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--text-main)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{u.name}</span>
                  <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-active'}`}>
                    {u.role === 'admin' && <Shield size={12} />} {u.role}
                  </span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <span style={{ fontSize: '0.8125rem', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{u.email}</span>
                </div>
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                  <span style={{ fontWeight: 500 }}>{u.phone || '—'}</span>
                </div>
                {u.businessName && (
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Business:</span>
                    <span style={{ fontWeight: 600, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{u.businessName}</span>
                  </div>
                )}
                <div className="mobile-data-card-row">
                  <span style={{ color: 'var(--text-muted)' }}>Joined:</span>
                  <span>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="mobile-card-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
                  <Link to={`/admin/users/${u._id}`} className="btn btn-outline btn-sm" style={{ justifyContent: 'center', minHeight: '44px' }}>
                    <Eye size={14} /> Inspect
                  </Link>
                  {u.role !== 'admin' ? (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteId(u._id)}
                      style={{ justifyContent: 'center', minHeight: '44px' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete User Confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Account"
        message="Are you sure you want to delete this user account? All of their services, customers, invoices, and payments will be permanently deleted."
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AdminUsers;
