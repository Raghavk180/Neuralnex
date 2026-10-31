import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import Home from './pages/Home';
import Onboarding from './pages/Onboarding';
import Explore from './pages/Explore';
import Sticky from './pages/Sticky';
import AdminDashboard from './pages/AdminDashboard';
import NoticeEditor from './pages/NoticeEditor';

function StudentRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!user || user.role !== 'student') return <Navigate to="/" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function OnboardingGuard({ children }) {
  const { user } = useAuth();
  if (user && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

function OnboardingRoute({ children }) {
  const { user } = useAuth();
  if (user === undefined) return <div className="spinner-wrap"><div className="spinner" /></div>;
  if (!user || user.role !== 'student') return <Navigate to="/" replace />;
  if (user.onboarded) return <Navigate to="/explore" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/onboarding"
          element={<OnboardingRoute><Onboarding /></OnboardingRoute>}
        />
        <Route
          path="/explore"
          element={
            <StudentRoute>
              <OnboardingGuard>
                <Explore />
              </OnboardingGuard>
            </StudentRoute>
          }
        />
        <Route
          path="/sticky"
          element={
            <StudentRoute>
              <OnboardingGuard>
                <Sticky />
              </OnboardingGuard>
            </StudentRoute>
          }
        />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route
          path="/admin/notices/new"
          element={<AdminRoute><NoticeEditor /></AdminRoute>}
        />
        <Route
          path="/admin/notices/:id/edit"
          element={<AdminRoute><NoticeEditor /></AdminRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
