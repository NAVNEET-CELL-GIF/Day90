import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { login, isDemo } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login({ email, password });
      login(res.data.token, res.data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const res = await authAPI.demo();
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch {
      setError('Demo unavailable. Please try again shortly.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="auth-card__header">
          <Link to="/" className="auth-card__back">← Back</Link>
          <h1 className="display-sm" style={{ marginTop: 'var(--space-4)' }}>Welcome back.</h1>
          <p className="text-muted text-sm" style={{ marginTop: 'var(--space-2)' }}>
            Log in to see your progress.
          </p>
        </div>

        {isDemo && (
          <div className="alert alert--info" style={{ marginBottom: 'var(--space-4)' }}>
            <span>👋 You were viewing the demo. Log in below to resume your saved 90-day tracker.</span>
          </div>
        )}

        {location.state?.expired && (
          <div className="form-error card--inset" style={{ marginBottom: 'var(--space-4)', borderColor: 'var(--error)' }} role="alert">
            Session expired. Please log in again.
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-card__form" noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              id="email"
              type="email"
              className={`form-input ${error ? 'is-error' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="form-input-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                className={`form-input ${error ? 'is-error' : ''}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="form-input-icon"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {error && (
            <p className="form-error" role="alert" aria-live="polite">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            id="login-submit"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="divider--text">or</div>

        <button
          className="btn btn--outline btn--full"
          onClick={handleDemo}
          disabled={demoLoading}
          id="login-demo"
        >
          {demoLoading ? 'Loading demo...' : 'Try the demo'}
        </button>

        <p className="text-sm text-center text-muted" style={{ marginTop: 'var(--space-4)' }}>
          Don't have an account?{' '}
          <Link to="/signup" className="auth-card__link">Sign up</Link>
        </p>
      </motion.div>

      <style>{`
        .auth-page {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          min-height: 100dvh;
          padding-top: var(--space-8);
        }
        .auth-card {
          background: var(--white);
          border: 1px solid var(--cream-border);
          border-radius: var(--radius-xl);
          padding: var(--space-8) var(--space-6);
          width: 100%;
          max-width: 420px;
          box-shadow: var(--shadow-md);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }
        .auth-card__header { display: flex; flex-direction: column; }
        .auth-card__back {
          font-size: var(--text-sm);
          color: var(--ink-muted);
          align-self: flex-start;
        }
        .auth-card__back:hover { color: var(--ink); }
        .auth-card__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .auth-card__link {
          color: var(--forest);
          font-weight: 500;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
