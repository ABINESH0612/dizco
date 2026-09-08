import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../services/api';
import ProductCard from '../../components/common/ProductCard';
import { ArrowRight, Sparkles, ShieldCheck, RefreshCw, Truck } from 'lucide-react';

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          catalogApi.getFeaturedProducts(8),
          catalogApi.getCategories()
        ]);
        setFeaturedProducts(prodRes.data);
        setCategories(catRes.data);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="home-page">
      {/* 1. EDITORIAL HERO SECTION */}
      <section style={{
        position: 'relative',
        backgroundColor: '#0A0A0A',
        color: '#FFFFFF',
        minHeight: '82vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Background Editorial Collage / High-Fashion Image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(to right, rgba(10, 10, 10, 0.92) 35%, rgba(10, 10, 10, 0.4) 100%), url("https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1920&q=85")',
          backgroundSize: 'cover',
          backgroundPosition: 'center 20%',
          opacity: 0.85,
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 2, padding: 'var(--space-8) var(--space-3)' }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="badge badge-red" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                AUTUMN / WINTER 2026
              </span>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#CCCCCC', textTransform: 'uppercase' }}>
                MONOCHROME EDITORIAL
              </span>
            </div>

            <h1 className="display-1" style={{ color: '#FFFFFF', marginBottom: '24px', lineHeight: 1.05 }}>
              UNCOMPROMISED <br />
              <span style={{ color: 'var(--dizco-red)' }}>SILHOUETTES.</span>
            </h1>

            <p style={{ fontSize: '1.125rem', color: '#CCCCCC', lineHeight: 1.6, marginBottom: '32px', maxWidth: '540px' }}>
              Structural drape meets streetwear discipline. Engineered from 280+ GSM combed heavyweight cotton, tailored wool-blend twill, and architectural outerwear.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link to="/shop?sort=newest" className="btn btn-red" style={{ padding: '16px 36px', fontSize: '0.9375rem' }}>
                EXPLORE COLLECTION <ArrowRight size={18} />
              </Link>
              <Link to="/shop?category=t-shirts" className="btn btn-secondary" style={{ color: '#FFFFFF', borderColor: '#FFFFFF', padding: '16px 28px' }}>
                SHOP T-SHIRTS
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY HORIZONTAL STRIP */}
      <section style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="container" style={{ padding: 'var(--space-4) var(--space-3)' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-2)'
          }}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  transition: 'border-color var(--transition-fast), transform var(--transition-fast)'
                }}
              >
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: '2px' }}
                />
                <div>
                  <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {cat.name}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--dizco-red)', fontWeight: 600 }}>
                    DISCOVER →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS (4-COLUMN GRID) */}
      <section style={{ padding: 'var(--space-8) 0' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'var(--space-4)',
            borderBottom: '2px solid var(--color-black)',
            paddingBottom: '16px'
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--dizco-red)', textTransform: 'uppercase' }}>
                CURRENT CAPSULE
              </span>
              <h2 className="display-2" style={{ marginTop: '4px' }}>
                FEATURED PIECES
              </h2>
            </div>
            <Link to="/shop" style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-black)'
            }}>
              VIEW ALL EDITIONS <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-mid-gray)' }}>
              Curating runway items...
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.slice(0, 8).map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. EDITORIAL STORY MODULE */}
      <section style={{ backgroundColor: 'var(--color-surface)', padding: 'var(--space-8) 0' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'center'
          }}>
            <div style={{ position: 'relative', minHeight: '480px' }}>
              <img
                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85"
                alt="DIZCO Editorial Studio"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '560px',
                  objectFit: 'cover',
                  borderRadius: '2px'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                right: '-10px',
                backgroundColor: 'var(--dizco-red)',
                color: '#FFFFFF',
                padding: '16px 24px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.05em'
              }}>
                STUDIO CRAFT 2026
              </div>
            </div>

            <div style={{ padding: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--dizco-red)', textTransform: 'uppercase' }}>
                PHILOSOPHY & PROPORTION
              </span>
              <h3 style={{ fontSize: '2.25rem', marginTop: '8px', marginBottom: '20px', lineHeight: 1.2 }}>
                FASHION WITHOUT PERISHABLE TRENDS.
              </h3>
              <p style={{ fontSize: '1rem', color: 'var(--color-dark-gray)', lineHeight: 1.7, marginBottom: '20px' }}>
                DIZCO rejects disposable fast fashion. Every silhouette is precision-drafted with architectural geometry: heavy rib collars that never ripple, trousers calibrated to break cleanly over footwear, and raw hems engineered to fray intentionally.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                <div style={{ borderLeft: '2px solid var(--color-black)', paddingLeft: '12px' }}>
                  <h4 style={{ fontSize: '1.25rem' }}>280 GSM</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>Ultra Heavy Combed Cotton</span>
                </div>
                <div style={{ borderLeft: '2px solid var(--dizco-red)', paddingLeft: '12px' }}>
                  <h4 style={{ fontSize: '1.25rem' }}>100% GOTS</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>Certified Organic Fabrics</span>
                </div>
              </div>
              <Link to="/cms/about-us" className="btn btn-primary">
                READ THE ARCHIFESTO
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SEASONAL CAPSULE SHOWCASE (3 DARK PANELS) */}
      <section style={{ backgroundColor: 'var(--color-black)', color: '#FFFFFF', padding: 'var(--space-8) 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)', maxWidth: '640px', margin: '0 auto var(--space-6) auto' }}>
            <span style={{ color: 'var(--dizco-red)', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 700, textTransform: 'uppercase' }}>
              LIMITED EDITION DROPS
            </span>
            <h2 className="display-2" style={{ color: '#FFFFFF', marginTop: '6px' }}>
              SEASONAL TRIPTYCH
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-3)'
          }}>
            {/* Panel 1 */}
            <div style={{ position: 'relative', height: '440px', overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=85"
                alt="Outerwear Series"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--dizco-red)', fontWeight: 700, letterSpacing: '0.1em' }}>01 / OUTERWEAR</span>
                <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '4px 0 12px 0' }}>The Cocoon Coat</h3>
                <Link to="/shop?category=outerwear" className="btn btn-secondary btn-sm" style={{ color: '#FFF', borderColor: '#FFF', alignSelf: 'flex-start' }}>
                  EXPLORE PIECES
                </Link>
              </div>
            </div>

            {/* Panel 2 */}
            <div style={{ position: 'relative', height: '440px', overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=800&q=85"
                alt="Pleated Trousers Series"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--dizco-red)', fontWeight: 700, letterSpacing: '0.1em' }}>02 / BOTTOMS</span>
                <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '4px 0 12px 0' }}>Architectural Pleats</h3>
                <Link to="/shop?category=pants-trousers" className="btn btn-secondary btn-sm" style={{ color: '#FFF', borderColor: '#FFF', alignSelf: 'flex-start' }}>
                  EXPLORE PIECES
                </Link>
              </div>
            </div>

            {/* Panel 3 */}
            <div style={{ position: 'relative', height: '440px', overflow: 'hidden' }}>
              <img
                src="https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=85"
                alt="Heavyweight Tees Series"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end'
              }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--dizco-red)', fontWeight: 700, letterSpacing: '0.1em' }}>03 / BASICS</span>
                <h3 style={{ fontSize: '1.25rem', color: '#FFFFFF', margin: '4px 0 12px 0' }}>Monolith Boxy Tee</h3>
                <Link to="/shop?category=t-shirts" className="btn btn-secondary btn-sm" style={{ color: '#FFF', borderColor: '#FFF', alignSelf: 'flex-start' }}>
                  EXPLORE PIECES
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BRAND VALUE PROPOSITION STRIP */}
      <section style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-6) 0' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Truck size={28} color="var(--dizco-red)" />
              <h4 style={{ fontSize: '0.9375rem' }}>COMPLIMENTARY SHIPPING</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)' }}>On all domestic orders above ₹2,999</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={28} color="var(--dizco-red)" />
              <h4 style={{ fontSize: '0.9375rem' }}>SECURE RAZORPAY SETTLEMENT</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)' }}>UPI, Credit Cards, NetBanking, INR</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={28} color="var(--dizco-red)" />
              <h4 style={{ fontSize: '0.9375rem' }}>7-DAY EXCHANGE POLICY</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)' }}>Hassle-free size exchanges across India</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={28} color="var(--dizco-red)" />
              <h4 style={{ fontSize: '0.9375rem' }}>CRAFTED TO LAST</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)' }}>Tested against deformation & wear</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
