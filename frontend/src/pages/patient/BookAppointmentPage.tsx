import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface Slot {
  id: string;
  start_datetime: string;
  end_datetime: string;
}

export default function BookAppointmentPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<{ first_name: string; last_name: string; specialty_name: string } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const minDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get('/users/doctors').then((res) => {
      const d = res.data.find((x: { id: string }) => x.id === doctorId);
      setDoctor(d || null);
    });
  }, [doctorId]);

  useEffect(() => {
    if (!date || !doctorId) return;
    api.get(`/booking/slots?doctorId=${doctorId}&date=${date}`).then((res) => setSlots(res.data));
  }, [date, doctorId]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/booking', { slotId: selectedSlot, notes });
      navigate('/appointments');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  if (!doctor) return <p>Loading...</p>;

  return (
    <div>
      <h1>Book with {doctor.first_name} {doctor.last_name}</h1>
      <p style={{ color: 'var(--color-primary)' }}>{doctor.specialty_name}</p>

      <div className="card" style={{ maxWidth: 500, marginTop: '1.5rem' }}>
        <div className="form-group">
          <label>Select Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} min={minDate} />
        </div>

        {date && (
          <div className="form-group">
            <label>Available Time Slots</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {slots.length === 0 ? (
                <p>No slots available for this date.</p>
              ) : (
                slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`btn ${selectedSlot === s.id ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setSelectedSlot(s.id)}
                  >
                    {new Date(s.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleBook}
          disabled={!selectedSlot || loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}
