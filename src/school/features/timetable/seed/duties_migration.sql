-- ============================================================
-- MIGRATION: Duty Slots and Duty Assignments
-- Run in Supabase SQL editor BEFORE using the Duties feature.
-- ============================================================

-- duty_slots: defines each duty window (Snack, Lunch, etc.)
CREATE TABLE IF NOT EXISTS duty_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,        -- e.g. 'Snack Duty'
  duty_type     TEXT NOT NULL,        -- 'arrival' | 'welcome' | 'snack' | 'lunch' | 'extracurricular' | 'pickup'
  start_time    TIME NOT NULL,        -- e.g. '10:30'
  end_time      TIME NOT NULL,        -- e.g. '10:55'
  required_count INT NOT NULL DEFAULT 1,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, duty_type)
);

-- duty_assignments: which teacher is on duty, on which day
CREATE TABLE IF NOT EXISTS duty_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  duty_slot_id  UUID NOT NULL REFERENCES duty_slots(id) ON DELETE CASCADE,
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  day_of_week   INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 4),  -- 0=Mon … 4=Fri
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, duty_slot_id, teacher_id, day_of_week)
);

-- RLS
ALTER TABLE duty_slots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_assignments  ENABLE ROW LEVEL SECURITY;

-- Allow school members to read/write their own school's data
-- (Adjust to match your existing RLS pattern)
CREATE POLICY "school_duty_slots" ON duty_slots
  USING (school_id = (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "school_duty_assignments" ON duty_assignments
  USING (school_id = (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================
-- Seed default duty slots for Green School by Chartwell
-- Replace YOUR_SCHOOL_ID with your actual school UUID.
-- ============================================================
INSERT INTO duty_slots (school_id, name, duty_type, start_time, end_time, required_count, sort_order)
VALUES
  ('YOUR_SCHOOL_ID', 'Arrival / Gate Duty',       'arrival',         '08:00', '08:15', 2, 1),
  ('YOUR_SCHOOL_ID', 'Welcome Session',            'welcome',         '08:20', '08:50', 0, 2),
  ('YOUR_SCHOOL_ID', 'Snack Break Duty',           'snack',           '10:30', '10:55', 3, 3),
  ('YOUR_SCHOOL_ID', 'Lunch Duty',                 'lunch',           '12:30', '13:25', 6, 4),
  ('YOUR_SCHOOL_ID', 'Extra-Curricular Activity',  'extracurricular', '15:05', '15:45', 0, 5),
  ('YOUR_SCHOOL_ID', 'Late Pick-Up',               'pickup',          '15:45', '16:00', 2, 6)
ON CONFLICT (school_id, duty_type) DO NOTHING;
