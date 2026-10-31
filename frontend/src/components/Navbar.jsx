import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { logout } from '../api';

export default function Navbar() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setUser(null);
    navigate('/');
    setDropdownOpen(false);
  };

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const navLinks = isAdmin
    ? [
        { to: '/admin', label: 'Dashboard' },
        { to: '/#calendar', label: 'Calendar' },
      ]
    : isStudent
    ? [
        { to: '/', label: 'Home' },
        { to: '/explore', label: 'Explore' },
        { to: '/sticky', label: 'Sticky notes' },
      ]
    : [{ to: '/', label: 'Home' }];

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          <span className="navbar-logo-icon">🎓</span>
          CampusConnect
          {isAdmin && <span className="navbar-admin-badge">Admin</span>}
        </Link>

        <div className="navbar-nav">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
              end
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="navbar-right">
          {user ? (
            <div className="user-menu" ref={dropdownRef}>
              <button
                className="user-avatar-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="User menu"
              >
                <div className="avatar-circle">{initials}</div>
                <div className="user-info-text">
                  <div className="user-info-name">{user.name}</div>
                  <div className="user-info-role">
                    {isAdmin ? 'Administrator' : 'Student'}
                  </div>
                </div>
              </button>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <button onClick={handleLogout}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/" className="btn-signin-nav">
              Sign in
            </Link>
          )}

          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className={`mobile-nav ${menuOpen ? 'open' : ''}`}>
        {navLinks.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
            end
            onClick={() => setMenuOpen(false)}
          >
            {l.label}
          </NavLink>
        ))}
        {user && (
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              textAlign: 'left',
              fontSize: '0.9rem',
              color: 'var(--danger)',
              fontWeight: 600,
              padding: '0.4rem 0.85rem',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        )}
      </div>
    </nav>
  );
}
