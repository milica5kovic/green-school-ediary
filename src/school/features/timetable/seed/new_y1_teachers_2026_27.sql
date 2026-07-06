-- ============================================================
-- NEW TEACHERS for Y1b and Y1c (school year 2026-27)
-- Run in the Supabase SQL editor — AFTER fix_classes_2026_27.sql!
-- ============================================================
-- Ms. Mirjana Ivanovic stays class teacher of Y1a.
-- Two new teachers take over the SAME duties for the other sections:
--   Y1b → Ms. Teodora Vasic       (teodora.vasic@greenschool.edu)
--   Y1c → Ms. Andjela Kovacevic   (andjela.kovacevic@greenschool.edu)
--
-- What this does (safe to re-run):
--   1. Inserts the two new teachers
--   2. Every assignment Mirjana has in Y1b → Teodora,
--      every assignment Mirjana has in Y1c → Andjela
--      (other subject teachers — ICT, Art, PE... — stay unchanged)
--   3. Sets class_teacher_for: Mirjana=Y1a, Teodora=Y1b, Andjela=Y1c
--   4. Re-points any existing draft/published timetable entries too
--
-- After running: Timetable Maker → Clear Draft → Auto-Generate.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  t_mirjana UUID;
  t_teodora UUID;
  t_andjela UUID;
  n_b INT; n_c INT;
BEGIN

-- ============================================================
-- 1. INSERT NEW TEACHERS
-- (no unique constraint on teachers.email, so guard with NOT EXISTS)
-- ============================================================
INSERT INTO teachers (id, school_id, full_name, email, role, created_at)
SELECT gen_random_uuid(), sid, v.full_name, v.email, 'teacher', NOW()
FROM (VALUES
  ('Ms. Teodora Vasic',     'teodora.vasic@greenschool.edu'),
  ('Ms. Andjela Kovacevic', 'andjela.kovacevic@greenschool.edu')
) AS v(full_name, email)
WHERE NOT EXISTS (
  SELECT 1 FROM teachers t
  WHERE t.school_id = sid AND t.email = v.email
);

SELECT id INTO t_mirjana FROM teachers WHERE school_id = sid AND full_name = 'Ms. Mirjana Ivanovic';
SELECT id INTO t_teodora FROM teachers WHERE school_id = sid AND full_name = 'Ms. Teodora Vasic';
SELECT id INTO t_andjela FROM teachers WHERE school_id = sid AND full_name = 'Ms. Andjela Kovacevic';

IF t_mirjana IS NULL THEN
  RAISE EXCEPTION 'Ms. Mirjana Ivanovic not found in teachers — check the name in the teachers table';
END IF;

-- ============================================================
-- 2. HAND OVER MIRJANA'S Y1b AND Y1c ASSIGNMENTS
-- ============================================================
UPDATE teacher_assignments SET teacher_id = t_teodora
WHERE school_id = sid AND class_name = 'Y1b' AND teacher_id = t_mirjana;
GET DIAGNOSTICS n_b = ROW_COUNT;

UPDATE teacher_assignments SET teacher_id = t_andjela
WHERE school_id = sid AND class_name = 'Y1c' AND teacher_id = t_mirjana;
GET DIAGNOSTICS n_c = ROW_COUNT;

RAISE NOTICE 'Handed over: % Y1b assignments to Teodora, % Y1c assignments to Andjela', n_b, n_c;
IF n_b = 0 AND n_c = 0 THEN
  RAISE NOTICE '⚠ Nothing handed over — did you run fix_classes_2026_27.sql first?';
END IF;

-- ============================================================
-- 3. CLASS TEACHER ROLES
-- ============================================================
UPDATE teachers SET class_teacher_for = 'Y1a' WHERE id = t_mirjana;
UPDATE teachers SET class_teacher_for = 'Y1b' WHERE id = t_teodora;
UPDATE teachers SET class_teacher_for = 'Y1c' WHERE id = t_andjela;

-- ============================================================
-- 4. RE-POINT EXISTING TIMETABLE ENTRIES (draft + published + synced)
-- ============================================================
UPDATE timetable_entries SET teacher_id = t_teodora
WHERE school_id = sid AND class_name = 'Y1b' AND teacher_id = t_mirjana;

UPDATE timetable_entries SET teacher_id = t_andjela
WHERE school_id = sid AND class_name = 'Y1c' AND teacher_id = t_mirjana;

UPDATE teacher_schedule SET teacher_id = t_teodora
WHERE school_id = sid AND class_name = 'Y1b' AND teacher_id = t_mirjana;

UPDATE teacher_schedule SET teacher_id = t_andjela
WHERE school_id = sid AND class_name = 'Y1c' AND teacher_id = t_mirjana;

END $$;

-- ============================================================
-- Verification — who teaches what in the Y1 sections:
-- ============================================================
-- SELECT ta.class_name, ta.subject, t.full_name, ta.periods_per_week
-- FROM teacher_assignments ta JOIN teachers t ON t.id = ta.teacher_id
-- WHERE ta.school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
--   AND ta.class_name IN ('Y1a','Y1b','Y1c')
-- ORDER BY ta.class_name, ta.subject;
