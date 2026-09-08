import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User as UserIcon, LogOut } from 'lucide-react';

const UtilityBar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  return (
    <div style={{
      backgroundColor: 'var(--color-near-black)',
      color: '#A0A0A0',
      fontSize: '0.6875rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      padding: '7px 0',
      borderBottom: '1px solid #222'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span>COMPLIMENTARY INDIA SHIPPING ON ORDERS ABOVE ₹2,999 • DISPATCH IN 48H</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>CURRENCY: <strong>INR (₹)</strong></span>
          <Link to="/cms/contact" style={{ color: '#A0A0A0' }}>CONCIERGE</Link>
          
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {isAdmin && (
                <Link to="/admin" style={{ color: 'var(--dizco-red)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={13} />
                  ADMIN PORTAL
                </Link>
              )}
              <Link to="/profile" style={{ color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <UserIcon size={12} />
                {user?.full_name?.split(' ')[0]}
              </Link>
              <button
                onClick={logout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A0A0A0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: 'inherit',
                  textTransform: 'uppercase'
                }}
              >
                <LogOut size={12} />
                LOGOUT
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <Link to="/login" style={{ color: '#FFFFFF' }}>SIGN IN</Link>
              <span>/</span>
              <Link to="/login?tab=register" style={{ color: '#FFFFFF' }}>JOIN</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UtilityBar;
