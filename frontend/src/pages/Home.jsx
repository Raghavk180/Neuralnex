import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import CalendarView from '../components/CalendarView';
import AuthPanel from '../components/AuthPanel';
import { useAuth } from '../auth';
import { getCalendar } from '../api';

function formatMonthParam(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${FULL_DAYS[date.getDay()]}, ${d} ${FULL_MONTHS[m - 1]}`;
}

export default function Home() {
  const { user } = useAuth();
  const today = new Date();
  const [calendarItems, setCalendarItems] = useState([]);
  const [calLoading, setCalLoading] = useState(true);
  const [currentCalMonth, setCurrentCalMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [selectedDayItems, setSelectedDayItems] = useState([]);

  useEffect(() => {
    setCalLoading(true);
    getCalendar(formatMonthParam(currentCalMonth))
      .then((items) => setCalendarItems(items || []))
      .catch(() => setCalendarItems([]))
      .finally(() => setCalLoading(false));
  }, [currentCalMonth]);

  const handleDaySelect = (dateStr, items) => {
    setSelectedDay(dateStr);
    setSelectedDayItems(items);
  };

  // When items load, refresh selected day items
  useEffect(() => {
    if (!selectedDay) return;
    const items = calendarItems.filter((i) => i.event_date === selectedDay);
    setSelectedDayItems(items);
  }, [calendarItems, selectedDay]);

  return (
    <div className="page-wrapper">
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Hero section */}
        <section className="home-hero-section">
          <div className="container">
            <div className="home-hero-grid">
              {/* Left column */}
              <div>
                <div className="home-label">Your College Notice Board</div>
                <h1 className="home-h1">Your college notice board.</h1>
                <p className="home-sub">
                  Keep up with college announcements, club events and academic updates.
                  Save what matters to you.
                </p>
                <div className="home-feature-cards">
                  <div className="home-feature-card">
                    <div className="home-feature-icon">🎓</div>
                    <div className="home-feature-title">For students</div>
                    <div className="home-feature-desc">
                      Find your interests. Save notices to your board.
                    </div>
                  </div>
                  <div className="home-feature-card">
                    <div className="home-feature-icon">📋</div>
                    <div className="home-feature-title">For admins</div>
                    <div className="home-feature-desc">
                      Create, manage and publish campus notices.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: Auth panel (only when not logged in / guest) */}
              {user === null && (
                <div>
                  <AuthPanel />
                </div>
              )}

              {user && user !== null && (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👋</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--blue-900)', marginBottom: '0.5rem' }}>
                    Welcome back, {user.name.split(' ')[0]}!
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    {user.role === 'admin'
                      ? 'Manage campus notices from your dashboard.'
                      : 'Explore notices tailored to your interests.'}
                  </div>
                  <Link
                    to={user.role === 'admin' ? '/admin' : '/explore'}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex' }}
                  >
                    {user.role === 'admin' ? 'Go to Dashboard →' : 'Explore notices →'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Calendar section */}
        <section className="calendar-section" id="calendar">
          <div className="container">
            <div className="calendar-section-header">
              <div>
                <h2 className="calendar-section-title">Campus calendar</h2>
                <p className="calendar-section-sub">Upcoming notices, at a glance.</p>
              </div>
              {!user && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Public notices
                </span>
              )}
            </div>

            <div className="calendar-layout">
              {calLoading ? (
                <div className="spinner-wrap"><div className="spinner" /></div>
              ) : (
                <CalendarView
                  calendarItems={calendarItems}
                  onDaySelect={handleDaySelect}
                  selectedDay={selectedDay}
                />
              )}

              {/* Sidebar */}
              <div className="calendar-sidebar">
                <div className="cal-sidebar-header">
                  <div className="cal-sidebar-date">
                    {selectedDay ? formatFullDate(selectedDay) : 'Select a day'}
                  </div>
                  <div className="cal-sidebar-count">
                    {selectedDayItems.length} notice{selectedDayItems.length !== 1 ? 's' : ''}
                    {!user && ' · Public'}
                  </div>
                </div>

                <div className="cal-sidebar-items">
                  {selectedDayItems.length === 0 ? (
                    <div className="cal-no-events">No notices on this day.</div>
                  ) : (
                    selectedDayItems.map((item) => (
                      <div key={item.id} className="cal-notice-item">
                        {item.event_time && (
                          <div className="cal-notice-time">
                            🕐 {item.event_time.slice(0, 5)}
                          </div>
                        )}
                        <div className="cal-notice-title">{item.title}</div>
                        <div className="cal-notice-meta">
                          <span className={`badge badge-${(item.category || 'general').toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                            {item.category || 'General'}
                          </span>
                          {item.is_important && (
                            <span className="badge badge-important" style={{ fontSize: '0.7rem', marginLeft: 4 }}>
                              ⚑ Important
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {!user && (
                  <div className="cal-guest-hint">
                    <Link to="/#auth">Sign in</Link> to see notices from the clubs you follow.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="container home-footer-inner">
          <span>© 2026 CampusConnect</span>
          <span>Need help?</span>
        </div>
      </footer>
    </div>
  );
}
