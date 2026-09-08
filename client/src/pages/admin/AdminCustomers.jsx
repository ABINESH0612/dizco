import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Users, Mail, Phone, Calendar } from 'lucide-react';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await adminApi.getCustomers();
        setCustomers(res.data);
      } catch (err) {
        addToast('Failed to load customers', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>REGISTERED CUSTOMERS</h1>
        <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
          Customer profiles registered through DIZCO storefront accounts.
        </p>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '2px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Account Created</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>Loading client records...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-mid-gray)' }}>
                  No customer profiles registered.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                      }}>
                        {c.full_name?.charAt(0) || 'C'}
                      </div>
                      <span style={{ fontWeight: 700 }}>{c.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                      <Mail size={13} color="var(--color-muted)" /> {c.email}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}>
                      <Phone size={13} color="var(--color-muted)" /> {c.phone || '—'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem' }}>
                    {new Date(c.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: c.is_active ? '#ECFDF5' : '#FEF2F2',
                      color: c.is_active ? '#065F46' : '#991B1B',
                    }}>
                      {c.is_active ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCustomers;
