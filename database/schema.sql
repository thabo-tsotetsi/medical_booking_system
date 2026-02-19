-- Medical Booking System - Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS medical_booking_db;
USE medical_booking_db;

-- ============================================
-- CORE USERS & AUTH
-- ============================================

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('patient', 'doctor', 'admin') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- ============================================
-- PATIENTS
-- ============================================

CREATE TABLE patients (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    phone VARCHAR(20),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

CREATE TABLE medical_records (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    record_type ENUM('allergy', 'chronic_condition', 'medication', 'other') NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50),
    diagnosed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id)
);

-- ============================================
-- DOCTORS & SPECIALTIES
-- ============================================

CREATE TABLE specialties (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctors (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL UNIQUE,
    specialty_id CHAR(36),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(50),
    bio TEXT,
    license_number VARCHAR(100),
    phone VARCHAR(20),
    consultation_fee DECIMAL(10, 2),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (specialty_id) REFERENCES specialties(id),
    INDEX idx_user_id (user_id),
    INDEX idx_specialty (specialty_id)
);

-- ============================================
-- SUBSCRIPTIONS (Platform Admin)
-- ============================================

CREATE TABLE subscription_plans (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL,
    features JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_subscriptions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,
    status ENUM('active', 'cancelled', 'expired', 'pending') DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    UNIQUE KEY unique_doctor_active (doctor_id, status),
    INDEX idx_doctor (doctor_id)
);

-- ============================================
-- APPOINTMENTS & SLOTS
-- ============================================

CREATE TABLE appointment_types (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    duration_minutes INT DEFAULT 30,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctor_availability (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id CHAR(36) NOT NULL,
    day_of_week TINYINT NOT NULL, -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_interval_minutes INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_doctor_day (doctor_id, day_of_week)
);

CREATE TABLE availability_blocks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id CHAR(36) NOT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    INDEX idx_doctor_datetime (doctor_id, start_datetime, end_datetime)
);

CREATE TABLE slots (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    doctor_id CHAR(36) NOT NULL,
    appointment_type_id CHAR(36),
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id),
    UNIQUE KEY unique_slot (doctor_id, start_datetime),
    INDEX idx_doctor_available (doctor_id, start_datetime, is_available)
);

CREATE TABLE appointments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_id CHAR(36) NOT NULL,
    doctor_id CHAR(36) NOT NULL,
    slot_id CHAR(36) NOT NULL,
    appointment_type_id CHAR(36),
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES slots(id),
    FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id),
    INDEX idx_patient (patient_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_slot (slot_id),
    INDEX idx_status (status),
    INDEX idx_datetime (created_at)
);

-- Fix typo in appointments table
ALTER TABLE appointments MODIFY appointment_type_id CHAR(36);

-- ============================================
-- CHAT / MESSAGING
-- ============================================

CREATE TABLE conversations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    type ENUM('doctor_patient', 'admin_support') NOT NULL,
    patient_id CHAR(36),
    doctor_id CHAR(36),
    admin_id CHAR(36),
    appointment_id CHAR(36),
    subject VARCHAR(255),
    status ENUM('open', 'closed') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    INDEX idx_patient (patient_id),
    INDEX idx_doctor (doctor_id),
    INDEX idx_admin (admin_id)
);

CREATE TABLE messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    conversation_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    sender_type ENUM('patient', 'doctor', 'admin') NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_created (created_at)
);

-- ============================================
-- SUPPORT & ADMIN
-- ============================================

CREATE TABLE support_tickets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_admin_id CHAR(36),
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- ============================================
-- NOTIFICATIONS (Audit / Log)
-- ============================================

CREATE TABLE notification_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    type VARCHAR(50) NOT NULL,
    channel ENUM('email', 'sms') NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status ENUM('sent', 'failed', 'pending') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
);

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO appointment_types (id, name, duration_minutes, description) VALUES
(UUID(), 'Initial Consultation', 45, 'First visit with the doctor'),
(UUID(), 'Follow-up', 30, 'Routine follow-up appointment'),
(UUID(), 'Quick Check', 15, 'Brief check-in');

INSERT INTO specialties (id, name, description) VALUES
(UUID(), 'General Practice', 'Primary care and general health'),
(UUID(), 'Cardiology', 'Heart and cardiovascular system'),
(UUID(), 'Dermatology', 'Skin conditions and treatments'),
(UUID(), 'Pediatrics', 'Child healthcare'),
(UUID(), 'Orthopedics', 'Bones, joints, and muscles');
