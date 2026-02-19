import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../shared/db/connection.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/register - Patient signup
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const patientId = uuidv4();

    await query(
      'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [userId, email.toLowerCase(), passwordHash, 'patient']
    );

    await query(
      'INSERT INTO patients (id, user_id, first_name, last_name, date_of_birth, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [patientId, userId, firstName, lastName, dateOfBirth || null, phone || null]
    );

    const token = jwt.sign({ id: userId, role: 'patient' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, email, role: 'patient', firstName, lastName },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [user] = await query(
      'SELECT id, email, password_hash, role FROM users WHERE email = ? AND is_active = 1',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    let profile = { id: user.id, email: user.email, role: user.role };
    if (user.role === 'patient') {
      const [p] = await query('SELECT first_name, last_name FROM patients WHERE user_id = ?', [user.id]);
      if (p) profile = { ...profile, firstName: p.first_name, lastName: p.last_name };
    } else if (user.role === 'doctor') {
      const [d] = await query('SELECT first_name, last_name, specialty_id FROM doctors WHERE user_id = ?', [user.id]);
      if (d) profile = { ...profile, firstName: d.first_name, lastName: d.last_name, specialtyId: d.specialty_id };
    }

    res.json({ token, user: profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - Get current user (requires auth)
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const [user] = await query(
      'SELECT id, email, role FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    if (!user) return res.status(401).json({ error: 'User not found' });

    let profile = { id: user.id, email: user.email, role: user.role };
    if (user.role === 'patient') {
      const [p] = await query('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      if (p) profile = { ...profile, patientId: p.id, firstName: p.first_name, lastName: p.last_name, dateOfBirth: p.date_of_birth, phone: p.phone, address: { line1: p.address_line1, line2: p.address_line2, city: p.city, state: p.state, postalCode: p.postal_code, country: p.country } };
    } else if (user.role === 'doctor') {
      const [d] = await query('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      if (d) profile = { ...profile, doctorId: d.id, firstName: d.first_name, lastName: d.last_name, specialtyId: d.specialty_id, title: d.title, bio: d.bio };
    }

    res.json(profile);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    next(err);
  }
});

export default router;
