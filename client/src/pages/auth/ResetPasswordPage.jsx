import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Lock, CheckCircle, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is missing from URL. Please use the link provided in your email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" style={{ padding: 'var(--space-8) 0', minHeight: '80vh', backgroundColor: '#FAFAFA' }}>
      <div className="container" style={{ maxWidth: '480px' }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: 'var(--space-4) var(--space-4)',
          borderRadius: '2px',
          boxShadow: 'var(--shadow-md)',
          borderTop: '4px solid var(--color-black)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img
              src="/logo.png"
              alt="DIZCO"
              style={{ width: '42px', height: '42px', margin: '0 auto 12px auto', borderRadius: '4px' }}
            />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '6px', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
              Create New Password
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
              Choose a strong password to safeguard your DIZCO profile and orders.
            </p>
          </div>

          {!token && !success && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '2px',
              color: '#991B1B',
              fontSize: '0.8125rem',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <AlertCircle size={16} /> Missing Reset Token
              </div>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                No reset token was found in the link. Please ensure you clicked the complete link in your email or request a new reset link.
              </p>
              <Link
                to="/forgot-password"
                className="btn btn-outline btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: '4px', textDecoration: 'none' }}
              >
                Request New Link
              </Link>
            </div>
          )}

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '2px',
              color: '#991B1B',
              fontSize: '0.8125rem',
              marginBottom: '20px',
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: '16px 0 8px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                marginBottom: '16px'
              }}>
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>
                Password Updated
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', lineHeight: 1.6, marginBottom: '24px' }}>
                Your password has been successfully updated. You can now sign in with your new credentials.
              </p>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="btn btn-primary btn-block"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Sign In Now <ArrowRight size={16} />
              </button>
            </div>
          ) : token ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '36px' }}
                  />
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-mid-gray)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', marginTop: '4px', display: 'block' }}>
                  Must be at least 6 characters
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: '36px' }}
                  />
                  <KeyRound
                    size={16}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--color-mid-gray)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading || !password || !confirmPassword}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link
                  to="/login"
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-mid-gray)',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-mid-gray)'}
                >
                  Cancel and return to Sign In
                </Link>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
