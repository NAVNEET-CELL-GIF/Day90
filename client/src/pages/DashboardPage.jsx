import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { routineAPI, aiAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import DayStrip from '../components/DayStrip';
import LoadingScreen from '../components/LoadingScreen';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState(null);
  const [stats, setStats] = useState(null);
  const [dayStrip, setDayStrip] = useState([]);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [bannerNotice, setBannerNotice] = useState(null);

  // AI Question state
  const [question, setQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const curRes = await routineAPI.current();
      const currentRoutine = curRes.data.routine;
      setRoutine(currentRoutine);
      setStats(curRes.data.stats);

      const progRes = await routineAPI.progress(currentRoutine._id);
      setDayStrip(progRes.data.dayStrip || []);
    } catch (err) {
      if (err.response?.data?.code === 'NO_ROUTINE' || err.response?.status === 404) {
        navigate('/onboarding', { replace: true });
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle today's check-in
  const handleCheckInToday = async () => {
    if (!routine || checkInLoading) return;
    setCheckInLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      await routineAPI.checkIn(routine._id, {
        date: todayStr,
        note: checkInNote.trim(),
      });
      setBannerNotice({ type: 'success', text: 'Checked in for today! Consistency logged.' });
      setShowNoteField(false);
      setCheckInNote('');
      await loadData();
    } catch (err) {
      setBannerNotice({
        type: 'danger',
        text: err.response?.data?.error || 'Failed to check in. Please try again.',
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Check in for yesterday if missed
  const handleCheckInYesterday = async () => {
    if (!routine || checkInLoading) return;
    setCheckInLoading(true);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    try {
      await routineAPI.checkIn(routine._id, { date: yesterdayStr });
      setBannerNotice({ type: 'success', text: 'Yesterday check-in logged!' });
      await loadData();
    } catch (err) {
      setBannerNotice({
        type: 'danger',
        text: err.response?.data?.error || 'Failed to check in for yesterday.',
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Groq AI Q&A
  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!question.trim() || !routine || aiLoading) return;
    setAiLoading(true);
    setAiAnswer(null);
    setAiError('');

    try {
      const res = await aiAPI.ask({
        routineId: routine._id,
        question: question.trim(),
      });
      setAiAnswer(res.data.answer);
    } catch (err) {
      setAiError(err.response?.data?.error || 'Groq AI assistant could not respond right now. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your 90-day tracker..." />;
  }

  if (!routine) return null;

  const currentDay = Math.min(stats?.daysElapsed || 1, 90);
  const adherencePct = Math.round((stats?.adherence || 0) * 100);
  const isTodayDone = stats?.todayCheckedIn;

  // Determine milestone info
  const nextMilestoneWeek = [4, 8, 12].find((w) => w > (stats?.weeksElapsed || 0)) || 12;
  const daysUntilNextMilestone = Math.max(0, nextMilestoneWeek * 7 - (stats?.daysElapsed || 0));

  return (
    <div className="dashboard-page">
      <div className="page-content">
        {/* Banner Alert if any */}
        <AnimatePresence>
          {bannerNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`alert alert--${bannerNotice.type}`}
              style={{ marginBottom: 'var(--space-4)' }}
            >
              <span>{bannerNotice.text}</span>
              <button
                type="button"
                onClick={() => setBannerNotice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <section className="dashboard-hero">
          <div className="row row--between" style={{ alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge--neutral">
                {routine.category.replace(/_/g, ' ').toUpperCase()}
              </span>
              <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
                Day {currentDay} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.6em' }}>/ 90</span>
              </h1>
              <p className="text-muted text-sm">
                Started {routine.startDate} • Week {stats?.currentWeekNumber || 1} of 12
              </p>
            </div>

            {stats?.costPerDay && (
              <div className="cost-tag">
                <span className="cost-num">₹{stats.costPerDay}</span>
                <span className="cost-lbl">per day</span>
              </div>
            )}
          </div>

          {/* Quick Check-in CTA Card */}
          <div className="checkin-hero-card card">
            <div className="row row--between" style={{ alignItems: 'center' }}>
              <div>
                <h2 className="checkin-title">
                  {isTodayDone ? '✓ Checked in for today' : 'Today’s Application'}
                </h2>
                <p className="checkin-sub">
                  {isTodayDone
                    ? 'Great job keeping the streak alive. Remember, patience creates outcomes.'
                    : 'Did you apply your routine today? Mark it with a single tap.'}
                </p>
              </div>

              <button
                type="button"
                className={`btn ${isTodayDone ? 'btn--secondary' : 'btn--primary'} btn--checkin`}
                onClick={handleCheckInToday}
                disabled={checkInLoading || isTodayDone}
              >
                {checkInLoading ? 'Saving...' : isTodayDone ? 'Completed' : 'Tap to Check In'}
              </button>
            </div>

            {!isTodayDone && (
              <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                {!showNoteField ? (
                  <button
                    type="button"
                    className="link-btn text-xs text-muted"
                    onClick={() => setShowNoteField(true)}
                  >
                    + Add an optional note or observation
                  </button>
                ) : (
                  <div className="note-input-row">
                    <input
                      type="text"
                      className="input input--sm"
                      placeholder="e.g. Scalp felt calm, applied after shower"
                      value={checkInNote}
                      onChange={(e) => setCheckInNote(e.target.value)}
                      maxLength={280}
                    />
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => setShowNoteField(false)}
                    >
                      Hide
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="yesterday-quick-check">
              <span className="text-xs text-muted">Missed yesterday? </span>
              <button
                type="button"
                className="link-btn text-xs"
                onClick={handleCheckInYesterday}
                disabled={checkInLoading}
              >
                Log yesterday’s check-in
              </button>
            </div>
          </div>
        </section>

        {/* 90-Day Visual Strip */}
        <section className="section">
          <div className="row row--between" style={{ marginBottom: 'var(--space-2)' }}>
            <h2 className="section-title">The 90-Day Strip</h2>
            <Link to="/progress" className="link-btn text-sm">
              View Detailed Timeline →
            </Link>
          </div>
          <p className="section-desc">
            Visual adherence history. Dark ink marks confirmed applications.
          </p>

          <DayStrip days={dayStrip} currentDay={currentDay} />
        </section>

        {/* Key Metrics Grid */}
        <section className="section">
          <h2 className="section-title">Consistency Metrics</h2>
          <div className="grid grid--3 stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Adherence</span>
              <span className="stat-value">{adherencePct}%</span>
              <span className="stat-sub">
                {adherencePct >= 70 ? '✓ Above 70% threshold' : 'Target: ≥ 70%'}
              </span>
            </div>

            <div className="card stat-card">
              <span className="stat-label">Days Used</span>
              <span className="stat-value">{stats?.daysUsed || 0}</span>
              <span className="stat-sub">out of {stats?.daysElapsed || 0} elapsed</span>
            </div>

            <div className="card stat-card">
              <span className="stat-label">Next Milestone</span>
              <span className="stat-value">W{nextMilestoneWeek}</span>
              <span className="stat-sub">
                {daysUntilNextMilestone === 0 ? 'Reached!' : `in ${daysUntilNextMilestone} days`}
              </span>
            </div>
          </div>
        </section>

        {/* Weekly Check-in Prompt */}
        {!stats?.hasWeeklyLogThisWeek && (
          <section className="section">
            <div className="card weekly-prompt-card">
              <div className="row row--between" style={{ alignItems: 'center' }}>
                <div>
                  <span className="badge badge--accent">Weekly Checkpoint</span>
                  <h3 className="h3" style={{ marginTop: 'var(--space-1)' }}>
                    Week {stats?.currentWeekNumber} Rating Ready
                  </h3>
                  <p className="text-muted text-sm" style={{ margin: 0 }}>
                    Log a quick 1–5 rating to monitor whether visible or sensory changes are trending upward.
                  </p>
                </div>
                <Link to="/weekly" className="btn btn--primary">
                  Log Week {stats?.currentWeekNumber} →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* AI Routine Assistant (Groq) */}
        <section className="section">
          <div className="card ai-card">
            <div className="ai-card__header">
              <div className="row row--gap-2" style={{ alignItems: 'center' }}>
                <span className="ai-icon">✨</span>
                <div>
                  <h3 className="h3" style={{ margin: 0 }}>Ask Day 90 Assistant</h3>
                  <p className="text-muted text-xs" style={{ margin: 0 }}>
                    Powered by Groq • Science-grounded answers for your {routine.category.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAskAI} style={{ marginTop: 'var(--space-3)' }}>
              <div className="ai-input-group">
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Is it normal if I don't see results yet? Can I apply twice a day?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  maxLength={500}
                />
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={aiLoading || !question.trim()}
                >
                  {aiLoading ? 'Thinking...' : 'Ask'}
                </button>
              </div>
            </form>

            {aiError && (
              <div className="alert alert--danger text-sm" style={{ marginTop: 'var(--space-3)' }}>
                {aiError}
              </div>
            )}

            {aiAnswer && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="ai-response"
              >
                <div className="ai-response__title">Response</div>
                <p className="ai-response__text">{aiAnswer}</p>
                <span className="text-xs text-muted">
                  Note: Educational only. Not medical advice. Always consult a physician for clinical questions.
                </span>
              </motion.div>
            )}
          </div>
        </section>

        {/* Quick Links / Educational */}
        <section className="section quick-nav-cards">
          <div className="grid grid--2">
            <Link to="/timeline" className="card quick-nav-card">
              <h4 className="quick-nav-title">Expected Timeline Guide →</h4>
              <p className="text-xs text-muted">
                What the clinical data says about month 1 vs month 2 vs month 3.
              </p>
            </Link>

            <Link to="/verdict" className="card quick-nav-card">
              <h4 className="quick-nav-title">90-Day Verdict & Evaluation →</h4>
              <p className="text-xs text-muted">
                Deterministic calculation of whether this routine has been given a fair test.
              </p>
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        .dashboard-page {
          width: 100%;
          min-height: 100%;
        }
        .dashboard-hero {
          margin-bottom: var(--space-6);
        }
        .cost-tag {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: var(--space-2) var(--space-3);
          text-align: right;
        }
        .cost-num {
          display: block;
          font-family: var(--font-display);
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--accent);
          line-height: 1.1;
        }
        .cost-lbl {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .checkin-hero-card {
          margin-top: var(--space-4);
          background: linear-gradient(145deg, var(--bg-card), var(--accent-faint));
          border-left: 4px solid var(--accent);
        }
        .checkin-title {
          font-size: var(--text-base);
          font-weight: 600;
          margin: 0 0 var(--space-1) 0;
        }
        .checkin-sub {
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin: 0;
          max-width: 480px;
        }
        .btn--checkin {
          padding: var(--space-2) var(--space-5);
          font-weight: 600;
          white-space: nowrap;
        }
        .note-input-row {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-2);
        }
        .yesterday-quick-check {
          margin-top: var(--space-2);
          padding-top: var(--space-1);
        }
        .link-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          color: var(--accent);
          text-decoration: underline;
        }
        .section {
          margin-top: var(--space-6);
        }
        .section-title {
          font-size: var(--text-base);
          font-weight: 600;
          margin: 0;
        }
        .section-desc {
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin: var(--space-1) 0 var(--space-3) 0;
        }
        .strip-legend {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-top: var(--space-2);
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .legend-dot.done { background: var(--accent); }
        .legend-dot.today { background: var(--accent); box-shadow: 0 0 0 2px var(--accent-faint); }
        .legend-dot.missed { background: var(--border-color); }
        .legend-dot.milestone { background: #d97706; }
        .stats-grid {
          gap: var(--space-3);
        }
        .stat-card {
          padding: var(--space-3) var(--space-4);
        }
        .stat-label {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stat-value {
          display: block;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
          margin: var(--space-1) 0;
        }
        .stat-sub {
          display: block;
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .weekly-prompt-card {
          border: 1.5px solid var(--accent);
          background: var(--accent-faint);
        }
        .ai-card {
          border: 1px solid rgba(196, 105, 42, 0.3);
          background: var(--bg-card);
        }
        .ai-icon {
          font-size: 1.4rem;
        }
        .ai-input-group {
          display: flex;
          gap: var(--space-2);
        }
        .ai-response {
          margin-top: var(--space-3);
          padding: var(--space-3);
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
          border-left: 3px solid var(--accent);
        }
        .ai-response__title {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          margin-bottom: var(--space-1);
        }
        .ai-response__text {
          font-size: var(--text-sm);
          color: var(--text-primary);
          line-height: 1.5;
          margin-bottom: var(--space-2);
        }
        .quick-nav-card {
          text-decoration: none;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .quick-nav-card:hover {
          transform: translateY(-2px);
          border-color: var(--accent);
        }
        .quick-nav-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--accent);
          margin: 0 0 var(--space-1) 0;
        }
      `}</style>
    </div>
  );
}
