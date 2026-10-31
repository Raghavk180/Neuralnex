import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, signup } from '../api';
import { useAuth } from '../auth';

export default function AuthPanel() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('signin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Sign-up state
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login({ email: siEmail, password: siPassword });
      setUser(user);
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.onboarded) {
        navigate('/explore');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!suName.trim()) { setError('Name is required.'); return; }
    if (!suEmail.trim()) { setError('Email is required.'); return; }
    if (suPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const user = await signup({ name: suName, email: suEmail, password: suPassword });
      setUser(user);
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-panel">
      <div className="auth-tabs">
        <button
          className={`auth-tab${tab === 'signin' ? ' active' : ''}`}
          onClick={() => { setTab('signin'); setError(''); }}
        >
          Sign in
        </button>
        <button
          className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
          onClick={() => { setTab('signup'); setError(''); }}
        >
          Sign up
        </button>
      </div>

      {tab === 'signin' ? (
        <form className="auth-form-wrap" onSubmit={handleSignIn}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">College email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@college.edu"
              value={siEmail}
              onChange={(e) => setSiEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={siPassword}
              onChange={(e) => setSiPassword(e.target.value)}
              required
            />
          </div>
          <div className="auth-forgot">
            <span style={{ cursor: 'default', userSelect: 'none' }}>Forgot password?</span>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : '→ Sign in'}
          </button>
          <p className="auth-form-hint">
            New student?{' '}
            <button
              type="button"
              onClick={() => setTab('signup')}
              style={{ background: 'none', border: 'none', color: 'var(--blue-700)', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
            >
              Create an account
            </button>{' '}
            in Sign up.
          </p>
        </form>
      ) : (
        <form className="auth-form-wrap" onSubmit={handleSignUp}>
          {error && <div className="auth-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Your full name"
              value={suName}
              onChange={(e) => setSuName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">College email</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@college.edu"
              value={suEmail}
              onChange={(e) => setSuEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Min. 6 characters"
              value={suPassword}
              onChange={(e) => setSuPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Creating account…' : '→ Create account'}
          </button>
        </form>
      )}
    </div>
  );
}
