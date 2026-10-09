import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { authAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const QUOTES = [
  {
    text: "Results are long term and invisible for a very long time, so that can be frustrating. The process should be visible.",
    attr: "— Customer, beard minoxidil",
  },
  {
    text: "I didn't feel any major difference, but I wasn't using it consistently. So maybe that's why.",
    attr: "— Customer, hair gummies",
  },
  {
    text: "Slightly overhyped compared to the actual experience.",
    attr: "— Customer, hair serum",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, login, logout, isDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = () => {
    if (user && !isDemo) {
      navigate('/dashboard');
    } else {
      navigate('/signup');
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.demo();
      const { token, user: demoUser } = res.data;
      login(token, demoUser);
      navigate('/dashboard');
    } catch {
      setError('Demo unavailable right now. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing__header">
        <motion.div
          className="landing__logo"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
        >
          Day 90
        </motion.div>

        <div className="landing__nav-actions">
          {user && !isDemo ? (
            <div className="row row--gap-2" style={{ alignItems: 'center' }}>
              <span className="text-sm text-muted" style={{ display: 'none' }}>{user.name}</span>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard →
              </button>
            </div>
          ) : (
            <div className="row row--gap-2" style={{ alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => navigate('/login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="landing__hero">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="landing__eyebrow label">Your routine companion</p>
            <h1 className="landing__headline">
              Hair and wellness routines work slowly.
              <br />
              <span className="landing__headline-em">Now you'll know if yours is.</span>
            </h1>
            <p className="landing__subhead">
              Log daily. Rate weekly. Get an honest verdict at 90 days —
              not a guess, not hype. Your own data.
            </p>
          </motion.div>

          <motion.div
            className="landing__cta-group"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button
              className="btn btn--primary btn--full"
              onClick={handleStart}
              id="cta-start"
            >
              {user && !isDemo ? 'Go to Dashboard' : 'Start my Day 1'}
            </button>
            <button
              className="btn btn--outline btn--full"
              onClick={handleDemo}
              disabled={loading}
              id="cta-demo"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner" style={{ borderColor: 'var(--cream-border)', borderTopColor: 'var(--forest)' }} />
                  Loading demo...
                </span>
              ) : 'Try the demo'}
            </button>
            {error && <p className="form-error">{error}</p>}
          </motion.div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
            <span className="text-sm text-muted">Already registered? </span>
            <button
              type="button"
              className="link-btn text-sm"
              style={{ fontWeight: 600, color: 'var(--forest)', textDecoration: 'underline' }}
              onClick={() => navigate('/login')}
            >
              Log in to your routine →
            </button>
          </div>

          {/* 90-day strip illustration */}
          <motion.div
            className="landing__strip-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            aria-hidden="true"
          >
            {Array.from({ length: 90 }, (_, i) => {
              const used = i < 51 && Math.random() > 0.28;
              const isMilestone = [27, 55, 83].includes(i);
              const isToday = i === 50;
              return (
                <div
                  key={i}
                  className={[
                    'strip-preview__dot',
                    i > 50 ? 'strip-preview__dot--future' : '',
                    used && !isToday ? 'strip-preview__dot--done' : '',
                    isToday ? 'strip-preview__dot--today' : '',
                    !used && i <= 50 && !isToday ? 'strip-preview__dot--missed' : '',
                    isMilestone ? 'strip-preview__dot--milestone' : '',
                  ].filter(Boolean).join(' ')}
                />
              );
            })}
          </motion.div>
          <p className="text-xs text-faint text-center" style={{ marginTop: '8px' }}>
            Your 90 days — every day marked honestly
          </p>
        </section>

        {/* Why this exists */}
        <section className="landing__why">
          <div className="landing__section-label label">Why this exists</div>
          <h2 className="landing__section-title">
            We talked to people using hair and wellness products.
            <br />Here is what they said.
          </h2>

          <div className="landing__quotes">
            {QUOTES.map((q, i) => (
              <motion.blockquote
                key={i}
                className="quote-card"
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
              >
                <p>"{q.text}"</p>
                <cite className="text-xs text-faint" style={{ marginTop: '8px', display: 'block', fontStyle: 'normal' }}>
                  {q.attr}
                </cite>
              </motion.blockquote>
            ))}
          </div>

          <div className="landing__insight card card--inset" style={{ marginTop: '24px' }}>
            <p className="text-sm" style={{ lineHeight: 1.7 }}>
              <strong>The pattern:</strong> people who could <em>see</em> their progress — a change
              in shedding, a new beard hair — stayed consistent and felt the product was worth it.
              People who couldn't see anything assumed it wasn't working. Day 90 makes progress visible.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="landing__how">
          <div className="landing__section-label label">How it works</div>
          <div className="landing__steps">
            {[
              { n: '1', title: 'Pick your product', body: 'Hair gummies, serum, beard minoxidil, or recovery. We tell you what to typically expect and when.' },
              { n: '2', title: 'Check in daily', body: 'One tap for "used it today". Optional note. We track your consistency honestly — no sugar-coating.' },
              { n: '3', title: 'Rate weekly', body: 'A 1–5 self-rating on your goal. Optionally add a photo. We draw your trend as it forms.' },
              { n: '4', title: 'Get the verdict', body: 'At 4, 8, and 12 weeks: too early to judge? Not a fair test yet? Worth talking to a doctor? Your data decides.' },
            ].map((step) => (
              <div key={step.n} className="landing__step">
                <div className="landing__step-num">{step.n}</div>
                <div>
                  <p className="fw-500">{step.title}</p>
                  <p className="text-sm text-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="landing__final-cta">
          <h2 className="display-sm" style={{ marginBottom: '8px' }}>
            Ninety days. Your own data.
          </h2>
          <p className="text-muted" style={{ marginBottom: '24px' }}>
            No push notifications. No subscription. No medical claims.
            Just an honest log of whether you showed up.
          </p>
          <div className="row row--center row--gap-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={handleStart} style={{ minWidth: '200px' }}>
              {user && !isDemo ? 'Go to Dashboard' : 'Start my Day 1 (Sign Up)'}
            </button>
            <button
              className="btn btn--secondary"
              style={{ minWidth: '200px' }}
              onClick={() => navigate('/login')}
            >
              Log In to Routine
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing__footer">
        <p className="text-xs text-faint">
          Day 90 is not medical advice. Timelines shown are typical ranges, not promises.
          Results vary. Persistent or worsening symptoms? See a doctor or dermatologist.
        </p>
      </footer>

      <style>{`
        .landing {
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 0 var(--space-5);
          padding-top: calc(var(--space-6) + var(--safe-top));
          padding-bottom: calc(var(--space-16) + var(--safe-bottom));
          display: flex;
          flex-direction: column;
          gap: var(--space-12);
        }

        .landing__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }

        .landing__logo {
          font-family: var(--font-display);
          font-size: var(--text-xl);
          font-weight: 500;
          color: var(--ink);
          letter-spacing: -0.02em;
        }

        .landing__hero {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .landing__eyebrow {
          margin-bottom: var(--space-3);
        }

        .landing__headline {
          font-family: var(--font-display);
          font-size: clamp(var(--text-3xl), 7vw, var(--text-4xl));
          font-weight: 400;
          line-height: 1.15;
          color: var(--ink);
          letter-spacing: -0.02em;
          margin-bottom: var(--space-4);
        }

        .landing__headline-em {
          color: var(--forest);
          font-style: italic;
        }

        .landing__subhead {
          font-size: var(--text-lg);
          color: var(--ink-muted);
          line-height: 1.6;
        }

        .landing__cta-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .landing__strip-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          padding: var(--space-4);
          background: var(--white);
          border: 1px solid var(--cream-border);
          border-radius: var(--radius-xl);
          margin-top: var(--space-2);
        }

        .strip-preview__dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--cream-border);
          flex-shrink: 0;
        }

        .strip-preview__dot--done    { background: var(--accent); }
        .strip-preview__dot--missed  { background: var(--cream-dark); border: 1px solid var(--cream-border); }
        .strip-preview__dot--today   { background: transparent; border: 2px solid var(--forest); }
        .strip-preview__dot--future  { background: var(--cream-dark); opacity: 0.4; }
        .strip-preview__dot--milestone { box-shadow: 0 0 0 2px var(--gold); }

        .landing__why {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .landing__section-label {
          margin-bottom: var(--space-2);
        }

        .landing__section-title {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 400;
          line-height: 1.3;
          color: var(--ink);
        }

        .landing__quotes {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-top: var(--space-2);
        }

        .landing__how {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .landing__steps {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .landing__step {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
        }

        @media (min-width: 640px) {
          .landing__cta-group {
            flex-direction: row;
          }
          .landing__cta-group .btn {
            flex: 1;
          }
          .landing__quotes {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
          .landing__steps {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .landing {
            max-width: 860px;
            padding-top: var(--space-8);
          }
        }

        .landing__step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--forest);
          color: var(--white);
          font-family: var(--font-display);
          font-size: var(--text-base);
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .landing__final-cta {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          background: var(--cream-dark);
          border-radius: var(--radius-xl);
          border: 1px solid var(--cream-border);
        }

        .landing__footer {
          padding: var(--space-6) 0;
          border-top: 1px solid var(--cream-border);
          text-align: center;
        }
      `}</style>
    </div>
  );
}
