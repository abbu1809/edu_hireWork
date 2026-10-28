-- ==============================================================================
-- EduHire Migration: Admin Control HQ + Dynamic Form Builder + CMS Platform
-- ==============================================================================

-- 1. EXTEND TEACHERS AND INSTITUTES WITH CUSTOM_FIELDS JSONB
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. DYNAMIC FORM BUILDER TABLE
CREATE TABLE IF NOT EXISTS public.form_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_type TEXT NOT NULL CHECK (form_type IN ('TEACHER', 'INSTITUTE')),
  section TEXT NOT NULL DEFAULT 'General',
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTI_SELECT', 'RADIO', 'CHECKBOX', 'FILE')),
  options TEXT[] NOT NULL DEFAULT '{}',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_form_field_key UNIQUE (form_type, field_key)
);

-- 3. CMS BLOG & CONTENT PLATFORM TABLE
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'BLOG' CHECK (content_type IN ('TEACHER_UPDATE', 'INSTITUTE_UPDATE', 'BLOG')),
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT NOT NULL DEFAULT 'Career Guidance',
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL DEFAULT 'EduHire Editorial Board',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  views_count INTEGER NOT NULL DEFAULT 0,
  reading_time_minutes INTEGER NOT NULL DEFAULT 4,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  og_image_url TEXT,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RAZORPAY PAYMENT LINKS TABLE
