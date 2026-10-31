const CATEGORIES = ['All', 'Events', 'Academics', 'General'];

export default function FilterBar({
  groups = [],
  userTagIds = [],
  userGroupIds = [],
  tags = [],
  filters,
  onFilterChange,
}) {
  const { groupId, category, onlyMyInterests } = filters;

  const userTags = tags.filter((t) => userTagIds.includes(t.id));
  const userGroups = groups.filter((g) => userGroupIds.includes(g.id));

  return (
    <div className="filter-sidebar">
      <div className="filter-sidebar-title">Filters</div>

      {/* Source */}
      <div className="filter-section">
        <div className="filter-section-label">Source</div>
        <div className="filter-chips">
          <button
            className={`filter-chip${!groupId ? ' active' : ''}`}
            onClick={() => onFilterChange({ ...filters, groupId: null })}
          >
            All sources
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              className={`filter-chip${groupId === g.id ? ' active' : ''}`}
              onClick={() =>
                onFilterChange({ ...filters, groupId: groupId === g.id ? null : g.id })
              }
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="filter-section">
        <div className="filter-section-label">Category</div>
        <div className="filter-chips">
          {CATEGORIES.map((c) => {
            const val = c === 'All' ? null : c;
            return (
              <button
                key={c}
                className={`filter-chip${category === val ? ' active' : ''}`}
                onClick={() => onFilterChange({ ...filters, category: val })}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Only my interests toggle */}
      <div className="filter-toggle-row">
        <span className="filter-toggle-label">Only my interests</span>
        <button
          className={`toggle-switch${onlyMyInterests ? ' on' : ''}`}
          onClick={() =>
            onFilterChange({ ...filters, onlyMyInterests: !onlyMyInterests })
          }
          aria-label="Toggle only my interests"
        >
          <span className="toggle-knob" />
        </button>
      </div>

      {/* Your interests */}
      {userTags.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-label">Your interests</div>
          <div className="filter-interests">
            {userTags.map((t) => (
              <span key={t.id} className="interest-tag">{t.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Following */}
      {userGroups.length > 0 && (
        <div className="filter-section">
          <div className="filter-section-label">Following</div>
          <div className="filter-following-list">
            {userGroups.map((g) => (
              <div key={g.id} className="filter-following-item">
                <span>✓</span> {g.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
