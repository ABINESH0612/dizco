import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { DollarSign, ShoppingBag, Users, AlertTriangle, ArrowRight, Package } from 'lucide-react';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, alertRes] = await Promise.all([
          adminApi.getDashboard(),
          adminApi.getInventoryAlerts()
        ]);
        setMetrics(dashRes.data);
        setLowStock(alertRes.data);
      } catch (err) {
        console.error('Error fetching admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return <div>Aggregating platform metrics...</div>;
  }

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const statCards = [
    {
      title: 'TOTAL REVENUE',
      value: formatINR(metrics?.total_sales),
      subtitle: 'Paid transactions via Razorpay',
      icon: <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>₹</span>,
      bg: '#ECFDF5',
    },
    {
      title: 'TOTAL ORDERS',
      value: metrics?.total_orders || 0,
      subtitle: 'All customer checkouts',
      icon: <ShoppingBag size={20} color="#2563EB" />,
      bg: '#EFF6FF',
    },
    {
      title: 'REGISTERED CUSTOMERS',
      value: metrics?.total_customers || 0,
      subtitle: 'Customer storefront profiles',
      icon: <Users size={20} color="#7C3AED" />,
      bg: '#F5F3FF',
    },
    {
      title: 'LOW STOCK ALERTS',
      value: metrics?.low_stock_count || 0,
      subtitle: 'Products ≤ 5 units in stock',
      icon: <AlertTriangle size={20} color="var(--dizco-red)" />,
      bg: '#FEF2F2',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>OPERATIONAL DASHBOARD</h1>
        <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
          Overview of DIZCO sales performance, inventory health, and recent client transactions.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '32px',
      }}>
        {statCards.map((card) => (
          <div
            key={card.title}
            style={{
              backgroundColor: '#FFFFFF',
              padding: '20px',
              borderRadius: '2px',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-mid-gray)', letterSpacing: '0.05em' }}>
                {card.title}
              </span>
              <div style={{ width: '36px', height: '36px', borderRadius: '4px', backgroundColor: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{card.value}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '4px', display: 'block' }}>
                {card.subtitle}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column Split: Recent Orders & Inventory Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Recent Orders */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '2px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.0625rem' }}>RECENT ORDERS</h3>
            <Link to="/admin/orders" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              VIEW ALL <ArrowRight size={14} />
            </Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.recent_orders?.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    No recent orders
                  </td>
                </tr>
              ) : (
                metrics?.recent_orders?.map((ord) => (
                  <tr key={ord.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ord.order_number}</span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: ord.payment_status === 'paid' ? '#E0F2FE' : '#FEF3C7',
                        color: ord.payment_status === 'paid' ? '#0369A1' : '#B45309',
                      }}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                    <td>{ord.items?.length || 1} items</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(ord.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alerts */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '2px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.0625rem' }}>INVENTORY ALERTS</h3>
            <Link to="/admin/products" style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              MANAGE <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lowStock.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-success)', padding: '12px 0' }}>
                All products maintain healthy inventory levels.
              </p>
            ) : (
              lowStock.map((prod) => (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '2px',
                    borderLeft: '3px solid var(--dizco-red)',
                  }}
                >
                  <div style={{ overflow: 'hidden' }}>
                    <h5 style={{ fontSize: '0.8125rem', fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {prod.name}
                    </h5>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                      SKU: {prod.sku}
                    </span>
                  </div>
                  <span className="badge badge-red" style={{ flexShrink: 0 }}>
                    {prod.stock_quantity} LEFT
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
