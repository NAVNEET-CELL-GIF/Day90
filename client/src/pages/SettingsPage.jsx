import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { routineAPI, accountAPI } from '../api/client';
import { deleteAllPhotos } from '../lib/photoStorage';
import LoadingScreen from '../components/LoadingScreen';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isDemo, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [routine, setRoutine] = useState(null);
  const [productPrice, setProductPrice] = useState('');
  const [packDays, setPackDays] = useState('');
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await routineAPI.current();
        const r = res.data.routine;
        setRoutine(r);
        setProductPrice(r.productPrice != null ? String(r.productPrice) : '');
        setPackDays(r.packDays != null ? String(r.packDays) : '');
      } catch {
        // May not have active routine
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveRoutineSettings = async (e) => {
    e.preventDefault();
    if (!routine) return;
    setSavingRoutine(true);
    setNotice(null);

    try {
      await routineAPI.update(routine._id, {
        productPrice: productPrice ? Number(productPrice) : null,
        packDays: packDays ? Number(packDays) : null,
      });
      setNotice({ type: 'success', text: 'Routine economics updated.' });
    } catch (err) {
      setNotice({ type: 'danger', text: err.response?.data?.error || 'Failed to update routine.' });
    } finally {
      setSavingRoutine(false);
    }
  };

  const handleToggleRoutineStatus = async () => {
    if (!routine) return;
    const newStatus = routine.status === 'active' ? 'paused' : 'active';
    try {
      const res = await routineAPI.update(routine._id, { status: newStatus });
      setRoutine(res.data.routine);
      setNotice({ type: 'success', text: `Routine marked as ${newStatus}.` });
    } catch (err) {
      setNotice({ type: 'danger', text: 'Failed to change routine status.' });
    }
  };

  const handleClearPhotos = async () => {
    if (window.confirm('Delete all on-device photos? This cannot be undone.')) {
      await deleteAllPhotos();
      setNotice({ type: 'success', text: 'All local photos removed from IndexedDB.' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await accountAPI.delete();
      await deleteAllPhotos();
      logout();
      navigate('/', { replace: true });
    } catch {
      setNotice({ type: 'danger', text: 'Failed to delete account. Please try again.' });
      setDeleting(false);
    }
  };

  if (loading) return <LoadingScreen message="Loading settings..." />;

  return (
    <div className="settings-page">
      <div className="page-content">
        <header className="settings-header">
          <span className="badge badge--neutral">Preferences & Account</span>
          <h1 className="h1" style={{ marginTop: 'var(--space-2)' }}>
            Settings
          </h1>
        </header>

        {notice && (
          <div className={`alert alert--${notice.type}`} style={{ marginBottom: 'var(--space-4)' }}>
            {notice.text}
          </div>
        )}

        {/* Profile Card */}
        <section className="section card">
          <h2 className="section-title">Your Profile</h2>
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div className="row row--between" style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-sm text-muted">Name</span>
              <span className="text-sm font-semibold">{user?.name}</span>
            </div>
            <div className="row row--between" style={{ padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-sm text-muted">Email</span>
              <span className="text-sm">{user?.email}</span>
            </div>
            <div className="row row--between" style={{ padding: 'var(--space-2) 0' }}>
              <span className="text-sm text-muted">Account Type</span>
              <span className="text-sm">{isDemo ? <span className="badge badge--demo">Interactive Demo</span> : 'Personal Account'}</span>
            </div>
          </div>
        </section>

        {/* Routine Settings */}
        {routine && (
          <section className="section card" style={{ marginTop: 'var(--space-4)' }}>
            <div className="row row--between" style={{ alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <div>
                <h2 className="section-title">Active Routine</h2>
                <p className="text-xs text-muted" style={{ margin: 0 }}>
                  {routine.category.replace(/_/g, ' ')} • Started {routine.startDate}
                </p>
              </div>
              <button
                type="button"
                className={`btn btn--sm ${routine.status === 'active' ? 'btn--secondary' : 'btn--primary'}`}
                onClick={handleToggleRoutineStatus}
              >
                {routine.status === 'active' ? 'Pause Routine' : 'Resume Routine'}
              </button>
            </div>

            <form onSubmit={handleSaveRoutineSettings} className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <div className="grid grid--2" style={{ gap: 'var(--space-3)' }}>
                <div>
                  <label className="label" htmlFor="settings-price">Pack Price (₹)</label>
                  <input
                    id="settings-price"
                    type="number"
                    className="input"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="settings-days">Pack Days</label>
                  <input
                    id="settings-days"
                    type="number"
                    className="input"
                    value={packDays}
                    onChange={(e) => setPackDays(e.target.value)}
                  />
                </div>
              </div>

              <div className="row row--between" style={{ marginTop: 'var(--space-3)', alignItems: 'center' }}>
                <span className="text-xs text-muted">
                  Used for daily economics (e.g. ₹{productPrice && packDays ? Math.round(Number(productPrice)/Number(packDays)) : 0}/day)
                </span>
                <button type="submit" className="btn btn--primary btn--sm" disabled={savingRoutine}>
                  {savingRoutine ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                className="link-btn text-xs"
                onClick={() => navigate('/onboarding')}
              >
                + Switch or Start a New Routine
              </button>
            </div>
          </section>
        )}

        {/* Data & Privacy */}
        <section className="section card" style={{ marginTop: 'var(--space-4)' }}>
          <h2 className="section-title">Device & Data Management</h2>
          <p className="text-xs text-muted" style={{ margin: '4px 0 var(--space-3) 0' }}>
            Control your offline storage and data footprint.
          </p>

          <div className="row row--between" style={{ alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <span className="text-sm font-semibold">Local Progress Photos</span>
              <p className="text-xs text-muted" style={{ margin: 0 }}>Permanently remove photos stored in IndexedDB.</p>
            </div>
            <button type="button" className="btn btn--secondary btn--sm" onClick={handleClearPhotos}>
              Clear Local Photos
            </button>
          </div>
        </section>

        {/* Account Actions */}
        <section className="section card" style={{ marginTop: 'var(--space-4)', border: '1px solid #fee2e2' }}>
          <h2 className="section-title" style={{ color: '#b91c1c' }}>Session & Danger Zone</h2>

          <div className="row row--between" style={{ alignItems: 'center', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <span className="text-sm font-semibold">Log Out</span>
              <p className="text-xs text-muted" style={{ margin: 0 }}>End your current browser session.</p>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => { logout(); navigate('/'); }}
            >
              Log Out
            </button>
          </div>

          <div style={{ paddingTop: 'var(--space-3)' }}>
            {!confirmDelete ? (
              <button
                type="button"
                className="link-btn text-xs"
                style={{ color: '#b91c1c' }}
                onClick={() => setConfirmDelete(true)}
              >
                Delete account and all associated data permanently
              </button>
            ) : (
              <div className="alert alert--danger">
                <p className="text-xs" style={{ margin: '0 0 var(--space-2) 0', fontWeight: 600 }}>
                  Are you absolutely sure? This will delete your routine, check-ins, and all records irreversibly.
                </p>
                <div className="row row--gap-2">
                  <button
                    type="button"
                    className="btn btn--sm"
                    style={{ background: '#b91c1c', color: '#fff', border: 'none' }}
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .settings-page {
          padding-top: var(--space-4);
          padding-bottom: var(--space-8);
        }
        .settings-header {
          margin-bottom: var(--space-5);
        }
      `}</style>
    </div>
  );
}
