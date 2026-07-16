-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: admin_users
-- ============================================================
CREATE TABLE admin_users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'admin'
                  CHECK (role IN ('super_admin', 'admin', 'viewer')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: school_settings
-- Maharashtra HSC Board — Gurukul Vidyapeeth specific fields
-- ============================================================
CREATE TABLE school_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name         TEXT NOT NULL,          -- 'GURUKUL VIDYAPEETH'
  school_full_name    TEXT,                   -- 'Gurukul Vidyapeeth English High School & Jr. College'
  trust_name          TEXT,                   -- 'Bhagwat Prasad Gurukul Educational Trust''s'
  tagline             TEXT,                   -- 'विद्या ददाति विनयम्'
  school_code         TEXT UNIQUE,
  affiliation_number  TEXT,                   -- '28993-97/Dt.15/11/2016'
  index_number        TEXT,                   -- 'J-15.14.086'
  board_name          TEXT,                   -- 'Regd. by the Govt. of Maharashtra'
  college_type        TEXT,                   -- 'Higher Secondary / Self Finance / 16-17 / 2016'
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,
  logo_url            TEXT,
  website             TEXT,
  college_reopens_on  DATE,                   -- Shown on marksheet footer
  current_session     TEXT,                   -- e.g. '2024-2025'
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: school_signatures
-- ============================================================
CREATE TABLE school_signatures (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_type  TEXT NOT NULL
                  CHECK (signature_type IN (
                    'principal', 'exam_incharge',
                    'class_teacher', 'school_seal'
                  )),
  label           TEXT NOT NULL,
  image_url       TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (signature_type)
);

-- ============================================================
-- TABLE: subjects
-- Maharashtra HSC subject with graded-only support (Env Studies, PE)
-- ============================================================
CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name    TEXT NOT NULL,
  subject_code    TEXT NOT NULL UNIQUE,
  max_i_term      INTEGER NOT NULL DEFAULT 50,   -- Term A max marks
  max_ii_term     INTEGER NOT NULL DEFAULT 100,  -- Term B max marks
  max_ut1         INTEGER NOT NULL DEFAULT 25,   -- Unit Test 1 max
  max_ut2         INTEGER NOT NULL DEFAULT 25,   -- Unit Test 2 max
  passing_marks   INTEGER NOT NULL DEFAULT 35,
  is_graded_only  BOOLEAN NOT NULL DEFAULT false, -- true for Env Studies, PE
  display_order   INTEGER NOT NULL DEFAULT 0,
  class_group     TEXT,                           -- e.g. '11', '12'
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: students
-- 11th standard Maharashtra HSC students
-- ============================================================
CREATE TABLE students (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_number TEXT NOT NULL UNIQUE,
  unique_id        TEXT,                     -- Unique ID shown on marksheet header
  roll_number      TEXT,                     -- Roll No
  gr_number        TEXT,                     -- GR No (used for student login)
  student_name     TEXT NOT NULL,
  dob              DATE NOT NULL,
  gender           TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  father_name      TEXT,
  mother_name      TEXT,
  class            TEXT NOT NULL,            -- 'XI'
  division         TEXT,                     -- 'A', 'B', 'SCIENCE - A', etc.
  subject_group    TEXT,                     -- 'PCM', 'PCB', 'PCMB', 'PCM_CS', 'PCM_IT', 'PCB_IT', 'PCMB_IT'
  academic_session TEXT NOT NULL,            -- e.g. '2024-2025'
  photo_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'transferred')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (admission_number, academic_session)
);

CREATE INDEX idx_students_admission ON students (admission_number);
CREATE INDEX idx_students_gr_number ON students (gr_number);
CREATE INDEX idx_students_dob ON students (dob);
CREATE INDEX idx_students_session ON students (academic_session);
CREATE INDEX idx_students_class ON students (class, division);

