import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { ShoppingBag, Check, Heart } from 'lucide-react';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isFavorited = isInWishlist(product.id);

  const primaryImage = product.images?.find((img) => img.is_primary)?.image_url 
    || product.images?.[0]?.image_url 
    || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';

  const secondaryImage = product.images?.[1]?.image_url || primaryImage;

  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const hasSale = product.sale_price !== null && product.sale_price !== undefined && product.sale_price < product.price;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#FFFFFF',
        transition: 'transform var(--transition-fast)'
      }}
    >
      {/* Image Container with 3:4 Aspect Ratio */}
      <Link
        to={`/product/${product.slug}`}
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '133.33%', // 3:4 aspect ratio
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
          display: 'block'
        }}
      >
        <img
          src={isHovered ? secondaryImage : primaryImage}
          alt={product.name}
          loading="lazy"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            filter: isOutOfStock ? 'grayscale(70%)' : 'none'
          }}
        />

        {/* Badges */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 2 }}>
          {isOutOfStock ? (
            <span className="badge badge-soldout">SOLD OUT</span>
          ) : (
            <>
              {hasSale && <span className="badge badge-red">SALE</span>}
              {isLowStock && <span className="badge badge-dark">ONLY {product.stock_quantity} LEFT</span>}
            </>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 4,
            boxShadow: 'var(--shadow-sm)',
            transition: 'transform 0.15s ease',
          }}
          aria-label="Toggle Wishlist"
        >
          <Heart
            size={16}
            fill={isFavorited ? 'var(--dizco-red)' : 'none'}
            color={isFavorited ? 'var(--dizco-red)' : 'var(--color-black)'}
          />
        </button>

        {/* Quick Add Button on Hover */}
        {!isOutOfStock && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            opacity: isHovered ? 1 : 0,
            transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.2s ease',
            zIndex: 3
          }}>
            <button
              onClick={handleQuickAdd}
              className="btn btn-primary btn-block btn-sm"
              style={{
                backgroundColor: added ? 'var(--color-success)' : 'rgba(17, 17, 17, 0.95)',
                backdropFilter: 'blur(4px)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {added ? (
                <>
                  <Check size={14} /> ADDED
                </>
              ) : (
                <>
                  <ShoppingBag size={14} /> QUICK ADD
                </>
              )}
            </button>
          </div>
        )}
      </Link>

      {/* Product Meta */}
      <div style={{ paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {product.category && (
          <span style={{
            fontSize: '0.6875rem',
            color: 'var(--color-mid-gray)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600
          }}>
            {product.category.name}
          </span>
        )}
        <Link
          to={`/product/${product.slug}`}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.9375rem',
            fontWeight: 700,
            color: 'var(--color-black)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={product.name}
        >
          {product.name}
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          {hasSale ? (
            <>
              <span style={{ fontWeight: 700, color: 'var(--dizco-red)', fontSize: '0.9375rem' }}>
                {formatINR(product.sale_price)}
              </span>
              <span style={{ textDecoration: 'line-through', color: 'var(--color-muted)', fontSize: '0.8125rem' }}>
                {formatINR(product.price)}
              </span>
            </>
          ) : (
            <span style={{ fontWeight: 700, color: 'var(--color-black)', fontSize: '0.9375rem' }}>
              {formatINR(product.price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
