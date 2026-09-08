import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { Search, ShoppingBag, User, Menu, X, ArrowRight, Heart } from 'lucide-react';

const Header = () => {
  const { cartCount, openCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navLinks = [
    { label: 'NEW ARRIVALS', path: '/shop?sort=newest' },
    { label: 'T-SHIRTS', path: '/shop?category=t-shirts' },
    { label: 'PANTS & TROUSERS', path: '/shop?category=pants-trousers' },
    { label: 'OUTERWEAR', path: '/shop?category=outerwear' },
    { label: 'COLLECTIONS', path: '/shop?category=collections' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 900,
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--color-border)',
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--color-black)'
          }}
          className="mobile-nav-toggle"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo.png"
            alt="DIZCO Brand Logo"
            style={{
              height: '38px',
              width: '38px',
              objectFit: 'contain',
              borderRadius: '4px'
            }}
          />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--color-black)',
            lineHeight: 1
          }}>
            DIZCO<span style={{ color: 'var(--dizco-red)', fontSize: '1.2rem', verticalAlign: 'super' }}>©</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          {navLinks.map((link) => {
            const isActive = location.search.includes(link.path.split('?')[1]);
            return (
              <Link
                key={link.label}
                to={link.path}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: isActive ? 'var(--dizco-red)' : 'var(--color-black)',
                  position: 'relative',
                  padding: '4px 0'
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls: Search, Account, Cart */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Search Bar Toggle */}
          {searchOpen ? (
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search products, styles, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  padding: '6px 32px 6px 12px',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--color-black)',
                  borderRadius: '2px',
                  width: '220px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                style={{
                  position: 'absolute',
                  right: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-mid-gray)'
                }}
              >
                <X size={16} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-black)', padding: '6px' }}
              aria-label="Search"
            >
              <Search size={20} />
            </button>
          )}

          {/* User Profile / Login */}
          <Link
            to={isAuthenticated ? (isAdmin ? '/admin' : '/profile') : '/login'}
            style={{ color: 'var(--color-black)', display: 'flex', alignItems: 'center', padding: '6px' }}
            aria-label="Account"
          >
            <User size={20} />
          </Link>

          {/* Wishlist Link & Badge */}
          <Link
            to="/wishlist"
            style={{
              color: 'var(--color-black)',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              position: 'relative',
            }}
            aria-label="Wishlist"
          >
            <Heart size={20} />
            {wishlistCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-4px',
                backgroundColor: 'var(--dizco-red)',
                color: '#fff',
                fontSize: '0.625rem',
                fontWeight: 700,
                height: '18px',
                minWidth: '18px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1
              }}>
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Cart Icon & Badge */}
          <button
            onClick={openCart}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-black)',
              padding: '6px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label="View Shopping Cart"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-4px',
                backgroundColor: 'var(--dizco-red)',
                color: '#fff',
                fontSize: '0.625rem',
                fontWeight: 700,
                height: '18px',
                minWidth: '18px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1
              }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div style={{
          position: 'fixed',
          top: 'var(--header-height)',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FFFFFF',
          zIndex: 899,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #F0F0F0'
                }}
              >
                {link.label}
                <ArrowRight size={18} color="var(--color-muted)" />
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Link
              to="/wishlist"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary btn-block"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Heart size={16} /> WISHLIST ({wishlistCount})
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-secondary btn-block"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ShoppingBag size={16} /> SHOPPING BAG ({cartCount})
            </Link>
            {isAuthenticated ? (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-block"
              >
                MY ACCOUNT ({user?.full_name})
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary btn-block"
              >
                SIGN IN / REGISTER
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Inline styles for responsive media queries */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-nav-toggle {
            display: block !important;
          }
        }
      `}</style>
    </header>
  );
};

export default Header;
