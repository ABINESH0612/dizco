import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { addToast } = useToast();

  // Helper to generate a unique key for cart items
  const getCartItemId = (item) => {
    if (item.cart_item_id) return item.cart_item_id;
    return item.variant_id ? `${item.product.id}_${item.variant_id}` : `${item.product.id}`;
  };

  // Load from localStorage on mount and normalize
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dizco_cart');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((it) => ({
            ...it,
            cart_item_id: getCartItemId(it),
            price: it.price !== undefined ? Number(it.price) : Number(it.product.sale_price !== null && it.product.sale_price !== undefined ? it.product.sale_price : it.product.price),
            max_stock: it.max_stock !== undefined ? it.max_stock : (it.variant_id ? (it.product.variants?.find(v => v.id === it.variant_id)?.stock_quantity ?? it.product.stock_quantity) : it.product.stock_quantity),
          }));
          setItems(normalized);
        }
      }
    } catch (e) {
      console.error('Failed to load cart from storage', e);
    }
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('dizco_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (productOrPayload, quantityArg = 1, variantArg = null) => {
    let product, quantity, variant;
    if (productOrPayload && productOrPayload.product) {
      // Called with payload object: { product, variant_id, color, size, quantity, variant }
      product = productOrPayload.product;
      quantity = productOrPayload.quantity || 1;
      if (productOrPayload.variant) {
        variant = productOrPayload.variant;
      } else if (productOrPayload.variant_id && product.variants) {
        variant = product.variants.find((v) => v.id === productOrPayload.variant_id) || {
          id: productOrPayload.variant_id,
          color: productOrPayload.color,
          size: productOrPayload.size,
          stock_quantity: 999,
        };
      } else if (productOrPayload.color && productOrPayload.size && product.variants) {
        variant = product.variants.find((v) => v.color === productOrPayload.color && v.size === productOrPayload.size);
      }
    } else {
      product = productOrPayload;
      quantity = quantityArg;
      variant = variantArg;
    }

    if (!product) return false;

    const hasActiveVariants = product.variants && product.variants.some((v) => v.is_active);

    // 1. Variant product validation
    if (hasActiveVariants) {
      if (!variant || !variant.id) {
        addToast('Please select a color and size before adding to bag', 'warning');
        return false;
      }

      if (variant.stock_quantity <= 0) {
        addToast(`Selected variant (${variant.color} / ${variant.size}) is out of stock`, 'warning');
        return false;
      }
    } else {
      // Non-variant product stock check
      if (product.stock_quantity <= 0) {
        addToast(`${product.name} is currently out of stock`, 'warning');
        return false;
      }
    }

    const variantId = variant ? variant.id : null;
    const color = variant ? variant.color : null;
    const size = variant ? variant.size : null;
    const maxStock = variant ? variant.stock_quantity : product.stock_quantity;
    const itemPrice = variant && variant.price !== null && variant.price !== undefined
      ? Number(variant.price)
      : Number(product.sale_price !== null && product.sale_price !== undefined ? product.sale_price : product.price);
    const sku = variant ? variant.sku : product.sku;
    const cartItemId = variantId ? `${product.id}_${variantId}` : `${product.id}`;

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => getCartItemId(item) === cartItemId);

      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const newQty = existing.quantity + quantity;
        if (newQty > maxStock) {
          addToast(`Cannot add more than available stock (${maxStock})`, 'warning');
          return prev;
        }
        addToast(`Updated quantity for ${product.name}${variant ? ` (${variant.color} / ${variant.size})` : ''}`, 'info');
        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          max_stock: maxStock,
          price: itemPrice,
        };
        return updated;
      } else {
        const initialQty = Math.min(quantity, maxStock);
        addToast(`Added ${product.name}${variant ? ` (${variant.color} / ${variant.size})` : ''} to your bag`, 'success');
        return [
          ...prev,
          {
            cart_item_id: cartItemId,
            product,
            quantity: initialQty,
            variant_id: variantId,
            color,
            size,
            price: itemPrice,
            max_stock: maxStock,
            sku,
          },
        ];
      }
    });

    setIsCartOpen(true);
    return true;
  };

  const updateQuantity = (cartItemIdOrProductId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(cartItemIdOrProductId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        const matches =
          item.cart_item_id === cartItemIdOrProductId ||
          getCartItemId(item) === cartItemIdOrProductId ||
          (!item.variant_id && item.product.id === cartItemIdOrProductId);

        if (matches) {
          const maxStock = item.max_stock ?? item.product.stock_quantity;
          const safeQty = Math.min(quantity, maxStock);
          if (quantity > maxStock) {
            addToast(`Maximum available stock is ${maxStock}`, 'warning');
          }
          return { ...item, quantity: safeQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemIdOrProductId) => {
    setItems((prev) =>
      prev.filter((item) => {
        const matches =
          item.cart_item_id === cartItemIdOrProductId ||
          getCartItemId(item) === cartItemIdOrProductId ||
          (!item.variant_id && item.product.id === cartItemIdOrProductId);
        return !matches;
      })
    );
    addToast('Item removed from bag', 'info');
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('dizco_cart');
  };

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const cartSubtotal = items.reduce((sum, item) => {
    const itemPrice = item.price !== undefined
      ? Number(item.price)
      : (item.product.sale_price !== null && item.product.sale_price !== undefined
          ? Number(item.product.sale_price)
          : Number(item.product.price));
    return sum + itemPrice * item.quantity;
  }, 0);

  const shipping = items.length === 0 ? 0 : cartSubtotal >= 2999 ? 0 : 150;
  const cartTotal = cartSubtotal + shipping;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        shipping,
        cartTotal,
        isCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
