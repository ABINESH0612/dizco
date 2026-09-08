import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Layout Components
import UtilityBar from './components/layout/UtilityBar';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/cart/CartDrawer';
import AdminLayout from './components/layout/AdminLayout';

// Storefront Pages
import HomePage from './pages/storefront/HomePage';
import ProductListPage from './pages/storefront/ProductListPage';
import ProductDetailPage from './pages/storefront/ProductDetailPage';
import CartPage from './pages/storefront/CartPage';
import WishlistPage from './pages/storefront/WishlistPage';
import CheckoutPage from './pages/storefront/CheckoutPage';
import OrderSuccessPage from './pages/storefront/OrderSuccessPage';
import ProfilePage from './pages/storefront/ProfilePage';
import CMSPage from './pages/storefront/CMSPage';
import AuthPage from './pages/auth/AuthPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminReviews from './pages/admin/AdminReviews';
import AdminSettings from './pages/admin/AdminSettings';

// Storefront Shell Wrapper
const StorefrontLayout = () => {
  return (
    <div className="page-wrapper">
      <UtilityBar />
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <Routes>
                {/* Customer Storefront Routes */}
                <Route element={<StorefrontLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/shop" element={<ProductListPage />} />
                  <Route path="/products" element={<ProductListPage />} />
                  <Route path="/product/:slug" element={<ProductDetailPage />} />
                  <Route path="/products/:slug" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/order-success/:orderNumber" element={<OrderSuccessPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/cms/:slug" element={<CMSPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/login/customer" element={<Navigate to="/login" replace />} />
                  <Route path="/login/admin" element={<Navigate to="/login?mode=admin" replace />} />
                  <Route path="/register" element={<Navigate to="/login?tab=register" replace />} />
                </Route>

                {/* Admin Panel Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="customers" element={<AdminCustomers />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="reviews" element={<AdminReviews />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
