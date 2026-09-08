import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { orderApi, couponApi } from '../../services/api';
import { ShieldCheck, Lock, ArrowLeft, CheckCircle2, Tag } from 'lucide-react';

const CheckoutPage = () => {
  const { items, cartSubtotal, shipping, cartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Address, 2: Review & Payment
  const [loading, setLoading] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState(null);

  // Address form fields
  const [address, setAddress] = useState({
    full_name: user?.full_name || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip_code: '',
    phone: user?.phone || '',
  });

  const [formErrors, setFormErrors] = useState({});

  // Invalidate applied coupon if cart subtotal changes
  useEffect(() => {
    if (appliedCoupon) {
      setAppliedCoupon(null);
      setCouponError('Cart updated. Please re-apply your promotional code.');
    }
  }, [cartSubtotal]);

  // Authoritative dynamic discount and totals
  const discountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount) : 0;
  const discountedSubtotal = Math.max(0, cartSubtotal - discountAmount);
  const effectiveShipping = items.length === 0 ? 0 : (discountedSubtotal >= 2999.0 ? 0 : 150);
  const finalTotal = Math.max(0, Math.round((discountedSubtotal + effectiveShipping) * 100) / 100);

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    const clean = couponCode.trim().toUpperCase();
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

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
    addToast('Promotional coupon removed', 'info');
  };

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Your Shopping Bag is Empty</h2>
        <p style={{ color: 'var(--color-mid-gray)', marginBottom: '24px' }}>
          Please add items to your cart before proceeding to checkout.
        </p>
        <Link to="/shop" className="btn btn-primary">
          EXPLORE CATALOG
        </Link>
      </div>
    );
  }

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const validateAddress = () => {
    const errors = {};
    if (!address.full_name.trim()) errors.full_name = 'Full name is required';
    if (!address.address_line1.trim()) errors.address_line1 = 'Delivery address is required';
    if (!address.city.trim()) errors.city = 'City is required';
    if (!address.state.trim()) errors.state = 'State is required';
    if (!address.zip_code.trim() || !/^\d{6}$/.test(address.zip_code.trim())) {
      errors.zip_code = 'Valid 6-digit PIN code required';
    }
    if (!address.phone.trim() || address.phone.length < 10) {
      errors.phone = 'Valid phone number required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddressSubmit = (e) => {
    e.preventDefault();
    if (validateAddress()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePayment = async () => {
    if (!isAuthenticated) {
      addToast('Please sign in or create an account to finalize order', 'warning');
      navigate('/login?redirect=/checkout');
      return;
    }

    setLoading(true);

    try {
      // 1. Create order on backend
      const orderPayload = {
        items: items.map((item) => ({
          product_id: item.product.id,
          variant_id: item.variant_id || null,
          color: item.color || null,
          size: item.size || null,
          quantity: item.quantity,
        })),
        address: address,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
      };

      const orderRes = await orderApi.createOrder(orderPayload);
      const createdOrder = orderRes.data;

      // 2. Initialize Razorpay order on backend
      const rzpRes = await orderApi.createRazorpayOrder(createdOrder.id);
      const rzpData = rzpRes.data;

      // 3. Trigger Razorpay Checkout Modal
      const options = {
        key: rzpData.key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: 'DIZCO CLOTHING',
        description: `Order #${rzpData.order_number}`,
        image: '/logo.png',
        order_id: rzpData.razorpay_order_id.startsWith('order_mock_') ? undefined : rzpData.razorpay_order_id,
        prefill: {
          name: address.full_name,
          email: user?.email,
          contact: address.phone,
        },
        theme: {
          color: '#E51B24',
        },
        handler: async function (response) {
          try {
            await orderApi.verifyRazorpayPayment({
              order_id: createdOrder.id,
              razorpay_order_id: response.razorpay_order_id || rzpData.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id || 'pay_test_authorized',
              razorpay_signature: response.razorpay_signature || 'test_sig',
            });

            clearCart();
            addToast('Payment verified successfully!', 'success');
            navigate(`/order-success/${createdOrder.order_number}`, { state: { order: createdOrder } });
          } catch (verErr) {
            console.error('Verification error:', verErr);
            addToast('Payment verification failed. Please check with your bank.', 'error');
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            addToast('Payment cancelled. Your cart has been preserved.', 'info');
          },
        },
      };

      // Check if Razorpay JS is available
      if (window.Razorpay && !rzpData.razorpay_order_id.startsWith('order_mock_')) {
        const rzpInstance = new window.Razorpay(options);
        rzpInstance.open();
      } else {
        // Test mode simulation when mock key is used
        setTimeout(async () => {
          try {
            await orderApi.verifyRazorpayPayment({
              order_id: createdOrder.id,
              razorpay_order_id: rzpData.razorpay_order_id,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: 'mock_signature_authorized',
            });
            clearCart();
            addToast('Payment verified successfully (DIZCO Sandbox Mode)!', 'success');
            navigate(`/order-success/${createdOrder.order_number}`, { state: { order: createdOrder } });
          } catch (e) {
            setLoading(false);
            addToast('Payment simulation error.', 'error');
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err.response?.data?.detail || 'Failed to place order. Please verify stock availability.';
      addToast(msg, 'error');
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page" style={{ padding: 'var(--space-6) 0 var(--space-8) 0', backgroundColor: '#FAFAFA', minHeight: '80vh' }}>
      <div className="container">
        {/* Checkout Header */}
        <div style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.1em' }}>
              SECURE COMMERCE
            </span>
            <h1 style={{ fontSize: '1.75rem', marginTop: '4px' }}>DIZCO CHECKOUT</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600 }}>
            <Lock size={15} /> 256-BIT ENCRYPTED
          </div>
        </div>

        {/* 2-Column Checkout Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'flex-start',
        }}>
          {/* Left Column: Flow Steps */}
          <div style={{ backgroundColor: '#FFFFFF', padding: 'var(--space-4)', borderRadius: '2px', boxShadow: 'var(--shadow-sm)' }}>
            {/* Step Indicators */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: step === 1 ? 'var(--dizco-red)' : 'var(--color-black)',
              }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '9999px',
                  backgroundColor: step === 1 ? 'var(--dizco-red)' : 'var(--color-black)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                }}>
                  1
                </span>
                DELIVERY ADDRESS
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                color: step === 2 ? 'var(--dizco-red)' : 'var(--color-muted)',
              }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '9999px',
                  backgroundColor: step === 2 ? 'var(--dizco-red)' : 'var(--color-border)',
                  color: step === 2 ? '#FFF' : 'var(--color-mid-gray)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                }}>
                  2
                </span>
                PAYMENT (RAZORPAY)
              </div>
            </div>

            {/* STEP 1: Address Form */}
            {step === 1 && (
              <form onSubmit={handleAddressSubmit}>
                <div className="form-group">
                  <label className="form-label">Recipient Full Name *</label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.full_name ? 'error' : ''}`}
                    value={address.full_name}
                    onChange={(e) => setAddress({ ...address, full_name: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                  />
                  {formErrors.full_name && <p className="form-error-text">{formErrors.full_name}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Address Line 1 *</label>
                  <input
                    type="text"
                    className={`form-control ${formErrors.address_line1 ? 'error' : ''}`}
                    value={address.address_line1}
                    onChange={(e) => setAddress({ ...address, address_line1: e.target.value })}
                    placeholder="House/Apartment number, street name"
                  />
                  {formErrors.address_line1 && <p className="form-error-text">{formErrors.address_line1}</p>}
                </div>

                <div className="form-group">
                  <label className="form-label">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={address.address_line2}
                    onChange={(e) => setAddress({ ...address, address_line2: e.target.value })}
                    placeholder="Landmark, suite, floor"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.city ? 'error' : ''}`}
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="e.g. Bengaluru"
                    />
                    {formErrors.city && <p className="form-error-text">{formErrors.city}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">State *</label>
                    <input
                      type="text"
                      className={`form-control ${formErrors.state ? 'error' : ''}`}
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      placeholder="e.g. Karnataka"
                    />
                    {formErrors.state && <p className="form-error-text">{formErrors.state}</p>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">PIN Code (6 digits) *</label>
                    <input
                      type="text"
                      maxLength={6}
                      className={`form-control ${formErrors.zip_code ? 'error' : ''}`}
                      value={address.zip_code}
                      onChange={(e) => setAddress({ ...address, zip_code: e.target.value })}
                      placeholder="560038"
                    />
                    {formErrors.zip_code && <p className="form-error-text">{formErrors.zip_code}</p>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className={`form-control ${formErrors.phone ? 'error' : ''}`}
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                    {formErrors.phone && <p className="form-error-text">{formErrors.phone}</p>}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '16px', padding: '14px' }}>
                  CONTINUE TO PAYMENT REVIEW
                </button>
              </form>
            )}

            {/* STEP 2: Review & Payment Confirmation */}
            {step === 2 && (
              <div>
                <div style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '2px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-mid-gray)' }}>
                      DELIVERING TO
                    </span>
                    <button
                      onClick={() => setStep(1)}
                      style={{ background: 'none', border: 'none', color: 'var(--dizco-red)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      EDIT ADDRESS
                    </button>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{address.full_name}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)' }}>
                    {address.address_line1}, {address.address_line2 ? address.address_line2 + ', ' : ''}
                    {address.city}, {address.state} - {address.zip_code}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)', marginTop: '4px' }}>
                    Contact: {address.phone}
                  </p>
                </div>

                {/* Razorpay Gateway Information */}
                <div style={{
                  border: '1px solid var(--color-border)',
                  padding: '20px',
                  borderRadius: '2px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#EBF4FF',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                    fontWeight: 800,
                  }}>
                    ₹
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.9375rem', marginBottom: '2px' }}>Razorpay Payment Gateway</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                      Supports UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, NetBanking & Wallets.
                    </p>
                  </div>
                </div>

                {!isAuthenticated && (
                  <div style={{ backgroundColor: '#FEF3C7', padding: '12px 16px', borderRadius: '2px', marginBottom: '20px', fontSize: '0.8125rem', color: '#92400E' }}>
                    Note: You will be prompted to sign in with your email to connect this order to your DIZCO profile.
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setStep(1)}
                    className="btn btn-secondary"
                    style={{ padding: '14px 20px' }}
                  >
                    <ArrowLeft size={16} /> BACK
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={loading}
                    className="btn btn-red"
                    style={{ flex: 1, padding: '14px 20px', fontSize: '1rem' }}
                  >
                    {loading ? 'PROCESSING SECURE ORDER...' : `PAY ${formatINR(finalTotal)} VIA RAZORPAY`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Order Summary */}
          <div style={{
            backgroundColor: '#FFFFFF',
            padding: 'var(--space-4)',
            borderRadius: '2px',
            boxShadow: 'var(--shadow-sm)',
            position: 'sticky',
            top: 'calc(var(--header-height) + 20px)',
          }}>
            <h3 style={{ fontSize: '1.125rem', letterSpacing: '0.04em', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
              ORDER SUMMARY ({items.reduce((s, i) => s + i.quantity, 0)} ITEMS)
            </h3>

            {/* Items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
              {items.map((item) => {
                const p = item.product;
                const itemId = item.cart_item_id || (item.variant_id ? `${p.id}_${item.variant_id}` : `${p.id}`);
                const img = p.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';
                const activePrice = item.price !== undefined ? item.price : (p.sale_price !== null ? p.sale_price : p.price);

                return (
                  <div key={itemId} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <img src={img} alt={p.name} style={{ width: '48px', height: '60px', objectFit: 'cover', borderRadius: '2px' }} />
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.name}</h5>
                      {(item.color || item.size) && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-dark-gray)', display: 'block', marginTop: '1px' }}>
                          {item.color ? `Color: ${item.color}` : ''}
                          {item.color && item.size ? ' • ' : ''}
                          {item.size ? `Size: ${item.size}` : ''}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Qty: {item.quantity}</span>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {formatINR(activePrice * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Promo Code Section */}
            <div style={{
              borderTop: '1px solid var(--color-border)',
              paddingTop: '16px',
              marginTop: '16px',
              marginBottom: '16px',
            }}>
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
                    onClick={handleRemoveCoupon}
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
                  >
                    REMOVE
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      if (couponError) setCouponError(null);
                    }}
                    placeholder="ENTER CODE"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: '0.8125rem',
                      fontFamily: 'monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      border: couponError ? '1px solid #DC2626' : '1px solid var(--color-border)',
                      borderRadius: '2px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn btn-secondary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.06em',
                      fontWeight: 700,
                    }}
                  >
                    {couponLoading ? 'APPLYING...' : 'APPLY'}
                  </button>
                </form>
              )}

              {couponError && (
                <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '6px', fontWeight: 500 }}>
                  {couponError}
                </p>
              )}
            </div>

            {/* Financial Breakdown */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Bag Subtotal</span>
                <span>{formatINR(cartSubtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                  <span>Promotional Discount</span>
                  <span>- {formatINR(discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Domestic Shipping</span>
                <span>{effectiveShipping === 0 ? <strong style={{ color: 'var(--color-success)' }}>FREE</strong> : formatINR(effectiveShipping)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '12px', marginTop: '4px', fontSize: '1.125rem', fontWeight: 800 }}>
                <span>Grand Total</span>
                <span>{formatINR(finalTotal)}</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', backgroundColor: 'var(--color-surface)', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-dark-gray)' }}>
              <ShieldCheck size={16} color="var(--dizco-red)" />
              <span>Complimentary India transit insurance included on every order.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
