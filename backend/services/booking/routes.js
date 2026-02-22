import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/auth/middleware.js';
import { query } from '../../shared/db/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { sendBookingConfirmation, sendCancellationEmail } from '../notifications/email.js';

const router = Router();

// GET /api/booking/slots - Get available slots for a doctor (excludes blocked days)
router.get('/slots', authenticate, async (req, res, next) => {
  try {
    const { doctorId, date, appointmentTypeId } = req.query;
    if (!doctorId || !date) return res.status(400).json({ error: 'doctorId and date are required' });

    let slots = await query(
      `SELECT s.id, s.start_datetime, s.end_datetime, s.appointment_type_id
       FROM slots s
       WHERE s.doctor_id = ? AND DATE(s.start_datetime) = ? AND s.is_available = 1
       ORDER BY s.start_datetime`,
      [doctorId, date]
    );

    const blocks = await query(
      'SELECT start_datetime, end_datetime FROM availability_blocks WHERE doctor_id = ?',
      [doctorId]
    );
    if (blocks.length > 0) {
      slots = slots.filter((s) => {
        const start = new Date(s.start_datetime).getTime();
        return !blocks.some((b) => start >= new Date(b.start_datetime).getTime() && start < new Date(b.end_datetime).getTime());
      });
    }

    res.json(slots);
  } catch (err) {
    next(err);
  }
});

