import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export default function SignupPage() {
  const navigate  = useNavigate();
  const { login, isDemo } = useAuth();

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name || name.trim().length < 2) {
      setError('Please provide your name (at least 2 characters).');
      return;
    }
    if (!email) {
      setError('A valid email address is required.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authAPI.signup({ name: name.trim(), email: email.trim(), password });
      login(res.data.token, res.data.user);
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not complete signup. Please try again.');
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
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Unable to load demo environment. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="auth-header">
          <Link to="/" className="auth-logo">Day 90</Link>
          <h1 className="h2" style={{ marginTop: 'var(--space-2)' }}>Begin your 90 days</h1>
          <p className="text-muted text-sm">
            Give your wellness routine an honest, scientifically grounded chance.
          </p>
        </div>

        {isDemo && (
          <div className="alert alert--info" style={{ marginBottom: 'var(--space-4)' }}>
            <span>👋 You were viewing the demo. Enter your details below to start your personal 90-day tracker from Day 1.</span>
          </div>
        )}

        {error && (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="form-group" noValidate>
          <div>
            <label className="label" htmlFor="signup-name">Your Name</label>
            <input
              id="signup-name"
              type="text"
              className="input"
              autoComplete="name"
              placeholder="e.g. Maya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              className="input"
              autoComplete="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="signup-password">Password</label>
            <div className="pw-wrapper">
              <input
                id="signup-password"
                type={showPw ? 'text' : 'password'}
                className="input"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
            <span className="text-xs text-muted" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
              Must be at least 8 characters long
            </span>
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={loading}
            style={{ marginTop: 'var(--space-3)' }}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-divider">
          <span>or explore instantly</span>
        </div>

        <button
          type="button"
          className="btn btn--secondary btn--full"
          onClick={handleDemo}
          disabled={demoLoading}
        >
          {demoLoading ? 'Setting up demo...' : 'Try Demo as Rahul (Day 47)'}
        </button>

        <div className="auth-footer text-center text-sm" style={{ marginTop: 'var(--space-6)' }}>
          <span className="text-muted">Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Log in</Link>
        </div>
      </motion.div>

      <style>{`
        .auth-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          background: var(--bg-primary);
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
        }
        .auth-header {
          margin-bottom: var(--space-6);
        }
        .auth-logo {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--accent);
          text-decoration: none;
          display: inline-block;
          margin-bottom: var(--space-1);
        }
        .pw-wrapper {
          position: relative;
        }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          padding: 4px;
          display: flex;
          align-items: center;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          margin: var(--space-5) 0;
          color: var(--text-faint);
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }
        .auth-divider span {
          padding: 0 var(--space-3);
        }
      `}</style>
    </div>
  );
}
