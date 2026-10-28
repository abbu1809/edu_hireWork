-- ==============================================================================
-- EduHire Bridge - Complete Supabase PostgreSQL Schema & RLS Policies
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'INSTITUTE', 'TEACHER', 'STUDENT')),
  phone TEXT,
  city TEXT,
  state TEXT,
  
  -- Teacher-specific fields
  subject TEXT,
  qualification TEXT,
  experience_years INTEGER DEFAULT 0,
  expected_ctc TEXT,
  teaching_mode TEXT,
  bio TEXT,
  resume_url TEXT,
  resume_name TEXT,
  demo_video_url TEXT,
  demo_topic TEXT,
  verified BOOLEAN DEFAULT FALSE,
  premium_badge BOOLEAN DEFAULT FALSE,
  kyc_status TEXT DEFAULT 'Pending' CHECK (kyc_status IN ('Pending', 'Approved', 'Rejected')),
  rating NUMERIC(2,1) DEFAULT 4.8,
  ratings_count INTEGER DEFAULT 0,

  -- Institute-specific fields
  boards TEXT[],
  student_count TEXT,
  unlocked_teachers TEXT[] DEFAULT '{}',
  plan TEXT DEFAULT 'Standard',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VACANCIES TABLE
CREATE TABLE IF NOT EXISTS public.vacancies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  institute_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  city TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  salary_range TEXT NOT NULL,
  type TEXT DEFAULT 'Full-Time',
  min_experience TEXT DEFAULT '3+ Years',
  description TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Draft', 'Filled')),
  urgency TEXT DEFAULT 'Normal' CHECK (urgency IN ('Normal', 'High', 'Urgent')),
  applicants_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vacancy_id UUID REFERENCES public.vacancies(id) ON DELETE CASCADE,
  vacancy_title TEXT NOT NULL,
  institute_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  institute_name TEXT NOT NULL,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  status TEXT DEFAULT 'Applied' CHECK (status IN ('Applied', 'Screened', 'Demo Scheduled', 'Interview Scheduled', 'Selected', 'Rejected')),
  demo_date TEXT,
  demo_topic TEXT,
  mediator_notes TEXT,
  resume_url TEXT,
  applied_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vacancy_id, teacher_id) -- Prevents duplicate applications
);

-- 4. TRANSACTIONS TABLE (Razorpay)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  payer_name TEXT,
  purpose TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'Captured' CHECK (status IN ('Created', 'Captured', 'Failed', 'Refunded')),
  method TEXT DEFAULT 'Razorpay UPI',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. COMMUNICATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'Email', 'In-App')),
  recipient TEXT NOT NULL,
  event TEXT DEFAULT 'System Alert',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'Delivered' CHECK (status IN ('Queued', 'Delivered', 'Failed')),
  wa_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin());

-- 2. Vacancies Policies
CREATE POLICY "Active vacancies are viewable by everyone"
  ON public.vacancies FOR SELECT
  TO authenticated, anon
  USING (status = 'Active' OR public.is_admin() OR auth.uid() = institute_id);

CREATE POLICY "Institutes can insert their own vacancies"
  ON public.vacancies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

CREATE POLICY "Institutes can update their own vacancies"
  ON public.vacancies FOR UPDATE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin())
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

CREATE POLICY "Institutes can delete their own vacancies"
  ON public.vacancies FOR DELETE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin());

-- 3. Applications Policies
CREATE POLICY "Teachers can view their own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = institute_id OR public.is_admin());

CREATE POLICY "Teachers can apply for vacancies"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id OR public.is_admin());

CREATE POLICY "Institutes & Admins can update application status"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = institute_id OR public.is_admin())
  WITH CHECK (auth.uid() = institute_id OR public.is_admin());

-- 4. Transactions Policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id OR public.is_admin());

CREATE POLICY "System can record transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id OR public.is_admin());

-- 5. Communication Logs Policies
CREATE POLICY "Admins can view and create all logs"
  ON public.communication_logs FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- AUTH TRIGGER: Auto-create Profile on Signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(UPPER(NEW.raw_user_meta_data->>'role'), 'TEACHER'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
