import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { catalogApi, reviewApi } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ProductCard from '../../components/common/ProductCard';
import { ShoppingBag, ChevronDown, ChevronUp, Truck, ShieldCheck, RefreshCw, Check, Heart, X, Star, MessageSquare } from 'lucide-react';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Reviews state
  const [reviewsData, setReviewsData] = useState({ average_rating: 0, total_reviews: 0, reviews: [] });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(null);

  // Size guide modal state
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [sizeUnit, setSizeUnit] = useState('in'); // 'in' or 'cm'

  // Accordion states
  const [openAccordion, setOpenAccordion] = useState('details');

  // Pincode test checker state
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await catalogApi.getProduct(slug);
        const prodData = res.data;
        setProduct(prodData);
        const initialImg = prodData.images?.find((img) => img.is_primary)?.image_url 
          || prodData.images?.[0]?.image_url 
          || '';
        setSelectedImage(initialImg);

        // Initialize variant selection if active variants exist
        if (prodData.variants && prodData.variants.length > 0) {
          const active = prodData.variants.filter((v) => v.is_active);
          if (active.length > 0) {
            // Pick first variant with stock, or first active variant
            const defaultVar = active.find((v) => v.stock_quantity > 0) || active[0];
            setSelectedColor(defaultVar.color);
            setSelectedSize(defaultVar.size);
          }
        }

        // Fetch related products from same category or featured
        const relRes = await catalogApi.getFeaturedProducts(4);
        setRelatedProducts(relRes.data.filter((p) => p.id !== prodData.id).slice(0, 4));
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const revRes = await reviewApi.getProductReviews(slug);
        setReviewsData(revRes.data);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };

    fetchProduct();
    fetchReviews();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Please sign in to submit a review', 'warning');
      navigate('/login');
      return;
    }
    if (!newReview.comment.trim()) {
      setReviewError('Please write a review comment.');
      return;
    }
    setSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);
    try {
      await reviewApi.submitReview(product.id, newReview);
      setReviewSuccess('Thank you. Your review has been submitted for editorial moderation and will appear after approval.');
      addToast('Review submitted for moderation', 'success');
      setNewReview({ rating: 5, title: '', comment: '' });
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSuccess(null);
      }, 3500);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit review.';
      setReviewError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-mid-gray)' }}>
        Loading garment specifications...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Garment Not Found</h2>
        <Link to="/shop" className="btn btn-primary">RETURN TO CATALOG</Link>
      </div>
    );
  }

  // Active variants logic
  const activeVariants = product.variants?.filter((v) => v.is_active) || [];
  const hasVariants = activeVariants.length > 0;

  // Extract unique colors across active variants
  const availableColors = hasVariants
    ? [...new Set(activeVariants.map((v) => v.color))]
    : [];

  // Extract all unique sizes across active variants
  const allSizes = hasVariants
    ? [...new Set(activeVariants.map((v) => v.size))]
    : [];

  // Active variants for currently selected color
  const colorVariants = hasVariants && selectedColor
    ? activeVariants.filter((v) => v.color === selectedColor)
    : [];

  // Exact matching variant for selected color and size
  const selectedVariant = hasVariants && selectedColor && selectedSize
    ? colorVariants.find((v) => v.size === selectedSize) || null
    : null;

  // Handle color change and recalculate valid sizes
  const handleColorChange = (newColor) => {
    setSelectedColor(newColor);
    const variantsForNewColor = activeVariants.filter((v) => v.color === newColor);
    // Check if the current size is available with stock in the new color
    const matchingInStock = variantsForNewColor.find((v) => v.size === selectedSize && v.stock_quantity > 0);
    if (matchingInStock) {
      // Keep existing size
    } else {
      // Prefer first in-stock size for this color, else first available size
      const firstInStock = variantsForNewColor.find((v) => v.stock_quantity > 0);
      if (firstInStock) {
        setSelectedSize(firstInStock.size);
      } else if (variantsForNewColor.length > 0) {
        setSelectedSize(variantsForNewColor[0].size);
      }
    }
  };

  // Authoritative effective stock & price
  const effectiveStock = hasVariants
    ? (selectedVariant ? selectedVariant.stock_quantity : 0)
    : product.stock_quantity;

  const isOutOfStock = effectiveStock <= 0;
  const isLowStock = effectiveStock > 0 && effectiveStock <= 5;

  const effectivePrice = hasVariants && selectedVariant && selectedVariant.price !== null && selectedVariant.price !== undefined
    ? Number(selectedVariant.price)
    : (product.sale_price !== null && product.sale_price !== undefined ? Number(product.sale_price) : Number(product.price));

  const hasSale = !hasVariants
    ? (product.sale_price !== null && product.sale_price !== undefined && product.sale_price < product.price)
    : (selectedVariant?.price == null && product.sale_price !== null && product.sale_price < product.price);

  const displaySku = hasVariants && selectedVariant ? selectedVariant.sku : product.sku;
  const isFavorited = product ? isInWishlist(product.id) : false;

  const sizeTableData = {
    in: [
      { size: 'S', chest: '38"', length: '28"', shoulder: '18"', sleeve: '8.5"' },
      { size: 'M', chest: '40"', length: '29"', shoulder: '19"', sleeve: '9"' },
      { size: 'L', chest: '42"', length: '30"', shoulder: '20"', sleeve: '9.5"' },
      { size: 'XL', chest: '44"', length: '31"', shoulder: '21"', sleeve: '10"' },
    ],
    cm: [
      { size: 'S', chest: '96.5', length: '71', shoulder: '45.5', sleeve: '21.5' },
      { size: 'M', chest: '101.5', length: '73.5', shoulder: '48', sleeve: '23' },
      { size: 'L', chest: '106.5', length: '76', shoulder: '51', sleeve: '24' },
      { size: 'XL', chest: '112', length: '79', shoulder: '53.5', sleeve: '25.5' },
    ],
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleAddToCart = () => {
    if (hasVariants) {
      if (!selectedColor) {
        addToast('Please select a color', 'warning');
        return;
      }
      if (!selectedSize) {
        addToast('Please select a size', 'warning');
        return;
      }
      if (!selectedVariant) {
        addToast('Selected variant combination is unavailable', 'warning');
        return;
      }
      if (selectedVariant.stock_quantity <= 0) {
        addToast(`Variant (${selectedVariant.color} / ${selectedVariant.size}) is out of stock`, 'warning');
        return;
      }
      addToCart(product, quantity, selectedVariant);
    } else {
      if (product.stock_quantity <= 0) {
        addToast(`${product.name} is currently out of stock`, 'warning');
        return;
      }
      addToCart(product, quantity, null);
    }
  };

  const handleBuyNow = () => {
    if (hasVariants) {
      if (!selectedColor) {
        addToast('Please select a color', 'warning');
        return;
      }
      if (!selectedSize) {
        addToast('Please select a size', 'warning');
        return;
      }
      if (!selectedVariant) {
        addToast('Selected variant combination is unavailable', 'warning');
        return;
      }
      if (selectedVariant.stock_quantity <= 0) {
        addToast(`Variant (${selectedVariant.color} / ${selectedVariant.size}) is out of stock`, 'warning');
        return;
      }
      const success = addToCart(product, quantity, selectedVariant);
      if (success) {
        navigate('/checkout');
      }
    } else {
      if (product.stock_quantity <= 0) {
        addToast(`${product.name} is currently out of stock`, 'warning');
        return;
      }
      const success = addToCart(product, quantity, null);
      if (success) {
        navigate('/checkout');
      }
    }
  };

  const checkPincode = (e) => {
    e.preventDefault();
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      setPincodeStatus({
        valid: true,
        message: `Complimentary Express Dispatch available for ${pincode} (Delivery in 2–3 business days).`,
      });
    } else {
      setPincodeStatus({
        valid: false,
        message: 'Please enter a valid 6-digit Indian PIN code.',
      });
    }
  };

  return (
    <div className="product-detail-page" style={{ padding: 'var(--space-6) 0 var(--space-8) 0' }}>
      <div className="container">
        {/* Breadcrumbs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          color: 'var(--color-mid-gray)',
          textTransform: 'uppercase',
          marginBottom: 'var(--space-4)',
        }}>
          <Link to="/" style={{ color: 'inherit' }}>Home</Link>
          <span>/</span>
          <Link to="/shop" style={{ color: 'inherit' }}>Shop</Link>
          {product.category && (
            <>
              <span>/</span>
              <Link to={`/shop?category=${product.category.slug}`} style={{ color: 'inherit' }}>
                {product.category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span style={{ color: 'var(--color-black)', fontWeight: 600 }}>{product.name}</span>
        </div>

        {/* Product Main Display (Gallery Left, Info Right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'flex-start',
        }}>
          {/* Gallery Left */}
          <div style={{ display: 'flex', gap: '16px', flexDirection: 'row' }} className="product-gallery">
            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '70px', flexShrink: 0 }}>
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img.image_url)}
                    style={{
                      border: selectedImage === img.image_url ? '2px solid var(--color-black)' : '1px solid var(--color-border)',
                      padding: 0,
                      background: 'none',
                      cursor: 'pointer',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={img.image_url}
                      alt={`${product.name} view ${idx + 1}`}
                      style={{ width: '100%', height: '85px', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Preview Image */}
            <div style={{
              flex: 1,
              position: 'relative',
              backgroundColor: 'var(--color-surface)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <img
                src={selectedImage || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'}
                alt={product.name}
                style={{
                  width: '100%',
                  maxHeight: '680px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              {isOutOfStock && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(17, 17, 17, 0.85)',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  backdropFilter: 'blur(4px)',
                  zIndex: 2,
                }}>
                  OUT OF STOCK
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {product.images && product.images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {product.images.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    onClick={() => setSelectedImage(img.image_url)}
                    style={{
                      width: '72px',
                      height: '90px',
                      border: selectedImage === img.image_url ? '2px solid var(--color-black)' : '1px solid var(--color-border)',
                      padding: 0,
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={img.image_url}
                      alt={`${product.name} angle ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Right */}
          <div style={{ padding: '0 var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {product.category ? product.category.name : 'DIZCO ARCHIVE'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                SKU: {displaySku}
              </span>
            </div>

            <h1 style={{ fontSize: '2rem', marginBottom: '16px', lineHeight: 1.2 }}>
              {product.name}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              {hasSale ? (
                <>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--dizco-red)' }}>
                    {formatINR(product.sale_price)}
                  </span>
                  <span style={{ fontSize: '1.25rem', textDecoration: 'line-through', color: 'var(--color-muted)' }}>
                    {formatINR(product.price)}
                  </span>
                  <span className="badge badge-red">SAVE {Math.round(((product.price - product.sale_price) / product.price) * 100)}%</span>
                </>
              ) : (
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-black)' }}>
                  {formatINR(effectivePrice)}
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.9375rem', color: 'var(--color-dark-gray)', lineHeight: 1.6, marginBottom: '24px' }}>
              {product.description}
            </p>

            {/* Stock status indicator */}
            <div style={{ marginBottom: '20px' }}>
              {isOutOfStock ? (
                <span style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.875rem' }}>
                  • Currently sold out {hasVariants && selectedColor && selectedSize ? `in ${selectedColor} / ${selectedSize}` : 'in online inventory'}.
                </span>
              ) : isLowStock ? (
                <span style={{ color: 'var(--color-warning)', fontWeight: 600, fontSize: '0.875rem' }}>
                  • Only {effectiveStock} {effectiveStock === 1 ? 'piece' : 'pieces'} remaining {hasVariants && selectedColor && selectedSize ? `in ${selectedColor} / ${selectedSize}` : 'in this production run'}.
                </span>
              ) : (
                <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.875rem' }}>
                  • In Stock ({effectiveStock} available) — Ready for dispatch within 48 hours.
                </span>
              )}
            </div>

            {/* Color Selector (for products with variants) */}
            {hasVariants && availableColors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                  Select Color: <strong style={{ color: 'var(--color-black)' }}>{selectedColor || 'None selected'}</strong>
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {availableColors.map((color) => {
                    const variantsForColor = activeVariants.filter((v) => v.color === color);
                    const totalColorStock = variantsForColor.reduce((sum, v) => sum + v.stock_quantity, 0);
                    const isSelected = selectedColor === color;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        style={{
                          padding: '8px 16px',
                          border: isSelected ? '2px solid var(--color-black)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-black)' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : 'var(--color-black)',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          borderRadius: '2px',
                          transition: 'all 0.15s ease',
                          opacity: totalColorStock === 0 ? 0.6 : 1,
                        }}
                      >
                        {color}
                        {totalColorStock === 0 && (
                          <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '6px' }}>(Sold Out)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selector (for products with variants) */}
            {hasVariants && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    Select Size: <strong style={{ color: 'var(--color-black)' }}>{selectedSize || 'None selected'}</strong>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.75rem',
                      color: 'var(--color-black)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Size Chart & Measurements
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {allSizes.map((s) => {
                    const variantForSize = colorVariants.find((v) => v.size === s);
                    const isUnavailable = !variantForSize;
                    const isOutOfStockSize = variantForSize && variantForSize.stock_quantity <= 0;
                    const isSelected = selectedSize === s;

                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => {
                          if (!isUnavailable) {
                            setSelectedSize(s);
                          }
                        }}
                        title={
                          isUnavailable
                            ? `${s} is unavailable in ${selectedColor}`
                            : isOutOfStockSize
                            ? `${s} is out of stock in ${selectedColor}`
                            : `${s} in stock (${variantForSize.stock_quantity} available)`
                        }
                        style={{
                          minWidth: '48px',
                          height: '46px',
                          padding: '0 14px',
                          border: isSelected ? '2px solid var(--color-black)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'var(--color-black)' : (isUnavailable ? '#F9FAFB' : '#FFFFFF'),
                          color: isSelected ? '#FFFFFF' : (isUnavailable ? '#D1D5DB' : (isOutOfStockSize ? '#9CA3AF' : 'var(--color-black)')),
                          fontWeight: 700,
                          cursor: isUnavailable ? 'not-allowed' : 'pointer',
                          borderRadius: '2px',
                          textDecoration: isOutOfStockSize ? 'line-through' : 'none',
                          opacity: isUnavailable ? 0.4 : 1,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                {selectedVariant && selectedVariant.stock_quantity <= 0 && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '6px', fontWeight: 600 }}>
                    {selectedSize} in {selectedColor} is currently out of stock.
                  </p>
                )}
              </div>
            )}

            {/* Quantity Selector, Add to Bag & Wishlist Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    -
                  </button>
                  <span style={{ padding: '0 12px', fontWeight: 600 }}>{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                    disabled={quantity >= effectiveStock || isOutOfStock}
                    style={{ padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '14px 20px' }}
                >
                  <ShoppingBag size={18} /> {isOutOfStock ? 'OUT OF STOCK' : 'ADD TO BAG'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  style={{
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-border)',
                    backgroundColor: isFavorited ? '#FFF1F1' : '#FFFFFF',
                    cursor: 'pointer',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease',
                  }}
                  title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  aria-label="Wishlist toggle"
                >
                  <Heart
                    size={20}
                    fill={isFavorited ? 'var(--dizco-red)' : 'none'}
                    color={isFavorited ? 'var(--dizco-red)' : 'var(--color-black)'}
                  />
                </button>
              </div>

              {!isOutOfStock && (
                <button
                  onClick={handleBuyNow}
                  className="btn btn-red btn-block"
                  style={{ padding: '14px 20px' }}
                >
                  BUY NOW WITH RAZORPAY
                </button>
              )}
            </div>

            {/* PIN Code Delivery Checker */}
            <div style={{
              backgroundColor: 'var(--color-surface)',
              padding: '16px',
              borderRadius: '2px',
              marginBottom: '28px',
              border: '1px solid var(--color-border)',
            }}>
              <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                Check Delivery Timeline
              </h4>
              <form onSubmit={checkPincode} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit PIN code"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                    border: '1px solid var(--color-border)',
                    flex: 1,
                    outline: 'none',
                  }}
                />
                <button type="submit" className="btn btn-secondary btn-sm">
                  CHECK
                </button>
              </form>
              {pincodeStatus && (
                <p style={{
                  fontSize: '0.75rem',
                  marginTop: '8px',
                  color: pincodeStatus.valid ? 'var(--color-success)' : 'var(--color-danger)',
                  fontWeight: 500,
                }}>
                  {pincodeStatus.message}
                </p>
              )}
            </div>

            {/* Accordions: Details, Care, Shipping */}
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              {/* Accordion 1: Details */}
              <div style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'details' ? '' : 'details')}
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <span>Fabric Composition & Architecture</span>
                  {openAccordion === 'details' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openAccordion === 'details' && (
                  <div style={{ paddingBottom: '16px', fontSize: '0.875rem', color: 'var(--color-dark-gray)', lineHeight: 1.6 }}>
                    <p>• Heavyweight combed compact yarn woven to resist pilling.</p>
                    <p>• Double-needle topstitching along armholes, shoulder lines, and hems.</p>
                    <p>• Retains geometric silhouette after multiple machine wash cycles.</p>
                  </div>
                )}
              </div>

              {/* Accordion 2: Care */}
              <div style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'care' ? '' : 'care')}
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <span>Care & Maintenance Instructions</span>
                  {openAccordion === 'care' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openAccordion === 'care' && (
                  <div style={{ paddingBottom: '16px', fontSize: '0.875rem', color: 'var(--color-dark-gray)', lineHeight: 1.6 }}>
                    <p>• Machine wash cold (30°C) with like dark colors.</p>
                    <p>• Reshape while damp and dry flat in shade.</p>
                    <p>• Cool iron on reverse. Do not iron directly on DIZCO screen emblems.</p>
                  </div>
                )}
              </div>

              {/* Accordion 3: Shipping */}
              <div style={{ borderBottom: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'shipping' ? '' : 'shipping')}
                  style={{
                    width: '100%',
                    padding: '16px 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  <span>Shipping & Returns Policy</span>
                  {openAccordion === 'shipping' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openAccordion === 'shipping' && (
                  <div style={{ paddingBottom: '16px', fontSize: '0.875rem', color: 'var(--color-dark-gray)', lineHeight: 1.6 }}>
                    <p>• Complimentary standard shipping on domestic orders over ₹2,999.</p>
                    <p>• All pieces dispatched from our Bengaluru warehouse within 48h.</p>
                    <p>• 7-day hassle-free size exchange policy across India.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Client Reviews Section */}
        <div style={{ marginTop: 'var(--space-12)', borderTop: '2px solid var(--color-black)', paddingTop: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                CLIENT VOICES
              </span>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                VERIFIED TESTIMONIALS & REVIEWS
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!isAuthenticated) {
                  addToast('Please sign in to submit a review', 'warning');
                  navigate('/login');
                } else {
                  setShowReviewModal(true);
                }
              }}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <MessageSquare size={16} /> WRITE A REVIEW
            </button>
          </div>

          {/* Rating Summary Bar */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            padding: '24px 32px',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '36px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                {reviewsData.average_rating > 0 ? reviewsData.average_rating.toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--color-mid-gray)' }}>/ 5.0</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    fill={star <= Math.round(reviewsData.average_rating) ? '#E51B24' : 'none'}
                    color={star <= Math.round(reviewsData.average_rating) ? '#E51B24' : '#D1D5DB'}
                  />
                ))}
              </div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-dark-gray)' }}>
                Based on {reviewsData.total_reviews} verified client {reviewsData.total_reviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          </div>

          {/* Reviews List */}
          {reviewsData.reviews && reviewsData.reviews.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {reviewsData.reviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    padding: '24px',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            fill={star <= rev.rating ? '#E51B24' : 'none'}
                            color={star <= rev.rating ? '#E51B24' : '#D1D5DB'}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                        {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                    </div>

                    {rev.title && (
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>
                        {rev.title}
                      </h4>
                    )}

                    <p style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', lineHeight: 1.6, marginBottom: '16px' }}>
                      "{rev.comment}"
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F3F4F6', paddingTop: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{rev.user_name || 'Verified Client'}</span>
                    {rev.is_verified_purchase && (
                      <span style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                        <ShieldCheck size={13} /> Verified Buyer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: '#FFFFFF',
              border: '1px dashed var(--color-border)',
              color: 'var(--color-mid-gray)',
            }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-black)', marginBottom: '4px' }}>
                No verified reviews published yet.
              </p>
              <p style={{ fontSize: '0.8125rem' }}>
                Purchased this garment? Be the first verified client to share styling and fit impressions.
              </p>
            </div>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: 'var(--space-12)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-4)', borderBottom: '2px solid var(--color-black)', paddingBottom: '12px' }}>
              COMPLETE THE SILHOUETTE
            </h3>
            <div className="product-grid">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowReviewModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '520px',
              padding: '32px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: '2px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textTransform: 'uppercase' }}>
                  WRITE CLIENT REVIEW
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                  {product.name}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {reviewSuccess ? (
              <div style={{ padding: '24px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '2px', textAlign: 'center' }}>
                <Check size={32} color="#059669" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ color: '#065F46', marginBottom: '8px' }}>Review Received</h4>
                <p style={{ fontSize: '0.85rem', color: '#047857' }}>{reviewSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview}>
                {reviewError && (
                  <div style={{ padding: '12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.8125rem', marginBottom: '16px', borderRadius: '2px' }}>
                    {reviewError}
                  </div>
                )}

                {/* Rating Selector */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label className="form-label">Overall Rating *</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <Star
                          size={24}
                          fill={star <= newReview.rating ? '#E51B24' : 'none'}
                          color={star <= newReview.rating ? '#E51B24' : '#D1D5DB'}
                        />
                      </button>
                    ))}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '8px' }}>
                      {newReview.rating} of 5 Stars
                    </span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Headline / Title (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Exceptional boxy drape and heavyweight cotton"
                    value={newReview.title}
                    onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Detailed Review & Fit Impressions *</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    required
                    placeholder="Describe material feel, silhouette, shoulder fit, wash performance..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  />
                </div>

                <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px', borderRadius: '2px', fontSize: '0.75rem', color: 'var(--color-mid-gray)', marginBottom: '20px' }}>
                  <strong>Editorial Note:</strong> In accordance with DIZCO verified commerce standards, only clients who purchased this garment may publish reviews. All submissions are moderated before public display.
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn btn-primary btn-sm"
                  >
                    {submittingReview ? 'SUBMITTING...' : 'SUBMIT REVIEW'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      {showSizeGuide && (
        <div
          className="modal-overlay"
          onClick={() => setShowSizeGuide(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '580px',
              padding: '32px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  SIZE GUIDE & MEASUREMENTS
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase' }}>
                  Standard DIZCO Regular / Boxy Fit Silhouette
                </p>
              </div>
              <button
                onClick={() => setShowSizeGuide(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                aria-label="Close size guide"
              >
                <X size={22} />
              </button>
            </div>

            {/* Unit Toggle */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
              <button
                type="button"
                onClick={() => setSizeUnit('in')}
                className={`btn btn-sm ${sizeUnit === 'in' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                INCHES (IN)
              </button>
              <button
                type="button"
                onClick={() => setSizeUnit('cm')}
                className={`btn btn-sm ${sizeUnit === 'cm' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                CENTIMETERS (CM)
              </button>
            </div>

            {/* Measurements Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--color-border)', fontWeight: 700 }}>SIZE</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--color-border)', fontWeight: 700 }}>CHEST</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--color-border)', fontWeight: 700 }}>LENGTH</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--color-border)', fontWeight: 700 }}>SHOULDER</th>
                  <th style={{ padding: '10px 12px', border: '1px solid var(--color-border)', fontWeight: 700 }}>SLEEVE</th>
                </tr>
              </thead>
              <tbody>
                {sizeTableData[sizeUnit].map((row) => (
                  <tr key={row.size} style={{ backgroundColor: selectedSize === row.size ? '#FFF9F9' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', border: '1px solid var(--color-border)', fontWeight: 700, color: selectedSize === row.size ? 'var(--dizco-red)' : 'inherit' }}>
                      {row.size} {selectedSize === row.size && '✓'}
                    </td>
                    <td style={{ padding: '10px 12px', border: '1px solid var(--color-border)' }}>{row.chest}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid var(--color-border)' }}>{row.length}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid var(--color-border)' }}>{row.shoulder}</td>
                    <td style={{ padding: '10px 12px', border: '1px solid var(--color-border)' }}>{row.sleeve}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Fit notes */}
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '16px', fontSize: '0.8rem', color: 'var(--color-dark-gray)', borderLeft: '3px solid var(--color-black)' }}>
              <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--color-black)' }}>HOW TO MEASURE:</p>
              <p>• <strong>Chest:</strong> Measure across the fullest part of the chest, under armpits.</p>
              <p>• <strong>Length:</strong> From highest shoulder point straight down to bottom hem.</p>
              <p>• <strong>Shoulder:</strong> Across the upper back seam to seam.</p>
              <p style={{ marginTop: '8px', fontStyle: 'italic' }}>
                All pieces are preshrunk. If you prefer a tighter fit, consider ordering one size down.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;

