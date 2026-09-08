import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_active: true,
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllCategories();
      setCategories(res.data);
    } catch (err) {
      addToast('Failed to fetch categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      display_order: categories.length + 1,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image_url: cat.image_url || '',
      display_order: cat.display_order || 0,
      is_active: cat.is_active,
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingCategory ? prev.slug : autoSlug,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, formData);
        addToast('Category updated successfully', 'success');
      } else {
        await adminApi.createCategory(formData);
        addToast('Category created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save category';
      addToast(msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteCategory(id);
      addToast('Category deleted', 'info');
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (err) {
      addToast('Failed to delete category', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>CATEGORY MANAGEMENT</h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            Organize the DIZCO department hierarchy and storefront navigation strips.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-red" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> ADD CATEGORY
        </button>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '2px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Category Name</th>
              <th>Slug</th>
              <th>Description</th>
              <th>Order</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading categories...</td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>No categories found</td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <img
                      src={cat.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'}
                      alt={cat.name}
                      style={{ width: '40px', height: '48px', objectFit: 'cover', borderRadius: '2px' }}
                    />
                  </td>
                  <td style={{ fontWeight: 700 }}>{cat.name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--color-mid-gray)' }}>{cat.slug}</td>
                  <td style={{ maxWidth: '300px', fontSize: '0.8125rem', color: 'var(--color-dark-gray)' }}>
                    {cat.description || '—'}
                  </td>
                  <td>{cat.display_order}</td>
                  <td>
                    <span className="badge" style={{
                      backgroundColor: cat.is_active ? '#ECFDF5' : '#FEF2F2',
                      color: cat.is_active ? '#065F46' : '#991B1B',
                    }}>
                      {cat.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => openEditModal(cat)}
                        style={{ padding: '6px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '2px', cursor: 'pointer' }}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(cat.id)}
                        style={{ padding: '6px', background: 'none', border: '1px solid #FCA5A5', color: '#DC2626', borderRadius: '2px', cursor: 'pointer' }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>
                {editingCategory ? 'EDIT CATEGORY' : 'NEW CATEGORY'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. T-Shirts"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Slug *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thumbnail Image URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Editorial Description</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', margin: '16px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active on storefront
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
                  CANCEL
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  SAVE CATEGORY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Trash2 size={36} color="var(--dizco-red)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ marginBottom: '8px' }}>Delete Category</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-mid-gray)', marginBottom: '20px' }}>
              Are you sure you want to delete this category? Associated garments will be unlinked.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary btn-sm">
                CANCEL
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="btn btn-danger btn-sm">
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
