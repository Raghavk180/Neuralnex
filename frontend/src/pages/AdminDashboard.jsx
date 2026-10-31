import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  adminGetNotices,
  adminPublish,
  adminUnpublish,
  adminDeleteNotice,
} from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryBadgeClass(category) {
  switch ((category || '').toLowerCase()) {
    case 'events': return 'badge badge-events';
    case 'academics': return 'badge badge-academics';
    default: return 'badge badge-general';
  }
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('draft');
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef(null);
  const [actionLoading, setActionLoading] = useState({});

  const loadNotices = async (status, query) => {
    setLoading(true);
    try {
      const params = { page: 1, page_size: 50 };
      if (status !== 'all') params.status = status;
      if (query) params.q = query;
      const data = await adminGetNotices(params);
      setNotices(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices(tab, searchQuery);
  }, [tab, searchQuery]);

  const handlePublish = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: 'publish' }));
    try {
      const updated = await adminPublish(id);
      setNotices((prev) =>
        prev.map((n) => (n.id === id ? updated : n)).filter((n) => {
          if (tab === 'draft') return n.status === 'draft';
          if (tab === 'published') return n.status === 'published';
          return true;
        })
      );
    } catch (err) {
      alert(err.message || 'Failed to publish');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  const handleUnpublish = async (id) => {
    setActionLoading((p) => ({ ...p, [id]: 'unpublish' }));
    try {
      const updated = await adminUnpublish(id);
      setNotices((prev) =>
        prev.map((n) => (n.id === id ? updated : n)).filter((n) => {
          if (tab === 'draft') return n.status === 'draft';
          if (tab === 'published') return n.status === 'published';
          return true;
        })
      );
    } catch (err) {
      alert(err.message || 'Failed to unpublish');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice? This cannot be undone.')) return;
    setActionLoading((p) => ({ ...p, [id]: 'delete' }));
    try {
      await adminDeleteNotice(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err.message || 'Failed to delete');
    } finally {
      setActionLoading((p) => ({ ...p, [id]: null }));
    }
  };

  const drafts = notices.filter((n) => n.status === 'draft');
  const published = notices.filter((n) => n.status === 'published');
  const displayNotices = tab === 'draft' ? drafts : tab === 'published' ? published : notices;

  return (
    <div className="page-wrapper">
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="container admin-page">
          {/* Header */}
          <div className="admin-header">
            <div>
              <h1 className="admin-h1">Manage notices</h1>
              <p className="admin-sub">Create, edit and publish campus notices.</p>
            </div>
            <Link to="/admin/notices/new" className="btn btn-primary">
              + Create notice
            </Link>
          </div>

          <div className="admin-card">
            {/* Tabs + Search */}
            <div className="admin-tabs-row">
              <button
                className={`admin-tab-btn${tab === 'draft' ? ' active' : ''}`}
                onClick={() => setTab('draft')}
              >
                Drafts {tab === 'draft' ? `(${drafts.length})` : ''}
              </button>
              <button
                className={`admin-tab-btn${tab === 'published' ? ' active' : ''}`}
                onClick={() => setTab('published')}
              >
                Published {tab === 'published' ? `(${published.length})` : ''}
              </button>
              <button
                className={`admin-tab-btn${tab === 'all' ? ' active' : ''}`}
                onClick={() => setTab('all')}
              >
                All
              </button>

              <div className="admin-search-right">
                <div className="admin-search-wrap">
                  <span className="admin-search-icon">🔍</span>
                  <input
                    type="text"
                    className="admin-search-input"
                    placeholder="Search all notices"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      debounceRef.current = setTimeout(() => setSearchQuery(val), 300);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : displayNotices.length === 0 ? (
              <div className="empty-state" style={{ padding: '2.5rem' }}>
                <div className="empty-state-icon">📋</div>
                <div className="empty-state-title">
                  {tab === 'draft' ? 'No drafts' : tab === 'published' ? 'No published notices' : 'No notices found'}
                </div>
                <p>
                  {tab === 'draft'
                    ? 'Create a new notice to get started.'
                    : 'Publish a draft to make it visible to students.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="notices-table">
                  <thead>
                    <tr>
                      <th>Notice</th>
                      <th>Category</th>
                      <th>Audience</th>
                      <th>Event Date / Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayNotices.map((notice) => {
                      const al = actionLoading[notice.id];
                      return (
                        <tr key={notice.id}>
                          <td>
                            <div className="table-notice-title">{notice.title}</div>
                            <div className="table-notice-sub">
                              Edited {formatDate(notice.updated_at)}
                            </div>
                          </td>
                          <td>
                            <span className={categoryBadgeClass(notice.category)}>
                              {notice.category || 'General'}
                            </span>
                          </td>
                          <td>
                            {notice.audience === 'groups' && notice.groups?.length
                              ? notice.groups.map((g) => g.name).join(', ')
                              : 'Everyone'}
                          </td>
                          <td>
                            {notice.event_date
                              ? `${formatDate(notice.event_date)}${notice.event_time ? ` · ${notice.event_time}` : ''}`
                              : '—'}
                          </td>
                          <td>
                            <span
                              className={
                                notice.status === 'published'
                                  ? 'badge badge-published'
                                  : 'badge badge-draft'
                              }
                            >
                              {notice.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <Link
                                to={`/admin/notices/${notice.id}/edit`}
                                className="action-btn action-edit"
                              >
                                ✏ Edit
                              </Link>
                              {notice.status === 'draft' ? (
                                <button
                                  className="action-btn action-publish"
                                  onClick={() => handlePublish(notice.id)}
                                  disabled={!!al}
                                >
                                  {al === 'publish' ? '…' : 'Publish'}
                                </button>
                              ) : (
                                <button
                                  className="action-btn action-unpublish"
                                  onClick={() => handleUnpublish(notice.id)}
                                  disabled={!!al}
                                >
                                  {al === 'unpublish' ? '…' : 'Unpublish'}
                                </button>
                              )}
                              <button
                                className="action-btn action-delete"
                                onClick={() => handleDelete(notice.id)}
                                disabled={!!al}
                              >
                                {al === 'delete' ? '…' : '🗑'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
