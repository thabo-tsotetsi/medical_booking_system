# Medical Booking System

A comprehensive medical appointment booking platform for patients to book slots with doctors. Built with React, Node.js microservices, and MySQL.

## Features

### Patient Portal
- Sign up & login
- Search doctors by specialty, availability
- Book, reschedule, cancel appointments
- Email booking confirmation
- Profile management (personal, contact, medical records)
- Chat with doctors

### Doctor Portal
- Manage calendar & availability
- View and manage bookings
- Chat with patients
- Access patient medical info for appointments

### Platform Admin
- Onboard and manage doctors
- Subscription management
- Support tickets & user queries
- Analytics & reporting

## Tech Stack

- **Frontend**: React 18, React Router, Tailwind CSS
- **Backend**: Node.js, Express (microservices)
- **Database**: MySQL 8
- **Auth**: JWT
- **Email**: Nodemailer

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for MySQL)
- npm or yarn

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Start MySQL

```bash
npm run db:up
```

The schema is auto-loaded when the container starts. Wait ~10 seconds for MySQL to initialize.

### 3. Seed Sample Data (doctors, slots, admin)

```bash
npm run db:seed
```

### 4. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env if needed (defaults work with Docker MySQL)

# Frontend
cp frontend/.env.example frontend/.env
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

### 6. Access

- **Frontend**: http://localhost:5173
- **API**: http://localhost:3000

**Test accounts (after seed):**
- Doctor: doctor1@clinic.com / doctor123
- Admin: admin@medicalbooking.com / admin123
- Patient: Register via Sign Up

## Project Structure

```
medical_booking_system/
├── frontend/          # React SPA
├── backend/           # API Gateway + Microservices
│   ├── gateway/
│   └── services/
├── database/          # Schema & migrations
└── ARCHITECTURE.md    # Detailed architecture
```

## Environment Variables

See `.env.example` in each `frontend/` and `backend/` directory.

## License

Private - Medical Booking System
