import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart3,
  TrendingUp,
  FileText,
  Clock,
  Printer,
  Calendar,
  Filter
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#fbbf24', '#f87171', '#94a3b8'];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);

  // Report States
  const [incomeReport, setIncomeReport] = useState(null);
  const [invoiceReport, setInvoiceReport] = useState(null);
  const [pendingReport, setPendingReport] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [activeTab, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      if (activeTab === 'summary' || activeTab === 'income') {
        const res = await axiosClient.get('/reports/income', { params });
        if (res.data.success) setIncomeReport(res.data.data);
      }
      if (activeTab === 'summary' || activeTab === 'invoice') {
        const res = await axiosClient.get('/reports/invoice');
        if (res.data.success) setInvoiceReport(res.data.data);
      }
      if (activeTab === 'summary' || activeTab === 'pending') {
        const res = await axiosClient.get('/reports/pending');
        if (res.data.success) setPendingReport(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load report metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const invoicePieData = invoiceReport ? [
    { name: 'Paid', value: invoiceReport.statusCounts.Paid || 0 },
    { name: 'Partially Paid', value: invoiceReport.statusCounts['Partially Paid'] || 0 },
    { name: 'Pending', value: invoiceReport.statusCounts.Pending || 0 },
    { name: 'Cancelled', value: invoiceReport.statusCounts.Cancelled || 0 }
  ] : [];

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Financial & Operational Reports</h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Comprehensive statements for cash received, invoice status, and pending cash collections
          </p>
        </div>

        <button className="btn btn-outline btn-sm no-print" onClick={handlePrint}>
          <Printer size={16} /> Print Report Statement
        </button>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {[
          { id: 'summary', name: 'Executive Summary', icon: BarChart3 },
          { id: 'income', name: 'Cash Received Report', icon: TrendingUp },
          { id: 'invoice', name: 'Invoice Report', icon: FileText },
          { id: 'pending', name: 'Pending Cash Report', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderColor: isActive ? 'var(--primary)' : 'transparent',
                padding: '0.625rem 1rem'
              }}
            >
              <Icon size={16} /> {tab.name}
            </button>
          );
        })}
      </div>

      {/* Optional Date Filter bar */}
      {activeTab === 'income' && (
        <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }} className="report-filter-bar">
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={16} /> Filter Date Range:
            </span>
            <input
              type="date"
              className="form-input report-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '180px' }}
            />
            <span style={{ color: 'var(--text-subtle)' }}>to</span>
            <input
              type="date"
              className="form-input report-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: '180px' }}
            />
            {(startDate || endDate) && (
              <button className="btn btn-outline btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
                Reset Dates
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner text="Generating report calculations..." />
      ) : (
        <>
          {/* Executive Summary View */}
          {activeTab === 'summary' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="stats-grid">
                <div className="stat-card">
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Cash Received</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(incomeReport?.totalIncome)}</h3>
                  </div>
                  <TrendingUp size={28} color="var(--primary)" />
                </div>
                <div className="stat-card">
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Billed</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{formatCurrency(invoiceReport?.totalBilled)}</h3>
                  </div>
                  <FileText size={28} color="var(--primary)" />
                </div>
                <div className="stat-card">
                  <div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Pending Cash</span>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)' }}>{formatCurrency(pendingReport?.totalPending)}</h3>
                  </div>
                  <Clock size={28} color="var(--warning)" />
                </div>
              </div>

              {/* Status Breakdown & Timeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-responsive">
                <div className="card">
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Invoice Status Distribution</h3>
                  <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={invoicePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={4}>
                          {invoicePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Pending Cash Breakdown</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    Currently <strong>{pendingReport?.count || 0} invoices</strong> have open pending cash balances.
                  </p>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>
                    {formatCurrency(pendingReport?.totalPending)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cash Received Tab */}
          {activeTab === 'income' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Cash Received Statement</h3>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.125rem' }}>
                  Total Received: {formatCurrency(incomeReport?.totalIncome)}
                </span>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>Customer Cash Breakdown</h4>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th style={{ textAlign: 'right' }}>Total Cash Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeReport?.incomeByCustomer?.map((c, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Tab */}
          {activeTab === 'invoice' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Invoice Status Report</h3>
                <span>Total Invoices Generated: <strong>{invoiceReport?.totalInvoices}</strong></span>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Invoice Count</th>
                      <th style={{ textAlign: 'right' }}>Total Billed Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Paid', 'Partially Paid', 'Pending', 'Cancelled'].map((status) => (
                      <tr key={status}>
                        <td>
                          <span className={`badge ${status === 'Paid' ? 'badge-paid' : status === 'Partially Paid' ? 'badge-partially' : status === 'Pending' ? 'badge-pending' : 'badge-cancelled'}`}>
                            {status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{invoiceReport?.statusCounts[status] || 0}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(invoiceReport?.statusAmounts[status])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pending Cash Tab */}
          {activeTab === 'pending' && (
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pending Cash Collection Report</h3>
                <span style={{ fontWeight: 800, color: 'var(--warning)', fontSize: '1.125rem' }}>
                  Total Pending Cash: {formatCurrency(pendingReport?.totalPending)}
                </span>
              </div>

              {!pendingReport?.invoices || pendingReport.invoices.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>
                  🎉 Great news! There are zero pending cash balances.
                </p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Invoice #</th>
                        <th>Due Date</th>
                        <th>Total Amount</th>
                        <th>Cash Received</th>
                        <th>Pending Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingReport.invoices.map((inv) => (
                        <tr key={inv._id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{inv.customerId?.name || 'Customer'}</td>
                          <td>{inv.invoiceNumber}</td>
                          <td style={{ color: 'var(--warning)' }}>{formatDate(inv.dueDate)}</td>
                          <td>{formatCurrency(inv.total)}</td>
                          <td style={{ color: 'var(--primary)' }}>{formatCurrency(inv.paidAmount)}</td>
                          <td style={{ color: 'var(--danger)', fontWeight: 800 }}>{formatCurrency(inv.pendingAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        @media (max-width: 900px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .report-filter-bar {
            flex-direction: column;
            align-items: stretch !important;
          }
          .report-date-input {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Reports;
