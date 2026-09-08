import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

const CartDrawer = () => {
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    cartCount,
    cartSubtotal,
    shipping,
    cartTotal,
  } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const freeShippingThreshold = 2999;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);
  const progressPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="modal-overlay" onClick={closeCart} style={{ zIndex: 1200, padding: 0 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1201,
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingBag size={18} />
            <h3 style={{ fontSize: '1rem', letterSpacing: '0.04em' }}>
              SHOPPING BAG ({cartCount})
            </h3>
          </div>
          <button
            onClick={closeCart}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            aria-label="Close Shopping Bag"
          >
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress */}
        <div style={{ padding: '12px 24px', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
            {remainingForFreeShipping === 0 ? (
              <span style={{ color: 'var(--color-success)' }}>YOU HAVE QUALIFIED FOR FREE DELIVERY!</span>
            ) : (
              <span>ADD {formatINR(remainingForFreeShipping)} MORE FOR COMPLIMENTARY SHIPPING</span>
            )}
          </p>
          <div style={{ height: '4px', width: '100%', backgroundColor: '#E0E0E0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              backgroundColor: remainingForFreeShipping === 0 ? 'var(--color-success)' : 'var(--dizco-red)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
              <ShoppingBag size={48} color="#D1D5DB" style={{ marginBottom: '16px' }} />
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Your shopping bag is empty</h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-mid-gray)', marginBottom: '24px' }}>
                Discover our latest drop of heavyweight essentials and tailored trousers.
              </p>
              <button onClick={() => { closeCart(); navigate('/shop'); }} className="btn btn-primary">
                START SHOPPING
              </button>
            </div>
          ) : (
            items.map((item) => {
              const product = item.product;
              const itemId = item.cart_item_id || (item.variant_id ? `${product.id}_${item.variant_id}` : `${product.id}`);
              const imgUrl = product.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';
              const itemPrice = item.price !== undefined
                ? item.price
                : (product.sale_price !== null ? product.sale_price : product.price);
              const maxStock = item.max_stock ?? (item.variant_id ? (product.variants?.find(v => v.id === item.variant_id)?.stock_quantity ?? product.stock_quantity) : product.stock_quantity);

              return (
                <div
                  key={itemId}
                  style={{
                    display: 'flex',
                    gap: '14px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #F0F0F0',
                  }}
                >
                  {/* Thumbnail */}
                  <img
                    src={imgUrl}
                    alt={product.name}
                    style={{
                      width: '80px',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '2px',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  />

                  {/* Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3 }}>
                          {product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(itemId)}
                          style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '2px' }}
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Variant Attributes */}
                      {(item.color || item.size) && (
                        <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--color-dark-gray)', marginTop: '3px' }}>
                          {item.color && <span>Color: <strong>{item.color}</strong></span>}
                          {item.color && item.size && <span style={{ color: 'var(--color-muted)' }}>•</span>}
                          {item.size && <span>Size: <strong>{item.size}</strong></span>}
                        </div>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'block', marginTop: '2px' }}>
                        SKU: {item.sku || product.sku}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                      {/* Quantity Stepper */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        border: '1px solid var(--color-border)',
                        borderRadius: '2px',
                      }}>
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0 8px' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                          disabled={item.quantity >= maxStock}
                          style={{
                            padding: '4px 8px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: item.quantity >= maxStock ? 0.4 : 1,
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Price */}
                      <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                        {formatINR(itemPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer / Checkout CTA */}
        {items.length > 0 && (
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: '#FAFAFA',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
              <span className="text-muted">Subtotal</span>
              <span style={{ fontWeight: 600 }}>{formatINR(cartSubtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '0.875rem' }}>
              <span className="text-muted">Estimated Delivery</span>
              <span style={{ fontWeight: 600 }}>{shipping === 0 ? 'FREE' : formatINR(shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '1.0625rem', fontWeight: 700 }}>
              <span>Total</span>
              <span>{formatINR(cartTotal)}</span>
            </div>

            <button
              onClick={handleCheckout}
              className="btn btn-primary btn-block"
              style={{ padding: '14px', fontSize: '0.9375rem' }}
            >
              PROCEED TO CHECKOUT <ArrowRight size={16} />
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--color-muted)', marginTop: '10px' }}>
              TAXES INCLUDED • SECURE RAZORPAY PAYMENT GATEWAY
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
