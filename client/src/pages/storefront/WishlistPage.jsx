import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import ProductCard from '../../components/common/ProductCard';

const WishlistPage = () => {
  const { wishlist, clearWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <Heart size={32} color="var(--color-mid-gray)" />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '12px' }}>
          YOUR WISHLIST IS EMPTY
        </h2>
        <p style={{ color: 'var(--color-mid-gray)', maxWidth: '440px', margin: '0 auto 32px' }}>
          Save your favorite garments here for future reference or until your size is ready to order.
        </p>
        <Link to="/products" className="btn btn-primary" style={{ padding: '14px 36px' }}>
          EXPLORE CATALOG
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '48px 20px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.04em' }}>
            SAVED GARMENTS
          </h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved to your personal curation
          </p>
        </div>
        <button
          onClick={clearWishlist}
          style={{ background: 'none', border: 'none', color: 'var(--color-mid-gray)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Clear entire wishlist
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '32px',
      }}>
        {wishlist.map((product) => (
          <div key={product.id} style={{ position: 'relative' }}>
            <ProductCard product={product} />
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button
                onClick={() => addToCart(product, 'M', 1)}
                className="btn btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <ShoppingBag size={14} /> ADD (M)
              </button>
              <button
                onClick={() => toggleWishlist(product)}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
                title="Remove from wishlist"
              >
                <Trash2 size={16} color="var(--color-mid-gray)" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
