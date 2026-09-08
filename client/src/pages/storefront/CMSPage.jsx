import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { cmsApi } from '../../services/api';

const CMSPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const res = await cmsApi.getPage(slug);
        setPage(res.data);
      } catch (err) {
        console.error('Error fetching CMS page:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-mid-gray)' }}>
        Retrieving document...
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Document Not Found</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
          RETURN TO HOME
        </Link>
      </div>
    );
  }

  return (
    <div className="cms-page" style={{ padding: 'var(--space-8) 0', minHeight: '70vh' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        <div style={{ borderBottom: '2px solid var(--color-black)', paddingBottom: '20px', marginBottom: '32px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--dizco-red)', letterSpacing: '0.1em' }}>
            DIZCO POLICIES & INFORMATION
          </span>
          <h1 className="display-2" style={{ marginTop: '8px' }}>{page.title}</h1>
        </div>

        <div style={{
          fontSize: '1rem',
          lineHeight: 1.8,
          color: 'var(--color-dark-gray)',
          whiteSpace: 'pre-line',
        }}>
          {page.content}
        </div>
      </div>
    </div>
  );
};

export default CMSPage;
