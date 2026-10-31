import { saveNotice, unsaveNotice } from '../api';
import { useState } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPublished(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function categoryBadgeClass(category) {
  if (!category) return 'badge badge-general';
  switch (category.toLowerCase()) {
    case 'events': return 'badge badge-events';
    case 'academics': return 'badge badge-academics';
    default: return 'badge badge-general';
  }
}

export default function NoticeCard({ notice, onSave, onUnsave, showSaveButton = true }) {
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(notice.is_saved);

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      if (isSaved) {
        await unsaveNotice(notice.id);
        setIsSaved(false);
        onUnsave && onUnsave(notice.id);
      } else {
        await saveNotice(notice.id, { color: 'yellow' });
        setIsSaved(true);
        onSave && onSave(notice.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const eventDate = notice.event_date ? formatDate(notice.event_date) : null;
  const publishedDate = notice.published_at ? formatPublished(notice.published_at) : null;

  return (
    <div className="notice-card">
      <div className="notice-card-top">
        <div className="notice-card-badges">
          <span className={categoryBadgeClass(notice.category)}>
            {notice.category || 'General'}
          </span>
          {notice.is_important && (
            <span className="badge badge-important">⚑ Important</span>
          )}
        </div>
        {showSaveButton && (
          <button
            className={`save-btn${isSaved ? ' saved' : ''}`}
            onClick={handleSaveToggle}
            disabled={saving}
            title={isSaved ? 'Remove from saved' : 'Save notice'}
          >
            {isSaved ? '🔖' : '🔖'}
            <span style={{ marginLeft: 3, fontSize: '0.75rem' }}>
              {isSaved ? 'Saved' : 'Save'}
            </span>
          </button>
        )}
      </div>

      <div className="notice-card-title">{notice.title}</div>

      {notice.description && (
        <div className="notice-card-desc">{notice.description}</div>
      )}

      {eventDate && (
        <div className="notice-card-date-chip">
          📅 {eventDate}
          {notice.event_time && ` · ${notice.event_time}`}
        </div>
      )}

      <div className="notice-card-footer">
        {notice.groups && notice.groups.length > 0 && (
          <span className="notice-card-group">
            {notice.groups.map((g) => g.name).join(', ')}
          </span>
        )}
        {notice.audience === 'groups' && (
          <span className="badge badge-members">Members only</span>
        )}
        {notice.tags && notice.tags.length > 0 && (
          <div className="notice-card-tags">
            {notice.tags.map((t) => (
              <span key={t.id} className="notice-tag">{t.name}</span>
            ))}
          </div>
        )}
        {publishedDate && (
          <span className="notice-card-published">Published {publishedDate}</span>
        )}
      </div>
    </div>
  );
}
