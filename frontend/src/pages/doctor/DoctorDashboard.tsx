import { Routes, Route } from 'react-router-dom';

function DoctorDashboardHome() {
  return (
    <div>
      <h1>Doctor Dashboard</h1>
      <p>Manage your appointments, calendar, and patient messages.</p>
      <p><em>Coming soon: full doctor portal with calendar, bookings, and chat.</em></p>
    </div>
  );
}

export default function DoctorDashboard() {
  return (
    <Routes>
      <Route index element={<DoctorDashboardHome />} />
    </Routes>
  );
}
