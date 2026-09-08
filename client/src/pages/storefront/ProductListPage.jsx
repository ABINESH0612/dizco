import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogApi } from '../../services/api';
import ProductCard from '../../components/common/ProductCard';
import { Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, pages: 1 });
  const [loading, setLoading] = useState(true);

  // URL search query parameters
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await catalogApi.getCategories();
        setCategories(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await catalogApi.getProducts({
          category: currentCategory || undefined,
          search: currentSearch || undefined,
          sort: currentSort,
          page: currentPage,
          limit: 12,
        });
        setProducts(res.data.items);
        setPagination({
          total: res.data.total,
          page: res.data.page,
          limit: res.data.limit,
          pages: res.data.pages,
        });
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [currentCategory, currentSearch, currentSort, currentPage]);

  const handleCategoryChange = (catSlug) => {
    const params = new URLSearchParams(searchParams);
    if (catSlug) {
      params.set('category', catSlug);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSortChange = (e) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', e.target.value);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine active title
  const activeCategoryObj = categories.find((c) => c.slug === currentCategory);
  const pageTitle = currentSearch
    ? `SEARCH RESULTS FOR "${currentSearch.toUpperCase()}"`
    : activeCategoryObj
    ? activeCategoryObj.name.toUpperCase()
    : 'ALL COLLECTIONS';

  return (
    <div className="product-list-page" style={{ padding: 'var(--space-6) 0' }}>
      <div className="container">
        {/* Page Header */}
        <div style={{ marginBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.1em' }}>
              CATALOG 2026
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>/</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-mid-gray)', textTransform: 'uppercase' }}>
              {pagination.total} PIECES FOUND
            </span>
          </div>
          <h1 className="display-2">{pageTitle}</h1>
          {activeCategoryObj && (
            <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.9375rem', maxWidth: '640px', marginTop: '8px' }}>
              {activeCategoryObj.description}
            </p>
          )}
        </div>

        {/* Filter & Sort Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          marginBottom: 'var(--space-4)',
          backgroundColor: 'var(--color-surface)',
          padding: '12px 16px',
          borderRadius: '2px',
        }}>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => handleCategoryChange('')}
              className={`btn btn-sm ${!currentCategory ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px' }}
            >
              ALL
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`btn btn-sm ${currentCategory === cat.slug ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 12px' }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={16} color="var(--color-dark-gray)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase' }}>SORT:</span>
            <select
              value={currentSort}
              onChange={handleSortChange}
              style={{
                padding: '6px 10px',
                fontSize: '0.8125rem',
                border: '1px solid var(--color-border)',
                backgroundColor: '#FFFFFF',
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="newest">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Product Grid or Empty State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--color-mid-gray)' }}>
            Loading collection...
          </div>
        ) : products.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '2px',
          }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No items match your criteria</h3>
            <p style={{ color: 'var(--color-mid-gray)', fontSize: '0.875rem', marginBottom: '20px' }}>
              Try clearing your active filters or search with a different keyword.
            </p>
            <button
              onClick={() => {
                setSearchParams({});
              }}
              className="btn btn-primary"
            >
              VIEW ALL PRODUCTS
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: 'var(--space-8)',
            paddingTop: 'var(--space-4)',
            borderTop: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={16} /> PREV
            </button>

            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              PAGE {pagination.page} OF {pagination.pages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              NEXT <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListPage;
