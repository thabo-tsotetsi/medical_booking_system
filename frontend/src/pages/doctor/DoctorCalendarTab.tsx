import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import Modal from '../../components/Modal';

interface CalendarAppointment {
  id: string;
  status: string;
  start_datetime: string;
  end_datetime: string;
  patient_first_name: string;
  patient_last_name: string;
  appointment_type_name: string | null;
  cancellation_reason: string | null;
}

interface Block {
  id: string;
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
}

export default function DoctorCalendarTab() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState<{ id: string; patientName: string; dateTime: string } | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [savingBlock, setSavingBlock] = useState(false);

  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    api.get(`/booking/doctor/calendar?from=${from}&to=${to}`).then((res) => setAppointments(res.data));
    api.get('/booking/doctor/blocks').then((res) => setBlocks(res.data)).finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await api.patch(`/booking/appointments/${cancelModal.id}`, { status: 'cancelled', cancellationReason: cancelReason.trim() || undefined });
      setAppointments((prev) => prev.map((a) => (a.id === cancelModal.id ? { ...a, status: 'cancelled' } : a)));
      setCancelModal(null);
      setCancelReason('');
    } finally {
      setCancelling(false);
    }
  };

  const handleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStart || !blockEnd) return;
    setSavingBlock(true);
    try {
      await api.post('/booking/doctor/block', { startDate: blockStart, endDate: blockEnd, reason: blockReason || undefined });
      const { data } = await api.get('/booking/doctor/blocks');
      setBlocks(data);
      setBlockModal(false);
      setBlockStart('');
      setBlockEnd('');
      setBlockReason('');
    } finally {
      setSavingBlock(false);
    }
  };

  return (
    <div>
      <h2>Calendar &amp; bookings</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>View bookings, cancel with reason (patient gets email), and block days.</p>

      <div style={{ marginBottom: '1.5rem' }}>
        <button type="button" className="btn btn-outline" onClick={() => setBlockModal(true)}>Block days</button>
      </div>

      {blockModal && (
        <Modal isOpen={blockModal} onClose={() => setBlockModal(false)} title="Block days">
          <form onSubmit={handleBlock}>
            <div className="form-group">
              <label>Start date</label>
              <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>End date</label>
              <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Reason (optional)</label>
              <input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="e.g. Leave, Conference" />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setBlockModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={savingBlock}>{savingBlock ? 'Saving...' : 'Block'}</button>
            </div>
          </form>
        </Modal>
      )}

      {cancelModal && (
        <Modal isOpen={!!cancelModal} onClose={() => { setCancelModal(null); setCancelReason(''); }} title="Cancel appointment">
          <p>Cancel appointment with <strong>{cancelModal.patientName}</strong> on <strong>{cancelModal.dateTime}</strong>?</p>
          <p>The patient will receive an email with your reason.</p>
          <div className="form-group">
            <label>Reason for cancellation *</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3} placeholder="e.g. Unavoidable emergency" required />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => { setCancelModal(null); setCancelReason(''); }}>Keep appointment</button>
            <button type="button" className="btn btn-primary" onClick={handleCancel} disabled={cancelling || !cancelReason.trim()} style={{ background: '#b91c1c' }}>{cancelling ? 'Cancelling...' : 'Cancel appointment'}</button>
          </div>
        </Modal>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Blocked dates</h3>
      {blocks.length === 0 ? (
        <p style={{ color: '#666' }}>No blocked dates.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {blocks.map((b) => (
            <li key={b.id} className="card" style={{ marginBottom: '0.5rem' }}>
              {new Date(b.start_datetime).toLocaleDateString()} – {new Date(b.end_datetime).toLocaleDateString()}
              {b.reason && (
                <span style={{ color: '#666', marginLeft: '0.5rem' }}>
                  {'— '} 
                  {b.reason}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ marginTop: '1.5rem' }}>Bookings</h3>
      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p style={{ color: '#666' }}>No bookings in this range.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {appointments.map((a) => (
            <div key={a.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{a.patient_first_name} {a.patient_last_name}</strong>
                  <span style={{ marginLeft: '0.5rem', color: '#666' }}>{a.appointment_type_name || 'Appointment'}</span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                    {new Date(a.start_datetime).toLocaleString()} – {new Date(a.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {a.cancellation_reason && <p style={{ marginTop: 4, fontSize: '0.85rem', color: '#666' }}>Cancelled: {a.cancellation_reason}</p>}
                </div>
                {a.status !== 'cancelled' && a.status !== 'completed' && new Date(a.start_datetime) > new Date() && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ borderColor: '#b91c1c', color: '#b91c1c' }}
                    onClick={() => setCancelModal({
                      id: a.id,
                      patientName: `${a.patient_first_name} ${a.patient_last_name}`,
                      dateTime: new Date(a.start_datetime).toLocaleString(),
                    })}
                  >
                    Cancel booking
                  </button>
                )}
                {a.status === 'cancelled' && <span style={{ padding: '0.25rem 0.5rem', borderRadius: 6, background: '#fee2e2', fontSize: '0.85rem' }}>Cancelled</span>}
                {a.status === 'completed' && <span style={{ padding: '0.25rem 0.5rem', borderRadius: 6, background: '#e5e7eb', fontSize: '0.85rem' }}>Completed</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
