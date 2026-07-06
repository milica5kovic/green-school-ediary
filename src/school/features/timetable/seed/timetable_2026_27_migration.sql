-- ============================================================
-- TIMETABLE MIGRATION for school year 2026-27
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- What this does:
--   1. Relaxes time_slots CHECK so slot_number 0 is allowed
--      (slot 0 = pre-period 08:20–09:00, Y7–Y9 only — enforced by the app)
--   2. Inserts the pre-period slot for your school
--   3. Remaps teacher_assignments to the new 2026-27 class structure:
--        Y1        → Y1a + Y1b + Y1c  (each assignment tripled)
--        Y5a + Y5b → Y5               (merged, duplicates removed)
--        Y6        → Y6a + Y6b        (each assignment doubled)
--        Y2,Y3,Y4,Y7,Y8,Y9 unchanged
--   4. Clears old draft/published timetable entries that reference
--      classes which no longer exist (they would show as ghosts)
--
-- Safe to re-run.
--
-- ⚠️ After running: open Timetable Maker → Assignments and review
--    periods_per_week. Y1 and Y6 teachers now have double/triple
--    the load (one row per section) — if two sections should be
--    taught TOGETHER as one combined lesson, give those rows the
--    same parallel_group instead.
-- ============================================================

-- 1. Allow slot_number 0 (pre-period) in time_slots
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_slot_number_check;
ALTER TABLE time_slots ADD CONSTRAINT time_slots_slot_number_check CHECK (slot_number >= 0);

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
BEGIN

-- ============================================================
-- 2. PRE-PERIOD SLOT (slot 0, 08:20–09:00)
-- ============================================================
INSERT INTO time_slots (school_id, slot_number, label, start_time, end_time)
SELECT sid, 0, 'Pre-period (Y7–Y9)', TIME '08:20', TIME '09:00'
WHERE NOT EXISTS (
  SELECT 1 FROM time_slots WHERE school_id = sid AND slot_number = 0
);

-- ============================================================
-- 3. REMAP TEACHER ASSIGNMENTS to 2026-27 classes
-- ============================================================

-- ── Y1 → Y1a + Y1b + Y1c ────────────────────────────────────
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT school_id, teacher_id, subject, 'Y1b', periods_per_week, parallel_group
FROM teacher_assignments WHERE school_id = sid AND class_name = 'Y1';

INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT school_id, teacher_id, subject, 'Y1c', periods_per_week, parallel_group
FROM teacher_assignments WHERE school_id = sid AND class_name = 'Y1';

UPDATE teacher_assignments SET class_name = 'Y1a'
WHERE school_id = sid AND class_name = 'Y1';

-- ── Y6 → Y6a + Y6b ──────────────────────────────────────────
INSERT INTO teacher_assignments (school_id, teacher_id, subject, class_name, periods_per_week, parallel_group)
SELECT school_id, teacher_id, subject, 'Y6b', periods_per_week, parallel_group
FROM teacher_assignments WHERE school_id = sid AND class_name = 'Y6';

UPDATE teacher_assignments SET class_name = 'Y6a'
WHERE school_id = sid AND class_name = 'Y6';

-- ── Y5a + Y5b → Y5 (merge, drop duplicates) ─────────────────
UPDATE teacher_assignments SET class_name = 'Y5'
WHERE school_id = sid AND class_name IN ('Y5a', 'Y5A');

UPDATE teacher_assignments t SET class_name = 'Y5'
WHERE school_id = sid AND class_name IN ('Y5b', 'Y5B')
  AND NOT EXISTS (
    SELECT 1 FROM teacher_assignments x
    WHERE x.school_id = sid AND x.class_name = 'Y5'
      AND x.teacher_id = t.teacher_id AND x.subject = t.subject
  );

-- whatever is left as Y5b was a duplicate of an existing Y5 row
DELETE FROM teacher_assignments
WHERE school_id = sid AND class_name IN ('Y5b', 'Y5B');

-- ============================================================
-- 4. CLEAR STALE TIMETABLE DATA for classes that no longer exist
--    (draft + published entries and the synced teacher_schedule)
-- ============================================================
DELETE FROM timetable_entries
WHERE school_id = sid AND class_name IN ('Y1', 'Y5a', 'Y5A', 'Y5b', 'Y5B', 'Y6');

DELETE FROM teacher_schedule
WHERE school_id = sid AND class_name IN ('Y1', 'Y5a', 'Y5A', 'Y5b', 'Y5B', 'Y6');

END $$;

-- ============================================================
-- Verification queries
-- ============================================================
-- SELECT slot_number, label, start_time, end_time FROM time_slots
--   WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920' ORDER BY slot_number;
-- SELECT class_name, COUNT(*) FROM teacher_assignments
--   WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   GROUP BY class_name ORDER BY class_name;
