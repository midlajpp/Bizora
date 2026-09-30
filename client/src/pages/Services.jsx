import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Briefcase, Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rate: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetchServices();
  }, [search, statusFilter]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const res = await axiosClient.get('/services', { params });
      if (res.data.success) {
        setServices(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load services list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({ name: '', description: '', rate: '', status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      rate: service.rate,
      status: service.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.rate === '') {
      showToast('Please provide service name and rate', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingService) {
        const res = await axiosClient.put(`/services/${editingService._id}`, formData);
        showToast(res.data.message || 'Service updated successfully', 'success');
      } else {
        const res = await axiosClient.post('/services', formData);
        showToast(res.data.message || 'Service created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchServices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save service', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      const res = await axiosClient.delete(`/services/${deleteId}`);
      showToast(res.data.message || 'Service deleted', 'success');
      setDeleteId(null);
      fetchServices();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete service', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt || 0);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Services & Rates Catalog</h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Define your reusable services and default pricing rates for quick invoicing
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Add New Service
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem' }} className="grid-responsive-filters">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search services by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Services List Table */}
      {loading ? (
        <LoadingSpinner text="Fetching services catalog..." />
      ) : services.length === 0 ? (
        <EmptyState
          title="No Services Found"
          description={search ? "No services match your search criteria." : "You haven't added any services yet. Create custom services like Poster Design, Logo Design, etc."}
          icon={Briefcase}
          actionButton={
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal}>
              <Plus size={16} /> Add First Service
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
                  <th>Service Name</th>
                  <th>Description</th>
                  <th>Standard Rate</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service._id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{service.name}</td>
                    <td style={{ color: 'var(--text-muted)', maxWidth: '300px' }}>
                      {service.description || '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1rem' }}>
                      {formatCurrency(service.rate)}
                    </td>
                    <td>
                      <span className={`badge ${service.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                        {service.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {service.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-subtle)', fontSize: '0.8125rem' }}>
                      {new Date(service.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleOpenEditModal(service)}
                          title="Edit Service"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteId(service._id)}
                          title="Delete Service"
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
            {services.map((service) => (
              <div key={service._id} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>{service.name}</span>
                  <span className={`badge ${service.status === 'active' ? 'badge-active' : 'badge-inactive'}`}>
                    {service.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {service.status}
                  </span>
                </div>
                {service.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0 0.5rem 0' }}>
                    {service.description}
                  </p>
                )}
                <div className="mobile-data-card-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Standard Rate:</span>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.125rem' }}>{formatCurrency(service.rate)}</span>
                </div>
                <div className="mobile-card-actions">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleOpenEditModal(service)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteId(service._id)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Edit Service' : 'Add New Service'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Service Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Logo Design, Instagram Post"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Standard Rate (₹) *</label>
            <input
              type="number"
              min="0"
              step="any"
              className="form-input"
              placeholder="e.g. 1500"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              rows="3"
              className="form-textarea"
              placeholder="Brief description of deliverables or terms..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="active">Active (Available for invoices)</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {isSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Service"
        message="Are you sure you want to delete this service? Existing invoices containing this service will retain their recorded items."
        isLoading={isDeleting}
      />

      <style>{`
        @media (max-width: 640px) {
          .grid-responsive-filters {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Services;
