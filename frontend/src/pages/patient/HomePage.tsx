import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Book Your Healthcare</h1>
        <p>Find and book appointments with trusted medical practitioners. Simple, fast, and secure.</p>
        <div className="hero-actions">
          <Link to="/doctors" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            Find a Doctor
          </Link>
          {!user && (
            <Link to="/register" className="btn btn-outline" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
              Create Account
            </Link>
          )}
        </div>
      </section>

      <section className="features">
        <div className="card">
          <h3>Search Doctors</h3>
          <p>Browse by specialty, availability, and find the right practitioner for your needs.</p>
        </div>
        <div className="card">
          <h3>Easy Booking</h3>
          <p>Book appointments in minutes. Receive instant confirmation via email.</p>
        </div>
        <div className="card">
          <h3>Manage Your Health</h3>
          <p>Keep your medical records, allergies, and conditions in one place.</p>
        </div>
      </section>
    </div>
  );
}
