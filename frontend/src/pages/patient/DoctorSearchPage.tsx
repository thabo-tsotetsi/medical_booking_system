import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  bio: string | null;
  specialty_name: string | null;
  consultation_fee: number | null;
  is_verified: number;
}

interface Specialty {
  id: string;
  name: string;
}

export default function DoctorSearchPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [specialty, setSpecialty] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/specialties').then((res) => setSpecialties(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (specialty) params.set('specialty', specialty);
    if (search) params.set('search', search);
    api.get(`/users/doctors?${params}`)
      .then((res) => setDoctors(res.data))
      .finally(() => setLoading(false));
  }, [specialty, search]);

  return (
    <div>
      <h1>Find a Doctor</h1>
      <div className="search-filters" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or specialty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '0.6rem' }}
        />
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={{ padding: '0.6rem', minWidth: 180 }}>
          <option value="">All Specialties</option>
          {specialties.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : doctors.length === 0 ? (
        <p>No doctors found.</p>
      ) : (
        <div className="doctor-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {doctors.map((d) => (
            <div key={d.id} className="card">
              <h3>{d.title || ''} {d.first_name} {d.last_name}</h3>
              <p style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{d.specialty_name || 'General'}</p>
              {d.bio && <p style={{ fontSize: '0.9rem', color: '#666' }}>{d.bio}</p>}
              {d.consultation_fee != null && <p>Fee: ${d.consultation_fee}</p>}
              <Link to={`/book/${d.id}`} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Book Appointment
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
