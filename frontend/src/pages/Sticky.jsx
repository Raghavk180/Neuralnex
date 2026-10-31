import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { getSaved, unsaveNotice, saveNotice } from '../api';

const STICKY_COLORS = {
  yellow: '#fefce8',
  pink: '#fdf2f8',
  green: '#f0fdf4',
  blue: '#eff6ff',
  orange: '#fff7ed',
};

const COLOR_DOTS = {
  yellow: '#fde047',
  pink: '#f9a8d4',
  green: '#86efac',
  blue: '#93c5fd',
  orange: '#fdba74',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
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

function StickyCard({ saved, onUnsave, onUpdate }) {
  const notice = saved.notice;
  const [color, setColor] = useState(saved.color || 'yellow');
  const [noteText, setNoteText] = useState(saved.note_text || '');
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(saved.note_text || '');
  const textareaRef = useRef(null);

  const handleColorChange = async (newColor) => {
    setColor(newColor);
    try {
      const updated = await saveNotice(notice.id, { color: newColor, note_text: noteText });
      onUpdate && onUpdate(notice.id, updated);
    } catch {}
  };

  const handleEditStart = () => {
    setEditing(true);
    setEditVal(noteText);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleEditSave = async () => {
    setEditing(false);
    setNoteText(editVal);
    try {
      const updated = await saveNotice(notice.id, { color, note_text: editVal });
      onUpdate && onUpdate(notice.id, updated);
    } catch {}
  };

  const handleUnsave = async () => {
    try {
      await unsaveNotice(notice.id);
      onUnsave && onUnsave(notice.id);
    } catch {}
  };

  const bg = STICKY_COLORS[color] || STICKY_COLORS.yellow;

  return (
    <div
      className="sticky-card"
      style={{ background: bg, borderColor: `${COLOR_DOTS[color] || '#fde047'}44` }}
    >
      {/* Top */}
      <div className="sticky-card-top">
        <span className="sticky-saved-badge">Saved</span>
        <button className="sticky-unsave-btn" onClick={handleUnsave}>
          Unsave
        </button>
      </div>

      {/* Category + important */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span className={categoryBadgeClass(notice.category)}>
          {notice.category || 'General'}
        </span>
        {notice.is_important && (
          <span className="badge badge-important">⚑ Important</span>
        )}
      </div>

      {/* Title */}
      <div className="sticky-card-title">{notice.title}</div>

      {/* Description */}
      {notice.description && (
        <div className="sticky-card-desc">{notice.description}</div>
      )}

      {/* Event date */}
      {notice.event_date && (
        <div className="notice-card-date-chip" style={{ width: 'fit-content' }}>
          📅 {formatDate(notice.event_date)}
          {notice.event_time && ` · ${notice.event_time}`}
        </div>
      )}

      {/* Group */}
      <div className="sticky-meta">
        {notice.groups?.map((g) => g.name).join(', ')}
        {notice.audience === 'groups' && (
          <span className="badge badge-members" style={{ marginLeft: 6 }}>Members only</span>
        )}
      </div>

      {notice.published_at && (
        <div className="notice-card-published">
          Published {formatDate(notice.published_at)}
        </div>
      )}

      {/* My note */}
      <div className="sticky-my-note">
        <div className="sticky-my-note-header">
          <span className="sticky-my-note-label">My note</span>
          {!editing && (
            <button className="sticky-edit-btn" onClick={handleEditStart} title="Edit note">
              ✏
            </button>
          )}
        </div>
        {editing ? (
          <textarea
            ref={textareaRef}
            className="sticky-note-textarea"
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(); } }}
            placeholder="Add a personal note…"
          />
        ) : noteText ? (
          <div className="sticky-note-text">{noteText}</div>
        ) : (
          <div className="sticky-note-empty" onClick={handleEditStart} style={{ cursor: 'pointer' }}>
            Click ✏ to add a note…
          </div>
        )}
      </div>

      {/* Color selectors */}
      <div className="sticky-color-row">
        {Object.entries(COLOR_DOTS).map(([key, dot]) => (
          <button
            key={key}
            className={`color-dot${color === key ? ' active' : ''}`}
            style={{ background: dot, border: color === key ? '2px solid var(--blue-700)' : '2px solid transparent' }}
            onClick={() => handleColorChange(key)}
            title={key}
          />
        ))}
      </div>

      {/* View notice link */}
      <div>
        <span className="sticky-view-link" style={{ cursor: 'default' }}>
          View notice →
        </span>
      </div>
    </div>
  );
}

export default function Sticky() {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef(null);

  useEffect(() => {
    getSaved()
      .then((items) => setSavedItems(items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnsave = (noticeId) => {
    setSavedItems((prev) => prev.filter((s) => s.notice.id !== noticeId));
  };

  const handleUpdate = (noticeId, updated) => {
    setSavedItems((prev) =>
      prev.map((s) => (s.notice.id === noticeId ? updated : s))
    );
  };

  const filtered = savedItems.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.notice.title?.toLowerCase().includes(q) ||
      s.notice.description?.toLowerCase().includes(q) ||
      s.note_text?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-wrapper">
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="container sticky-page">
          {/* Header */}
          <div className="sticky-header">
            <div>
              <h1 className="sticky-h1">Sticky notes</h1>
              <p className="sticky-sub">Saved notices and your personal notes.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div className="sticky-count">{savedItems.length} saved notice{savedItems.length !== 1 ? 's' : ''}</div>
              <div className="search-input-wrap" style={{ width: 240 }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search saved notices…"
                  onChange={(e) => {
                    const val = e.target.value;
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => setSearchQuery(val), 300);
                  }}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : savedItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📌</div>
              <div className="empty-state-title">No saved notices yet</div>
              <p>Save notices from Explore to see them here.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No results</div>
              <p>Try a different search term.</p>
            </div>
          ) : (
            <div className="sticky-grid">
              {filtered.map((saved) => (
                <StickyCard
                  key={saved.notice.id}
                  saved={saved}
                  onUnsave={handleUnsave}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
