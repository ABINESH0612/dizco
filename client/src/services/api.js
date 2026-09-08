import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching JWT Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dizco_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized on protected routes, we can clear token if invalid
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/profile')) {
        localStorage.removeItem('dizco_token');
        localStorage.removeItem('dizco_user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Catalog endpoints
export const catalogApi = {
  getCategories: () => api.get('/categories'),
  getCategory: (slug) => api.get(`/categories/${slug}`),
  getProducts: (params) => api.get('/products', { params }),
  getFeaturedProducts: (limit = 8) => api.get('/products/featured', { params: { limit } }),
  getProduct: (slug) => api.get(`/products/${slug}`),
};

// Orders & Checkout endpoints
export const orderApi = {
  createOrder: (data) => api.post('/orders', data),
  createRazorpayOrder: (orderId) => api.post('/orders/razorpay/create', { order_id: orderId }),
  verifyRazorpayPayment: (data) => api.post('/orders/razorpay/verify', data),
  getMyOrders: () => api.get('/orders/my-orders'),
  getOrder: (orderId) => api.get(`/orders/${orderId}`),
};

// Coupon endpoints
export const couponApi = {
  validateCoupon: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

// Admin endpoints
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getOrders: (params) => api.get('/admin/orders', { params }),
  updateOrderStatus: (orderId, status) => api.put(`/admin/orders/${orderId}/status`, { status }),
  getInventoryAlerts: () => api.get('/admin/inventory/alerts'),
  getCustomers: () => api.get('/admin/customers'),
  getAllCategories: () => api.get('/categories/all'),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  uploadProductImage: (productId, formData) => api.post(`/products/${productId}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  replaceProductImage: (imageId, formData) => api.put(`/products/images/${imageId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  setPrimaryProductImage: (imageId) => api.put(`/products/images/${imageId}/primary`),
  deleteProductImage: (imageId) => api.delete(`/products/images/${imageId}`),
  // Coupon Management
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
  getCouponUsage: (id) => api.get(`/admin/coupons/${id}/usage`),
};

// CMS & Settings
export const cmsApi = {
  getPage: (slug) => api.get(`/cms/pages/${slug}`),
  updatePage: (slug, data) => api.put(`/cms/pages/${slug}`, data),
  getSettings: () => api.get('/cms/settings'),
  updateSetting: (key, data) => api.put(`/cms/settings/${key}`, data),
};

// Review endpoints
export const reviewApi = {
  getProductReviews: (slug) => api.get(`/products/${slug}/reviews`),
  getMyReview: (productId) => api.get(`/products/${productId}/my-review`),
  submitReview: (productId, data) => api.post(`/products/${productId}/reviews`, data),
  deleteOwnReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
  getAdminReviews: (status) => api.get('/admin/reviews', { params: status ? { status_filter: status } : {} }),
  updateReviewStatus: (reviewId, status) => api.put(`/admin/reviews/${reviewId}/status`, { status }),
  deleteReview: (reviewId) => api.delete(`/admin/reviews/${reviewId}`),
};

export default api;
