import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { couponApi } from '../../services/api';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, ShieldCheck, Truck, Tag, CheckCircle2, X } from 'lucide-react';

const CartPage = () => {
  const {
    items,
    updateQuantity,
    removeFromCart,
    cartCount,
    cartSubtotal,
    shipping,
    cartTotal,
    clearCart,
  } = useCart();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  const freeShippingThreshold = 2999;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);
  const progressPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);

  // Invalidate coupon if bag contents change
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError('Bag updated. Please re-apply your promotional code.');
    }
  }, [cartSubtotal]);

  const discountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount) : 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const effectiveShipping = items.length === 0 ? 0 : (discountedSubtotal >= 2999.0 ? 0 : 150);
  const finalTotal = Math.max(0, Math.round((discountedSubtotal + effectiveShipping) * 100) / 100);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    const clean = promoCode.trim().toUpperCase();
    if (!clean) {
      setCouponError('Please enter a promotional code.');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await couponApi.validateCoupon(clean, cartSubtotal);
      setAppliedCoupon(res.data);
      setCouponError(null);
      addToast(res.data.message || `Coupon '${clean}' applied successfully!`, 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid or expired promotional code.';
      setCouponError(msg);
      setAppliedCoupon(null);
      addToast(msg, 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedCoupon(null);
    setPromoCode('');
    setCouponError(null);
    addToast('Promotional coupon removed', 'info');
  };

  if (items.length === 0) {
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
          <ShoppingBag size={32} color="var(--color-mid-gray)" />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '12px' }}>
          YOUR SHOPPING BAG IS EMPTY
        </h2>
        <p style={{ color: 'var(--color-mid-gray)', maxWidth: '440px', margin: '0 auto 32px' }}>
          Explore the contemporary ready-to-wear catalog and discover premium silhouettes crafted for modern presence.
        </p>
        <Link to="/products" className="btn btn-primary" style={{ padding: '14px 36px' }}>
          EXPLORE CATALOG
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '48px 20px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.04em' }}>
            SHOPPING BAG
          </h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            {cartCount} {cartCount === 1 ? 'garment' : 'garments'} selected for checkout
          </p>
        </div>
        <button
          onClick={clearCart}
          style={{ background: 'none', border: 'none', color: 'var(--color-mid-gray)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Clear bag
        </button>
      </div>

      {/* Free Shipping Meter */}
      <div style={{
        padding: '16px 20px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        marginBottom: '36px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {remainingForFreeShipping === 0 ? (
              <span style={{ color: 'var(--color-success)' }}>✓ YOU QUALIFY FOR COMPLIMENTARY SHIPPING</span>
            ) : (
              <span>ADD {formatINR(remainingForFreeShipping)} MORE FOR COMPLIMENTARY COURIER DELIVERY</span>
            )}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>Threshold: {formatINR(freeShippingThreshold)}</span>
        </div>
        <div style={{ height: '5px', width: '100%', backgroundColor: '#E0E0E0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: remainingForFreeShipping === 0 ? 'var(--color-success)' : 'var(--dizco-red)',
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '48px',
        alignItems: 'start',
      }}>
        {/* Left Column: Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {items.map((item) => {
            const itemId = item.cart_item_id || (item.variant_id ? `${item.product.id}_${item.variant_id}` : `${item.product.id}`);
            const primaryImg = item.product.images?.find((img) => img.is_primary)?.image_url 
              || item.product.images?.[0]?.image_url 
              || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800';
            const unitPrice = item.price !== undefined
              ? item.price
              : (item.product.sale_price !== null && item.product.sale_price !== undefined ? item.product.sale_price : item.product.price);
            const maxStock = item.max_stock ?? (item.variant_id ? (item.product.variants?.find(v => v.id === item.variant_id)?.stock_quantity ?? item.product.stock_quantity) : item.product.stock_quantity);

            return (
              <div
                key={itemId}
                style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '20px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                }}
              >
                <Link to={`/product/${item.product.slug}`} style={{ flexShrink: 0 }}>
                  <img
                    src={primaryImg}
                    alt={item.product.name}
                    style={{
                      width: '90px',
                      height: '115px',
                      objectFit: 'cover',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  />
                </Link>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    SKU: {item.sku || item.product.sku}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '4px 0 6px' }}>
                    <Link to={`/product/${item.product.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {item.product.name}
                    </Link>
                  </h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--color-mid-gray)', marginBottom: '12px', flexWrap: 'wrap' }}>
                    {item.color && <span>Color: <strong style={{ color: 'var(--color-black)' }}>{item.color}</strong></span>}
                    {item.size && <span>Size: <strong style={{ color: 'var(--color-black)' }}>{item.size}</strong></span>}
                    <span>Unit: {formatINR(unitPrice)}</span>
                  </div>

                  {/* Controls Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => updateQuantity(itemId, item.quantity - 1)}
                        style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span style={{ width: '36px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(itemId, item.quantity + 1)}
                        disabled={item.quantity >= maxStock}
                        style={{
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: item.quantity >= maxStock ? 0.3 : 1,
                        }}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                        {formatINR(unitPrice * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(itemId)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-mid-gray)', cursor: 'pointer', padding: '4px' }}
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Order Summary & Checkout */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-border)',
          padding: '28px',
          position: 'sticky',
          top: '90px',
        }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '20px', textTransform: 'uppercase' }}>
            ORDER SUMMARY
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-mid-gray)' }}>Bag Subtotal</span>
              <span style={{ fontWeight: 600 }}>{formatINR(cartSubtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-mid-gray)' }}>Estimated Shipping</span>
              <span>{effectiveShipping === 0 ? <strong style={{ color: 'var(--color-success)' }}>FREE</strong> : formatINR(effectiveShipping)}</span>
            </div>
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--dizco-red)', fontWeight: 600 }}>
                <span>Coupon Discount</span>
                <span>-{formatINR(discountAmount)}</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800 }}>
              <span>Total Payable</span>
              <span>{formatINR(finalTotal)}</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
              Inclusive of all taxes & nationwide standard delivery.
            </p>
          </div>

          {/* Promo code section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Tag size={14} color="var(--dizco-red)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                HAVE A PROMO CODE?
              </span>
            </div>

            {appliedCoupon ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '2px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <div>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#065F46', letterSpacing: '0.04em' }}>
                      ✓ Coupon {appliedCoupon.code} applied
                    </span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#047857' }}>
                      {appliedCoupon.discount_type === 'percentage'
                        ? `${appliedCoupon.discount_value}% discount applied`
                        : `₹${appliedCoupon.discount_value} flat discount applied`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                  title="Remove coupon"
                >
                  REMOVE
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter Promo Code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                />
                <button
                  type="submit"
                  disabled={couponLoading}
                  className="btn btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.8rem' }}
                >
                  {couponLoading ? '...' : 'APPLY'}
                </button>
              </form>
            )}
            {couponError && (
              <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '6px', fontWeight: 500 }}>
                {couponError}
              </p>
            )}
          </div>

          {/* Checkout Button */}
          <button
            onClick={() => navigate('/checkout')}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            PROCEED TO CHECKOUT <ArrowRight size={18} />
          </button>

          <Link
            to="/products"
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--color-black)',
              textDecoration: 'underline',
              fontWeight: 500,
            }}
          >
            Continue Shopping
          </Link>

          {/* Trust Guarantees */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
              <ShieldCheck size={16} color="var(--color-black)" />
              <span>100% Authentic Luxury Garments Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
              <Truck size={16} color="var(--color-black)" />
              <span>Complimentary Returns & Exchange within 14 Days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
