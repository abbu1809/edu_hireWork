-- Migration: 20260822_production_mvp.sql
-- Complete Production Supabase PostgreSQL Schema & Security Hardening
-- Free Plan Compatible

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('TEACHER', 'INSTITUTE', 'ADMIN')),
  phone TEXT,
  city TEXT,
  state TEXT,
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Teachers
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  profile_photo_url TEXT,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  subjects TEXT[] NOT NULL DEFAULT '{}',
  classes_taught TEXT[] NOT NULL DEFAULT '{}',
  preferred_location TEXT,
  resume_url TEXT,
  resume_name TEXT,
  profile_status TEXT NOT NULL DEFAULT 'Active' CHECK (profile_status IN ('Active', 'Inactive', 'Suspended')),
  kyc_status TEXT NOT NULL DEFAULT 'Pending' CHECK (kyc_status IN ('Pending', 'Approved', 'Rejected')),
  bio TEXT,
  expected_ctc TEXT,
  teaching_mode TEXT DEFAULT 'Offline Classroom',
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  premium_badge BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) DEFAULT 5.0,
  ratings_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Institutes
CREATE TABLE IF NOT EXISTS public.institutes (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  institute_type TEXT,
  boards TEXT[] NOT NULL DEFAULT '{}',
  student_count TEXT,
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected')),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  unlocked_teachers UUID[] NOT NULL DEFAULT '{}',
  plan TEXT NOT NULL DEFAULT 'Standard',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vacancies
CREATE TABLE IF NOT EXISTS public.vacancies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  city TEXT NOT NULL,
  location TEXT,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  classes TEXT[] NOT NULL DEFAULT '{}',
  board TEXT DEFAULT 'CBSE / IIT-JEE / NEET',
  salary_range TEXT NOT NULL,
  min_experience TEXT DEFAULT '3+ Years',
  type TEXT DEFAULT 'Full-Time',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Draft', 'Filled')),
  urgency TEXT NOT NULL DEFAULT 'Normal' CHECK (urgency IN ('Normal', 'High', 'Urgent')),
  applicants_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Applications
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vacancy_id UUID NOT NULL REFERENCES public.vacancies(id) ON DELETE CASCADE,
  vacancy_title TEXT NOT NULL,
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'WITHDRAWN')),
  interview_date TEXT,
  interview_time TEXT,
  interview_link TEXT,
  interview_notes TEXT,
  resume_url TEXT,
  applied_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_application_vacancy_teacher UNIQUE (vacancy_id, teacher_id)
);

-- 6. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('RESUME', 'CERTIFICATE', 'KYC', 'PHOTO')),
  file_size TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'APPLICATION', 'INTERVIEW', 'KYC', 'PAYMENT')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  institute_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  topic TEXT NOT NULL,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payer_name TEXT,
  purpose TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  method TEXT DEFAULT 'Razorpay',
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Admin Actions
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
