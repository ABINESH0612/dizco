import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X, Tag, CheckCircle2, History, Power } from 'lucide-react';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Usage history modal state
  const [usageModalCoupon, setUsageModalCoupon] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // Search/Filter state
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '0',
    max_discount: '',
    usage_limit: '',
    per_user_limit: '1',
    expiry_date: '',
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState({});

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCoupons();
      setCoupons(res.data);
    } catch (err) {
      addToast('Failed to load coupons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '0',
      max_discount: '',
      usage_limit: '',
      per_user_limit: '1',
      expiry_date: '',
      is_active: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCoupon(c);
    setFormData({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: String(c.min_order_amount || '0'),
      max_discount: c.max_discount !== null && c.max_discount !== undefined ? String(c.max_discount) : '',
      usage_limit: c.usage_limit !== null && c.usage_limit !== undefined ? String(c.usage_limit) : '',
      per_user_limit: String(c.per_user_limit || '1'),
      expiry_date: c.expiry_date ? c.expiry_date.substring(0, 16) : '',
      is_active: c.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openUsageModal = async (c) => {
    setUsageModalCoupon(c);
    setUsageLoading(true);
    try {
      const res = await adminApi.getCouponUsage(c.id);
      setUsageHistory(res.data);
    } catch (err) {
      addToast('Failed to load usage history', 'error');
      setUsageHistory([]);
    } finally {
      setUsageLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.code.trim()) errors.code = 'Coupon code is required';
    const val = Number(formData.discount_value);
    if (!formData.discount_value || isNaN(val) || val <= 0) {
      errors.discount_value = 'Discount value must be greater than 0';
    } else if (formData.discount_type === 'percentage' && val > 100) {
      errors.discount_value = 'Percentage discount cannot exceed 100%';
    }

    const minAmt = Number(formData.min_order_amount);
    if (isNaN(minAmt) || minAmt < 0) {
      errors.min_order_amount = 'Minimum order amount must be 0 or greater';
    }

    if (formData.max_discount && (isNaN(Number(formData.max_discount)) || Number(formData.max_discount) < 0)) {
      errors.max_discount = 'Maximum discount must be positive';
    }

    if (formData.usage_limit && (isNaN(Number(formData.usage_limit)) || Number(formData.usage_limit) <= 0)) {
      errors.usage_limit = 'Usage limit must be a positive number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      code: formData.code.trim().toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      min_order_amount: parseFloat(formData.min_order_amount || '0'),
      max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null,
      per_user_limit: parseInt(formData.per_user_limit || '1', 10),
      expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
      is_active: Boolean(formData.is_active),
    };

    try {
      if (editingCoupon) {
        await adminApi.updateCoupon(editingCoupon.id, payload);
        addToast(`Coupon '${payload.code}' updated successfully`, 'success');
      } else {
        await adminApi.createCoupon(payload);
        addToast(`Coupon '${payload.code}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchCoupons();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save coupon';
      addToast(msg, 'error');
    }
  };

  const handleToggleActive = async (c) => {
    try {
      await adminApi.updateCoupon(c.id, { is_active: !c.is_active });
      addToast(`Coupon '${c.code}' is now ${!c.is_active ? 'ACTIVE' : 'INACTIVE'}`, 'info');
      fetchCoupons();
    } catch (err) {
      addToast('Failed to toggle coupon status', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteCoupon(id);
      addToast('Coupon deleted successfully', 'info');
      setDeleteConfirmId(null);
      fetchCoupons();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to delete coupon';
      addToast(msg, 'error');
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.discount_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>COUPON MANAGEMENT</h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            Create promotional codes, manage discount rules, set redemption limits and view redemptions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search coupons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: '2px',
              fontSize: '0.8125rem',
              outline: 'none',
              width: '180px',
            }}
          />
          <button onClick={openCreateModal} className="btn btn-red" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> ADD COUPON
          </button>
        </div>
      </div>

      {/* Main Coupons Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '2px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', overflowX: 'auto' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Discount Value</th>
              <th>Min Order</th>
              <th>Max Discount</th>
              <th>Usage (Used/Limit)</th>
              <th>Expiry</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>Loading promotional coupons...</td>
              </tr>
            ) : filteredCoupons.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>No promotional coupons found</td>
              </tr>
            ) : (
              filteredCoupons.map((c) => {
                const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
                const limitReached = c.usage_limit !== null && c.used_count >= c.usage_limit;

                return (
                  <tr key={c.id}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        backgroundColor: 'var(--color-surface)',
                        padding: '4px 8px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '2px',
                      }}>
                        {c.code}
                      </span>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-mid-gray)' }}>
                      {c.discount_type}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatINR(c.discount_value)}
                    </td>
                    <td>{c.min_order_amount > 0 ? formatINR(c.min_order_amount) : 'None'}</td>
                    <td>{c.max_discount ? formatINR(c.max_discount) : '—'}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => openUsageModal(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563EB',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          padding: 0,
                        }}
                        title="Click to view redemption details"
                      >
                        {c.used_count} / {c.usage_limit !== null ? c.usage_limit : '∞'}
                        <History size={12} />
                      </button>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {c.expiry_date ? (
                        <span style={{ color: isExpired ? '#DC2626' : 'inherit' }}>
                          {new Date(c.expiry_date).toLocaleDateString()} {isExpired && '(Expired)'}
                        </span>
                      ) : (
                        'Never'
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: c.is_active && !isExpired && !limitReached ? '#ECFDF5' : '#FEF2F2',
                          color: c.is_active && !isExpired && !limitReached ? '#065F46' : '#991B1B',
                        }}
                      >
                        {!c.is_active ? 'INACTIVE' : isExpired ? 'EXPIRED' : limitReached ? 'MAXED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleToggleActive(c)}
                          style={{
                            padding: '6px',
                            background: 'none',
                            border: `1px solid ${c.is_active ? '#FBBF24' : '#34D399'}`,
                            color: c.is_active ? '#D97706' : '#059669',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          style={{ padding: '6px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '2px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(c.id)}
                          style={{ padding: '6px', background: 'none', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '2px', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem', letterSpacing: '0.04em' }}>
                {editingCoupon ? 'EDIT COUPON' : 'CREATE PROMOTIONAL COUPON'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Coupon Code *</label>
                <input
                  type="text"
                  className={`form-control ${formErrors.code ? 'error' : ''}`}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. DIZCO20"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.06em' }}
                />
                {formErrors.code && <p className="form-error-text">{formErrors.code}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Discount Type *</label>
                  <select
                    className="form-control"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {formData.discount_type === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (₹) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-control ${formErrors.discount_value ? 'error' : ''}`}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percentage' ? '15' : '500'}
                  />
                  {formErrors.discount_value && <p className="form-error-text">{formErrors.discount_value}</p>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Min. Order Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max. Discount (₹, Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    placeholder="e.g. 1000"
                    disabled={formData.discount_type === 'fixed'}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Total Usage Limit</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Per User Limit</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.per_user_limit}
                    onChange={(e) => setFormData({ ...formData, per_user_limit: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <input
                  type="checkbox"
                  id="coupon_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="coupon_active" style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                  Active for customer redemption
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  CANCEL
                </button>
                <button type="submit" className="btn btn-red">
                  {editingCoupon ? 'SAVE CHANGES' : 'CREATE COUPON'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Usage History Modal */}
      {usageModalCoupon && (
        <div className="modal-overlay" onClick={() => setUsageModalCoupon(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem' }}>
                  REDEMPTION HISTORY — <span style={{ fontFamily: 'monospace', color: 'var(--dizco-red)' }}>{usageModalCoupon.code}</span>
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                  Total redemptions: {usageModalCoupon.used_count}
                </span>
              </div>
              <button onClick={() => setUsageModalCoupon(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {usageLoading ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--color-mid-gray)' }}>Loading redemption history...</p>
            ) : usageHistory.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--color-mid-gray)' }}>No redemptions recorded for this coupon yet.</p>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Email</th>
                      <th>Order ID</th>
                      <th>Discount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageHistory.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{u.user_email || `User #${u.user_id}`}</td>
                        <td style={{ fontFamily: 'monospace' }}>#{u.order_id}</td>
                        <td style={{ color: '#059669', fontWeight: 700 }}>{formatINR(u.discount_amount)}</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                          {new Date(u.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button onClick={() => setUsageModalCoupon(null)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '12px' }}>Confirm Deletion</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-dark-gray)', marginBottom: '24px' }}>
              Are you sure you want to permanently delete this coupon? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary">
                CANCEL
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="btn btn-red">
                DELETE COUPON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
