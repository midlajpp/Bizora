import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Eye, FileText } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;

      const res = await axiosClient.get('/customers', { params });
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load customers list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer, e) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Please provide customer name', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        const res = await axiosClient.put(`/customers/${editingCustomer._id}`, formData);
        showToast(res.data.message || 'Customer updated successfully', 'success');
      } else {
        const res = await axiosClient.post('/customers', formData);
        showToast(res.data.message || 'Customer added successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await axiosClient.delete(`/customers/${deleteId}`);
      showToast(res.data.message || 'Customer deleted', 'success');
      setDeleteId(null);
      fetchCustomers();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete customer', 'error');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Customer Directory</h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Manage client profiles, total billed, paid, and pending balances
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Add New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search customers by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
        </div>
      </div>

      {/* Customers List Table */}
      {loading ? (
        <LoadingSpinner text="Fetching customers directory..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No Customers Found"
          description={search ? "No customers match your search query." : "Start by adding your first customer or client."}
          icon={Users}
          actionButton={
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus size={16} /> Add First Customer
            </button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="table-responsive desktop-only-table">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Contact Info</th>
                  <th>Invoices</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th>Pending</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr key={cust._id}>
                    <td>
                      <Link
                        to={`/customers/${cust._id}`}
                        style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}
                      >
                        <span style={{ fontSize: '0.9375rem' }}>{cust.name}</span>
                        {cust.address && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={12} /> {cust.address}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {cust.phone && (
                          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {cust.phone}
                          </span>
                        )}
                        {cust.email && (
                          <span style={{ color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {cust.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                        <FileText size={12} /> {cust.invoiceCount || 0}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(cust.totalBilled)}</td>
                    <td style={{ color: 'var(--primary)', fontWeight: 600 }}>{formatCurrency(cust.totalPaid)}</td>
                    <td style={{ color: cust.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                      {formatCurrency(cust.pendingAmount)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <Link
                          to={`/customers/${cust._id}`}
                          className="btn btn-outline btn-sm"
                          title="View Profile & Invoices"
                        >
                          <Eye size={14} />
                        </Link>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => handleOpenEditModal(cust, e)}
                          title="Edit Customer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(cust._id);
                          }}
                          title="Delete Customer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="mobile-only-cards">
            {customers.map((cust) => (
              <div key={cust._id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <span style={{ fontWeight: 800, fontSize: '1.0625rem', color: 'var(--text-main)' }}>{cust.name}</span>
                  <span className="badge badge-secondary" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                    <FileText size={12} /> Invoices: {cust.invoiceCount || 0}
                  </span>
                </div>

                {cust.phone && (
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                    <span style={{ fontWeight: 600 }}>{cust.phone}</span>
                  </div>
                )}

                {cust.email && (
                  <div className="mobile-data-card-row">
                    <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                    <span style={{ fontSize: '0.8125rem' }}>{cust.email}</span>
                  </div>
                )}

                <div className="mobile-data-card-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pending:</span>
                  <span style={{ color: cust.pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 800, fontSize: '1rem' }}>
                    {formatCurrency(cust.pendingAmount)}
                  </span>
                </div>

                <div className="mobile-card-actions">
                  <Link
                    to={`/customers/${cust._id}`}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 2, justifyContent: 'center' }}
                  >
                    <Eye size={14} /> View
                  </Link>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => handleOpenEditModal(cust, e)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(cust._id);
                    }}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer Info' : 'Add New Customer'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Acme Traders / Fresh Bakery"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="client@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Billing Address</label>
            <textarea
              rows="2"
              className="form-textarea"
              placeholder="Street, City, State, Pincode"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Internal Notes</label>
            <textarea
              rows="2"
              className="form-textarea"
              placeholder="Any specific client preferences or terms..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, paddingRight: 0 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete this customer profile?"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Customers;
