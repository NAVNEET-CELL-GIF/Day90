import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { routineAPI } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { getPhotosForRoutine, savePhoto } from '../lib/photoStorage';
import LoadingScreen from '../components/LoadingScreen';

export default function PhotosPage() {
  const navigate = useNavigate();
  const { isDemo } = useAuth();

  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [uploadError, setUploadError] = useState('');

  const loadPhotos = async (routineId) => {
    try {
      const stored = await getPhotosForRoutine(routineId);
      // Sort by week
      stored.sort((a, b) => a.weekNumber - b.weekNumber);
      setPhotos(stored);
    } catch {
      // IndexedDB fallback
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const curRes = await routineAPI.current();
        const r = curRes.data.routine;
        setRoutine(r);
        await loadPhotos(r._id);
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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !routine) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await savePhoto(routine._id, selectedWeek, reader.result);
        await routineAPI.weekly(routine._id, {
          weekNumber: selectedWeek,
          rating: 3,
          hasPhoto: true,
        });
        await loadPhotos(routine._id);
      } catch {
        setUploadError('Failed to save photo locally.');
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <LoadingScreen message="Loading local photo gallery..." />;
  if (!routine) return null;

  return (
    <div className="photos-page">
      <div className="page-content">
        {/* Header */}
        <header className="photos-header">
          <div className="row row--between" style={{ alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge--success">🔒 Zero-Cloud Storage</span>
              <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
                Visual Progression
              </h1>
              <p className="text-muted text-sm">
                Strictly on-device. Photos never touch a server or cloud backup.
              </p>
            </div>

            <label className="btn btn--primary btn--sm" style={{ cursor: 'pointer' }}>
              + Add Week Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </header>

        {uploadError && <div className="alert alert--danger text-sm">{uploadError}</div>}

        {/* Privacy Note */}
        <div className="card privacy-banner" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="row row--gap-3" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '1.6rem' }}>🛡️</span>
            <div>
              <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0 }}>
                Client-Side Encryption & Storage
              </h4>
              <p className="text-xs text-muted" style={{ margin: '2px 0 0 0' }}>
                Your photos remain in your local browser database (IndexedDB). No one else—not even Mosaic Wellness—can see them.
              </p>
            </div>
          </div>
        </div>

        {/* Add photo bar */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="row row--between" style={{ alignItems: 'center' }}>
            <div className="row row--gap-2" style={{ alignItems: 'center' }}>
              <span className="text-xs font-semibold">Select Week:</span>
              <select
                className="input input--sm"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                style={{ width: 'auto' }}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                ))}
              </select>
            </div>

            <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
              Choose file for Week {selectedWeek}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: 'var(--space-2)' }}>📷</span>
            <h3 className="h3">No photos captured yet</h3>
            <p className="text-muted text-sm" style={{ maxWidth: '400px', margin: '0 auto var(--space-4) auto' }}>
              Take a consistent weekly photo from the same angle (hairline, vertex, or profile) with identical lighting.
            </p>
            <label className="btn btn--primary btn--sm" style={{ cursor: 'pointer' }}>
              Upload Your First Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : (
          <div className="photos-grid">
            {photos.map((p) => (
              <motion.div
                key={p.key}
                className="photo-card card"
                whileHover={{ y: -3 }}
                onClick={() => setSelectedPhoto(p)}
              >
                <div className="photo-card__img-wrap">
                  <img src={p.dataUrl} alt={`Week ${p.weekNumber}`} className="photo-card__img" />
                  <span className="photo-card__week-badge">Week {p.weekNumber}</span>
                </div>
                <div className="photo-card__meta">
                  <span className="text-xs text-muted">
                    {p.savedAt ? new Date(p.savedAt).toLocaleDateString() : 'Recorded'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Photo Modal */}
        {selectedPhoto && (
          <div className="photo-modal-overlay" onClick={() => setSelectedPhoto(null)}>
            <div className="photo-modal-content card" onClick={(e) => e.stopPropagation()}>
              <div className="row row--between" style={{ marginBottom: 'var(--space-3)' }}>
                <h3 className="h3">Week {selectedPhoto.weekNumber} Photo</h3>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setSelectedPhoto(null)}
                >
                  ✕ Close
                </button>
              </div>
              <img
                src={selectedPhoto.dataUrl}
                alt={`Week ${selectedPhoto.weekNumber}`}
                className="photo-modal-img"
              />
              <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)' }}>
                Saved locally on {new Date(selectedPhoto.savedAt).toLocaleDateString()}.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .photos-page {
          padding-top: var(--space-4);
          padding-bottom: var(--space-8);
        }
        .photos-header {
          margin-bottom: var(--space-5);
        }
        .privacy-banner {
          background: var(--bg-secondary);
          border-left: 3px solid var(--color-success);
        }
        .photos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: var(--space-3);
        }
        .photo-card {
          padding: var(--space-2);
          cursor: pointer;
        }
        .photo-card__img-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-secondary);
        }
        .photo-card__img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-card__week-badge {
          position: absolute;
          bottom: 6px;
          left: 6px;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          font-size: var(--text-xs);
          font-weight: 600;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }
        .photo-card__meta {
          margin-top: var(--space-2);
          padding: 0 var(--space-1);
        }
        .photo-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-4);
          z-index: 1000;
        }
        .photo-modal-content {
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow: auto;
        }
        .photo-modal-img {
          width: 100%;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
}
