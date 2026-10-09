import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routineAPI } from '../api/client';
import DayStrip from '../components/DayStrip';
import TrendChart from '../components/TrendChart';
import LoadingScreen from '../components/LoadingScreen';

export default function ProgressPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProgress() {
      try {
        const curRes = await routineAPI.current();
        const routineId = curRes.data.routine._id;
        const progRes = await routineAPI.progress(routineId);
        setProgressData(progRes.data);
      } catch (err) {
        if (err.response?.status === 404) {
          navigate('/onboarding', { replace: true });
        } else {
          setError('Failed to load progress data.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, [navigate]);

  if (loading) return <LoadingScreen message="Loading progress analytics..." />;
  if (error) return <div className="container" style={{ padding: 'var(--space-6)' }}><div className="alert alert--danger">{error}</div></div>;
  if (!progressData) return null;

  const { routine, dayStrip, weeklyLogs, stats } = progressData;
  const adherencePct = Math.round((stats.adherence || 0) * 100);
  const currentDay = Math.min(stats.daysElapsed || 1, 90);
  const daysMissed = stats.daysMissed ?? Math.max(0, (stats.daysElapsed || 0) - (stats.daysUsed || 0));

  const getTrendBadge = (trend) => {
    switch (trend) {
      case 'improving':
        return <span className="badge badge--success">Trending Upward ↑</span>;
      case 'declining':
        return <span className="badge badge--danger">Trending Downward ↓</span>;
      case 'flat':
        return <span className="badge badge--neutral">Stable / Flat →</span>;
      default:
        return <span className="badge badge--neutral">Calibrating (need 3+ logs)</span>;
    }
  };

  return (
    <div className="progress-page">
      <div className="page-content">
        {/* Header */}
        <header className="progress-header">
          <span className="badge badge--accent">Objective Adherence</span>
          <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
            Your 90-Day Trajectory
          </h1>
          <p className="text-muted text-sm">
            Tracking {routine.category.replace(/_/g, ' ')} • Goal: {routine.goal.replace(/_/g, ' ')}
          </p>
        </header>

        {/* 90-Day Strip */}
        <section className="section card">
          <div className="row row--between" style={{ marginBottom: 'var(--space-3)' }}>
            <div>
              <h2 className="section-title">90-Day Consistency Strip</h2>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                Every single day accounted for. The biological cycle requires unbroken momentum.
              </p>
            </div>
            <span className="text-sm" style={{ fontWeight: 600, color: 'var(--accent)' }}>
              Day {currentDay} of 90
            </span>
          </div>

          <DayStrip days={dayStrip} currentDay={currentDay} />

          <div className="strip-stats-row">
            <div className="strip-stat">
              <span className="label text-xs">Total Applications</span>
              <span className="val">{stats.daysUsed} days</span>
            </div>
            <div className="strip-stat">
              <span className="label text-xs">Days Missed</span>
              <span className="val">{daysMissed} days</span>
            </div>
            <div className="strip-stat">
              <span className="label text-xs">Trailing Adherence</span>
              <span className="val" style={{ color: adherencePct >= 70 ? 'var(--color-success)' : 'var(--accent)' }}>
                {adherencePct}%
              </span>
            </div>
          </div>
        </section>

        {/* Rating Trend Chart */}
        <section className="section card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="row row--between" style={{ alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 className="section-title">Weekly Subjective Rating Trend</h2>
              <p className="text-xs text-muted" style={{ margin: 0 }}>
                1 = Worst / No progress, 5 = Significant noticeable improvement
              </p>
            </div>
            <div>{getTrendBadge(stats.trend)}</div>
          </div>

          <TrendChart weeklyLogs={weeklyLogs} />

          <div className="row row--between" style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
            <span className="text-xs text-muted">
              {weeklyLogs.length} weekly checkpoint{weeklyLogs.length === 1 ? '' : 's'} recorded so far
            </span>
            <Link to="/weekly" className="btn btn--secondary btn--sm">
              + Log or Edit Week Rating
            </Link>
          </div>
        </section>

        {/* Weekly Logs History Table */}
        <section className="section" style={{ marginTop: 'var(--space-6)' }}>
          <h2 className="section-title" style={{ marginBottom: 'var(--space-3)' }}>
            Weekly Checkpoints Log
          </h2>

          {weeklyLogs.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-6)' }}>
              <p className="text-muted text-sm">No weekly checkpoints logged yet.</p>
              <Link to="/weekly" className="btn btn--primary btn--sm" style={{ marginTop: 'var(--space-2)' }}>
                Record Your First Weekly Log
              </Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-responsive">
                <table className="log-table">
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Rating</th>
                      <th>Observations</th>
                      <th>Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyLogs.map((log) => (
                      <tr key={log.weekNumber}>
                        <td>
                          <strong>Week {log.weekNumber}</strong>
                        </td>
                        <td>
                          <span className="rating-pill">★ {log.rating}/5</span>
                        </td>
                        <td className="note-cell">
                          {log.note || <span className="text-muted text-xs italic">No notes</span>}
                        </td>
                        <td>
                          {log.hasPhoto ? (
                            <span className="badge badge--success">Saved</span>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        .progress-page {
          width: 100%;
        }
        .progress-header {
          margin-bottom: var(--space-5);
        }
        .strip-stats-row {
          display: flex;
          gap: var(--space-6);
          margin-top: var(--space-4);
          padding-top: var(--space-3);
          border-top: 1px solid var(--border-color);
        }
        .strip-stat .label {
          margin-bottom: 2px;
        }
        .strip-stat .val {
          font-size: var(--text-base);
          font-weight: 700;
          font-family: var(--font-display);
        }
        .log-table {
          width: 100%;
          border-collapse: collapse;
          font-size: var(--text-sm);
        }
        .log-table th {
          background: var(--bg-secondary);
          padding: var(--space-3);
          text-align: left;
          font-weight: 600;
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-color);
        }
        .log-table td {
          padding: var(--space-3);
          border-bottom: 1px solid var(--border-color);
        }
        .rating-pill {
          background: var(--accent-faint);
          color: var(--accent);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-weight: 600;
          font-size: var(--text-xs);
        }
        .note-cell {
          max-width: 280px;
          color: var(--text-secondary);
        }
        .table-responsive {
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
