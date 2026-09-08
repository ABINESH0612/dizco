import React, { useEffect, useState } from 'react';
import { adminApi, catalogApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Edit2, Trash2, Image, Check, X, Search, Upload, RefreshCw, Loader2 } from 'lucide-react';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Image management state
  const [productImages, setProductImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [replacingImageId, setReplacingImageId] = useState(null);
  const [additionalImageUrl, setAdditionalImageUrl] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    sku: '',
    description: '',
    price: '',
    sale_price: '',
    stock_quantity: '',
    category_id: '',
    is_active: true,
    is_published: true,
    imageUrl: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        catalogApi.getProducts({ all_status: true, limit: 100 }),
        adminApi.getAllCategories(),
      ]);
      setProducts(prodRes.data.items);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      addToast('Error fetching products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setProductImages([]);
    setAdditionalImageUrl('');
    setFormData({
      name: '',
      slug: '',
      sku: `DIZ-${Date.now().toString().slice(-4)}`,
      description: '',
      price: '',
      sale_price: '',
      stock_quantity: '20',
      category_id: categories[0]?.id || '',
      is_active: true,
      is_published: true,
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (prod) => {
    setEditingProduct(prod);
    setProductImages(prod.images || []);
    setAdditionalImageUrl('');
    setFormData({
      name: prod.name,
      slug: prod.slug,
      sku: prod.sku,
      description: prod.description || '',
      price: prod.price,
      sale_price: prod.sale_price !== null ? prod.sale_price : '',
      stock_quantity: prod.stock_quantity,
      category_id: prod.category_id || '',
      is_active: prod.is_active,
      is_published: prod.is_published,
      imageUrl: prod.images?.[0]?.image_url || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      addToast('Invalid file format. Allowed: JPG, PNG, WEBP.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('File size exceeds 5MB limit.', 'error');
      e.target.value = '';
      return;
    }

    const data = new FormData();
    data.append('file', file);
    setUploadingImage(true);
    try {
      const res = await adminApi.uploadProductImage(editingProduct.id, data);
      setProductImages((prev) => [...prev, res.data]);
      addToast('Image uploaded successfully', 'success');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload image';
      addToast(msg, 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleReplaceImage = async (imageId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      addToast('Invalid file format. Allowed: JPG, PNG, WEBP.', 'error');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('File size exceeds 5MB limit.', 'error');
      e.target.value = '';
      return;
    }

    const data = new FormData();
    data.append('file', file);
    setReplacingImageId(imageId);
    try {
      const res = await adminApi.replaceProductImage(imageId, data);
      setProductImages((prev) => prev.map((img) => (img.id === imageId ? res.data : img)));
      addToast('Image replaced successfully', 'success');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to replace image';
      addToast(msg, 'error');
    } finally {
      setReplacingImageId(null);
      e.target.value = '';
    }
  };

  const handleSetPrimaryImage = async (imageId) => {
    try {
      await adminApi.setPrimaryProductImage(imageId);
      setProductImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        }))
      );
      addToast('Primary image set', 'success');
      fetchData();
    } catch (err) {
      addToast('Failed to set primary image', 'error');
    }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await adminApi.deleteProductImage(imageId);
      setProductImages((prev) => prev.filter((img) => img.id !== imageId));
      addToast('Image deleted', 'info');
      fetchData();
    } catch (err) {
      addToast('Failed to delete image', 'error');
    }
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: editingProduct ? prev.slug : autoSlug,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        sku: formData.sku,
        description: formData.description,
        price: parseFloat(formData.price),
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        stock_quantity: parseInt(formData.stock_quantity, 10),
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        is_active: formData.is_active,
        is_published: formData.is_published,
      };

      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload);
        addToast('Product updated successfully', 'success');
      } else {
        payload.images = formData.imageUrl ? [formData.imageUrl] : [];
        await adminApi.createProduct(payload);
        addToast('Product created successfully', 'success');
      }

      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to save product';
      addToast(msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.deleteProduct(id);
      addToast('Product deleted from inventory', 'info');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err) {
      addToast('Failed to delete product', 'error');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>PRODUCT MANAGEMENT</h1>
          <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem' }}>
            Create, edit, publish/unpublish, and monitor garment inventory.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-red" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> ADD NEW PRODUCT
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '2px', marginBottom: '20px', border: '1px solid var(--color-border)', display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-mid-gray)' }} />
          <input
            type="text"
            placeholder="Search by title, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid var(--color-border)', borderRadius: '2px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Products Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '2px', overflowX: 'auto', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Garment</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>Loading catalog...</td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-mid-gray)' }}>
                  No garments matching filter.
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const img = prod.images?.[0]?.image_url || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80';
                return (
                  <tr key={prod.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={img} alt={prod.name} style={{ width: '40px', height: '50px', objectFit: 'cover', borderRadius: '2px' }} />
                        <div>
                          <span style={{ fontWeight: 700, display: 'block' }}>{prod.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>/{prod.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{prod.sku}</td>
                    <td>{prod.category?.name || '—'}</td>
                    <td>
                      {prod.sale_price ? (
                        <div>
                          <strong style={{ color: 'var(--dizco-red)' }}>{formatINR(prod.sale_price)}</strong>
                          <span style={{ fontSize: '0.75rem', textDecoration: 'line-through', color: 'var(--color-muted)', display: 'block' }}>
                            {formatINR(prod.price)}
                          </span>
                        </div>
                      ) : (
                        <strong>{formatINR(prod.price)}</strong>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${prod.stock_quantity <= 5 ? 'badge-red' : 'badge-dark'}`}>
                        {prod.stock_quantity} IN STOCK
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        backgroundColor: prod.is_published && prod.is_active ? '#ECFDF5' : '#FEF2F2',
                        color: prod.is_published && prod.is_active ? '#065F46' : '#991B1B',
                      }}>
                        {prod.is_published && prod.is_active ? 'PUBLISHED' : 'DRAFT'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => openEditModal(prod)}
                          style={{ padding: '6px', background: 'none', border: '1px solid var(--color-border)', borderRadius: '2px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(prod.id)}
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

      {/* Add / Edit Product Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>
                {editingProduct ? 'EDIT PRODUCT' : 'NEW GARMENT SPECIFICATION'}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Garment Title *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. Monolith Heavyweight Boxy Tee"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  <label className="form-label">SKU Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">No Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price (INR ₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sale Price (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Units *</label>
                  <input
                    type="number"
                    className="form-control"
                    required
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  />
                </div>
              </div>

              {/* Product Images Management for Editing Products */}
              {editingProduct ? (
                <div style={{ marginTop: '16px', marginBottom: '20px', border: '1px solid var(--color-border)', borderRadius: '2px', padding: '16px', backgroundColor: '#FAFAFA' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'block' }}>PRODUCT IMAGES</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)' }}>
                        JPEG, PNG, WEBP (up to 5MB). Managed via Cloudinary with automatic optimization.
                      </span>
                    </div>

                    <label className="btn btn-secondary btn-sm" style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      {uploadingImage ? <Loader2 size={14} className="spin" /> : <Upload size={14} />}
                      {uploadingImage ? 'UPLOADING...' : 'UPLOAD IMAGE'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleUploadImage}
                        disabled={uploadingImage}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {productImages.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#FFFFFF', border: '1px dashed var(--color-border)', borderRadius: '2px', color: 'var(--color-mid-gray)', fontSize: '0.8125rem' }}>
                      No images uploaded for this garment yet. Click Upload Image above to add.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                      {productImages.map((img) => {
                        const isReplacing = replacingImageId === img.id;
                        return (
                          <div
                            key={img.id}
                            style={{
                              border: img.is_primary ? '2px solid var(--dizco-red)' : '1px solid var(--color-border)',
                              borderRadius: '2px',
                              overflow: 'hidden',
                              backgroundColor: '#FFFFFF',
                              display: 'flex',
                              flexDirection: 'column',
                              position: 'relative'
                            }}
                          >
                            <div style={{ width: '100%', height: '140px', position: 'relative', backgroundColor: '#F3F4F6' }}>
                              <img
                                src={img.image_url}
                                alt="Product view"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              {img.is_primary && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '6px',
                                    left: '6px',
                                    backgroundColor: 'var(--dizco-red)',
                                    color: '#FFFFFF',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    letterSpacing: '0.05em',
                                    padding: '2px 6px',
                                    borderRadius: '2px',
                                  }}
                                >
                                  PRIMARY
                                </span>
                              )}
                              {isReplacing && (
                                <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                                  <Loader2 size={20} className="spin" />
                                </div>
                              )}
                            </div>

                            <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', backgroundColor: '#F9FAFB', borderTop: '1px solid var(--color-border)' }}>
                              {!img.is_primary ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryImage(img.id)}
                                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-dark)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                  title="Set as primary garment image"
                                >
                                  Set Primary
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--color-mid-gray)', fontWeight: 600 }}>Default</span>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ cursor: 'pointer', margin: 0, display: 'flex' }} title="Replace image">
                                  <RefreshCw size={13} color="var(--color-mid-gray)" />
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/jpg"
                                    onChange={(e) => handleReplaceImage(img.id, e)}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteImage(img.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                                  title="Delete image"
                                >
                                  <Trash2 size={13} color="#DC2626" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Primary Image URL</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', marginTop: '4px', display: 'block' }}>
                    You can upload multiple high-res Cloudinary images immediately after saving this garment.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Editorial Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Material specifications, weave, cut and styling recommendations..."
                />
              </div>

              <div style={{ display: 'flex', gap: '20px', margin: '16px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  />
                  Published on Storefront
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active in Inventory
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary btn-sm">
                  CANCEL
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  SAVE PRODUCT
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
            <h3 style={{ marginBottom: '8px' }}>Confirm Deletion</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-mid-gray)', marginBottom: '20px' }}>
              Are you sure you want to delete this garment? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirmId(null)} className="btn btn-secondary btn-sm">
                CANCEL
              </button>
              <button onClick={() => handleDelete(deleteConfirmId)} className="btn btn-danger btn-sm">
                CONFIRM DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
