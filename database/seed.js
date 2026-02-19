/**
 * Seed script - run with: node database/seed.js
 * Creates sample doctors, slots, and optionally an admin user.
 */
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'app_password',
  database: process.env.DB_NAME || 'medical_booking_db',
};

async function seed() {
  const conn = await mysql.createConnection(config);

  try {
    // Get specialty IDs
    const [specialties] = await conn.execute('SELECT id, name FROM specialties LIMIT 5');
    const gpId = specialties.find((s) => s.name === 'General Practice')?.id || specialties[0]?.id;
    const cardioId = specialties.find((s) => s.name === 'Cardiology')?.id || specialties[1]?.id;

    // Get appointment type
    const [aptRows] = await conn.execute('SELECT id FROM appointment_types LIMIT 1');
    const aptType = aptRows[0];

    // Create or get doctor 1
    let [[existing1]] = await conn.execute('SELECT d.id, d.user_id FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = ?', ['doctor1@clinic.com']);
    let doctor1Id, doctor2Id;
    if (existing1) {
      doctor1Id = existing1.id;
    } else {
      const doctor1UserId = uuidv4();
      doctor1Id = uuidv4();
      const doctor1Pass = await bcrypt.hash('doctor123', 12);
      await conn.execute('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [doctor1UserId, 'doctor1@clinic.com', doctor1Pass, 'doctor']);
      await conn.execute(
        `INSERT INTO doctors (id, user_id, specialty_id, first_name, last_name, title, bio, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [doctor1Id, doctor1UserId, gpId, 'Sarah', 'Johnson', 'Dr.', 'General practitioner with 10+ years experience.', 1]
      );
    }

    // Create or get doctor 2
    [[existing1]] = await conn.execute('SELECT d.id FROM doctors d JOIN users u ON d.user_id = u.id WHERE u.email = ?', ['doctor2@clinic.com']);
    if (existing1) {
      doctor2Id = existing1.id;
    } else {
      const doctor2UserId = uuidv4();
      doctor2Id = uuidv4();
      const doctor2Pass = await bcrypt.hash('doctor123', 12);
      await conn.execute('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [doctor2UserId, 'doctor2@clinic.com', doctor2Pass, 'doctor']);
      await conn.execute(
        `INSERT INTO doctors (id, user_id, specialty_id, first_name, last_name, title, bio, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [doctor2Id, doctor2UserId, cardioId, 'Michael', 'Chen', 'Dr.', 'Cardiologist specializing in preventive care.', 1]
      );
    }

    // Generate slots for next 7 days
    const slotInterval = 30; // minutes
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(9, 0, 0, 0);

      for (const doctorId of [doctor1Id, doctor2Id]) {
        for (let hour = 9; hour < 17; hour++) {
          for (let min = 0; min < 60; min += slotInterval) {
            const start = new Date(date);
            start.setHours(hour, min, 0, 0);
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + slotInterval);
            const slotId = uuidv4();

            await conn.execute(
              `INSERT IGNORE INTO slots (id, doctor_id, appointment_type_id, start_datetime, end_datetime, is_available)
               VALUES (?, ?, ?, ?, ?, 1)`,
              [slotId, doctorId, aptType?.id || null, start, end]
            );
          }
        }
      }
    }

    // Create admin user (if not exists)
    const [[adminExists]] = await conn.execute('SELECT id FROM users WHERE email = ?', ['admin@medicalbooking.com']);
    if (!adminExists) {
      const adminId = uuidv4();
      const adminPass = await bcrypt.hash('admin123', 12);
      await conn.execute('INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)', [adminId, 'admin@medicalbooking.com', adminPass, 'admin']);
    }

    console.log('Seed completed successfully!');
    console.log('Test accounts:');
    console.log('  Patient: Register via /api/auth/register');
    console.log('  Doctor 1: doctor1@clinic.com / doctor123');
    console.log('  Doctor 2: doctor2@clinic.com / doctor123');
    console.log('  Admin: admin@medicalbooking.com / admin123');
  } finally {
    await conn.end();
  }
}

seed().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
