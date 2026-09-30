import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link, Navigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  FileText,
  Plus,
  Trash2,
  ArrowLeft,
  UserPlus
} from 'lucide-react';

const CreateInvoice = () => {
  const { isAdmin } = useAuth();
  if (isAdmin) {
    return <Navigate to="/admin/invoices" replace />;
  }

  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customerId') || '';

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerId, setCustomerId] = useState(preselectedCustomerId);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const [items, setItems] = useState([
    { serviceId: '', serviceName: '', description: '', qty: 1, rate: 0, amount: 0 }
  ]);

  const [discount, setDiscount] = useState(0);
  const [initialPaidAmount, setInitialPaidAmount] = useState(0);
  const [notes, setNotes] = useState('Thank you for your business!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Customer Add Modal State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '' });
  const [isAddingCust, setIsAddingCust] = useState(false);

  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [custRes, servRes] = await Promise.all([
        axiosClient.get('/customers'),
        axiosClient.get('/services')
      ]);

      if (custRes.data.success) setCustomers(custRes.data.data);
      if (servRes.data.success) {
        setServices(servRes.data.data.filter(s => s.status === 'active'));
      }

      if (isEditMode) {
        const invRes = await axiosClient.get(`/invoices/${id}`);
        if (invRes.data.success) {
          const inv = invRes.data.data;
          setCustomerId(inv.customerId?._id || inv.customerId || '');
          setInvoiceNumber(inv.invoiceNumber || '');
          if (inv.invoiceDate) {
            setInvoiceDate(new Date(inv.invoiceDate).toISOString().split('T')[0]);
          }
          if (inv.dueDate) {
            setDueDate(new Date(inv.dueDate).toISOString().split('T')[0]);
          }
          if (inv.items && inv.items.length > 0) {
            setItems(
              inv.items.map(it => ({
                serviceId: it.serviceId || '',
                serviceName: it.serviceName || '',
                description: it.description || '',
                qty: it.qty || 1,
                rate: it.rate || 0,
                amount: (it.qty || 1) * (it.rate || 0)
              }))
            );
          }
          setDiscount(inv.discount || 0);
          setInitialPaidAmount(inv.paidAmount || 0);
          setNotes(inv.notes || '');
        }
      }
    } catch (err) {
      showToast('Failed to load initial invoice data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Line item change handlers
  const handleServiceSelect = (index, serviceId) => {
    const updated = [...items];
    const selectedService = services.find(s => s._id === serviceId);

    if (selectedService) {
      updated[index].serviceId = selectedService._id;
      updated[index].serviceName = selectedService.name;
      updated[index].description = selectedService.description || '';
      updated[index].rate = selectedService.rate;
      updated[index].amount = updated[index].qty * selectedService.rate;
    } else {
      updated[index].serviceId = '';
    }
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    const qty = Number(updated[index].qty) || 0;
    const rate = Number(updated[index].rate) || 0;
    updated[index].amount = qty * rate;

    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { serviceId: '', serviceName: '', description: '', qty: 1, rate: 0, amount: 0 }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      showToast('Invoice must contain at least one line item', 'error');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name) return;

    try {
      setIsAddingCust(true);
      const res = await axiosClient.post('/customers', newCust);
      if (res.data.success) {
        showToast('Customer added successfully!', 'success');
        setCustomers([res.data.data, ...customers]);
        setCustomerId(res.data.data._id);
        setIsCustomerModalOpen(false);
        setNewCust({ name: '', phone: '', email: '', address: '' });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add customer', 'error');
    } finally {
      setIsAddingCust(false);
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const numDiscount = Number(discount) || 0;
  const grandTotal = Math.max(0, Math.round((subtotal - numDiscount) * 100) / 100);

  const initialPaid = Math.min(grandTotal, Math.max(0, Number(initialPaidAmount) || 0));

  const pendingAmount = Math.max(0, Math.round((grandTotal - initialPaid) * 100) / 100);

  let calculatedStatus = 'Pending';
  if (initialPaid >= grandTotal && grandTotal > 0) {
    calculatedStatus = 'Paid';
  } else if (initialPaid > 0) {
    calculatedStatus = 'Partially Paid';
  }

  const selectedCustomerObj = customers.find(c => c._id === customerId);

  const handleSubmitInvoice = async (e) => {
    e.preventDefault();

    if (!customerId) {
      showToast('Please select or create a customer', 'error');
      return;
    }

    if (items.some(it => !it.serviceName || Number(it.qty) <= 0)) {
      showToast('Please ensure all line items have valid names and quantities', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        customerId,
        invoiceDate,
        dueDate,
        items,
        discount: numDiscount,
        initialPaidAmount: initialPaid,
        notes
      };

      if (isEditMode) {
        const res = await axiosClient.put(`/invoices/${id}`, payload);
        if (res.data.success) {
          showToast('Invoice updated successfully.', 'success');
          navigate(`/invoices/${id}`);
        }
      } else {
        const res = await axiosClient.post('/invoices', payload);
        if (res.data.success) {
          showToast('Invoice created successfully!', 'success');
          navigate(`/invoices/${res.data.data._id}`);
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || (isEditMode ? 'Failed to update invoice' : 'Failed to create invoice'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  if (loading) {
    return <LoadingSpinner fullPage text={isEditMode ? "Loading invoice details..." : "Loading invoice creator..."} />;
  }

  return (
    <div className="page-container">
      {/* Top Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={isEditMode ? `/invoices/${id}` : "/invoices"} style={{ fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <ArrowLeft size={16} /> {isEditMode ? 'Back to Invoice Details' : 'Back to Invoices'}
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>
          {isEditMode ? `Edit Invoice ${invoiceNumber ? `(${invoiceNumber})` : ''}` : 'Create New Invoice'}
        </h1>
      </div>

      <form onSubmit={handleSubmitInvoice}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '2rem' }} className="grid-create-invoice">
          
          {/* LEFT: Form Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Step 1: Customer Selection */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>1. Select Customer</h3>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setIsCustomerModalOpen(true)}
                >
                  <UserPlus size={16} /> Quick Add Customer
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <select
                  className="form-select"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Step 2: Invoice Dates */}
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>2. Invoice Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="grid-responsive-2">
                <div className="form-group">
                  <label className="form-label">Invoice Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Due Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Itemized Services */}
            <div className="card">
              <div className="card-header create-invoice-card-header">
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>3. Service Line Items</h3>
                <button type="button" className="btn btn-outline btn-sm" onClick={addItemRow}>
                  <Plus size={16} /> Add Item Row
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="invoice-item-card"
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    {/* Desktop View Line Item Row (>=768px) */}
                    <div className="desktop-item-row">
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px', gap: '0.75rem', alignItems: 'center' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Select / Item Name</label>
                          <select
                            className="form-select"
                            value={item.serviceId}
                            onChange={(e) => handleServiceSelect(idx, e.target.value)}
                            style={{ marginBottom: '4px' }}
                          >
                            <option value="">-- Choose Preset Service --</option>
                            {services.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name} ({formatCurrency(s.rate)})
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Or type custom item name..."
                            value={item.serviceName}
                            onChange={(e) => handleItemChange(idx, 'serviceName', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate (₹)</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-input"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount</label>
                          <div style={{ padding: '0.675rem 0.5rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'right' }}>
                            {formatCurrency(item.amount)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', paddingBottom: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeItemRow(idx)}
                            style={{ padding: '8px' }}
                            title="Remove Line Item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Mobile View Line Item Card (<768px) */}
                    <div className="mobile-item-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                          Item #{idx + 1}
                        </span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeItemRow(idx)}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', minHeight: '34px' }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ fontSize: '0.8125rem' }}>Select Preset Service</label>
                        <select
                          className="form-select"
                          value={item.serviceId}
                          onChange={(e) => handleServiceSelect(idx, e.target.value)}
                        >
                          <option value="">-- Choose Preset Service --</option>
                          {services.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.name} ({formatCurrency(s.rate)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ fontSize: '0.8125rem' }}>Item / Service Name *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Item or Service Name..."
                          value={item.serviceName}
                          onChange={(e) => handleItemChange(idx, 'serviceName', e.target.value)}
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem' }}>Qty *</label>
                          <input
                            type="number"
                            min="1"
                            className="form-input"
                            value={item.qty}
                            onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8125rem' }}>Rate (₹) *</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            className="form-input"
                            value={item.rate}
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Item Amount:</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1rem' }}>{formatCurrency(item.amount)}</span>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Item description (optional)..."
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        style={{ fontSize: '0.8125rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: Discount & Cash Received */}
            <div className="card">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                4. Discount & Cash Received
              </h3>
              <div style={{ marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Discount Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="form-input"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </div>
              </div>

              {!isEditMode && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Cash Received Right Now (₹)</label>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      step="any"
                      className="form-input"
                      value={initialPaidAmount}
                      onChange={(e) => setInitialPaidAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {isEditMode && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Cash Received So Far (₹)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formatCurrency(initialPaidAmount)}
                      disabled
                      style={{ opacity: 0.8, backgroundColor: 'var(--bg-tertiary)' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                      Historical cash received records remain intact.
                    </span>
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Invoice Notes / Footer Terms</label>
                <textarea
                  rows="2"
                  className="form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Live Summary & Calculation Card */}
          <div>
            <div className="card create-invoice-summary-card" style={{ position: 'sticky', top: '90px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                {isEditMode ? 'Edit Summary Preview' : 'Invoice Summary Preview'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9375rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <span style={{ fontWeight: 600 }}>{selectedCustomerObj ? selectedCustomerObj.name : 'Not Selected'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subtotal ({items.length} items):</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {numDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}>
                    <span>Discount:</span>
                    <span>- {formatCurrency(numDiscount)}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <span>Grand Total:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)', fontWeight: 600 }}>
                  <span>Cash Received:</span>
                  <span>{formatCurrency(initialPaid)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: pendingAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                  <span>Pending Cash:</span>
                  <span>{formatCurrency(pendingAmount)}</span>
                </div>

                <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  <span className={`badge ${calculatedStatus === 'Paid' ? 'badge-paid' : calculatedStatus === 'Partially Paid' ? 'badge-partially' : 'badge-pending'}`} style={{ width: '100%', justifyContent: 'center', padding: '0.5rem' }}>
                    Status: {calculatedStatus}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }} className="mobile-summary-actions">
                  <Link
                    to={isEditMode ? `/invoices/${id}` : "/invoices"}
                    className="btn btn-outline"
                    style={{ flex: 1, justifyContent: 'center', minHeight: '48px' }}
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ flex: 2, justifyContent: 'center', minHeight: '48px' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (isEditMode ? 'Saving Changes...' : 'Saving Invoice...') : (isEditMode ? 'Save Changes' : 'Save & Generate Invoice')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Quick Add Customer"
      >
        <form onSubmit={handleCreateCustomer}>
          <div className="form-group">
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              className="form-input"
              value={newCust.name}
              onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="text"
              className="form-input"
              value={newCust.phone}
              onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={newCust.email}
              onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
            />
          </div>
          <div className="modal-footer" style={{ paddingBottom: 0, paddingRight: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isAddingCust}>
              {isAddingCust ? 'Adding...' : 'Add & Select'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @media (min-width: 768px) {
          .desktop-item-row {
            display: block !important;
          }
          .mobile-item-card {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-item-row {
            display: none !important;
          }
          .mobile-item-card {
            display: block !important;
          }
          .grid-create-invoice {
            grid-template-columns: 1fr !important;
          }
          .grid-responsive-3, .grid-responsive-2 {
            grid-template-columns: 1fr !important;
          }
          .create-invoice-summary-card {
            position: static !important;
          }
        }
        @media (max-width: 550px) {
          .create-invoice-card-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          .create-invoice-card-header button {
            width: 100% !important;
            justify-content: center !important;
          }
          .mobile-summary-actions {
            flex-direction: column-reverse !important;
          }
          .mobile-summary-actions a,
          .mobile-summary-actions button {
            width: 100% !important;
            flex: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateInvoice;
