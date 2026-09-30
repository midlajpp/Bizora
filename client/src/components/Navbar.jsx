import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Menu, Plus, LogOut, Shield } from 'lucide-react';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar-header no-print">
      <div className="navbar-left">
        <button
          onClick={onToggleSidebar}
          className="btn btn-outline btn-sm mobile-toggle-btn"
          style={{ padding: '8px' }}
          title="Toggle Sidebar Menu"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-brand">
          <span className="navbar-logo-text">
            BIZ<span className="navbar-logo-accent">ORA</span>
          </span>
          {isAdmin && (
            <span className="badge badge-admin desktop-only-element" style={{ marginLeft: '0.25rem' }}>
              <Shield size={12} /> Admin
            </span>
          )}
        </div>
      </div>

      <div className="navbar-right">
        {/* Theme Toggle Component */}
        <ThemeToggle />

        {!isAdmin && (
          <Link to="/invoices/new" className="btn btn-primary btn-sm desktop-only-element">
            <Plus size={16} /> Create Invoice
          </Link>
        )}

        {user && (
          <div className="navbar-user">
            <Link
              to="/profile"
              className="navbar-profile-link"
              title="My Profile"
            >
              <div className="navbar-avatar">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="navbar-user-info desktop-only-element">
                <span className="navbar-user-name">
                  {user.businessName || user.name}
                </span>
                <span className="navbar-user-email">
                  {user.email}
                </span>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="btn btn-outline btn-sm desktop-only-element"
              title="Sign Out"
              style={{ padding: '8px', color: 'var(--text-muted)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
