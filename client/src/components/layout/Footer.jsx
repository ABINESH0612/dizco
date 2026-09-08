import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { ArrowRight, ShieldCheck } from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');
  const { addToast } = useToast();

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      addToast('Thank you for subscribing to DIZCO Editorial Dispatches.', 'success');
      setEmail('');
    }
  };

  return (
    <footer style={{
      backgroundColor: 'var(--color-near-black)',
      color: '#A0A0A0',
      paddingTop: 'var(--space-8)',
      paddingBottom: 'var(--space-6)',
      borderTop: '1px solid #2A2A2A',
      marginTop: 'auto'
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-6)',
          marginBottom: 'var(--space-8)'
        }}>
          {/* Brand & Editorial Column */}
          <div style={{ gridColumn: 'span 1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <img
                src="/logo.png"
                alt="DIZCO Logo"
                style={{ width: '28px', height: '28px', borderRadius: '2px' }}
              />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em'
              }}>
                DIZCO<span style={{ color: 'var(--dizco-red)', fontSize: '0.9rem' }}>©</span>
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '20px', color: '#999999' }}>
              A luxury contemporary fashion house defined by structural silhouettes, architectural draping, and uncompromising material weight.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#CCCCCC', fontSize: '0.75rem' }}>
              <ShieldCheck size={16} color="var(--dizco-red)" />
              <span>SECURE RAZORPAY ENCRYPTION • 256-BIT SSL</span>
            </div>
          </div>

          {/* Collection Links */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.8125rem', letterSpacing: '0.08em', marginBottom: '16px' }}>
              COLLECTIONS
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><Link to="/shop?sort=newest" style={{ color: '#A0A0A0' }}>New Arrivals 2026</Link></li>
              <li><Link to="/shop?category=t-shirts" style={{ color: '#A0A0A0' }}>Heavyweight T-Shirts</Link></li>
              <li><Link to="/shop?category=pants-trousers" style={{ color: '#A0A0A0' }}>Pleated Trousers & Pants</Link></li>
              <li><Link to="/shop?category=outerwear" style={{ color: '#A0A0A0' }}>Architectural Outerwear</Link></li>
              <li><Link to="/shop?category=collections" style={{ color: '#A0A0A0' }}>Capsule Drop</Link></li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.8125rem', letterSpacing: '0.08em', marginBottom: '16px' }}>
              CONCIERGE & LEGAL
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <li><Link to="/cms/contact" style={{ color: '#A0A0A0' }}>Client Services & FAQ</Link></li>
              <li><Link to="/cms/about-us" style={{ color: '#A0A0A0' }}>Our Architecture & Story</Link></li>
              <li><Link to="/cms/privacy-policy" style={{ color: '#A0A0A0' }}>Privacy Policy</Link></li>
              <li><Link to="/cms/terms" style={{ color: '#A0A0A0' }}>Terms of Service</Link></li>
              <li><Link to="/login?mode=admin" style={{ color: '#E51B24', fontWeight: 600 }}>Staff Admin Portal</Link></li>
            </ul>
          </div>

          {/* Newsletter / Dispatches */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.8125rem', letterSpacing: '0.08em', marginBottom: '16px' }}>
              EDITORIAL DISPATCHES
            </h4>
            <p style={{ fontSize: '0.8125rem', lineHeight: '1.5', marginBottom: '12px' }}>
              Receive private notifications for limited edition capsule drops and runway presentations.
            </p>
            <form onSubmit={handleSubscribe} style={{ display: 'flex', gap: '4px' }}>
              <input
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: '#262626',
                  border: '1px solid #404040',
                  color: '#FFFFFF',
                  fontSize: '0.8125rem',
                  borderRadius: '2px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                className="btn btn-red"
                style={{ padding: '0 16px' }}
                aria-label="Subscribe"
              >
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          borderTop: '1px solid #222222',
          paddingTop: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          fontSize: '0.75rem'
        }}>
          <div>
            © {new Date().getFullYear()} DIZCO CLOTHING COMPANY. ALL RIGHTS RESERVED.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>INR (₹) SETTLEMENT</span>
            <span>DOMESTIC DISPATCH: 48 HOURS</span>
            <span>DESIGNED & ENGINEERED FOR HIGH-CONTRAST FASHION</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