CREATE TABLE IF NOT EXISTS public.payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  plan TEXT NOT NULL DEFAULT 'Standard',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  razorpay_url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  features TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PLATFORM SETTINGS TABLE (KEY-VALUE JSONB)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RPC: Increment Article Views Count Safely
CREATE OR REPLACE FUNCTION public.increment_article_views(article_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS 
BEGIN
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE slug = article_slug;
END;
;

GRANT EXECUTE ON FUNCTION public.increment_article_views(TEXT) TO authenticated, anon;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- 7.1 Form Fields RLS
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Anyone can view visible form fields ON public.form_fields;
CREATE POLICY Anyone can view visible form fields
  ON public.form_fields FOR SELECT
  USING (visible = true OR public.is_admin());

DROP POLICY IF EXISTS Admins can manage form fields ON public.form_fields;
CREATE POLICY Admins can manage form fields
  ON public.form_fields FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.2 Blog Posts RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Anyone can read published blog posts ON public.blog_posts;
CREATE POLICY Anyone can read published blog posts
  ON public.blog_posts FOR SELECT
  USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS Admins can manage blog posts ON public.blog_posts;
CREATE POLICY Admins can manage blog posts
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.3 Payment Links RLS
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Anyone can view active payment links ON public.payment_links;
CREATE POLICY Anyone can view active payment links
  ON public.payment_links FOR SELECT
  USING (active = true OR public.is_admin());

DROP POLICY IF EXISTS Admins can manage payment links ON public.payment_links;
CREATE POLICY Admins can manage payment links
  ON public.payment_links FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7.4 Platform Settings RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS Anyone can view platform settings ON public.platform_settings;
CREATE POLICY Anyone can view platform settings
  ON public.platform_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS Admins can manage platform settings ON public.platform_settings;
CREATE POLICY Admins can manage platform settings
  ON public.platform_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. INITIAL SEED DATA

-- 8.1 Platform Settings Defaults
INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('features', '{feature_teacher_updates: true, feature_institute_updates: true, feature_blog: true, feature_ads: false, maintenance_mode: false}'::jsonb, 'Platform feature flags'),
  ('seo', '{site_name: EduHire Bridge, default_title: EduHire Bridge | India''s Premier Faculty Hiring & Career Portal, default_description: Connecting premier coaching institutes and schools with verified IIT-JEE, NEET, and CBSE educators.}'::jsonb, 'Default SEO configuration')
ON CONFLICT (key) DO NOTHING;

-- 8.2 Initial Payment Links
INSERT INTO public.payment_links (name, description, plan, amount, currency, razorpay_url, active, sort_order, features)
VALUES
  ('Standard Faculty Hiring Plan', 'Access to verified educator profiles and direct interview scheduling.', 'Standard', 4999, 'INR', 'https://rzp.io/l/eduhire-standard', true, 1, ARRAY['10 Verified Faculty Unlocks', 'Dedicated WhatsApp ATS Assistance', 'Standard Email Support']),
  ('Premium Coaching Growth Plan', 'Unlimited faculty candidate unlocks, urgent hiring boost, and priority recruiter listing.', 'Premium', 14999, 'INR', 'https://rzp.io/l/eduhire-premium', true, 2, ARRAY['Unlimited Faculty Unlocks', 'Featured Vacancy Spotlight', 'Dedicated Account Manager', 'Custom Video Demo Scheduling'])
ON CONFLICT DO NOTHING;

-- 8.3 Starter Dynamic Form Fields (Teacher & Institute)
INSERT INTO public.form_fields (form_type, section, field_key, label, description, field_type, options, required, visible, sort_order)
VALUES
  ('TEACHER', 'Academic Preferences', 'preferred_board_curriculum', 'Target Board / Exam Curriculum', 'Select the primary curriculum you specialize in', 'DROPDOWN', ARRAY['CBSE + IIT-JEE Advanced', 'CBSE + NEET-UG', 'ICSE / ISC Board', 'State Board (+2)', 'Foundation (Olympiad)', 'International (IB/Cambridge)'], false, true, 1),
  ('TEACHER', 'Teaching Availability', 'preferred_class_size', 'Preferred Batch Class Size', 'Specify your classroom batch preference', 'DROPDOWN', ARRAY['Top Rankers Batch (20-40 Students)', 'Standard Batch (40-80 Students)', 'Mega Classroom (100+ Students)', '1-on-1 Personalized Mentorship'], false, true, 2),
  ('INSTITUTE', 'Campus Facilities', 'preferred_faculty_experience', 'Preferred Faculty Experience Level', 'Ideal teaching experience for open vacancies', 'DROPDOWN', ARRAY['1-3 Years (Junior Faculty)', '3-5 Years (Middle Batch)', '5-8 Years (Senior Faculty)', '8+ Years (HOD / Top Rank Batches)'], false, true, 1)
ON CONFLICT (form_type, field_key) DO NOTHING;

-- 8.4 Starter Educational & Career Articles across all 3 Streams
INSERT INTO public.blog_posts (
  title,
  slug,
  content_type,
  excerpt,
  content,
  category,
  tags,
  author_name,
  status,
  featured,
  views_count,
  reading_time_minutes,
  published_at
)
VALUES
  (
    'How to Structure a Winning Faculty Resume for Top Coaching Institutes',
    'how-to-structure-a-winning-faculty-resume',
    'TEACHER_UPDATE',
    'Learn how to showcase past student AIR ranks, teaching pedagogy, and subject mastery to stand out during institute screening.',
    '# How to Structure a Winning Faculty Resume for Top Coaching Institutes

When recruiting heads at premier institutes like Allen, Resonance, or FIITJEE screen faculty resumes, they look for specific signals: subject mastery, student rank track record, and structured pedagogy.

---

## 1. Highlight Student AIR Ranks & Results First
Instead of burying results at the bottom, dedicate a prominent section near the top of your resume:
- Top percentile scores in JEE Main / Advanced or NEET-UG achieved by your classroom students.
- Mentorship count: Total students coached in top 1000 / 5000 ranks.

## 2. Emphasize Classroom Pedagogy & Problem-Solving Speed
Institutes value teachers who can dissect complex multi-concept questions into clear intuitive steps. Mention:
- Experience with DPP (Daily Practice Problem) curation and chapter test design.
- Doubt clearing methodologies and student engagement metrics.

## 3. Keep Your Profile Verified on EduHire Bridge
Complete your 9-step EduHire profile and upload KYC credentials to earn the **Verified Educator Badge**, which increases profile views from recruiting directors by 3.5x.',
    'Teacher Resume',
    ARRAY['Resume Tips', 'IIT-JEE', 'NEET', 'Career Growth'],
    'Dr. S. K. Verma (EduHire Editorial)',
    'published',
    true,
    342,
    5,
    NOW()
  ),
  (
    'Top 5 Mistakes Coaching Institutes Make During Faculty Recruitment',
    'top-5-mistakes-coaching-institutes-make-during-faculty-recruitment',
    'INSTITUTE_UPDATE',
    'Discover common recruitment pitfalls in coaching hubs and how structured ATS pipelines prevent star faculty attrition.',
    '# Top 5 Mistakes Coaching Institutes Make During Faculty Recruitment

Hiring top-tier faculties for competitive exam coaching requires speed, transparent evaluations, and competitive packages. Here are the top mistakes institutes make:

---

## 1. Delaying the Demo Class Feedback
Star educators typically have multiple offers from Kota, Hyderabad, and Delhi NCR hubs. Taking more than 48 hours to schedule or review a demo lecture results in lost talent.

## 2. Inadequate Board & Syllabus Alignment
Ensure that your vacancy postings clearly specify the target batch (e.g. Dropper Top Batch vs. Class 11 Foundation) to attract matching domain specialists.

## 3. Using EduHire Bridge ATS Pipeline
Managing candidate applications across WhatsApp chats leads to dropped leads. Use the integrated EduHire ATS Pipeline to shortlist, schedule Google Meet trials, and issue offer letters in one unified dashboard.',
    'Hiring Trends',
    ARRAY['Recruitment', 'Institute Management', 'Retention'],
    'Academic Recruitment Team',
    'published',
    true,
    215,
    4,
    NOW()
  ),
  (
    'The Future of Hybrid Classrooms in Competitive Exam Preparation',
    'future-of-hybrid-classrooms-in-competitive-exam-prep',
    'BLOG',
    'How digital smartboards and recorded lecture suites are transforming offline coaching pedagogy across India.',
    '# The Future of Hybrid Classrooms in Competitive Exam Preparation

As competitive examinations move increasingly digital, top educational institutions are combining the best of offline classroom discipline with high-definition digital smartboard archives.

---

## 1. Studio-Ready Educators in High Demand
Faculties who are adept with digital pen displays, OBS recording, and interactive quiz tools command higher packages and broader batch reach.

## 2. Seamless Doubt Resolution Ecosystems
Coaching hubs that provide recorded video solutions alongside classroom lectures report higher student retention and better rank conversion rates.',
    'Education Technology',
    ARRAY['EdTech', 'Hybrid Teaching', 'Future of Education'],
    'EduHire Insights Desk',
    'published',
    false,
    188,
    3,
    NOW()
  )
ON CONFLICT (slug) DO NOTHING;

-- 9. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
