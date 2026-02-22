import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/auth/middleware.js';
import { query } from '../../shared/db/connection.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate);

// GET /api/chat/conversations - List my conversations (patient or doctor)
router.get('/conversations', async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let list = [];

    if (role === 'patient') {
      const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [id]);
      if (!p) return res.json([]);
      list = await query(
        `SELECT c.id, c.subject, c.status, c.updated_at, c.doctor_id,
                d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.title as doctor_title,
                s.name as specialty_name,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
         FROM conversations c
         JOIN doctors d ON c.doctor_id = d.id
         LEFT JOIN specialties s ON d.specialty_id = s.id
         WHERE c.patient_id = ? AND c.type = 'doctor_patient'
         ORDER BY c.updated_at DESC`,
        [p.id]
      );
    } else if (role === 'doctor') {
      const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [id]);
      if (!d) return res.json([]);
      list = await query(
        `SELECT c.id, c.subject, c.status, c.updated_at,
                p.first_name as patient_first_name, p.last_name as patient_last_name,
                (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at
         FROM conversations c
         JOIN patients p ON c.patient_id = p.id
         WHERE c.doctor_id = ? AND c.type = 'doctor_patient'
         ORDER BY c.updated_at DESC`,
        [d.id]
      );
    }

    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations - Start or get conversation (patient with doctor)
router.post('/conversations', requireRole('patient'), async (req, res, next) => {
  try {
    const { doctorId, subject } = req.body;
    if (!doctorId) return res.status(400).json({ error: 'doctorId is required' });

    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (!p) return res.status(404).json({ error: 'Patient not found' });

    let [existing] = await query(
      'SELECT id FROM conversations WHERE patient_id = ? AND doctor_id = ? AND type = ?',
      [p.id, doctorId, 'doctor_patient']
    );

    if (existing) {
      return res.json({ id: existing.id, existing: true });
    }

    const convId = uuidv4();
    await query(
      'INSERT INTO conversations (id, type, patient_id, doctor_id, subject) VALUES (?, ?, ?, ?, ?)',
      [convId, 'doctor_patient', p.id, doctorId, subject || 'General inquiry']
    );
    res.status(201).json({ id: convId, existing: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const conv = await query(
      'SELECT c.*, c.patient_id, c.doctor_id FROM conversations c WHERE c.id = ?',
      [id]
    );
    if (!conv.length) return res.status(404).json({ error: 'Conversation not found' });

    const c = conv[0];
    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);

    const canAccess =
      (req.user.role === 'patient' && c.patient_id === p?.id) ||
      (req.user.role === 'doctor' && c.doctor_id === d?.id) ||
      req.user.role === 'admin';
    if (!canAccess) return res.status(403).json({ error: 'Forbidden' });

    const messages = await query(
      `SELECT m.id, m.content, m.sender_type, m.created_at, m.is_read
       FROM messages m WHERE m.conversation_id = ? ORDER BY m.created_at ASC`,
      [id]
    );
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/conversations/:id/messages
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content is required' });

    const [conv] = await query('SELECT * FROM conversations WHERE id = ?', [id]);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    const [p] = await query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    const [d] = await query('SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);

    let senderType = null;
    if (req.user.role === 'patient' && p && conv.patient_id === p.id) senderType = 'patient';
    if (req.user.role === 'doctor' && d && conv.doctor_id === d.id) senderType = 'doctor';
    if (req.user.role === 'admin') senderType = 'admin';
    if (!senderType) return res.status(403).json({ error: 'Forbidden' });

    const msgId = uuidv4();
    await query(
      'INSERT INTO messages (id, conversation_id, sender_id, sender_type, content) VALUES (?, ?, ?, ?, ?)',
      [msgId, id, req.user.id, senderType, content.trim()]
    );
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = ?', [id]);

    const [msg] = await query('SELECT id, content, sender_type, created_at FROM messages WHERE id = ?', [msgId]);
    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
});

export default router;
