import { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface TodayAppointment {
  id: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
  patient_first_name: string;
  patient_last_name: string;
  appointment_type_name: string | null;
}

export default function DoctorDashboardHome() {
  const [appointments, setAppointments] = useState<TodayAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/booking/doctor/today').then((res) => setAppointments(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2>Today&apos;s appointments</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>Upcoming appointments for today.</p>
      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <div className="card">
          <p>No appointments scheduled for today.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {appointments.map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{a.patient_first_name} {a.patient_last_name}</strong>
                  <span style={{ marginLeft: '0.5rem', color: '#666' }}>{a.appointment_type_name || 'Appointment'}</span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                    {new Date(a.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(a.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  background: a.status === 'confirmed' ? '#d1fae5' : '#e5e7eb',
                }}>
                  {a.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
