import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEffect, useState } from 'react';
import { routineAPI } from '../api/client';

const IconHome = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const IconStrip = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="9" width="4" height="12" rx="1"/>
    <rect x="8" y="5" width="4" height="16" rx="1"/>
    <rect x="14" y="7" width="4" height="14" rx="1"/>
    <rect x="20" y="3" width="4" height="18" rx="1"/>
  </svg>
);
const IconVerdict = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v4l3 3"/>
  </svg>
);
const IconPhotos = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21,15 16,10 5,21"/>
  </svg>
);
const IconSettings = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const IconCalendar = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <path d="M16 2v4M8 2v4M3 10h18"/>
  </svg>
);

export default function AppShell() {
  const { user, isDemo } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    routineAPI.current().catch(() => {});
  }, []);

  const tabs = [
    { path: '/dashboard', label: 'Home',     Icon: IconHome    },
    { path: '/progress',  label: 'Progress', Icon: IconStrip   },
    { path: '/verdict',   label: 'Verdict',  Icon: IconVerdict },
    { path: '/weekly',    label: 'Weekly',   Icon: IconCalendar},
    { path: '/photos',    label: 'Photos',   Icon: IconPhotos  },
    { path: '/settings',  label: 'Settings', Icon: IconSettings},
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      {/* Top nav — mobile/tablet only */}
      <nav className="nav app-top-nav" aria-label="Main navigation">
        <div className="nav__inner">
          <span className="nav__logo">Day 90</span>
          <div className="row row--gap-3">
            {isDemo && <span className="badge badge--demo">Demo</span>}
            <span className="text-sm text-muted">{user?.name}</span>
          </div>
        </div>
      </nav>

      {/* Demo banner — mobile/tablet */}
      {isDemo && (
        <div className="demo-banner" role="alert">
          <span>Viewing demo data. </span>
          <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>
            Sign up
          </a>
          <span> or </span>
          <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
            Log in →
          </a>
        </div>
      )}

      {/* App layout: sidebar on desktop + main content */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* Desktop Sidebar */}
        <aside className="sidebar" aria-label="Sidebar navigation">
          <span className="sidebar__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Day 90</span>

          {isDemo && (
            <div style={{ padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-3)', background: 'var(--accent-faint)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(196,105,42,0.2)' }}>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent)', marginBottom: 'var(--space-2)' }}>
                Demo Session
              </div>
              <div className="stack stack--2">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  style={{ width: '100%', minHeight: '32px', padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                  onClick={() => navigate('/signup')}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  style={{ width: '100%', minHeight: '32px', padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                  onClick={() => navigate('/login')}
                >
                  Log In
                </button>
              </div>
            </div>
          )}

          {tabs.map(({ path, label, Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                className={`sidebar__item ${active ? 'active' : ''}`}
                onClick={() => navigate(path)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon active={active} />
                {label}
              </button>
            );
          })}

          <div className="sidebar__spacer" />
          <div className="sidebar__separator" />
          <div className="sidebar__user">
            <div className="sidebar__user-name">{user?.name || 'User'}</div>
            <div className="sidebar__user-sub">{isDemo ? 'Demo Mode' : 'Day 90 Tracker'}</div>
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, paddingBottom: 'calc(100px + var(--safe-bottom))' }}>
          {isDemo && (
            <div className="demo-banner-desktop" role="alert">
              <span>📊 You are viewing demo data. </span>
              <a href="/signup" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>
                Create your account
              </a>
              <span> or </span>
              <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                Log in →
              </a>
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* Mobile/Tablet bottom tab bar */}
      <nav className="tab-bar" aria-label="Tab navigation">
        {tabs.map(({ path, label, Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              className={`tab-bar__item ${active ? 'active' : ''}`}
              onClick={() => navigate(path)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              <Icon active={active} />
              <span className="tab-bar__label">{label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        .demo-banner {
          background: var(--accent-faint);
          border-bottom: 1px solid rgba(196,105,42,0.2);
          text-align: center;
          padding: var(--space-2) var(--space-4);
          font-size: var(--text-sm);
          color: var(--accent);
        }
        .demo-banner a { font-weight: 600; text-decoration: underline; color: var(--accent); }
        .demo-banner-desktop { display: none; }
        @media (min-width: 1024px) {
          .app-top-nav { display: none; }
          .demo-banner { display: none; }
          .demo-banner-desktop {
            display: block;
            background: var(--accent-faint);
            border-bottom: 1px solid rgba(196,105,42,0.2);
            text-align: center;
            padding: var(--space-2) var(--space-4);
            font-size: var(--text-sm);
            color: var(--accent);
          }
          .demo-banner-desktop a { font-weight: 600; text-decoration: underline; color: var(--accent); }
          main { padding-bottom: var(--space-8) !important; }
        }
      `}</style>
    </div>
  );
}