-- ============================================================
-- TABLE: student_results
-- Maharashtra HSC format: I Term (A) | II Term (B) | UT1 | UT2 | Total C | Grand Total | AVG
-- ============================================================
CREATE TABLE student_results (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id        UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,

  -- Maharashtra HSC Marks columns
  i_term_marks      NUMERIC(5,2),               -- Term A, out of 50
  ii_term_marks     NUMERIC(5,2),               -- Term B, out of 100
  unit_test_1       NUMERIC(5,2),               -- UT1, out of 25
  unit_test_2       NUMERIC(5,2),               -- UT2, out of 25

  -- Computed columns (auto-calculated by DB)
  total_c           NUMERIC(5,2) GENERATED ALWAYS AS (
                      COALESCE(unit_test_1, 0) + COALESCE(unit_test_2, 0)
                    ) STORED,                    -- Total C = UT1 + UT2, out of 50

  grand_total       NUMERIC(6,2) GENERATED ALWAYS AS (
                      COALESCE(i_term_marks, 0) + COALESCE(ii_term_marks, 0) +
                      COALESCE(unit_test_1, 0) + COALESCE(unit_test_2, 0)
                    ) STORED,                    -- Grand Total = A + B + C

  avg_marks         NUMERIC(5,2) GENERATED ALWAYS AS (
                      (COALESCE(i_term_marks, 0) + COALESCE(ii_term_marks, 0) +
                       COALESCE(unit_test_1, 0) + COALESCE(unit_test_2, 0)) / 2.0
                    ) STORED,                    -- AVG = (A+B+C)/2

  -- Manual fields
  condonation_marks NUMERIC(5,2),               -- Optional, admin fills manually
  grade             TEXT,                        -- Subject grade (A, B, C, O, F)
  is_graded_only    BOOLEAN NOT NULL DEFAULT false, -- If true, only grade shown (no numeric marks)
  is_absent         BOOLEAN NOT NULL DEFAULT false,
  remarks           TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, subject_id)
);

CREATE INDEX idx_results_student ON student_results (student_id);
CREATE INDEX idx_results_subject ON student_results (subject_id);

-- ============================================================
-- TABLE: result_summary
-- ============================================================
CREATE TABLE result_summary (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id        TEXT NOT NULL UNIQUE,       -- Human-readable: GVP-2025-XXXXXX
  student_id       UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  total_marks      NUMERIC(6,2) NOT NULL DEFAULT 0,   -- Sum of avg_marks across subjects
  max_marks        NUMERIC(6,2) NOT NULL DEFAULT 0,
  percentage       NUMERIC(5,2) NOT NULL DEFAULT 0,
  overall_grade    TEXT,
  result_status    TEXT NOT NULL DEFAULT 'pass'
                   CHECK (result_status IN ('pass', 'fail', 'compartment', 'absent')),
  -- Progress remark: auto-calculated but overridable
  progress_remark  TEXT DEFAULT 'PASS'
                   CHECK (progress_remark IN ('EXCELLENT', 'GOOD', 'SATISFACTORY', 'PASS', 'FAIL')),
  attendance       INTEGER,                    -- percentage
  teacher_remarks  TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  issue_date       DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_summary_result_id ON result_summary (result_id);
CREATE INDEX idx_summary_student ON result_summary (student_id);

-- ============================================================
-- TABLE: csv_import_logs
-- ============================================================
CREATE TABLE csv_import_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imported_by      UUID REFERENCES admin_users(id),
  file_name        TEXT NOT NULL,
  file_url         TEXT,
  total_rows       INTEGER NOT NULL DEFAULT 0,
  success_rows     INTEGER NOT NULL DEFAULT 0,
  failed_rows      INTEGER NOT NULL DEFAULT 0,
  duplicate_rows   INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','completed','failed','rolled_back')),
  error_report     JSONB,
  import_type      TEXT NOT NULL
                   CHECK (import_type IN ('students', 'results', 'subjects')),
  academic_session TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID,
  actor_type  TEXT NOT NULL
              CHECK (actor_type IN ('admin', 'student', 'system')),
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_action ON audit_logs (action);
CREATE INDEX idx_audit_created ON audit_logs (created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_summary  ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users     ENABLE ROW LEVEL SECURITY;

-- Service role has full access; anon role: read published results + settings only
CREATE POLICY "public_read_school_settings" ON school_settings
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "public_read_published_summary" ON result_summary
  FOR SELECT TO anon USING (is_published = true);

CREATE POLICY "public_read_signatures" ON school_signatures
  FOR SELECT TO anon USING (is_active = true);

-- ============================================================
-- SEED: Gurukul Vidyapeeth School Settings (Run once)
-- ============================================================
INSERT INTO school_settings (
  school_name, school_full_name, trust_name, tagline,
  affiliation_number, index_number, board_name, college_type,
  address_line1, address_line2, city, state, pincode,
  contact_phone, contact_email, website, current_session
) VALUES (
  'GURUKUL VIDYAPEETH',
  'Gurukul Vidyapeeth English High School & Jr. College',
  'Bhagwat Prasad Gurukul Educational Trust''s',
  'विद्या ददाति विनयम्',
  '28993-97/Dt.15/11/2016',
  'J-15.14.086',
  'Regd. by the Govt. of Maharashtra',
  'Higher Secondary / Self Finance / 16-17 / 2016',
  'D. N. Mohanty Estate, Near Shanti Mandir',
  'Manorama Nagar',
  'Thane (W)',
  'Maharashtra',
  '400607',
  '9326446097',
  'gurukulvidyapeeth4@gmail.com',
  'www.bhagwatprasadgurukulvidya.edu.in',
  '2024-2025'
) ON CONFLICT DO NOTHING;
