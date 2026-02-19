import { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface Appointment {
  id: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
  doctor_first_name: string;
  doctor_last_name: string;
  doctor_title: string | null;
  appointment_type_name: string | null;
}

export default function MyAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/booking/appointments').then((res) => setAppointments(res.data)).finally(() => setLoading(false));
  }, []);

  const cancelAppointment = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await api.patch(`/booking/appointments/${id}`, { status: 'cancelled' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
    } catch (err) {
      alert('Failed to cancel');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h1>My Appointments</h1>
      {appointments.length === 0 ? (
        <p>You have no appointments yet. <a href="/doctors">Find a doctor</a> to book.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {appointments.map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3>{a.doctor_title || ''} {a.doctor_first_name} {a.doctor_last_name}</h3>
                  <p>{a.appointment_type_name || 'Appointment'}</p>
                  <p>
                    {new Date(a.start_datetime).toLocaleString()} — {new Date(a.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    background: a.status === 'confirmed' ? '#d1fae5' : a.status === 'cancelled' ? '#fee2e2' : '#e5e7eb',
                  }}>
                    {a.status}
                  </span>
                </div>
                {a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.start_datetime) > new Date() && (
                  <button type="button" className="btn btn-outline" onClick={() => cancelAppointment(a.id)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