// POST /api/booking - Create appointment (patient only)
router.post('/', authenticate, requireRole('patient'), async (req, res, next) => {
  try {
    const { slotId, appointmentTypeId, notes } = req.body;
    if (!slotId) return res.status(400).json({ error: 'slotId is required' });

    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (!p) return res.status(404).json({ error: 'Patient not found' });

    const [slot] = await query('SELECT * FROM slots WHERE id = ? AND is_available = 1', [slotId]);
    if (!slot) return res.status(400).json({ error: 'Slot not available' });

    const appointmentId = uuidv4();

    await query('UPDATE slots SET is_available = 0 WHERE id = ?', [slotId]);
    await query(
      `INSERT INTO appointments (id, patient_id, doctor_id, slot_id, appointment_type_id, status, notes)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
      [appointmentId, p.id, slot.doctor_id, slotId, appointmentTypeId || null, notes || null]
    );

    // Fetch patient & doctor for email
    const [[patient], [doctor], [appointmentType]] = await Promise.all([
      query('SELECT p.*, u.email FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [p.id]),
      query('SELECT d.first_name, d.last_name, d.title FROM doctors d WHERE d.id = ?', [slot.doctor_id]),
      appointmentTypeId ? query('SELECT name, duration_minutes FROM appointment_types WHERE id = ?', [appointmentTypeId]) : [null]
    ]);

    const doctorName = doctor ? `${doctor.title || ''} ${doctor.first_name} ${doctor.last_name}`.trim() : 'Doctor';
    const typeName = appointmentType?.name || 'Appointment';

    await sendBookingConfirmation({
      to: patient.email,
      patientName: `${patient.first_name} ${patient.last_name}`,
      doctorName,
      appointmentType: typeName,
      date: new Date(slot.start_datetime).toLocaleDateString(),
      time: new Date(slot.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: appointmentType?.duration_minutes || 30,
    }).catch((e) => console.error('Email send failed:', e));

    res.status(201).json({
      id: appointmentId,
      message: 'Appointment booked successfully',
      slot: { start: slot.start_datetime, end: slot.end_datetime },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/appointments - List user's appointments
router.get('/appointments', authenticate, async (req, res, next) => {
  try {
    const { role, id } = req.user;

    if (role === 'patient') {
      const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [id]);
      if (!p) return res.json([]);

      const appointments = await query(
        `SELECT a.id, a.status, a.notes, a.created_at,
                s.start_datetime, s.end_datetime,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.title as doctor_title,
                at.name as appointment_type_name
         FROM appointments a
         JOIN slots s ON a.slot_id = s.id
         JOIN doctors d ON a.doctor_id = d.id
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.patient_id = ?
         ORDER BY s.start_datetime DESC`,
        [p.id]
      );
      res.json(appointments);
    } else if (role === 'doctor') {
      const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [id]);
      if (!d) return res.json([]);

      const appointments = await query(
        `SELECT a.id, a.status, a.notes, a.created_at,
                s.start_datetime, s.end_datetime,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                at.name as appointment_type_name
         FROM appointments a
         JOIN slots s ON a.slot_id = s.id
         JOIN patients p ON a.patient_id = p.id
         LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
         WHERE a.doctor_id = ?
         ORDER BY s.start_datetime DESC`,
        [d.id]
      );
      res.json(appointments);
    } else {
      res.json([]);
    }
  } catch (err) {
    next(err);
  }
});

// PATCH /api/booking/appointments/:id - Update appointment (cancel, reschedule, etc.)
router.patch('/appointments/:id', authenticate, async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body;
    const { id } = req.params;

    const [app] = await query(
      'SELECT a.*, s.id as slot_id FROM appointments a JOIN slots s ON a.slot_id = s.id WHERE a.id = ?',
      [id]
    );
    if (!app) return res.status(404).json({ error: 'Appointment not found' });

    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);

    const isDoctor = d && app.doctor_id === d.id;
    const isPatient = p && app.patient_id === p.id;
    if (!isDoctor && !isPatient) return res.status(403).json({ error: 'Not authorized' });

    if (status === 'cancelled') {
      if (!isDoctor && !isPatient) return res.status(403).json({ error: 'Not authorized' });
      await query('UPDATE appointments SET status = ?, cancellation_reason = ?, cancelled_at = NOW() WHERE id = ?', [status, cancellationReason || null, id]);
      await query('UPDATE slots SET is_available = 1 WHERE id = ?', [app.slot_id]);

      // When doctor cancels, send email to patient with reason
      if (isDoctor && cancellationReason) {
        const [patientRow] = await query('SELECT p.first_name, p.last_name, u.email FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [app.patient_id]);
        const [doctorRow] = await query('SELECT first_name, last_name, title FROM doctors WHERE id = ?', [app.doctor_id]);
        const [slotRow] = await query('SELECT start_datetime FROM slots WHERE id = ?', [app.slot_id]);
        const start = slotRow?.start_datetime;
        if (patientRow?.email && start) {
          const doctorName = doctorRow ? `${doctorRow.title || ''} ${doctorRow.first_name} ${doctorRow.last_name}`.trim() : 'Doctor';
          await sendCancellationEmail({
            to: patientRow.email,
            patientName: `${patientRow.first_name} ${patientRow.last_name}`,
            doctorName,
            appointmentDate: new Date(start).toLocaleDateString(),
            appointmentTime: new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            reason: cancellationReason,
          }).catch((e) => console.error('Cancellation email failed:', e));
        }
      }
      return res.json({ message: 'Appointment cancelled' });
    }

    if (status && ['confirmed', 'completed', 'no_show'].includes(status) && isDoctor) {
      await query('UPDATE appointments SET status = ? WHERE id = ?', [status, id]);
      return res.json({ message: 'Appointment updated' });
    }

    res.status(400).json({ error: 'Invalid update' });
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/doctor/today - Doctor: today's appointments summary
router.get('/doctor/today', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (!d) return res.json([]);

    const today = new Date().toISOString().slice(0, 10);
    const list = await query(
      `SELECT a.id, a.status, s.start_datetime, s.end_datetime,
              p.first_name as patient_first_name, p.last_name as patient_last_name,
              at.name as appointment_type_name
       FROM appointments a
       JOIN slots s ON a.slot_id = s.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE a.doctor_id = ? AND DATE(s.start_datetime) = ? AND a.status IN ('pending', 'confirmed')
       ORDER BY s.start_datetime`,
      [d.id, today]
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/doctor/calendar - Doctor: appointments for calendar view (optional date range)
router.get('/doctor/calendar', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (!d) return res.json([]);

    const { from, to } = req.query;
    const fromDate = from || new Date().toISOString().slice(0, 10);
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const list = await query(
      `SELECT a.id, a.status, a.cancellation_reason, s.start_datetime, s.end_datetime,
              p.first_name as patient_first_name, p.last_name as patient_last_name,
              at.name as appointment_type_name
       FROM appointments a
       JOIN slots s ON a.slot_id = s.id
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE a.doctor_id = ? AND DATE(s.start_datetime) BETWEEN ? AND ?
       ORDER BY s.start_datetime`,
      [d.id, fromDate, toDate]
    );
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/booking/doctor/block - Doctor: block days (availability_blocks)
router.post('/doctor/block', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (!d) return res.status(404).json({ error: 'Doctor not found' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const blockId = uuidv4();
    await query(
      'INSERT INTO availability_blocks (id, doctor_id, start_datetime, end_datetime, reason) VALUES (?, ?, ?, ?, ?)',
      [blockId, d.id, start, end, reason || null]
    );
    res.status(201).json({ id: blockId, message: 'Block added' });
  } catch (err) {
    next(err);
  }
});

// GET /api/booking/doctor/blocks - Doctor: list blocked dates
router.get('/doctor/blocks', authenticate, requireRole('doctor'), async (req, res, next) => {
  try {
    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
    if (!d) return res.json([]);

    const blocks = await query(
      'SELECT id, start_datetime, end_datetime, reason FROM availability_blocks WHERE doctor_id = ? ORDER BY start_datetime DESC',
      [d.id]
    );
    res.json(blocks);
  } catch (err) {
    next(err);
  }
});

export default router;
