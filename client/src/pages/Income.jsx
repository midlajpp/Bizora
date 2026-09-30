import React, { useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { TrendingUp, Calendar, Users, Briefcase } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS = ['#10b981', '#6366f1', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const Income = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('month');

  const { showToast } = useToast();

  useEffect(() => {
    fetchIncomeData();
  }, [startDate, endDate, groupBy]);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const params = { groupBy };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axiosClient.get('/reports/income', { params });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load cash inflow reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0);
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Generating cash inflow insights..." />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>Cash Inflow Analytics</h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>
            Realized cash inflow based on actual cash received from clients
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }} className="grid-responsive-3">
          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Timeline Grouping</label>
            <select
              className="form-select"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="month">Monthly View</option>
              <option value="day">Daily View</option>
              <option value="year">Yearly View</option>
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>From Date</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>To Date</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Income Stat Banner */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          title="Total Cash Inflow"
          value={formatCurrency(data?.totalIncome)}
          subtitle="Sum of cleared cash received entries"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Active Paying Clients"
          value={`${data?.incomeByCustomer?.length || 0} Clients`}
          subtitle="Customers contributing to cash flow"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Top Performing Service"
          value={data?.incomeByService?.[0]?.name || 'N/A'}
          subtitle={data?.incomeByService?.[0] ? formatCurrency(data.incomeByService[0].amount) : 'No data'}
          icon={Briefcase}
          color="blue"
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }} className="grid-responsive">
        
        {/* Timeline Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cash Inflow Growth Timeline</h3>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>By {groupBy}</span>
          </div>

          {!data?.timelineData || data.timelineData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>No timeline data available for date range</div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                    formatter={(val) => [formatCurrency(val), 'Cash Received']}
                  />
                  <Bar dataKey="income" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Income By Service Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cash Received by Service</h3>
          </div>

          {!data?.incomeByService || data.incomeByService.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>No service data</div>
          ) : (
            <div style={{ width: '100%', height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="200">
                <PieChart>
                  <Pie data={data.incomeByService} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={4}>
                    {data.incomeByService.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                    formatter={(val) => [formatCurrency(val), 'Cash Received']}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', fontSize: '0.75rem' }}>
                {data.incomeByService.slice(0, 4).map((srv, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span style={{ color: 'var(--text-muted)' }}>{srv.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="grid-responsive">
        
        {/* Income by Customer Table */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cash Received by Customer</h3>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th style={{ textAlign: 'right' }}>Total Cash Received</th>
                </tr>
              </thead>
              <tbody>
                {data?.incomeByCustomer?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Income by Service Table */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Cash Received by Service</h3>
          </div>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th style={{ textAlign: 'right' }}>Total Attributed</th>
                </tr>
              </thead>
              <tbody>
                {data?.incomeByService?.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Income;
