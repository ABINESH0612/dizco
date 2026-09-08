import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../services/api';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Shield } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Unable to dispatch reset instructions. Please check your connection.');
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
              Reset Password
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)', lineHeight: 1.5 }}>
              Enter your registered email address and we'll send you secure instructions to restore access.
            </p>
          </div>

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

          {submitted ? (
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
                Instructions Dispatched
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', lineHeight: 1.6, marginBottom: '24px' }}>
                If an account exists for <strong style={{ color: 'var(--color-black)' }}>{email}</strong>, a secure reset link has been dispatched to your inbox.
              </p>
              <div style={{
                backgroundColor: 'var(--color-surface)',
                padding: '14px',
                borderRadius: '2px',
                fontSize: '0.75rem',
                color: 'var(--color-mid-gray)',
                lineHeight: 1.5,
                marginBottom: '24px',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: 600, color: 'var(--color-black)', marginBottom: '4px' }}>Security Notice:</div>
                Password reset tokens expire after 2 hours. If you do not see the dispatch in your main inbox, please verify your spam or junk folder.
              </div>

              <Link
                to="/login"
                className="btn btn-primary btn-block"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textDecoration: 'none'
                }}
              >
                <ArrowLeft size={16} /> Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  Registered Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingRight: '36px' }}
                  />
                  <Mail
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
                disabled={loading || !email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  marginBottom: '20px'
                }}
              >
                {loading ? 'Dispatching Reset Link...' : 'Send Reset Link'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8125rem',
                    color: 'var(--color-mid-gray)',
                    textDecoration: 'none',
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-black)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-mid-gray)'}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
