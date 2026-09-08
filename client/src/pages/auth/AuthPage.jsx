import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User as UserIcon, Lock, ArrowRight, CheckCircle } from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginCustomer, loginAdmin, registerCustomer, isAuthenticated, isAdmin } = useAuth();

  // Mode: 'customer' or 'admin'
  const initialMode = searchParams.get('mode') === 'admin' ? 'admin' : 'customer';
  const initialAction = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const [mode, setMode] = useState(initialMode);
  const [action, setAction] = useState(initialAction); // 'login' or 'register'
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const redirectUrl = searchParams.get('redirect') || (mode === 'admin' ? '/admin' : '/');

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin && mode === 'admin') {
        navigate('/admin');
      } else {
        navigate(redirectUrl);
      }
    }
  }, [isAuthenticated, isAdmin, navigate, redirectUrl, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'admin') {
        await loginAdmin(email, password);
        navigate('/admin');
      } else {
        if (action === 'login') {
          await loginCustomer(email, password);
          navigate(redirectUrl);
        } else {
          await registerCustomer({
            email,
            password,
            full_name: fullName,
            phone: phone || undefined,
          });
          navigate(redirectUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: 'var(--space-8) 0', minHeight: '80vh', backgroundColor: '#FAFAFA' }}>
      <div className="container" style={{ maxWidth: '480px' }}>
        {/* Mode Selector Tabs: Customer vs Admin */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          marginBottom: '20px',
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}>
          <button
            type="button"
            onClick={() => { setMode('customer'); setAction('login'); }}
            style={{
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mode === 'customer' ? 'var(--color-black)' : 'transparent',
              color: mode === 'customer' ? '#FFFFFF' : 'var(--color-black)',
              transition: 'all 0.2s',
            }}
          >
            <UserIcon size={14} /> CUSTOMER PORTAL
          </button>

          <button
            type="button"
            onClick={() => { setMode('admin'); setAction('login'); }}
            style={{
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontFamily: 'var(--font-display)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: mode === 'admin' ? 'var(--dizco-red)' : 'transparent',
              color: mode === 'admin' ? '#FFFFFF' : 'var(--color-black)',
              transition: 'all 0.2s',
            }}
          >
            <ShieldCheck size={14} /> ADMIN PORTAL
          </button>
        </div>

        {/* Main Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: 'var(--space-4) var(--space-4)',
          borderRadius: '2px',
          boxShadow: 'var(--shadow-md)',
          borderTop: mode === 'admin' ? '4px solid var(--dizco-red)' : '4px solid var(--color-black)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src="/logo.png"
              alt="DIZCO"
              style={{ width: '42px', height: '42px', margin: '0 auto 12px auto', borderRadius: '4px' }}
            />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>
              {mode === 'admin'
                ? 'STAFF ADMINISTRATION'
                : action === 'login'
                ? 'CUSTOMER SIGN IN'
                : 'CREATE ACCOUNT'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)' }}>
              {mode === 'admin'
                ? 'Authorized personnel only. Sessions are audited.'
                : action === 'login'
                ? 'Access your saved bag, orders, and express checkout.'
                : 'Join DIZCO for exclusive drops and runway dispatches.'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {action === 'register' && mode === 'customer' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Aarav Sharma"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder={mode === 'admin' ? 'admin@dizco.com' : 'you@example.com'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password *</label>
                {action === 'login' && mode === 'customer' && (
                  <Link
                    to="/forgot-password"
                    style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textDecoration: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-mid-gray)'}
                  >
                    Forgot Password?
                  </Link>
                )}
              </div>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Quick Demo Credentials hint */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              padding: '10px 12px',
              borderRadius: '2px',
              fontSize: '0.75rem',
              color: 'var(--color-dark-gray)',
              marginBottom: '18px',
            }}>
              {mode === 'admin' ? (
                <>
                  <strong>Demo Admin:</strong> <code>admin@dizco.com</code> / <code>Admin@123456</code>
                </>
              ) : (
                <>
                  <strong>Demo Customer:</strong> <code>customer@dizco.com</code> / <code>Customer@123456</code>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`btn btn-block ${mode === 'admin' ? 'btn-red' : 'btn-primary'}`}
              style={{ padding: '14px' }}
            >
              {loading
                ? 'AUTHENTICATING...'
                : mode === 'admin'
                ? 'SIGN IN AS ADMINISTRATOR'
                : action === 'login'
                ? 'SIGN IN'
                : 'CREATE DIZCO ACCOUNT'}
            </button>
          </form>

          {/* Toggle between Customer Login and Register */}
          {mode === 'customer' && (
            <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)', fontSize: '0.8125rem' }}>
              {action === 'login' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setAction('register')}
                    style={{ background: 'none', border: 'none', fontWeight: 700, color: 'var(--dizco-red)', cursor: 'pointer' }}
                  >
                    JOIN DIZCO
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    onClick={() => setAction('login')}
                    style={{ background: 'none', border: 'none', fontWeight: 700, color: 'var(--dizco-red)', cursor: 'pointer' }}
                  >
                    SIGN IN
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
