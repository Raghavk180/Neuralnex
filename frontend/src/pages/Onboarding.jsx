import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { getTags, getGroups, savePreferences, getMe } from '../api';

const TAG_ICONS = {
  Coding: '</>',
  Sports: '🏆',
  Cultural: '🎵',
  Placements: '💼',
  Academics: '📚',
  Hackathons: '⚡',
};

const GROUP_ICONS = {
  club: '🏛',
  committee: '📋',
  college: '🎓',
};

function getGroupSubtitle(type) {
  switch (type) {
    case 'club': return 'Student Club';
    case 'committee': return 'Committee';
    case 'college': return 'College Body';
    default: return type;
  }
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTags(), getGroups()])
      .then(([t, g]) => {
        setTags(t || []);
        // Only clubs and committees
        setGroups((g || []).filter((grp) => grp.type !== 'college'));
      })
      .catch(() => setError('Failed to load preferences. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleTag = (id) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleGroup = (id) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selectedTagIds.length === 0) {
      setError('Please select at least one interest to continue.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await savePreferences({ tag_ids: selectedTagIds, group_ids: selectedGroupIds });
      const updatedUser = await getMe();
      setUser(updatedUser);
      navigate('/explore');
    } catch (err) {
      setError(err.message || 'Failed to save preferences. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="spinner-wrap" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      {/* Sidebar */}
      <div className="onboarding-sidebar">
        <div className="onboarding-sidebar-logo">
          <span className="navbar-logo-icon">🎓</span>
          CampusConnect
        </div>
        <div className="onboarding-label">Get started</div>
        <h1 className="onboarding-h1">Choose your interests.</h1>
        <p className="onboarding-sub">
          Help us personalise your notice feed by selecting what matters to you.
        </p>
        <div className="onboarding-steps">
          <div className="onboarding-step">
            <div className="step-circle done">✓</div>
            <div className="step-text">
              <div className="step-name">Create your account</div>
              <div className="step-email">{user?.email}</div>
            </div>
          </div>
          <div className="onboarding-step">
            <div className="step-circle active">2</div>
            <div className="step-text">
              <div className="step-name">Choose your interests</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="onboarding-main">
        <div className="onboarding-card">
          {error && (
            <div className="auth-error" style={{ marginBottom: '1rem' }}>{error}</div>
          )}

          {/* Interests */}
          <div className="onboarding-section-title">What are you interested in?</div>
          <div className="onboarding-section-sub">Choose at least one interest.</div>

          <div className="tag-chips-grid">
            {tags.map((tag) => (
              <button
                key={tag.id}
                className={`tag-chip${selectedTagIds.includes(tag.id) ? ' selected' : ''}`}
                onClick={() => toggleTag(tag.id)}
                type="button"
              >
                <span>{TAG_ICONS[tag.name] || '🏷'}</span>
                {tag.name}
                {selectedTagIds.includes(tag.id) && <span>✓</span>}
              </button>
            ))}
          </div>

          <div className="tag-count">
            {selectedTagIds.length} interest{selectedTagIds.length !== 1 ? 's' : ''} selected
          </div>

          <div className="onboarding-divider" />

          {/* Groups */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <div className="onboarding-section-title">Follow clubs &amp; committees</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--blue-50)', padding: '2px 10px', borderRadius: 99 }}>
              Optional
            </span>
          </div>
          <div className="onboarding-section-sub">
            Get their updates, including members-only notices.
          </div>

          <div className="group-list">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`group-card${selectedGroupIds.includes(group.id) ? ' selected' : ''}`}
                onClick={() => toggleGroup(group.id)}
              >
                <div className="group-icon">
                  {GROUP_ICONS[group.type] || '🏛'}
                </div>
                <div className="group-info">
                  <div className="group-name">{group.name}</div>
                  <div className="group-type">{getGroupSubtitle(group.type)}</div>
                </div>
                <div className="group-checkbox">
                  {selectedGroupIds.includes(group.id) && '✓'}
                </div>
              </div>
            ))}
          </div>

          <p className="onboarding-hint" style={{ marginTop: '1rem' }}>You can change these later.</p>

          <div className="onboarding-footer">
            <button
              className="btn btn-primary"
              onClick={handleContinue}
              disabled={saving || selectedTagIds.length === 0}
            >
              {saving ? 'Saving…' : '→ Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
