import React, { useEffect, useState } from 'react';
import { reviewApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Clock,
} from 'lucide-react';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | rejected
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? null : statusFilter;
      const res = await reviewApi.getAdminReviews(filter);
      setReviews(res.data || []);
    } catch (err) {
      console.error(err);
      addToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const handleUpdateStatus = async (reviewId, newStatus) => {
    try {
      await reviewApi.updateReviewStatus(reviewId, newStatus);
      addToast(`Review marked as ${newStatus}`, 'success');
      // Update local state immediately
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      addToast('Failed to update review status', 'error');
    }
  };

  const handleDelete = async (reviewId) => {
    setActionLoading(true);
    try {
      await reviewApi.deleteReview(reviewId);
      addToast('Review deleted successfully', 'info');
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setDeleteConfirmId(null);
    } catch (err) {
      addToast('Failed to delete review', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics calculation
  const totalCount = reviews.length;
  const pendingCount = reviews.filter((r) => r.status === 'pending').length;
  const approvedCount = reviews.filter((r) => r.status === 'approved').length;
  const rejectedCount = reviews.filter((r) => r.status === 'rejected').length;

  const renderStars = (rating) => {
    return (
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            fill={star <= rating ? '#E51B24' : 'none'}
            color={star <= rating ? '#E51B24' : '#D1D5DB'}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span
            className="badge"
            style={{ backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}
          >
            APPROVED
          </span>
        );
      case 'rejected':
        return (
          <span
            className="badge"
            style={{ backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}
          >
            REJECTED
          </span>
        );
      case 'pending':
      default:
        return (
          <span
            className="badge"
            style={{ backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
          >
            PENDING
          </span>
        );
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>PRODUCT REVIEWS MODERATION</h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            Moderate verified customer feedback, maintain quality standards, and publish authentic client reviews.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '2px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#F3F4F6', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={20} color="var(--color-dark)" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL REVIEWS</span>
            <strong style={{ fontSize: '1.25rem', display: 'block' }}>{totalCount}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '2px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#FFFBEB', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} color="#D97706" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PENDING MODERATION</span>
            <strong style={{ fontSize: '1.25rem', display: 'block', color: '#D97706' }}>{pendingCount}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '2px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#ECFDF5', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={20} color="#059669" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>APPROVED</span>
            <strong style={{ fontSize: '1.25rem', display: 'block', color: '#059669' }}>{approvedCount}</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', padding: '16px 20px', borderRadius: '2px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#FEF2F2', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={20} color="#DC2626" />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>REJECTED</span>
            <strong style={{ fontSize: '1.25rem', display: 'block', color: '#DC2626' }}>{rejectedCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '2px', marginBottom: '20px', border: '1px solid var(--color-border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textTransform: 'uppercase', fontSize: '0.75rem', padding: '6px 14px' }}
          >
            {st === 'all' ? 'All Reviews' : st}
          </button>
        ))}
      </div>

      {/* Reviews Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '2px', overflowX: 'auto', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Garment</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review Details</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading reviews...</td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-mid-gray)' }}>
                  No customer reviews found matching filter '{statusFilter}'.
                </td>
              </tr>
            ) : (
              reviews.map((rev) => (
                <tr key={rev.id}>
                  <td style={{ fontWeight: 600 }}>
                    {rev.product_name || `Product #${rev.product_id}`}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{rev.user_name || 'Client'}</span>
                      {rev.is_verified_purchase && (
                        <span style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <ShieldCheck size={12} /> Verified Buyer
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    {renderStars(rev.rating)}
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    {rev.title && <strong style={{ display: 'block', fontSize: '0.8125rem', marginBottom: '2px' }}>{rev.title}</strong>}
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-dark-gray)', lineHeight: 1.4 }}>
                      {rev.comment}
                    </span>
                  </td>
                  <td>
                    {getStatusBadge(rev.status)}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', whiteSpace: 'nowrap' }}>
                    {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      {rev.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, 'approved')}
                          style={{
                            padding: '6px 10px',
                            background: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#065F46',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Approve Review"
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                      )}

                      {rev.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(rev.id, 'rejected')}
                          style={{
                            padding: '6px 10px',
                            background: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            color: '#92400E',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Reject Review"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteConfirmId(rev.id)}
                        style={{
                          padding: '6px 8px',
                          background: 'none',
                          border: '1px solid #FCA5A5',
                          color: '#DC2626',
                          borderRadius: '2px',
                          cursor: 'pointer',
                        }}
                        title="Delete Review"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Trash2 size={36} color="var(--dizco-red)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ marginBottom: '8px' }}>Confirm Deletion</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-mid-gray)', marginBottom: '20px' }}>
              Are you sure you want to permanently delete this customer review? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn btn-secondary btn-sm"
                disabled={actionLoading}
              >
                CANCEL
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="btn btn-danger btn-sm"
                disabled={actionLoading}
              >
                {actionLoading ? 'DELETING...' : 'CONFIRM DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
