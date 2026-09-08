import React from 'react';
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Tag,
  MessageSquare,
} from 'lucide-react';

const AdminLayout = () => {
  const { user, isAdmin, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center' }}>Authenticating admin session...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '480px' }}>
        <ShieldCheck size={48} color="var(--dizco-red)" style={{ margin: '0 auto 16px auto' }} />
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--color-mid-gray)', margin: '12px 0 24px 0' }}>
          This operational portal is reserved for DIZCO administrators only.
        </p>
        <button onClick={() => navigate('/login?mode=admin')} className="btn btn-primary">
          SIGN IN AS ADMINISTRATOR
        </button>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} />, end: true },
    { label: 'Products', path: '/admin/products', icon: <Package size={18} /> },
    { label: 'Categories', path: '/admin/categories', icon: <FolderTree size={18} /> },
    { label: 'Orders', path: '/admin/orders', icon: <ShoppingBag size={18} /> },
    { label: 'Customers', path: '/admin/customers', icon: <Users size={18} /> },
    { label: 'Coupons', path: '/admin/coupons', icon: <Tag size={18} /> },
    { label: 'Reviews', path: '/admin/reviews', icon: <MessageSquare size={18} /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="admin-shell">
      {/* Left Sidebar */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #222222', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo.png" alt="DIZCO Admin" style={{ width: '30px', height: '30px', borderRadius: '3px' }} />
          <div>
            <h3 style={{ color: '#FFFFFF', fontSize: '1.125rem', letterSpacing: '-0.02em', lineHeight: 1 }}>
              DIZCO<span style={{ color: 'var(--dizco-red)', fontSize: '0.8rem' }}>•ADMIN</span>
            </h3>
            <span style={{ fontSize: '0.6875rem', color: '#888', letterSpacing: '0.05em' }}>
              OPERATIONS v1.0
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '2px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                backgroundColor: isActive ? 'var(--dizco-red)' : 'transparent',
                transition: 'background-color 0.15s ease',
              })}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ padding: '16px', borderTop: '1px solid #222222' }}>
          <Link
            to="/"
            target="_blank"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              fontSize: '0.75rem',
              color: '#9CA3AF',
              border: '1px solid #333333',
              borderRadius: '2px',
              marginBottom: '10px',
            }}
          >
            <ExternalLink size={13} /> View Live Storefront
          </Link>
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              fontSize: '0.75rem',
              color: '#EF4444',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <LogOut size={13} /> End Admin Session
          </button>
        </div>
      </aside>

      {/* Main Operational Canvas */}
      <main className="admin-main">
        {/* Top Operational Bar */}
        <header style={{
          height: '60px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
        }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-mid-gray)' }}>
            Logged in as: <strong style={{ color: 'var(--color-black)' }}>{user?.full_name}</strong> ({user?.email})
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%' }} />
            <span>FastAPI Server Connected</span>
          </div>
        </header>

        {/* Route View */}
        <div style={{ padding: '28px', flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
