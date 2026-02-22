import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Medical Booking</Link>
      <div className="navbar-links">
        <Link to="/doctors">Find Doctors</Link>
        {user ? (
          <>
            {user.role === 'patient' && (
              <>
                <Link to="/appointments">My Appointments</Link>
                <Link to="/chat">Messages</Link>
                <Link to="/profile">Profile</Link>
              </>
            )}
            {user.role === 'doctor' && <Link to="/doctor">Dashboard</Link>}
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <button type="button" onClick={logout} className="btn btn-outline">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
