import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  CreditCard,
  TrendingUp,
  Receipt,
  BarChart3,
  User,
  Shield,
  UserCheck,
  PlusCircle,
  Settings,
  LogOut,
  X
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  const userNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Services', path: '/services', icon: Briefcase },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Cash Received', path: '/payments', icon: CreditCard },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Profile', path: '/profile', icon: User }
  ];

  const adminNavItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: Shield },
    { name: 'Users', path: '/admin/users', icon: UserCheck },
    { name: 'Invoices', path: '/admin/invoices', icon: FileText },
    { name: 'Cash Received', path: '/admin/payments', icon: CreditCard },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/profile', icon: Settings }
  ];

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-backdrop no-print"
        />
      )}

      <aside
        className={`sidebar-drawer ${isOpen ? 'is-open' : ''} no-print`}
      >
        {/* Mobile Header Inside Open Drawer */}
        <div className="sidebar-mobile-header" style={{ padding: '0.875rem 1rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)'
            }}
            title="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
          <div
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-subtle)'
            }}
          >
            {isAdmin ? 'ADMIN PANEL' : 'MAIN MENU'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9375rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all var(--transition-fast)'
                })}
              >
                <Icon size={18} style={{ color: 'inherit' }} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <button
            onClick={handleLogout}
            className="mobile-logout-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--danger)',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              marginTop: '0.5rem'
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        {!isAdmin && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <NavLink
              to="/invoices/new"
              onClick={onClose}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <PlusCircle size={18} /> Quick Invoice
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
