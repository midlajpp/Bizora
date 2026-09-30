import React from 'react';

const SkeletonLoader = ({ type = 'cards', count = 3 }) => {
  if (type === 'cards') {
    return (
      <div className="stats-grid">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="card" style={{ height: '110px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="skeleton" style={{ height: '16px', width: '40%' }} />
            <div className="skeleton" style={{ height: '32px', width: '70%' }} />
            <div className="skeleton" style={{ height: '12px', width: '50%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton" style={{ height: '24px', width: '30%' }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '40px', width: '100%' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="card" style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="skeleton" style={{ height: '40px', width: '80%' }} />
    </div>
  );
};

export default SkeletonLoader;
