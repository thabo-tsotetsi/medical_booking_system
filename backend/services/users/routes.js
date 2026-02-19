import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/auth/middleware.js';
import { query } from '../../shared/db/connection.js';

const router = Router();

// Public routes (no auth required)
router.get('/doctors', async (req, res, next) => {
  try {
    const { specialty, search } = req.query;
    let sql = `
      SELECT d.id, d.first_name, d.last_name, d.title, d.bio, d.consultation_fee, d.is_verified,
             s.name as specialty_name, s.id as specialty_id
      FROM doctors d
      LEFT JOIN specialties s ON d.specialty_id = s.id
      WHERE d.is_verified = 1
    `;
    const params = [];

    if (specialty) {
      sql += ' AND d.specialty_id = ?';
      params.push(specialty);
    }
    if (search) {
      sql += ' AND (d.first_name LIKE ? OR d.last_name LIKE ? OR s.name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY d.last_name';
    const doctors = await query(sql, params);
    res.json(doctors);
  } catch (err) {
    next(err);
  }
});

router.get('/specialties', async (req, res, next) => {
  try {
    const specialties = await query('SELECT id, name, description FROM specialties ORDER BY name');
    res.json(specialties);
  } catch (err) {
    next(err);
  }
});

// Protected routes
router.use(authenticate);

// GET /api/users/profile - Get current user's full profile
router.get('/profile', async (req, res, next) => {
  try {
    const { id, role } = req.user;

    if (role === 'patient') {
      const [p] = await query('SELECT p.* FROM patients p WHERE p.user_id = ?', [id]);
      if (!p) return res.status(404).json({ error: 'Patient profile not found' });

      const [records] = await query('SELECT * FROM medical_records WHERE patient_id = ?', [p.id]);

      res.json({
        id: p.id,
        userId: p.user_id,
        firstName: p.first_name,
        lastName: p.last_name,
        dateOfBirth: p.date_of_birth,
        phone: p.phone,
        address: {
          line1: p.address_line1,
          line2: p.address_line2,
          city: p.city,
          state: p.state,
          postalCode: p.postal_code,
          country: p.country,
        },
        medicalRecords: records,
        createdAt: p.created_at,
      });
    } else if (role === 'doctor') {
      const [d] = await query(
        'SELECT d.*, s.name as specialty_name FROM doctors d LEFT JOIN specialties s ON d.specialty_id = s.id WHERE d.user_id = ?',
        [id]
      );
      if (!d) return res.status(404).json({ error: 'Doctor profile not found' });
      res.json({
        id: d.id,
        userId: d.user_id,
        firstName: d.first_name,
        lastName: d.last_name,
        title: d.title,
        bio: d.bio,
        specialtyId: d.specialty_id,
        specialtyName: d.specialty_name,
        licenseNumber: d.license_number,
        phone: d.phone,
        consultationFee: d.consultation_fee,
        isVerified: d.is_verified,
      });
    } else {
      res.json({ id, role, message: 'Admin profile' });
    }
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/profile - Update profile (patient or doctor)
router.put('/profile', async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const body = req.body;

    if (role === 'patient') {
      const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [id]);
      if (!p) return res.status(404).json({ error: 'Patient not found' });

      await query(
        `UPDATE patients SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          date_of_birth = COALESCE(?, date_of_birth),
          phone = COALESCE(?, phone),
          address_line1 = COALESCE(?, address_line1),
          address_line2 = COALESCE(?, address_line2),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          postal_code = COALESCE(?, postal_code),
          country = COALESCE(?, country)
        WHERE user_id = ?`,
        [
          body.firstName, body.lastName, body.dateOfBirth, body.phone,
          body.address?.line1, body.address?.line2, body.address?.city,
          body.address?.state, body.address?.postalCode, body.address?.country,
          id
        ]
      );

      res.json({ message: 'Profile updated' });
    } else if (role === 'doctor') {
      const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [id]);
      if (!d) return res.status(404).json({ error: 'Doctor not found' });

      await query(
        `UPDATE doctors SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          title = COALESCE(?, title),
          bio = COALESCE(?, bio),
          phone = COALESCE(?, phone),
          specialty_id = COALESCE(?, specialty_id)
        WHERE user_id = ?`,
        [body.firstName, body.lastName, body.title, body.bio, body.phone, body.specialtyId, id]
      );

      res.json({ message: 'Profile updated' });
    } else {
      res.status(403).json({ error: 'Admins cannot update profile via this endpoint' });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/users/medical-records - Get medical records (patient only)
router.get('/medical-records', requireRole('patient'), async (req, res, next) => {
  try {
    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (!p) return res.status(404).json({ error: 'Patient not found' });

    const records = await query('SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC', [p.id]);
    res.json(records);
  } catch (err) {
    next(err);
  }
});

// POST /api/users/medical-records - Add medical record (patient only)
router.post('/medical-records', requireRole('patient'), async (req, res, next) => {
  try {
    const { recordType, name, description, severity, diagnosedDate } = req.body;
    if (!recordType || !name) return res.status(400).json({ error: 'recordType and name are required' });

    const validTypes = ['allergy', 'chronic_condition', 'medication', 'other'];
    if (!validTypes.includes(recordType)) return res.status(400).json({ error: 'Invalid record type' });

    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (!p) return res.status(404).json({ error: 'Patient not found' });

    const id = (await import('uuid')).v4();
    await query(
      'INSERT INTO medical_records (id, patient_id, record_type, name, description, severity, diagnosed_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, p.id, recordType, name, description || null, severity || null, diagnosedDate || null]
    );

    res.status(201).json({ id, message: 'Medical record added' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/medical-records/:id
router.delete('/medical-records/:id', requireRole('patient'), async (req, res, next) => {
  try {
    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (!p) return res.status(404).json({ error: 'Patient not found' });

    const [result] = await query('DELETE FROM medical_records WHERE id = ? AND patient_id = ?', [req.params.id, p.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });

    res.json({ message: 'Medical record deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
