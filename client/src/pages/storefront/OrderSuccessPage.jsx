import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, PackageCheck, ArrowRight, Home, Printer } from 'lucide-react';
import InvoiceModal from '../../components/common/InvoiceModal';

const OrderSuccessPage = () => {
  const { orderNumber } = useParams();
  const location = useLocation();
  const order = location.state?.order;
  const [showInvoice, setShowInvoice] = useState(false);

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="order-success-page" style={{ padding: 'var(--space-8) 0', backgroundColor: '#FAFAFA', minHeight: '80vh' }}>
      <div className="container" style={{ maxWidth: '640px' }}>
        <div style={{
          backgroundColor: '#FFFFFF',
          padding: 'var(--space-6)',
          borderRadius: '2px',
          boxShadow: 'var(--shadow-sm)',
          textAlign: 'center',
          borderTop: '4px solid var(--dizco-red)',
        }}>
          {/* Animated Success Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: 'var(--color-success-bg)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: 'var(--color-success)',
          }}>
            <CheckCircle2 size={36} />
          </div>

          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.1em' }}>
            PAYMENT CONFIRMED • DISPATCH QUEUED
          </span>

          <h1 style={{ fontSize: '2rem', marginTop: '6px', marginBottom: '8px' }}>
            ORDER CONFIRMED
          </h1>

          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.9375rem', marginBottom: '24px' }}>
            Thank you for shopping with DIZCO. Your tailored garments are being prepared at our fulfillment center.
          </p>

          {/* Reference Card */}
          <div style={{
            backgroundColor: 'var(--color-surface)',
            padding: '16px',
            borderRadius: '2px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <div>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                Order Reference
              </span>
              <h4 style={{ fontSize: '1.0625rem', fontFamily: 'monospace', color: 'var(--color-black)', marginTop: '2px' }}>
                {orderNumber}
              </h4>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>
                Estimated Delivery
              </span>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-success)' }}>
                2–4 Business Days
              </h4>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {order && (
              <button
                onClick={() => setShowInvoice(true)}
                className="btn btn-secondary"
                style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> PRINT TAX INVOICE
              </button>
            )}
            <Link to="/profile" className="btn btn-secondary" style={{ padding: '12px 20px' }}>
              VIEW IN MY ORDERS
            </Link>
            <Link to="/products" className="btn btn-primary" style={{ padding: '12px 20px' }}>
              CONTINUE SHOPPING <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {order && (
        <InvoiceModal
          order={order}
          isOpen={showInvoice}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  );
};

export default OrderSuccessPage;
