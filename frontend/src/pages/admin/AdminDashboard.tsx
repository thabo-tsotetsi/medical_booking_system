import { Routes, Route } from 'react-router-dom';

function AdminDashboardHome() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Manage doctors, subscriptions, and support tickets.</p>
      <p><em>Coming soon: full admin portal with doctor onboarding, user management, and support.</em></p>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Routes>
      <Route index element={<AdminDashboardHome />} />
    </Routes>
  );
}
