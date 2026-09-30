import React from 'react';
import { FolderOpen } from 'lucide-react';

const EmptyState = ({ title = 'No records found', description = 'There are no items to display right now.', icon: Icon = FolderOpen, actionButton = null }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3.5rem 1.5rem',
        textAlign: 'center',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px border-dashed var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        color: 'var(--text-muted)'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          color: 'var(--primary)'
        }}
      >
        <Icon size={28} />
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', marginBottom: actionButton ? '1.5rem' : 0 }}>
        {description}
      </p>
      {actionButton}
    </div>
  );
};

export default EmptyState;
