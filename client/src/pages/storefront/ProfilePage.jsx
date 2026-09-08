import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { orderApi, authApi } from '../../services/api';
import { User, Package, Lock, LogOut, ExternalLink, Clock, CheckCircle, Printer } from 'lucide-react';
import InvoiceModal from '../../components/common/InvoiceModal';

const ProfilePage = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'profile', 'security'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

  // Profile update form
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
  });

  // Password change form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/profile');
      return;
    }

    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        phone: user.phone || '',
      });
    }

    const fetchOrders = async () => {
      try {
        const res = await orderApi.getMyOrders();
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, user, navigate]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await authApi.updateProfile(profileData);
      await refreshUser();
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      addToast('Failed to update profile', 'error');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      await authApi.changePassword(passwordData);
      addToast('Password changed successfully', 'success');
      setPasswordData({ current_password: '', new_password: '' });
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to update password';
      addToast(msg, 'error');
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="profile-page" style={{ padding: 'var(--space-6) 0 var(--space-8) 0', backgroundColor: '#FAFAFA', minHeight: '80vh' }}>
      <div className="container">
        {/* Profile Header */}
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: '24px',
          borderRadius: '2px',
          marginBottom: 'var(--space-4)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: 'var(--color-near-black)',
              color: '#FFFFFF',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}>
              {user?.full_name?.charAt(0) || 'D'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{user?.full_name}</h2>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-mid-gray)' }}>{user?.email}</span>
            </div>
          </div>

          <button onClick={logout} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={14} /> SIGN OUT
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: 'var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '8px',
        }}>
          <button
            onClick={() => setActiveTab('orders')}
            className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Package size={15} /> ORDER HISTORY ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`btn btn-sm ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <User size={15} /> PERSONAL DETAILS
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`btn btn-sm ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Lock size={15} /> SECURITY
          </button>
        </div>

        {/* TAB 1: ORDER HISTORY */}
        {activeTab === 'orders' && (
          <div>
            {loadingOrders ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-mid-gray)' }}>
                Loading order archives...
              </div>
            ) : orders.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', padding: '48px 24px', textAlign: 'center', borderRadius: '2px' }}>
                <Package size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
                <h4 style={{ fontSize: '1.125rem', marginBottom: '6px' }}>No Orders Recorded</h4>
                <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  You haven't placed any orders yet. Discover our latest collections.
                </p>
                <button onClick={() => navigate('/shop')} className="btn btn-primary">
                  START BROWSING
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      padding: '20px 24px',
                      borderRadius: '2px',
                      boxShadow: 'var(--shadow-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      borderBottom: '1px solid #F0F0F0',
                      paddingBottom: '14px',
                      marginBottom: '14px',
                    }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                          Reference
                        </span>
                        <h4 style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--color-black)' }}>
                          {ord.order_number}
                        </h4>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                          Placed On
                        </span>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                          {new Date(ord.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                          Status
                        </span>
                        <div>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: ord.status === 'delivered' ? 'var(--color-success-bg)' : ord.payment_status === 'paid' ? '#E0F2FE' : '#FEF3C7',
                              color: ord.status === 'delivered' ? 'var(--color-success)' : ord.payment_status === 'paid' ? '#0369A1' : '#B45309',
                              fontWeight: 700,
                            }}
                          >
                            {ord.status.toUpperCase()} ({ord.payment_status.toUpperCase()})
                          </span>
                        </div>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                          Total Amount
                        </span>
                        <h4 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
                          {formatINR(ord.total)}
                        </h4>
                      </div>

                      <div>
                        <button
                          onClick={() => setSelectedInvoiceOrder(ord)}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', padding: '6px 12px' }}
                        >
                          <Printer size={13} /> INVOICE
                        </button>
                      </div>
                    </div>

                    {/* Order Items preview */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {ord.items?.map((item) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={item.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'}
                            alt={item.product_name}
                            style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '2px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <h5 style={{ fontSize: '0.875rem' }}>{item.product_name}</h5>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                              Quantity: {item.quantity} × {formatINR(item.price)}
                            </span>
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {formatINR(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERSONAL DETAILS */}
        {activeTab === 'profile' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '2px', maxWidth: '540px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Personal Profile</h3>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Read-only)</label>
                <input
                  type="email"
                  className="form-control"
                  value={user?.email || ''}
                  disabled
                  style={{ backgroundColor: '#F3F4F6' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-control"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                SAVE CHANGES
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: SECURITY */}
        {activeTab === 'security' && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '2px', maxWidth: '540px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Update Password</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  minLength={6}
                  className="form-control"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                UPDATE PASSWORD
              </button>
            </form>
          </div>
        )}
      </div>

      <InvoiceModal
        order={selectedInvoiceOrder}
        isOpen={Boolean(selectedInvoiceOrder)}
        onClose={() => setSelectedInvoiceOrder(null)}
      />
    </div>
  );
};

export default ProfilePage;
