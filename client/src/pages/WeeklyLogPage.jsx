import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routineAPI, aiAPI } from '../api/client';
import { savePhoto, getPhoto } from '../lib/photoStorage';
import LoadingScreen from '../components/LoadingScreen';

const RATING_DESCRIPTIONS = [
  { rating: 1, label: 'No difference / Frustrated', desc: 'Shedding unchanged or worse, zero visible momentum.' },
  { rating: 2, label: 'Uncertain / Negligible', desc: 'No tangible improvement yet, but staying patient.' },
  { rating: 3, label: 'Subtle shifts', desc: 'Slightly less hair fall in the shower, calmer scalp, or improved feel.' },
  { rating: 4, label: 'Noticeable improvement', desc: 'Less breakage, healthier texture, baby hairs emerging.' },
  { rating: 5, label: 'Visible progress', desc: 'Clear density change, visibly thicker hairline, highly confident.' },
];

export default function WeeklyLogPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState(null);
  const [weekNumber, setWeekNumber] = useState(1);
  const [rating, setRating] = useState(3);
  const [note, setNote] = useState('');
  const [photoData, setPhotoData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiReflection, setAiReflection] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const curRes = await routineAPI.current();
        const r = curRes.data.routine;
        const currentWeek = curRes.data.stats.currentWeekNumber || 1;
        setRoutine(r);
        setWeekNumber(Math.min(currentWeek, 12));

        // Load existing photo from IndexedDB if already saved
        const existingPhoto = await getPhoto(r._id, Math.min(currentWeek, 12));
        if (existingPhoto) {
          setPhotoData(existingPhoto.dataUrl);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          navigate('/onboarding', { replace: true });
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [navigate]);

  // When week number changes, see if a photo exists
  const handleWeekChange = async (w) => {
    const num = Number(w);
    setWeekNumber(num);
    if (routine) {
      const p = await getPhoto(routine._id, num);
      setPhotoData(p ? p.dataUrl : null);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!routine || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // 1. If photo exists, save to IndexedDB on-device
      if (photoData) {
        await savePhoto(routine._id, weekNumber, photoData);
      }

      // 2. Submit weekly rating to backend
      await routineAPI.weekly(routine._id, {
        weekNumber,
        rating,
        note: note.trim(),
        hasPhoto: Boolean(photoData),
      });

      setSuccess(`Week ${weekNumber} checkpoint saved successfully!`);

      // 3. Request AI reflection from Groq in background
      setAiLoading(true);
      try {
        const aiRes = await aiAPI.weeklyReflection({
          routineId: routine._id,
          weekNumber,
          rating,
          notes: note.trim() ? [note.trim()] : [],
        });
        setAiReflection(aiRes.data.reflection);
      } catch {
        // Non-blocking fallback
      } finally {
        setAiLoading(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save weekly log.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading weekly log..." />;
  if (!routine) return null;

  return (
    <div className="weekly-page">
      <div className="page-content">
        <header className="weekly-header">
          <span className="badge badge--accent">Weekly Checkpoint</span>
          <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
            Log Week {weekNumber}
          </h1>
          <p className="text-muted text-sm">
            Subjective ratings normalize variance and create your long-term trendline.
          </p>
        </header>

        {error && <div className="alert alert--danger" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}
        {success && <div className="alert alert--success" style={{ marginBottom: 'var(--space-4)' }}>{success}</div>}

        <form onSubmit={handleSubmit} className="card form-group">
          {/* Week Selector */}
          <div>
            <label className="label" htmlFor="week-selector">Checkpoint Week</label>
            <select
              id="week-selector"
              className="input"
              value={weekNumber}
              onChange={(e) => handleWeekChange(e.target.value)}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Week {i + 1} {i + 1 === 4 || i + 1 === 8 || i + 1 === 12 ? '★ Milestone' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 1-5 Rating Selector */}
          <div>
            <label className="label">Overall Observation Rating</label>
            <div className="rating-options">
              {RATING_DESCRIPTIONS.map((item) => {
                const isSelected = rating === item.rating;
                return (
                  <div
                    key={item.rating}
                    className={`rating-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => setRating(item.rating)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setRating(item.rating); }}
                  >
                    <div className="rating-num">★ {item.rating}</div>
                    <div className="rating-meta">
                      <div className="rating-title">{item.label}</div>
                      <div className="rating-desc">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Qualitative Note */}
          <div>
            <label className="label" htmlFor="weekly-note">Notes & Physical Sensations (Optional)</label>
            <textarea
              id="weekly-note"
              className="input"
              rows={3}
              placeholder="e.g. Scalp felt slightly calmer, fewer hairs on pillow this morning, stuck to morning schedule."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
            />
            <span className="text-xs text-muted" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
              {note.length} / 500 characters
            </span>
          </div>

          {/* Private On-Device Photo Upload */}
          <div className="photo-section">
            <div className="row row--between" style={{ alignItems: 'center' }}>
              <div>
                <label className="label" style={{ margin: 0 }}>Progress Photo (On-device Only)</label>
                <p className="text-xs text-muted" style={{ margin: '2px 0 0 0' }}>
                  🔒 Stored strictly in your browser’s IndexedDB. Never uploaded to any server.
                </p>
              </div>
              <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer', margin: 0 }}>
                {photoData ? 'Change Photo' : 'Select Photo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {photoData && (
              <div className="photo-preview-wrap">
                <img src={photoData} alt={`Week ${weekNumber} preview`} className="photo-preview" />
                <button
                  type="button"
                  className="btn btn--secondary btn--sm photo-remove"
                  onClick={handleRemovePhoto}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="row row--gap-3" style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? 'Saving Checkpoint...' : `Save Week ${weekNumber} Checkpoint`}
            </button>
          </div>
        </form>

        {/* AI Weekly Reflection */}
        {aiLoading && (
          <div className="card text-center text-sm text-muted" style={{ marginTop: 'var(--space-4)' }}>
            Generating personalized reflection with Groq AI...
          </div>
        )}

        {aiReflection && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card ai-reflection-card"
            style={{ marginTop: 'var(--space-4)' }}
          >
            <span className="badge badge--accent">Groq AI Reflection</span>
            <h3 className="h3" style={{ marginTop: 'var(--space-2)' }}>Week {weekNumber} Context</h3>
            <p className="ai-reflection-text">{aiReflection}</p>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              style={{ marginTop: 'var(--space-2)' }}
              onClick={() => navigate('/progress')}
            >
              View Updated Trajectory →
            </button>
          </motion.div>
        )}
      </div>

      <style>{`
        .weekly-page {
          width: 100%;
        }
        .weekly-header {
          margin-bottom: var(--space-5);
        }
        .rating-options {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          margin-top: var(--space-1);
        }
        @media (min-width: 640px) {
          .rating-options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
        }
        .rating-option {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s ease;
          background: var(--bg-card);
        }
        .rating-option:hover {
          border-color: var(--accent);
        }
        .rating-option.selected {
          border-color: var(--accent);
          background: var(--accent-faint);
        }
        .rating-num {
          font-weight: 700;
          font-size: var(--text-base);
          color: var(--accent);
          min-width: 44px;
        }
        .rating-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .rating-desc {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .photo-section {
          background: var(--bg-secondary);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          margin-top: var(--space-2);
        }
        .photo-preview-wrap {
          position: relative;
          margin-top: var(--space-3);
          display: inline-block;
        }
        .photo-preview {
          width: 140px;
          height: 140px;
          object-fit: cover;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .photo-remove {
          position: absolute;
          top: 6px;
          right: 6px;
          padding: 2px 6px;
          font-size: 0.7rem;
        }
        .ai-reflection-card {
          border-left: 4px solid var(--accent);
          background: var(--bg-card);
        }
        .ai-reflection-text {
          font-size: var(--text-sm);
          line-height: 1.6;
          color: var(--text-secondary);
          margin: var(--space-2) 0;
        }
      `}</style>
    </div>
  );
}
