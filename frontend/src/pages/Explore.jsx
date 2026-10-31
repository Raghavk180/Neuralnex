import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import NoticeCard from '../components/NoticeCard';
import FilterBar from '../components/FilterBar';
import { useAuth } from '../auth';
import { getExplore, getTags, getGroups } from '../api';

export default function Explore() {
  const { user } = useAuth();
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [tags, setTags] = useState([]);
  const [groups, setGroups] = useState([]);
  const [notices, setNotices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    groupId: null,
    category: null,
    onlyMyInterests: false,
  });

  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Load tags + groups once
  useEffect(() => {
    getTags().then(setTags).catch(() => {});
    getGroups().then(setGroups).catch(() => {});
  }, []);

  const loadNotices = useCallback(
    async (pageNum, query, currentFilters, reset = false) => {
      setLoading(true);
      try {
        const params = {
          page: pageNum,
          page_size: 10,
        };
        if (query) params.q = query;
        if (currentFilters.category) params.category = currentFilters.category;
        if (currentFilters.groupId) params.group_id = currentFilters.groupId;
        if (currentFilters.onlyMyInterests) params.only_my_interests = true;

        const data = await getExplore(params);
        const items = data.items || [];
        setTotal(data.total || 0);
        setNotices((prev) => (reset ? items : [...prev, ...items]));
        setHasMore(items.length === 10);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Reset + reload when filters / search changes
  useEffect(() => {
    setPage(1);
    setNotices([]);
    setHasMore(true);
    loadNotices(1, searchQuery, filters, true);
  }, [filters, searchQuery]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotices(nextPage, searchQuery, filters);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const userTagIds = user?.tag_ids || [];
  const userGroupIds = user?.group_ids || [];

  // Non-college groups for sidebar
  const sidebarGroups = groups.filter((g) => g.type !== 'college');

  return (
    <div className="page-wrapper">
      <Navbar />
      <main style={{ flex: 1 }}>
        <div className="container explore-page">
          {/* Header */}
          <div className="explore-header">
            <div className="explore-header-top">
              <div>
                <h1 className="explore-h1">Explore notices</h1>
                <p className="explore-sub">
                  The latest from your college, chosen around your interests.
                </p>
              </div>
              <div className="explore-date">{dateLabel}</div>
            </div>
          </div>

          <div className="explore-layout">
            {/* Sidebar */}
            <FilterBar
              groups={sidebarGroups}
              tags={tags}
              userTagIds={userTagIds}
              userGroupIds={userGroupIds}
              filters={filters}
              onFilterChange={handleFilterChange}
            />

            {/* Main */}
            <div className="explore-main">
              {/* Search */}
              <div className="explore-search-row">
                <div className="search-input-wrap" style={{ flex: 1 }}>
                  <span className="search-icon">🔍</span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="search-input"
                    placeholder="Search notices by title or keyword"
                    defaultValue={searchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      debounceRef.current = setTimeout(() => {
                        setSearchQuery(val);
                      }, 300);
                    }}
                  />
                </div>
              </div>

              {/* Count row */}
              <div className="explore-count-row">
                <div className="explore-count-label">
                  For you — {total} notice{total !== 1 ? 's' : ''}
                </div>
                <div className="explore-sort-label">
                  Your interests, important &amp; recent first
                </div>
              </div>

              {/* Notices grid */}
              {loading && notices.length === 0 ? (
                <div className="spinner-wrap"><div className="spinner" /></div>
              ) : notices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-title">No notices found</div>
                  <p>Try adjusting your filters or search query.</p>
                </div>
              ) : (
                <div className="notices-grid">
                  {notices.map((notice) => (
                    <NoticeCard
                      key={notice.id}
                      notice={notice}
                      showSaveButton
                    />
                  ))}
                </div>
              )}

              {/* Load more */}
              {!loading && hasMore && notices.length > 0 && (
                <div className="load-more-row">
                  <button className="btn btn-secondary" onClick={handleLoadMore}>
                    Load more
                  </button>
                </div>
              )}

              {loading && notices.length > 0 && (
                <div className="spinner-wrap">
                  <div className="spinner" />
                </div>
              )}

              {!hasMore && notices.length > 0 && (
                <div className="all-caught-up">🎉 You&apos;re all caught up.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
