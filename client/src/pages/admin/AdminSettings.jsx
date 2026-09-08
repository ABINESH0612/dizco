import React, { useEffect, useState } from 'react';
import { cmsApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Settings, Save, Shield } from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState({});
  const { addToast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await cmsApi.getSettings();
        setSettings(res.data);
        const map = {};
        res.data.forEach((s) => {
          map[s.key] = s.value;
        });
        setFormValues(map);
      } catch (err) {
        addToast('Failed to load store settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    try {
      await cmsApi.updateSetting(key, { value: formValues[key] });
      addToast(`Setting '${key}' updated successfully`, 'success');
    } catch (err) {
      addToast(`Failed to update '${key}'`, 'error');
    }
  };

  if (loading) {
    return <div>Loading platform settings...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>STORE SETTINGS & INTEGRATIONS</h1>
        <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
          Configure currency limits, domestic shipping fees, and Razorpay API parameters.
        </p>
      </div>

      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '2px',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px',
        maxWidth: '720px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {settings.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                borderBottom: '1px solid #F0F0F0',
                paddingBottom: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <label className="form-label" style={{ marginBottom: '2px' }}>
                  {s.description || s.key}
                </label>
                <span style={{ fontSize: '0.6875rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                  KEY: {s.key}
                </span>
                <input
                  type="text"
                  className="form-control"
                  style={{ marginTop: '6px' }}
                  value={formValues[s.key] !== undefined ? formValues[s.key] : s.value}
                  onChange={(e) => handleChange(s.key, e.target.value)}
                />
              </div>
              <button
                onClick={() => handleSave(s.key)}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Save size={13} /> SAVE
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
