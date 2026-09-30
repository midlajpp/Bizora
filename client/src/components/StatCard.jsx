import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'emerald' }) => {
  const colorMap = {
    emerald: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
    indigo: { bg: 'rgba(37, 99, 235, 0.15)', text: '#2563eb' },
    blue: { bg: 'rgba(37, 99, 235, 0.15)', text: '#2563eb' },
    amber: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    rose: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' },
    cyan: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4' }
  };

  const style = colorMap[color] || colorMap.emerald;

  return (
    <div className="stat-card">
      <div>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {title}
        </span>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-main)' }}>
          {value}
        </h3>
        {subtitle && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
            {subtitle}
          </p>
        )}
      </div>
      {Icon && (
        <div className="stat-icon" style={{ backgroundColor: style.bg, color: style.text }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
