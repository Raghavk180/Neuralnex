import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  getTags,
  getGroups,
  getNotice,
  adminCreateNotice,
  adminUpdateNotice,
  adminPublish,
  adminUnpublish,
  adminGetNotices,
} from '../api';

const CATEGORIES = ['Events', 'Academics', 'General'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function nowTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function NoticeEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [allTags, setAllTags] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

  // Form state
  const [category, setCategory] = useState('Events');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [audience, setAudience] = useState('all');
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [isImportant, setIsImportant] = useState(false);
  const [status, setStatus] = useState('draft');

  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Load tags + groups
  useEffect(() => {
    getTags().then(setAllTags).catch(() => {});
    getGroups().then((g) => setAllGroups((g || []).filter((grp) => grp.type !== 'college'))).catch(() => {});
  }, []);

  // Load existing notice if editing
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    // Use admin endpoint to get any status
    adminGetNotices({ page: 1, page_size: 100 })
      .then((data) => {
        const n = (data.items || []).find((x) => String(x.id) === String(id));
        if (n) {
          setCategory(n.category || 'Events');
          setTitle(n.title || '');
          setDescription(n.description || '');
          setEventDate(n.event_date || '');
          setEventTime(n.event_time || '');
          setSelectedTagIds((n.tags || []).map((t) => t.id));
          setAudience(n.audience || 'all');
          setSelectedGroupIds((n.groups || []).map((g) => g.id));
          setIsImportant(n.is_important || false);
          setStatus(n.status || 'draft');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const validate = () => {
    const errs = {};
    if (!title.trim() || title.trim().length < 3 || title.trim().length > 150) {
      errs.title = 'Title must be 3–150 characters.';
    }
    if (!description.trim()) {
      errs.description = 'Description is required.';
    }
    if (!category) {
      errs.category = 'Category is required.';
    }
    if (eventTime && !eventDate) {
      errs.eventDate = 'Event date is required when time is set.';
    }
    if (audience === 'groups' && selectedGroupIds.length === 0) {
      errs.groups = 'Select at least one group for specific audience.';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    category,
    title: title.trim(),
    description: description.trim(),
    event_date: eventDate || null,
    event_time: eventDate && eventTime ? eventTime : null,
    tag_ids: selectedTagIds,
    audience,
    group_ids: audience === 'groups' ? selectedGroupIds : [],
    is_important: isImportant,
  });

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      if (isEdit) {
        await adminUpdateNotice(id, payload);
      } else {
        const created = await adminCreateNotice(payload);
        navigate(`/admin/notices/${created.id}/edit`, { replace: true });
      }
      setLastSaved(new Date());
    } catch (err) {
      setError(err.message || 'Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setPublishing(true);
    setError('');
    try {
      // Save first
      const payload = buildPayload();
      let noticeId = id;
      if (isEdit) {
        await adminUpdateNotice(id, payload);
      } else {
        const created = await adminCreateNotice(payload);
        noticeId = created.id;
      }
      await adminPublish(noticeId);
      setStatus('published');
      setLastSaved(new Date());
      if (!isEdit) {
        navigate(`/admin/notices/${noticeId}/edit`, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Publish failed. Try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    try {
      await adminUnpublish(id);
      setStatus('draft');
    } catch (err) {
      setError(err.message || 'Unpublish failed.');
    }
  };

  const toggleTag = (tagId) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId]
    );
  };

  const removeTag = (tagId) => {
    setSelectedTagIds((prev) => prev.filter((x) => x !== tagId));
  };

  const toggleGroup = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((x) => x !== groupId) : [...prev, groupId]
    );
  };

  const selectedTags = allTags.filter((t) => selectedTagIds.includes(t.id));
  const availableTags = allTags.filter((t) => !selectedTagIds.includes(t.id));

  const isComplete = title.trim().length >= 3 && description.trim() && category;
  const hasAudience = audience === 'all' || (audience === 'groups' && selectedGroupIds.length > 0);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="container editor-page">
          <Link to="/admin" className="editor-back-link">← All notices</Link>

          <div className="editor-title-row">
            <h1 className="editor-h1">
              {isEdit ? 'Edit notice' : 'New notice'}
              <span className={`badge ${status === 'published' ? 'badge-published' : 'badge-draft'}`}>
                {status === 'published' ? 'Published' : 'Draft'}
              </span>
            </h1>
            {lastSaved && (
              <span className="editor-last-saved">
                Last saved today, {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {error && <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="editor-layout">
            {/* Left: Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Notice details */}
              <div className="editor-form-card">
                <div className="editor-card-title">
                  Notice details <span className="editor-required">* Required</span>
                </div>

                {/* Category */}
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {validationErrors.category && (
                    <span className="form-error">{validationErrors.category}</span>
                  )}
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Notice title (3–150 characters)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={150}
                  />
                  {validationErrors.title && (
                    <span className="form-error">{validationErrors.title}</span>
                  )}
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Full notice details…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ minHeight: 120 }}
                  />
                  {validationErrors.description && (
                    <span className="form-error">{validationErrors.description}</span>
                  )}
                </div>

                {/* Event date + time */}
                <div className="editor-row">
                  <div className="form-group">
                    <label className="form-label">Event date (optional)</label>
                    <input
                      type="date"
                      className="form-input"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                    {validationErrors.eventDate && (
                      <span className="form-error">{validationErrors.eventDate}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Event time (optional)</label>
                    <input
                      type="time"
                      className="form-input"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      disabled={!eventDate}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Tags</label>
                  <div className="tags-input-wrap">
                    {selectedTags.map((t) => (
                      <span key={t.id} className="tag-chip-selected">
                        {t.name}
                        <button
                          className="tag-chip-remove"
                          type="button"
                          onClick={() => removeTag(t.id)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {availableTags.length > 0 && (
                      <button
                        type="button"
                        className="add-tag-btn"
                        onClick={() => setShowTagDropdown((o) => !o)}
                      >
                        + Add a tag
                      </button>
                    )}
                  </div>
                  {showTagDropdown && availableTags.length > 0 && (
                    <div className="tag-dropdown">
                      {availableTags.map((t) => (
                        <div
                          key={t.id}
                          className="tag-dropdown-item"
                          onClick={() => { toggleTag(t.id); setShowTagDropdown(false); }}
                        >
                          {t.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Audience & priority */}
              <div className="editor-form-card">
                <div className="editor-card-title">Audience &amp; priority</div>

                <div className="form-group">
                  <label className="form-label">Audience</label>
                  <div className="audience-options">
                    <label className="audience-option">
                      <input
                        type="radio"
                        name="audience"
                        value="all"
                        checked={audience === 'all'}
                        onChange={() => setAudience('all')}
                      />
                      Everyone
                    </label>
                    <label className="audience-option">
                      <input
                        type="radio"
                        name="audience"
                        value="groups"
                        checked={audience === 'groups'}
                        onChange={() => setAudience('groups')}
                      />
                      Specific groups
                    </label>
                  </div>
                </div>

                {audience === 'groups' && (
                  <div className="form-group">
                    <label className="form-label">Select groups</label>
                    <div className="groups-multiselect">
                      {allGroups.map((g) => (
                        <label key={g.id} className="groups-multiselect-item">
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(g.id)}
                            onChange={() => toggleGroup(g.id)}
                          />
                          {g.name}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4, textTransform: 'capitalize' }}>
                            ({g.type})
                          </span>
                        </label>
                      ))}
                    </div>
                    {validationErrors.groups && (
                      <span className="form-error">{validationErrors.groups}</span>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="important-check">
                    <input
                      type="checkbox"
                      checked={isImportant}
                      onChange={(e) => setIsImportant(e.target.checked)}
                    />
                    ⚑ Mark as important
                  </label>
                </div>
              </div>

              {/* Bottom buttons */}
              <div className="editor-footer-btns">
                <Link to="/admin" className="btn btn-ghost">Cancel</Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePublish}
                  disabled={publishing}
                >
                  {publishing ? 'Publishing…' : '→ Publish notice'}
                </button>
              </div>
            </div>

            {/* Right: Sidebar */}
            <div className="editor-sidebar">
              {/* Preview */}
              <div className="preview-card">
                <div className="preview-card-title">Notice preview</div>
                <div>
                  <span className={`badge badge-${category.toLowerCase() === 'events' ? 'events' : category.toLowerCase() === 'academics' ? 'academics' : 'general'}`}>
                    {category}
                  </span>
                  {isImportant && (
                    <span className="badge badge-important" style={{ marginLeft: 6 }}>⚑ Important</span>
                  )}
                </div>
                <div className="preview-notice-title">
                  {title || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: 400 }}>Notice title…</span>}
                </div>
                <div className="preview-notice-desc">
                  {description || <span style={{ fontStyle: 'italic' }}>Description will appear here…</span>}
                </div>
                <div className="preview-meta-row">
                  {eventDate && (
                    <span className="notice-card-date-chip">
                      📅 {eventDate}{eventTime ? ` · ${eventTime}` : ''}
                    </span>
                  )}
                  {audience === 'groups' && selectedGroupIds.length > 0 && (
                    <span className="badge badge-members">Members only</span>
                  )}
                  {selectedTags.map((t) => (
                    <span key={t.id} className="notice-tag">{t.name}</span>
                  ))}
                </div>
              </div>

              {/* Status card */}
              <div className="status-card">
                <div className="status-card-title">Readiness</div>
                <div className={`status-check-item${isComplete ? ' ok' : ''}`}>
                  {isComplete ? '✓' : '○'} Required fields complete
                </div>
                <div className={`status-check-item${hasAudience ? ' ok' : ' warn'}`}>
                  {hasAudience ? '✓' : '⚠'} Audience selected
                </div>
                {status === 'draft' && (
                  <div className="status-info-box">
                    This draft is not visible to students.
                  </div>
                )}
                {status === 'published' && isEdit && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleUnpublish}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Unpublish
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
