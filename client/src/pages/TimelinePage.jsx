import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routineAPI, timelineAPI } from '../api/client';
import LoadingScreen from '../components/LoadingScreen';

const CATEGORIES = [
  { id: 'hair_gummies', name: 'Hair Gummies' },
  { id: 'hair_serum', name: 'Hair Serum' },
  { id: 'beard_minoxidil', name: 'Beard Minoxidil' },
  { id: 'recovery_gummies', name: 'Sleep & Recovery' },
];

export default function TimelinePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('hair_gummies');
  const [timeline, setTimeline] = useState(null);
  const [error, setError] = useState('');

  // Fetch current routine to set default category
  useEffect(() => {
    async function init() {
      try {
        const curRes = await routineAPI.current();
        const cat = curRes.data.routine.category;
        if (cat) setActiveCategory(cat);
      } catch {
        // Fallback default
      }
    }
    init();
  }, []);

  // Fetch timeline data whenever activeCategory changes
  useEffect(() => {
    async function fetchTimeline() {
      setLoading(true);
      setError('');
      try {
        const res = await timelineAPI.get(activeCategory);
        setTimeline(res.data.timeline);
      } catch (err) {
        setError('Timeline content not available for this category.');
      } finally {
        setLoading(false);
      }
    }
    fetchTimeline();
  }, [activeCategory]);

  return (
    <div className="timeline-page">
      <div className="page-content">
        <header className="timeline-header">
          <span className="badge badge--neutral">Science-Grounded Roadmap</span>
          <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
            What to Expect (and When)
          </h1>
          <p className="text-muted text-sm">
            Consumer wellness treatments fail in minds before they fail in bodies. Here is the realistic biological progression.
          </p>
        </header>

        {/* Category Pills */}
        <div className="category-pill-row">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`category-pill ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingScreen message="Loading clinical roadmap..." />
        ) : error ? (
          <div className="alert alert--danger">{error}</div>
        ) : !timeline ? null : (
          <div className="timeline-content">
            {/* Highlights card */}
            <div className="card highlight-card">
              <div className="row row--gap-3" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.6rem' }}>💡</span>
                <div>
                  <h4 style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, margin: '0 0 4px 0' }}>
                    What Most People Notice First
                  </h4>
                  <p className="highlight-text">{timeline.whatMostNoticeFirst}</p>
                  <div style={{ marginTop: 'var(--space-2)' }}>
                    <span className="badge badge--accent">
                      Fair to evaluate at Week {timeline.fairToJudgeWeek}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step-by-step milestones */}
            <div className="milestones-list">
              {timeline.milestones?.map((m, idx) => (
                <motion.div
                  key={m.week}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="card milestone-item"
                >
                  <div className="milestone-badge">W{m.week}</div>
                  <div style={{ flex: 1 }}>
                    <h3 className="milestone-title">{m.title}</h3>
                    <p className="milestone-body">{m.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Medical disclaimer */}
            <div className="card disclaimer-card" style={{ marginTop: 'var(--space-6)' }}>
              <h4 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                Medical Transparency Note
              </h4>
              <p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
                Individual timelines vary according to hormone receptors, metabolic rate, genetics, and preexisting nutritional status. If you experience unexpected discomfort, discontinue immediately and consult an accredited healthcare practitioner.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .timeline-page {
          padding-top: var(--space-4);
          padding-bottom: var(--space-8);
        }
        .timeline-header {
          margin-bottom: var(--space-5);
        }
        .category-pill-row {
          display: flex;
          gap: var(--space-2);
          overflow-x: auto;
          padding-bottom: var(--space-3);
          margin-bottom: var(--space-4);
        }
        .category-pill {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }
        .category-pill:hover {
          border-color: var(--accent);
          color: var(--text-primary);
        }
        .category-pill.active {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .highlight-card {
          border-left: 4px solid var(--accent);
          background: var(--accent-faint);
          margin-bottom: var(--space-5);
        }
        .highlight-text {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.5;
          margin: 0;
        }
        .milestones-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .milestone-item {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
          padding: var(--space-4);
        }
        .milestone-badge {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          color: var(--accent);
          font-weight: 700;
          font-family: var(--font-display);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-sm);
          flex-shrink: 0;
          border: 1px solid var(--border-color);
        }
        .milestone-title {
          font-size: var(--text-base);
          font-weight: 600;
          margin: 0 0 var(--space-1) 0;
        }
        .milestone-body {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }
        .disclaimer-card {
          background: var(--bg-secondary);
        }
      `}</style>
    </div>
  );
}
