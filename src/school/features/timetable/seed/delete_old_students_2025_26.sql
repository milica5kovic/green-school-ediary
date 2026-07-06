-- ============================================================
-- DELETE: All previous students (everything EXCEPT school year 2026-27)
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- ============================================================
-- ⚠️⚠️ DESTRUCTIVE AND PERMANENT ⚠️⚠️
-- This deletes all old students AND all their related data:
-- grades, attendance, homework records, comments, term reports,
-- report entries, activity logs, parent links.
--
-- Before running, consider exporting the old year first:
-- Settings → Archive → Export (Excel backup).
--
-- Safe for the new roster: students with school_year = '2026-27'
-- are NOT touched. Parents themselves are NOT deleted (only the
-- link to deleted students); teachers, classes, timetable stay.
--
-- The schema has no ON DELETE CASCADE, so child tables must be
-- cleaned first — that's why this script deletes in this order.
-- ============================================================

DO $$
DECLARE
  sid UUID := 'f2100ee0-c12b-4418-82b0-3567d6207920';
  n_students INT;
BEGIN

  -- Collect the students to delete: everyone except the 2026-27 roster
  CREATE TEMP TABLE _old_students ON COMMIT DROP AS
  SELECT id FROM students
  WHERE school_id = sid
    AND (school_year IS NULL OR school_year <> '2026-27');

  SELECT COUNT(*) INTO n_students FROM _old_students;
  RAISE NOTICE 'Deleting % old students and their related data...', n_students;

  -- 1. Child tables referencing students(id)
  DELETE FROM grades                 WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM attendance             WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM student_homework       WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM teacher_comments       WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM subject_term_comments  WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM class_teacher_comments WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM term_reports           WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM report_entries         WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM report_meta            WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM activity_logs          WHERE student_id IN (SELECT id FROM _old_students);
  DELETE FROM student_parents        WHERE student_id IN (SELECT id FROM _old_students);

  -- 2. Nullable references — unlink instead of delete
  UPDATE enrollment_applications SET current_student_id = NULL
  WHERE current_student_id IN (SELECT id FROM _old_students);

  -- 3. Finally, the students themselves
  DELETE FROM students WHERE id IN (SELECT id FROM _old_students);

  RAISE NOTICE 'Done. % students deleted.', n_students;

END $$;

-- ============================================================
-- Verification — should list ONLY the 2026-27 classes:
-- ============================================================
-- SELECT school_year, class_name, COUNT(*)
-- FROM students
-- WHERE school_id = 'f2100ee0-c12b-4418-82b0-3567d6207920'
-- GROUP BY school_year, class_name
-- ORDER BY school_year, class_name;
