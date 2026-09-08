import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Eye, X, CheckCircle } from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { addToast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getOrders({
        status_filter: statusFilter || undefined,
        limit: 50,
      });
      setOrders(res.data);
    } catch (err) {
      addToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      addToast(`Order status updated to ${newStatus.toUpperCase()}`, 'success');
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
      }
      fetchOrders();
    } catch (err) {
      addToast('Failed to update order status', 'error');
    }
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>ORDER MANAGEMENT</h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            Review customer orders, dispatch status, and Razorpay transaction settlements.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', textTransform: 'uppercase' }}
            >
              {st === '' ? 'ALL' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '2px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Placed Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading orders...</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-mid-gray)' }}>
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr key={ord.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{ord.order_number}</span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    {new Date(ord.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: '1px solid var(--color-border)',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        backgroundColor:
                          ord.status === 'delivered' ? 'var(--color-success-bg)' :
                          ord.status === 'shipped' ? '#E0F2FE' :
                          ord.status === 'cancelled' ? '#FEE2E2' : '#FEF3C7',
                        color:
                          ord.status === 'delivered' ? 'var(--color-success)' :
                          ord.status === 'shipped' ? '#0369A1' :
                          ord.status === 'cancelled' ? '#B91C1C' : '#B45309',
                      }}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: ord.payment_status === 'paid' ? '#ECFDF5' : '#FEF2F2',
                      color: ord.payment_status === 'paid' ? '#065F46' : '#991B1B',
                    }}>
                      {ord.payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatINR(ord.total)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedOrder(ord)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> DETAILS
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>ORDER DETAILS</span>
                <h3 style={{ fontSize: '1.25rem', fontFamily: 'monospace' }}>{selectedOrder.order_number}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Delivery address parsing */}
            <div style={{ backgroundColor: 'var(--color-surface)', padding: '16px', borderRadius: '2px', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', marginBottom: '6px' }}>Shipping Address</h4>
              {(() => {
                try {
                  const addr = JSON.parse(selectedOrder.shipping_address_json);
                  return (
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                      <p><strong>{addr.full_name}</strong> ({addr.phone})</p>
                      <p>{addr.address_line1} {addr.address_line2 ? `, ${addr.address_line2}` : ''}</p>
                      <p>{addr.city}, {addr.state} - {addr.zip_code}</p>
                    </div>
                  );
                } catch (e) {
                  return <p style={{ fontSize: '0.875rem' }}>{selectedOrder.shipping_address_json}</p>;
                }
              })()}
            </div>

            {/* Items list */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', marginBottom: '10px' }}>Garments in Order</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #F0F0F0', paddingBottom: '8px' }}>
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'} alt="" style={{ width: '40px', height: '50px', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <h5 style={{ fontSize: '0.875rem' }}>{item.product_name}</h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Qty: {item.quantity} × {formatINR(item.price)}</span>
                    </div>
                    <strong>{formatINR(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Financials & Status */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>Razorpay Order ID: {selectedOrder.razorpay_order_id || 'Direct'}</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Total: {formatINR(selectedOrder.total)}</div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn btn-primary btn-sm">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
