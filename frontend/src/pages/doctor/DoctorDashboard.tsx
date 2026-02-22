import { Routes, Route, NavLink } from 'react-router-dom';
import DoctorDashboardHome from './DoctorDashboardHome';
import DoctorChatTab from './DoctorChatTab';
import DoctorCalendarTab from './DoctorCalendarTab';

function DoctorTabs() {
  return (
    <nav className="tabs">
      <NavLink to="/doctor" end className={({ isActive }) => (isActive ? 'active' : '')}>Today</NavLink>
      <NavLink to="/doctor/queries" className={({ isActive }) => (isActive ? 'active' : '')}>Queries</NavLink>
      <NavLink to="/doctor/calendar" className={({ isActive }) => (isActive ? 'active' : '')}>Calendar</NavLink>
    </nav>
  );
}

export default function DoctorDashboard() {
  return (
    <div>
      <h1>Doctor Dashboard</h1>
      <DoctorTabs />
      <Routes>
        <Route index element={<DoctorDashboardHome />} />
        <Route path="queries" element={<DoctorChatTab />} />
        <Route path="calendar" element={<DoctorCalendarTab />} />
      </Routes>
    </div>
  );
}
