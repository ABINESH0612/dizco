import React from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';

const InvoiceModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  let addressObj = {};
  try {
    addressObj = typeof order.shipping_address_json === 'string'
      ? JSON.parse(order.shipping_address_json)
      : (order.shipping_address_json || {});
  } catch (e) {
    addressObj = {};
  }

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.subtotal || (order.total - (order.shipping || 0));
  const gstAmount = Math.round(subtotal * 0.12); // standard 12% apparel GST

  return (
    <div
      className="modal-overlay print-modal"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2500,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '40px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        {/* Action Header (hidden on print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Official Tax Invoice
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrint}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        <div id="invoice-document" style={{ fontFamily: 'var(--font-body)', color: '#111111' }}>
          {/* Brand Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                DIZCO<span style={{ color: 'var(--dizco-red)', fontSize: '1.2rem', verticalAlign: 'super' }}>©</span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#666', margin: '4px 0 0' }}>
                Contemporary Ready-to-Wear Apparel
              </p>
              <p style={{ fontSize: '0.7rem', color: '#888', margin: '2px 0 0' }}>
                GSTIN: 29AABCD1234E1Z5 • Bengaluru, Karnataka
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>
                TAX INVOICE
              </span>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'monospace', margin: '2px 0' }}>
                {order.order_number}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#555', margin: 0 }}>
                Date: {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <span style={{
                display: 'inline-block',
                marginTop: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#166534',
                backgroundColor: '#DCFCE7',
                padding: '2px 8px',
                borderRadius: '2px'
              }}>
                PAID VIA {order.payment_method?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', backgroundColor: '#F9F9F8', padding: '16px', marginBottom: '28px', border: '1px solid #E5E5E5' }}>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#777', fontWeight: 700 }}>
                Billed / Shipped To:
              </span>
              <h4 style={{ fontSize: '0.95rem', margin: '4px 0 2px' }}>{addressObj.full_name || 'Customer'}</h4>
              <p style={{ fontSize: '0.8rem', color: '#444', margin: 0, lineHeight: 1.4 }}>
                {addressObj.address_line1} {addressObj.address_line2 && `, ${addressObj.address_line2}`}<br />
                {addressObj.city}, {addressObj.state} — {addressObj.zip_code}<br />
                Phone: {addressObj.phone}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#777', fontWeight: 700 }}>
                Payment & Fulfillment Reference:
              </span>
              <p style={{ fontSize: '0.8rem', color: '#444', margin: '4px 0 0', lineHeight: 1.4 }}>
                Payment ID: {order.razorpay_payment_id || 'RZP_VERIFIED_SYS'}<br />
                Status: {order.status?.toUpperCase()}<br />
                Courier: Bluedart Air Express (Complimentary)
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #111', textAlign: 'left' }}>
                <th style={{ padding: '8px 4px', fontWeight: 700 }}>ITEM / GARMENT</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 700 }}>QTY</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>PRICE</th>
                <th style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, idx) => (
                <tr key={item.id || idx} style={{ borderBottom: '1px solid #E5E5E5' }}>
                  <td style={{ padding: '12px 4px' }}>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    <span style={{ fontSize: '0.7rem', color: '#777' }}>HSN 61091000 • DIZCO READY-TO-WEAR</span>
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 4px', textAlign: 'right' }}>{formatINR(item.price)}</td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600 }}>
                    {formatINR(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Breakdown */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                <span>Subtotal (Excl. Tax)</span>
                <span>{formatINR(subtotal - gstAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                <span>GST (12% Apparel)</span>
                <span>{formatINR(gstAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
                <span>Delivery Charges</span>
                <span>{order.shipping === 0 ? 'FREE' : formatINR(order.shipping)}</span>
              </div>
              <div style={{ borderTop: '2px solid #111', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800 }}>
                <span>Grand Total</span>
                <span>{formatINR(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer Legal Notes */}
          <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: '16px', fontSize: '0.75rem', color: '#777', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px' }}>
              This is a computer-generated tax invoice. No signature required.
            </p>
            <p style={{ margin: 0 }}>
              DIZCO FASHIONS PVT. LTD. • Customer Concierge: support@dizco.com • Returns valid within 14 days of delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Print media query */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-modal, .print-modal * {
            visibility: visible;
          }
          .print-modal {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: none !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
