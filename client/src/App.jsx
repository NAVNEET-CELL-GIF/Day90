import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from './hooks/useAuth';

// Pages
import LandingPage    from './pages/LandingPage';
import LoginPage      from './pages/LoginPage';
import SignupPage     from './pages/SignupPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage  from './pages/DashboardPage';
import ProgressPage   from './pages/ProgressPage';
import VerdictPage    from './pages/VerdictPage';
import WeeklyLogPage  from './pages/WeeklyLogPage';
import PhotosPage     from './pages/PhotosPage';
import TimelinePage   from './pages/TimelinePage';
import SettingsPage   from './pages/SettingsPage';

// Components
import AppShell      from './components/AppShell';
import LoadingScreen from './components/LoadingScreen';

import './styles/design-system.css';
import './App.css';

// Auth guard — redirects unauthenticated users to login
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen message="Gathering your data..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// Redirect logged-in users away from auth pages (allow demo users to sign up / log in)
function RequireGuest({ children }) {
  const { user, loading, isDemo } = useAuth();
  if (loading) return <LoadingScreen message="One moment..." />;
  if (user && !isDemo) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login"  element={<RequireGuest><LoginPage /></RequireGuest>} />
      <Route path="/signup" element={<RequireGuest><SignupPage /></RequireGuest>} />

      {/* Private */}
      <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />

      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/progress"  element={<ProgressPage />} />
        <Route path="/verdict"   element={<VerdictPage />} />
        <Route path="/weekly"    element={<WeeklyLogPage />} />
        <Route path="/photos"    element={<PhotosPage />} />
        <Route path="/timeline"  element={<TimelinePage />} />
        <Route path="/settings"  element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
