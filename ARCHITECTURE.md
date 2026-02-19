# Medical Booking System - Architecture Document

## Overview

A comprehensive medical appointment booking platform built with React frontend and Node.js microservices backend, connected to MySQL. The system serves three user types: **Patients**, **Doctors**, and **Platform Admins**.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REACT FRONTEND (SPA)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Patient   │  │   Doctor    │  │   Admin      │  │   Shared Components │ │
│  │   Portal    │  │   Portal    │  │   Portal    │  │   (Auth, Layout)     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Express)                                 │
│                    Auth, Rate Limiting, Request Routing                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│  Auth Service │           │  User Service │           │ Booking Service│
│  (JWT, OAuth) │           │  (Patients,   │           │  (Slots,       │
│               │           │   Doctors)    │           │   Appointments)│
└───────────────┘           └───────────────┘           └───────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Notification  │           │  Chat Service │           │  Admin Service │
│  Service      │           │  (Real-time   │           │  (Subscriptions│
│  (Email, SMS) │           │   messaging)  │           │   Support)     │
└───────────────┘           └───────────────┘           └───────────────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MySQL DATABASE                                         │
│  users | patients | doctors | appointments | slots | messages | subscriptions  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Roles & Capabilities

### 1. Patient Portal
| Feature | Description |
|---------|-------------|
| **Authentication** | Sign up, login, password reset |
| **Profile** | Personal details, contact info, medical records (allergies, chronic conditions, medications) |
| **Doctor Search** | Filter by specialty, location, availability, ratings |
| **Booking** | View available slots, book appointments, receive email confirmation |
| **Appointments** | View upcoming/past appointments, reschedule, cancel |
| **Chat** | Message doctors for pre/post appointment queries |
| **Notifications** | Email confirmations, reminders, booking updates |

### 2. Doctor Portal
| Feature | Description |
|---------|-------------|
| **Authentication** | Login (onboarded by admin) |
| **Dashboard** | Overview of today's appointments, upcoming schedule |
| **Calendar** | Manage availability, set working hours, block time |
| **Bookings** | View, confirm, reschedule, cancel patient appointments |
| **Patient Info** | Access patient medical records (for their appointments) |
| **Chat** | Communicate with patients, request additional information |
| **Profile** | Update specialty, bio, consultation types |

### 3. Platform Admin Portal
| Feature | Description |
|---------|-------------|
| **Doctor Management** | Onboard doctors, approve/reject, manage credentials |
| **Subscription Management** | Doctor subscription tiers, billing, renewals |
| **Patient Management** | View patients, resolve issues, deactivate accounts |
| **Support** | Address user queries, ticket system, chat with users |
| **Analytics** | Utilization reports, no-show rates, revenue metrics |
| **System Config** | Appointment types, specialties, platform settings |

---

## Microservices Breakdown

### 1. Auth Service (`/services/auth`)
- User registration (patients)
- Login (patients, doctors, admins)
- JWT token generation & refresh
- Password reset flow
- Role-based access control

### 2. User Service (`/services/users`)
- Patient CRUD, profile, medical records
- Doctor CRUD, profile, specialties
- Admin user management

### 3. Booking Service (`/services/booking`)
- Doctor availability/slots management
- Appointment creation, rescheduling, cancellation
- Slot availability queries
- Appointment types configuration

### 4. Notification Service (`/services/notifications`)
- Email sending (Nodemailer + templates)
- Booking confirmation emails
- Appointment reminders (24h, 1h before)
- SMS (optional, e.g., Twilio)

### 5. Chat Service (`/services/chat`)
- Real-time messaging (Socket.io or similar)
- Doctor-patient conversations
- Admin support chats
- Message history

### 6. Admin Service (`/services/admin`)
- Doctor onboarding workflow
- Subscription management
- Support tickets
- Analytics & reporting

---

## Database Schema (MySQL)

### Core Tables
- **users** - Base auth (email, password_hash, role)
- **patients** - Extended patient data, linked to users
- **doctors** - Extended doctor data, specialty, bio, linked to users
- **medical_records** - Allergies, conditions, medications (patient_id)
- **appointment_types** - Consultation types (e.g., initial, follow-up)
- **doctor_availability** - Recurring availability rules
- **slots** - Generated bookable time slots
- **appointments** - Bookings (patient_id, doctor_id, slot_id, status)
- **messages** - Chat messages
- **conversations** - Chat threads
- **subscriptions** - Doctor subscription plans
- **support_tickets** - Admin support system

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router, Axios, React Query |
| State | React Context / Zustand |
| UI | Tailwind CSS, shadcn/ui or similar |
| API Gateway | Express.js |
| Services | Node.js, Express |
| Database | MySQL 8 |
| ORM | Sequelize or Prisma |
| Auth | JWT, bcrypt |
| Email | Nodemailer (SMTP) |
| Real-time | Socket.io |
| Validation | Zod / Joi |

---

## Additional Features (Industry Best Practices)

1. **Appointment Reminders** - Automated email/SMS 24h and 1h before
2. **Cancellation Policy** - Configurable minimum notice for cancel/reschedule
3. **No-Show Tracking** - Mark no-shows, analytics for doctors
4. **Multi-specialty** - Filter doctors by specialty
5. **Availability Rules** - Buffer between appointments, min/max advance booking
6. **Timezone Support** - Store and display in user's timezone
7. **Audit Logs** - Track sensitive actions for compliance
8. **HIPAA Considerations** - Encrypt PHI, secure messaging, access logs

---

## Project Structure

```
medical_booking_system/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── patient/
│   │   │   ├── doctor/
│   │   │   └── admin/
│   │   ├── services/
│   │   └── hooks/
│   └── package.json
├── backend/
│   ├── gateway/              # API Gateway
│   ├── services/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── booking/
│   │   ├── notifications/
│   │   ├── chat/
│   │   └── admin/
│   └── shared/               # Shared DB, utils
├── database/
│   ├── migrations/
│   └── seeds/
└── docker-compose.yml        # MySQL, Redis (optional)
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- Project setup, database schema, migrations
- Auth service (signup, login)
- User service (patient profile, medical records)
- Basic React app with routing, auth flow

### Phase 2: Booking Core (Weeks 3-4)
- Booking service (slots, appointments)
- Doctor availability management
- Patient: search doctors, book slots
- Email confirmation on booking

### Phase 3: Doctor & Admin (Weeks 5-6)
- Doctor portal (calendar, bookings)
- Admin portal (doctor onboarding, subscriptions)
- Support ticket system

### Phase 4: Chat & Polish (Weeks 7-8)
- Real-time chat (doctor-patient, admin support)
- Reminders, notifications
- Analytics, reporting
- UI/UX refinements
