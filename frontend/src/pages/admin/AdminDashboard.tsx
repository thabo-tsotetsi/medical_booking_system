import { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface DoctorRow {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string;
  specialty_name: string | null;
  is_verified: number;
}

interface PatientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'doctors' | 'patients'>('doctors');

  useEffect(() => {
    Promise.all([
      api.get('/users/admin/doctors').then((r) => setDoctors(r.data)),
      api.get('/users/admin/patients').then((r) => setPatients(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Manage doctors, patients, subscriptions, and support.</p>

      <nav className="tabs">
        <button type="button" className={activeTab === 'doctors' ? 'active' : ''} onClick={() => setActiveTab('doctors')}>Doctors</button>
        <button type="button" className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>Patients</button>
      </nav>

      {loading ? (
        <p>Loading...</p>
      ) : activeTab === 'doctors' ? (
        <div className="card">
          <h2>Doctors</h2>
          {doctors.length === 0 ? (
            <p>No doctors yet. Onboard doctors via your process (e.g. create user with role doctor and a doctors row).</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Specialty</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{d.title || ''} {d.first_name} {d.last_name}</td>
                      <td style={{ padding: '0.75rem' }}>{d.email}</td>
                      <td style={{ padding: '0.75rem' }}>{d.specialty_name || '—'}</td>
                      <td style={{ padding: '0.75rem' }}>{d.is_verified ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2>Patients</h2>
          {patients.length === 0 ? (
            <p>No patients yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Phone</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{p.first_name} {p.last_name}</td>
                      <td style={{ padding: '0.75rem' }}>{p.email}</td>
                      <td style={{ padding: '0.75rem' }}>{p.phone || '—'}</td>
                      <td style={{ padding: '0.75rem' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
        Subscription management and support tickets can be added as separate tabs or pages.
      </p>
    </div>
  );
}
