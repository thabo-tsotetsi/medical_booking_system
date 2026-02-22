import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';

// Patient pages
import HomePage from './pages/patient/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorSearchPage from './pages/patient/DoctorSearchPage';
import BookAppointmentPage from './pages/patient/BookAppointmentPage';
import MyAppointmentsPage from './pages/patient/MyAppointmentsPage';
import ProfilePage from './pages/patient/ProfilePage';
import ChatPage from './pages/patient/ChatPage';

// Doctor pages (placeholder)
import DoctorDashboard from './pages/doctor/DoctorDashboard';

// Admin pages (placeholder)
import AdminDashboard from './pages/admin/AdminDashboard';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

function HomeOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (user?.role === 'doctor') return <Navigate to="/doctor" replace />;
  return <HomePage />;
}

export default function App() {
  return (
    <Routes>
        <Route path="/" element={<MainLayout />}>
        <Route index element={<HomeOrRedirect />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="doctors" element={<DoctorSearchPage />} />
        <Route
          path="book/:doctorId"
          element={
            <ProtectedRoute roles={['patient']}>
              <BookAppointmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="appointments"
          element={
            <ProtectedRoute roles={['patient']}>
              <MyAppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="chat"
          element={
            <ProtectedRoute roles={['patient']}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="doctor/*"
          element={
            <ProtectedRoute roles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/*"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
