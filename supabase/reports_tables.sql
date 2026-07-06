-- ============================================================================
-- REPORTS MODULE — Tables, indexes, RLS, and seed data
-- Safe to re-run (IF NOT EXISTS / OR REPLACE throughout)
-- ============================================================================

-- ── report_periods ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_periods (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id            UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  type                 TEXT        NOT NULL CHECK (type IN ('mid_year', 'end_of_year')),
  school_year          TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),
  absences_total_days  INT         NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_periods_auth" ON public.report_periods;
CREATE POLICY "reports_periods_auth" ON public.report_periods
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_report_periods_school ON public.report_periods(school_id);

-- ── report_objectives ─────────────────────────────────────────────────────────
-- Fixed objectives per subject per year group; seeded once per school on setup.
-- subject_name is a plain string matching custom_subjects.subject_name.
CREATE TABLE IF NOT EXISTS public.report_objectives (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_name TEXT        NOT NULL,
  year_group   INT         NOT NULL,
  section      TEXT,
  text         TEXT        NOT NULL,
  sort_order   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_objectives ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_objectives_auth" ON public.report_objectives;
CREATE POLICY "report_objectives_auth" ON public.report_objectives
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_report_objectives_school  ON public.report_objectives(school_id);
CREATE INDEX IF NOT EXISTS idx_report_objectives_subject ON public.report_objectives(school_id, subject_name, year_group);

-- ── psd_statements ────────────────────────────────────────────────────────────
-- 13 Personal/Social Development statements; seeded once per school on setup.
CREATE TABLE IF NOT EXISTS public.psd_statements (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.psd_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "psd_statements_auth" ON public.psd_statements;
CREATE POLICY "psd_statements_auth" ON public.psd_statements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_psd_statements_school ON public.psd_statements(school_id);

-- ── report_entries ────────────────────────────────────────────────────────────
-- One row per (period × student × subject). Filled by the subject teacher.
CREATE TABLE IF NOT EXISTS public.report_entries (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id         UUID        NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
  student_id        UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_name      TEXT        NOT NULL,
  teacher_id        UUID        NOT NULL REFERENCES public.teachers(id),
  comment           TEXT,
  attainment        TEXT,
  effort            TEXT,
  objective_ticks   JSONB       NOT NULL DEFAULT '{}',
  status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (status IN ('draft', 'submitted', 'rejected', 'approved')),
  rejection_comment TEXT,
  submitted_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, student_id, subject_name)
);

ALTER TABLE public.report_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_entries_auth" ON public.report_entries;
CREATE POLICY "report_entries_auth" ON public.report_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_report_entries_period  ON public.report_entries(period_id);
CREATE INDEX IF NOT EXISTS idx_report_entries_student ON public.report_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_report_entries_teacher ON public.report_entries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_report_entries_status  ON public.report_entries(status);

-- ── report_meta ───────────────────────────────────────────────────────────────
-- One row per (period × student). Filled by the class teacher.
CREATE TABLE IF NOT EXISTS public.report_meta (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  period_id      UUID        NOT NULL REFERENCES public.report_periods(id) ON DELETE CASCADE,
  student_id     UUID        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  days_absent    INT         NOT NULL DEFAULT 0,
  late_arrivals  INT         NOT NULL DEFAULT 0,
  psd_ticks      JSONB       NOT NULL DEFAULT '{}',
  self_appraisal JSONB       NOT NULL DEFAULT '{}',
  targets        TEXT,
  status         TEXT        NOT NULL DEFAULT 'in_progress'
                             CHECK (status IN ('in_progress', 'ready', 'generated')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (period_id, student_id)
);

ALTER TABLE public.report_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_meta_auth" ON public.report_meta;
CREATE POLICY "report_meta_auth" ON public.report_meta
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_report_meta_period  ON public.report_meta(period_id);
CREATE INDEX IF NOT EXISTS idx_report_meta_student ON public.report_meta(student_id);

-- ── report_validation_rules ───────────────────────────────────────────────────
-- Extensible per-school validation config. rule_key maps to a validator function
-- in the client-side validation engine.
CREATE TABLE IF NOT EXISTS public.report_validation_rules (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID        NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  report_type TEXT        NOT NULL CHECK (report_type IN ('primary', 'lower_secondary', 'all')),
  rule_key    TEXT        NOT NULL,
  config      JSONB       NOT NULL DEFAULT '{}',
  severity    TEXT        NOT NULL DEFAULT 'hard' CHECK (severity IN ('hard', 'soft')),
  active      BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.report_validation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_validation_rules_auth" ON public.report_validation_rules;
CREATE POLICY "report_validation_rules_auth" ON public.report_validation_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_report_validation_rules_school ON public.report_validation_rules(school_id);

-- ============================================================================
-- SEED DATA — inserted via a setup function called from the app on first use.
-- These are template rows; the app copies them per school_id.
-- ============================================================================

-- The app calls reportsService.setupSchool(schoolId) which inserts these rows
-- tagged with the school_id. The SQL below documents the canonical content.

-- PSD Statements (13 standard statements)
-- sort_order 1–13 in insertion order.
COMMENT ON TABLE public.psd_statements IS
  'Seeded by reportsService.setupSchool(). Standard 13 PSD statements per school.';

-- ICT Year 5 objectives — sample for documentation purposes.
-- The app seeds these when setupSchool() is called.
COMMENT ON TABLE public.report_objectives IS
  'Seeded by reportsService.setupSchool(). ICT Year 5 objectives provided as example set.';

-- Default validation rule: comment word count 60–120 words (hard block)
COMMENT ON TABLE public.report_validation_rules IS
  'Seeded by reportsService.setupSchool(). Default hard rule: word_count min=60 max=120.';
