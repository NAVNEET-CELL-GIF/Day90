import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routineAPI } from '../api/client';
import LoadingScreen from '../components/LoadingScreen';

export default function VerdictPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verdictData, setVerdictData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadVerdict() {
      try {
        const curRes = await routineAPI.current();
        const routineId = curRes.data.routine._id;

        const [vRes, sRes] = await Promise.all([
          routineAPI.verdict(routineId),
          routineAPI.summary(routineId),
        ]);

        setVerdictData(vRes.data);
        setSummaryData(sRes.data);
      } catch (err) {
        if (err.response?.status === 404) {
          navigate('/onboarding', { replace: true });
        } else {
          setError('Failed to calculate routine verdict.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadVerdict();
  }, [navigate]);

  if (loading) return <LoadingScreen message="Computing 90-day evaluation..." />;
  if (error) return <div className="container" style={{ padding: 'var(--space-6)' }}><div className="alert alert--danger">{error}</div></div>;
  if (!verdictData) return null;

  const { verdict, stats, explanation } = verdictData;
  const summary = summaryData?.summary || {};
  const routine = summaryData?.routine;

  const getVerdictCard = () => {
    switch (verdict) {
      case 'TOO_EARLY':
        return {
          title: 'Too Early to Judge',
          subtitle: `Week ${stats.weeksElapsed || 1} of 12 — Biology is still working underneath`,
          badge: 'Too Early',
          badgeClass: 'badge--neutral',
          color: 'var(--text-primary)',
          bg: 'var(--bg-card)',
          icon: '⏳',
          recommendation:
            'Hair follicles and skin cellular turnover operate on 90–120 day cycles. Judging efficacy before week 8–12 is the #1 reason people stop treatments that would have worked.',
        };
      case 'NOT_FAIR_TEST':
        return {
          title: 'Not Yet a Fair Test',
          subtitle: `${Math.round((stats.adherence || 0) * 100)}% Adherence (Threshold: 70%)`,
          badge: 'Inconclusive',
          badgeClass: 'badge--danger',
          color: 'var(--accent)',
          bg: 'var(--accent-faint)',
          icon: '⚠️',
          recommendation:
            'Because less than 70% of days were logged, the active compounds have not maintained therapeutic tissue concentrations. Before switching products or giving up, try a focused 30-day streak.',
        };
      case 'CONSIDER_DOCTOR':
        return {
          title: 'Consider Consulting a Specialist',
          subtitle: 'Consistent 12-week test without measurable improvement',
          badge: 'Doctor Consultation Recommended',
          badgeClass: 'badge--accent',
          color: 'var(--accent)',
          bg: 'var(--bg-card)',
          icon: '🩺',
          recommendation:
            'You gave this product an impeccably fair test. When consistent topicals or supplements do not yield results, underlying factors like androgen sensitivity, thyroid health, or ferritin levels may require targeted medical intervention.',
        };
      case 'KEEP_GOING':
      default:
        return {
          title: 'Positive Momentum — Keep Going',
          subtitle: `High adherence (${Math.round((stats.adherence || 0) * 100)}%) with positive signals`,
          badge: 'On Track',
          badgeClass: 'badge--success',
          color: 'var(--color-success)',
          bg: 'var(--bg-card)',
          icon: '✨',
          recommendation:
            'Your routine adherence is strong and subjective observations are trending in the right direction. The next 30 days will cement long-term stability.',
        };
    }
  };

  const vCard = getVerdictCard();

  const handleShareSummary = () => {
    const text = `Day 90 Summary:
Routine: ${routine?.category?.replace(/_/g, ' ')}
Days Logged: ${summary.daysUsed} / ${summary.daysElapsed} (${summary.adherence}% adherence)
Verdict: ${vCard.title}
Evaluation: ${explanation}
Tracked with Day 90.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="verdict-page">
      <div className="page-content">
        {/* Header */}
        <header className="verdict-header">
          <span className="badge badge--neutral">Objective Assessment</span>
          <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
            The 90-Day Verdict
          </h1>
          <p className="text-muted text-sm">
            Honest, clinical-grade analysis. No marketing fluff, no false promises.
          </p>
        </header>

        {/* Primary Verdict Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card verdict-card"
          style={{ background: vCard.bg }}
        >
          <div className="row row--between" style={{ alignItems: 'flex-start' }}>
            <div className="verdict-icon">{vCard.icon}</div>
            <span className={`badge ${vCard.badgeClass}`}>{vCard.badge}</span>
          </div>

          <h2 className="verdict-card__title" style={{ marginTop: 'var(--space-3)' }}>
            {vCard.title}
          </h2>
          <p className="verdict-card__subtitle">{vCard.subtitle}</p>

          <div className="verdict-card__rec">
            <h4 className="rec-title">Assessment Summary</h4>
            <p className="rec-text">{vCard.recommendation}</p>
          </div>

          {explanation && (
            <div className="verdict-card__ai">
              <div className="row row--gap-2" style={{ alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                <span className="text-xs" style={{ fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  Clinical Perspective
                </span>
                {verdictData.explanationMeta?.fromFallback === false && (
                  <span className="badge badge--demo" style={{ fontSize: '0.65rem' }}>Groq AI</span>
                )}
              </div>
              <p className="explanation-text">{explanation}</p>
            </div>
          )}
        </motion.div>

        {/* Month-3 Economic & Value Breakdown */}
        <section className="section" style={{ marginTop: 'var(--space-6)' }}>
          <h2 className="section-title">Value & Consistency Breakdown</h2>
          <div className="grid grid--3 stats-grid" style={{ marginTop: 'var(--space-3)' }}>
            <div className="card stat-card">
              <span className="stat-label">Total Days Logged</span>
              <span className="stat-value">{summary.daysUsed || 0}</span>
              <span className="stat-sub">out of {summary.daysElapsed || 0} days</span>
            </div>

            <div className="card stat-card">
              <span className="stat-label">Rating Shift</span>
              <span className="stat-value">
                {summary.ratingChange != null
                  ? `${summary.ratingChange > 0 ? '+' : ''}${summary.ratingChange} pts`
                  : '—'}
              </span>
              <span className="stat-sub">
                From {summary.firstRating ? `${summary.firstRating}/5` : '—'} to{' '}
                {summary.lastRating ? `${summary.lastRating}/5` : '—'}
              </span>
            </div>

            <div className="card stat-card">
              <span className="stat-label">Total Invested</span>
              <span className="stat-value">
                {summary.totalSpent != null ? `₹${summary.totalSpent}` : '—'}
              </span>
              <span className="stat-sub">
                {summary.costPerDay != null ? `₹${summary.costPerDay}/day` : 'Transparent cost'}
              </span>
            </div>
          </div>
        </section>

        {/* Shareable Card / Export */}
        <section className="section" style={{ marginTop: 'var(--space-6)' }}>
          <div className="card share-card">
            <div className="row row--between" style={{ alignItems: 'center' }}>
              <div>
                <h3 className="h3" style={{ margin: 0 }}>Doctor / Reviewer Summary</h3>
                <p className="text-xs text-muted" style={{ margin: '2px 0 0 0' }}>
                  Copy a structured summary of your adherence and outcome to share with a physician or clinic.
                </p>
              </div>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleShareSummary}
              >
                {copied ? '✓ Copied to Clipboard' : 'Copy Summary'}
              </button>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .verdict-page {
          padding-top: var(--space-4);
          padding-bottom: var(--space-8);
        }
        .verdict-header {
          margin-bottom: var(--space-5);
        }
        .verdict-card {
          border: 1.5px solid var(--border-color);
          padding: var(--space-6);
        }
        .verdict-icon {
          font-size: 2.2rem;
        }
        .verdict-card__title {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 700;
          margin-bottom: var(--space-1);
        }
        .verdict-card__subtitle {
          font-size: var(--text-sm);
          color: var(--text-muted);
          margin-bottom: var(--space-4);
        }
        .verdict-card__rec {
          background: var(--bg-secondary);
          padding: var(--space-4);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-4);
        }
        .rec-title {
          font-size: var(--text-xs);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: var(--space-1);
        }
        .rec-text {
          font-size: var(--text-sm);
          color: var(--text-primary);
          line-height: 1.5;
          margin: 0;
        }
        .verdict-card__ai {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          padding: var(--space-4);
          border-radius: var(--radius-md);
        }
        .explanation-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }
        .share-card {
          background: var(--bg-secondary);
          border: 1px dashed var(--border-color);
        }
      `}</style>
    </div>
  );
}
